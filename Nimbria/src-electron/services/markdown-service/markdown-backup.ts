/**
 * Markdown 备份管理器
 * 负责创建、管理和恢复 Markdown 文件的备份
 */

import * as fs from 'fs-extra'
import * as path from 'path'
import type { BackupInfo, FileOperationResult } from './types'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('MarkdownBackup')

export class MarkdownBackup {
  private readonly BACKUP_DIR = '.nimbria-backups'
  private readonly MAX_BACKUPS = 10

  /**
   * 创建文件备份
   */
  async createBackup(filePath: string): Promise<string> {
    try {
      logger.debug(`Creating backup for: ${filePath}`)

      // 检查文件是否存在
      if (!(await fs.pathExists(filePath))) {
        throw new Error(`File does not exist: ${filePath}`)
      }

      const dir = path.dirname(filePath)
      const fileName = path.basename(filePath)
      const backupDir = path.join(dir, this.BACKUP_DIR)

      // 确保备份目录存在
      await fs.ensureDir(backupDir)

      // 生成备份文件名
      const timestamp = Date.now()
      const backupFileName = `${fileName}.${timestamp}.bak`
      const backupPath = path.join(backupDir, backupFileName)

      // 复制文件到备份目录
      await fs.copy(filePath, backupPath)

      logger.info(`Backup created: ${backupPath}`)

      // 清理旧备份
      await this.cleanupOldBackups(filePath)

      return backupPath
    } catch (error) {
      logger.error(`Failed to create backup: ${filePath}`, error)
      throw error
    }
  }

  /**
   * 列出文件的所有备份
   */
  async listBackups(filePath: string): Promise<BackupInfo[]> {
    try {
      const dir = path.dirname(filePath)
      const fileName = path.basename(filePath)
      const backupDir = path.join(dir, this.BACKUP_DIR)

      // 检查备份目录是否存在
      if (!(await fs.pathExists(backupDir))) {
        return []
      }

      // 读取备份目录
      const entries = await fs.readdir(backupDir, { withFileTypes: true })

      // 过滤并解析备份文件
      const backups: BackupInfo[] = []

      for (const entry of entries) {
        if (!entry.isFile()) continue

        // 检查文件名是否匹配
        // 格式: filename.ext.timestamp.bak
        const regex = new RegExp(`^${this.escapeRegex(fileName)}\\.(\\d+)\\.bak$`)
        const match = entry.name.match(regex)

        if (match) {
          const timestamp = parseInt(match[1], 10)
          const backupPath = path.join(backupDir, entry.name)
          const stat = await fs.stat(backupPath)

          backups.push({
            path: backupPath,
            originalPath: filePath,
            timestamp,
            size: stat.size
          })
        }
      }

      // 按时间倒序排序（最新的在前）
      backups.sort((a, b) => b.timestamp - a.timestamp)

      logger.debug(`Found ${backups.length} backups for: ${filePath}`)

      return backups
    } catch (error) {
      logger.error(`Failed to list backups: ${filePath}`, error)
      return []
    }
  }

  /**
   * 恢复备份文件
   */
  async restoreBackup(backupPath: string): Promise<FileOperationResult> {
    try {
      logger.debug(`Restoring backup: ${backupPath}`)

      // 检查备份文件是否存在
      if (!(await fs.pathExists(backupPath))) {
        throw new Error(`Backup file does not exist: ${backupPath}`)
      }

      // 解析原文件路径
      const backupDir = path.dirname(backupPath)
      const backupFileName = path.basename(backupPath)

      // 去除 .timestamp.bak 后缀
      const match = backupFileName.match(/^(.+)\.\d+\.bak$/)
      if (!match) {
        throw new Error(`Invalid backup file name: ${backupFileName}`)
      }

      const originalFileName = match[1]
      const originalPath = path.join(path.dirname(backupDir), originalFileName)

      // 恢复文件（覆盖原文件）
      await fs.copy(backupPath, originalPath, { overwrite: true })

      logger.info(`Backup restored: ${backupPath} -> ${originalPath}`)

      return { success: true }
    } catch (error) {
      logger.error(`Failed to restore backup: ${backupPath}`, error)
      return {
        success: false,
        error: String(error)
      }
    }
  }

  /**
   * 清理旧备份（保留最新的 N 个）
   */
  async cleanupOldBackups(filePath: string): Promise<void> {
    try {
      const backups = await this.listBackups(filePath)

      // 如果备份数量未超过限制，无需清理
      if (backups.length <= this.MAX_BACKUPS) {
        return
      }

      // 删除超出数量的备份
      const toDelete = backups.slice(this.MAX_BACKUPS)

      logger.debug(`Cleaning up ${toDelete.length} old backups for: ${filePath}`)

      for (const backup of toDelete) {
        try {
          await fs.remove(backup.path)
          logger.debug(`Deleted old backup: ${backup.path}`)
        } catch (error) {
          logger.warn(`Failed to delete backup: ${backup.path}`, error)
        }
      }

      logger.info(`Cleanup completed: ${toDelete.length} old backups removed`)
    } catch (error) {
      logger.error(`Failed to cleanup backups: ${filePath}`, error)
    }
  }

  /**
   * 删除所有备份
   */
  async deleteAllBackups(filePath: string): Promise<FileOperationResult> {
    try {
      const backups = await this.listBackups(filePath)

      logger.info(`Deleting ${backups.length} backups for: ${filePath}`)

      for (const backup of backups) {
        await fs.remove(backup.path)
      }

      return { success: true }
    } catch (error) {
      logger.error(`Failed to delete all backups: ${filePath}`, error)
      return {
        success: false,
        error: String(error)
      }
    }
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

