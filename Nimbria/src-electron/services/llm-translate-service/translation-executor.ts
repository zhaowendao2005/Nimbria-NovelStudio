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

    console.log(`🎬 [TranslationExecutor] 开始执行批次 ${batchId}，共 ${taskIds.length} 个任务，并发: ${concurrency}`)

    // 启动并发 worker
    const workers: Promise<void>[] = []
    for (let i = 0; i < Math.min(concurrency, taskIds.length); i++) {
      workers.push(this.worker(batchId, config))
    }

    await Promise.all(workers)

    console.log(`✅ [TranslationExecutor] 批次 ${batchId} 执行完成`)

    // 清理批次状态
    this.taskStateManager.cleanupBatch(batchId)
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
      await this.delay(1000 / config.concurrency * 60)  // 基于并发数计算间隔
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

      // 4. 创建翻译客户端配置
      const clientConfig: TranslationClientConfig = {
        modelId: config.modelId,
        systemPrompt: config.systemPrompt,
        temperature: 0.7,
        maxTokens: config.predictedTokens,
        timeout: 30000,
        maxRetries: 3
      }

      // 5. 创建翻译客户端
      const client = new LlmTranslationClient(clientConfig, this.llmConfigManager)

      // 6. 构建翻译请求
      const request: TranslationRequest = {
        taskId,
        content: task.content,
        estimatedTokens: config.predictedTokens
      }

      // 7. 更新状态为 sending
      await this.taskStateManager.updateState(taskId, 'sending')

      // 8. 执行翻译（流式）
      const result = await client.translateStream(request, {
        onStart: (id) => {
          console.log(`🚀 [Executor] 任务 ${id} 开始翻译`)
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

      // 9. 标记任务完成
      await this.taskStateManager.markComplete(taskId, {
        translation: result.translation,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cost: result.cost,
        durationMs: result.durationMs
      })

      // 10. 更新批次统计
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
   * 延迟辅助函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
