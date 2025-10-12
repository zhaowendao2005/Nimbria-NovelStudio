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

  // 🔥 事件通信 API
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
  
  send: (channel: string, ...args: unknown[]) => {
    ipcRenderer.send(channel, ...args)
  }
})

