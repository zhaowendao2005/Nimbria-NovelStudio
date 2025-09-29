/**
 * 文件监听服务
 * 基于chokidar提供跨平台文件监听功能
 */

import chokidar, { FSWatcher } from 'chokidar'
import { nanoid } from 'nanoid'

import type {
  WatchOptions,
  FileWatcherInfo,
  WatchResult,
  FileOperationResult,
  FileChangeEvent
} from './types'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('FileWatcher')

export class FileWatcherService {
  private watchers = new Map<string, FileWatcherInfo>()
  private eventHandlers = new Set<(event: FileChangeEvent) => void>()

  /**
   * 开始监听文件/目录
   */
  async startWatch(watchPath: string, projectId?: string, options: WatchOptions = {}): Promise<WatchResult> {
    try {
      const watcherId = nanoid()
      
      const chokidarOptions = {
        persistent: true,
        ignoreInitial: false,
        followSymlinks: true,
        ...options
      }

      const watcher = chokidar.watch(watchPath, chokidarOptions)
      
      // 设置事件监听器
      this.setupWatcherEvents(watcher, watcherId, projectId)

      const watcherInfo: FileWatcherInfo = {
        id: watcherId,
        path: watchPath,
        options,
        watcher,
        projectId
      }

      this.watchers.set(watcherId, watcherInfo)
      
      // 等待watcher就绪
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Watcher initialization timeout'))
        }, 5000)

        watcher.on('ready', () => {
          clearTimeout(timeout)
          resolve()
        })

        watcher.on('error', (error) => {
          clearTimeout(timeout)
          reject(error)
        })
      })

      logger.info(`Started watching: ${watchPath} (ID: ${watcherId})`)
      return { success: true, watcherId }
    } catch (error) {
      logger.error(`Failed to start watching ${watchPath}:`, error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 停止监听
   */
  async stopWatch(watcherId: string): Promise<FileOperationResult> {
    try {
      const watcherInfo = this.watchers.get(watcherId)
      if (!watcherInfo) {
        return { success: false, error: 'Watcher not found' }
      }

      await watcherInfo.watcher.close()
      this.watchers.delete(watcherId)
      
      logger.info(`Stopped watching: ${watcherInfo.path} (ID: ${watcherId})`)
      return { success: true }
    } catch (error) {
      logger.error(`Failed to stop watching ${watcherId}:`, error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 停止项目的所有监听器
   */
  async stopProjectWatchers(projectId: string): Promise<FileOperationResult> {
    try {
      const projectWatchers = Array.from(this.watchers.values())
        .filter(w => w.projectId === projectId)

      for (const watcherInfo of projectWatchers) {
        await this.stopWatch(watcherInfo.id)
      }

      logger.info(`Stopped all watchers for project: ${projectId}`)
      return { success: true }
    } catch (error) {
      logger.error(`Failed to stop project watchers for ${projectId}:`, error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 获取监听器信息
   */
  getWatcherInfo(watcherId: string): FileWatcherInfo | null {
    return this.watchers.get(watcherId) || null
  }

  /**
   * 获取所有监听器
   */
  getAllWatchers(): FileWatcherInfo[] {
    return Array.from(this.watchers.values())
  }

  /**
   * 获取项目的监听器
   */
  getProjectWatchers(projectId: string): FileWatcherInfo[] {
    return Array.from(this.watchers.values())
      .filter(w => w.projectId === projectId)
  }

  /**
   * 添加事件处理器
   */
  addEventHandler(handler: (event: FileChangeEvent) => void): void {
    this.eventHandlers.add(handler)
  }

  /**
   * 移除事件处理器
   */
  removeEventHandler(handler: (event: FileChangeEvent) => void): void {
    this.eventHandlers.delete(handler)
  }

  /**
   * 清理所有监听器
   */
  async cleanup(): Promise<void> {
    const watcherIds = Array.from(this.watchers.keys())
    
    for (const watcherId of watcherIds) {
      await this.stopWatch(watcherId)
    }

    this.eventHandlers.clear()
    logger.info('FileWatcherService cleanup completed')
  }

  /**
   * 设置监听器事件
   */
  private setupWatcherEvents(watcher: FSWatcher, watcherId: string, projectId?: string): void {
    const emitEvent = (type: FileChangeEvent['type'], path: string, stats?: any) => {
      const event: FileChangeEvent = {
        type,
        path,
        projectId,
        stats: stats ? {
          size: stats.size,
          mtime: stats.mtime
        } : undefined
      }

      // 广播事件给所有处理器
      for (const handler of this.eventHandlers) {
        try {
          handler(event)
        } catch (error) {
          logger.error('Event handler error:', error)
        }
      }
    }

    watcher.on('add', (path, stats) => {
      logger.debug(`File added: ${path}`)
      emitEvent('add', path, stats)
    })

    watcher.on('change', (path, stats) => {
      logger.debug(`File changed: ${path}`)
      emitEvent('change', path, stats)
    })

    watcher.on('unlink', (path) => {
      logger.debug(`File removed: ${path}`)
      emitEvent('unlink', path)
    })

    watcher.on('addDir', (path, stats) => {
      logger.debug(`Directory added: ${path}`)
      emitEvent('addDir', path, stats)
    })

    watcher.on('unlinkDir', (path) => {
      logger.debug(`Directory removed: ${path}`)
      emitEvent('unlinkDir', path)
    })

    watcher.on('error', (error) => {
      logger.error(`Watcher error (${watcherId}):`, error)
    })

    watcher.on('ready', () => {
      logger.debug(`Watcher ready (${watcherId})`)
    })
  }
}
