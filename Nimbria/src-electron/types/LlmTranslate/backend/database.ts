/**
 * 后端数据库类型定义
 * 对应 SQLite 数据库的实际表结构
 */

// ==================== 批次表 (Llmtranslate_batches) ====================

/**
 * 批次表行结构
 * 对应数据库表：Llmtranslate_batches
 */
export interface BatchRow {
  id: string
  status: 'running' | 'paused' | 'completed' | 'failed'
  config_json: string
  total_tasks: number
  completed_tasks: number
  failed_tasks: number
  throttled_tasks: number
  waiting_tasks: number
  unsent_tasks: number
  terminated_tasks: number
  total_cost: number
  total_input_tokens: number
  total_output_tokens: number
  avg_time_per_task: number
  fastest_task_time: number
  slowest_task_time: number
  estimated_completion_time: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  updated_at: string
}

// ==================== 任务表 (Llmtranslate_tasks) ====================

/**
 * 任务表行结构
 * 对应数据库表：Llmtranslate_tasks
 */
export interface TaskRow {
  id: string
  batch_id: string
  status: 'unsent' | 'queued' | 'waiting' | 'throttled' | 'error' | 'completed' | 'terminated'
  content: string
  translation: string | null
  input_tokens: number
  reply_tokens: number
  predicted_tokens: number
  progress: number
  sent_time: string | null
  reply_time: string | null
  duration_ms: number | null
  error_message: string | null
  error_type: string | null
  retry_count: number
  cost: number
  metadata_json: string
  created_at: string
  updated_at: string
}

// ==================== 统计表 (Llmtranslate_stats) ====================

/**
 * 统计表行结构
 * 对应数据库表：Llmtranslate_stats
 */
export interface StatsRow {
  id: number
  batch_id: string
  updated_at: string
}

// ==================== 数据库操作结果 ====================

/**
 * 批次查询结果
 */
export interface BatchQueryResult {
  batches: BatchRow[]
  total: number
}

/**
 * 任务查询结果
 */
export interface TaskQueryResult {
  tasks: TaskRow[]
  total: number
}

