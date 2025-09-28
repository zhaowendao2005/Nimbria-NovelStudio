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
}

declare global {
  interface Window {
    nimbria: NimbriaWindowAPI
  }
}

export {}

