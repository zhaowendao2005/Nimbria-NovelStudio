// 重用 Client 端的类型定义
import type { 
  ProjectData, 
  ProjectResult, 
  SaveResult, 
  RecentProject, 
  BroadcastMessage 
} from '../../Client/Types/project'

export { ProjectData, ProjectResult, SaveResult, RecentProject, BroadcastMessage }

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
}

export type IPCChannelName = keyof IPCChannelMap

export type IPCRequest<T extends IPCChannelName> = IPCChannelMap[T]['request']

export type IPCResponse<T extends IPCChannelName> = IPCChannelMap[T]['response']

