/**
 * LLM对话系统类型定义
 */

/**
 * 对话状态
 */
export type ConversationStatus = 'active' | 'archived' | 'deleted'

/**
 * 消息角色
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * 消息状态
 */
export type MessageStatus = 'sending' | 'sent' | 'error' | 'streaming'

/**
 * 文件引用
 */
export interface FileReference {
  path: string
  name: string
  type: string
  content?: string
}

/**
 * 聊天消息
 */
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  status: MessageStatus
  attachments?: FileReference[]
  error?: string
}

/**
 * 对话会话
 */
export interface ChatConversation {
  id: string
  title: string
  messages: ChatMessage[]
  modelId: string
  createdAt: Date
  updatedAt: Date
  status: ConversationStatus
  isPinned?: boolean
}

/**
 * 项目上下文
 */
export interface ProjectContext {
  currentFile?: string
  selectedCode?: string
  projectStructure?: any[]
  recentFiles: string[]
}

/**
 * 聊天偏好设置
 */
export interface ChatPreferences {
  autoSave: boolean
  maxHistory: number
  streamResponse: boolean
  showTimestamp: boolean
  enableNotification: boolean
}

/**
 * 聊天配置
 */
export interface ChatSettings {
  selectedModels: string[]
  defaultModel: string | null
  conversations: ChatConversation[]
  preferences: ChatPreferences
}

/**
 * 聊天状态
 */
export interface ChatState {
  conversations: ChatConversation[]
  activeConversationId: string | null
  isLoading: boolean
  selectedModels: string[]
  defaultModel: string | null
  projectContext: ProjectContext | null
  
  // 导航状态
  isContentVisible: boolean
  activeNavItem: string
  
  // 布局状态
  leftSidebarWidth: number
  minSidebarWidth: number
  maxSidebarWidth: number
}

/**
 * 模型选择项
 */
export interface ModelOption {
  id: string
  name: string
  provider: string
  isActive: boolean
  isSelected: boolean
}

/**
 * 工具箱菜单项
 */
export interface ToolboxMenuItem {
  id: string
  label: string
  icon: string
  action: () => void
  disabled?: boolean
}

