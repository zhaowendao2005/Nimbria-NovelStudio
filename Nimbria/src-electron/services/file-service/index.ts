/**
 * 文件服务统一导出
 * 提供单例实例和类型定义
 */

import { FileManager } from './file-manager'
import { FileWatcherService } from './file-watcher'
import { ProjectFileSystem } from './project-fs'

// ==================== 单例实例 ====================

/**
 * 全局文件管理器实例
 */
export const fileManager = new FileManager()

/**
 * 全局文件监视服务实例
 */
export const fileWatcherService = new FileWatcherService()

// ==================== 导出类 ====================

export { FileManager, FileWatcherService, ProjectFileSystem }

// ==================== 导出类型 ====================

export * from './types'

