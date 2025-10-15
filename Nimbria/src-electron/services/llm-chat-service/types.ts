/**
 * LLM Chat 服务类型定义
 */

/**
 * 对话消息
 */
export interface ChatMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    tokenCount?: number
  }
}

/**
 * 对话设置
 */
export interface ConversationSettings {
  temperature: number           // 温度参数 (0-1)
  maxTokens: number            // 最大生成 Token (从ModelConfig继承)
  systemPrompt?: string        // 系统提示词
  contextWindow: number        // 上下文窗口大小 (从ModelConfig.contextLength继承)
  
  // 从 ModelConfig 继承的设置
  timeout: number              // 请求超时 (ms)
  maxRetries: number           // 最大重试次数
  completionMode: '对话' | '补全' // API模式
}

/**
 * 对话
 */
export interface Conversation {
  id: string
  title: string
  modelId: string              // 格式: providerId.modelName
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  settings: ConversationSettings
}

/**
 * LangChain 客户端配置
 */
export interface LangChainClientConfig {
  modelName: string
  apiKey: string
  baseUrl: string
  temperature: number
  maxTokens: number
  timeout: number
  maxRetries: number
  useChat: boolean             // true: chat API, false: completion API
}

/**
 * 流式响应回调（已废弃，使用事件替代）
 * @deprecated 使用 EventEmitter 事件替代
 */
export interface StreamCallbacks {
  onChunk?: (chunk: string) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

/**
 * 消息事件数据
 */
export interface MessageStartEvent {
  conversationId: string
  messageId: string
}

export interface MessageChunkEvent {
  conversationId: string
  messageId: string
  chunk: string
}

export interface MessageCompleteEvent {
  conversationId: string
  messageId: string
}

export interface MessageErrorEvent {
  conversationId: string
  messageId: string
  error: string
}

/**
 * 对话创建事件数据
 */
export interface ConversationStartEvent {
  conversationId: string
  modelId: string
  settings: ConversationSettings
}

export interface ConversationCreatedEvent {
  conversationId: string
  conversation: Conversation
}

export interface ConversationErrorEvent {
  conversationId: string
  error: string
}

/**
 * LocalStorage 存储结构
 */
export interface ConversationsStorage {
  conversations: Conversation[]
}

