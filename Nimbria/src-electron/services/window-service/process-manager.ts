import { BrowserWindow, MessageChannelMain, app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

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
import { WindowBoundsStore } from '../../store/window-bounds-store'

interface ProcessManagerDependencies {
  defaultTemplates: Record<WindowType, WindowTemplate>
  lifecycleHooks?: WindowLifecycleHooks
  persistenceAdapter?: ProcessPersistenceAdapter
  boundsStore?: WindowBoundsStore
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

  public createMainProcess(): MainWindowProcess {
    const template = this.dependencies.defaultTemplates.main
    const processId = 'main'

    const window = this.createBrowserWindow({
      type: 'main',
      templateId: template.id,
      overrides: {},
      windowId: processId
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

    // 恢复主窗口的最大化状态
    if (this.dependencies.boundsStore?.shouldMaximize(processId)) {
      window.maximize()
    }

    return process
  }

  public createProjectProcess(projectPath: string, options?: CreateProcessOptions): ProjectWindowProcess {
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
      overrides: options?.configOverrides,
      windowId: projectPath
    })

    const { port1, port2 } = new MessageChannelMain()

    window.webContents.once('did-finish-load', () => {
      window.webContents.postMessage('port', null, [port1])
      window.webContents.postMessage('process-info', { 
        processId,
        projectPath 
      })
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

    // 恢复项目窗口的最大化状态
    if (this.dependencies.boundsStore?.shouldMaximize(projectPath)) {
      window.maximize()
    }

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

  /**
   * 通过BrowserWindow.id查找对应的WindowProcess
   */
  public getProcessByWindowId(windowId: number): WindowProcess | null {
    for (const entry of this.processes.values()) {
      if (entry.process.window.id === windowId) {
        return entry.process
      }
    }
    return null
  }

  public getMainProcess(): MainWindowProcess | null {
    const process = this.processes.get('main')?.process
    return process && process.type === 'main' ? process : null
  }

  private createBrowserWindow(config: CreateWindowConfig & { windowId?: string }): BrowserWindow {
    const template = this.dependencies.defaultTemplates[config.type]
    const baseOptions = template.options
    const overrides = config.overrides ?? {}
    const { webPreferences: overrideWebPreferences, ...restOverrides } = overrides

    // 🔥 检查是否为调试模式
    const isDev = !!process.env.DEV || !!process.env.DEBUGGING
    const isDebugMode = !!process.env.ELECTRON_DEBUG

    // 💾 从WindowBoundsStore中获取保存的窗口位置
    let savedBounds: Partial<{ x: number; y: number; width: number; height: number }> | null = null
    if (config.windowId && this.dependencies.boundsStore) {
      savedBounds = this.dependencies.boundsStore.getApplicableBounds(config.windowId)
    }

    const options: WindowProcessConfig = {
      type: config.type,
      width: savedBounds?.width ?? baseOptions.width ?? 1024,
      height: savedBounds?.height ?? baseOptions.height ?? 720,
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
        nodeIntegrationInWorker: config.type === 'project',
        // 🔥 在开发模式或调试模式下启用 DevTools
        devTools: isDev || isDebugMode
      }
    }

    const window = new BrowserWindow({
      ...(savedBounds?.x !== undefined && { x: savedBounds.x }),
      ...(savedBounds?.y !== undefined && { y: savedBounds.y }),
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

    // 🔥 添加F12键支持开发者工具 - 参考SatisfactoryBluePrint项目
    window.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') {
        if (window.webContents.isDevToolsOpened()) {
          window.webContents.closeDevTools()
        } else {
          window.webContents.openDevTools({ mode: 'detach' })
        }
      }
    })

    window.on('focus', () => {
      process.lastActive = new Date()
      this.dependencies.lifecycleHooks?.onFocusChanged?.(id, true)
    })

    window.on('blur', () => {
      this.dependencies.lifecycleHooks?.onFocusChanged?.(id, false)
    })

    // 💾 在窗口关闭前保存窗口位置
    window.on('close', async () => {
      const windowId = process.type === 'project' ? process.projectPath : 'main'
      
      if (this.dependencies.boundsStore) {
        try {
          const bounds = window.getBounds()
          const isMaximized = window.isMaximized()
          
          await this.dependencies.boundsStore.saveBounds(
            windowId,
            {
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height
            },
            isMaximized,
            process.type === 'project' ? process.projectPath : undefined
          )
        } catch (error) {
          console.error('Failed to save window bounds:', error)
        }
      }
    })

    window.on('closed', () => {
      void this.destroyProcess(id)
    })

    this.dependencies.lifecycleHooks?.onReady?.(process)

    void this.persistProcess(process)
  }

  private resolvePreloadPath(type: WindowType): string {
    const isDev = !!process.env.DEV || !!process.env.DEBUGGING
    const preloadBaseName = type === 'main' ? 'main-preload' : 'project-preload'

    if (isDev) {
      return path.join(app.getAppPath(), 'preload', `${preloadBaseName}.cjs`)
    }

    // 🔥 修复生产环境路径问题 - 与 AppManager 保持一致
    const preloadFolder = process.env.QUASAR_ELECTRON_PRELOAD_FOLDER || 'electron-preload'
    const preloadExtension = process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION || '.cjs'
    
    // 尝试主路径
    let preloadPath = path.join(app.getAppPath(), preloadFolder, `${preloadBaseName}${preloadExtension}`)
    
    // 检查文件是否存在，如果不存在尝试备用路径
    if (!fs.existsSync(preloadPath)) {
      const altPath = path.join(__dirname, '../preload', `${preloadBaseName}${preloadExtension}`)
      if (fs.existsSync(altPath)) {
        preloadPath = altPath
      }
    }

    return preloadPath
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

