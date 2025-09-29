/**
 * 文件服务相关类型定义
 */

import type { FSWatcher } from 'chokidar'

export interface FileSystemItem {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  mtime?: Date
  extension?: string
  mimeType?: string
}

export interface GlobOptions {
  cwd?: string
  dot?: boolean
  absolute?: boolean
  onlyFiles?: boolean
  onlyDirectories?: boolean
  ignore?: string[]
  deep?: number
}

export interface WatchOptions {
  ignored?: string | string[]
  persistent?: boolean
  ignoreInitial?: boolean
  followSymlinks?: boolean
  depth?: number
  awaitWriteFinish?: boolean | {
    stabilityThreshold?: number
    pollInterval?: number
  }
  atomic?: boolean | number
}

export interface FileWatcherInfo {
  id: string
  path: string
  options: WatchOptions
  watcher: FSWatcher
  projectId?: string
}

export interface ProjectFileContext {
  projectPath: string
  windowId: string
  watchers: Map<string, FileWatcherInfo>
  createdAt: Date
  lastActive: Date
}

export interface FileOperationResult {
  success: boolean
  error?: string
}

export interface ReadFileResult extends FileOperationResult {
  content?: string
}

export interface ReadDirResult extends FileOperationResult {
  items?: FileSystemItem[]
}

export interface GlobResult extends FileOperationResult {
  matches?: string[]
}

export interface WatchResult extends FileOperationResult {
  watcherId?: string
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
  path: string
  stats?: {
    size: number
    mtime: Date
  }
  projectId?: string
}
