/**
 * DatabaseService - 数据库主服务类
 * 遵循事件驱动架构范式
 */

import { EventEmitter } from 'events'
import { DatabaseManager } from './database-manager'
import { ProjectDatabase } from './project-database'

// ========== 事件数据类型定义 ==========

export interface DatabaseInitEvent {
  initId: string
  success?: boolean
}

export interface DatabaseProjectCreatedEvent {
  operationId: string
  projectPath: string
  databasePath: string
}

export interface DatabaseErrorEvent {
  operationId?: string
  initId?: string
  migrationId?: string
  projectPath?: string
  error: string
}

export interface DatabaseServiceEvents {
  'database:init-start': DatabaseInitEvent
  'database:init-complete': DatabaseInitEvent
  'database:init-error': DatabaseErrorEvent
  'database:project-create-start': { operationId: string; projectPath: string }
  'database:project-created': DatabaseProjectCreatedEvent
  'database:project-error': DatabaseErrorEvent
}

// ========== DatabaseService类 ==========

export class DatabaseService extends EventEmitter {
  private databaseManager: DatabaseManager
  private projectDatabases: Map<string, ProjectDatabase> = new Map()
  private isInitialized = false

  constructor() {
    super()
    this.databaseManager = new DatabaseManager()
  }

  /**
   * ✅ 事件驱动方法：初始化全局数据库
   * 立即返回initId，通过事件反馈状态
   */
  async initialize(): Promise<string> {
    const initId = `init-${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    
    console.log('🎬 [DatabaseService] 开始初始化数据库服务...')
    
    // 立即发射开始事件
    this.emit('database:init-start', { initId } as DatabaseInitEvent)
    
    // 异步处理，不阻塞返回
    setImmediate(async () => {
      try {
        await this.databaseManager.initialize()
        
        this.isInitialized = true
        console.log('✅ [DatabaseService] 数据库服务初始化成功')
        
        this.emit('database:init-complete', { initId, success: true } as DatabaseInitEvent)
      } catch (error) {
        console.error('❌ [DatabaseService] 数据库服务初始化失败:', error)
        
        this.emit('database:init-error', { 
          initId, 
          error: error instanceof Error ? error.message : String(error) 
        } as DatabaseErrorEvent)
      }
    })
    
    return initId
  }

  /**
   * ✅ 事件驱动方法：创建项目数据库
   * 立即返回operationId，通过事件反馈状态
   */
  async createProjectDatabase(projectPath: string): Promise<string> {
    const operationId = `create-db-${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    
    console.log('🎬 [DatabaseService] 开始创建项目数据库:', projectPath)
    
    // 立即发射开始事件
    this.emit('database:project-create-start', { operationId, projectPath })
    
    // 异步处理
    setImmediate(async () => {
      try {
        if (!this.isInitialized) {
          throw new Error('Database service not initialized')
        }

        // 检查是否已存在
        if (this.projectDatabases.has(projectPath)) {
          console.log('ℹ️  [DatabaseService] 项目数据库已存在，跳过创建')
          
          const existingDb = this.projectDatabases.get(projectPath)!
          this.emit('database:project-created', {
            operationId,
            projectPath,
            databasePath: `${projectPath}/.Database/project.db`
          } as DatabaseProjectCreatedEvent)
          return
        }

        // 创建新的项目数据库
        const projectDb = new ProjectDatabase(projectPath, this.databaseManager)
        await projectDb.initialize()
        
        this.projectDatabases.set(projectPath, projectDb)
        
        console.log('✅ [DatabaseService] 项目数据库创建成功')
        
        this.emit('database:project-created', {
          operationId,
          projectPath,
          databasePath: `${projectPath}/.Database/project.db`
        } as DatabaseProjectCreatedEvent)
        
      } catch (error) {
        console.error('❌ [DatabaseService] 项目数据库创建失败:', error)
        
        this.emit('database:project-error', {
          operationId,
          projectPath,
          error: error instanceof Error ? error.message : String(error)
        } as DatabaseErrorEvent)
      }
    })
    
    return operationId
  }

  /**
   * 同步方法：获取项目数据库
   */
  getProjectDatabase(projectPath: string): ProjectDatabase | null {
    return this.projectDatabases.get(projectPath) || null
  }

  /**
   * 关闭项目数据库
   */
  async closeProjectDatabase(projectPath: string): Promise<void> {
    const projectDb = this.projectDatabases.get(projectPath)
    if (projectDb) {
      await projectDb.close()
      this.projectDatabases.delete(projectPath)
      console.log('🔒 [DatabaseService] 项目数据库已关闭:', projectPath)
    }
  }

  /**
   * 清理所有数据库连接
   */
  async cleanup(): Promise<void> {
    console.log('🧹 [DatabaseService] 开始清理数据库服务...')
    
    for (const [projectPath, projectDb] of this.projectDatabases) {
      await projectDb.close()
    }
    this.projectDatabases.clear()
    
    await this.databaseManager.cleanup()
    this.isInitialized = false
    
    console.log('✅ [DatabaseService] 数据库服务清理完成')
  }

  /**
   * 检查数据库服务是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized
  }
}

// ========== 类型增强 ==========

declare interface DatabaseService {
  on<K extends keyof DatabaseServiceEvents>(
    event: K, 
    listener: (data: DatabaseServiceEvents[K]) => void
  ): this
  
  emit<K extends keyof DatabaseServiceEvents>(
    event: K, 
    data: DatabaseServiceEvents[K]
  ): boolean
}

