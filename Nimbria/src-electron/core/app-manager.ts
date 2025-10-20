import { app, ipcMain, dialog, BrowserWindow, type MessagePortMain } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDevEnvironment = !!process.env.DEV || !!process.env.DEBUGGING
const isDebugMode = !!process.env.ELECTRON_DEBUG

import type { WindowTemplate } from '../types/window'
import type { WindowProcess, ProjectWindowProcess, MainWindowProcess } from '../types/process'
import type { IPCRequest, IPCResponse, WindowOperationResult } from '../types/ipc'

import { WindowManager } from '../services/window-service/window-manager'
import { ProjectFileSystem } from '../services/file-service/project-fs'
import { FileWatcherService } from '../services/file-service/file-watcher'
import { ProjectManager } from '../services/project-service/project-manager'
import { getLogger, closeLogSystem, getLogFilePath } from '../utils/shared/logger'
import { getRecentProjects, upsertRecentProject, clearRecentProjects } from '../store/recent-projects-store'
import { registerMarkdownHandlers } from '../ipc/main-renderer/markdown-handlers'
import { registerFileHandlers } from '../ipc/main-renderer/file-handlers'
import { registerDocParserHandlers } from '../ipc/main-renderer/docParser-handlers'
import { registerLlmHandlers } from '../ipc/main-renderer/llm-handlers'
import { registerLlmChatHandlers } from '../ipc/main-renderer/llm-chat-handlers'
import { LlmConfigManager } from '../services/llm-service/llm-config-manager'
import { LlmChatService } from '../services/llm-chat-service/llm-chat-service'
import { ConversationManager } from '../services/llm-chat-service/conversation-manager'
import { ContextManager } from '../services/llm-chat-service/context-manager'
import { DatabaseService } from '../services/database-service/database-service'
import { registerDatabaseHandlers } from '../ipc/main-renderer/database-handlers'
import { StarChartService } from '../services/star-chart-service/star-chart-service'
import { registerStarChartHandlers } from '../ipc/main-renderer/star-chart-handlers'
import { LlmTranslateService } from '../services/llm-translate-service/llm-translate-service'
import { registerLlmTranslateHandlers } from '../ipc/main-renderer/llm-translate-handlers'
import { createApplicationMenu, setupContextMenu } from './menu'

const logger = getLogger('AppManager')

export class AppManager {
  private windowManager: WindowManager | null = null
  private mainProcess: WindowProcess | null = null
  private projectFileSystem!: ProjectFileSystem
  private fileWatcher!: FileWatcherService
  private projectManager!: ProjectManager
  private llmConfigManager!: LlmConfigManager
  private llmChatService!: LlmChatService
  private llmTranslateService!: LlmTranslateService
  private databaseService!: DatabaseService
  private starChartService!: StarChartService
  private transferMap?: Map<string, { sourceWebContentsId: number; tabId: string }>

  async boot() {
    logger.info('='.repeat(80))
    logger.info('Starting Nimbria application...')
    logger.info('Environment:', {
      isDev: isDevEnvironment,
      isDebug: isDebugMode,
      nodeEnv: process.env.NODE_ENV,
      appPath: app.getAppPath(),
      userDataPath: app.getPath('userData')
    })
    logger.info('Log file:', getLogFilePath())
    logger.info('='.repeat(80))
    
    await this.initializeDatabase()
    await this.initializeStarChart()
    this.initializeFileSystem()
    this.setupDatabaseEventListeners() // 添加数据库事件监听器
    this.initializeWindowManager()
    this.registerIpcHandlers()
    
    // 🔥 在调试模式下创建应用菜单
    if (isDebugMode) {
      createApplicationMenu(true)
      logger.info('Debug menu initialized')
    }
  }

  async shutdown() {
    logger.info('='.repeat(80))
    logger.info('Shutting down Nimbria application...')
    
    // 清理数据库服务
    if (this.databaseService) {
      await this.databaseService.cleanup()
    }
    
    // 清理 StarChart 服务
    if (this.starChartService) {
      await this.starChartService.cleanup()
    }
    
    if (this.projectFileSystem) {
      await this.projectFileSystem.cleanup()
    }
    
    logger.info('Application shutdown complete')
    logger.info('='.repeat(80))
    
    // 🔥 关闭日志系统
    closeLogSystem()
  }

  private initializeFileSystem() {
    this.projectFileSystem = new ProjectFileSystem()
    this.fileWatcher = new FileWatcherService()
    this.projectManager = new ProjectManager()
    this.llmConfigManager = new LlmConfigManager()
    
    // 初始化 LLM Chat 服务
    const conversationManager = new ConversationManager()
    const contextManager = new ContextManager()
    
    this.llmChatService = new LlmChatService(
      this.llmConfigManager,
      this.databaseService, // 传入数据库服务
      conversationManager,
      contextManager
    )
    
    // 异步初始化 LLM Chat 服务（不阻塞启动）
    void this.llmChatService.initialize().catch(error => {
      logger.error('Failed to initialize LLM Chat service:', error)
    })
    
    // 初始化 LLM Translate 服务
    this.llmTranslateService = new LlmTranslateService(this.llmChatService, this.llmConfigManager)
    logger.info('LLM Translate service initialized')
    
    logger.info('File system, file watcher, project management, LLM config, LLM chat and LLM translate services initialized')
  }

  /**
   * 初始化数据库服务
   */
  private async initializeDatabase() {
    logger.info('Initializing database service...')
    
    this.databaseService = new DatabaseService()
    
    // 调用初始化方法（会立即返回initId，通过事件反馈状态）
    const initId = await this.databaseService.initialize()
    
    logger.info('Database service initialization started, initId:', initId)
  }

  /**
   * 初始化 StarChart 服务
   */
  private async initializeStarChart() {
    logger.info('Initializing StarChart service...')
    
    this.starChartService = new StarChartService()
    
    // 调用初始化方法（会立即返回initId，通过事件反馈状态）
    const initId = await this.starChartService.initialize()
    
    logger.info('StarChart service initialization started, initId:', initId)
  }

  /**
   * 设置数据库事件监听器
   */
  private setupDatabaseEventListeners() {
    // 监听项目数据库创建完成事件
    this.databaseService.on('database:project-created', async (data) => {
      logger.info(`📢 [AppManager] 项目数据库创建完成: ${data.projectPath}`)
      
      // 通知 LLM Chat 服务切换项目
      if (this.llmChatService) {
        try {
          await this.llmChatService.switchProject(data.projectPath)
          logger.info(`✅ [AppManager] LLM Chat 服务已切换到项目: ${data.projectPath}`)
        } catch (error) {
          logger.error(`❌ [AppManager] LLM Chat 服务切换项目失败:`, error)
        }
      }
      
      // 初始化 LLM Translate 服务
      if (this.llmTranslateService) {
        try {
          const projectDb = this.databaseService.getProjectDatabase(data.projectPath)
          if (projectDb) {
            await this.llmTranslateService.initialize(data.projectPath, projectDb)
            logger.info(`✅ [AppManager] LLM Translate 服务已初始化: ${data.projectPath}`)
          }
        } catch (error) {
          logger.error(`❌ [AppManager] LLM Translate 服务初始化失败:`, error)
        }
      }
    })

    // 监听数据库错误事件
    this.databaseService.on('database:project-error', (data) => {
      logger.error(`❌ [AppManager] 项目数据库错误: ${data.projectPath}`, data.error)
    })

    logger.info('Database event listeners setup completed')
  }

  private initializeWindowManager() {
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

    const launch = () => {
      if (!this.windowManager) return
      this.mainProcess = this.windowManager.createMainWindow()
    }

    if (app.isReady()) {
      launch()
    } else {
      app.on('ready', () => {
        launch()
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
      windowProcess.window.webContents.openDevTools({ mode: 'detach' })
      return
    }

    // 🔥 修复生产环境路径问题
    // Electron 可以直接从 asar 中加载文件
    // app.asar 会被自动解压到内存中，所以直接使用 app.getAppPath() + 'index.html'
    const indexPath = path.join(app.getAppPath(), 'index.html')
    
    logger.info('Loading main window from:', indexPath)
    logger.info('Current __dirname:', __dirname)
    logger.info('App path:', app.getAppPath())
    logger.info('Is in asar:', __dirname.includes('app.asar'))
    logger.info('Debug mode:', isDebugMode)
    logger.info('Index.html exists (in asar):', fs.existsSync(indexPath))
    
    // 添加错误监听器
    windowProcess.window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      logger.error('Failed to load window:', { errorCode, errorDescription, validatedURL })
    })
    
    windowProcess.window.webContents.on('did-finish-load', () => {
      logger.info('Main window finished loading')
      // 🔥 调试模式下也开启 DevTools
      if (isDebugMode) {
        windowProcess.window.webContents.openDevTools({ mode: 'detach' })
        logger.info('DevTools opened in debug mode')
      }
    })
    
    windowProcess.window.webContents.on('dom-ready', () => {
      logger.info('DOM ready for main window')
    })
    
    // 🔥 F12快捷键现在由process-manager.ts统一处理
    
    // 🔥 在调试模式下添加右键菜单
    if (isDebugMode) {
      setupContextMenu(windowProcess.window, true)
    }
    
    void windowProcess.window.loadFile(indexPath)
  }

  private loadProjectWindow(windowProcess: WindowProcess) {
    if (isDevEnvironment) {
      const baseUrl = process.env.APP_URL
      if (baseUrl) {
        const projectUrl = `${baseUrl}#/project`  // 导航到项目页路由
        void windowProcess.window.loadURL(projectUrl)
      }
      windowProcess.window.webContents.openDevTools({ mode: 'detach' })
      return
    }

    // 🔥 修复生产环境路径问题（与主窗口逻辑一致）
    const indexPath = path.join(app.getAppPath(), 'index.html')
    
    logger.info('Loading project window from:', indexPath)
    logger.info('File exists (in asar):', fs.existsSync(indexPath))
    
    // 🔥 调试模式下自动打开 DevTools
    if (isDebugMode) {
      windowProcess.window.webContents.on('did-finish-load', () => {
        windowProcess.window.webContents.openDevTools({ mode: 'detach' })
        logger.info('DevTools opened for project window in debug mode')
      })
    }
    
    // 🔥 F12快捷键现在由process-manager.ts统一处理
    
    // 🔥 在调试模式下添加右键菜单
    if (isDebugMode) {
      setupContextMenu(windowProcess.window, true)
    }
    
    void windowProcess.window.loadFile(indexPath, {
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
      detachedWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
      // 🔥 修复生产环境路径问题（与主窗口逻辑一致）
      const indexPath = path.join(app.getAppPath(), 'index.html')
      logger.info('Loading detached window from:', indexPath)
      logger.info('File exists (in asar):', fs.existsSync(indexPath))
      
      // 🔥 调试模式下自动打开 DevTools
      if (isDebugMode) {
        detachedWindow.webContents.on('did-finish-load', () => {
          detachedWindow.webContents.openDevTools({ mode: 'detach' })
          logger.info('DevTools opened for detached window in debug mode')
        })
      }
      
      await detachedWindow.loadFile(indexPath, {
        hash: `/project-detached?${params.toString()}`
      })
    }

    // 🔥 为分离窗口也添加快捷键和右键菜单支持
    // 创建一个临时的 WindowProcess 对象用于设置快捷键
    const detachedProcess: ProjectWindowProcess = {
      id: config.transferId,
      type: 'project',
      window: detachedWindow,
      port: null as unknown as MessagePortMain, // 分离窗口不使用 MessagePort
      processId: detachedWindow.webContents.getProcessId(),
      projectPath: config.projectPath,
      createdAt: new Date(),
      lastActive: new Date()
    }
    // 🔥 分离窗口的F12功能需要单独设置（不通过process-manager）
    detachedWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') {
        if (detachedWindow.webContents.isDevToolsOpened()) {
          detachedWindow.webContents.closeDevTools()
        } else {
          detachedWindow.webContents.openDevTools({ mode: 'detach' })
        }
      }
    })
    if (isDebugMode) {
      setupContextMenu(detachedWindow, true)
    }

    logger.info('Detached window loaded:', config.transferId)

    return detachedWindow
  }


  /**
   * 解析 preload 脚本路径
   * 🔥 修复生产环境路径问题
   */
  private resolvePreloadPath(type: 'main' | 'project'): string {
    const preloadBaseName = type === 'main' ? 'main-preload' : 'project-preload'

    if (isDevEnvironment) {
      const devPath = path.join(app.getAppPath(), 'preload', `${preloadBaseName}.cjs`)
      logger.info(`Development preload path for ${type}:`, devPath)
      return devPath
    }

    // 🔥 生产环境路径修复
    const preloadFolder = process.env.QUASAR_ELECTRON_PRELOAD_FOLDER || 'electron-preload'
    const preloadExtension = process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION || '.cjs'
    const prodPath = path.join(app.getAppPath(), preloadFolder, `${preloadBaseName}${preloadExtension}`)
    
    logger.info(`Production preload path for ${type}:`, prodPath)
    logger.info('App path:', app.getAppPath())
    logger.info('Preload folder:', preloadFolder)
    logger.info('Preload extension:', preloadExtension)
    
    // 检查文件是否存在
    if (!fs.existsSync(prodPath)) {
      logger.error(`Preload script not found at: ${prodPath}`)
      // 尝试备用路径
      const altPath = path.join(__dirname, '../preload', `${preloadBaseName}${preloadExtension}`)
      logger.info(`Trying alternative preload path: ${altPath}`)
      if (fs.existsSync(altPath)) {
        return altPath
      } else {
        logger.error(`Alternative preload path also not found: ${altPath}`)
      }
    }

    return prodPath
  }

  private registerIpcHandlers() {
    // 注册 Markdown IPC 处理器
    registerMarkdownHandlers()
    logger.info('Markdown IPC handlers registered')
    
    // 注册文件/目录创建 IPC 处理器（传入依赖）
    registerFileHandlers({
      projectFileSystem: this.projectFileSystem,
      processManager: this.windowManager!.getProcessManager(),
      fileWatcher: this.fileWatcher
    })
    logger.info('File IPC handlers registered')
    
    // 注册 DocParser IPC 处理器
    registerDocParserHandlers()
    logger.info('DocParser IPC handlers registered')
    
    // 注册 LLM 配置 IPC 处理器
    registerLlmHandlers({
      llmConfigManager: this.llmConfigManager
    })
    logger.info('LLM IPC handlers registered')
    
    // 注册 LLM Chat IPC 处理器
    registerLlmChatHandlers(this.llmChatService)
    logger.info('LLM Chat IPC handlers registered')
    
    // 注册 LLM Translate IPC 处理器
    registerLlmTranslateHandlers(this.llmTranslateService)
    logger.info('LLM Translate IPC handlers registered')
    
    // 注册 Database IPC 处理器
    registerDatabaseHandlers(this.databaseService)
    logger.info('Database IPC handlers registered')
    
    // 注册 StarChart IPC 处理器
    registerStarChartHandlers(this.starChartService)
    logger.info('StarChart IPC handlers registered')

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

      const process = this.windowManager.createProjectWindow(request.projectPath)
      
      // 自动初始化项目文件系统上下文
      if (process.type === 'project') {
        this.projectFileSystem.initProject(process.projectPath, process.id)
        logger.info(`Auto-initialized project filesystem for ${process.projectPath}`)
        
        // ✅ 自动创建项目数据库
        const operationId = await this.databaseService.createProjectDatabase(process.projectPath)
        logger.info(`Auto-started project database creation, operationId: ${operationId}`)
        
        // ✅ 自动加载项目 StarChart（如果存在）
        const starChartPath = await this.starChartService.loadProjectStarChart(process.projectPath)
        if (starChartPath) {
          logger.info(`Auto-loaded StarChart for project: ${process.projectPath}`)
        }
        
        // 注意：LLM Chat 服务的项目切换将在数据库创建完成事件中处理
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
      clearRecentProjects()
      console.log('✅ [Electron Main] 最近项目列表已清空')
      return { success: true }
    })

    ipcMain.handle('window:show-main', () => {
      if (!this.windowManager) {
        return { success: false, error: 'Window manager not ready' }
      }

      let mainProcess = this.windowManager.getMainProcess()
      
      // 如果主窗口不存在，则创建它
      if (!mainProcess) {
        mainProcess = this.windowManager.createMainWindow()
        logger.info('Main window created from show-main request')
      }
      
      // 显示并聚焦主窗口
      if (mainProcess.window.isMinimized()) {
        mainProcess.window.restore()
      }
      mainProcess.window.show()
      mainProcess.window.focus()
      
      logger.info('Main window shown and focused')
      return { success: true }
    })

    // 🔥 标签页拆分到新窗口
    ipcMain.handle('project:detach-tab-to-window', async (event, payload: { 
      tabId: string
      tabData: {
        id: string
        title: string
        filePath: string
        content: string
        isDirty: boolean
      }
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
    ipcMain.handle('fs:project-init', (_event, request: IPCRequest<'fs:project-init'>) => {
      const result = this.projectFileSystem.initProject(request.projectPath, request.windowId)
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
