/**
 * LLM Translate Service 类型定义
 * 严格强类型，禁止 any，确保类型安全
 */

// ========== 基础类型 ==========

export type TaskStatus = 'unsent' | 'waiting' | 'throttled' | 'error' | 'completed' | 'terminated'
export type BatchStatus = 'running' | 'paused' | 'completed' | 'failed' | 'terminated'
export type ChunkStrategy = 'line' | 'token'
export type ReplyMode = 'predicted' | 'equivalent'
export type ErrorType = 'network' | 'timeout' | 'rate_limit' | 'terminated' | 'unknown'

// ========== 配置类型 ==========

export interface TranslateConfig {
  inputSource: 'file' | 'text'
  content: string
  filePath: string
  systemPrompt: string
  chunkStrategy: ChunkStrategy
  chunkSize: number
  concurrency: number
  replyMode: ReplyMode
  predictedTokens: number
  modelId: string
  outputDir: string
}

// ========== 批次类型 ==========

export interface Batch {
  id: string
  status: BatchStatus
  configJson: string // TranslateConfig 的 JSON 序列化
  totalTasks: number
  completedTasks: number
  failedTasks: number
  throttledTasks: number
  waitingTasks: number
  unsentTasks: number
  terminatedTasks: number
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  avgTimePerTask: number
  fastestTaskTime: number
  slowestTaskTime: number
  estimatedCompletionTime: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  updatedAt: string
}

export interface BatchCreateRequest {
  config: TranslateConfig
  content: string
}

export interface BatchStats {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  successRate: number
  totalCost: number
  estimatedTime: number
}

// ========== 任务类型 ==========

export interface Task {
  id: string
  batchId: string
  status: TaskStatus
  content: string
  translation: string | null
  inputTokens: number
  replyTokens: number
  predictedTokens: number
  progress: number
  sentTime: string | null
  replyTime: string | null
  durationMs: number | null
  errorMessage: string | null
  errorType: ErrorType | null
  retryCount: number
  cost: number
  metadataJson: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskCreateData {
  id: string
  batchId: string
  content: string
  predictedTokens: number
}

// ========== 统计类型 ==========

export interface TranslateStats {
  batchId: string
  fastestTaskId: string | null
  fastestTime: number | null
  slowestTaskId: string | null
  slowestTime: number | null
  avgTime: number
  networkErrors: number
  timeoutErrors: number
  rateLimitErrors: number
  terminatedErrors: number
  unknownErrors: number
  totalCost: number
  avgCostPerTask: number
  totalInputTokens: number
  totalOutputTokens: number
  fastCompletionCount: number
  normalCompletionCount: number
  slowCompletionCount: number
  updatedAt: string
}

// ========== 事件类型 ==========

export interface BatchCreateStartEvent {
  batchId: string
  totalTasks: number
}

export interface BatchCreatedEvent {
  batchId: string
  batch: Batch
  tasks: Task[]
}

export interface BatchCreateErrorEvent {
  batchId: string
  error: string
}

export interface TaskSubmitStartEvent {
  batchId: string
  taskIds: string[]
}

export interface TaskSubmittedEvent {
  batchId: string
  taskId: string
  sentTime: string
}

export interface TaskProgressEvent {
  batchId: string
  taskId: string
  replyTokens: number
  progress: number
  chunk: string
}

export interface TaskCompleteEvent {
  batchId: string
  taskId: string
  translation: string
  totalTokens: number
  durationMs: number
  cost: number
}

export interface TaskErrorEvent {
  batchId: string
  taskId: string
  errorType: ErrorType
  errorMessage: string
}

export interface BatchProgressEvent {
  batchId: string
  completedTasks: number
  totalTasks: number
  progress: number
}

export interface BatchCompleteEvent {
  batchId: string
  stats: BatchStats
}

export interface BatchPauseEvent {
  batchId: string
  pausedAt: string
}

export interface BatchResumeEvent {
  batchId: string
  resumedAt: string
}

export interface ExportStartEvent {
  exportId: string
  batchId: string
  format: 'txt' | 'csv' | 'json'
  taskCount: number
}

export interface ExportCompleteEvent {
  exportId: string
  filePath: string
  fileSize: number
}

export interface ExportErrorEvent {
  exportId: string
  error: string
}

// ========== 导出选项 ==========

export interface ExportOptions {
  format: 'txt' | 'csv' | 'json'
  includeFailed: boolean
  includeUnsent: boolean
  includeMetadata: boolean
  includeStats: boolean
  outputDir: string
  fileName: string
}

// ========== API 响应类型 ==========

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface BatchListResponse {
  batches: Batch[]
  total: number
}

export interface TaskListResponse {
  tasks: Task[]
  total: number
}
