/**
 * 任务相关类型定义
 */

import type { TranslateConfig } from './config'

export type TaskStatus = 'unsent' | 'queued' | 'waiting' | 'throttled' | 'error' | 'completed'

export interface TaskMetadata {
  // 批次公共配置
  systemPrompt: string
  chunkStrategy: 'line' | 'token'
  chunkSizeByLine: number
  chunkSizeByToken: number
  concurrency: number
  replyMode: 'predicted' | 'equivalent'
  modelId: string
  
  // 任务私有信息
  estimatedInputTokens: number
  estimatedOutputTokens: number
  actualInputTokens?: number
  actualOutputTokens?: number
  estimatedCost: number
  actualCost?: number
}

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
  metadata: TaskMetadata
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
  selectMode: boolean
}

