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

  // ==================== SearchAndScraper 批次管理 ====================

  /**
   * 创建新批次（简化版，不绑定URL）
   */
  createNovelBatch(data: {
    name: string
    description?: string
  }): string {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    
    this.execute(
      `INSERT INTO SearchAndScraper_novel_batch 
      (id, name, description) 
      VALUES (?, ?, ?)`,
      [batchId, data.name, data.description || null]
    )
    
    return batchId
  }

  /**
   * 获取所有批次（按更新时间倒序）
   */
  getAllNovelBatches(): Array<{
    id: string
    name: string
    description: string | null
    total_matched: number
    total_scraped: number
    created_at: string
    updated_at: string
  }> {
    return this.query(
      `SELECT * FROM SearchAndScraper_novel_batch 
       ORDER BY updated_at DESC`
    ) as Array<{
      id: string
      name: string
      description: string | null
      total_matched: number
      total_scraped: number
      created_at: string
      updated_at: string
    }>
  }

  /**
   * 获取批次详情
   */
  getNovelBatch(batchId: string): {
    id: string
    name: string
    description: string | null
    total_matched: number
    total_scraped: number
    created_at: string
    updated_at: string
  } | null {
    return this.queryOne(
      `SELECT * FROM SearchAndScraper_novel_batch WHERE id = ?`,
      [batchId]
    ) as {
      id: string
      name: string
      description: string | null
      total_matched: number
      total_scraped: number
      created_at: string
      updated_at: string
    } | null
  }

  /**
   * 更新批次统计信息
   */
  updateNovelBatchStats(batchId: string, stats: {
    totalMatched?: number
    totalScraped?: number
  }): void {
    const fields: string[] = []
    const values: unknown[] = []
    
    if (stats.totalMatched !== undefined) {
      fields.push('total_matched = ?')
      values.push(stats.totalMatched)
    }
    if (stats.totalScraped !== undefined) {
      fields.push('total_scraped = ?')
      values.push(stats.totalScraped)
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP')
    
    this.execute(
      `UPDATE SearchAndScraper_novel_batch 
       SET ${fields.join(', ')} 
       WHERE id = ?`,
      [...values, batchId]
    )
  }

  // ==================== 匹配章节管理 ====================

  /**
   * 保存匹配章节列表
   * @param batchId 批次ID
   * @param chapters 章节列表（title + url）
   * @param sourcePageUrl 可选的来源页面URL（用于提取域名）
   * @returns 保存后的完整章节数据（包含id）
   */
  saveMatchedChapters(
    batchId: string, 
    chapters: Array<{ title: string; url: string }>,
    sourcePageUrl?: string
  ): Array<{ id: string; title: string; url: string; chapterIndex: number }> {
    const savedChapters: Array<{ id: string; title: string; url: string; chapterIndex: number }> = []
    
    this.transaction(() => {
      // 1. 删除该批次的旧章节
      this.execute(
        'DELETE FROM SearchAndScraper_novel_matched_chapters WHERE batch_id = ?',
        [batchId]
      )

      // 2. 提取域名（如果提供了sourcePageUrl）
      let siteDomain: string | null = null
      if (sourcePageUrl) {
        try {
          const url = new URL(sourcePageUrl)
          siteDomain = url.hostname
        } catch (error) {
          console.warn('[ProjectDatabase] Invalid sourcePageUrl:', sourcePageUrl)
        }
      }

      // 3. 批量插入新章节
      const insertStmt = this.db?.prepare(
        `INSERT INTO SearchAndScraper_novel_matched_chapters 
         (id, batch_id, chapter_index, title, url, site_domain, is_selected) 
         VALUES (?, ?, ?, ?, ?, ?, 1)`
      )

      if (!insertStmt) {
        throw new Error('Failed to prepare insert statement')
      }

      chapters.forEach((chapter, index) => {
        const chapterId = `chapter_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 11)}`
        insertStmt.run(
          chapterId,
          batchId,
          index,
          chapter.title,
          chapter.url,
          siteDomain
        )
        
        // 收集保存后的章节数据
        savedChapters.push({
          id: chapterId,
          title: chapter.title,
          url: chapter.url,
          chapterIndex: index
        })
      })

      // 4. 更新批次统计
      this.updateNovelBatchStats(batchId, { totalMatched: chapters.length })
    })
    
    return savedChapters
  }

  /**
   * 获取批次的匹配章节列表
   * @param batchId 批次ID
   * @returns 按 chapter_index 排序的章节列表
   */
  getMatchedChapters(batchId: string): Array<{
    id: string
    batch_id: string
    chapter_index: number
    title: string
    url: string
    site_domain: string | null
    is_selected: number
    created_at: string
  }> {
    return this.query(
      `SELECT * FROM SearchAndScraper_novel_matched_chapters 
       WHERE batch_id = ? 
       ORDER BY chapter_index ASC`,
      [batchId]
    ) as Array<{
      id: string
      batch_id: string
      chapter_index: number
      title: string
      url: string
      site_domain: string | null
      is_selected: number
      created_at: string
    }>
  }

  /**
   * 切换单个章节的选中状态
   * @param chapterId 章节ID
   * @param selected 是否选中（true/false）
   */
  toggleChapterSelection(chapterId: string, selected: boolean): void {
    this.execute(
      'UPDATE SearchAndScraper_novel_matched_chapters SET is_selected = ? WHERE id = ?',
      [selected ? 1 : 0, chapterId]
    )
  }

  /**
   * 全选/取消全选批次内所有章节
   * @param batchId 批次ID
   * @param selected 是否选中（true/false）
   */
  toggleAllChaptersSelection(batchId: string, selected: boolean): void {
    this.execute(
      'UPDATE SearchAndScraper_novel_matched_chapters SET is_selected = ? WHERE batch_id = ?',
      [selected ? 1 : 0, batchId]
    )
  }

  /**
   * 从URL中提取域名
   * @param url 完整URL
   * @returns 域名或null
   */
  private extractDomain(url: string): string | null {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch {
      return null
    }
  }

  // ==================== 爬取章节管理（Iteration 3）====================

  /**
   * 保存爬取的章节
   * @param data 爬取数据
   */
  saveScrapedChapter(data: {
    matchedChapterId: string
    batchId: string
    title: string
    url: string
    content: string
    summary: string
    scrapeDuration: number
  }): void {
    const chapterId = `scraped_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    const wordCount = data.content.length

    // 事务处理
    this.transaction(() => {
      // 插入爬取章节
      this.execute(
        `INSERT INTO SearchAndScraper_novel_scraped_chapters 
        (id, batch_id, matched_chapter_id, title, url, content, summary, word_count, scrape_duration) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          chapterId,
          data.batchId,
          data.matchedChapterId,
          data.title,
          data.url,
          data.content,
          data.summary,
          wordCount,
          data.scrapeDuration
        ]
      )

      // 标记匹配章节为已爬取
      this.execute(
        'UPDATE SearchAndScraper_novel_matched_chapters SET is_scraped = 1 WHERE id = ?',
        [data.matchedChapterId]
      )

      // 更新批次统计
      const scrapedCount = this.queryOne(
        'SELECT COUNT(*) as count FROM SearchAndScraper_novel_scraped_chapters WHERE batch_id = ?',
        [data.batchId]
      ) as { count: number } | undefined

      if (scrapedCount) {
        this.updateNovelBatchStats(data.batchId, { totalScraped: scrapedCount.count })
      }
    })
  }

  /**
   * 获取批次的所有爬取章节
   * @param batchId 批次ID
   * @returns 爬取章节数组
   */
  getScrapedChapters(batchId: string): Array<{
    id: string
    batch_id: string
    matched_chapter_id: string
    title: string
    url: string
    content: string
    summary: string
    word_count: number
    scrape_duration: number
    created_at: string
  }> {
    return this.query(
      `SELECT * FROM SearchAndScraper_novel_scraped_chapters 
       WHERE batch_id = ? 
       ORDER BY created_at ASC`,
      [batchId]
    ) as Array<{
      id: string
      batch_id: string
      matched_chapter_id: string
      title: string
      url: string
      content: string
      summary: string
      word_count: number
      scrape_duration: number
      created_at: string
    }>
  }

  /**
   * 获取批次统计摘要
   * @param batchId 批次ID
   * @returns 统计摘要
   */
  getNovelBatchSummary(batchId: string): {
    totalMatched: number
    totalScraped: number
    totalWords: number
    avgScrapeDuration: number
  } {
    const result = this.queryOne(
      `SELECT 
        COUNT(DISTINCT mc.id) as total_matched,
        COUNT(DISTINCT sc.id) as total_scraped,
        COALESCE(SUM(sc.word_count), 0) as total_words,
        COALESCE(AVG(sc.scrape_duration), 0) as avg_scrape_duration
      FROM SearchAndScraper_novel_matched_chapters mc
      LEFT JOIN SearchAndScraper_novel_scraped_chapters sc ON mc.id = sc.matched_chapter_id
      WHERE mc.batch_id = ?`,
      [batchId]
    ) as {
      total_matched: number
      total_scraped: number
      total_words: number
      avg_scrape_duration: number
    } | undefined

    if (!result) {
      return {
        totalMatched: 0,
        totalScraped: 0,
        totalWords: 0,
        avgScrapeDuration: 0
      }
    }

    return {
      totalMatched: result.total_matched,
      totalScraped: result.total_scraped,
      totalWords: result.total_words,
      avgScrapeDuration: Math.round(result.avg_scrape_duration)
    }
  }
}

