/**
 * 任务相关类型定义
 */

export type TaskStatus = 'unsent' | 'waiting' | 'throttled' | 'error' | 'completed'

export interface Task {
  id: string
  batchId: string
  status: TaskStatus
  content: string
  translation?: string
  sentTime?: string
  replyTime?: string
  replyTokens: number
  predictedTokens: number
  progress: number
  errorMessage?: string
  retryCount: number
}

export interface TaskStats {
  total: number
  completed: number
  waiting: number
  throttled: number
  error: number
  unsent: number
  successRate: number
}

export interface TaskFilter {
  status: TaskStatus[]
  searchText: string
}

