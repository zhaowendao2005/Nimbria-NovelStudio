// 重用 Client 端的类型定义
import type {
  ProjectData,
  ProjectResult,
  SaveResult,
  RecentProject,
  BroadcastMessage
} from '../../Client/Types/project'

// 文件系统相关类型
import type {
  FileSystemItem,
  GlobOptions,
  WatchOptions
} from '../services/file-service/types'

export { ProjectData, ProjectResult, SaveResult, RecentProject, BroadcastMessage, FileSystemItem, GlobOptions, WatchOptions }

export interface DirectMessage {
  toProcessId: string
  data: unknown
}

export interface WindowControlPayload {
  windowId?: string
}

export interface WindowOperationResult {
  success: boolean
  error?: string
}

export interface IPCChannelMap {
  'window:minimize': { request: WindowControlPayload; response: WindowOperationResult }
  'window:maximize': { request: WindowControlPayload; response: WindowOperationResult }
  'window:unmaximize': { request: WindowControlPayload; response: WindowOperationResult }
  'window:close': { request: WindowControlPayload; response: WindowOperationResult }
  'window:focus': { request: WindowControlPayload; response: WindowOperationResult }
  'window:is-maximized': { request: WindowControlPayload; response: { success: boolean; value: boolean } }

  'project:create-window': {
    request: { projectPath: string }
    response: ProjectResult
  }
  'project:close-window': {
    request: { projectPath: string }
    response: ProjectResult
  }
  'project:save': {
    request: { projectData: ProjectData }
    response: SaveResult
  }
  'project:get-recent': {
    request: void
    response: RecentProject[]
  }
  'project:update-recent': {
    request: { projectPath: string; projectName?: string }
    response: { success: boolean }
  }

  'process:broadcast': {
    request: { message: BroadcastMessage }
    response: void
  }
  'process:direct': {
    request: DirectMessage
    response: void
  }

  // 文件对话框
  'file:open-dialog': {
    request: {
      title?: string
      defaultPath?: string
      properties: Array<'openFile' | 'openDirectory' | 'multiSelections'>
      filters?: Array<{ name: string; extensions: string[] }>
    }
    response: {
      canceled: boolean
      filePaths: string[]
    }
  }
  'file:save-dialog': {
    request: {
      title?: string
      defaultPath?: string
      filters?: Array<{ name: string; extensions: string[] }>
    }
    response: {
      canceled: boolean
      filePath?: string
    }
  }

  // 文件系统操作
  'fs:read-file': {
    request: { path: string; projectId?: string; encoding?: string }
    response: { success: boolean; content?: string; error?: string }
  }
  'fs:write-file': {
    request: { path: string; content: string; projectId?: string; encoding?: string }
    response: { success: boolean; error?: string }
  }
  'fs:read-dir': {
    request: { path: string; projectId?: string }
    response: { success: boolean; items?: FileSystemItem[]; error?: string }
  }
  'fs:create-dir': {
    request: { path: string; projectId?: string }
    response: { success: boolean; error?: string }
  }
  'fs:delete': {
    request: { path: string; projectId?: string; recursive?: boolean }
    response: { success: boolean; error?: string }
  }
  'fs:copy': {
    request: { source: string; dest: string; projectId?: string }
    response: { success: boolean; error?: string }
  }
  'fs:move': {
    request: { source: string; dest: string; projectId?: string }
    response: { success: boolean; error?: string }
  }
  'fs:glob': {
    request: { pattern: string; projectId?: string; options?: GlobOptions }
    response: { success: boolean; matches?: string[]; error?: string }
  }
  'fs:watch-start': {
    request: { path: string; projectId?: string; options?: WatchOptions }
    response: { success: boolean; watcherId?: string; error?: string }
  }
  'fs:watch-stop': {
    request: { watcherId: string }
    response: { success: boolean; error?: string }
  }
  'fs:project-init': {
    request: { projectPath: string; windowId: string }
    response: { success: boolean; error?: string }
  }
  'fs:project-cleanup': {
    request: { windowId: string }
    response: { success: boolean; error?: string }
  }
}

export type IPCChannelName = keyof IPCChannelMap

export type IPCRequest<T extends IPCChannelName> = IPCChannelMap[T]['request']

export type IPCResponse<T extends IPCChannelName> = IPCChannelMap[T]['response']

