/**
 * Markdown 文件读取器
 * 负责读取 Markdown 文件内容，支持编码检测和大文件优化
 */

import fs from 'fs-extra'
import type { ReadOptions } from './types'
import { getLogger } from '../../utils/shared/logger'
import { LargeFileReader, type LargeFileInfo } from './large-file-reader'

const logger = getLogger('MarkdownReader')

export class MarkdownReader {
  private largeFileReader = new LargeFileReader()

  /**
   * 读取 Markdown 文件内容（智能处理大文件）
   */
  async readMarkdownFile(
    filePath: string,
    options: ReadOptions = {}
  ): Promise<string> {
    try {
      const { encoding = 'utf-8', forceFullRead = false } = options

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

      // 🔥 检查是否为大文件
      const isLarge = await this.largeFileReader.isLargeFile(filePath)
      
      if (isLarge && !forceFullRead) {
        logger.warn(`Large file detected: ${filePath} (${stat.size} bytes), returning preview`)
        
        // 对于大文件，返回预览内容
        const preview = await this.largeFileReader.readPreview(filePath)
        return preview
      }

      // 小文件或强制完整读取
      const content = await fs.readFile(filePath, encoding)
      logger.info(`File read successfully: ${filePath} (${stat.size} bytes)`)

      return content
    } catch (error) {
      logger.error(`Failed to read file: ${filePath}`, error)
      throw error
    }
  }

  /**
   * 🔥 获取文件信息（包含大文件检测）
   */
  async getFileInfo(filePath: string): Promise<LargeFileInfo> {
    return this.largeFileReader.getFileInfo(filePath)
  }

  /**
   * 🔥 读取文件指定范围（按行号）
   */
  async readFileRange(filePath: string, startLine: number, endLine: number): Promise<string> {
    return this.largeFileReader.readRange(filePath, startLine, endLine)
  }

  /**
   * 🔥 在文件中搜索内容
   */
  async searchInFile(filePath: string, searchTerm: string, maxResults?: number) {
    return this.largeFileReader.searchInFile(filePath, searchTerm, maxResults)
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
    } catch {
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

