import { app, ipcMain, dialog } from 'electron'
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
import { getLogger } from '../utils/shared/logger'
import { getRecentProjects, upsertRecentProject } from '../store/recent-projects-store'

const logger = getLogger('AppManager')

export class AppManager {
  private windowManager: WindowManager | null = null
  private mainProcess: WindowProcess | null = null
  private projectFileSystem: ProjectFileSystem

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
    logger.info('File system service initialized')
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
      const url = process.env.APP_URL as string
      void windowProcess.window.loadURL(url)
      windowProcess.window.webContents.openDevTools()
      return
    }

    void windowProcess.window.loadFile(path.join(__dirname, '../../index.html'))
  }

  private registerIpcHandlers() {
    ipcMain.handle('window:minimize', async (_event, request: IPCRequest<'window:minimize'>) => {
      return this.handleWindowOperation('minimize', request)
    })

    ipcMain.handle('window:maximize', async (_event, request: IPCRequest<'window:maximize'>) => {
      return this.handleWindowOperation('maximize', request)
    })

    ipcMain.handle('window:unmaximize', async (_event, request: IPCRequest<'window:unmaximize'>) => {
      return this.handleWindowOperation('unmaximize', request)
    })

    ipcMain.handle('window:close', async (_event, request: IPCRequest<'window:close'>) => {
      return this.handleWindowOperation('close', request)
    })

    ipcMain.handle('window:focus', async (_event, request: IPCRequest<'window:focus'>) => {
      return this.handleWindowOperation('focus', request)
    })

    ipcMain.handle('window:is-maximized', async (_event, request: IPCRequest<'window:is-maximized'>) => {
      const process = this.resolveWindowProcess(request.windowId)
      if (!process) {
        return { success: false, value: false }
      }

      return {
        success: true,
        value: process.window.isMaximized()
      }
    })

    ipcMain.handle('project:create-window', async (_event, request: IPCRequest<'project:create-window'>) => {
      if (!this.windowManager) {
        return { success: false, errorCode: 'window-manager-not-ready' }
      }

      const process = await this.windowManager.createProjectWindow(request.projectPath)
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

    ipcMain.handle('project:save', async (_event, request: IPCRequest<'project:save'>) => {
      logger.info('Project save requested', request.projectData.id)
      // TODO: 调用实际保存逻辑
      return { success: true } satisfies IPCResponse<'project:save'>
    })

    ipcMain.handle('project:get-recent', async () => {
      return getRecentProjects()
    })

    ipcMain.handle('project:update-recent', async (_event, payload: { projectPath: string; projectName?: string }) => {
      upsertRecentProject(payload.projectPath, payload.projectName)
      return { success: true }
    })

    ipcMain.handle('process:broadcast', async (_event, request: IPCRequest<'process:broadcast'>) => {
      this.windowManager?.broadcast(request.message)
      return undefined
    })

    // 文件对话框处理器
    ipcMain.handle('file:open-dialog', async (_event, request: IPCRequest<'file:open-dialog'>) => {
      const result = await dialog.showOpenDialog({
        title: request.title || '选择文件或文件夹',
        defaultPath: request.defaultPath,
        properties: request.properties,
        filters: request.filters
      })

      return {
        canceled: result.canceled,
        filePaths: result.filePaths
      } satisfies IPCResponse<'file:open-dialog'>
    })

    ipcMain.handle('file:save-dialog', async (_event, request: IPCRequest<'file:save-dialog'>) => {
      const result = await dialog.showSaveDialog({
        title: request.title || '保存文件',
        defaultPath: request.defaultPath,
        filters: request.filters
      })

      return {
        canceled: result.canceled,
        filePath: result.filePath
      } satisfies IPCResponse<'file:save-dialog'>
    })

    // 文件系统处理器
    this.registerFileSystemHandlers()
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
