/**
 * Task State Manager 类型定义
 * 
 * @description
 * 任务状态管理器的事件和快照类型
 */

import type { ErrorType } from './translation-client'

/**
 * 任务状态类型
 */
export type TaskStatus = 
  | 'unsent'      // 未发送
  | 'waiting'     // 等待中
  | 'sending'     // 发送中（流式接收）
  | 'throttled'   // 被限流
  | 'error'       // 错误
  | 'completed'   // 已完成

/**
 * 任务状态变更事件
 */
export interface TaskStateChangeEvent {
  /** 任务 ID */
  taskId: string
  
  /** 批次 ID */
  batchId: string
  
  /** 之前的状态 */
  previousState: TaskStatus
  
  /** 当前状态 */
  currentState: TaskStatus
  
  /** 时间戳 */
  timestamp: string
}

/**
 * 任务进度更新事件
 */
export interface TaskProgressUpdateEvent {
  /** 任务 ID */
  taskId: string
  
  /** 批次 ID */
  batchId: string
  
  /** 进度百分比（0-100） */
  progress: number
  
  /** 当前已接收 Token */
  currentTokens: number
  
  /** 预估总 Token */
  estimatedTokens: number
  
  /** 最新接收的内容片段 */
  chunk?: string
}

/**
 * 任务完成事件
 */
export interface TaskCompletionEvent {
  /** 任务 ID */
  taskId: string
  
  /** 批次 ID */
  batchId: string
  
  /** 翻译结果 */
  translation: string
  
  /** 输入 Token */
  inputTokens: number
  
  /** 输出 Token */
  outputTokens: number
  
  /** 费用 */
  cost: number
  
  /** 耗时（毫秒） */
  durationMs: number
}

/**
 * 任务错误事件
 */
export interface TaskErrorEvent {
  /** 任务 ID */
  taskId: string
  
  /** 批次 ID */
  batchId: string
  
  /** 错误类型 */
  errorType: ErrorType
  
  /** 错误消息 */
  errorMessage: string
  
  /** 重试次数 */
  retryCount: number
}

/**
 * 任务状态快照
 */
export interface TaskStateSnapshot {
  /** 任务 ID */
  taskId: string
  
  /** 批次 ID */
  batchId: string
  
  /** 状态 */
  status: TaskStatus
  
  /** 进度（0-100） */
  progress: number
  
  /** 当前已接收 Token */
  currentTokens: number
  
  /** 预估总 Token */
  estimatedTokens: number
  
  /** 翻译结果 */
  translation: string | null
  
  /** 错误信息 */
  error: string | null
  
  /** 更新时间 */
  updatedAt: Date
}

