/**
 * 翻译配置类型定义
 * 基于 HomePage.vue 表单结构设计
 */

import type { SchedulerConfig } from './scheduler'

// ==================== 枚举类型 ====================

/** 输入源类型 */
export type InputSource = 'file' | 'text'

/** 分片策略 */
export type ChunkStrategy = 'line' | 'token'

/** 回复模式 */
export type ReplyMode = 'predicted' | 'equivalent' | 'regression'

// ==================== 配置接口 ====================

/**
 * 翻译任务配置
 * 这是用户在 HomePage 填写的完整配置
 */
export interface TranslateConfig {
  // ===== 输入源配置 =====
  /** 输入源类型 */
  inputSource: InputSource
  /** 待翻译的内容（文本模式直接输入，文件模式读取后填充） */
  content: string
  /** 文件路径（仅文件模式有效） */
  filePath?: string

  // ===== LLM 配置 =====
  /** 系统提示词 */
  systemPrompt: string
  /** 模型 ID */
  modelId: string

  // ===== 分片策略配置 =====
  /** 分片策略类型 */
  chunkStrategy: ChunkStrategy
  /** 按行分片时的行数 */
  chunkSizeByLine: number
  /** 按 Token 分片时的 Token 数 */
  chunkSizeByToken: number

  // ===== 并发控制配置 =====
  /** 每分钟最高并发数 */
  concurrency: number

  // ===== 回复模式配置 =====
  /** 回复模式 */
  replyMode: ReplyMode
  /** 预测的输出 Token 数（用于进度估算） */
  predictedTokens: number
  
  // ===== 高级模型参数配置（可选，不设置则使用模型/提供商默认值）=====
  /** 最大输出token数（可选，不设置则使用模型默认） */
  maxTokens?: number
  /** 温度参数 0-2（可选，不设置则使用模型默认） */
  temperature?: number
  /** Top P 采样参数 0-1（可选） */
  topP?: number
  /** Frequency Penalty -2.0-2.0（可选） */
  frequencyPenalty?: number
  /** Presence Penalty -2.0-2.0（可选） */
  presencePenalty?: number
  
  // ===== 请求控制配置（底层 LLM 客户端配置）=====
  /** HTTP 请求超时时间（毫秒），默认 120000 (2分钟) */
  httpTimeout?: number
  /** 最大重试次数，默认 3 */
  maxRetries?: number
  /** 是否启用流式响应，默认 true */
  enableStreaming?: boolean
  /** 流式空闲超时（毫秒），默认 60000 (1分钟)，仅当 enableStreaming=true 时生效 */
  streamIdleTimeout?: number
  
  // ===== 调度器配置 =====
  /** 调度器配置（可选，默认使用系统默认值） */
  schedulerConfig?: SchedulerConfig
}

/**
 * 批次级别的配置
 * 从 TranslateConfig 中提取，会存储到数据库的 config_json 字段
 */
export interface BatchConfig {
  systemPrompt: string
  modelId: string
  chunkStrategy: ChunkStrategy
  chunkSizeByLine: number
  chunkSizeByToken: number
  concurrency: number
  replyMode: ReplyMode
  predictedTokens: number
  schedulerConfig?: SchedulerConfig
  
  // 高级模型参数（可选）
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  
  // 请求控制配置（可选）
  httpTimeout?: number
  maxRetries?: number
  enableStreaming?: boolean
  streamIdleTimeout?: number
}

/**
 * Token 估算结果
 */
export interface TokenEstimate {
  inputTokens: number
  systemPromptTokens: number
  totalTokens: number
  estimatedCost: number
}

/**
 * 导出配置
 */
export interface ExportConfig {
  format: 'parallel' | 'sequential' | 'json' | 'csv'
  includeOriginal: boolean
  includeTranslation: boolean
  includeMetadata: boolean
  includeStatus: boolean
  onlyCompleted: boolean
}
