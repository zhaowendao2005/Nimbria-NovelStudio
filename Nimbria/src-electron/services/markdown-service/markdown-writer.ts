/**
 * Markdown 文件写入器
 * 负责安全地写入 Markdown 文件，支持原子性操作和备份
 */

import fs from 'fs-extra'
import * as path from 'path'
import type { WriteOptions, FileOperationResult, BatchSaveResult } from './types'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('MarkdownWriter')

export class MarkdownWriter {
  /**
   * 写入 Markdown 文件（原子性操作）
   */
  async writeMarkdownFile(
    filePath: string,
    content: string,
    options: WriteOptions = {}
  ): Promise<FileOperationResult> {
    const {
      createBackup = false,
      encoding = 'utf-8',
      verifyWrite = true
    } = options

    const absolutePath = path.resolve(filePath)
    const tempPath = `${absolutePath}.tmp.${Date.now()}`
    const backupPath = createBackup
      ? `${absolutePath}.bak.${Date.now()}`
      : null

    try {
      logger.debug(`Writing file: ${absolutePath}`)

      // 步骤1：确保目录存在
      await fs.ensureDir(path.dirname(absolutePath))

      // 步骤2：备份原文件（如果需要且文件存在）
      if (backupPath && (await fs.pathExists(absolutePath))) {
        logger.debug(`Creating backup: ${backupPath}`)
        await fs.copy(absolutePath, backupPath)
      }

      // 步骤3：写入临时文件
      await fs.writeFile(tempPath, content, encoding)

      // 步骤4：验证写入（可选）
      if (verifyWrite) {
        const written = await fs.readFile(tempPath, encoding)
        if (written !== content) {
          throw new Error('Write verification failed: content mismatch')
        }
      }

      // 步骤5：原子性重命名（覆盖原文件）
      await fs.rename(tempPath, absolutePath)

      logger.info(`File written successfully: ${absolutePath} (${content.length} chars)`)

      // 清理备份（如果写入成功）
      if (backupPath && (await fs.pathExists(backupPath))) {
        await fs.remove(backupPath)
      }

      return { success: true }
    } catch (error) {
      logger.error(`Failed to write file: ${absolutePath}`, error)

      // 回滚：删除临时文件
      if (await fs.pathExists(tempPath)) {
        await fs.remove(tempPath).catch(() => {})
      }

      // 恢复备份（如果存在）
      if (backupPath && (await fs.pathExists(backupPath))) {
        try {
          await fs.copy(backupPath, absolutePath)
          await fs.remove(backupPath)
          logger.info('Backup restored after write failure')
        } catch (restoreError) {
          logger.error('Failed to restore backup:', restoreError)
        }
      }

      return {
        success: false,
        error: String(error)
      }
    }
  }

  /**
   * 批量写入多个 Markdown 文件（事务性）
   */
  async batchWriteFiles(
    files: Array<{ path: string; content: string }>,
    options: WriteOptions = {}
  ): Promise<BatchSaveResult> {
    logger.info(`Batch writing ${files.length} files`)

    const tempFiles: Array<{ original: string; temp: string }> = []
    const errors: Array<{ filePath: string; error: string }> = []

    try {
      // 阶段1：写入所有临时文件
      for (const file of files) {
        try {
          const absolutePath = path.resolve(file.path)
          const tempPath = `${absolutePath}.tmp.${Date.now()}`

          // 确保目录存在
          await fs.ensureDir(path.dirname(absolutePath))

          // 写入临时文件
          await fs.writeFile(tempPath, file.content, options.encoding || 'utf-8')

          // 验证写入
          if (options.verifyWrite !== false) {
            const written = await fs.readFile(tempPath, options.encoding || 'utf-8')
            if (written !== file.content) {
              throw new Error('Write verification failed')
            }
          }

          tempFiles.push({ original: absolutePath, temp: tempPath })
        } catch (error) {
          errors.push({
            filePath: file.path,
            error: String(error)
          })
        }
      }

      // 阶段2：原子性重命名所有文件
      for (const { original, temp } of tempFiles) {
        try {
          await fs.rename(temp, original)
        } catch (error) {
          errors.push({
            filePath: original,
            error: String(error)
          })
        }
      }

      const successCount = files.length - errors.length
      logger.info(`Batch write completed: ${successCount}/${files.length} succeeded`)

      return {
        success: errors.length === 0,
        totalCount: files.length,
        successCount,
        failedCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      logger.error('Batch write failed:', error)

      // 回滚：清理所有临时文件
      for (const { temp } of tempFiles) {
        await fs.remove(temp).catch(() => {})
      }

      return {
        success: false,
        totalCount: files.length,
        successCount: 0,
        failedCount: files.length,
        errors: [{ filePath: 'batch', error: String(error) }]
      }
    }
  }

  /**
   * 检查文件是否可写
   */
  async canWrite(filePath: string): Promise<boolean> {
    try {
      // 如果文件存在，检查写权限
      if (await fs.pathExists(filePath)) {
        await fs.access(filePath, fs.constants.W_OK)
        return true
      }

      // 如果文件不存在，检查目录写权限
      const dirPath = path.dirname(filePath)
      await fs.access(dirPath, fs.constants.W_OK)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 安全删除文件
   */
  async deleteFile(filePath: string): Promise<FileOperationResult> {
    try {
      logger.debug(`Deleting file: ${filePath}`)

      if (!(await fs.pathExists(filePath))) {
        return { success: true } // 文件已不存在
      }

      await fs.remove(filePath)

      logger.info(`File deleted: ${filePath}`)

      return { success: true }
    } catch (error) {
      logger.error(`Failed to delete file: ${filePath}`, error)
      return {
        success: false,
        error: String(error)
      }
    }
  }
}

