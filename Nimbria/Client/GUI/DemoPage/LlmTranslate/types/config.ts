/**
 * 配置相关类型定义
 */

export type InputSource = 'file' | 'text'
export type ChunkStrategy = 'line' | 'token'
export type ReplyMode = 'predicted' | 'equivalent'

export interface TranslateConfig {
  inputSource: InputSource
  content: string
  filePath?: string
  systemPrompt: string
  chunkStrategy: ChunkStrategy
  chunkSizeByLine: number
  chunkSizeByToken: number
  concurrency: number
  replyMode: ReplyMode
  predictedTokens: number
  modelId: string
}

export interface TokenEstimate {
  inputTokens: number
  systemPromptTokens: number
  totalTokens: number
  estimatedCost: number
}

export interface ExportConfig {
  format: 'parallel' | 'sequential' | 'json' | 'csv'
  includeOriginal: boolean
  includeTranslation: boolean
  includeMetadata: boolean
  includeStatus: boolean
  onlyCompleted: boolean
}

