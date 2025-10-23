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
import { getErrorSimulator } from './error-simulator'

export class LlmTranslationClient extends EventEmitter {
  private config: TranslationClientConfig
  private llmConfigManager: any
  private activeClient: LangChainClient | null = null
  private abortController: AbortController | null = null
  private cancelled: boolean = false

  constructor(config: TranslationClientConfig, llmConfigManager: any) {
    super()
    this.config = config
    this.llmConfigManager = llmConfigManager
  }

  /**
   * 执行单次翻译（流式 + Layer 2b 超时检测）
   */
  async translateStream(
    request: TranslationRequest,
    callbacks: TranslationStreamCallbacks
  ): Promise<TranslationResult> {
    const startTime = Date.now()
    let translation = ''
    let outputTokens = 0

    // 创建可被取消的控制器
    this.abortController = new AbortController()
    
    // Layer 2b 超时控制
    const firstTokenTimeout = this.config.streamFirstTokenTimeout ?? 60000  // 默认60秒
    const idleTimeout = this.config.streamIdleTimeout ?? 60000              // 默认60秒
    
    let firstTokenTimer: NodeJS.Timeout | null = null
    let idleTimer: NodeJS.Timeout | null = null
    let hasReceivedFirstToken = false
    // 超时标志，用于在超时时记录错误信息（移到try外部以便catch块访问）
    let timeoutError: Error | null = null

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

      console.log(`⏱️  [TranslationClient] Layer 2b 超时配置: 首字${firstTokenTimeout}ms, 空闲${idleTimeout}ms`)

      // 4. 启动首字超时计时器
      firstTokenTimer = setTimeout(() => {
        console.error(`⏱️❌ [TranslationClient] 任务 ${request.taskId} 等待首个token超时`)
        timeoutError = new Error('TIMEOUT: 等待首个token超时（主动关闭连接）')
        // 使用 AbortController 中止流式调用
        if (this.abortController) {
          this.abortController.abort()
        }
      }, firstTokenTimeout)

      // 5. 流式调用 LLM
      await client.chatStream(messages, {
        onChunk: (chunk: string) => {
          // 🔴 检查是否已被取消 - 抛出错误强制中断流
          if (this.cancelled) {
            console.log(`✂️ [TranslationClient] 任务 ${request.taskId} 已被取消，抛出错误终止流`)
            throw new Error('Task cancelled by user')
          }
          
          // 🆕 收到首个 token，清除首字超时，启动空闲超时
          if (!hasReceivedFirstToken) {
            hasReceivedFirstToken = true
            if (firstTokenTimer) {
              clearTimeout(firstTokenTimer)
              firstTokenTimer = null
            }
            console.log(`✅ [TranslationClient] 任务 ${request.taskId} 收到首个token`)
          }
          
          // 🆕 清除并重启空闲超时计时器
          if (idleTimer) {
            clearTimeout(idleTimer)
          }
          idleTimer = setTimeout(() => {
            console.error(`⏱️❌ [TranslationClient] 任务 ${request.taskId} 流式响应空闲超时`)
            timeoutError = new Error('TIMEOUT: 流式响应空闲超时（主动关闭连接）')
            // 使用 AbortController 中止流式调用
            if (this.abortController) {
              this.abortController.abort()
            }
          }, idleTimeout)
          
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
          // 🆕 清除所有超时计时器
          if (firstTokenTimer) {
            clearTimeout(firstTokenTimer)
            firstTokenTimer = null
          }
          if (idleTimer) {
            clearTimeout(idleTimer)
            idleTimer = null
          }
          
          // 🔴 检查是否已被取消
          if (this.cancelled) {
            console.log(`✂️ [TranslationClient] 任务被取消，跳过完成处理`)
            return
          }
          console.log(`✅ [TranslationClient] 任务 ${request.taskId} 流式传输完成`)
        },
        onError: (error: Error) => {
          // 🆕 清除所有超时计时器
          if (firstTokenTimer) {
            clearTimeout(firstTokenTimer)
            firstTokenTimer = null
          }
          if (idleTimer) {
            clearTimeout(idleTimer)
            idleTimer = null
          }
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
      
      // 🆕 确保清除所有超时计时器
      if (firstTokenTimer) {
        clearTimeout(firstTokenTimer)
        firstTokenTimer = null
      }
      if (idleTimer) {
        clearTimeout(idleTimer)
        idleTimer = null
      }
      
      // 🆕 如果是超时导致的abort，抛出超时错误
      if (timeoutError && (err.name === 'AbortError' || (this.abortController && this.abortController.signal.aborted))) {
        console.log(`⏱️ [TranslationClient] 任务 ${request.taskId} 超时，抛出超时错误`)
        callbacks.onError?.(request.taskId, timeoutError)
        this.emit('translation:error', {
          taskId: request.taskId,
          errorType: this.classifyError(timeoutError),
          errorMessage: timeoutError.message
        })
        await this.cleanup()
        throw timeoutError
      }
      
      // 检查是否是用户取消的
      if (err.name === 'AbortError' || err.message.includes('cancelled')) {
        console.log(`✂️ [TranslationClient] 任务 ${request.taskId} 被用户取消`)
        const cancelError = new Error('Task was cancelled by user')
        callbacks.onError?.(request.taskId, cancelError)
        this.emit('translation:error', {
          taskId: request.taskId,
          errorType: 'USER_PAUSED',
          errorMessage: cancelError.message
        })
        await this.cleanup()
        throw cancelError
      }
      
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
    
    // Layer 2a HTTP超时配置
    const httpTimeout = this.config.timeout ?? 120000  // 默认2分钟
    let httpTimer: NodeJS.Timeout | null = null

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

      console.log(`⏱️  [TranslationClient] Layer 2a HTTP超时配置: ${httpTimeout}ms (${(httpTimeout / 1000).toFixed(0)}秒)`)

      // Layer 2a: HTTP超时控制（使用Promise.race）
      const httpTimeoutPromise = new Promise<never>((_, reject) => {
        httpTimer = setTimeout(() => {
          console.error(`⏱️❌ [TranslationClient] 任务 ${request.taskId} HTTP请求超时`)
          reject(new Error('TIMEOUT: HTTP请求超时（主动关闭连接）'))
        }, httpTimeout)
      })

      // 非流式调用（与超时Promise竞速）
      const translationPromise = client.chat(messages)
      const translation = await Promise.race([translationPromise, httpTimeoutPromise])
      
      // 清除超时计时器
      if (httpTimer) {
        clearTimeout(httpTimer)
        httpTimer = null
      }

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
      // 确保清除HTTP超时计时器
      if (httpTimer) {
        clearTimeout(httpTimer)
        httpTimer = null
      }
      
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

    console.log(`🔧 [TranslationClient] 初始化客户端，modelId: ${this.config.modelId}`)
    
    // 🎲 【核心】掷骰子检查是否注入错误
    const errorSimulator = getErrorSimulator()
    const errorScenario = errorSimulator.rollDice()

    if (errorScenario) {
      console.error(
        `❌ [TranslationClient] 🎲 掷骰子命中错误: ${errorScenario.name} ` +
        `(概率: ${errorScenario.probability}%)`
      )

      // 根据错误类型处理
      switch (errorScenario.errorType) {
        case 'rate-limit': {
          const error = new Error(errorScenario.errorMessage || 'Too Many Requests')
          ;(error as any).status = 429
          ;(error as any).code = 'RATE_LIMIT_EXCEEDED'
          throw error
        }

        case 'timeout': {
          // 模拟超时：等待指定时间后抛出 timeout 错误
          if (errorScenario.delay) {
            console.log(`⏳ [TranslationClient] 模拟延迟 ${errorScenario.delay}ms 后超时...`)
            await new Promise((resolve) => setTimeout(resolve, errorScenario.delay))
          }
          const error = new Error(errorScenario.errorMessage || 'Request timeout')
          ;(error as any).code = 'ECONNABORTED'
          throw error
        }

        case 'malformed': {
          const error = new Error(errorScenario.errorMessage || 'Malformed API response')
          ;(error as any).status = 500
          ;(error as any).code = 'INTERNAL_SERVER_ERROR'
          throw error
        }

        case 'server-error': {
          const error = new Error(errorScenario.errorMessage || 'Internal Server Error')
          ;(error as any).status = 500
          ;(error as any).code = 'SERVER_ERROR'
          throw error
        }

        default:
          throw new Error(`Unknown error type: ${errorScenario.errorType}`)
      }
    }

    // ✅ 掷骰子通过，继续正常流程
    console.log(`✅ [TranslationClient] 掷骰子通过，进行正常 API 调用`)
    
    // 从 LlmConfigManager 获取模型配置
    const modelConfig = await this.getModelConfig(this.config.modelId)
    console.log(`🔧 [TranslationClient] 获取模型配置:`, {
      modelName: modelConfig.modelName,
      apiKey: modelConfig.apiKey?.substring(0, 10) + '***',
      baseUrl: modelConfig.baseUrl
    })

    // 动态导入 LangChainClient
    const { LangChainClient } = await import('../llm-chat-service/langchain-client')
    
    // 构建客户端配置
    // 注意：modelConfig 已经是三层级合并后的完整对象
    // 包括：用户UI配置 > 模型自定义配置 > 提供商配置
    const clientConfig = {
      modelName: modelConfig.modelName,
      apiKey: modelConfig.apiKey,
      baseUrl: modelConfig.baseUrl,
      // 直接从已合并的 modelConfig 中取值（已经过三层级合并）
      ...(modelConfig.temperature !== undefined && { temperature: modelConfig.temperature }),
      ...(modelConfig.maxTokens !== undefined && { maxTokens: modelConfig.maxTokens }),
      ...(modelConfig.topP !== undefined && { topP: modelConfig.topP }),
      ...(modelConfig.frequencyPenalty !== undefined && { frequencyPenalty: modelConfig.frequencyPenalty }),
      ...(modelConfig.presencePenalty !== undefined && { presencePenalty: modelConfig.presencePenalty }),
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      useChat: true
    }
    
    console.log(`🔧 [TranslationClient] LangChainClient 配置:`, {
      modelName: clientConfig.modelName,
      temperature: clientConfig.temperature,
      maxTokens: clientConfig.maxTokens,
      topP: clientConfig.topP,
      frequencyPenalty: clientConfig.frequencyPenalty,
      presencePenalty: clientConfig.presencePenalty
    })

    this.activeClient = new LangChainClient(clientConfig)
    return this.activeClient
  }
  
  /**
   * 获取模型配置
   */
  private async getModelConfig(modelId: string): Promise<ModelConfig> {
    console.log(`🔍 [TranslationClient] 解析 modelId: ${modelId}`)
    
    // 按第一个点号分割，因为 modelName 可能包含点号
    // 格式：providerId.modelName
    const dotIndex = modelId.indexOf('.')
    if (dotIndex === -1) {
      throw new Error(`Invalid modelId format: ${modelId}. Expected format: providerId.modelName`)
    }
    
    const providerId = modelId.substring(0, dotIndex)
    const modelName = modelId.substring(dotIndex + 1)
    
    console.log(`🔍 [TranslationClient] 分割结果: providerId=${providerId}, modelName=${modelName}`)
    
    // 调用 LlmConfigManager 的方法获取提供商配置
    const provider = await this.llmConfigManager.getProvider(providerId)
    console.log(`🔍 [TranslationClient] 获取提供商 ${providerId}:`, provider ? '成功' : '失败')

    if (!provider) {
      throw new Error(`Provider ${providerId} not found`)
    }

    // 🔍 查找模型的自定义配置
    let modelCustomConfig: Partial<ModelConfig> = {}
    if (provider.supportedModels && Array.isArray(provider.supportedModels)) {
      for (const modelGroup of provider.supportedModels) {
        if (modelGroup.models && Array.isArray(modelGroup.models)) {
          const foundModel = modelGroup.models.find((m: any) => m.name === modelName)
          if (foundModel && foundModel.config) {
            modelCustomConfig = foundModel.config
            console.log(`🔍 [TranslationClient] 找到模型自定义配置: ${modelName}`, modelCustomConfig)
            break
          }
        }
      }
    }

    // ✅ 三层级级联配置
    // 优先级：用户UI配置 > 模型自定义配置 > 提供商配置
    const config = {
      // 1️⃣ 提供商配置（最低优先级）
      ...provider.defaultConfig,
      
      // 2️⃣ 模型自定义配置（中间优先级）
      ...modelCustomConfig,
      
      // 3️⃣ 基础配置（必需）
      modelName,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      
      // 4️⃣ 用户UI配置（最高优先级，只有有值才覆盖）
      ...(this.config.temperature !== undefined && { temperature: this.config.temperature }),
      ...(this.config.maxTokens !== undefined && { maxTokens: this.config.maxTokens }),
      ...(this.config.topP !== undefined && { topP: this.config.topP }),
      ...(this.config.frequencyPenalty !== undefined && { frequencyPenalty: this.config.frequencyPenalty }),
      ...(this.config.presencePenalty !== undefined && { presencePenalty: this.config.presencePenalty })
    }
    
    console.log(`🔍 [TranslationClient] 最终模型配置（三层级级联）:`, {
      modelName: config.modelName,
      baseUrl: config.baseUrl,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty,
      来源: '提供商配置 < 模型自定义配置 < 用户UI配置'
    })
    
    return config
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

  /**
   * 取消当前翻译任务
   * 中止与LLM提供商的连接并停止流处理
   */
  cancel(): void {
    // 设置取消标志，让所有回调立即停止处理（会在onChunk中抛出错误）
    this.cancelled = true
    console.log(`✂️ [TranslationClient] 标记任务为已取消，停止流处理`)
    
    // 中止HTTP连接
    if (this.abortController) {
      this.abortController.abort()
      console.log(`✂️ [TranslationClient] 翻译任务连接已中止`)
    }
    
    // 立即清理客户端，防止进一步使用
    this.activeClient = null
  }
}

