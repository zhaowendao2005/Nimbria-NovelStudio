/**
 * LLM Chat Store
 * 管理LLM对话状态，与后端服务通信
 */

import { defineStore } from 'pinia'
import type {
  Conversation,
  ChatMessage,
  ConversationSettings,
  IpcResponse,
  StreamChunk,
  StreamComplete,
  StreamError,
  ModelOption
} from '@types/llmChat'

interface LlmChatState {
  // 对话数据
  conversations: Conversation[]
  activeConversationId: string | null
  
  // 加载状态
  isLoading: boolean
  isSending: boolean
  
  // 流式响应状态
  streamingMessageId: string | null
  streamingContent: string
  
  // 模型管理
  selectedModels: string[] // 用户选择的模型ID列表
  
  // UI状态
  isContentVisible: boolean
  activeNavItem: string
  leftSidebarWidth: number
  minSidebarWidth: number
  maxSidebarWidth: number
}

declare global {
  interface Window {
    nimbria: {
      llmChat: {
        createConversation: (args: { modelId: string; settings?: Partial<ConversationSettings> }) => Promise<IpcResponse>
        getConversations: () => Promise<IpcResponse>
        getConversation: (conversationId: string) => Promise<IpcResponse>
        deleteConversation: (conversationId: string) => Promise<IpcResponse>
        updateTitle: (conversationId: string, title: string) => Promise<IpcResponse>
        updateSettings: (conversationId: string, settings: Partial<ConversationSettings>) => Promise<IpcResponse>
        sendMessage: (args: { conversationId: string; content: string }) => Promise<IpcResponse>
        regenerateMessage: (conversationId: string) => Promise<IpcResponse>
        deleteMessage: (conversationId: string, messageId: string) => Promise<IpcResponse>
        switchModel: (conversationId: string, modelId: string) => Promise<IpcResponse>
        onStreamChunk: (callback: (data: StreamChunk) => void) => void
        onStreamComplete: (callback: (data: StreamComplete) => void) => void
        onStreamError: (callback: (data: StreamError) => void) => void
      }
      llm: {
        getProviders: () => Promise<any>
      }
    }
  }
}

export const useLlmChatStore = defineStore('llmChat', {
  state: (): LlmChatState => ({
    conversations: [],
    activeConversationId: null,
    isLoading: false,
    isSending: false,
    streamingMessageId: null,
    streamingContent: '',
    selectedModels: [],
    isContentVisible: true,
    activeNavItem: 'chat',
    leftSidebarWidth: 328,
    minSidebarWidth: 280,
    maxSidebarWidth: 600
  }),

  getters: {
    /**
     * 获取当前活跃的对话
     */
    activeConversation(state): Conversation | null {
      return state.conversations.find(c => c.id === state.activeConversationId) || null
    },

    /**
     * 检查是否有选中的模型
     */
    hasSelectedModels(state): boolean {
      return state.selectedModels.length > 0
    },

    /**
     * 获取当前对话的消息列表
     */
    currentMessages(state): ChatMessage[] {
      const conv = state.conversations.find(c => c.id === state.activeConversationId)
      return conv?.messages || []
    }
  },

  actions: {
    // ========== 初始化 ==========
    
    /**
     * 初始化Store
     */
    async initialize() {
      // 加载UI设置
      this.loadUISettings()
      
      // 加载对话列表
      await this.loadConversations()
      
      // 设置流式响应监听器
      this.setupStreamListeners()
    },

    /**
     * 设置流式响应监听器
     */
    setupStreamListeners() {
      if (!window.nimbria?.llmChat) return

      // 监听流式块
      window.nimbria.llmChat.onStreamChunk((data: StreamChunk) => {
        if (data.conversationId === this.activeConversationId) {
          this.streamingMessageId = data.messageId
          this.streamingContent += data.chunk
          
          // 更新对话中的消息
          const conversation = this.conversations.find(c => c.id === data.conversationId)
          if (conversation) {
            const message = conversation.messages.find(m => m.id === data.messageId)
            if (message) {
              message.content = this.streamingContent
            }
          }
        }
      })

      // 监听流式完成
      window.nimbria.llmChat.onStreamComplete((data: StreamComplete) => {
        if (data.conversationId === this.activeConversationId) {
          this.streamingMessageId = null
          this.streamingContent = ''
          this.isSending = false
          
          // 重新加载对话以获取完整数据
          void this.loadConversation(data.conversationId)
        }
      })

      // 监听流式错误
      window.nimbria.llmChat.onStreamError((data: StreamError) => {
        if (data.conversationId === this.activeConversationId) {
          console.error('Stream error:', data.error)
          this.streamingMessageId = null
          this.streamingContent = ''
          this.isSending = false
          
          // TODO: 显示错误提示
        }
      })
    },

    // ========== 对话管理 ==========
    
    /**
     * 加载所有对话
     */
    async loadConversations() {
      try {
        this.isLoading = true
        const response = await window.nimbria.llmChat.getConversations()
        
        if (response.success && response.conversations) {
          this.conversations = response.conversations
        }
      } catch (error) {
        console.error('加载对话列表失败:', error)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 加载单个对话
     */
    async loadConversation(conversationId: string) {
      try {
        const response = await window.nimbria.llmChat.getConversation(conversationId)
        
        if (response.success && response.conversation) {
          const index = this.conversations.findIndex(c => c.id === conversationId)
          if (index !== -1) {
            this.conversations[index] = response.conversation
          } else {
            this.conversations.push(response.conversation)
          }
        }
      } catch (error) {
        console.error('加载对话失败:', error)
      }
    },

    /**
     * 创建新对话
     */
    async createConversation(modelId?: string): Promise<string | null> {
      try {
        const selectedModelId = modelId || this.selectedModels[0]
        if (!selectedModelId) {
          console.error('没有选择模型')
          return null
        }

        const response = await window.nimbria.llmChat.createConversation({
          modelId: selectedModelId
        })

        if (response.success && response.conversation) {
          this.conversations.push(response.conversation)
          this.activeConversationId = response.conversation.id
          return response.conversation.id
        }

        return null
      } catch (error) {
        console.error('创建对话失败:', error)
        return null
      }
    },

    /**
     * 删除对话
     */
    async deleteConversation(conversationId: string) {
      try {
        const response = await window.nimbria.llmChat.deleteConversation(conversationId)
        
        if (response.success) {
          const index = this.conversations.findIndex(c => c.id === conversationId)
          if (index !== -1) {
            this.conversations.splice(index, 1)
          }
          
          // 如果删除的是当前对话，切换到其他对话
          if (this.activeConversationId === conversationId) {
            this.activeConversationId = this.conversations[0]?.id || null
          }
        }
      } catch (error) {
        console.error('删除对话失败:', error)
      }
    },

    /**
     * 设置活跃对话
     */
    setActiveConversation(conversationId: string) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (conversation) {
        this.activeConversationId = conversationId
      }
    },

    /**
     * 更新对话标题
     */
    async updateConversationTitle(conversationId: string, title: string) {
      try {
        const response = await window.nimbria.llmChat.updateTitle(conversationId, title)
        
        if (response.success) {
          const conversation = this.conversations.find(c => c.id === conversationId)
          if (conversation) {
            conversation.title = title
          }
        }
      } catch (error) {
        console.error('更新对话标题失败:', error)
      }
    },

    /**
     * 更新对话设置
     */
    async updateConversationSettings(conversationId: string, settings: Partial<ConversationSettings>) {
      try {
        const response = await window.nimbria.llmChat.updateSettings(conversationId, settings)
        
        if (response.success) {
          const conversation = this.conversations.find(c => c.id === conversationId)
          if (conversation) {
            conversation.settings = { ...conversation.settings, ...settings }
          }
        }
      } catch (error) {
        console.error('更新对话设置失败:', error)
      }
    },

    // ========== 消息管理 ==========
    
    /**
     * 发送消息
     */
    async sendMessage(content: string) {
      try {
        // 如果没有活跃对话，创建新对话
        if (!this.activeConversationId) {
          const conversationId = await this.createConversation()
          if (!conversationId) {
            console.error('创建对话失败')
            return
          }
        }

        this.isSending = true
        this.streamingContent = ''

        const response = await window.nimbria.llmChat.sendMessage({
          conversationId: this.activeConversationId!,
          content
        })

        if (response.success && response.messageId) {
          // 添加用户消息到本地状态
          const conversation = this.conversations.find(c => c.id === this.activeConversationId)
          if (conversation) {
            const userMessage: ChatMessage = {
              id: `user_${Date.now()}`,
              role: 'user',
              content,
              timestamp: Date.now()
            }
            conversation.messages.push(userMessage)

            // 添加占位的助手消息
            const assistantMessage: ChatMessage = {
              id: response.messageId,
              role: 'assistant',
              content: '',
              timestamp: Date.now()
            }
            conversation.messages.push(assistantMessage)
          }
        }
      } catch (error) {
        console.error('发送消息失败:', error)
        this.isSending = false
      }
    },

    /**
     * 重新生成消息
     */
    async regenerateMessage() {
      if (!this.activeConversationId) return

      try {
        this.isSending = true
        this.streamingContent = ''

        const response = await window.nimbria.llmChat.regenerateMessage(this.activeConversationId)

        if (!response.success) {
          console.error('重新生成消息失败')
          this.isSending = false
        }
      } catch (error) {
        console.error('重新生成消息失败:', error)
        this.isSending = false
      }
    },

    /**
     * 删除消息
     */
    async deleteMessage(messageId: string) {
      if (!this.activeConversationId) return

      try {
        const response = await window.nimbria.llmChat.deleteMessage(
          this.activeConversationId,
          messageId
        )

        if (response.success) {
          const conversation = this.conversations.find(c => c.id === this.activeConversationId)
          if (conversation) {
            const index = conversation.messages.findIndex(m => m.id === messageId)
            if (index !== -1) {
              conversation.messages.splice(index, 1)
            }
          }
        }
      } catch (error) {
        console.error('删除消息失败:', error)
      }
    },

    // ========== 模型管理 ==========
    
    /**
     * 设置选中的模型列表
     */
    setSelectedModels(models: string[]) {
      this.selectedModels = models
      this.saveUISettings()
    },

    /**
     * 校验模型（移除已失效的模型）
     */
    async validateModels() {
      try {
        const response = await window.nimbria.llm.getProviders()
        const activeModelIds: string[] = []

        if (response.success && response.providers) {
          for (const provider of response.providers) {
            if (provider.status !== 'active') continue
            
            // 遍历 supportedModels
            for (const modelGroup of provider.supportedModels) {
              const modelType = modelGroup.type
              
              // 获取该类型下已选中的模型
              const selectedModels = provider.activeModels?.[modelType]?.selectedModels || []
              
              for (const modelName of selectedModels) {
                activeModelIds.push(`${provider.id}::${modelName}`)
              }
            }
          }
        }

        // 过滤出仍然活跃的模型
        this.selectedModels = this.selectedModels.filter(id => activeModelIds.includes(id))
        this.saveUISettings()
      } catch (error) {
        console.error('校验模型失败:', error)
      }
    },

    /**
     * 切换对话的模型
     */
    async switchModel(conversationId: string, modelId: string) {
      try {
        const response = await window.nimbria.llmChat.switchModel(conversationId, modelId)
        
        if (response.success) {
          const conversation = this.conversations.find(c => c.id === conversationId)
          if (conversation) {
            conversation.modelId = modelId
          }
        }
      } catch (error) {
        console.error('切换模型失败:', error)
      }
    },

    // ========== UI状态管理 ==========
    
    /**
     * 切换内容区可见性
     */
    toggleContentVisibility() {
      this.isContentVisible = !this.isContentVisible
    },

    /**
     * 设置活跃的导航项
     */
    setActiveNavItem(item: string) {
      this.activeNavItem = item
      this.isContentVisible = true
    },

    /**
     * 设置侧栏宽度
     */
    setSidebarWidth(width: number) {
      this.leftSidebarWidth = Math.max(
        this.minSidebarWidth,
        Math.min(width, this.maxSidebarWidth)
      )
      this.saveUISettings()
    },

    /**
     * 重置侧栏宽度
     */
    resetSidebarWidth() {
      this.leftSidebarWidth = 328
      this.saveUISettings()
    },

    // ========== 数据持久化 ==========
    
    /**
     * 保存UI设置到LocalStorage
     */
    saveUISettings() {
      try {
        const settings = {
          selectedModels: this.selectedModels,
          leftSidebarWidth: this.leftSidebarWidth
        }
        localStorage.setItem('nimbria_llm_chat_ui', JSON.stringify(settings))
      } catch (error) {
        console.error('保存UI设置失败:', error)
      }
    },

    /**
     * 从LocalStorage加载UI设置
     */
    loadUISettings() {
      try {
        const settingsStr = localStorage.getItem('nimbria_llm_chat_ui')
        if (settingsStr) {
          const settings = JSON.parse(settingsStr)
          this.selectedModels = settings.selectedModels || []
          this.leftSidebarWidth = settings.leftSidebarWidth || 328
        }
      } catch (error) {
        console.error('加载UI设置失败:', error)
      }
    },

    /**
     * 清空所有数据
     */
    clearAll() {
      this.conversations = []
      this.activeConversationId = null
      this.selectedModels = []
      localStorage.removeItem('nimbria_llm_chat_ui')
    }
  }
})

