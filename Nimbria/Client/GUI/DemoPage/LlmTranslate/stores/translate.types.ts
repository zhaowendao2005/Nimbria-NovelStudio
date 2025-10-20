/**
 * Translate 模块类型定义
 */

import type { Task, TaskFilter, Batch, TranslateConfig } from '../types'

// ==================== Store 状态类型 ====================

export interface TranslateState {
  config: TranslateConfig
  batchList: Batch[]
  currentBatch: Batch | null
  taskList: Task[]
  selectedTasks: string[]
  selectedTaskIds: Set<string>
  taskFilters: TaskFilter
  threadDrawer: {
    isOpen: boolean
    currentTaskId: string | null
  }
  loading: boolean
  error: string | null
  useMock: boolean
}

// ==================== Datasource 接口类型 ====================

export interface TranslateDatasource {
  fetchBatchList(): Promise<Batch[]>
  fetchTaskList(batchId: string): Promise<Task[]>
  createBatch(config: TranslateConfig): Promise<Batch>
  updateBatch(batchId: string, updates: Partial<Batch>): Promise<Batch>
  deleteBatch(batchId: string): Promise<void>
  retryFailedTasks(batchId: string): Promise<void>
  pauseBatch(batchId: string): Promise<void>
  resumeBatch(batchId: string): Promise<void>
  sendTasks(batchId: string, taskIds: string[]): Promise<void>
  deleteTasks(taskIds: string[]): Promise<void>
  pauseTask(taskId: string): Promise<void>
  retryTask(taskId: string): Promise<void>
}

// ==================== Datasource 上下文类型 ====================

export interface DatasourceContext {
  useMock: boolean
  electronAPI?: {
    getBatches(): Promise<{ success: boolean; data?: { batches: Batch[] }; error?: string }>
    getTasks(params: { batchId: string }): Promise<{ success: boolean; data?: { tasks: Task[] }; error?: string }>
    createBatch(params: { config: TranslateConfig }): Promise<{ success: boolean; data?: { batch: Batch }; error?: string }>
    updateBatch(params: { batchId: string; updates: Partial<Batch> }): Promise<{ success: boolean; data?: { batch: Batch }; error?: string }>
    deleteBatch(params: { batchId: string }): Promise<{ success: boolean; error?: string }>
    retryFailedTasks(params: { batchId: string }): Promise<{ success: boolean; error?: string }>
    pauseBatch(params: { batchId: string }): Promise<{ success: boolean; error?: string }>
    resumeBatch(params: { batchId: string }): Promise<{ success: boolean; error?: string }>
    sendTasks(params: { taskIds: string[] }): Promise<{ success: boolean; error?: string }>
    deleteTasks(params: { taskIds: string[] }): Promise<{ success: boolean; error?: string }>
    pauseTask(params: { taskId: string }): Promise<{ success: boolean; error?: string }>
    retryTask(params: { taskId: string }): Promise<{ success: boolean; error?: string }>
  }
}

// ==================== 请求/响应类型 ====================

export interface BatchListResponse {
  batches: Batch[]
}

export interface TaskListResponse {
  tasks: Task[]
}

export interface CreateBatchRequest {
  config: TranslateConfig
}

export interface CreateBatchResponse {
  batch: Batch
}

// ==================== 线程详情类型 ====================

export interface ThreadDetail {
  taskId: string
  messages: ChatMessage[]
  status: string
  progress: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  tokens?: number
}

// ==================== 统计类型 ====================

export interface BatchStats {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  successRate: number
}

export interface TokenEstimate {
  inputTokens: number
  systemPromptTokens: number
  totalTokens: number
  estimatedCost: number
}

// ==================== 工具方法类型 ====================

export interface TaskProgressInfo {
  taskId: string
  progress: number
  replyTokens: number
  predictedTokens: number
}
