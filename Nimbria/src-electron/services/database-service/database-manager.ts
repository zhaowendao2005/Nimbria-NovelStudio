/**
 * DatabaseManager - 数据库连接管理器
 * 负责管理全局数据库和项目数据库的连接
 */

import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs-extra'
import type { SchemaDefinition } from './schema/base-schema'
import { CURRENT_GLOBAL_SCHEMA_VERSION, CURRENT_PROJECT_SCHEMA_VERSION } from './schema/versions'

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

      // ✅ 改进1：动态加载最新版本的全局Schema
      const latestSchema = await this.getLatestGlobalSchema()
      console.log(`📦 [DatabaseManager] 使用全局Schema版本: ${latestSchema.version}`)

      // ✅ 改进2：检查是否需要迁移（与项目数据库一致）
      const currentVersion = this.getCurrentVersion(this.globalDb)
      if (currentVersion && currentVersion !== latestSchema.version) {
        console.log(`🔄 [DatabaseManager] 检测到全局数据库版本差异: ${currentVersion} → ${latestSchema.version}`)
        await this.runMigrations(this.globalDb, currentVersion, latestSchema.version)
      } else if (!currentVersion) {
        // 新数据库，直接应用Schema
        await this.applySchema(this.globalDb, latestSchema)
      }

      // 更新版本信息
      await this.initializeVersionInfo(this.globalDb, latestSchema.version)

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

      // 检查是否需要迁移
      const currentVersion = this.getCurrentVersion(db)
      if (currentVersion && currentVersion !== schema.version) {
        console.log(`🔄 [DatabaseManager] 检测到版本差异: ${currentVersion} → ${schema.version}`)
        await this.runMigrations(db, currentVersion, schema.version)
      } else if (!currentVersion) {
        // 新数据库，直接应用Schema
        await this.applySchema(db, schema)
      }

      // 更新版本信息
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
   * 获取当前数据库版本
   */
  private getCurrentVersion(db: Database.Database): string | null {
    try {
      // 检查schema_version表是否存在
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'
      `).get()

      if (!tableExists) {
        return null
      }

      // 获取当前版本
      const row = db.prepare('SELECT version FROM schema_version WHERE id = 1').get() as { version: string } | undefined
      return row?.version || null
    } catch (error) {
      return null
    }
  }

  /**
   * ✅ 新增方法：获取最新版本的全局Schema
   */
  private async getLatestGlobalSchema(): Promise<SchemaDefinition> {
    const version = CURRENT_GLOBAL_SCHEMA_VERSION
    const versionKey = version.replace(/\./g, '_') // 1.2.4 -> 1_2_4
    const schemaName = `GLOBAL_SCHEMA_V${versionKey}`
    
    try {
      const schemas = await import('./schema/versions')
      const schema = schemas[schemaName as keyof typeof schemas] as SchemaDefinition
      
      if (!schema) {
        throw new Error(`Schema ${schemaName} not found`)
      }
      
      return schema
    } catch (error) {
      console.error(`❌ [DatabaseManager] 无法加载Schema ${schemaName}:`, error)
      throw error
    }
  }

  /**
   * 运行数据库迁移
   * 自动查找并执行迁移脚本
   */
  private async runMigrations(db: Database.Database, fromVersion: string, toVersion: string): Promise<void> {
    console.log(`🔄 [DatabaseManager] 开始迁移: ${fromVersion} → ${toVersion}`)

    try {
      // 尝试动态加载迁移脚本
      const migration = await this.loadMigrationScript(fromVersion, toVersion)
      
      if (migration) {
        console.log(`📝 [DatabaseManager] 执行迁移: ${migration.description}`)
        db.exec(migration.sql)
        console.log(`✅ [DatabaseManager] 迁移完成: ${fromVersion} → ${toVersion}`)
      } else {
        console.warn(`⚠️ [DatabaseManager] 未找到从 ${fromVersion} 到 ${toVersion} 的迁移脚本`)
        console.log(`📝 [DatabaseManager] 尝试直接应用最新Schema v${toVersion}`)
        
        // 加载目标版本的完整Schema
        const targetSchema = await this.loadSchemaByVersion(toVersion)
        await this.applySchema(db, targetSchema)
      }
    } catch (error) {
      console.error(`❌ [DatabaseManager] 迁移失败:`, error)
      throw error
    }
  }

  /**
   * 动态加载迁移脚本
   * 命名规范: MIGRATION_{from}_{to} (版本号中的点替换为下划线)
   * 例如: MIGRATION_1_2_3_TO_1_2_4
   */
  private async loadMigrationScript(fromVersion: string, toVersion: string): Promise<{ from: string; to: string; description: string; sql: string } | null> {
    try {
      // 转换版本号格式: 1.2.3 -> 1_2_3
      const fromKey = fromVersion.replace(/\./g, '_')
      const toKey = toVersion.replace(/\./g, '_')
      const migrationName = `MIGRATION_${fromKey}_TO_${toKey}`
      
      // 从统一的index.ts导入（支持esbuild打包）
      const schemas = await import('./schema/versions')
      const migration = schemas[migrationName as keyof typeof schemas]
      
      if (migration && typeof migration === 'object' && 'sql' in migration) {
        return migration as { from: string; to: string; description: string; sql: string }
      }
      
      return null
    } catch (error) {
      console.warn(`⚠️ [DatabaseManager] 加载迁移脚本失败 (${fromVersion} → ${toVersion}):`, error)
      return null
    }
  }

  /**
   * 根据版本号加载Schema
   * 命名规范: PROJECT_SCHEMA_V{version} (版本号中的点替换为下划线)
   * 例如: PROJECT_SCHEMA_V1_2_4
   */
  private async loadSchemaByVersion(version: string): Promise<SchemaDefinition> {
    const versionKey = version.replace(/\./g, '_')
    const schemaName = `PROJECT_SCHEMA_V${versionKey}`
    
    const schemas = await import('./schema/versions')
    const schema = schemas[schemaName as keyof typeof schemas] as SchemaDefinition
    
    if (!schema) {
      throw new Error(`Schema ${schemaName} not found`)
    }
    
    return schema
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

