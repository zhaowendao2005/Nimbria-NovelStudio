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

// 项目管理相关类型
import type {
  ProjectTemplate,
  ProjectCreationOptions,
  ProjectValidationResult,
  ProjectInitializationResult,
  ProjectQuickValidation,
  CanInitializeResult
} from '../services/project-service/types'

export { 
  ProjectData, ProjectResult, SaveResult, RecentProject, BroadcastMessage, 
  FileSystemItem, GlobOptions, WatchOptions,
  ProjectTemplate, ProjectCreationOptions, ProjectValidationResult, ProjectInitializationResult, ProjectQuickValidation, CanInitializeResult
}

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
  'window:show-main': { request: void; response: WindowOperationResult }

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

  // 项目管理操作
  'project-mgmt:create': {
    request: ProjectCreationOptions
    response: ProjectInitializationResult
  }
  'project-mgmt:validate': {
    request: { projectPath: string }
    response: ProjectValidationResult
  }
  'project-mgmt:quick-validate': {
    request: { projectPath: string }
    response: ProjectQuickValidation
  }
  'project-mgmt:get-templates': {
    request: void
    response: { templates: ProjectTemplate[] }
  }
  'project-mgmt:can-initialize': {
    request: { directoryPath: string; templateId?: string }
    response: CanInitializeResult
  }
  'project-mgmt:initialize-existing': {
    request: {
      directoryPath: string
      projectName: string
      novelTitle: string
      author: string
      genre: string[]
      description?: string
      timestamp: string
      customConfig?: Record<string, unknown>
    }
    response: ProjectInitializationResult
  }
  'project-mgmt:repair': {
    request: { projectPath: string }
    response: ProjectInitializationResult
  }
  'project-mgmt:get-stats': {
    request: { projectPath: string }
    response: { success: boolean; data?: unknown; error?: string }
  }
  
  // DocParser 操作
  'docParser:createSchema': {
    request: { projectPath: string; schemaName: string; template?: string }
    response: { success: boolean; data?: string; error?: string }
  }
  'docParser:loadSchema': {
    request: { schemaPath: string }
    response: { success: boolean; data?: string; error?: string }
  }
  'docParser:saveSchema': {
    request: { schemaPath: string; content: string }
    response: { success: boolean; data?: boolean; error?: string }
  }
  'docParser:listSchemas': {
    request: { projectPath: string }
    response: { success: boolean; data?: string[]; error?: string }
  }
  'docParser:selectSchemaFile': {
    request: { defaultPath?: string }
    response: { 
      success: boolean
      data?: { canceled: boolean; filePaths: string[] }
      error?: string 
    }
  }
  'docParser:selectDocumentFile': {
    request: { defaultPath?: string }
    response: { 
      success: boolean
      data?: { canceled: boolean; filePaths: string[] }
      error?: string 
    }
  }
  'docParser:selectExportPath': {
    request: { defaultPath?: string; fileName?: string }
    response: { 
      success: boolean
      data?: { canceled: boolean; filePath?: string }
      error?: string 
    }
  }
  'docParser:readDocument': {
    request: { filePath: string }
    response: { success: boolean; data?: string; error?: string }
  }
  'docParser:saveExport': {
    request: { filePath: string; data: Uint8Array; format?: string }
    response: { success: boolean; data?: boolean; error?: string }
  }
}

export type IPCChannelName = keyof IPCChannelMap

export type IPCRequest<T extends IPCChannelName> = IPCChannelMap[T]['request']

export type IPCResponse<T extends IPCChannelName> = IPCChannelMap[T]['response']

