import type { BroadcastMessage } from '../../types/ipc'
import type { MainWindowProcess, ProjectWindowProcess, WindowLifecycleHooks, WindowProcess, WindowType } from '../../types/process'
import type { WindowTemplate } from '../../types/window'

import { MessageRouter } from './message-router'
import { ProcessManager, type ProcessPersistenceAdapter } from './process-manager'

interface WindowManagerOptions {
  templates: Record<WindowType, WindowTemplate>
  lifecycleHooks?: WindowLifecycleHooks
  persistenceAdapter?: ProcessPersistenceAdapter
}

export class WindowManager {
  private readonly processManager: ProcessManager
  private readonly messageRouter: MessageRouter

  constructor(options: WindowManagerOptions) {
    const pmDeps = {
      defaultTemplates: options.templates,
      ...(options.lifecycleHooks && { lifecycleHooks: options.lifecycleHooks }),
      ...(options.persistenceAdapter && { persistenceAdapter: options.persistenceAdapter })
    }
    
    this.processManager = new ProcessManager(pmDeps)

    this.messageRouter = new MessageRouter({
      onRoute: (from, to, data) => {
        // TODO: 根据需要扩展日志或分析
        if (to === 'broadcast') {
          this.processManager.broadcastMessage({
            type: 'process-message',
            data,
            fromProcess: from,
            timestamp: new Date().toISOString()
          })
        }
      }
    })
  }

  public async createMainWindow(): Promise<WindowProcess> {
    const process = await this.processManager.createMainProcess()
    this.messageRouter.setupChannel(process)
    return process
  }

  public async createProjectWindow(projectPath: string): Promise<WindowProcess> {
    const process = await this.processManager.createProjectProcess(projectPath)
    this.messageRouter.setupChannel(process)
    return process
  }

  public async destroyProcess(processId: string): Promise<void> {
    this.messageRouter.closeChannel(processId)
    await this.processManager.destroyProcess(processId)
  }

  public broadcast(message: BroadcastMessage): void {
    this.processManager.broadcastMessage(message)
  }

  public getProcess(processId: string): WindowProcess | null {
    return this.processManager.getProcess(processId)
  }

  public getMainProcess(): MainWindowProcess | null {
    return this.processManager.getMainProcess()
  }

  public getProjectProcessByPath(projectPath: string): ProjectWindowProcess | null {
    return this.processManager.getProcessByProjectPath(projectPath)
  }

  public sendMessageToProcess(processId: string, data: unknown): void {
    this.processManager.sendMessageToProcess(processId, data)
  }

  /**
   * 通过BrowserWindow.id查找对应的WindowProcess
   */
  public getProcessByWindowId(windowId: number): WindowProcess | null {
    return this.processManager.getProcessByWindowId(windowId)
  }

  /**
   * 获取 ProcessManager 实例
   * 用于需要直接访问进程管理器的场景
   */
  public getProcessManager(): ProcessManager {
    return this.processManager
  }
}
