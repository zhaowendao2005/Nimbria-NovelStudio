import { app, ipcMain, dialog, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDevEnvironment = !!process.env.DEV || !!process.env.DEBUGGING

import type { WindowTemplate } from '../types/window'
import type { WindowProcess, ProjectWindowProcess, MainWindowProcess } from '../types/process'
import type { IPCRequest, IPCResponse, WindowOperationResult } from '../types/ipc'

import { WindowManager } from '../services/window-service/window-manager'
import { ProjectFileSystem } from '../services/file-service/project-fs'
import { ProjectManager } from '../services/project-service/project-manager'
import { getLogger } from '../utils/shared/logger'
import { getRecentProjects, upsertRecentProject } from '../store/recent-projects-store'
import { registerMarkdownHandlers } from '../ipc/main-renderer/markdown-handlers'
import { registerFileHandlers } from '../ipc/main-renderer/file-handlers'

const logger = getLogger('AppManager')

export class AppManager {
  private windowManager: WindowManager | null = null
  private mainProcess: WindowProcess | null = null
  private projectFileSystem!: ProjectFileSystem
  private projectManager!: ProjectManager
  private transferMap?: Map<string, { sourceWebContentsId: number; tabId: string }>

  async boot() {
    logger.info('Starting Nimbria application...')
    this.initializeFileSystem()
    await this.initializeWindowManager()
    this.registerIpcHandlers()
  }

  async shutdown() {
    logger.info('Shutting down Nimbria application...')
    if (this.projectFileSystem) {
      await this.projectFileSystem.cleanup()
    }
  }

  private initializeFileSystem() {
    this.projectFileSystem = new ProjectFileSystem()
    this.projectManager = new ProjectManager()
    logger.info('File system and project management services initialized')
  }

  private async initializeWindowManager() {
    const templates: Record<'main' | 'project', WindowTemplate> = {
      main: {
        id: 'main-default',
        type: 'main',
        options: {
          width: 1024,
          height: 720,
          minWidth: 900,
          minHeight: 620,
          maxWidth: 1120,
          maxHeight: 820,
          resizable: false,
          useContentSize: true,
          frame: false,
          title: 'Nimbria',
          icon: path.join(__dirname, '../icons/icon.png')
        }
      },
      project: {
        id: 'project-default',
        type: 'project',
        options: {
          width: 1200,
          height: 800,
          minWidth: 960,
          minHeight: 640,
          resizable: true,
          useContentSize: true,
          frame: false,
          title: 'Nimbria Project'
        }
      }
    }

    this.windowManager = new WindowManager({
      templates,
      lifecycleHooks: {
        onReady: (windowProcess) => {
          if (windowProcess.type === 'main') {
            this.mainProcess = windowProcess
            this.loadMainWindow(windowProcess)
          } else if (windowProcess.type === 'project') {
            this.loadProjectWindow(windowProcess)
          }
        }
      }
    })

    const launch = async () => {
      if (!this.windowManager) return
      this.mainProcess = await this.windowManager.createMainWindow()
    }

    if (app.isReady()) {
      await launch()
    } else {
      app.on('ready', () => {
        void launch()
      })
    }

    app.on('activate', () => {
      if (!this.mainProcess) {
        void launch()
      }
    })

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })
  }

  private loadMainWindow(windowProcess: WindowProcess) {
    if (isDevEnvironment) {
      const url = process.env.APP_URL
      if (url) void windowProcess.window.loadURL(url)
      windowProcess.window.webContents.openDevTools()
      return
    }

    void windowProcess.window.loadFile(path.join(__dirname, '../../index.html'))
  }

  private loadProjectWindow(windowProcess: WindowProcess) {
    if (isDevEnvironment) {
      const baseUrl = process.env.APP_URL
      if (baseUrl) {
        const projectUrl = `${baseUrl}#/project`  // 导航到项目页路由
        void windowProcess.window.loadURL(projectUrl)
      }
      windowProcess.window.webContents.openDevTools()
      return
    }

    // 生产环境：加载index.html并导航到/project
    void windowProcess.window.loadFile(path.join(__dirname, '../../index.html'), {
      hash: '/project'
    })
  }

  /**
   * 创建分离窗口（标签页拆分到新窗口）
   */
  private async createDetachedWindow(config: {
    projectPath: string
    transferId: string
    tabData: { title?: string; [key: string]: unknown }
    ui: 'minimal'
  }): Promise<BrowserWindow> {
    // 🔥 解析正确的 preload 脚本路径（与项目窗口相同）
    const preloadPath = this.resolvePreloadPath('project')
    
    const detachedWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      resizable: true,
      useContentSize: true,
      frame: false,
      title: config.tabData.title || 'Nimbria - Detached Window',
      icon: path.join(__dirname, '../icons/icon.png'),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false, // 🔥 与项目窗口保持一致
        nodeIntegrationInWorker: true, // 🔥 与项目窗口保持一致
        preload: preloadPath
      }
    })

    // 设置窗口标题
    detachedWindow.setTitle(config.tabData.title || 'Nimbria - Detached Window')

    // 构建URL参数
    const params = new URLSearchParams({
      newWindow: 'true',
      ui: config.ui,
      transferId: config.transferId,
      projectPath: config.projectPath,
      tabData: encodeURIComponent(JSON.stringify(config.tabData))
    })

    // 加载分离窗口页面
    if (isDevEnvironment) {
      const baseUrl = process.env.APP_URL
      if (baseUrl) {
        const detachedUrl = `${baseUrl}#/project-detached?${params.toString()}`
        await detachedWindow.loadURL(detachedUrl)
      }
      detachedWindow.webContents.openDevTools()
    } else {
      await detachedWindow.loadFile(path.join(__dirname, '../../index.html'), {
        hash: `/project-detached?${params.toString()}`
      })
    }

    logger.info('Detached window loaded:', config.transferId)

    return detachedWindow
  }

  /**
   * 解析 preload 脚本路径
   * 🔥 复用 ProcessManager 的逻辑，确保路径一致
   */
  private resolvePreloadPath(type: 'main' | 'project'): string {
    const preloadBaseName = type === 'main' ? 'main-preload' : 'project-preload'

    if (isDevEnvironment) {
      return path.join(app.getAppPath(), 'preload', `${preloadBaseName}.cjs`)
    }

    const preloadFolder = process.env.QUASAR_ELECTRON_PRELOAD_FOLDER || 'electron-preload'
    const preloadExtension = process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION || '.cjs'

    return path.join(app.getAppPath(), preloadFolder, `${preloadBaseName}${preloadExtension}`)
  }

  private registerIpcHandlers() {
    // 注册 Markdown IPC 处理器
    registerMarkdownHandlers()
    logger.info('Markdown IPC handlers registered')
    
    // 注册文件/目录创建 IPC 处理器（传入依赖）
    registerFileHandlers({
      projectFileSystem: this.projectFileSystem,
      processManager: this.windowManager!.getProcessManager()
    })
    logger.info('File IPC handlers registered')

    ipcMain.handle('window:minimize', (event, request: IPCRequest<'window:minimize'>) => {
      return this.handleWindowOperationFromEvent(event, 'minimize', request)
    })

    ipcMain.handle('window:maximize', (event, request: IPCRequest<'window:maximize'>) => {
      return this.handleWindowOperationFromEvent(event, 'maximize', request)
    })

    ipcMain.handle('window:unmaximize', (event, request: IPCRequest<'window:unmaximize'>) => {
      return this.handleWindowOperationFromEvent(event, 'unmaximize', request)
    })

    ipcMain.handle('window:close', (event, request: IPCRequest<'window:close'>) => {
      return this.handleWindowOperationFromEvent(event, 'close', request)
    })

    ipcMain.handle('window:focus', (event, request: IPCRequest<'window:focus'>) => {
      return this.handleWindowOperationFromEvent(event, 'focus', request)
    })

    ipcMain.handle('window:is-maximized', (event, request: IPCRequest<'window:is-maximized'>) => {
      const process = this.resolveWindowProcessFromEvent(event, request.windowId)
      if (!process) {
        return { success: false, value: false }
      }

      return {
        success: true,
        value: process.window.isMaximized()
      }
    })

    // 🔥 分离窗口专用频道（确保操作当前窗口）
    ipcMain.on('detached-window:minimize', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) {
        window.minimize()
        console.log('🔽 [AppManager] Detached window minimized')
      }
    })

    ipcMain.on('detached-window:maximize', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) {
        window.maximize()
        console.log('🔳 [AppManager] Detached window maximized')
      }
    })

    ipcMain.on('detached-window:unmaximize', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) {
        window.unmaximize()
        console.log('🔲 [AppManager] Detached window unmaximized')
      }
    })

    ipcMain.on('detached-window:close', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) {
        window.close()
        console.log('❌ [AppManager] Detached window closed')
      }
    })

    ipcMain.on('detached-window:query-maximized', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) {
        event.sender.send('detached-window:maximized-state', window.isMaximized())
      }
    })

    ipcMain.handle('project:create-window', async (_event, request: IPCRequest<'project:create-window'>) => {
      if (!this.windowManager) {
        return { success: false, errorCode: 'window-manager-not-ready' }
      }

      const process = await this.windowManager.createProjectWindow(request.projectPath)
      
      // 自动初始化项目文件系统上下文
      if (process.type === 'project') {
        await this.projectFileSystem.initProject(process.projectPath, process.id)
        logger.info(`Auto-initialized project filesystem for ${process.projectPath}`)
      }
      
      return {
        success: true,
        processId: process.id
      }
    })

    ipcMain.handle('project:close-window', async (_event, request: IPCRequest<'project:close-window'>) => {
      if (!this.windowManager) {
        return { success: false, errorCode: 'window-manager-not-ready' }
      }

      const process = this.getProjectProcessByPath(request.projectPath)
      if (!process) {
        return { success: false, message: 'Project window not found' }
      }

      await this.windowManager.destroyProcess(process.id)
      return { success: true }
    })

    ipcMain.handle('project:save', (_event, request: IPCRequest<'project:save'>) => {
      logger.info('Project save requested', request.projectData.id)
      // TODO: 调用实际保存逻辑
      return { success: true } satisfies IPCResponse<'project:save'>
    })

    ipcMain.handle('project:get-recent', () => {
      return getRecentProjects()
    })

    ipcMain.handle('project:update-recent', (_event, payload: { projectPath: string; projectName?: string }) => {
      upsertRecentProject(payload.projectPath, payload.projectName)
      return { success: true }
    })

    ipcMain.handle('project:clear-cache', () => {
      console.log('🗑️  [Electron Main] 收到清空缓存请求')
      console.log('🗑️  [Electron Main] 清空最近项目列表...')
      const { clearRecentProjects } = require('../store/recent-projects-store')
      clearRecentProjects()
      console.log('✅ [Electron Main] 最近项目列表已清空')
      return { success: true }
    })

    // 🔥 标签页拆分到新窗口
    ipcMain.handle('project:detach-tab-to-window', async (event, payload: { 
      tabId: string
      tabData: any
      projectPath: string 
    }) => {
      try {
        const transferId = `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        
        logger.info('Creating detached window for tab:', payload.tabId)
        
        // 记录源窗口映射（用于握手关闭）
        if (!this.transferMap) {
          this.transferMap = new Map()
        }
        this.transferMap.set(transferId, {
          sourceWebContentsId: event.sender.id,
          tabId: payload.tabId
        })
        
        // 创建分离窗口
        const detachedWindow = await this.createDetachedWindow({
          projectPath: payload.projectPath,
          transferId,
          tabData: payload.tabData,
          ui: 'minimal'
        })
        
        logger.info('Detached window created successfully, transferId:', transferId)
        
        return { success: true, windowId: detachedWindow.id }
      } catch (error) {
        logger.error('Failed to create detached window:', error)
        return { 
          success: false, 
          error: { 
            code: 'DETACH_FAILED', 
            message: (error as Error).message 
          } 
        }
      }
    })

    // 🔥 分离窗口就绪握手
    ipcMain.on('project:detached-ready', (_event, data: { transferId: string }) => {
      if (!this.transferMap) return
      
      const rec = this.transferMap.get(data.transferId)
      if (rec) {
        logger.info('Detached window ready, closing source tab:', rec.tabId)
        const sourceWindow = BrowserWindow.getAllWindows().find(
          win => win.webContents.id === rec.sourceWebContentsId
        )
        if (sourceWindow && !sourceWindow.isDestroyed()) {
          sourceWindow.webContents.send('project:close-source-tab', { 
            transferId: data.transferId, 
            tabId: rec.tabId 
          })
        }
        this.transferMap.delete(data.transferId)
      }
    })

    ipcMain.handle('process:broadcast', (_event, request: IPCRequest<'process:broadcast'>) => {
      this.windowManager?.broadcast(request.message)
      return undefined
    })

    // 文件对话框处理器
    ipcMain.handle('file:open-dialog', async (_event, request: IPCRequest<'file:open-dialog'>) => {
      const dialogOptions: Electron.OpenDialogOptions = {
        title: request.title || '选择文件或文件夹',
        properties: request.properties
      }
      if (request.defaultPath) {
        dialogOptions.defaultPath = request.defaultPath
      }
      if (request.filters) {
        dialogOptions.filters = request.filters
      }
      const result = await dialog.showOpenDialog(dialogOptions)

      return {
        canceled: result.canceled,
        filePaths: result.filePaths
      } satisfies IPCResponse<'file:open-dialog'>
    })

    ipcMain.handle('file:save-dialog', async (_event, request: IPCRequest<'file:save-dialog'>) => {
      const dialogOptions: Electron.SaveDialogOptions = {
        title: request.title || '保存文件'
      }
      if (request.defaultPath) {
        dialogOptions.defaultPath = request.defaultPath
      }
      if (request.filters) {
        dialogOptions.filters = request.filters
      }
      const result = await dialog.showSaveDialog(dialogOptions)

      return {
        canceled: result.canceled,
        filePath: result.filePath
      } satisfies IPCResponse<'file:save-dialog'>
    })

    // 文件系统处理器
    this.registerFileSystemHandlers()

    // 项目管理处理器
    this.registerProjectManagementHandlers()
  }

  private registerFileSystemHandlers() {
    // 项目文件系统初始化和清理
    ipcMain.handle('fs:project-init', async (_event, request: IPCRequest<'fs:project-init'>) => {
      const result = await this.projectFileSystem.initProject(request.projectPath, request.windowId)
      return result
    })

    ipcMain.handle('fs:project-cleanup', async (_event, request: IPCRequest<'fs:project-cleanup'>) => {
      const result = await this.projectFileSystem.cleanupProject(request.windowId)
      return result
    })

    // 基础文件操作
    ipcMain.handle('fs:read-file', async (_event, request: IPCRequest<'fs:read-file'>) => {
      const result = await this.projectFileSystem.readFile(request.path, request.projectId, request.encoding as BufferEncoding)
      return result
    })

    ipcMain.handle('fs:write-file', async (_event, request: IPCRequest<'fs:write-file'>) => {
      const result = await this.projectFileSystem.writeFile(request.path, request.content, request.projectId, request.encoding as BufferEncoding)
      return result
    })

    ipcMain.handle('fs:read-dir', async (_event, request: IPCRequest<'fs:read-dir'>) => {
      const result = await this.projectFileSystem.readDir(request.path, request.projectId)
      return result
    })

    ipcMain.handle('fs:create-dir', async (_event, request: IPCRequest<'fs:create-dir'>) => {
      const result = await this.projectFileSystem.createDir(request.path, request.projectId)
      return result
    })

    ipcMain.handle('fs:delete', async (_event, request: IPCRequest<'fs:delete'>) => {
      const result = await this.projectFileSystem.delete(request.path, request.projectId, request.recursive)
      return result
    })

    ipcMain.handle('fs:copy', async (_event, request: IPCRequest<'fs:copy'>) => {
      const result = await this.projectFileSystem.copy(request.source, request.dest, request.projectId)
      return result
    })

    ipcMain.handle('fs:move', async (_event, request: IPCRequest<'fs:move'>) => {
      const result = await this.projectFileSystem.move(request.source, request.dest, request.projectId)
      return result
    })

    // 高级功能
    ipcMain.handle('fs:glob', async (_event, request: IPCRequest<'fs:glob'>) => {
      const result = await this.projectFileSystem.glob(request.pattern, request.projectId, request.options)
      return result
    })

    ipcMain.handle('fs:watch-start', async (_event, request: IPCRequest<'fs:watch-start'>) => {
      const result = await this.projectFileSystem.startWatch(request.path, request.projectId, request.options)
      return result
    })

    ipcMain.handle('fs:watch-stop', async (_event, request: IPCRequest<'fs:watch-stop'>) => {
      const result = await this.projectFileSystem.stopWatch(request.watcherId)
      return result
    })

    logger.info('File system IPC handlers registered')
  }

  private registerProjectManagementHandlers() {
    // 创建项目
    ipcMain.handle('project-mgmt:create', async (_event, request: IPCRequest<'project-mgmt:create'>) => {
      const result = await this.projectManager.createProject(request)
      return result
    })

    // 验证项目
    ipcMain.handle('project-mgmt:validate', async (_event, request: IPCRequest<'project-mgmt:validate'>) => {
      const result = await this.projectManager.validateProject(request.projectPath)
      return result
    })

    // 快速验证项目
    ipcMain.handle('project-mgmt:quick-validate', async (_event, request: IPCRequest<'project-mgmt:quick-validate'>) => {
      const result = await this.projectManager.quickValidateProject(request.projectPath)
      return result
    })

    // 获取项目模板
    ipcMain.handle('project-mgmt:get-templates', async () => {
      const result = await this.projectManager.getTemplates()
      return result
    })

    // 检查是否可以初始化
    ipcMain.handle('project-mgmt:can-initialize', async (_event, request: IPCRequest<'project-mgmt:can-initialize'>) => {
      const result = await this.projectManager.canInitialize(request.directoryPath, request.templateId)
      return result
    })

    // 初始化现有目录
    ipcMain.handle('project-mgmt:initialize-existing', async (_event, request: IPCRequest<'project-mgmt:initialize-existing'>) => {
      const initOptions = {
        directoryPath: request.directoryPath,
        projectName: request.projectName,
        novelTitle: request.novelTitle,
        author: request.author,
        genre: request.genre,
        timestamp: request.timestamp
      }
      if (request.description) {
        Object.assign(initOptions, { description: request.description })
      }
      if (request.customConfig) {
        Object.assign(initOptions, { customConfig: request.customConfig })
      }
      const result = await this.projectManager.initializeExistingDirectory(initOptions)
      return result
    })

    // 修复项目
    ipcMain.handle('project-mgmt:repair', async (_event, request: IPCRequest<'project-mgmt:repair'>) => {
      const result = await this.projectManager.repairProject(request.projectPath)
      return result
    })

    // 获取项目统计
    ipcMain.handle('project-mgmt:get-stats', async (_event, request: IPCRequest<'project-mgmt:get-stats'>) => {
      const result = await this.projectManager.getProjectStats(request.projectPath)
      return result
    })

    logger.info('Project management IPC handlers registered')
  }

  /**
   * 从event.sender识别窗口并执行操作（推荐方式）
   */
  private handleWindowOperationFromEvent(
    event: Electron.IpcMainInvokeEvent,
    operation: 'minimize' | 'maximize' | 'unmaximize' | 'close' | 'focus',
    request: { windowId?: string }
  ): WindowOperationResult {
    const process = this.resolveWindowProcessFromEvent(event, request.windowId)
    if (!process) {
      return { success: false, error: 'Window not found' }
    }

    switch (operation) {
      case 'minimize':
        process.window.minimize()
        break
      case 'maximize':
        process.window.maximize()
        break
      case 'unmaximize':
        process.window.unmaximize()
        break
      case 'close':
        process.window.close()
        break
      case 'focus':
        process.window.focus()
        break
    }

    return { success: true }
  }

  /**
   * 旧版本：使用request.windowId识别窗口（保留用于兼容）
   */
  private handleWindowOperation(
    operation: 'minimize' | 'maximize' | 'unmaximize' | 'close' | 'focus',
    request: { windowId?: string }
  ): WindowOperationResult {
    const process = this.resolveWindowProcess(request.windowId)
    if (!process) {
      return { success: false, error: 'Window not found' }
    }

    switch (operation) {
      case 'minimize':
        process.window.minimize()
        break
      case 'maximize':
        process.window.maximize()
        break
      case 'unmaximize':
        process.window.unmaximize()
        break
      case 'close':
        process.window.close()
        break
      case 'focus':
        process.window.focus()
        break
    }

    return { success: true }
  }

  /**
   * 从event.sender识别窗口进程（推荐方式）
   * 优先使用windowId，如果没有则通过event.sender查找
   */
  private resolveWindowProcessFromEvent(
    event: Electron.IpcMainInvokeEvent,
    windowId?: string
  ): WindowProcess | null {
    if (!this.windowManager) return null

    // 如果提供了windowId，优先使用
    if (windowId) {
      return this.windowManager.getProcess(windowId)
    }

    // 从event.sender获取发送请求的窗口
    const senderWindow = BrowserWindow.fromWebContents(event.sender)
    if (!senderWindow) {
      return null
    }

    // 通过窗口ID查找对应的进程
    return this.windowManager.getProcessByWindowId(senderWindow.id)
  }

  /**
   * 旧版本：使用windowId识别窗口（保留用于兼容）
   */
  private resolveWindowProcess(windowId?: string): WindowProcess | null {
    if (!this.windowManager) return null
    if (!windowId) {
      return this.getMainProcess()
    }
    return this.windowManager.getProcess(windowId)
  }

  private getMainProcess(): MainWindowProcess | null {
    const direct = this.windowManager?.getMainProcess?.()
    const process = direct ?? this.windowManager?.getProcess('main')
    return process && process.type === 'main' ? process : null
  }

  private getProjectProcessByPath(projectPath: string): ProjectWindowProcess | null {
    if (!this.windowManager) return null
    const direct = this.windowManager.getProjectProcessByPath?.(projectPath)
    if (direct) {
      return direct
    }

    const process = this.windowManager.getProcess(projectPath)
    if (process && process.type === 'project' && process.projectPath === projectPath) {
      return process
    }

    return null
  }
}
