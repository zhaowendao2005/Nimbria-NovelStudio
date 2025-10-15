/**
 * ProjectDatabase - 项目数据库操作类
 * 提供项目级数据库操作接口
 */

import type Database from 'better-sqlite3'
import type { DatabaseManager } from './database-manager'
import { PROJECT_SCHEMA_V1_0_0 } from './schema/versions'

export class ProjectDatabase {
  private db: Database.Database | null = null
  private projectPath: string
  private databaseManager: DatabaseManager

  constructor(projectPath: string, databaseManager: DatabaseManager) {
    this.projectPath = projectPath
    this.databaseManager = databaseManager
  }

  /**
   * 初始化项目数据库
   */
  async initialize(): Promise<void> {
    console.log('🚀 [ProjectDatabase] 初始化项目数据库:', this.projectPath)
    
    this.db = await this.databaseManager.createProjectDatabase(
      this.projectPath,
      PROJECT_SCHEMA_V1_0_0
    )

    console.log('✅ [ProjectDatabase] 项目数据库初始化成功')
  }

  /**
   * 获取原始数据库连接
   */
  getRawConnection(): Database.Database {
    if (!this.db) {
      throw new Error('Project database not initialized')
    }
    return this.db
  }

  /**
   * 执行查询（返回多行）
   */
  query(sql: string, params: unknown[] = []): unknown[] {
    if (!this.db) {
      throw new Error('Project database not initialized')
    }
    return this.db.prepare(sql).all(...params)
  }

  /**
   * 执行查询（返回单行）
   */
  queryOne(sql: string, params: unknown[] = []): unknown | null {
    if (!this.db) {
      throw new Error('Project database not initialized')
    }
    return this.db.prepare(sql).get(...params) || null
  }

  /**
   * 执行SQL（INSERT/UPDATE/DELETE）
   */
  execute(sql: string, params: unknown[] = []): Database.RunResult {
    if (!this.db) {
      throw new Error('Project database not initialized')
    }
    return this.db.prepare(sql).run(...params)
  }

  /**
   * 事务执行
   */
  transaction<T>(fn: () => T): T {
    if (!this.db) {
      throw new Error('Project database not initialized')
    }
    return this.db.transaction(fn)()
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db) {
      console.log('🔒 [ProjectDatabase] 关闭项目数据库:', this.projectPath)
      this.db.close()
      this.db = null
    }
  }

  // ========== 业务操作方法（示例） ==========

  /**
   * 获取项目元数据
   */
  async getMetadata(key: string): Promise<string | null> {
    const result = this.queryOne(
      'SELECT value FROM project_metadata WHERE key = ?',
      [key]
    ) as { value: string } | null
    
    return result?.value || null
  }

  /**
   * 设置项目元数据
   */
  async setMetadata(key: string, value: string, type: string = 'string'): Promise<void> {
    this.execute(
      `INSERT OR REPLACE INTO project_metadata (key, value, type, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [key, value, type]
    )
  }

  /**
   * 获取所有文档
   */
  async getDocuments(): Promise<unknown[]> {
    return this.query('SELECT * FROM documents ORDER BY updated_at DESC')
  }

  /**
   * 获取项目统计
   */
  async getStats(): Promise<{
    totalDocuments: number
    totalChapters: number
    totalWords: number
  }> {
    const docCount = this.queryOne('SELECT COUNT(*) as count FROM documents') as { count: number }
    const chapterCount = this.queryOne('SELECT COUNT(*) as count FROM chapters') as { count: number }
    const wordCount = this.queryOne('SELECT SUM(word_count) as total FROM documents') as { total: number | null }

    return {
      totalDocuments: docCount.count,
      totalChapters: chapterCount.count,
      totalWords: wordCount.total || 0
    }
  }
}

