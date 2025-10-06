/**
 * Markdown 文件读取器
 * 负责读取 Markdown 文件内容，支持编码检测
 */

import fs from 'fs-extra'
import * as path from 'path'
import type { ReadOptions, FileOperationResult } from './types'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('MarkdownReader')

export class MarkdownReader {
  /**
   * 读取 Markdown 文件内容
   */
  async readMarkdownFile(
    filePath: string,
    options: ReadOptions = {}
  ): Promise<string> {
    try {
      const { encoding = 'utf-8' } = options

      logger.debug(`Reading file: ${filePath}`)

      // 检查文件是否存在
      if (!(await fs.pathExists(filePath))) {
        throw new Error(`File does not exist: ${filePath}`)
      }

      // 检查是否为文件
      const stat = await fs.stat(filePath)
      if (!stat.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`)
      }

      // 读取文件内容
      const content = await fs.readFile(filePath, encoding)

      logger.info(`File read successfully: ${filePath} (${stat.size} bytes)`)

      return content
    } catch (error) {
      logger.error(`Failed to read file: ${filePath}`, error)
      throw error
    }
  }

  /**
   * 批量读取多个 Markdown 文件
   */
  async batchReadFiles(
    filePaths: string[],
    options: ReadOptions = {}
  ): Promise<Array<{ path: string; content?: string; error?: string }>> {
    logger.info(`Batch reading ${filePaths.length} files`)

    const results = await Promise.allSettled(
      filePaths.map(async (filePath) => ({
        path: filePath,
        content: await this.readMarkdownFile(filePath, options)
      }))
    )

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          path: filePaths[index],
          error: String(result.reason)
        }
      }
    })
  }

  /**
   * 检查文件是否可读
   */
  async canRead(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fs.constants.R_OK)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(filePath: string): Promise<{
    size: number
    mtime: Date
    canRead: boolean
  } | null> {
    try {
      const stat = await fs.stat(filePath)
      const canRead = await this.canRead(filePath)

      return {
        size: stat.size,
        mtime: stat.mtime,
        canRead
      }
    } catch (error) {
      logger.error(`Failed to get file info: ${filePath}`, error)
      return null
    }
  }
}

