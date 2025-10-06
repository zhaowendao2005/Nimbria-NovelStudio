/**
 * 文件/目录创建 IPC Handlers
 */

import { ipcMain, BrowserWindow } from 'electron'
import * as path from 'path'
import { CHANNELS } from './channel-definitions'
import type { ProjectFileSystem } from '../../services/file-service/project-fs'
import type { ProcessManager } from '../../services/window-service/process-manager'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('FileHandlers')

/**
 * 注册文件操作相关的 IPC handlers
 */
export function registerFileHandlers(deps: {
  projectFileSystem: ProjectFileSystem
  processManager: ProcessManager
}) {
  /**
   * 创建文件
   */
  ipcMain.handle(CHANNELS.FILE_CREATE, async (event, filePath: string, initialContent = '') => {
    try {
      logger.info(`Creating file: ${filePath}`)
      
      // 1. 从 event 获取 BrowserWindow
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) {
        logger.error('Window not found')
        return { success: false, error: 'Window not found' }
      }
      
      // 2. 找到对应的 WindowProcess
      const windowProcess = deps.processManager.getProcessByWindowId(window.id)
      if (!windowProcess || windowProcess.type !== 'project') {
        logger.error('Not a project window')
        return { success: false, error: 'Not a project window' }
      }
      
      // 3. 获取项目路径和 windowId
      const projectPath = windowProcess.projectPath
      const windowId = windowProcess.id
      
      // 4. 转换绝对路径为相对路径
      const relativePath = path.relative(projectPath, filePath)
      
      // 5. 安全检查：确保文件在项目目录内
      if (relativePath.startsWith('..')) {
        logger.error(`File path outside project directory: ${filePath}`)
        return { success: false, error: 'File path outside project directory' }
      }
      
      // 6. 使用 ProjectFileSystem 创建文件
      const result = await deps.projectFileSystem.writeFile(
        relativePath, 
        initialContent, 
        windowId, 
        'utf8'
      )
      
      if (result.success) {
        logger.info(`File created successfully: ${filePath}`)
      } else {
        logger.error(`Failed to create file: ${result.error}`)
      }
      
      return result
    } catch (error) {
      logger.error('File creation error:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  })
  
  /**
   * 创建目录
   */
  ipcMain.handle(CHANNELS.DIRECTORY_CREATE, async (event, dirPath: string) => {
    try {
      logger.info(`Creating directory: ${dirPath}`)
      
      // 1. 从 event 获取 BrowserWindow
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) {
        logger.error('Window not found')
        return { success: false, error: 'Window not found' }
      }
      
      // 2. 找到对应的 WindowProcess
      const windowProcess = deps.processManager.getProcessByWindowId(window.id)
      if (!windowProcess || windowProcess.type !== 'project') {
        logger.error('Not a project window')
        return { success: false, error: 'Not a project window' }
      }
      
      // 3. 获取项目路径和 windowId
      const projectPath = windowProcess.projectPath
      const windowId = windowProcess.id
      
      // 4. 转换绝对路径为相对路径
      const relativePath = path.relative(projectPath, dirPath)
      
      // 5. 安全检查：确保目录在项目目录内
      if (relativePath.startsWith('..')) {
        logger.error(`Directory path outside project directory: ${dirPath}`)
        return { success: false, error: 'Directory path outside project directory' }
      }
      
      // 6. 使用 ProjectFileSystem 创建目录
      const result = await deps.projectFileSystem.createDir(
        relativePath, 
        windowId
      )
      
      if (result.success) {
        logger.info(`Directory created successfully: ${dirPath}`)
      } else {
        logger.error(`Failed to create directory: ${result.error}`)
      }
      
      return result
    } catch (error) {
      logger.error('Directory creation error:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  })
  
  logger.info('File handlers registered')
}

