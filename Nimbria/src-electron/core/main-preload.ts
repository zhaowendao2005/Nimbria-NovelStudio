import { contextBridge, ipcRenderer } from 'electron'

import type { BroadcastMessage, ProjectData } from '../../Client/Types/project'
import type { IPCRequest, IPCResponse, IPCChannelMap } from '../types/ipc'

const channelInvoke = async <T extends keyof IPCChannelMap>(channel: T, request: IPCRequest<T>): Promise<IPCResponse<T>> => {
  return ipcRenderer.invoke(channel, request)
}

let mainPort: MessagePort | null = null

ipcRenderer.on('port', (event) => {
  const [port] = event.ports
  mainPort = port ?? null
  port?.start()
})

function ensurePort(): MessagePort {
  if (!mainPort) {
    throw new Error('Main process port is not ready yet.')
  }
  return mainPort
}

contextBridge.exposeInMainWorld('nimbria', {
  window: {
    minimize: () => channelInvoke('window:minimize', {}),
    close: () => channelInvoke('window:close', {}),
    maximize: () => channelInvoke('window:maximize', {}),
    unmaximize: () => channelInvoke('window:unmaximize', {}),
    isMaximized: async () => {
      const result = await channelInvoke('window:is-maximized', {})
      return result.value
    },
    focus: () => {
      ensurePort().postMessage({ type: 'window-focus-request' })
    }
  },

  project: {
    createWindow: (projectPath: string) => channelInvoke('project:create-window', { projectPath }),
    closeWindow: (projectPath: string) => channelInvoke('project:close-window', { projectPath }),
    save: (projectData: ProjectData) => channelInvoke('project:save', { projectData }),
    getRecent: () => channelInvoke('project:get-recent', undefined),
    updateRecent: (payload: { projectPath: string; projectName?: string }) => channelInvoke('project:update-recent', payload),
    clearCache: () => channelInvoke('project:clear-cache', undefined),
    broadcastToProjects: (message: BroadcastMessage) => {
      void channelInvoke('process:broadcast', { message })
    },
    createProject: (options: IPCRequest<'project-mgmt:create'>) => channelInvoke('project-mgmt:create', options),
    validateProject: (projectPath: string) => channelInvoke('project-mgmt:validate', { projectPath }),
    quickValidateProject: (projectPath: string) => channelInvoke('project-mgmt:quick-validate', { projectPath }),
    getTemplates: () => channelInvoke('project-mgmt:get-templates', undefined as never),
    canInitialize: (directoryPath: string, templateId?: string) => channelInvoke('project-mgmt:can-initialize', { directoryPath, templateId }),
    initializeExistingDirectory: (options: IPCRequest<'project-mgmt:initialize-existing'>) => channelInvoke('project-mgmt:initialize-existing', options),
    repairProject: (projectPath: string) => channelInvoke('project-mgmt:repair', { projectPath }),
    getProjectStats: (projectPath: string) => channelInvoke('project-mgmt:get-stats', { projectPath })
  },

  process: {
    sendToMain: (message: unknown) => {
      ensurePort().postMessage({ type: 'to-main', payload: message })
    },
    onBroadcast: (callback: (message: BroadcastMessage) => void) => {
      const port = ensurePort()
      port.addEventListener('message', (event) => {
        callback(event.data as BroadcastMessage)
      })
    },
    createWorker: (scriptPath: string) => new Worker(scriptPath)
  },

  file: {
    openDialog: (options: {
      title?: string
      defaultPath?: string
      properties: Array<'openFile' | 'openDirectory' | 'multiSelections'>
      filters?: Array<{ name: string; extensions: string[] }>
    }) => channelInvoke('file:open-dialog', options),

    saveDialog: (options: {
      title?: string
      defaultPath?: string
      filters?: Array<{ name: string; extensions: string[] }>
    }) => channelInvoke('file:save-dialog', options)
  },

  llm: {
    getProviders: () => channelInvoke('llm:get-providers', undefined),
    addProvider: (provider: IPCRequest<'llm:add-provider'>['provider']) => 
      channelInvoke('llm:add-provider', { provider }),
    removeProvider: (providerId: string) => 
      channelInvoke('llm:remove-provider', { providerId }),
    updateProviderConfig: (providerId: string, config: IPCRequest<'llm:update-provider-config'>['config']) =>
      channelInvoke('llm:update-provider-config', { providerId, config }),
    activateProvider: (providerId: string) => 
      channelInvoke('llm:activate-provider', { providerId }),
    deactivateProvider: (providerId: string) => 
      channelInvoke('llm:deactivate-provider', { providerId }),
    refreshModels: (providerId: string) => 
      channelInvoke('llm:refresh-models', { providerId }),
    testConnection: (providerId: string) => 
      channelInvoke('llm:test-connection', { providerId }),
    testNewConnection: (baseUrl: string, apiKey: string) =>
      channelInvoke('llm:test-new-connection', { baseUrl, apiKey }),
    validateProvider: (config: IPCRequest<'llm:validate-provider'>['config']) =>
      channelInvoke('llm:validate-provider', { config }),
    updateModelConfig: (providerId: string, modelType: string, modelName: string, config: IPCRequest<'llm:update-model-config'>['config']) =>
      channelInvoke('llm:update-model-config', { providerId, modelType, modelName, config }),
    setModelDisplayName: (providerId: string, modelName: string, displayName: string) =>
      channelInvoke('llm:set-model-display-name', { providerId, modelName, displayName }),
    toggleModelSelection: (providerId: string, modelType: string, modelName: string) =>
      channelInvoke('llm:toggle-model-selection', { providerId, modelType, modelName }),
    setPreferredModel: (providerId: string, modelType: string, modelName: string) =>
      channelInvoke('llm:set-preferred-model', { providerId, modelType, modelName })
  },

  llmChat: {
    // 对话管理
    createConversation: (args: { modelId: string; settings?: any }) =>
      ipcRenderer.invoke('llm-chat:create-conversation', args),
    getConversations: () =>
      ipcRenderer.invoke('llm-chat:get-conversations'),
    getConversation: (conversationId: string) =>
      ipcRenderer.invoke('llm-chat:get-conversation', { conversationId }),
    deleteConversation: (conversationId: string) =>
      ipcRenderer.invoke('llm-chat:delete-conversation', { conversationId }),
    updateTitle: (conversationId: string, title: string) =>
      ipcRenderer.invoke('llm-chat:update-title', { conversationId, title }),
    updateSettings: (conversationId: string, settings: any) =>
      ipcRenderer.invoke('llm-chat:update-settings', { conversationId, settings }),
    
    // 消息管理
    sendMessage: (args: { conversationId: string; content: string }) =>
      ipcRenderer.invoke('llm-chat:send-message', args),
    regenerateMessage: (conversationId: string) =>
      ipcRenderer.invoke('llm-chat:regenerate-message', { conversationId }),
    deleteMessage: (conversationId: string, messageId: string) =>
      ipcRenderer.invoke('llm-chat:delete-message', { conversationId, messageId }),
    
    // 模型管理
    switchModel: (conversationId: string, modelId: string) =>
      ipcRenderer.invoke('llm-chat:switch-model', { conversationId, modelId }),
    
    // 对话创建事件监听
    onConversationStart: (callback: (data: { conversationId: string; modelId: string; settings: any }) => void) => {
      ipcRenderer.on('llm-chat:conversation-start', (_, data) => callback(data))
    },
    onConversationCreated: (callback: (data: { conversationId: string; conversation: any }) => void) => {
      ipcRenderer.on('llm-chat:conversation-created', (_, data) => callback(data))
    },
    onConversationError: (callback: (data: { conversationId: string; error: string }) => void) => {
      ipcRenderer.on('llm-chat:conversation-error', (_, data) => callback(data))
    },

    // 流式响应监听
    onStreamChunk: (callback: (data: { conversationId: string; messageId: string; chunk: string }) => void) => {
      ipcRenderer.on('llm-chat:stream-chunk', (_, data) => callback(data))
    },
    onStreamComplete: (callback: (data: { conversationId: string; messageId: string }) => void) => {
      ipcRenderer.on('llm-chat:stream-complete', (_, data) => callback(data))
    },
    onStreamError: (callback: (data: { conversationId: string; error: string }) => void) => {
      ipcRenderer.on('llm-chat:stream-error', (_, data) => callback(data))
    },
    
    // LocalStorage 通信
    onStorageSave: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-chat:storage-save', (_, data) => callback(data))
    },
    onStorageLoadRequest: (callback: () => void) => {
      ipcRenderer.on('llm-chat:storage-load-request', () => callback())
    },
    sendStorageLoadResponse: (data: any) => {
      ipcRenderer.send('llm-chat:storage-load-response', data)
    }
  }
})

