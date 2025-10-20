/**
 * LlmTranslate 导出模块
 * 统一导出LlmTranslate相关的组件、状态和工具函数
 */

export { default as LlmTranslatePage } from './LlmTranslatePage.vue'
export { useLlmTranslateStore } from './stores'
export { useTaskManagement } from './composables/useTaskManagement'
export { useBatchManagement } from './composables/useBatchManagement'
export { useExportService } from './composables/useExportService'

// 类型导出
export type { LlmTranslateState, ThreadDetail, ChatMessage } from './stores/types'
export type { TaskManagementOptions, BatchManagementOptions, ExportOptions } from './composables/types'
export type { Task, TaskStatus, TaskStats, TaskFilter } from './types/task'
export type { Batch, BatchStatus, BatchStats } from './types/batch'
export type { TranslateConfig, TokenEstimate, ExportConfig } from './types/config'
export type { ApiResponse, BatchCreateRequest, StreamProgressUpdate } from './types/api'

// 页面元信息
export const LlmTranslatePageMeta = {
  name: 'LlmTranslate',
  title: 'LLM批量翻译系统',
  description: '基于LLM的批量翻译工具，支持流式进度监控和批次管理',
  category: 'demo',
  icon: 'Translation',
  path: '/demo/llm-translate'
}

