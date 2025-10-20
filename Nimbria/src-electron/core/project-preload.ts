import { contextBridge, ipcRenderer } from 'electron'

import type { BroadcastMessage, ProjectData, SaveResult } from '../../Client/Types/project'

let projectPort: MessagePort | null = null
let projectProcessId: string | null = null
let currentProjectPath: string | null = null

const broadcastListeners = new Set<(message: BroadcastMessage) => void>()

ipcRenderer.on('port', (event) => {
  const [port] = event.ports
  projectPort = port
  port.start()
  port.addEventListener('message', (messageEvent) => {
    broadcastListeners.forEach((listener) => listener(messageEvent.data as BroadcastMessage))
  })

  if (projectProcessId) {
    port.postMessage({ type: 'project-ready', processId: projectProcessId })
  }
})

ipcRenderer.on('process-info', (_event, payload) => {
  projectProcessId = payload.processId
  currentProjectPath = payload.projectPath
  if (projectPort) {
    projectPort.postMessage({ type: 'project-ready', processId: projectProcessId })
  }
})

function ensurePort(): MessagePort {
  if (!projectPort) {
    throw new Error('Project process port is not ready yet.')
  }
  return projectPort
}

contextBridge.exposeInMainWorld('nimbria', {
  // 获取当前项目路径
  getCurrentProjectPath: () => currentProjectPath,
  
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize', {}),
    close: () => ipcRenderer.invoke('window:close', {}),
    maximize: () => ipcRenderer.invoke('window:maximize', {}),
    unmaximize: () => ipcRenderer.invoke('window:unmaximize', {}),
    isMaximized: async () => {
      const result = await ipcRenderer.invoke('window:is-maximized', {})
      return result.value
    },
    focus: () => {
      ensurePort().postMessage({ type: 'project-focus-request', processId: projectProcessId })
    },
    showMain: () => ipcRenderer.invoke('window:show-main')
  },

  project: {
    save: (projectData: ProjectData) => ipcRenderer.invoke('project:save', { projectData }) as Promise<SaveResult>,
    broadcastToProjects: (message: BroadcastMessage) => {
      ensurePort().postMessage({ type: 'project-broadcast', message })
    },
    // 🔥 标签页拆分到新窗口
    detachTabToWindow: (data: { 
      tabId: string
      tabData: {
        id: string
        title: string
        filePath: string
        content: string
        isDirty: boolean
      }
      projectPath: string 
    }) => 
      ipcRenderer.invoke('project:detach-tab-to-window', data)
  },

  process: {
    sendToMain: (message: unknown) => {
      ensurePort().postMessage({ type: 'to-main', payload: message, processId: projectProcessId })
    },
    onBroadcast: (callback: (message: BroadcastMessage) => void) => {
      broadcastListeners.add(callback)
    },
    createWorker: (scriptPath: string) => new Worker(scriptPath)
  },

  // Markdown 文件管理 API
  markdown: {
    // 扫描项目中的 Markdown 文件树
    scanTree: async (options: { projectPath: string; excludeDirs?: string[]; maxDepth?: number }) => {
      const result = await ipcRenderer.invoke('markdown:scanTree', options)
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    },

    // 读取 Markdown 文件内容
    readFile: async (filePath: string): Promise<string> => {
      const result = await ipcRenderer.invoke('markdown:readFile', filePath)
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    },

    // 写入 Markdown 文件
    writeFile: async (
      filePath: string,
      content: string,
      options?: { createBackup?: boolean; encoding?: string }
    ): Promise<{ success: boolean; error?: string }> => {
      const result = await ipcRenderer.invoke('markdown:writeFile', {
        filePath,
        content,
        options
      })
      return {
        success: result.success,
        error: result.error
      }
    },

    // 批量写入多个 Markdown 文件
    batchWriteFiles: async (
      files: Array<{ path: string; content: string }>
    ): Promise<{
      success: boolean
      totalCount: number
      successCount: number
      failedCount: number
      errors?: Array<{ filePath: string; error: string }>
    }> => {
      const result = await ipcRenderer.invoke('markdown:batchWrite', files)
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    },

    // 创建文件备份
    createBackup: async (filePath: string): Promise<string> => {
      const result = await ipcRenderer.invoke('markdown:createBackup', filePath)
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    },

    // 列出文件的所有备份
    listBackups: async (
      filePath: string
    ): Promise<
      Array<{
        path: string
        originalPath: string
        timestamp: number
        size: number
      }>
    > => {
      const result = await ipcRenderer.invoke('markdown:listBackups', filePath)
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    },

    // 恢复文件备份
    restoreBackup: async (backupPath: string): Promise<{ success: boolean; error?: string }> => {
      const result = await ipcRenderer.invoke('markdown:restoreBackup', backupPath)
      return {
        success: result.success,
        error: result.error
      }
    }
  },
  
  // 文件/目录创建 API
  file: {
    // 创建文件
    createFile: async (filePath: string, initialContent = ''): Promise<{ success: boolean; error?: string }> => {
      return await ipcRenderer.invoke('file:create', filePath, initialContent)
    },
    
    // 创建目录
    createDirectory: async (dirPath: string): Promise<{ success: boolean; error?: string }> => {
      return await ipcRenderer.invoke('file:createDirectory', dirPath)
    }
  },
  
  // LLM 配置 API
  llm: {
    getProviders: () => ipcRenderer.invoke('llm:get-providers', undefined),
    addProvider: (provider: any) => 
      ipcRenderer.invoke('llm:add-provider', { provider }),
    removeProvider: (providerId: string) => 
      ipcRenderer.invoke('llm:remove-provider', { providerId }),
    updateProviderConfig: (providerId: string, config: any) =>
      ipcRenderer.invoke('llm:update-provider-config', { providerId, config }),
    activateProvider: (providerId: string) => 
      ipcRenderer.invoke('llm:activate-provider', { providerId }),
    deactivateProvider: (providerId: string) => 
      ipcRenderer.invoke('llm:deactivate-provider', { providerId }),
    refreshModels: (providerId: string) => 
      ipcRenderer.invoke('llm:refresh-models', { providerId }),
    testConnection: (providerId: string) => 
      ipcRenderer.invoke('llm:test-connection', { providerId }),
    testNewConnection: (baseUrl: string, apiKey: string) =>
      ipcRenderer.invoke('llm:test-new-connection', { baseUrl, apiKey }),
    validateProvider: (config: any) =>
      ipcRenderer.invoke('llm:validate-provider', { config }),
    updateModelConfig: (providerId: string, modelType: string, modelName: string, config: any) =>
      ipcRenderer.invoke('llm:update-model-config', { providerId, modelType, modelName, config }),
    setModelDisplayName: (providerId: string, modelName: string, displayName: string) =>
      ipcRenderer.invoke('llm:set-model-display-name', { providerId, modelName, displayName }),
    toggleModelSelection: (providerId: string, modelType: string, modelName: string) =>
      ipcRenderer.invoke('llm:toggle-model-selection', { providerId, modelType, modelName }),
    setPreferredModel: (providerId: string, modelType: string, modelName: string) =>
      ipcRenderer.invoke('llm:set-preferred-model', { providerId, modelType, modelName })
  },

  // LLM Chat API
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
  },

  // Database API
  database: {
    // LLM Chat 数据库操作
    llmGetConversations: (args: { projectPath: string }) => 
      ipcRenderer.invoke('database:llm-get-conversations', args),
    llmGetConversation: (args: { projectPath: string; conversationId: string }) => 
      ipcRenderer.invoke('database:llm-get-conversation', args),
    llmCreateConversation: (args: { projectPath: string; conversation: any }) => 
      ipcRenderer.invoke('database:llm-create-conversation', args),
    llmAddMessage: (args: { projectPath: string; conversationId: string; message: any }) => 
      ipcRenderer.invoke('database:llm-add-message', args),
    llmDeleteConversation: (args: { projectPath: string; conversationId: string }) => 
      ipcRenderer.invoke('database:llm-delete-conversation', args),
    llmUpdateConversationTitle: (args: { projectPath: string; conversationId: string; title: string }) => 
      ipcRenderer.invoke('database:llm-update-conversation-title', args),
    llmSearchConversations: (args: { projectPath: string; query: string }) => 
      ipcRenderer.invoke('database:llm-search-conversations', args)
  },
  
  // DocParser 文档解析 API
  docParser: {
    // 创建 Schema
    createSchema: async (projectPath: string, schemaName: string, template?: string): Promise<string> => {
      const result = await ipcRenderer.invoke('docParser:createSchema', { projectPath, schemaName, template })
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    },
    
    // 加载 Schema
    loadSchema: async (schemaPath: string): Promise<string> => {
      const result = await ipcRenderer.invoke('docParser:loadSchema', { schemaPath })
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    },
    
    // 保存 Schema
    saveSchema: async (schemaPath: string, content: string): Promise<boolean> => {
      const result = await ipcRenderer.invoke('docParser:saveSchema', { schemaPath, content })
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    },
    
    // 列出 Schema 文件
    listSchemas: async (projectPath: string): Promise<string[]> => {
      const result = await ipcRenderer.invoke('docParser:listSchemas', { projectPath })
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    },
    
    // 选择 Schema 文件
    selectSchemaFile: async (defaultPath?: string): Promise<{ canceled: boolean; filePaths: string[] }> => {
      const result = await ipcRenderer.invoke('docParser:selectSchemaFile', { defaultPath })
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    },
    
    // 选择待解析文档
    selectDocumentFile: async (defaultPath?: string): Promise<{ canceled: boolean; filePaths: string[] }> => {
      const result = await ipcRenderer.invoke('docParser:selectDocumentFile', { defaultPath })
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    },
    
    // 选择导出路径
    selectExportPath: async (defaultPath?: string, fileName?: string): Promise<{ canceled: boolean; filePath?: string }> => {
      const result = await ipcRenderer.invoke('docParser:selectExportPath', { defaultPath, fileName })
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    },
    
    // 读取待解析文档
    readDocument: async (filePath: string): Promise<string> => {
      const result = await ipcRenderer.invoke('docParser:readDocument', { filePath })
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    },
    
    // 保存导出文件
    saveExport: async (filePath: string, data: Uint8Array, format?: string): Promise<boolean> => {
      const result = await ipcRenderer.invoke('docParser:saveExport', { filePath, data, format })
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    }
  },

  // ✨ StarChart API
  starChart: {
    // ✅ 初始化 - 自动使用当前项目路径
    initialize: () => ipcRenderer.invoke('starchart:initialize'),
    
    // ✅ 创建项目的 StarChart - 自动使用 currentProjectPath
    createProject: async () => {
      if (!currentProjectPath) {
        return { success: false, error: 'No project path available' }
      }
      return ipcRenderer.invoke('starchart:create-project', { projectPath: currentProjectPath })
    },
    
    // ✅ 读取元数据 - 自动使用 currentProjectPath
    getMetadata: async () => {
      if (!currentProjectPath) {
        return { success: false, error: 'No project path available' }
      }
      return ipcRenderer.invoke('starchart:get-metadata', { projectPath: currentProjectPath })
    },
    
    // 事件监听
    onInitStart: (callback: (data: any) => void) => {
      ipcRenderer.on('starchart:init-start', (_event, data) => callback(data))
    },
    onInitComplete: (callback: (data: any) => void) => {
      ipcRenderer.on('starchart:init-complete', (_event, data) => callback(data))
    },
    onInitError: (callback: (data: any) => void) => {
      ipcRenderer.on('starchart:init-error', (_event, data) => callback(data))
    },
    onProjectCreateStart: (callback: (data: any) => void) => {
      ipcRenderer.on('starchart:project-create-start', (_event, data) => callback(data))
    },
    onProjectCreated: (callback: (data: any) => void) => {
      ipcRenderer.on('starchart:project-created', (_event, data) => callback(data))
    },
    onProjectError: (callback: (data: any) => void) => {
      ipcRenderer.on('starchart:project-error', (_event, data) => callback(data))
    }
  },

  // 🌐 LLM Translate API - 批量翻译系统
  llmTranslate: {
    // ===== 数据查询（同步IPC调用） =====
    getBatches: () => ipcRenderer.invoke('llm-translate:get-batches'),
    
    getTasks: (args: { batchId: string }) => ipcRenderer.invoke('llm-translate:get-tasks', args),
    
    getTask: (args: { taskId: string }) => ipcRenderer.invoke('llm-translate:get-task', args),
    
    // ===== 批次操作（异步IPC调用 + 事件反馈） =====
    createBatch: (args: { config: any; content: string }) => 
      ipcRenderer.invoke('llm-translate:create-batch', args),
    
    submitTasks: (args: { batchId: string; taskIds: string[] }) => 
      ipcRenderer.invoke('llm-translate:submit-tasks', args),
    
    retryFailedTasks: (args: { batchId: string }) => 
      ipcRenderer.invoke('llm-translate:retry-failed-tasks', args),
    
    pauseBatch: (args: { batchId: string }) => 
      ipcRenderer.invoke('llm-translate:pause-batch', args),
    
    resumeBatch: (args: { batchId: string }) => 
      ipcRenderer.invoke('llm-translate:resume-batch', args),
    
    // ===== 本地文件操作（Electron Dialog） =====
    selectFile: () => ipcRenderer.invoke('llm-translate:select-file'),
    
    selectOutputDir: () => ipcRenderer.invoke('llm-translate:select-output-dir'),
    
    exportBatch: (args: { batchId: string; options: any }) => 
      ipcRenderer.invoke('llm-translate:export-batch', args),
    
    // ===== 删除操作（异步IPC调用 + 事件反馈） =====
    deleteBatch: (args: { batchId: string }) => 
      ipcRenderer.invoke('llm-translate:delete-batch', args),
    
    deleteTasks: (args: { taskIds: string[] }) => 
      ipcRenderer.invoke('llm-translate:delete-tasks', args),
    
    // ===== 单个任务操作 =====
    pauseTask: (args: { taskId: string }) => 
      ipcRenderer.invoke('llm-translate:pause-task', args),
    
    retryTask: (args: { taskId: string }) => 
      ipcRenderer.invoke('llm-translate:retry-task', args),
    
    // ===== 事件监听（IPC 事件流） =====
    onBatchCreateStart: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:batch-create-start', (_event, data) => callback(data))
    },
    
    onBatchCreated: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:batch-created', (_event, data) => callback(data))
    },
    
    onBatchCreateError: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:batch-create-error', (_event, data) => callback(data))
    },
    
    onTaskSubmitStart: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:task-submit-start', (_event, data) => callback(data))
    },
    
    onTaskSubmitted: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:task-submitted', (_event, data) => callback(data))
    },
    
    onTaskProgress: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:task-progress', (_event, data) => callback(data))
    },
    
    onTaskComplete: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:task-complete', (_event, data) => callback(data))
    },
    
    onTaskError: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:task-error', (_event, data) => callback(data))
    },
    
    onBatchPaused: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:batch-paused', (_event, data) => callback(data))
    },
    
    onBatchResumed: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:batch-resumed', (_event, data) => callback(data))
    },
    
    onExportStart: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:export-start', (_event, data) => callback(data))
    },
    
    onExportComplete: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:export-complete', (_event, data) => callback(data))
    },
    
    onExportError: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:export-error', (_event, data) => callback(data))
    },
    
    // ===== 删除事件监听 =====
    onBatchDeleteStart: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:batch-delete-start', (_event, data) => callback(data))
    },
    
    onBatchDeleted: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:batch-deleted', (_event, data) => callback(data))
    },
    
    onBatchDeleteError: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:batch-delete-error', (_event, data) => callback(data))
    },
    
    onTaskDeleteStart: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:task-delete-start', (_event, data) => callback(data))
    },
    
    onTaskDeleted: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:task-deleted', (_event, data) => callback(data))
    },
    
    onTaskDeleteError: (callback: (data: any) => void) => {
      ipcRenderer.on('llm-translate:task-delete-error', (_event, data) => callback(data))
    }
  },

  // 🔥 事件通信 API
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
  
  send: (channel: string, ...args: unknown[]) => {
    ipcRenderer.send(channel, ...args)
  }
})

