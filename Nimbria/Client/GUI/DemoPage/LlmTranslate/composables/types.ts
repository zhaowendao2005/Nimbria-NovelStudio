/**
 * Composables 类型定义
 */

export interface TaskManagementOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

export interface BatchManagementOptions {
  autoSave?: boolean
  saveInterval?: number
}

export interface ExportOptions {
  format: 'txt' | 'csv' | 'json' | 'xlsx'
  encoding?: string
  includeMetadata?: boolean
}

