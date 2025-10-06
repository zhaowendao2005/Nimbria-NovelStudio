/**
 * Markdown Service 类型定义
 * 用于文件系统操作、自动保存、备份管理
 */

/**
 * Markdown 文件节点（树形结构）
 */
export interface MarkdownFile {
  id: string
  name: string
  path: string
  isFolder: boolean
  children?: MarkdownFile[]
  metadata?: {
    size: number
    mtime: Date
    tags?: string[]
  }
}

/**
 * 文件树扫描选项
 */
export interface MarkdownTreeOptions {
  projectPath: string
  excludeDirs?: string[]
  maxDepth?: number
  includeContent?: boolean
}

/**
 * 文件操作结果
 */
export interface FileOperationResult {
  success: boolean
  error?: string
  data?: any
}

/**
 * 保存任务
 */
export interface SaveTask {
  filePath: string
  content: string
  priority?: number
  timestamp: number
  createBackup?: boolean
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
 * 批量保存结果
 */
export interface BatchSaveResult {
  success: boolean
  totalCount: number
  successCount: number
  failedCount: number
  errors?: Array<{ filePath: string; error: string }>
}

/**
 * 备份信息
 */
export interface BackupInfo {
  path: string
  originalPath: string
  timestamp: number
  size: number
}

/**
 * 写入选项
 */
export interface WriteOptions {
  createBackup?: boolean
  encoding?: BufferEncoding
  verifyWrite?: boolean
}

/**
 * 读取选项
 */
export interface ReadOptions {
  encoding?: BufferEncoding
  parseFrontMatter?: boolean
}

