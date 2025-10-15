/**
 * 对话管理器
 * 负责对话的创建、删除、历史记录管理
 * 数据存储在渲染进程的 LocalStorage 中（通过 IPC）
 */

import { nanoid } from 'nanoid'
import type { Conversation, ChatMessage, ConversationSettings, ConversationsStorage } from './types'

export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map()
  private storageCallback: ((data: ConversationsStorage) => Promise<void>) | null = null
  private loadCallback: (() => Promise<ConversationsStorage>) | null = null

  /**
   * 设置存储回调（用于与渲染进程的 LocalStorage 通信）
   */
  setStorageCallbacks(
    save: (data: ConversationsStorage) => Promise<void>,
    load: () => Promise<ConversationsStorage>
  ): void {
    this.storageCallback = save
    this.loadCallback = load
  }

  /**
   * 初始化：从 LocalStorage 加载对话
   */
  async initialize(): Promise<void> {
    if (!this.loadCallback) {
      console.warn('Storage load callback not set, skipping initialization')
      return
    }

    try {
      const data = await this.loadCallback()
      
      // 将加载的对话转换为 Map
      for (const conv of data.conversations) {
        // 转换日期字符串为 Date 对象
        conv.createdAt = new Date(conv.createdAt)
        conv.updatedAt = new Date(conv.updatedAt)
        conv.messages = conv.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        
        this.conversations.set(conv.id, conv)
      }

      console.log(`Loaded ${this.conversations.size} conversations from storage`)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  /**
   * 创建新对话
   */
  async createConversation(
    modelId: string,
    settings: ConversationSettings
  ): Promise<Conversation> {
    const conversation: Conversation = {
      id: nanoid(),
      title: '新对话',
      modelId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      settings
    }

    this.conversations.set(conversation.id, conversation)
    await this.saveToStorage()

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
    this.conversations.delete(conversationId)
    await this.saveToStorage()
  }

  /**
   * 添加消息到对话
   */
  async addMessage(
    conversationId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> {
    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    const newMessage: ChatMessage = {
      ...message,
      id: nanoid(),
      timestamp: new Date()
    }

    conversation.messages.push(newMessage)
    conversation.updatedAt = new Date()

    await this.saveToStorage()

    return newMessage
  }

  /**
   * 更新对话标题
   */
  async updateTitle(conversationId: string, title: string): Promise<void> {
    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    conversation.title = title
    conversation.updatedAt = new Date()

    await this.saveToStorage()
  }

  /**
   * 更新对话设置
   */
  async updateSettings(
    conversationId: string,
    settings: Partial<ConversationSettings>
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    conversation.settings = { ...conversation.settings, ...settings }
    conversation.updatedAt = new Date()

    await this.saveToStorage()
  }

  /**
   * 清空对话消息
   */
  async clearMessages(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    conversation.messages = []
    conversation.updatedAt = new Date()

    await this.saveToStorage()
  }

  /**
   * 删除指定消息
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    conversation.messages = conversation.messages.filter(msg => msg.id !== messageId)
    conversation.updatedAt = new Date()

    await this.saveToStorage()
  }

  /**
   * 保存到 LocalStorage
   */
  private async saveToStorage(): Promise<void> {
    if (!this.storageCallback) {
      console.warn('Storage save callback not set, skipping save')
      return
    }

    try {
      const data: ConversationsStorage = {
        conversations: Array.from(this.conversations.values())
      }

      await this.storageCallback(data)
    } catch (error) {
      console.error('Failed to save conversations:', error)
    }
  }
}

