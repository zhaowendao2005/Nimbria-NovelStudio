/**
 * 核心文件管理器
 * 基于fs-extra提供文件系统操作，支持多项目隔离
 */

import fs from 'fs-extra'
import * as path from 'path'
import { lookup } from 'mime-types'
import fg from 'fast-glob'

import type {
  FileSystemItem,
  GlobOptions,
  FileOperationResult,
  ReadFileResult,
  ReadDirResult,
  GlobResult,
  ProjectFileContext
} from './types'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('FileManager')

export class FileManager {
  private projectContexts = new Map<string, ProjectFileContext>()

  /**
   * 初始化项目文件系统上下文
   */
  initProjectContext(projectPath: string, windowId: string): FileOperationResult {
    try {
      if (this.projectContexts.has(windowId)) {
        logger.warn(`Project context already exists for window ${windowId}`)
        return { success: true }
      }

      const context: ProjectFileContext = {
        projectPath: path.resolve(projectPath),
        windowId,
        watchers: new Map(),
        createdAt: new Date(),
        lastActive: new Date()
      }

      this.projectContexts.set(windowId, context)
      logger.info(`Initialized project context for ${projectPath} (window: ${windowId})`)
      
      return { success: true }
    } catch (error) {
      logger.error('Failed to initialize project context:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 清理项目上下文
   */
  cleanupProjectContext(windowId: string): FileOperationResult {
    try {
      const context = this.projectContexts.get(windowId)
      if (!context) {
        return { success: true }
      }

      // 清理所有监听器
      for (const [_, watcherInfo] of context.watchers) {
        watcherInfo.watcher.close()
      }
      context.watchers.clear()

      this.projectContexts.delete(windowId)
      logger.info(`Cleaned up project context for window ${windowId}`)
      
      return { success: true }
    } catch (error) {
      logger.error('Failed to cleanup project context:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 读取文件内容
   */
  async readFile(filePath: string, projectId?: string, encoding: BufferEncoding = 'utf8'): Promise<ReadFileResult> {
    try {
      const resolvedPath = this.resolvePath(filePath, projectId)
      if (!resolvedPath.success) {
        return resolvedPath
      }

      const content = await fs.readFile(resolvedPath.path!, encoding)
      
      this.updateLastActive(projectId)
      return { success: true, content }
    } catch (error) {
      logger.error(`Failed to read file ${filePath}:`, error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 写入文件内容
   */
  async writeFile(filePath: string, content: string, projectId?: string, encoding: BufferEncoding = 'utf8'): Promise<FileOperationResult> {
    try {
      const resolvedPath = this.resolvePath(filePath, projectId)
      if (!resolvedPath.success) {
        return resolvedPath
      }

      // 确保目录存在
      await fs.ensureDir(path.dirname(resolvedPath.path!))
      await fs.writeFile(resolvedPath.path!, content, encoding)
      
      this.updateLastActive(projectId)
      logger.debug(`File written: ${resolvedPath.path}`)
      return { success: true }
    } catch (error) {
      logger.error(`Failed to write file ${filePath}:`, error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 读取目录内容
   */
  async readDir(dirPath: string, projectId?: string): Promise<ReadDirResult> {
    try {
      const resolvedPath = this.resolvePath(dirPath, projectId)
      if (!resolvedPath.success) {
        return resolvedPath
      }

      const entries = await fs.readdir(resolvedPath.path!, { withFileTypes: true })
      const items: FileSystemItem[] = []

      for (const entry of entries) {
        const itemPath = path.join(resolvedPath.path!, entry.name)
        const stats = await fs.stat(itemPath)
        
        const item: FileSystemItem = {
          name: entry.name,
          path: path.relative(this.getProjectRoot(projectId) || '', itemPath),
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? stats.size : undefined,
          mtime: stats.mtime
        }

        if (entry.isFile()) {
          item.extension = path.extname(entry.name).slice(1)
          item.mimeType = lookup(entry.name) || undefined
        }

        items.push(item)
      }

      this.updateLastActive(projectId)
      return { success: true, items }
    } catch (error) {
      logger.error(`Failed to read directory ${dirPath}:`, error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 创建目录
   */
  async createDir(dirPath: string, projectId?: string): Promise<FileOperationResult> {
    try {
      const resolvedPath = this.resolvePath(dirPath, projectId)
      if (!resolvedPath.success) {
        return resolvedPath
      }

      await fs.ensureDir(resolvedPath.path!)
      
      this.updateLastActive(projectId)
      logger.debug(`Directory created: ${resolvedPath.path}`)
      return { success: true }
    } catch (error) {
      logger.error(`Failed to create directory ${dirPath}:`, error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 删除文件或目录
   */
  async delete(targetPath: string, projectId?: string, recursive = false): Promise<FileOperationResult> {
    try {
      const resolvedPath = this.resolvePath(targetPath, projectId)
      if (!resolvedPath.success) {
        return resolvedPath
      }

      if (recursive) {
        await fs.remove(resolvedPath.path!)
      } else {
        const stats = await fs.stat(resolvedPath.path!)
        if (stats.isDirectory()) {
          await fs.rmdir(resolvedPath.path!)
        } else {
          await fs.unlink(resolvedPath.path!)
        }
      }
      
      this.updateLastActive(projectId)
      logger.debug(`Deleted: ${resolvedPath.path}`)
      return { success: true }
    } catch (error) {
      logger.error(`Failed to delete ${targetPath}:`, error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 复制文件或目录
   */
  async copy(source: string, dest: string, projectId?: string): Promise<FileOperationResult> {
    try {
      const resolvedSource = this.resolvePath(source, projectId)
      const resolvedDest = this.resolvePath(dest, projectId)
      
      if (!resolvedSource.success) return resolvedSource
      if (!resolvedDest.success) return resolvedDest

      await fs.copy(resolvedSource.path!, resolvedDest.path!)
      
      this.updateLastActive(projectId)
      logger.debug(`Copied: ${resolvedSource.path} -> ${resolvedDest.path}`)
      return { success: true }
    } catch (error) {
      logger.error(`Failed to copy ${source} to ${dest}:`, error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 移动文件或目录
   */
  async move(source: string, dest: string, projectId?: string): Promise<FileOperationResult> {
    try {
      const resolvedSource = this.resolvePath(source, projectId)
      const resolvedDest = this.resolvePath(dest, projectId)
      
      if (!resolvedSource.success) return resolvedSource
      if (!resolvedDest.success) return resolvedDest

      await fs.move(resolvedSource.path!, resolvedDest.path!)
      
      this.updateLastActive(projectId)
      logger.debug(`Moved: ${resolvedSource.path} -> ${resolvedDest.path}`)
      return { success: true }
    } catch (error) {
      logger.error(`Failed to move ${source} to ${dest}:`, error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Glob文件搜索
   */
  async glob(pattern: string, projectId?: string, options: GlobOptions = {}): Promise<GlobResult> {
    try {
      const projectRoot = this.getProjectRoot(projectId)
      if (!projectRoot) {
        return { success: false, error: 'Project context not found' }
      }

      const globOptions = {
        cwd: projectRoot,
        absolute: false,
        ...options
      }

      const matches = await fg(pattern, globOptions)
      
      this.updateLastActive(projectId)
      return { success: true, matches }
    } catch (error) {
      logger.error(`Failed to glob pattern ${pattern}:`, error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 获取项目根目录
   */
  getProjectRoot(projectId?: string): string | null {
    if (!projectId) return null
    return this.projectContexts.get(projectId)?.projectPath || null
  }

  /**
   * 解析路径（确保在项目目录内）
   */
  private resolvePath(filePath: string, projectId?: string): { success: boolean; path?: string; error?: string } {
    try {
      const projectRoot = this.getProjectRoot(projectId)
      if (!projectRoot) {
        return { success: false, error: 'Project context not found' }
      }

      const resolvedPath = path.resolve(projectRoot, filePath)
      
      // 安全检查：确保路径在项目目录内
      if (!resolvedPath.startsWith(projectRoot)) {
        return { success: false, error: 'Path outside project directory' }
      }

      return { success: true, path: resolvedPath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * 更新项目上下文的最后活跃时间
   */
  private updateLastActive(projectId?: string): void {
    if (!projectId) return
    const context = this.projectContexts.get(projectId)
    if (context) {
      context.lastActive = new Date()
    }
  }
}
