/**
 * 批次类型定义
 * 对应前端显示的批次数据结构
 */

// ==================== 枚举类型 ====================

/** 批次状态 */
export type BatchStatus = 'running' | 'paused' | 'completed' | 'failed'

// ==================== 批次接口 ====================

/**
 * 批次数据结构（前端）
 * 对应数据库 Llmtranslate_batches 表
 */
export interface Batch {
  /** 批次 ID（格式：#20250120） */
  id: string
  
  /** 批次状态 */
  status: BatchStatus
  
  /** 批次配置 JSON（存储 BatchConfig） */
  configJson: string
  
  // ===== 任务统计 =====
  /** 总任务数 */
  totalTasks: number
  /** 已完成任务数 */
  completedTasks: number
  /** 失败任务数 */
  failedTasks: number
  /** 限流任务数 */
  throttledTasks: number
  /** 等待中任务数 */
  waitingTasks: number
  /** 未发送任务数 */
  unsentTasks: number
  
  // ===== 费用统计 =====
  /** 总费用 */
  totalCost: number
  /** 总输入 Token */
  totalInputTokens: number
  /** 总输出 Token */
  totalOutputTokens: number
  
  // ===== 时间统计 =====
  /** 平均每任务耗时（毫秒） */
  avgTimePerTask: number
  /** 最快任务耗时（毫秒） */
  fastestTaskTime: number
  /** 最慢任务耗时（毫秒） */
  slowestTaskTime: number
  /** 预估完成时间 */
  estimatedCompletionTime: string | null
  
  // ===== 时间戳 =====
  /** 创建时间 */
  createdAt: string
  /** 开始时间 */
  startedAt: string | null
  /** 完成时间 */
  completedAt: string | null
  /** 更新时间 */
  updatedAt: string
}

/**
 * 批次统计信息
 */
export interface BatchStats {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  successRate: number
  totalCost: number
  estimatedTime: number
}
