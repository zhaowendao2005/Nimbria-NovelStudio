/**
 * LLM Chat 主服务类
 * 协调各个组件，提供统一的服务接口
 */

import { LangChainClient } from './langchain-client'
import { ConversationManager } from './conversation-manager'
import { ContextManager } from './context-manager'
import type {
  Conversation,
  ConversationSettings,
  StreamCallbacks,
  LangChainClientConfig,
  ChatMessage,
  ConversationsStorage
} from './types'
import type { ModelConfig, ModelProvider } from '../llm-service/types'

export class LlmChatService {
  private conversationManager: ConversationManager
  private contextManager: ContextManager
  private activeClients: Map<string, LangChainClient> = new Map()
  private llmConfigManager: any // LlmConfigManager 的引用

  constructor(
    llmConfigManager: any,
    conversationManager: ConversationManager,
    contextManager: ContextManager
  ) {
    this.llmConfigManager = llmConfigManager
    this.conversationManager = conversationManager
    this.contextManager = contextManager
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    // 从 LocalStorage 加载对话
    await this.conversationManager.initialize()

    console.log('LlmChatService initialized')
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
   * 发送消息（流式）
   */
  async sendMessage(
    conversationId: string,
    content: string,
    callbacks?: StreamCallbacks
  ): Promise<string> {
    const conversation = this.conversationManager.getConversation(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    // 添加用户消息
    await this.conversationManager.addMessage(conversationId, {
      role: 'user',
      content
    })

    // 准备发送的消息列表（包含上下文管理）
    const messagesToSend = await this.prepareMessages(conversation, content)

    // 获取或创建 LangChain 客户端
    const client = await this.getOrCreateClient(conversation.modelId)

    // 创建 AI 消息的 ID（用于流式响应）
    const aiMessageId = `msg_${Date.now()}`
    let aiMessageContent = ''

    // 流式发送
    await client.chatStream(messagesToSend, {
      onChunk: (chunk: string) => {
        aiMessageContent += chunk
        callbacks?.onChunk?.(chunk)
      },
      onComplete: async () => {
        // 保存 AI 回复
        await this.conversationManager.addMessage(conversationId, {
          role: 'assistant',
          content: aiMessageContent
        })
        callbacks?.onComplete?.()
      },
      onError: (error: Error) => {
        console.error('Stream error:', error)
        callbacks?.onError?.(error)
      }
    })

    return aiMessageId
  }

  /**
   * 重新生成最后一条消息
   */
  async regenerateLastMessage(
    conversationId: string,
    callbacks?: StreamCallbacks
  ): Promise<void> {
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

    // 重新发送
    await this.sendMessage(conversationId, lastUserMessage, callbacks)
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
}

