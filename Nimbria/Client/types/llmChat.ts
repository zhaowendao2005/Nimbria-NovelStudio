/**
 * LLM Chat 前端类型定义
 * 与后端类型保持一致，用于前端状态管理和组件
 */

import type { ModelType } from './llm'

/**
 * 聊天消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant'

/**
 * 聊天消息
 */
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
}

/**
 * 对话设置
 */
export interface ConversationSettings {
  temperature: number
  maxTokens: number
  contextWindow: number
  timeout: number
  maxRetries: number
  completionMode: 'chat' | 'completion'
}

/**
 * 对话
 */
export interface Conversation {
  id: string
  title: string
  modelId: string
  messages: ChatMessage[]
  settings: ConversationSettings
  createdAt: number
  updatedAt: number
}

/**
 * IPC 响应
 */
export interface IpcResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  conversation?: Conversation
  conversations?: Conversation[]
  messageId?: string
}

/**
 * 流式响应块
 */
export interface StreamChunk {
  conversationId: string
  messageId: string
  chunk: string
}

/**
 * 流式响应完成
 */
export interface StreamComplete {
  conversationId: string
  messageId: string
}

/**
 * 流式响应错误
 */
export interface StreamError {
  conversationId: string
  error: string
}

/**
 * 模型选项（用于前端显示）
 */
export interface ModelOption {
  id: string // 格式: providerId/modelName
  name: string
  displayName?: string
  provider: string
  type: ModelType
  isActive: boolean
}

/**
 * LocalStorage 存储的对话数据
 */
export interface StoredConversations {
  conversations: Conversation[]
  lastUpdated: number
}

