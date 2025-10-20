/**
 * 后端事件类型定义
 * 用于 LlmTranslateService 的事件驱动架构
 */

import type { Batch, Task } from '../client'

// ==================== 批次事件 ====================

/** 批次创建开始事件 */
export interface BatchCreateStartEvent {
  batchId: string
  totalTasks: number
}

/** 批次创建完成事件 */
export interface BatchCreatedEvent {
  batchId: string
  batch: Batch
  tasks: Task[]
}

/** 批次创建错误事件 */
export interface BatchCreateErrorEvent {
  batchId: string
  error: string
}

/** 批次暂停事件 */
export interface BatchPauseEvent {
  batchId: string
}

/** 批次恢复事件 */
export interface BatchResumeEvent {
  batchId: string
}

// ==================== 任务事件 ====================

/** 任务提交开始事件 */
export interface TaskSubmitStartEvent {
  batchId: string
  taskIds: string[]
}

/** 任务已提交事件 */
export interface TaskSubmittedEvent {
  taskId: string
  batchId: string
}

/** 任务进度更新事件 */
export interface TaskProgressEvent {
  taskId: string
  batchId: string
  replyTokens: number
  progress: number
  content: string
}

/** 任务完成事件 */
export interface TaskCompleteEvent {
  taskId: string
  batchId: string
  translation: string
  inputTokens: number
  outputTokens: number
  cost: number
  durationMs: number
}

/** 任务错误事件 */
export interface TaskErrorEvent {
  taskId: string
  batchId: string
  errorType: string
  errorMessage: string
}

// ==================== 导出事件 ====================

/** 导出开始事件 */
export interface ExportStartEvent {
  exportId: string
  batchId: string
}

/** 导出完成事件 */
export interface ExportCompleteEvent {
  exportId: string
  batchId: string
  filePath: string
}

/** 导出错误事件 */
export interface ExportErrorEvent {
  exportId: string
  batchId: string
  error: string
}

