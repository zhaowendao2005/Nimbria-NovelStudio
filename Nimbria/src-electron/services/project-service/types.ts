/**
 * Electron项目管理服务类型定义
 */

export interface NimbriaProjectConfig {
  projectName: string
  createdAt: string
  lastModified: string
  version: string
  type: 'nimbria-novel-project'
  
  novel: {
    title: string
    author: string
    genre: string[]
    description: string
    language: 'zh-CN' | 'en-US'
    targetWordCount?: number
  }
  
  settings: {
    autoBackup: boolean
    backupInterval: number // 分钟
    theme: 'light' | 'dark' | 'system'
    fontSize: number
    fontFamily: string
    defaultChapterTemplate: string
  }
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  defaultFiles: Array<{
    path: string
    content?: string
    isDirectory?: boolean
  }>
  requiredDirectories: string[]
}

export interface ProjectCreationOptions {
  directoryPath: string
  projectName: string
  novelTitle: string
  author: string
  genre: string[]
  description?: string
  timestamp: string
  customConfig?: Partial<NimbriaProjectConfig>
}

export interface ProjectValidationResult {
  isValid: boolean
  isProject: boolean
  config?: NimbriaProjectConfig
  missingFiles: string[]
  missingDirectories: string[]
  issues: string[]
  canInitialize: boolean
}

export interface ProjectInitializationResult {
  success: boolean
  error?: string
  projectPath?: string
  configPath?: string
  createdFiles?: string[]
  createdDirectories?: string[]
}

export interface ProjectOperationResult {
  success: boolean
  error?: string
  data?: any
}

export interface ProjectQuickValidation {
  isProject: boolean
  isValid: boolean
  config?: NimbriaProjectConfig
  majorIssues: string[]
}

export interface CanInitializeResult {
  canInitialize: boolean
  reason?: string
  hasExistingProject?: boolean
  existingConfigPath?: string
  directoryInfo?: {
    exists: boolean
    isEmpty: boolean
    fileCount: number
    hasNimbriaConfig: boolean
  }
}
