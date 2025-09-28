import { contextBridge, ipcRenderer } from 'electron'

import type { BroadcastMessage, ProjectData, SaveResult } from '../../Client/Types/project'

let projectPort: MessagePort | null = null
let projectProcessId: string | null = null

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
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize', {}),
    close: () => ipcRenderer.invoke('window:close', {}),
    maximize: () => ipcRenderer.invoke('window:maximize', {}),
    unmaximize: () => ipcRenderer.invoke('window:unmaximize', {}),
    isMaximized: async () => {
      const result = await ipcRenderer.invoke('window:is-maximized', {})
      return result.value
    },
    focus: async () => {
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
  }
})

