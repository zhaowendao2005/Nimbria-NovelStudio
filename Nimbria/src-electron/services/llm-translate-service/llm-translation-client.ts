/**
 * LLM Translation Client
 * 
 * @description
 * 翻译专用客户端，负责单次翻译请求的发送和接收
 * 
 * 职责：
 * - 单例翻译任务的发送和接收
 * - 流式响应处理
 * - Token 计数和费用估算
 * - 错误处理和重试
 * 
 * 特点：
 * - 无状态设计（不保存历史记录）
 * - 轻量级（每个翻译任务独立）
 * - 自动清理（任务完成后释放资源）
 */

import { EventEmitter } from 'events'
import type { LangChainClient } from '../llm-chat-service/langchain-client'
import type {
  TranslationClientConfig,
  TranslationRequest,
  TranslationResult,
  TranslationStreamCallbacks,
  ErrorType,
  ModelConfig
} from '../../types/LlmTranslate/backend'

export class LlmTranslationClient extends EventEmitter {
  private config: TranslationClientConfig
  private llmConfigManager: any
  private activeClient: LangChainClient | null = null

  constructor(config: TranslationClientConfig, llmConfigManager: any) {
    super()
    this.config = config
    this.llmConfigManager = llmConfigManager
  }

  /**
   * 执行单次翻译（流式）
   */
  async translateStream(
    request: TranslationRequest,
    callbacks: TranslationStreamCallbacks
  ): Promise<TranslationResult> {
    const startTime = Date.now()
    let translation = ''
    let outputTokens = 0

    try {
      // 1. 初始化 LangChain 客户端
      const client = await this.initClient()

      // 2. 发射开始事件
      callbacks.onStart?.(request.taskId)
      this.emit('translation:start', { 
        taskId: request.taskId,
        estimatedTokens: request.estimatedTokens 
      })

      // 3. 构建消息
      const messages = [
        { 
          id: 'system', 
          role: 'system' as const, 
          content: this.config.systemPrompt,
          timestamp: new Date()
        },
        { 
          id: 'user', 
          role: 'user' as const, 
          content: request.content,
          timestamp: new Date()
        }
      ]

      // 4. 流式调用 LLM
      await client.chatStream(messages, {
        onChunk: (chunk: string) => {
          translation += chunk
          outputTokens = this.estimateTokens(translation)
          
          // 进度回调
          callbacks.onProgress?.(request.taskId, chunk, outputTokens)
          
          // 发射进度事件
          this.emit('translation:progress', {
            taskId: request.taskId,
            chunk,
            currentTokens: outputTokens,
            estimatedTokens: request.estimatedTokens,
            progress: Math.min((outputTokens / request.estimatedTokens) * 100, 100)
          })
        },
        onComplete: () => {
          console.log(`✅ [TranslationClient] 任务 ${request.taskId} 流式传输完成`)
        },
        onError: (error: Error) => {
          throw error
        }
      })

      // 5. 计算实际 Token 数
      const inputTokens = await client.countTokens(messages)
      const actualOutputTokens = await this.countTokensAccurate(translation)

      // 6. 计算费用
      const cost = this.calculateCost(inputTokens, actualOutputTokens)

      // 7. 构建结果
      const result: TranslationResult = {
        taskId: request.taskId,
        translation,
        inputTokens,
        outputTokens: actualOutputTokens,
        durationMs: Date.now() - startTime,
        cost
      }

      // 8. 完成回调
      callbacks.onComplete?.(request.taskId, result)
      this.emit('translation:complete', result)

      // 9. 清理客户端
      await this.cleanup()

      return result

    } catch (error) {
      const err = error as Error
      const errorType = this.classifyError(err)

      // 错误处理
      callbacks.onError?.(request.taskId, err)
      this.emit('translation:error', {
        taskId: request.taskId,
        errorType,
        errorMessage: err.message
      })

      // 清理资源
      await this.cleanup()

      throw err
    }
  }

  /**
   * 执行单次翻译（非流式）
   */
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const startTime = Date.now()

    try {
      const client = await this.initClient()

      const messages = [
        { 
          id: 'system', 
          role: 'system' as const, 
          content: this.config.systemPrompt,
          timestamp: new Date()
        },
        { 
          id: 'user', 
          role: 'user' as const, 
          content: request.content,
          timestamp: new Date()
        }
      ]

      // 非流式调用
      const translation = await client.chat(messages)

      // 计算 Token
      const inputTokens = await client.countTokens(messages)
      const outputTokens = await this.countTokensAccurate(translation)
      const cost = this.calculateCost(inputTokens, outputTokens)

      const result: TranslationResult = {
        taskId: request.taskId,
        translation,
        inputTokens,
        outputTokens,
        durationMs: Date.now() - startTime,
        cost
      }

      await this.cleanup()

      return result

    } catch (error) {
      await this.cleanup()
      throw error
    }
  }

  /**
   * 初始化 LangChain 客户端
   */
  private async initClient(): Promise<LangChainClient> {
    if (this.activeClient) {
      return this.activeClient
    }

    // 从 LlmConfigManager 获取模型配置
    const modelConfig = await this.getModelConfig(this.config.modelId)

    // 动态导入 LangChainClient
    const { LangChainClient } = await import('../llm-chat-service/langchain-client')
    
    const clientConfig = {
      modelName: modelConfig.modelName,
      apiKey: modelConfig.apiKey,
      baseUrl: modelConfig.baseUrl,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      useChat: true
    }

    this.activeClient = new LangChainClient(clientConfig)
    return this.activeClient
  }

  /**
   * 获取模型配置
   */
  private async getModelConfig(modelId: string): Promise<ModelConfig> {
    const [providerId, modelName] = modelId.split('.')
    
    // 调用 LlmConfigManager 的方法获取提供商配置
    const provider = await this.llmConfigManager.getProvider(providerId)

    if (!provider) {
      throw new Error(`Provider ${providerId} not found`)
    }

    return {
      modelName,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      ...provider.defaultConfig
    }
  }

  /**
   * 估算 Token 数（快速估算，1 token ≈ 4 字符）
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * 精确计算 Token 数
   */
  private async countTokensAccurate(text: string): Promise<number> {
    if (!this.activeClient) {
      return this.estimateTokens(text)
    }
    
    const message = { 
      id: 'temp', 
      role: 'user' as const, 
      content: text,
      timestamp: new Date()
    }
    
    return await this.activeClient.countTokens([message])
  }

  /**
   * 计算费用
   * 
   * @description
   * 示例定价（OpenAI GPT-4），实际应根据具体模型动态计算
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    // TODO: 从模型配置中获取定价信息
    const inputCost = (inputTokens / 1000) * 0.03  // $0.03 per 1K input tokens
    const outputCost = (outputTokens / 1000) * 0.06 // $0.06 per 1K output tokens
    return inputCost + outputCost
  }

  /**
   * 错误分类
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase()

    if (message.includes('429') || message.includes('rate limit')) {
      return 'RATE_LIMIT'
    }
    if (message.includes('timeout')) {
      return 'TIMEOUT'
    }
    if (message.includes('network') || message.includes('econnrefused')) {
      return 'NETWORK'
    }
    if (message.includes('api key') || message.includes('unauthorized')) {
      return 'INVALID_API_KEY'
    }
    if (message.includes('model')) {
      return 'MODEL_ERROR'
    }

    return 'UNKNOWN'
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    this.activeClient = null
    this.removeAllListeners()
  }
}

