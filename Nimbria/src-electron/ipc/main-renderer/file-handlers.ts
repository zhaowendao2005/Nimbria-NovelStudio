/**
 * 文件/目录创建 IPC Handlers
 */

import { ipcMain } from 'electron'
import { CHANNELS } from './channel-definitions'
import { fileManager } from '../../services/file-service'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('FileHandlers')

/**
 * 注册文件操作相关的 IPC handlers
 */
export function registerFileHandlers() {
  /**
   * 创建文件
   */
  ipcMain.handle(CHANNELS.FILE_CREATE, async (_event, filePath: string, initialContent = '') => {
    try {
      logger.info(`Creating file: ${filePath}`)
      const result = await fileManager.writeFile(filePath, initialContent, undefined, 'utf8')
      
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
  ipcMain.handle(CHANNELS.DIRECTORY_CREATE, async (_event, dirPath: string) => {
    try {
      logger.info(`Creating directory: ${dirPath}`)
      const result = await fileManager.createDir(dirPath)
      
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

