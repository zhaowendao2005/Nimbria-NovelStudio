import { BrowserWindow, MessageChannelMain, app } from 'electron'
import path from 'node:path'

import type { BroadcastMessage } from '../../types/ipc'
import type {
  CreateProcessOptions,
  MainWindowProcess,
  ProcessPersistenceInfo,
  ProcessRegistryEntry,
  ProjectWindowProcess,
  WindowProcess,
  WindowProcessConfig,
  WindowType,
  WindowLifecycleHooks,
  WindowMetrics
} from '../../types/process'
import type { CreateWindowConfig, WindowTemplate } from '../../types/window'

interface ProcessManagerDependencies {
  defaultTemplates: Record<WindowType, WindowTemplate>
  lifecycleHooks?: WindowLifecycleHooks
  persistenceAdapter?: ProcessPersistenceAdapter
}

export interface ProcessPersistenceAdapter {
  loadProcesses(): Promise<ProcessPersistenceInfo[]>
  saveProcess(info: ProcessPersistenceInfo): Promise<void>
  removeProcess(processId: string): Promise<void>
}

export class ProcessManager {
  private readonly processes = new Map<string, ProcessRegistryEntry>()
  private readonly projectPathIndex = new Map<string, string>()
  private readonly dependencies: ProcessManagerDependencies

  constructor(dependencies: ProcessManagerDependencies) {
    this.dependencies = dependencies
  }

  public async createMainProcess(): Promise<MainWindowProcess> {
    const template = this.dependencies.defaultTemplates.main
    const processId = 'main'

    const window = this.createBrowserWindow({
      type: 'main',
      templateId: template.id,
      overrides: {}
    })

    const { port1, port2 } = new MessageChannelMain()

    window.once('ready-to-show', () => {
      window.webContents.postMessage('port', null, [port1])
      window.webContents.postMessage('process-info', { processId })
    })

    const process: MainWindowProcess = {
      id: processId,
      type: 'main',
      window,
      port: port2,
      processId: window.webContents.getProcessId(),
      createdAt: new Date(),
      lastActive: new Date()
    }

    this.registerProcess(process, template)
    this.setupWindowLifecycle(process)

    return process
  }

  public async createProjectProcess(projectPath: string, options?: CreateProcessOptions): Promise<ProjectWindowProcess> {
    const existingProcessId = this.projectPathIndex.get(projectPath)
    if (existingProcessId) {
      const existingProcess = this.processes.get(existingProcessId)?.process as ProjectWindowProcess | undefined
      if (existingProcess) {
        existingProcess.window.focus()
        return existingProcess
      }
    }

    const processId = `project-${Date.now()}`
    const template = this.dependencies.defaultTemplates.project
    const window = this.createBrowserWindow({
      type: 'project',
      templateId: template.id,
      projectPath,
      overrides: options?.configOverrides
    })

    const { port1, port2 } = new MessageChannelMain()

    window.webContents.once('did-finish-load', () => {
      window.webContents.postMessage('port', null, [port1])
      window.webContents.postMessage('process-info', { processId })
    })

    const process: ProjectWindowProcess = {
      id: processId,
      type: 'project',
      window,
      port: port2,
      processId: window.webContents.getProcessId(),
      projectPath,
      createdAt: new Date(),
      lastActive: new Date()
    }

    this.registerProcess(process, template)
    this.projectPathIndex.set(projectPath, processId)
    this.setupWindowLifecycle(process)

    return process
  }

  public getProcess(processId: string): WindowProcess | null {
    return this.processes.get(processId)?.process ?? null
  }

  public async destroyProcess(processId: string): Promise<void> {
    const entry = this.processes.get(processId)
    if (!entry) return

    const { process } = entry

    if (!process.window.isDestroyed()) {
      process.window.destroy()
    }

    process.port.close()
    this.processes.delete(processId)

    if (process.type === 'project') {
      this.projectPathIndex.delete(process.projectPath)
    }

    await this.removePersistence(processId)
    this.dependencies.lifecycleHooks?.onDestroyed?.(processId)
  }

  public broadcastMessage(message: BroadcastMessage): void {
    const payload: BroadcastMessage = {
      ...message,
      timestamp: message.timestamp ?? new Date().toISOString()
    }

    for (const { process } of this.processes.values()) {
      process.port.postMessage(payload)
    }
  }

  public sendMessageToProcess(processId: string, data: unknown): void {
    const entry = this.processes.get(processId)
    if (!entry) return
    entry.process.port.postMessage(data)
  }

  public getProcessByProjectPath(projectPath: string): ProjectWindowProcess | null {
    const processId = this.projectPathIndex.get(projectPath)
    if (!processId) return null
    const process = this.processes.get(processId)?.process
    if (process && process.type === 'project') {
      return process
    }
    return null
  }

  public getMainProcess(): MainWindowProcess | null {
    const process = this.processes.get('main')?.process
    return process && process.type === 'main' ? process : null
  }

  private createBrowserWindow(config: CreateWindowConfig): BrowserWindow {
    const template = this.dependencies.defaultTemplates[config.type]
    const baseOptions = template.options
    const overrides = config.overrides ?? {}
    const { webPreferences: overrideWebPreferences, ...restOverrides } = overrides

    const options: WindowProcessConfig = {
      type: config.type,
      width: baseOptions.width ?? 1024,
      height: baseOptions.height ?? 720,
      minWidth: baseOptions.minWidth,
      minHeight: baseOptions.minHeight,
      maxWidth: baseOptions.maxWidth,
      maxHeight: baseOptions.maxHeight,
      resizable: baseOptions.resizable,
      show: baseOptions.show ?? true,
      title: baseOptions.title,
      iconPath: baseOptions.icon as string | undefined,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: this.resolvePreloadPath(config.type),
        partition: config.type === 'project' ? `persist:${config.projectPath ?? ''}` : undefined,
        sandbox: config.type === 'project' ? false : undefined,
        nodeIntegrationInWorker: config.type === 'project'
      }
    }

    const window = new BrowserWindow({
      width: options.width,
      height: options.height,
      minWidth: options.minWidth,
      minHeight: options.minHeight,
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
      resizable: options.resizable,
      show: options.show,
      title: options.title,
      icon: options.iconPath,
      frame: baseOptions.frame,
      useContentSize: baseOptions.useContentSize,
      fullscreenable: baseOptions.fullscreenable,
      webPreferences: {
        ...options.webPreferences,
        ...overrideWebPreferences
      },
      ...restOverrides
    })

    return window
  }

  private registerProcess(process: WindowProcess, template: WindowTemplate): void {
    this.processes.set(process.id, {
      process,
      config: {
        type: process.type,
        width: template.options.width ?? process.window.getBounds().width,
        height: template.options.height ?? process.window.getBounds().height,
        minWidth: template.options.minWidth,
        minHeight: template.options.minHeight,
        maxWidth: template.options.maxWidth,
        maxHeight: template.options.maxHeight,
        resizable: template.options.resizable,
        show: template.options.show,
        title: template.options.title,
        iconPath: template.options.icon as string | undefined,
        webPreferences: template.options.webPreferences ?? {}
      }
    })
  }

  private setupWindowLifecycle(process: WindowProcess): void {
    const { window, id } = process

    window.on('focus', () => {
      process.lastActive = new Date()
      this.dependencies.lifecycleHooks?.onFocusChanged?.(id, true)
    })

    window.on('blur', () => {
      this.dependencies.lifecycleHooks?.onFocusChanged?.(id, false)
    })

    window.on('closed', () => {
      void this.destroyProcess(id)
    })

    this.dependencies.lifecycleHooks?.onReady?.(process)

    void this.persistProcess(process)
  }

  private resolvePreloadPath(type: WindowType): string {
    const preloadName = type === 'main' ? 'main-preload.js' : 'project-preload.js'
    return path.join(app.getAppPath(), 'src-electron', 'core', preloadName)
  }

  private async persistProcess(process: WindowProcess): Promise<void> {
    if (!this.dependencies.persistenceAdapter) return

    const metrics = this.collectWindowMetrics(process.window)
    const info: ProcessPersistenceInfo = {
      id: process.id,
      type: process.type,
      projectPath: process.type === 'project' ? process.projectPath : undefined,
      lastWindowMetrics: metrics,
      lastOpenedAt: new Date().toISOString()
    }

    await this.dependencies.persistenceAdapter.saveProcess(info)
  }

  private async removePersistence(processId: string): Promise<void> {
    if (!this.dependencies.persistenceAdapter) return
    await this.dependencies.persistenceAdapter.removeProcess(processId)
  }

  private collectWindowMetrics(window: BrowserWindow): WindowMetrics {
    const bounds = window.getBounds()

    return {
      bounds: {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y
      },
      isMaximized: window.isMaximized(),
      isMinimized: window.isMinimized(),
      isVisible: window.isVisible()
    }
  }
}

