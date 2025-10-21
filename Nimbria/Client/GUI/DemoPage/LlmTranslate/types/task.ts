/**
 * 任务类型定义
 * 对应前端显示的任务数据结构
 */

import type { BatchConfig, ChunkStrategy, ReplyMode } from './config'

// ==================== 枚举类型 ====================

/** 任务状态 */
export type TaskStatus = 
  | 'unsent'      // 未发送
  | 'waiting'     // 等待中
  | 'sending'     // 发送中（流式接收）
  | 'throttled'   // 被限流
  | 'error'       // 错误
  | 'completed'   // 已完成

// ==================== 任务接口 ====================

/**
 * 任务元数据
 * 存储在数据库的 metadata_json 字段
 */
export interface TaskMetadata {
  // ===== 批次公共配置（来自 BatchConfig） =====
  systemPrompt: string
  modelId: string
  chunkStrategy: ChunkStrategy
  chunkSizeByLine: number
  chunkSizeByToken: number
  concurrency: number
  replyMode: ReplyMode
  predictedTokens: number
  
  // ===== 任务私有信息 =====
  /** 估算的输入 Token 数 */
  estimatedInputTokens: number
  /** 估算的输出 Token 数 */
  estimatedOutputTokens: number
  /** 实际的输入 Token 数（LLM 返回后填充） */
  actualInputTokens?: number
  /** 实际的输出 Token 数（LLM 返回后填充） */
  actualOutputTokens?: number
  /** 估算的费用 */
  estimatedCost: number
  /** 实际的费用（LLM 返回后计算） */
  actualCost?: number
}

/**
 * 任务数据结构（前端）
 * 对应数据库 Llmtranslate_tasks 表
 */
export interface Task {
  /** 任务 ID（格式：#20250120-0001） */
  id: string
  
  /** 所属批次 ID */
  batchId: string
  
  /** 任务状态 */
  status: TaskStatus
  
  /** 待翻译内容片段 */
  content: string
  
  /** 翻译结果 */
  translation: string | null
  
  // ===== Token 统计 =====
  /** 实际输入 Token */
  inputTokens: number
  /** 实际回复 Token */
  replyTokens: number
  /** 预测的 Token 数 */
  predictedTokens: number
  /** 进度（0-100） */
  progress: number
  
  // ===== 时间信息 =====
  /** 发送时间 */
  sentTime: string | null
  /** 回复时间 */
  replyTime: string | null
  /** 耗时（毫秒） */
  durationMs: number | null
  
  // ===== 错误信息 =====
  /** 错误消息 */
  errorMessage: string | null
  /** 错误类型 */
  errorType: string | null
  /** 重试次数 */
  retryCount: number
  
  // ===== 费用 =====
  /** 费用 */
  cost: number
  
  // ===== 元数据 =====
  /** 任务元数据 JSON */
  metadataJson: string
  /** 解析后的元数据（前端使用） */
  metadata?: TaskMetadata
  
  // ===== 时间戳 =====
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/**
 * 任务统计信息
 */
export interface TaskStats {
  total: number
  completed: number
  waiting: number
  throttled: number
  error: number
  unsent: number
  terminated: number
  successRate: number
}

/**
 * 任务筛选器
 */
export interface TaskFilter {
  status: TaskStatus[]
  searchText: string
  selectMode: boolean
}
