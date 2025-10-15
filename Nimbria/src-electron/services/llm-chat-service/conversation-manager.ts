/**
 * 对话管理器 - 数据库版本
 * 负责对话的创建、删除、历史记录管理
 * 数据存储在项目数据库中
 */

import { nanoid } from 'nanoid'
import type { Conversation, ChatMessage, ConversationSettings } from './types'
import type { ProjectDatabase } from '../database-service/project-database'

export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map()
  private projectDatabase: ProjectDatabase | null = null

  /**
   * 设置项目数据库
   */
  setProjectDatabase(projectDatabase: ProjectDatabase): void {
    this.projectDatabase = projectDatabase
    console.log('✅ [ConversationManager] 项目数据库已设置')
  }

  /**
   * 初始化：从数据库加载对话
   */
  async initialize(): Promise<void> {
    if (!this.projectDatabase) {
      console.warn('⚠️ [ConversationManager] 项目数据库未设置，跳过初始化')
      return
    }

    try {
      console.log('🔄 [ConversationManager] 从数据库加载对话...')
      const conversations = await this.projectDatabase.getConversations()
      
      // 清空现有的对话
      this.conversations.clear()
      
      // 将加载的对话转换为 Map
      for (const conv of conversations) {
        this.conversations.set(conv.id, conv)
      }

      console.log(`✅ [ConversationManager] 加载了 ${this.conversations.size} 个对话`)
    } catch (error) {
      console.error('❌ [ConversationManager] 从数据库加载对话失败:', error)
    }
  }

  /**
   * 创建新对话
   */
  async createConversation(
    modelId: string,
    settings: ConversationSettings
  ): Promise<Conversation> {
    if (!this.projectDatabase) {
      throw new Error('Project database not available')
    }

    const conversation: Conversation = {
      id: nanoid(),
      title: '新对话',
      modelId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      settings
    }

    console.log('🆕 [ConversationManager] 创建新对话:', conversation.id)

    // 保存到数据库
    await this.projectDatabase.createConversation({
      id: conversation.id,
      title: conversation.title,
      modelId: conversation.modelId,
      settings: conversation.settings
    })

    this.conversations.set(conversation.id, conversation)
    return conversation
  }

  /**
   * 获取对话
   */
  getConversation(conversationId: string): Conversation | null {
    return this.conversations.get(conversationId) || null
  }

  /**
   * 获取所有对话列表
   */
  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values())
  }

  /**
   * 删除对话
   */
  async deleteConversation(conversationId: string): Promise<void> {
    if (!this.projectDatabase) {
      throw new Error('Project database not available')
    }

    console.log('🗑️ [ConversationManager] 删除对话:', conversationId)

    await this.projectDatabase.deleteConversation(conversationId)
    this.conversations.delete(conversationId)
  }

  /**
   * 添加消息到对话
   */
  async addMessage(
    conversationId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> {
    if (!this.projectDatabase) {
      throw new Error('Project database not available')
    }

    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    const newMessage: ChatMessage = {
      ...message,
      id: nanoid(),
      timestamp: new Date()
    }

    console.log('💬 [ConversationManager] 添加消息到对话:', conversationId)

    // 保存到数据库
    await this.projectDatabase.addMessage({
      id: newMessage.id,
      conversationId,
      role: newMessage.role,
      content: newMessage.content,
      metadata: newMessage.metadata
    })

    // 更新内存中的对话
    conversation.messages.push(newMessage)
    conversation.updatedAt = new Date()

    return newMessage
  }

  /**
   * 更新对话标题
   */
  async updateTitle(conversationId: string, title: string): Promise<void> {
    if (!this.projectDatabase) {
      throw new Error('Project database not available')
    }

    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    console.log('✏️ [ConversationManager] 更新对话标题:', conversationId, '->', title)

    await this.projectDatabase.updateConversationTitle(conversationId, title)
    
    conversation.title = title
    conversation.updatedAt = new Date()
  }

  /**
   * 更新对话设置
   */
  async updateSettings(
    conversationId: string,
    settings: Partial<ConversationSettings>
  ): Promise<void> {
    if (!this.projectDatabase) {
      throw new Error('Project database not available')
    }

    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    const newSettings = { ...conversation.settings, ...settings }
    
    console.log('⚙️ [ConversationManager] 更新对话设置:', conversationId)

    await this.projectDatabase.updateConversationSettings(conversationId, newSettings)
    
    conversation.settings = newSettings
    conversation.updatedAt = new Date()
  }

  /**
   * 删除指定消息
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    if (!this.projectDatabase) {
      throw new Error('Project database not available')
    }

    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    console.log('🗑️ [ConversationManager] 删除消息:', messageId)

    await this.projectDatabase.deleteMessage(conversationId, messageId)
    
    conversation.messages = conversation.messages.filter(msg => msg.id !== messageId)
    conversation.updatedAt = new Date()
  }

  /**
   * 清空对话消息
   */
  async clearMessages(conversationId: string): Promise<void> {
    if (!this.projectDatabase) {
      throw new Error('Project database not available')
    }

    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    console.log('🧹 [ConversationManager] 清空对话消息:', conversationId)

    // 删除所有消息
    for (const message of conversation.messages) {
      await this.projectDatabase.deleteMessage(conversationId, message.id)
    }

    conversation.messages = []
    conversation.updatedAt = new Date()
  }

  /**
   * 重新加载对话（从数据库）
   */
  async reloadConversation(conversationId: string): Promise<void> {
    if (!this.projectDatabase) {
      throw new Error('Project database not available')
    }

    console.log('🔄 [ConversationManager] 重新加载对话:', conversationId)

    const conversation = await this.projectDatabase.getConversation(conversationId)
    if (conversation) {
      this.conversations.set(conversationId, conversation)
    }
  }

  /**
   * 搜索对话
   */
  async searchConversations(query: string): Promise<Conversation[]> {
    if (!this.projectDatabase) {
      throw new Error('Project database not available')
    }

    console.log('🔍 [ConversationManager] 搜索对话:', query)

    return await this.projectDatabase.searchConversations(query)
  }
}
