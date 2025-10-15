/**
 * LLM Chat 主服务类
 * 协调各个组件，提供统一的服务接口
 * 使用 EventEmitter 实现事件驱动架构
 */

import { EventEmitter } from 'events'
import { LangChainClient } from './langchain-client'
import { ConversationManager } from './conversation-manager'
import { ContextManager } from './context-manager'
import type {
  Conversation,
  ConversationSettings,
  LangChainClientConfig,
  ChatMessage,
  MessageStartEvent,
  MessageChunkEvent,
  MessageCompleteEvent,
  MessageErrorEvent
} from './types'
import type { ModelConfig, ModelProvider } from '../llm-service/types'

export class LlmChatService extends EventEmitter {
  private conversationManager: ConversationManager
  private contextManager: ContextManager
  private activeClients: Map<string, LangChainClient> = new Map()
  private llmConfigManager: any // LlmConfigManager 的引用
  private databaseService: any // DatabaseService 的引用

  constructor(
    llmConfigManager: any,
    databaseService: any, // 新增数据库服务依赖
    conversationManager: ConversationManager,
    contextManager: ContextManager
  ) {
    super()
    this.llmConfigManager = llmConfigManager
    this.databaseService = databaseService
    this.conversationManager = conversationManager
    this.contextManager = contextManager
  }

  /**
   * 初始化服务
   */
  async initialize(projectPath?: string): Promise<void> {
    console.log('🚀 [LlmChatService] 初始化服务...')
    
    // 如果有项目路径，设置项目数据库
    if (projectPath && this.databaseService) {
      const projectDb = this.databaseService.getProjectDatabase(projectPath)
      if (projectDb) {
        this.conversationManager.setProjectDatabase(projectDb)
        console.log('✅ [LlmChatService] 已设置项目数据库')
      } else {
        console.warn('⚠️ [LlmChatService] 项目数据库未找到，将创建')
        // 触发创建项目数据库
        await this.databaseService.createProjectDatabase(projectPath)
        // 等待数据库创建完成后再设置
        const newProjectDb = this.databaseService.getProjectDatabase(projectPath)
        if (newProjectDb) {
          this.conversationManager.setProjectDatabase(newProjectDb)
        }
      }
    }

    // 从数据库加载对话
    await this.conversationManager.initialize()

    console.log('✅ [LlmChatService] 服务初始化完成')
  }

  /**
   * 切换项目（重要：当用户切换项目时调用）
   */
  async switchProject(projectPath: string): Promise<void> {
    console.log('🔄 [LlmChatService] 切换项目到:', projectPath)
    
    // 清理当前状态
    this.activeClients.clear()
    
    // 设置新的项目数据库
    const projectDb = this.databaseService.getProjectDatabase(projectPath)
    if (projectDb) {
      this.conversationManager.setProjectDatabase(projectDb)
      await this.conversationManager.initialize()
    } else {
      console.warn('⚠️ [LlmChatService] 项目数据库未找到，等待创建...')
    }
  }

  /**
   * 创建新对话
   */
  async createConversation(
    modelId: string,
    userSettings?: Partial<ConversationSettings>
  ): Promise<Conversation> {
    // 获取模型配置
    const modelConfig = await this.getModelConfig(modelId)

    // 从 ModelConfig 继承默认设置
    const defaultSettings: ConversationSettings = {
      temperature: 0.7,
      maxTokens: modelConfig.maxTokens,
      contextWindow: modelConfig.contextLength,
      timeout: modelConfig.timeout,
      maxRetries: modelConfig.maxRetries,
      completionMode: modelConfig.completionMode,
      systemPrompt: undefined
    }

    // 用户设置覆盖默认设置
    const finalSettings = { ...defaultSettings, ...userSettings }

    return this.conversationManager.createConversation(modelId, finalSettings)
  }

  /**
   * 发送消息（流式，立即返回 messageId）
   */
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<string> {
    const conversation = this.conversationManager.getConversation(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    // 立即生成 messageId
    const aiMessageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    // 添加用户消息
    await this.conversationManager.addMessage(conversationId, {
      role: 'user',
      content
    })

    // 发送开始事件
    this.emit('message:start', {
      conversationId,
      messageId: aiMessageId
    } as MessageStartEvent)

    // 异步处理流式响应（不阻塞返回）
    this.processStreamAsync(conversationId, aiMessageId, content)

    return aiMessageId
  }

  /**
   * 重新生成最后一条消息
   */
  async regenerateLastMessage(conversationId: string): Promise<string> {
    const conversation = this.conversationManager.getConversation(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    // 找到最后一条 assistant 消息并删除
    const messages = conversation.messages
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        await this.conversationManager.deleteMessage(conversationId, messages[i].id)
        break
      }
    }

    // 找到最后一条 user 消息
    let lastUserMessage = ''
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessage = messages[i].content
        break
      }
    }

    if (!lastUserMessage) {
      throw new Error('No user message found to regenerate')
    }

    // 调用 sendMessage（会自动触发事件）
    return this.sendMessage(conversationId, lastUserMessage)
  }

  /**
   * 删除消息
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await this.conversationManager.deleteMessage(conversationId, messageId)
  }

  /**
   * 获取对话列表
   */
  getConversations(): Conversation[] {
    return this.conversationManager.getAllConversations()
  }

  /**
   * 获取单个对话
   */
  getConversation(conversationId: string): Conversation | null {
    return this.conversationManager.getConversation(conversationId)
  }

  /**
   * 删除对话
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await this.conversationManager.deleteConversation(conversationId)
    
    // 清理相关的客户端缓存
    const conversation = this.conversationManager.getConversation(conversationId)
    if (conversation) {
      this.activeClients.delete(conversation.modelId)
    }
  }

  /**
   * 更新对话设置
   */
  async updateConversationSettings(
    conversationId: string,
    settings: Partial<ConversationSettings>
  ): Promise<void> {
    await this.conversationManager.updateSettings(conversationId, settings)
  }

  /**
   * 更新对话标题
   */
  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    await this.conversationManager.updateTitle(conversationId, title)
  }

  /**
   * 搜索对话
   */
  async searchConversations(query: string): Promise<Conversation[]> {
    return await this.conversationManager.searchConversations(query)
  }

  /**
   * 切换对话使用的模型
   */
  async switchModel(conversationId: string, modelId: string): Promise<void> {
    const conversation = this.conversationManager.getConversation(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    // 获取新模型的配置
    const modelConfig = await this.getModelConfig(modelId)

    // 更新对话的模型和设置
    conversation.modelId = modelId
    conversation.settings.maxTokens = modelConfig.maxTokens
    conversation.settings.contextWindow = modelConfig.contextLength
    conversation.settings.timeout = modelConfig.timeout
    conversation.settings.maxRetries = modelConfig.maxRetries
    conversation.settings.completionMode = modelConfig.completionMode

    await this.conversationManager.updateSettings(conversationId, conversation.settings)
  }

  /**
   * 获取或创建 LangChain 客户端
   */
  private async getOrCreateClient(modelId: string): Promise<LangChainClient> {
    // 检查缓存
    if (this.activeClients.has(modelId)) {
      return this.activeClients.get(modelId)!
    }

    // 创建新客户端
    const client = await this.createLangChainClient(modelId)
    this.activeClients.set(modelId, client)

    return client
  }

  /**
   * 创建 LangChain 客户端
   */
  private async createLangChainClient(modelId: string): Promise<LangChainClient> {
    const modelConfig = await this.getModelConfig(modelId)
    const [providerId, modelName] = modelId.split('::')
    const provider = await this.llmConfigManager.getProvider(providerId)

    if (!provider) {
      throw new Error(`Provider ${providerId} not found`)
    }

    const config: LangChainClientConfig = {
      modelName,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      temperature: 0.7,
      maxTokens: modelConfig.maxTokens,
      timeout: modelConfig.timeout,
      maxRetries: modelConfig.maxRetries,
      useChat: modelConfig.completionMode === '对话'
    }

    return new LangChainClient(config)
  }

  /**
   * 获取模型配置
   */
  private async getModelConfig(modelId: string): Promise<ModelConfig> {
    const [providerId, modelName] = modelId.split('::')

    const provider: ModelProvider = await this.llmConfigManager.getProvider(providerId)
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`)
    }

    // 获取模型特定配置
    const modelGroup = provider.supportedModels.find(g =>
      g.models.some(m => m.name === modelName)
    )
    const model = modelGroup?.models.find(m => m.name === modelName)

    // 合并配置：默认配置 + 模型特定配置
    return {
      ...provider.defaultConfig,
      ...model?.config
    }
  }

  /**
   * 准备发送的消息列表（包含上下文管理）
   */
  private async prepareMessages(
    conversation: Conversation,
    newMessage: string
  ): Promise<ChatMessage[]> {
    // 获取当前对话的所有消息
    const allMessages = [...conversation.messages]

    // 如果有系统提示词，添加到开头
    if (conversation.settings.systemPrompt) {
      allMessages.unshift({
        id: 'system',
        role: 'system',
        content: conversation.settings.systemPrompt,
        timestamp: new Date()
      })
    }

    // 获取客户端用于 Token 计数
    const client = await this.getOrCreateClient(conversation.modelId)

    // 计算可用的上下文 Token 数
    const maxContextTokens = conversation.settings.contextWindow
    const reservedTokens = conversation.settings.maxTokens
    const availableTokens = maxContextTokens - reservedTokens

    // 裁剪消息以适应上下文窗口
    const trimmedMessages = await this.contextManager.trimMessages(
      allMessages,
      availableTokens,
      (msgs) => client.countTokens(msgs),
      true // 保留系统提示词
    )

    return trimmedMessages
  }

  /**
   * 私有方法：异步处理流式响应
   */
  private async processStreamAsync(
    conversationId: string,
    messageId: string,
    content: string
  ): Promise<void> {
    try {
      const conversation = this.conversationManager.getConversation(conversationId)
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`)
      }

      const messagesToSend = await this.prepareMessages(conversation, content)
      const client = await this.getOrCreateClient(conversation.modelId)

      let aiMessageContent = ''

      await client.chatStream(messagesToSend, {
        onChunk: (chunk: string) => {
          aiMessageContent += chunk
          this.emit('message:chunk', {
            conversationId,
            messageId,
            chunk
          } as MessageChunkEvent)
        },
        onComplete: async () => {
          await this.conversationManager.addMessage(conversationId, {
            role: 'assistant',
            content: aiMessageContent
          })
          this.emit('message:complete', {
            conversationId,
            messageId
          } as MessageCompleteEvent)
        },
        onError: (error: Error) => {
          this.emit('message:error', {
            conversationId,
            messageId,
            error: error.message
          } as MessageErrorEvent)
        }
      })
    } catch (error: any) {
      console.error('[LlmChatService] Stream processing error:', error)
      this.emit('message:error', {
        conversationId,
        messageId,
        error: error.message
      } as MessageErrorEvent)
    }
  }
}

