/**
 * ProjectDatabase - 项目数据库操作类
 * 提供项目级数据库操作接口
 */

import type Database from 'better-sqlite3'
import type { DatabaseManager } from './database-manager'
import { CURRENT_PROJECT_SCHEMA_VERSION } from './schema/versions'
import type { SchemaDefinition } from './schema/base-schema'

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
   * 自动使用最新版本的Schema
   */
  async initialize(): Promise<void> {
    console.log('🚀 [ProjectDatabase] 初始化项目数据库:', this.projectPath)
    
    // 动态导入最新版本的Project Schema
    const latestSchema = await this.getLatestProjectSchema()
    console.log(`📦 [ProjectDatabase] 使用Schema版本: ${latestSchema.version}`)
    
    this.db = await this.databaseManager.createProjectDatabase(
      this.projectPath,
      latestSchema
    )

    console.log('✅ [ProjectDatabase] 项目数据库初始化成功')
  }

  /**
   * 获取最新版本的Project Schema
   */
  private async getLatestProjectSchema(): Promise<SchemaDefinition> {
    const version = CURRENT_PROJECT_SCHEMA_VERSION
    const versionKey = version.replace(/\./g, '_') // 1.2.4 -> 1_2_4
    const schemaName = `PROJECT_SCHEMA_V${versionKey}`
    
    try {
      const schemas = await import('./schema/versions')
      const schema = schemas[schemaName as keyof typeof schemas] as SchemaDefinition
      
      if (!schema) {
        throw new Error(`Schema ${schemaName} not found`)
      }
      
      return schema
    } catch (error) {
      console.error(`❌ [ProjectDatabase] 无法加载Schema ${schemaName}:`, error)
      throw error
    }
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

  // ========== LLM Chat 数据操作 ==========

  /**
   * 创建对话
   */
  async createConversation(conversation: {
    id: string
    title: string
    modelId: string
    settings: any
  }): Promise<void> {
    this.transaction(() => {
      // 插入对话
      this.execute(
        `INSERT INTO llm_conversations (id, title, model_id, settings_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          conversation.id,
          conversation.title,
          conversation.modelId,
          JSON.stringify(conversation.settings)
        ]
      )

      // 初始化统计
      this.execute(
        `INSERT INTO llm_conversation_stats (conversation_id, message_count, total_tokens, last_activity)
         VALUES (?, 0, 0, CURRENT_TIMESTAMP)`,
        [conversation.id]
      )
    })
  }

  /**
   * 获取所有对话（不包含消息）
   */
  async getConversations(): Promise<any[]> {
    const rows = this.query(`
      SELECT c.*, s.message_count, s.total_tokens, s.last_activity
      FROM llm_conversations c
      LEFT JOIN llm_conversation_stats s ON c.id = s.conversation_id
      ORDER BY c.updated_at DESC
    `) as Array<{
      id: string
      title: string
      model_id: string
      settings_json: string
      created_at: string
      updated_at: string
      message_count: number
      total_tokens: number
      last_activity: string
    }>

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      modelId: row.model_id,
      settings: JSON.parse(row.settings_json),
      // 返回毫秒时间戳，避免时区问题
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
      messageCount: row.message_count,
      totalTokens: row.total_tokens,
      lastActivity: row.last_activity ? new Date(row.last_activity).getTime() : null,
      messages: [] // 消息需要单独加载
    }))
  }

  /**
   * 获取单个对话（包含消息）
   */
  async getConversation(conversationId: string): Promise<any | null> {
    const conversation = this.queryOne(
      'SELECT * FROM llm_conversations WHERE id = ?',
      [conversationId]
    ) as {
      id: string
      title: string
      model_id: string
      settings_json: string
      created_at: string
      updated_at: string
    } | null

    if (!conversation) return null

    const messages = this.query(
      'SELECT * FROM llm_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    ) as Array<{
      id: string
      conversation_id: string
      role: 'system' | 'user' | 'assistant'
      content: string
      metadata_json?: string
      created_at: string
    }>

    return {
      id: conversation.id,
      title: conversation.title,
      modelId: conversation.model_id,
      settings: JSON.parse(conversation.settings_json),
      // 返回毫秒时间戳，避免时区问题
      createdAt: new Date(conversation.created_at).getTime(),
      updatedAt: new Date(conversation.updated_at).getTime(),
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        // 消息时间戳也返回毫秒
        timestamp: new Date(msg.created_at).getTime(),
        metadata: msg.metadata_json ? JSON.parse(msg.metadata_json) : undefined
      }))
    }
  }

  /**
   * 更新对话标题
   */
  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    this.execute(
      'UPDATE llm_conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, conversationId]
    )
  }

  /**
   * 更新对话设置
   */
  async updateConversationSettings(conversationId: string, settings: any): Promise<void> {
    this.execute(
      'UPDATE llm_conversations SET settings_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(settings), conversationId]
    )
  }

  /**
   * 删除对话
   */
  async deleteConversation(conversationId: string): Promise<void> {
    this.transaction(() => {
      // 删除消息（由于外键约束会自动删除）
      this.execute('DELETE FROM llm_messages WHERE conversation_id = ?', [conversationId])
      // 删除统计
      this.execute('DELETE FROM llm_conversation_stats WHERE conversation_id = ?', [conversationId])
      // 删除对话
      this.execute('DELETE FROM llm_conversations WHERE id = ?', [conversationId])
    })
  }

  /**
   * 添加消息
   */
  async addMessage(message: {
    id: string
    conversationId: string
    role: 'system' | 'user' | 'assistant'
    content: string
    metadata?: any
  }): Promise<void> {
    this.transaction(() => {
      // 插入消息
      this.execute(
        `INSERT INTO llm_messages (id, conversation_id, role, content, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          message.id,
          message.conversationId,
          message.role,
          message.content,
          message.metadata ? JSON.stringify(message.metadata) : null
        ]
      )

      // 更新对话的更新时间
      this.execute(
        'UPDATE llm_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [message.conversationId]
      )

      // 更新统计
      this.execute(
        `UPDATE llm_conversation_stats 
         SET message_count = message_count + 1, last_activity = CURRENT_TIMESTAMP 
         WHERE conversation_id = ?`,
        [message.conversationId]
      )
    })
  }

  /**
   * 删除消息
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    this.transaction(() => {
      this.execute('DELETE FROM llm_messages WHERE id = ? AND conversation_id = ?', [messageId, conversationId])
      
      // 更新统计
      this.execute(
        `UPDATE llm_conversation_stats 
         SET message_count = message_count - 1, last_activity = CURRENT_TIMESTAMP 
         WHERE conversation_id = ?`,
        [conversationId]
      )
    })
  }

  /**
   * 获取对话消息
   */
  async getConversationMessages(conversationId: string): Promise<any[]> {
    const messages = this.query(
      'SELECT * FROM llm_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    ) as Array<{
      id: string
      conversation_id: string
      role: 'system' | 'user' | 'assistant'
      content: string
      metadata_json?: string
      created_at: string
    }>

    return messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.created_at),
      metadata: msg.metadata_json ? JSON.parse(msg.metadata_json) : undefined
    }))
  }

  /**
   * 搜索对话（基础搜索）
   */
  async searchConversations(query: string): Promise<any[]> {
    if (!query.trim()) {
      return this.getConversations()
    }

    const searchPattern = `%${query}%`
    const rows = this.query(`
      SELECT DISTINCT c.*, s.message_count, s.total_tokens, s.last_activity
      FROM llm_conversations c
      LEFT JOIN llm_conversation_stats s ON c.id = s.conversation_id
      WHERE c.title LIKE ? OR c.model_id LIKE ?
      ORDER BY c.updated_at DESC
    `, [searchPattern, searchPattern]) as Array<{
      id: string
      title: string
      model_id: string
      settings_json: string
      created_at: string
      updated_at: string
      message_count: number
      total_tokens: number
      last_activity: string
    }>

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      modelId: row.model_id,
      settings: JSON.parse(row.settings_json),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      messageCount: row.message_count,
      totalTokens: row.total_tokens,
      lastActivity: new Date(row.last_activity),
      messages: []
    }))
  }
}

