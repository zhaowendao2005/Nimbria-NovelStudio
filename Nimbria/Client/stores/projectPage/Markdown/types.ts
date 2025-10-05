/**
 * Markdown模块类型定义
 */

export interface MarkdownFile {
  id: string
  name: string
  path: string
  content: string
  lastModified: Date
  isFolder: boolean
  children?: MarkdownFile[]
}

export interface MarkdownTab {
  id: string
  filePath: string
  fileName: string
  content: string
  mode: 'edit' | 'view'
  isDirty: boolean
}
