/**
 * 项目级文件系统管理器
 * 整合文件管理和监听功能，提供项目级的文件系统服务
 */

import { FileManager } from './file-manager'
import { FileWatcherService } from './file-watcher'

import type {
  GlobOptions,
  WatchOptions,
  FileOperationResult,
  ReadFileResult,
  ReadDirResult,
  GlobResult,
  WatchResult,
  FileChangeEvent
} from './types'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('ProjectFileSystem')

export class ProjectFileSystem {
  private fileManager: FileManager
  private watcherService: FileWatcherService
  private eventBroadcaster?: (event: FileChangeEvent) => void

  constructor() {
    this.fileManager = new FileManager()
    this.watcherService = new FileWatcherService()
    
    // 设置文件变化事件处理
    this.watcherService.addEventHandler(this.handleFileChangeEvent.bind(this))
  }

  /**
   * 初始化项目
   */
  async initProject(projectPath: string, windowId: string): Promise<FileOperationResult> {
    try {
      const result = this.fileManager.initProjectContext(projectPath, windowId)
      if (!result.success) {
        return result
      }

      logger.info(`Project filesystem initialized: ${projectPath} (window: ${windowId})`)
      return { success: true }
    } catch (error) {
      logger.error('Failed to initialize project filesystem:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 清理项目
   */
  async cleanupProject(windowId: string): Promise<FileOperationResult> {
    try {
      // 停止项目相关的所有监听器
      await this.watcherService.stopProjectWatchers(windowId)
      
      // 清理文件管理器上下文
      const result = this.fileManager.cleanupProjectContext(windowId)
      
      logger.info(`Project filesystem cleaned up: ${windowId}`)
      return result
    } catch (error) {
      logger.error('Failed to cleanup project filesystem:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 读取文件
   */
  async readFile(path: string, projectId?: string, encoding?: BufferEncoding): Promise<ReadFileResult> {
    return this.fileManager.readFile(path, projectId, encoding)
  }

  /**
   * 写入文件
   */
  async writeFile(path: string, content: string, projectId?: string, encoding?: BufferEncoding): Promise<FileOperationResult> {
    return this.fileManager.writeFile(path, content, projectId, encoding)
  }

  /**
   * 读取目录
   */
  async readDir(path: string, projectId?: string): Promise<ReadDirResult> {
    return this.fileManager.readDir(path, projectId)
  }

  /**
   * 创建目录
   */
  async createDir(path: string, projectId?: string): Promise<FileOperationResult> {
    return this.fileManager.createDir(path, projectId)
  }

  /**
   * 删除文件或目录
   */
  async delete(path: string, projectId?: string, recursive?: boolean): Promise<FileOperationResult> {
    return this.fileManager.delete(path, projectId, recursive)
  }

  /**
   * 复制文件或目录
   */
  async copy(source: string, dest: string, projectId?: string): Promise<FileOperationResult> {
    return this.fileManager.copy(source, dest, projectId)
  }

  /**
   * 移动文件或目录
   */
  async move(source: string, dest: string, projectId?: string): Promise<FileOperationResult> {
    return this.fileManager.move(source, dest, projectId)
  }

  /**
   * Glob搜索
   */
  async glob(pattern: string, projectId?: string, options?: GlobOptions): Promise<GlobResult> {
    return this.fileManager.glob(pattern, projectId, options)
  }

  /**
   * 开始监听
   */
  async startWatch(path: string, projectId?: string, options?: WatchOptions): Promise<WatchResult> {
    return this.watcherService.startWatch(path, projectId, options)
  }

  /**
   * 停止监听
   */
  async stopWatch(watcherId: string): Promise<FileOperationResult> {
    return this.watcherService.stopWatch(watcherId)
  }

  /**
   * 获取项目根目录
   */
  getProjectRoot(projectId?: string): string | null {
    return this.fileManager.getProjectRoot(projectId)
  }

  /**
   * 获取项目的所有监听器
   */
  getProjectWatchers(projectId: string) {
    return this.watcherService.getProjectWatchers(projectId)
  }

  /**
   * 设置事件广播器
   */
  setEventBroadcaster(broadcaster: (event: FileChangeEvent) => void): void {
    this.eventBroadcaster = broadcaster
  }

  /**
   * 清理所有资源
   */
  async cleanup(): Promise<void> {
    await this.watcherService.cleanup()
    logger.info('ProjectFileSystem cleanup completed')
  }

  /**
   * 处理文件变化事件
   */
  private handleFileChangeEvent(event: FileChangeEvent): void {
    logger.debug('File change event:', event.type, event.path)
    
    // 广播事件到渲染进程
    if (this.eventBroadcaster) {
      this.eventBroadcaster(event)
    }
  }
}
