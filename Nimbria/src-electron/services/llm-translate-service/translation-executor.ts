/**
 * 翻译执行器 - Electron 主进程任务队列管理器
 * 
 * 职责：
 * - 管理任务队列（FIFO）
 * - 并发控制（限制同时执行的任务数）
 * - 集成 LlmTranslationClient 进行翻译
 * - 集成 TaskStateManager 管理状态
 * - 监听流式响应并广播进度事件
 * - 错误捕获和重试逻辑
 * 
 * ⚠️ 所有操作都在主进程本地完成，无外部网络调用
 */

import type { LlmTranslateService } from './llm-translate-service'
import { LlmTranslationClient } from './llm-translation-client'
import type { TaskStateManager } from './task-state-manager'
import type { 
  TranslationClientConfig,
  TranslationRequest,
  TranslationResult,
  ErrorType
} from '../../types/LlmTranslate/backend'
import type { TranslateConfig } from '../../types/LlmTranslate'

export class TranslationExecutor {
  private llmTranslateService: LlmTranslateService
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private llmConfigManager: any
  private taskStateManager: TaskStateManager
  private taskQueues: Map<string, string[]> = new Map()  // batchId -> taskIds[]
  private pausedBatches: Set<string> = new Set()
  private activeTaskCount: Map<string, number> = new Map()  // batchId -> count
  private executingTasks: Map<string, LlmTranslationClient> = new Map()  // taskId -> client

  constructor(
    llmTranslateService: LlmTranslateService,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    llmConfigManager: any,
    taskStateManager: TaskStateManager
  ) {
    this.llmTranslateService = llmTranslateService
    this.llmConfigManager = llmConfigManager
    this.taskStateManager = taskStateManager
  }

  /**
   * 执行任务队列
   * 使用并发控制，限制同时执行的任务数
   */
  async executeTasks(
    batchId: string,
    taskIds: string[],
    config: TranslateConfig,
    concurrency: number
  ): Promise<void> {
    this.taskQueues.set(batchId, [...taskIds])
    this.activeTaskCount.set(batchId, 0)

    // 生成系统提示词摘要（前50个字符）
    const systemPromptSummary = config.systemPrompt 
      ? (config.systemPrompt.length > 50 
          ? config.systemPrompt.substring(0, 50) + '...' 
          : config.systemPrompt)
      : '(无系统提示词)'

    console.log(`🎬 [TranslationExecutor] 开始执行批次 ${batchId}，共 ${taskIds.length} 个任务，并发: ${concurrency}`)
    console.log(`   📝 系统提示词: ${systemPromptSummary}`)

    // 启动并发 worker
    const workers: Promise<void>[] = []
    for (let i = 0; i < Math.min(concurrency, taskIds.length); i++) {
      workers.push(this.worker(batchId, config))
    }

    await Promise.all(workers)

    console.log(`✅ [TranslationExecutor] 批次 ${batchId} 执行完成`)

    // ❌ 已移除：不再在这里清理批次状态
    // 批次状态由 BatchScheduler 在 scheduler:completed 时管理
  }

  /**
   * Worker 线程：不断从队列取任务并执行
   */
  private async worker(batchId: string, config: TranslateConfig): Promise<void> {
    while (true) {
      // 检查是否暂停
      if (this.pausedBatches.has(batchId)) {
        console.log(`⏸️ [TranslationExecutor] 批次 ${batchId} 已暂停，工作线程退出`)
        break
      }

      // 从队列取任务
      const queue = this.taskQueues.get(batchId)
      if (!queue || queue.length === 0) {
        break  // 队列空了，退出
      }

      const taskId = queue.shift()
      if (!taskId) break

      // 执行任务
      await this.executeTask(batchId, taskId, config)

      // 等待间隔（防止限流）
      // 注意：当使用BatchScheduler时，并发控制已在调度器层实现，此处delay可以很小
      // 这里保留100ms作为防抖，避免过快的连续请求
      await this.delay(100)
    }
  }

  /**
   * 执行单个任务（新版本：集成 LlmTranslationClient 和 TaskStateManager）
   */
  private async executeTask(
    batchId: string,
    taskId: string,
    config: TranslateConfig
  ): Promise<void> {
    const projectDb = this.llmTranslateService.getProjectDatabase()
    if (!projectDb) return

    try {
      // 1. 获取任务信息
      const { tasks } = await this.llmTranslateService.getTasks(batchId)
      const task = tasks.find(t => t.id === taskId)
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`)
      }

      // 2. 初始化任务状态
      this.taskStateManager.initializeTask(taskId, batchId, config.predictedTokens)

      // 3. 更新状态为 waiting
      await this.taskStateManager.updateState(taskId, 'waiting')

      // 4. 三层超时控制配置
      /**
       * 三层超时架构：
       * Layer 3: taskTotalTimeout - 兜底机制，包括排队、执行、重试的全部时间
       * Layer 2a: httpTimeout - 非流式模式的HTTP请求最长等待时间
       * Layer 2b: streamFirstTokenTimeout + streamIdleTimeout - 流式模式的超时控制
       * 
       * 优先级: 服务器返回 > 我们的超时控制
       */
      const taskTotalTimeout = config.taskTotalTimeout ?? 600000       // 默认10分钟（兜底）
      const httpTimeout = config.httpTimeout ?? 120000                  // 默认2分钟（非流式）
      const streamFirstTokenTimeout = config.streamFirstTokenTimeout ?? 60000  // 默认1分钟
      const streamIdleTimeout = config.streamIdleTimeout ?? 60000       // 默认1分钟
      const enableStreaming = config.enableStreaming ?? true

      // 创建翻译客户端配置
      const clientConfig: TranslationClientConfig = {
        modelId: config.modelId,
        systemPrompt: config.systemPrompt,
        // 使用用户配置的参数（可选），不设置则由层叠配置决定
        ...(config.temperature !== undefined && { temperature: config.temperature }),
        ...(config.maxTokens !== undefined && { maxTokens: config.maxTokens }),
        ...(config.topP !== undefined && { topP: config.topP }),
        ...(config.frequencyPenalty !== undefined && { frequencyPenalty: config.frequencyPenalty }),
        ...(config.presencePenalty !== undefined && { presencePenalty: config.presencePenalty }),
        // Layer 2a/2b 超时配置
        timeout: httpTimeout,
        maxRetries: config.maxRetries ?? 3,
        enableStreaming,
        streamFirstTokenTimeout,
        streamIdleTimeout
      }

      // 生成系统提示词摘要用于日志
      const promptSummary = config.systemPrompt 
        ? (config.systemPrompt.length > 50 
            ? config.systemPrompt.substring(0, 50) + '...' 
            : config.systemPrompt)
        : '(无系统提示词)'
      
      console.log(`🚀 [TranslationExecutor] 执行任务 ${taskId}`)
      console.log(`   📝 系统提示词: ${promptSummary}`)
      console.log(`   🤖 模型: ${config.modelId}`)
      console.log(`\n   ⏱️  三层超时配置:`)
      console.log(`   ┌─ Layer 3 (兜底): ${taskTotalTimeout}ms (${(taskTotalTimeout / 1000).toFixed(0)}秒)`)
      console.log(`   ├─ Layer 2a (HTTP): ${httpTimeout}ms (${(httpTimeout / 1000).toFixed(0)}秒) - 非流式专用`)
      console.log(`   ├─ Layer 2b (首字): ${streamFirstTokenTimeout}ms (${(streamFirstTokenTimeout / 1000).toFixed(0)}秒) - 流式专用`)
      console.log(`   └─ Layer 2b (空闲): ${streamIdleTimeout}ms (${(streamIdleTimeout / 1000).toFixed(0)}秒) - 流式专用`)
      console.log(`   🔄 最大重试: ${clientConfig.maxRetries}次`)
      console.log(`   📡 流式响应: ${enableStreaming ? '开启' : '关闭'}`)

      // 5. 创建翻译客户端
      const client = new LlmTranslationClient(clientConfig, this.llmConfigManager)
      
      // 记录正在执行的任务（用于取消功能）
      this.executingTasks.set(taskId, client)

      // 6. Token估算（优先使用tokenConversionConfigId，未配置时使用默认配置）
      let estimatedTokens = config.predictedTokens ?? 2000 // 默认值
      
      try {
        // 使用公有方法 estimateTokens（LlmTranslateService对外暴露）
        // 如果未配置 tokenConversionConfigId，会自动使用 default-balanced 配置
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokenService = this.llmTranslateService as any
        if (tokenService.estimateTokens && typeof tokenService.estimateTokens === 'function') {
          estimatedTokens = tokenService.estimateTokens(
            task.content,
            config.tokenConversionConfigId
          ) as number
          
          const configInfo = config.tokenConversionConfigId || 'default-balanced (默认)'
          console.log(`🔢 [Executor] 使用Token换算配置 ${configInfo}: ${estimatedTokens} tokens`)
        } else {
          console.warn(`⚠️ [Executor] Token估算服务不可用，使用预设值`)
          estimatedTokens = config.predictedTokens ?? 2000
        }
      } catch (error) {
        console.warn(`⚠️ [Executor] Token估算失败，使用预设值: ${error instanceof Error ? error.message : String(error)}`)
        estimatedTokens = config.predictedTokens ?? 2000
      }

      // 7. 构建翻译请求
      const request: TranslationRequest = {
        taskId,
        content: task.content,
        estimatedTokens
      }

      // 8. 更新状态为 sending
      await this.taskStateManager.updateState(taskId, 'sending')

      // 9. 执行翻译（Layer 3 任务总超时 + Layer 2 具体超时）
      // Layer 3: 任务总超时（兜底机制，与翻译过程竞速）
      const taskTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('TIMEOUT: 任务总超时（兜底）'))
        }, taskTotalTimeout)
      })

      // 翻译执行 Promise（根据 enableStreaming 选择流式或非流式）
      const translationPromise = (async (): Promise<TranslationResult> => {
        if (enableStreaming) {
          // 流式模式（Layer 2b 超时已传递给 client）
          return await client.translateStream(request, {
            onStart: (id) => {
              console.log(`🚀 [Executor] 任务 ${id} 开始翻译（流式）`)
            },
            onProgress: (id, chunk, tokens) => {
              // 更新进度（TaskStateManager 会自动节流和持久化）
              void this.taskStateManager.updateProgress(id, chunk, tokens)
            },
            onComplete: (id) => {
              console.log(`✅ [Executor] 任务 ${id} 翻译完成`)
            },
            onError: (id, error) => {
              console.error(`❌ [Executor] 任务 ${id} 翻译失败:`, error)
            }
          })
        } else {
          // 非流式模式（Layer 2a 超时已配置在 client.timeout）
          console.log(`🚀 [Executor] 任务 ${taskId} 开始翻译（非流式）`)
          const res = await client.translate(request)
          console.log(`✅ [Executor] 任务 ${taskId} 翻译完成`)
          return res
        }
      })()

      // 竞速执行：翻译 vs 任务总超时
      const result = await Promise.race([translationPromise, taskTimeoutPromise])

      // 10. 标记任务完成
      await this.taskStateManager.markComplete(taskId, {
        translation: result.translation,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cost: result.cost,
        durationMs: result.durationMs
      })

      // 11. 更新批次统计
      await this.llmTranslateService.updateBatchStats(batchId)

    } catch (error) {
      const err = error as Error
      console.error(`❌ [Executor] 任务 ${taskId} 执行失败:`, err)

      // 标记任务错误
      const errorType = this.classifyError(err)
      await this.taskStateManager.markError(
        taskId,
        errorType,
        err.message,
        0
      )

      // 更新批次统计
      await this.llmTranslateService.updateBatchStats(batchId)
    } finally {
      // 清理正在执行的任务
      this.executingTasks.delete(taskId)
    }
  }

  /**
   * 暂停批次
   */
  pauseBatch(batchId: string): void {
    this.pausedBatches.add(batchId)
    console.log(`⏸️ [TranslationExecutor] 暂停批次 ${batchId}`)
  }

  /**
   * 恢复批次
   */
  resumeBatch(batchId: string): void {
    this.pausedBatches.delete(batchId)
    console.log(`▶️ [TranslationExecutor] 恢复批次 ${batchId}`)
  }

  /**
   * 获取正在执行的任务的LLM客户端
   */
  getExecutingTask(taskId: string): LlmTranslationClient | undefined {
    return this.executingTasks.get(taskId)
  }

  /**
   * 取消正在执行的任务
   */
  cancelTask(taskId: string): void {
    const client = this.executingTasks.get(taskId)
    if (client) {
      client.cancel()
      console.log(`✂️ [TranslationExecutor] 已取消任务 ${taskId}`)
    }
  }

  /**
   * 错误分类（扩展版 - 支持三层超时架构）
   * 
   * 优先级: 精确匹配的超时类型 > 状态码 > 关键词
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message
    const messageLower = message.toLowerCase()
    const status = 'status' in error ? (error as { status: number }).status : undefined
    
    // 1. 优先识别三层超时架构的错误（精确匹配错误消息）
    if (message.includes('TIMEOUT:')) {
      if (message.includes('任务总超时（兜底）')) {
        return 'TIMEOUT_TOTAL'
      }
      if (message.includes('HTTP请求超时（主动关闭）')) {
        return 'TIMEOUT_HTTP'
      }
      if (message.includes('首个token超时（主动关闭）') || message.includes('等待首个token超时')) {
        return 'TIMEOUT_FIRST_TOKEN'
      }
      if (message.includes('空闲超时（主动关闭）') || message.includes('流式响应空闲超时')) {
        return 'TIMEOUT_IDLE'
      }
    }
    
    // 2. 服务器连接关闭
    if (message.includes('CONNECTION:') && message.includes('服务器关闭连接')) {
      return 'CONNECTION_CLOSED'
    }
    
    // 3. 限流错误（429）- 特殊处理
    if (status === 429 || messageLower.includes('429') || messageLower.includes('rate limit')) {
      return 'RATE_LIMIT'
    }
    
    // 4. API错误（非429的其他HTTP错误）
    if (message.includes('API_ERROR:') || (status !== undefined && status >= 400 && status !== 429)) {
      return 'API_ERROR'
    }
    
    // 5. 通用超时（向后兼容）
    if (status === 408 || status === 504 || messageLower.includes('timeout') || messageLower.includes('econnaborted')) {
      return 'TIMEOUT'
    }
    
    // 6. 认证错误
    if (status === 401 || status === 403 || messageLower.includes('api key') || 
        messageLower.includes('unauthorized') || messageLower.includes('forbidden')) {
      return 'INVALID_API_KEY'
    }
    
    // 7. 网络错误
    if (messageLower.includes('network') || messageLower.includes('econnrefused') || 
        messageLower.includes('econnreset') || messageLower.includes('etimedout')) {
      return 'NETWORK'
    }
    
    // 8. 模型错误
    if (messageLower.includes('model') || messageLower.includes('invalid model') || status === 404) {
      return 'MODEL_ERROR'
    }
    
    // 9. 服务器错误（500、502、503等）
    if ((status !== undefined && status >= 500) || messageLower.includes('500') || 
        messageLower.includes('internal server error') || messageLower.includes('bad gateway') || 
        messageLower.includes('service unavailable') || messageLower.includes('malformed')) {
      return 'MODEL_ERROR'
    }
    
    // 10. 未知错误
    return 'UNKNOWN'
  }

  /**
   * 延迟辅助函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
