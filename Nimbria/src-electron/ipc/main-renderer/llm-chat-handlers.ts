/**
 * LLM Chat IPC 处理器
 * 处理前端与后端的通信
 */

import { ipcMain, BrowserWindow } from 'electron'
import type { LlmChatService } from '../../services/llm-chat-service/llm-chat-service'
import type { ConversationSettings } from '../../services/llm-chat-service/types'

export function registerLlmChatHandlers(llmChatService: LlmChatService) {
  /**
   * 创建新对话
   */
  ipcMain.handle('llm-chat:create-conversation', async (event, args: {
    modelId: string
    settings?: Partial<ConversationSettings>
  }) => {
    try {
      const conversation = await llmChatService.createConversation(
        args.modelId,
        args.settings
      )
      return { success: true, conversation }
    } catch (error: any) {
      console.error('Failed to create conversation:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 获取所有对话
   */
  ipcMain.handle('llm-chat:get-conversations', async () => {
    try {
      const conversations = llmChatService.getConversations()
      return { success: true, conversations }
    } catch (error: any) {
      console.error('Failed to get conversations:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 获取单个对话
   */
  ipcMain.handle('llm-chat:get-conversation', async (event, args: {
    conversationId: string
  }) => {
    try {
      const conversation = llmChatService.getConversation(args.conversationId)
      if (!conversation) {
        return { success: false, error: 'Conversation not found' }
      }
      return { success: true, conversation }
    } catch (error: any) {
      console.error('Failed to get conversation:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 删除对话
   */
  ipcMain.handle('llm-chat:delete-conversation', async (event, args: {
    conversationId: string
  }) => {
    try {
      await llmChatService.deleteConversation(args.conversationId)
      return { success: true }
    } catch (error: any) {
      console.error('Failed to delete conversation:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 更新对话标题
   */
  ipcMain.handle('llm-chat:update-title', async (event, args: {
    conversationId: string
    title: string
  }) => {
    try {
      await llmChatService.updateConversationTitle(args.conversationId, args.title)
      return { success: true }
    } catch (error: any) {
      console.error('Failed to update title:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 更新对话设置
   */
  ipcMain.handle('llm-chat:update-settings', async (event, args: {
    conversationId: string
    settings: Partial<ConversationSettings>
  }) => {
    try {
      await llmChatService.updateConversationSettings(args.conversationId, args.settings)
      return { success: true }
    } catch (error: any) {
      console.error('Failed to update settings:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 发送消息（流式）
   */
  ipcMain.handle('llm-chat:send-message', async (event, args: {
    conversationId: string
    content: string
  }) => {
    try {
      const senderWindow = BrowserWindow.fromWebContents(event.sender)
      if (!senderWindow) {
        return { success: false, error: 'Window not found' }
      }

      const messageId = await llmChatService.sendMessage(
        args.conversationId,
        args.content,
        {
          onChunk: (chunk: string) => {
            // 发送流式块到前端
            senderWindow.webContents.send('llm-chat:stream-chunk', {
              conversationId: args.conversationId,
              messageId,
              chunk
            })
          },
          onComplete: () => {
            // 发送完成信号
            senderWindow.webContents.send('llm-chat:stream-complete', {
              conversationId: args.conversationId,
              messageId
            })
          },
          onError: (error: Error) => {
            // 发送错误信号
            senderWindow.webContents.send('llm-chat:stream-error', {
              conversationId: args.conversationId,
              error: error.message
            })
          }
        }
      )

      return { success: true, messageId }
    } catch (error: any) {
      console.error('Failed to send message:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 重新生成消息
   */
  ipcMain.handle('llm-chat:regenerate-message', async (event, args: {
    conversationId: string
  }) => {
    try {
      const senderWindow = BrowserWindow.fromWebContents(event.sender)
      if (!senderWindow) {
        return { success: false, error: 'Window not found' }
      }

      await llmChatService.regenerateLastMessage(
        args.conversationId,
        {
          onChunk: (chunk: string) => {
            senderWindow.webContents.send('llm-chat:stream-chunk', {
              conversationId: args.conversationId,
              messageId: 'regenerate',
              chunk
            })
          },
          onComplete: () => {
            senderWindow.webContents.send('llm-chat:stream-complete', {
              conversationId: args.conversationId,
              messageId: 'regenerate'
            })
          },
          onError: (error: Error) => {
            senderWindow.webContents.send('llm-chat:stream-error', {
              conversationId: args.conversationId,
              error: error.message
            })
          }
        }
      )

      return { success: true }
    } catch (error: any) {
      console.error('Failed to regenerate message:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 删除消息
   */
  ipcMain.handle('llm-chat:delete-message', async (event, args: {
    conversationId: string
    messageId: string
  }) => {
    try {
      await llmChatService.deleteMessage(args.conversationId, args.messageId)
      return { success: true }
    } catch (error: any) {
      console.error('Failed to delete message:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 切换模型
   */
  ipcMain.handle('llm-chat:switch-model', async (event, args: {
    conversationId: string
    modelId: string
  }) => {
    try {
      await llmChatService.switchModel(args.conversationId, args.modelId)
      return { success: true }
    } catch (error: any) {
      console.error('Failed to switch model:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * LocalStorage 操作 - 保存对话
   */
  ipcMain.handle('llm-chat:save-to-storage', async (event, data) => {
    try {
      // 这个方法会被 ConversationManager 调用
      // 实际存储在渲染进程的 LocalStorage 中
      event.sender.send('llm-chat:storage-save', data)
      return { success: true }
    } catch (error: any) {
      console.error('Failed to save to storage:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * LocalStorage 操作 - 加载对话
   */
  ipcMain.handle('llm-chat:load-from-storage', async (event) => {
    try {
      // 请求渲染进程返回 LocalStorage 数据
      return new Promise((resolve) => {
        event.sender.send('llm-chat:storage-load-request')
        
        // 监听渲染进程的响应
        ipcMain.once('llm-chat:storage-load-response', (_, data) => {
          resolve({ success: true, data })
        })

        // 超时处理
        setTimeout(() => {
          resolve({ success: false, error: 'Load timeout' })
        }, 5000)
      })
    } catch (error: any) {
      console.error('Failed to load from storage:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('LLM Chat IPC handlers registered')
}

