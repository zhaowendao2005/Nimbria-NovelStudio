/**
 * 前端类型转发
 * 通过别名导入前端类型，转发给后端使用
 * 目的：让开发者明确知道这里使用的是前端定义的类型
 */

// 从前端 GUI 模块导入类型（使用别名路径）
export type {
  // 配置相关
  InputSource,
  ChunkStrategy,
  ReplyMode,
  TranslateConfig,
  BatchConfig,
  TokenEstimate,
  ExportConfig,
  
  // 批次相关
  BatchStatus,
  Batch,
  BatchStats,
  
  // 任务相关
  TaskStatus,
  TaskMetadata,
  Task,
  TaskStats,
  TaskFilter,
  
  // API 相关
  ApiResponse,
  CreateBatchRequest,
  CreateBatchResponse,
  GetBatchesResponse,
  GetBatchResponse,
  GetTasksRequest,
  GetTasksResponse,
  GetTaskRequest,
  GetTaskResponse,
  SubmitTasksRequest,
  SubmitTasksResponse,
  RetryFailedTasksRequest,
  RetryFailedTasksResponse,
  StreamProgressUpdate,
  ExportBatchRequest,
  ExportBatchResponse
} from '@demo/LlmTranslate/types'

/**
 * 注意：这些类型来自前端 Vue 组件
 * 路径：Nimbria/Client/GUI/DemoPage/LlmTranslate/types/
 * 
 * 在后端使用时，请使用这个中转模块，不要直接导入前端路径
 */

