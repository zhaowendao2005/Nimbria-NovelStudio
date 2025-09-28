import type { BroadcastMessage, ProjectData, ProjectResult, RecentProject, SaveResult } from './project'

export interface NimbriaWindowAPI {
  window: {
    minimize(): Promise<void>
    close(): Promise<void>
    maximize(): Promise<void>
    unmaximize(): Promise<void>
    isMaximized(): Promise<boolean>
    focus(): Promise<void>
  }

  project: {
    createWindow(projectPath: string): Promise<ProjectResult>
    closeWindow(projectPath: string): Promise<ProjectResult>
    save(projectData: ProjectData): Promise<SaveResult>
    getRecent(): Promise<RecentProject[]>
    broadcastToProjects(message: BroadcastMessage): void
  }

  process: {
    sendToMain(message: unknown): void
    onBroadcast(callback: (message: BroadcastMessage) => void): void
    createWorker(scriptPath: string): Worker
  }

  file: {
    openDialog(options: {
      title?: string
      defaultPath?: string
      properties: Array<'openFile' | 'openDirectory' | 'multiSelections'>
      filters?: Array<{ name: string; extensions: string[] }>
    }): Promise<{
      canceled: boolean
      filePaths: string[]
    }>
    
    saveDialog(options: {
      title?: string
      defaultPath?: string
      filters?: Array<{ name: string; extensions: string[] }>
    }): Promise<{
      canceled: boolean
      filePath?: string
    }>
  }
}

declare global {
  interface Window {
    nimbria: NimbriaWindowAPI
  }
}

export {}

