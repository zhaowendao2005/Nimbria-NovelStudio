/**
 * 上下文管理器
 * 负责管理对话上下文，防止超出 Token 限制
 */

import type { ChatMessage } from './types'
import { LangChainClient } from './langchain-client'

export class ContextManager {
  /**
   * 裁剪消息列表以适应上下文窗口
   */
  async trimMessages(
    messages: ChatMessage[],
    maxTokens: number,
    tokenCounter: (messages: ChatMessage[]) => Promise<number>,
    preserveSystemPrompt: boolean = true
  ): Promise<ChatMessage[]> {
    // 计算当前总 Token 数
    const totalTokens = await tokenCounter(messages)

    // 如果没有超出限制，直接返回
    if (totalTokens <= maxTokens) {
      return messages
    }

    // 使用智能裁剪策略
    return this.smartTrim(messages, maxTokens, tokenCounter, preserveSystemPrompt)
  }

  /**
   * 计算消息列表的总 Token 数
   * 注意：这个方法需要一个 tokenCounter 函数，通常由 LangChainClient 提供
   */
  async calculateTotalTokens(
    messages: ChatMessage[],
    tokenCounter: (messages: ChatMessage[]) => Promise<number>
  ): Promise<number> {
    return tokenCounter(messages)
  }

  /**
   * 智能裁剪策略
   * 1. 保留系统提示词（如果有且 preserveSystemPrompt 为 true）
   * 2. 保留最新的用户消息
   * 3. 从最旧的消息开始删除，直到满足 Token 限制
   * 4. 保留对话的连贯性（成对保留 user-assistant）
   */
  private async smartTrim(
    messages: ChatMessage[],
    maxTokens: number,
    tokenCounter: (messages: ChatMessage[]) => Promise<number>,
    preserveSystemPrompt: boolean
  ): Promise<ChatMessage[]> {
    if (messages.length === 0) {
      return []
    }

    // 分离系统提示词和其他消息
    const systemMessages: ChatMessage[] = []
    const otherMessages: ChatMessage[] = []

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessages.push(msg)
      } else {
        otherMessages.push(msg)
      }
    }

    // 如果没有其他消息，只返回系统消息（如果允许保留）
    if (otherMessages.length === 0) {
      if (preserveSystemPrompt) {
        return systemMessages
      }
      return []
    }

    // 从最新的消息开始构建列表
    const result: ChatMessage[] = preserveSystemPrompt ? [...systemMessages] : []
    
    // 始终保留最新的用户消息
    const latestUserMessage = otherMessages[otherMessages.length - 1]
    if (latestUserMessage.role === 'user') {
      result.push(latestUserMessage)
    }

    // 从倒数第二条消息开始，向前添加消息
    for (let i = otherMessages.length - 2; i >= 0; i--) {
      const candidate = [...result]
      
      // 插入到系统消息之后，最新消息之前
      const insertIndex = preserveSystemPrompt ? systemMessages.length : 0
      candidate.splice(insertIndex, 0, otherMessages[i])

      // 检查是否超出限制
      const tokens = await tokenCounter(candidate)
      if (tokens > maxTokens) {
        // 超出限制，停止添加
        break
      }

      // 未超出，添加这条消息
      result.splice(insertIndex, 0, otherMessages[i])
    }

    return result
  }

  /**
   * 检查是否需要裁剪
   */
  async needsTrimming(
    messages: ChatMessage[],
    maxTokens: number,
    tokenCounter: (messages: ChatMessage[]) => Promise<number>
  ): Promise<boolean> {
    const totalTokens = await tokenCounter(messages)
    return totalTokens > maxTokens
  }

  /**
   * 获取裁剪后会保留的消息数量
   */
  async getRetainedMessageCount(
    messages: ChatMessage[],
    maxTokens: number,
    tokenCounter: (messages: ChatMessage[]) => Promise<number>
  ): Promise<number> {
    const trimmed = await this.trimMessages(messages, maxTokens, tokenCounter)
    return trimmed.length
  }
}

