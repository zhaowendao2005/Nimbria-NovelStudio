/**
 * 批次相关类型定义
 */

export type BatchStatus = 'running' | 'paused' | 'completed' | 'failed'

export interface Batch {
  id: string
  status: BatchStatus
  totalTasks: number
  completedTasks: number
  failedTasks: number
  throttledTasks: number
  waitingTasks: number
  unsentTasks: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  avgTimePerTask: number
}

export interface BatchStats {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  successRate: number
  totalCost: number
  estimatedTime: number
}

