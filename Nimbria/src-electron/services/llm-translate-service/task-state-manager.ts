/**
 * Task State Manager
 * 
 * @description
 * 任务状态管理器
 * 
 * 职责：
 * - 追踪每个任务的实时状态
 * - 计算任务进度（基于 Token 流）
 * - 发射状态变更事件
 * - 同步状态到数据库
 * 
 * 特点：
 * - 内存缓存（快速访问）
 * - 自动持久化（数据库同步）
 * - 事件驱动（实时通知）
 */

import { EventEmitter } from 'events'
import type { ProjectDatabase } from '../database-service/project-database'
import type {
  TaskStatus,
  TaskStateChangeEvent,
  TaskProgressUpdateEvent,
  TaskCompletionEvent,
  TaskErrorEvent,
  TaskStateSnapshot,
  ErrorType
} from '../../types/LlmTranslate/backend'

export class TaskStateManager extends EventEmitter {
  private projectDatabase: ProjectDatabase | null = null
  private stateCache: Map<string, TaskStateSnapshot> = new Map()
  private progressUpdateThrottle: Map<string, number> = new Map() // 节流控制

  constructor() {
    super()
  }

  /**
   * 设置项目数据库
   */
  setProjectDatabase(db: ProjectDatabase): void {
    this.projectDatabase = db
  }

  /**
   * 初始化任务状态
   */
  initializeTask(taskId: string, batchId: string, estimatedTokens: number): void {
    const snapshot: TaskStateSnapshot = {
      taskId,
      batchId,
      status: 'unsent',
      progress: 0,
      currentTokens: 0,
      estimatedTokens,
      translation: null,
      error: null,
      updatedAt: new Date()
    }

    this.stateCache.set(taskId, snapshot)
    console.log(`📊 [TaskStateManager] 初始化任务 ${taskId}`)
  }

  /**
   * 更新任务状态
   */
  async updateState(
    taskId: string, 
    newStatus: TaskStatus, 
    additionalData?: Partial<TaskStateSnapshot>
  ): Promise<void> {
    const current = this.stateCache.get(taskId)
    if (!current) {
      console.warn(`[TaskStateManager] 任务 ${taskId} 未初始化`)
      return
    }

    const previousStatus = current.status
    
    // 更新内存缓存
    const updated: TaskStateSnapshot = {
      ...current,
      status: newStatus,
      ...additionalData,
      updatedAt: new Date()
    }
    
    this.stateCache.set(taskId, updated)

    // 发射状态变更事件
    this.emit('state:change', {
      taskId,
      batchId: current.batchId,
      previousState: previousStatus,
      currentState: newStatus,
      timestamp: updated.updatedAt.toISOString()
    } as TaskStateChangeEvent)

    // 持久化到数据库
    await this.persistState(updated)

    console.log(`📊 [TaskStateManager] 任务 ${taskId}: ${previousStatus} → ${newStatus}`)
  }

  /**
   * 更新任务进度
   */
  async updateProgress(
    taskId: string,
    chunk: string,
    currentTokens: number
  ): Promise<void> {
    const current = this.stateCache.get(taskId)
    if (!current) return

    // 计算进度百分比
    const progress = Math.min(
      (currentTokens / current.estimatedTokens) * 100,
      100
    )

    // 更新缓存
    const updated: TaskStateSnapshot = {
      ...current,
      progress,
      currentTokens,
      translation: (current.translation || '') + chunk,
      updatedAt: new Date()
    }
    
    this.stateCache.set(taskId, updated)

    // 节流控制：避免过于频繁的事件和数据库写入
    if (this.shouldEmitProgress(taskId)) {
      // 发射进度事件
      this.emit('progress:update', {
        taskId,
        batchId: current.batchId,
        progress,
        currentTokens,
        estimatedTokens: current.estimatedTokens,
        chunk
      } as TaskProgressUpdateEvent)

      // 持久化进度到数据库（仅更新进度和 Token）
      await this.persistProgress(taskId, progress, currentTokens, updated.translation || '')

      // 记录最后发射时间
      this.progressUpdateThrottle.set(taskId, Date.now())
    }
  }

  /**
   * 标记任务完成
   */
  async markComplete(
    taskId: string,
    result: {
      translation: string
      inputTokens: number
      outputTokens: number
      cost: number
      durationMs: number
    }
  ): Promise<void> {
    const current = this.stateCache.get(taskId)
    if (!current) return

    // 更新为完成状态
    await this.updateState(taskId, 'completed', {
      progress: 100,
      translation: result.translation
    })

    // 发射完成事件
    this.emit('task:complete', {
      taskId,
      batchId: current.batchId,
      ...result
    } as TaskCompletionEvent)

    // 持久化完整结果
    await this.persistCompletion(taskId, result)

    // 清理节流记录
    this.progressUpdateThrottle.delete(taskId)

    console.log(`✅ [TaskStateManager] 任务 ${taskId} 完成`)
  }

  /**
   * 标记任务错误
   */
  async markError(
    taskId: string,
    errorType: ErrorType,
    errorMessage: string,
    retryCount: number = 0
  ): Promise<void> {
    const current = this.stateCache.get(taskId)
    if (!current) return

    // 根据错误类型确定任务状态
    const newStatus: TaskStatus = errorType === 'RATE_LIMIT' ? 'throttled' : 'error'

    // 更新为错误状态
    await this.updateState(taskId, newStatus, {
      error: errorMessage
    })

    // 发射错误事件
    this.emit('task:error', {
      taskId,
      batchId: current.batchId,
      errorType,
      errorMessage,
      retryCount
    } as TaskErrorEvent)

    // 持久化错误信息
    await this.persistError(taskId, errorType, errorMessage, retryCount)

    console.error(`❌ [TaskStateManager] 任务 ${taskId} 错误: ${errorType} - ${errorMessage}`)
  }

  /**
   * 暂停任务
   */
  async pauseTask(taskId: string): Promise<void> {
    await this.markError(taskId, 'USER_PAUSED', '用户手动暂停任务', 0)
  }

  /**
   * 获取任务状态快照
   */
  getState(taskId: string): TaskStateSnapshot | null {
    return this.stateCache.get(taskId) || null
  }

  /**
   * 获取批次的所有任务状态
   */
  getBatchStates(batchId: string): TaskStateSnapshot[] {
    return Array.from(this.stateCache.values())
      .filter(snapshot => snapshot.batchId === batchId)
  }

  /**
   * 清理任务状态（任务完成后）
   */
  cleanup(taskId: string): void {
    this.stateCache.delete(taskId)
    this.progressUpdateThrottle.delete(taskId)
  }

  /**
   * 清理批次的所有任务状态
   */
  cleanupBatch(batchId: string): void {
    const taskIds = Array.from(this.stateCache.values())
      .filter(s => s.batchId === batchId)
      .map(s => s.taskId)

    taskIds.forEach(id => this.cleanup(id))
    console.log(`🧹 [TaskStateManager] 清理批次 ${batchId} 的 ${taskIds.length} 个任务状态`)
  }

  // ==================== 私有方法 ====================

  /**
   * 判断是否应该发射进度事件（节流控制）
   */
  private shouldEmitProgress(taskId: string): boolean {
    const lastEmit = this.progressUpdateThrottle.get(taskId) || 0
    const now = Date.now()
    // 最小间隔 100ms
    return (now - lastEmit) >= 100
  }

  /**
   * 持久化状态到数据库
   */
  private async persistState(snapshot: TaskStateSnapshot): Promise<void> {
    if (!this.projectDatabase) return

    try {
      this.projectDatabase.execute(
        `UPDATE Llmtranslate_tasks 
         SET status = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [snapshot.status, snapshot.taskId]
      )
    } catch (error) {
      console.error(`[TaskStateManager] 持久化状态失败:`, error)
    }
  }

  /**
   * 持久化进度到数据库
   */
  private async persistProgress(
    taskId: string,
    progress: number,
    currentTokens: number,
    translation: string
  ): Promise<void> {
    if (!this.projectDatabase) return

    try {
      this.projectDatabase.execute(
        `UPDATE Llmtranslate_tasks 
         SET progress = ?, reply_tokens = ?, translation = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [progress, currentTokens, translation, taskId]
      )
    } catch (error) {
      console.error(`[TaskStateManager] 持久化进度失败:`, error)
    }
  }

  /**
   * 持久化完成结果到数据库
   */
  private async persistCompletion(
    taskId: string,
    result: {
      translation: string
      inputTokens: number
      outputTokens: number
      cost: number
      durationMs: number
    }
  ): Promise<void> {
    if (!this.projectDatabase) return

    try {
      this.projectDatabase.execute(
        `UPDATE Llmtranslate_tasks 
         SET status = 'completed',
             translation = ?,
             input_tokens = ?,
             reply_tokens = ?,
             cost = ?,
             duration_ms = ?,
             progress = 100,
             reply_time = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          result.translation,
          result.inputTokens,
          result.outputTokens,
          result.cost,
          result.durationMs,
          taskId
        ]
      )
    } catch (error) {
      console.error(`[TaskStateManager] 持久化完成结果失败:`, error)
    }
  }

  /**
   * 持久化错误信息到数据库
   */
  private async persistError(
    taskId: string,
    errorType: ErrorType,
    errorMessage: string,
    retryCount: number
  ): Promise<void> {
    if (!this.projectDatabase) return

    const status = errorType === 'RATE_LIMIT' ? 'throttled' : 'error'

    try {
      this.projectDatabase.execute(
        `UPDATE Llmtranslate_tasks 
         SET status = ?,
             error_type = ?,
             error_message = ?,
             retry_count = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, errorType, errorMessage, retryCount, taskId]
      )
    } catch (error) {
      console.error(`[TaskStateManager] 持久化错误信息失败:`, error)
    }
  }
}

