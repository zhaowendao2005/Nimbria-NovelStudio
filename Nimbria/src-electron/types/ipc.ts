export interface ProjectResult {
  success: boolean
  message?: string
  processId?: string
  errorCode?: string
}

export interface SaveResult {
  success: boolean
  error?: string
}

export interface ProjectData {
  id: string
  name: string
  path: string
  lastModified: string
  payload: unknown
}

export interface RecentProject {
  id: string
  name: string
  path: string
  lastOpened: string
  thumbnail?: string
}

export interface BroadcastMessage {
  type: string
  data: unknown
  timestamp?: string
  fromProcess: string
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
}

export type IPCChannelName = keyof IPCChannelMap

export type IPCRequest<T extends IPCChannelName> = IPCChannelMap[T]['request']

export type IPCResponse<T extends IPCChannelName> = IPCChannelMap[T]['response']

