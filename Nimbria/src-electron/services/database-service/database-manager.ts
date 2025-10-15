/**
 * DatabaseManager - 数据库连接管理器
 * 负责管理全局数据库和项目数据库的连接
 */

import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs-extra'
import type { SchemaDefinition } from './schema/base-schema'
import { GLOBAL_SCHEMA_V1_0_0 } from './schema/versions'

export class DatabaseManager {
  private globalDb: Database.Database | null = null
  private projectDbs: Map<string, Database.Database> = new Map()
  private globalDbPath: string

  constructor() {
    // 全局数据库路径：用户数据目录/.Database/nimbria.db
    const userDataPath = app.getPath('userData')
    this.globalDbPath = path.join(userDataPath, '.Database', 'nimbria.db')
  }

  /**
   * 初始化全局数据库
   */
  async initialize(): Promise<void> {
    try {
      console.log('📦 [DatabaseManager] 初始化全局数据库...')
      console.log('📍 [DatabaseManager] 全局数据库路径:', this.globalDbPath)

      // 确保目录存在
      await fs.ensureDir(path.dirname(this.globalDbPath))

      // 创建数据库连接
      this.globalDb = new Database(this.globalDbPath, {
        verbose: (message) => {
          console.log('🔍 [SQLite]', message)
        }
      })

      // 配置WAL模式
      this.configureDatabase(this.globalDb)

      // 应用Schema
      await this.applySchema(this.globalDb, GLOBAL_SCHEMA_V1_0_0)

      // 初始化版本信息
      await this.initializeVersionInfo(this.globalDb, GLOBAL_SCHEMA_V1_0_0.version)

      console.log('✅ [DatabaseManager] 全局数据库初始化成功')
    } catch (error) {
      console.error('❌ [DatabaseManager] 全局数据库初始化失败:', error)
      throw error
    }
  }

  /**
   * 创建项目数据库
   */
  async createProjectDatabase(projectPath: string, schema: SchemaDefinition): Promise<Database.Database> {
    try {
      console.log('📦 [DatabaseManager] 创建项目数据库...')
      console.log('📍 [DatabaseManager] 项目路径:', projectPath)

      // 数据库文件路径：项目根目录/.Database/project.db
      const dbDir = path.join(projectPath, '.Database')
      const dbPath = path.join(dbDir, 'project.db')

      // 确保目录存在
      await fs.ensureDir(dbDir)
      console.log('📁 [DatabaseManager] 创建数据库目录:', dbDir)

      // 创建数据库连接
      const db = new Database(dbPath, {
        verbose: (message) => {
          console.log(`🔍 [SQLite:${path.basename(projectPath)}]`, message)
        }
      })

      // 配置WAL模式
      this.configureDatabase(db)

      // 应用Schema
      await this.applySchema(db, schema)

      // 初始化版本信息
      await this.initializeVersionInfo(db, schema.version)

      // 缓存连接
      this.projectDbs.set(projectPath, db)

      console.log('✅ [DatabaseManager] 项目数据库创建成功:', dbPath)
      return db
    } catch (error) {
      console.error('❌ [DatabaseManager] 项目数据库创建失败:', error)
      throw error
    }
  }

  /**
   * 获取全局数据库
   */
  getGlobalDatabase(): Database.Database {
    if (!this.globalDb) {
      throw new Error('Global database not initialized')
    }
    return this.globalDb
  }

  /**
   * 获取项目数据库
   */
  getProjectDatabase(projectPath: string): Database.Database | null {
    return this.projectDbs.get(projectPath) || null
  }

  /**
   * 关闭项目数据库
   */
  closeProjectDatabase(projectPath: string): void {
    const db = this.projectDbs.get(projectPath)
    if (db) {
      console.log('🔒 [DatabaseManager] 关闭项目数据库:', projectPath)
      db.close()
      this.projectDbs.delete(projectPath)
    }
  }

  /**
   * 清理所有数据库连接
   */
  async cleanup(): Promise<void> {
    console.log('🧹 [DatabaseManager] 清理数据库连接...')

    // 关闭所有项目数据库
    for (const [projectPath, db] of this.projectDbs) {
      console.log('🔒 [DatabaseManager] 关闭项目数据库:', projectPath)
      db.close()
    }
    this.projectDbs.clear()

    // 关闭全局数据库
    if (this.globalDb) {
      console.log('🔒 [DatabaseManager] 关闭全局数据库')
      this.globalDb.close()
      this.globalDb = null
    }

    console.log('✅ [DatabaseManager] 数据库连接清理完成')
  }

  /**
   * 配置数据库（WAL模式等）
   */
  private configureDatabase(db: Database.Database): void {
    console.log('⚙️  [DatabaseManager] 配置数据库优化选项...')
    
    // 启用WAL模式
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    db.pragma('cache_size = 1000')
    db.pragma('temp_store = memory')
    db.pragma('mmap_size = 268435456') // 256MB

    // 启用外键约束
    db.pragma('foreign_keys = ON')

    console.log('✅ [DatabaseManager] 数据库配置完成')
  }

  /**
   * 应用Schema到数据库
   */
  private async applySchema(db: Database.Database, schema: SchemaDefinition): Promise<void> {
    console.log(`📝 [DatabaseManager] 应用Schema v${schema.version}...`)

    db.transaction(() => {
      for (const table of schema.tables) {
        console.log(`  ├─ 创建表: ${table.name}`)
        
        // 创建表
        db.exec(table.sql)

        // 创建索引
        if (table.indexes) {
          for (const index of table.indexes) {
            db.exec(index)
          }
          console.log(`  │  └─ 创建 ${table.indexes.length} 个索引`)
        }
      }
    })()

    console.log('✅ [DatabaseManager] Schema应用完成')
  }

  /**
   * 初始化版本信息
   */
  private async initializeVersionInfo(db: Database.Database, version: string): Promise<void> {
    // 创建schema_version表（如果不存在）
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        description TEXT
      )
    `)

    // 插入或更新版本信息
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO schema_version (id, version, applied_at)
      VALUES (1, ?, CURRENT_TIMESTAMP)
    `)
    stmt.run(version)

    console.log(`📌 [DatabaseManager] 设置Schema版本: v${version}`)
  }
}

