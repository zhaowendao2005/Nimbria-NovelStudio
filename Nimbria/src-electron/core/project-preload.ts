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
    }
  },

  project: {
    save: (projectData: ProjectData) => ipcRenderer.invoke('project:save', { projectData }) as Promise<SaveResult>,
    broadcastToProjects: (message: BroadcastMessage) => {
      ensurePort().postMessage({ type: 'project-broadcast', message })
    }
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
  }
})

