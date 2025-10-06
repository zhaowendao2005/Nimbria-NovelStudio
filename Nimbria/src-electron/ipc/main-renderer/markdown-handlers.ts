/**
 * Markdown IPC Handlers
 * 注册 Markdown 相关的 IPC 处理器
 */

import { ipcMain } from 'electron'
import { CHANNELS } from './channel-definitions'
import { markdownService } from '../../services/markdown-service'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('MarkdownHandlers')

/**
 * 注册所有 Markdown IPC Handlers
 */
export function registerMarkdownHandlers() {
  logger.info('Registering Markdown IPC handlers')

  // 扫描文件树
  ipcMain.handle(CHANNELS.MARKDOWN_SCAN_TREE, async (_event, options) => {
    try {
      logger.debug('IPC: markdown:scanTree', options)
      const result = await markdownService.scanner.scanMarkdownTree(options)
      return { success: true, data: result }
    } catch (error) {
      logger.error('IPC: markdown:scanTree failed', error)
      return { success: false, error: String(error) }
    }
  })

  // 读取文件
  ipcMain.handle(CHANNELS.MARKDOWN_READ_FILE, async (_event, filePath: string) => {
    try {
      logger.debug('IPC: markdown:readFile', filePath)
      const content = await markdownService.reader.readMarkdownFile(filePath)
      return { success: true, data: content }
    } catch (error) {
      logger.error('IPC: markdown:readFile failed', error)
      return { success: false, error: String(error) }
    }
  })

  // 写入文件（使用保存队列）
  ipcMain.handle(
    CHANNELS.MARKDOWN_WRITE_FILE,
    async (_event, payload: { filePath: string; content: string; options?: any }) => {
      try {
        logger.debug('IPC: markdown:writeFile', payload.filePath)

        // 创建保存任务
        const task = {
          filePath: payload.filePath,
          content: payload.content,
          timestamp: Date.now(),
          createBackup: payload.options?.createBackup || false
        }

        // 加入队列
        const result = await markdownService.saveQueue.enqueue(task)

        return {
          success: result.success,
          error: result.error,
          data: result
        }
      } catch (error) {
        logger.error('IPC: markdown:writeFile failed', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 批量写入文件
  ipcMain.handle(
    CHANNELS.MARKDOWN_BATCH_WRITE,
    async (_event, files: Array<{ path: string; content: string }>) => {
      try {
        logger.debug('IPC: markdown:batchWrite', files.length, 'files')
        const result = await markdownService.writer.batchWriteFiles(files)
        return { success: result.success, data: result }
      } catch (error) {
        logger.error('IPC: markdown:batchWrite failed', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 创建备份
  ipcMain.handle(CHANNELS.MARKDOWN_CREATE_BACKUP, async (_event, filePath: string) => {
    try {
      logger.debug('IPC: markdown:createBackup', filePath)
      const backupPath = await markdownService.backup.createBackup(filePath)
      return { success: true, data: backupPath }
    } catch (error) {
      logger.error('IPC: markdown:createBackup failed', error)
      return { success: false, error: String(error) }
    }
  })

  // 列出备份
  ipcMain.handle(CHANNELS.MARKDOWN_LIST_BACKUPS, async (_event, filePath: string) => {
    try {
      logger.debug('IPC: markdown:listBackups', filePath)
      const backups = await markdownService.backup.listBackups(filePath)
      return { success: true, data: backups }
    } catch (error) {
      logger.error('IPC: markdown:listBackups failed', error)
      return { success: false, error: String(error) }
    }
  })

  // 恢复备份
  ipcMain.handle(CHANNELS.MARKDOWN_RESTORE_BACKUP, async (_event, backupPath: string) => {
    try {
      logger.debug('IPC: markdown:restoreBackup', backupPath)
      const result = await markdownService.backup.restoreBackup(backupPath)
      return result
    } catch (error) {
      logger.error('IPC: markdown:restoreBackup failed', error)
      return { success: false, error: String(error) }
    }
  })

  logger.info('Markdown IPC handlers registered successfully')
}

/**
 * 卸载所有 Markdown IPC Handlers
 */
export function unregisterMarkdownHandlers() {
  logger.info('Unregistering Markdown IPC handlers')

  ipcMain.removeHandler(CHANNELS.MARKDOWN_SCAN_TREE)
  ipcMain.removeHandler(CHANNELS.MARKDOWN_READ_FILE)
  ipcMain.removeHandler(CHANNELS.MARKDOWN_WRITE_FILE)
  ipcMain.removeHandler(CHANNELS.MARKDOWN_BATCH_WRITE)
  ipcMain.removeHandler(CHANNELS.MARKDOWN_CREATE_BACKUP)
  ipcMain.removeHandler(CHANNELS.MARKDOWN_LIST_BACKUPS)
  ipcMain.removeHandler(CHANNELS.MARKDOWN_RESTORE_BACKUP)

  logger.info('Markdown IPC handlers unregistered')
}

