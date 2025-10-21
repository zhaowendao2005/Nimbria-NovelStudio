/**
 * LangChain 客户端封装
 * 负责与 LangChain 的 ChatOpenAI 交互
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, AIMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages'
import { encoding_for_model, type TiktokenModel } from 'tiktoken'
import type { ChatMessage, LangChainClientConfig, StreamCallbacks } from './types'

export class LangChainClient {
  private client: ChatOpenAI
  private config: LangChainClientConfig

  constructor(config: LangChainClientConfig) {
    this.config = config

    // 创建 ChatOpenAI 实例
    this.client = new ChatOpenAI({
      modelName: config.modelName,
      openAIApiKey: config.apiKey,
      configuration: {
        baseURL: config.baseUrl
      },
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
      streaming: true  // 启用流式响应
    })
  }

  /**
   * 发送消息（流式）
   */
  async chatStream(
    messages: ChatMessage[],
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      // 转换消息格式
      const langchainMessages = this.convertMessages(messages)

      // 流式调用
      const stream = await this.client.stream(langchainMessages)

      // 处理流式响应
      for await (const chunk of stream) {
        const content = chunk.content as string
        if (content) {
          callbacks.onChunk?.(content)
        }
      }

      // 完成回调
      callbacks.onComplete?.()
    } catch (error) {
      console.error('LangChain stream error:', error)
      callbacks.onError?.(error as Error)
    }
  }

  /**
   * 发送消息（非流式）
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      const langchainMessages = this.convertMessages(messages)
      const response = await this.client.invoke(langchainMessages)
      return response.content as string
    } catch (error) {
      console.error('LangChain chat error:', error)
      throw error
    }
  }

  /**
   * 计算 Token 数量
   */
  countTokens(messages: ChatMessage[]): number {
    try {
      // 尝试获取模型的编码器
      let modelName = this.config.modelName as TiktokenModel
      
      // 如果模型名称不被 tiktoken 支持，使用默认编码器
      const supportedModels = ['gpt-4', 'gpt-4-32k', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k']
      const isSupported = supportedModels.some(m => modelName.startsWith(m))
      
      if (!isSupported) {
        // 使用 gpt-3.5-turbo 作为默认编码器
        modelName = 'gpt-3.5-turbo' as TiktokenModel
      }

      const encoding = encoding_for_model(modelName)
      
      let totalTokens = 0

      for (const message of messages) {
        // 每条消息的基础 token（格式化开销）
        totalTokens += 4
        
        // 角色的 token
        totalTokens += encoding.encode(message.role).length
        
        // 内容的 token
        totalTokens += encoding.encode(message.content).length
      }

      // 额外的格式化 token
      totalTokens += 2

      encoding.free()

      return totalTokens
    } catch (error) {
      console.error('Token counting error:', error)
      // 如果计算失败，使用粗略估算：1 token ≈ 4 字符
      const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0)
      return Math.ceil(totalChars / 4)
    }
  }

  /**
   * 转换消息格式：ChatMessage -> LangChain BaseMessage
   */
  private convertMessages(messages: ChatMessage[]): BaseMessage[] {
    return messages.map(msg => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content)
        case 'user':
          return new HumanMessage(msg.content)
        case 'assistant':
          return new AIMessage(msg.content)
        default:
          throw new Error(`Unknown message role: ${msg.role as string}`)
      }
    })
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LangChainClientConfig>): void {
    this.config = { ...this.config, ...config }
    
    // 重新创建客户端
    this.client = new ChatOpenAI({
      modelName: this.config.modelName,
      openAIApiKey: this.config.apiKey,
      configuration: {
        baseURL: this.config.baseUrl
      },
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      streaming: true
    })
  }
}

