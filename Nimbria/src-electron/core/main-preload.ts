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
  }
})

