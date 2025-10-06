/**
 * Markdown 文件树扫描器
 * 递归扫描项目目录，构建 Markdown 文件树结构
 */

import fs from 'fs-extra'
import * as path from 'path'
import { nanoid } from 'nanoid'
import type { MarkdownFile, MarkdownTreeOptions } from './types'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('MarkdownScanner')

export class MarkdownScanner {
  private readonly DEFAULT_EXCLUDE_DIRS = [
    'node_modules',
    '.git',
    '.vscode',
    '.idea',
    'dist',
    'build',
    '@.build',
    '.nimbria-backups'
  ]

  private readonly MARKDOWN_EXTENSIONS = ['.md', '.markdown']

  /**
   * 扫描项目目录，构建 Markdown 文件树
   */
  async scanMarkdownTree(options: MarkdownTreeOptions): Promise<MarkdownFile[]> {
    try {
      logger.debug('scanMarkdownTree called with options:', options)

      const { projectPath, excludeDirs = [], maxDepth = 10 } = options

      // 检查项目路径是否存在
      if (!(await fs.pathExists(projectPath))) {
        throw new Error(`Project path does not exist: ${projectPath}`)
      }

      // 检查是否为目录
      const stat = await fs.stat(projectPath)
      if (!stat.isDirectory()) {
        throw new Error(`Project path is not a directory: ${projectPath}`)
      }

      // 合并排除目录
      const allExcludeDirs = [
        ...this.DEFAULT_EXCLUDE_DIRS,
        ...excludeDirs
      ]

      logger.info(`Scanning markdown tree: ${projectPath}`)
      logger.debug(`Exclude dirs: ${allExcludeDirs.join(', ')}`)
      logger.debug(`Max depth: ${maxDepth}`)

      // 递归扫描
      const tree = await this.scanDirectory(
        projectPath,
        projectPath,
        allExcludeDirs,
        maxDepth,
        0
      )

      logger.info(`Scan completed: found ${this.countFiles(tree)} markdown files`)

      return tree
    } catch (error) {
      logger.error('Failed to scan markdown tree:', error)
      if (error instanceof Error && error.stack) {
        logger.error('MarkdownScanner stack trace:', error.stack)
      }
      throw error
    }
  }

  /**
   * 递归扫描目录
   */
  private async scanDirectory(
    basePath: string,
    currentPath: string,
    excludeDirs: string[],
    maxDepth: number,
    currentDepth: number
  ): Promise<MarkdownFile[]> {
    // 检查递归深度
    if (currentDepth >= maxDepth) {
      logger.warn(`Max depth reached at: ${currentPath}`)
      return []
    }

    const result: MarkdownFile[] = []

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name)
        const relativePath = path.relative(basePath, fullPath)

        // 检查是否应该排除
        if (excludeDirs.includes(entry.name)) {
          logger.debug(`Excluded: ${relativePath}`)
          continue
        }

        if (entry.isDirectory()) {
          // 递归扫描子目录
          const children = await this.scanDirectory(
            basePath,
            fullPath,
            excludeDirs,
            maxDepth,
            currentDepth + 1
          )

          // 只添加非空目录
          if (children.length > 0) {
            result.push({
              id: this.generateFileId(fullPath),
              name: entry.name,
              path: fullPath,
              isFolder: true,
              children
            })
          }
        } else if (entry.isFile()) {
          // 检查是否为 Markdown 文件
          const ext = path.extname(entry.name).toLowerCase()
          if (this.MARKDOWN_EXTENSIONS.includes(ext)) {
            const stat = await fs.stat(fullPath)

            result.push({
              id: this.generateFileId(fullPath),
              name: entry.name,
              path: fullPath,
              isFolder: false,
              metadata: {
                size: stat.size,
                mtime: stat.mtime
              }
            })
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to scan directory: ${currentPath}`, error)
      // 继续扫描其他目录
    }

    // 排序：文件夹在前，然后按名称排序
    result.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      return a.name.localeCompare(b.name, 'zh-CN')
    })

    return result
  }

  /**
   * 生成文件唯一ID
   */
  private generateFileId(): string {
    // 使用 nanoid 确保唯一性
    return `md-${nanoid(10)}`
  }

  /**
   * 统计文件树中的文件数量
   */
  private countFiles(tree: MarkdownFile[]): number {
    let count = 0
    for (const node of tree) {
      if (node.isFolder) {
        count += this.countFiles(node.children || [])
      } else {
        count++
      }
    }
    return count
  }

  /**
   * 查找特定文件
   */
  async findFile(
    projectPath: string,
    targetPath: string
  ): Promise<MarkdownFile | null> {
    try {
      const stat = await fs.stat(targetPath)
      
      if (!stat.isFile()) {
        return null
      }

      const ext = path.extname(targetPath).toLowerCase()
      if (!this.MARKDOWN_EXTENSIONS.includes(ext)) {
        return null
      }

      return {
        id: this.generateFileId(targetPath),
        name: path.basename(targetPath),
        path: targetPath,
        isFolder: false,
        metadata: {
          size: stat.size,
          mtime: stat.mtime
        }
      }
    } catch (error) {
      logger.error(`Failed to find file: ${targetPath}`, error)
      return null
    }
  }
}

