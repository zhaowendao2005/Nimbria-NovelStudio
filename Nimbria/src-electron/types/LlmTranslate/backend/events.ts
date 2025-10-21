/**
 * 后端事件类型定义
 * 用于 LlmTranslateService 的事件驱动架构
 */

import type { Batch, Task } from '../client'
import type {
  TaskProgressUpdateEvent,
  TaskCompletionEvent,
  TaskErrorEvent as TaskStateErrorEvent
} from './task-state'

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

/** 批次删除开始事件 */
export interface BatchDeleteStartEvent {
  batchId: string
}

/** 批次删除完成事件 */
export interface BatchDeletedEvent {
  batchId: string
  deletedTaskCount: number
}

/** 批次删除错误事件 */
export interface BatchDeleteErrorEvent {
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

/** 任务删除开始事件 */
export interface TaskDeleteStartEvent {
  taskIds: string[]
  batchId: string
}

/** 任务删除完成事件 */
export interface TaskDeletedEvent {
  taskIds: string[]
  batchId: string
  deletedCount: number
}

/** 任务删除错误事件 */
export interface TaskDeleteErrorEvent {
  taskIds: string[]
  batchId: string
  error: string
}

/** 任务进度更新事件 */
export type TaskProgressEvent = TaskProgressUpdateEvent

/** 任务完成事件 */
export type TaskCompleteEvent = TaskCompletionEvent

/** 任务错误事件 */
export type TaskErrorEvent = TaskStateErrorEvent

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

// ==================== 调度器事件 ====================

/** 调度器状态变化事件 */
export interface SchedulerStatusChangedEvent {
  batchId: string
  status: {
    state: 'idle' | 'running' | 'paused' | 'throttled' | 'completed'
    waitingCount: number
    activeCount: number
    completedCount: number
    errorCount: number
    throttledUntil: number | undefined
  }
}

/** 调度器完成事件 */
export interface SchedulerCompletedEvent {
  batchId: string
  completedCount: number
  errorCount: number
}

/** 调度器限流事件 */
export interface SchedulerThrottledEvent {
  batchId: string
  throttledUntil: number
}

/** 调度器从限流恢复事件 */
export interface ThrottleRecoveredEvent {
  batchId: string
}

/** 限流测试结果事件 */
export interface ThrottleTestResultEvent {
  modelId: string
  result: {
    success: boolean
    responseTime: number
    error?: string
  }
}