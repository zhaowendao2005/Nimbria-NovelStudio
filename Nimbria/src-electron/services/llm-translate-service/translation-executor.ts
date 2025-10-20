/**
 * 翻译执行器 - Electron 主进程任务队列管理器
 * 
 * 职责：
 * - 管理任务队列（FIFO）
 * - 并发控制（限制同时执行的任务数）
 * - 与 LlmChatService 交互调用本地LLM进行翻译
 * - 监听流式响应并广播进度事件
 * - 错误捕获和重试逻辑
 * 
 * ⚠️ 所有操作都在主进程本地完成，无外部网络调用
 */

import type { LlmTranslateService } from './llm-translate-service'
import type { LlmChatService } from '../llm-chat-service/llm-chat-service'
import type { TranslateConfig, ErrorType, TaskSubmittedEvent, TaskProgressEvent, TaskCompleteEvent, TaskErrorEvent } from './types'

export class TranslationExecutor {
  private llmTranslateService: LlmTranslateService
  private llmChatService: LlmChatService
  private taskQueues: Map<string, string[]> = new Map()  // batchId -> taskIds[]
  private pausedBatches: Set<string> = new Set()
  private activeTaskCount: Map<string, number> = new Map()  // batchId -> count

  constructor(llmTranslateService: LlmTranslateService, llmChatService: LlmChatService) {
    this.llmTranslateService = llmTranslateService
    this.llmChatService = llmChatService
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

    // 启动并发任务
    const workers: Promise<void>[] = []
    for (let i = 0; i < Math.min(concurrency, taskIds.length); i++) {
      workers.push(this.worker(batchId, config))
    }

    await Promise.all(workers)

    console.log(`✅ [TranslationExecutor] 批次 ${batchId} 执行完成`)
  }

  /**
   * 工作线程：不断从队列取任务并执行
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
   * 执行单个任务
   */
  private async executeTask(batchId: string, taskId: string, config: TranslateConfig): Promise<void> {
    const projectDb = this.llmTranslateService.getProjectDatabase()
    if (!projectDb) return

    try {
      // 1. 获取任务
      const task = await this.llmTranslateService.getTask(taskId)
      if (!task) {
        throw new Error(`Task ${taskId} not found`)
      }

      // 2. 更新状态为 waiting
      projectDb.execute(
        `UPDATE Llmtranslate_tasks 
         SET status = 'waiting', sent_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [taskId]
      )

      this.llmTranslateService.emit('task:submitted', {
        batchId,
        taskId,
        sentTime: new Date().toISOString()
      } as TaskSubmittedEvent)

      // 3. 调用 LLM 进行翻译（使用 LlmChatService）
      const startTime = Date.now()
      let translationResult = ''
      let replyTokens = 0

      // 创建临时对话
      const conversationId = await this.llmChatService.createConversation(config.modelId, {
        temperature: 0.7,
        maxTokens: config.predictedTokens
      })

      // 发送消息
      const messageId = await this.llmChatService.sendMessage(conversationId, 
        `${config.systemPrompt}\n\n${task.content}`
      )

      // 通过事件监听流式进度
      const chunkHandler = (data: { messageId: string; chunk: string; conversationId: string }) => {
        if (data.conversationId === conversationId && data.messageId === messageId) {
          translationResult += data.chunk
          replyTokens = this.estimateTokens(translationResult)
          
          const progress = Math.min((replyTokens / task.predictedTokens) * 100, 100)

          // 发射进度事件
          this.llmTranslateService.emit('task:progress', {
            batchId,
            taskId,
            replyTokens,
            progress,
            chunk: data.chunk
          } as TaskProgressEvent)

          // 更新数据库进度
          try {
            projectDb.execute(
              `UPDATE Llmtranslate_tasks 
               SET reply_tokens = ?, progress = ?, updated_at = CURRENT_TIMESTAMP 
               WHERE id = ?`,
              [replyTokens, progress, taskId]
            )
          } catch (err) {
            console.error('Failed to update task progress:', err)
          }
        }
      }

      this.llmChatService.on('message:chunk', chunkHandler)

      // 等待响应完成
      await new Promise<void>((resolve, reject) => {
        const completeHandler = (data: { messageId: string; conversationId: string }) => {
          if (data.conversationId === conversationId && data.messageId === messageId) {
            this.llmChatService.off('message:chunk', chunkHandler)
            this.llmChatService.off('message:complete', completeHandler)
            this.llmChatService.off('message:error', errorHandler)
            resolve()
          }
        }

        const errorHandler = (data: { messageId: string; conversationId: string; error: string }) => {
          if (data.conversationId === conversationId && data.messageId === messageId) {
            this.llmChatService.off('message:chunk', chunkHandler)
            this.llmChatService.off('message:complete', completeHandler)
            this.llmChatService.off('message:error', errorHandler)
            reject(new Error(data.error))
          }
        }

        this.llmChatService.on('message:complete', completeHandler)
        this.llmChatService.on('message:error', errorHandler)
      })

      // 4. 任务完成
      const durationMs = Date.now() - startTime
      const cost = this.calculateCost(task.inputTokens, replyTokens)

      projectDb.execute(
        `UPDATE Llmtranslate_tasks 
         SET status = 'completed', 
             translation = ?,
             reply_tokens = ?,
             progress = 100,
             reply_time = CURRENT_TIMESTAMP,
             duration_ms = ?,
             cost = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [translationResult, replyTokens, durationMs, cost, taskId]
      )

      // 5. 发射完成事件
      this.llmTranslateService.emit('task:complete', {
        batchId,
        taskId,
        translation: translationResult,
        totalTokens: replyTokens,
        durationMs,
        cost
      } as TaskCompleteEvent)

      // 6. 更新批次统计
      await this.llmTranslateService.updateBatchStats(batchId)

      // 7. 清理临时对话
      await this.llmChatService.deleteConversation(conversationId)

    } catch (error) {
      // 错误处理
      const errorMessage = error instanceof Error ? error.message : String(error)
      let errorType: ErrorType = 'unknown'

      if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        errorType = 'rate_limit'
        projectDb.execute(
          `UPDATE Llmtranslate_tasks 
           SET status = 'throttled', error_type = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [errorType, errorMessage, taskId]
        )
      } else if (errorMessage.includes('timeout')) {
        errorType = 'timeout'
        projectDb.execute(
          `UPDATE Llmtranslate_tasks 
           SET status = 'error', error_type = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [errorType, errorMessage, taskId]
        )
      } else {
        projectDb.execute(
          `UPDATE Llmtranslate_tasks 
           SET status = 'error', error_type = 'unknown', error_message = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [errorMessage, taskId]
        )
      }

      // 发射错误事件
      this.llmTranslateService.emit('task:error', {
        batchId,
        taskId,
        errorType,
        errorMessage
      } as TaskErrorEvent)

      // 更新批次统计
      await this.llmTranslateService.updateBatchStats(batchId)
    }
  }

  /**
   * 暂停批次
   */
  pauseBatch(batchId: string): void {
    this.pausedBatches.add(batchId)
    console.log(`⏸️ [TranslationExecutor] 批次 ${batchId} 已暂停`)
  }

  /**
   * 恢复批次
   */
  resumeBatch(batchId: string): void {
    this.pausedBatches.delete(batchId)
    console.log(`▶️ [TranslationExecutor] 批次 ${batchId} 已恢复`)
    
    // TODO: 重新启动工作线程
  }

  /**
   * 估算 Token 数
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * 计算成本
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    // 示例价格（需要根据实际模型调整）
    const INPUT_PRICE_PER_1K = 0.03  // $0.03 per 1K tokens
    const OUTPUT_PRICE_PER_1K = 0.06 // $0.06 per 1K tokens
    
    return (inputTokens / 1000) * INPUT_PRICE_PER_1K + (outputTokens / 1000) * OUTPUT_PRICE_PER_1K
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

