/**
 * API 相关类型定义
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface BatchCreateRequest {
  config: any
  tasks: any[]
}

export interface BatchCreateResponse {
  batchId: string
  totalTasks: number
}

export interface TaskRetryRequest {
  taskId: string
  batchId: string
}

export interface StreamProgressUpdate {
  taskId: string
  replyTokens: number
  content: string
  completed: boolean
}

