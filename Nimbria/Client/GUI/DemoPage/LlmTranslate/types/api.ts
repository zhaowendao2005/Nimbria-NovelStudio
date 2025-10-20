/**
 * API 相关类型定义
 * 定义前后端通信的请求和响应格式
 */

import type { Batch } from './batch'
import type { Task } from './task'
import type { TranslateConfig } from './config'

// ==================== 通用响应 ====================

/**
 * 通用 API 响应
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ==================== 批次相关 ====================

/**
 * 创建批次请求
 */
export interface CreateBatchRequest {
  config: TranslateConfig
}

/**
 * 创建批次响应
 */
export interface CreateBatchResponse {
  batch: Batch
}

/**
 * 获取批次列表响应
 */
export interface GetBatchesResponse {
  batches: Batch[]
  total: number
}

/**
 * 获取单个批次响应
 */
export interface GetBatchResponse {
  batch: Batch
}

// ==================== 任务相关 ====================

/**
 * 获取任务列表请求
 */
export interface GetTasksRequest {
  batchId: string
}

/**
 * 获取任务列表响应
 */
export interface GetTasksResponse {
  tasks: Task[]
  total: number
}

/**
 * 获取单个任务请求
 */
export interface GetTaskRequest {
  taskId: string
}

/**
 * 获取单个任务响应
 */
export interface GetTaskResponse {
  task: Task
}

/**
 * 提交任务请求
 */
export interface SubmitTasksRequest {
  batchId: string
  taskIds: string[]
}

/**
 * 提交任务响应
 */
export interface SubmitTasksResponse {
  submissionId: string
}

/**
 * 重试失败任务请求
 */
export interface RetryFailedTasksRequest {
  batchId: string
}

/**
 * 重试失败任务响应
 */
export interface RetryFailedTasksResponse {
  submissionId: string
}

// ==================== 流式进度更新 ====================

/**
 * 流式进度更新
 */
export interface StreamProgressUpdate {
  taskId: string
  replyTokens: number
  content: string
  completed: boolean
}

// ==================== 导出相关 ====================

/**
 * 导出批次请求
 */
export interface ExportBatchRequest {
  batchId: string
  options: {
    format: 'parallel' | 'sequential' | 'json' | 'csv'
    includeOriginal: boolean
    includeTranslation: boolean
    includeMetadata: boolean
    includeStatus: boolean
    onlyCompleted: boolean
  }
}

/**
 * 导出批次响应
 */
export interface ExportBatchResponse {
  exportId: string
}
