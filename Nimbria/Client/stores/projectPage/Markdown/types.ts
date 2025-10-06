/**
 * Markdown模块类型定义
 */

export interface MarkdownFile {
  id: string
  name: string
  path: string
  content?: string
  isFolder: boolean
  children?: MarkdownFile[]
  metadata?: {
    size: number
    mtime: Date
    tags?: string[]
  }
  
  // 临时节点标记（用于文件/目录创建流程）
  isTemporary?: boolean
  tempType?: 'file' | 'folder'
  parentId?: string
}

export interface MarkdownTab {
  id: string
  filePath: string
  fileName: string
  content: string
  mode: 'edit' | 'view'
  isDirty: boolean
  isSaving?: boolean
  saveError?: string
  lastSaved?: Date
  originalContent?: string
}

/**
 * 自动保存配置
 */
export interface AutoSaveConfig {
  enabled: boolean
  delay: number
  createBackup: boolean
  maxRetries: number
  batchSaveOnClose: boolean
}

/**
 * 保存进度
 */
export interface SaveProgress {
  total: number
  completed: number
  failed: number
  inProgress: string[]
}

/**
 * 保存结果
 */
export interface SaveResult {
  success: boolean
  error?: string
  queued?: boolean
  retrying?: boolean
  retryCount?: number
  retryExhausted?: boolean
  skipped?: boolean
}

/**
 * 文件创建状态
 */
export interface FileCreationState {
  isCreating: boolean
  type: 'file' | 'folder' | null
  parentNode: MarkdownFile | null
  tempNodeId: string | null
  inputValue: string
  validationError: string | null
}
