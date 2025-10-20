/**
 * Store 类型定义
 */

import type { Task, TaskFilter, Batch, TranslateConfig } from '../types'

export interface LlmTranslateState {
  config: TranslateConfig
  batchList: Batch[]
  currentBatch: Batch | null
  taskList: Task[]
  selectedTasks: string[]
  selectedTaskIds: Set<string>
  taskFilters: TaskFilter
  threadDrawer: {
    isOpen: boolean
    currentTaskId: string | null
  }
}

export interface ThreadDetail {
  taskId: string
  messages: ChatMessage[]
  status: string
  progress: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  tokens?: number
}

