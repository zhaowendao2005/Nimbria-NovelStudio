import { defineStore } from 'pinia'
import type {
  ChatState,
  ChatConversation,
  ChatMessage,
  ProjectContext,
  ChatSettings,
  ChatPreferences
} from '@gui/components/ProjectPage.Shell/Navbar.content/LlmChat/types'

const DEFAULT_PREFERENCES: ChatPreferences = {
  autoSave: true,
  maxHistory: 50,
  streamResponse: true,
  showTimestamp: true,
  enableNotification: false
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    conversations: [],
    activeConversationId: null,
    isLoading: false,
    selectedModels: [],
    defaultModel: null,
    projectContext: null,
    
    // 导航状态
    isContentVisible: true,
    activeNavItem: 'chat',
    
    // 布局状态
    leftSidebarWidth: 328,
    minSidebarWidth: 280,
    maxSidebarWidth: 600
  }),

  getters: {
    /**
     * 获取当前活跃的对话
     */
    activeConversation(state): ChatConversation | null {
      return state.conversations.find(c => c.id === state.activeConversationId) || null
    },

    /**
     * 获取所有活跃的对话（未删除）
     */
    activeConversations(state): ChatConversation[] {
      return state.conversations.filter(c => c.status === 'active')
    },

    /**
     * 获取固定的对话
     */
    pinnedConversations(state): ChatConversation[] {
      return state.conversations.filter(c => c.isPinned && c.status === 'active')
    },

    /**
     * 检查是否有选中的模型
     */
    hasSelectedModels(state): boolean {
      return state.selectedModels.length > 0
    }
  },

  actions: {
    // ========== 对话管理 ==========
    
    /**
     * 创建新对话
     */
    createConversation(modelId?: string): string {
      const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      const conversation: ChatConversation = {
        id,
        title: `对话 ${this.conversations.length + 1}`,
        messages: [],
        modelId: modelId || this.defaultModel || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        isPinned: false
      }
      
      this.conversations.push(conversation)
      this.activeConversationId = id
      this.saveToLocalStorage()
      
      return id
    },

    /**
     * 删除对话
     */
    deleteConversation(id: string): void {
      const index = this.conversations.findIndex(c => c.id === id)
      if (index !== -1) {
        this.conversations[index].status = 'deleted'
        
        // 如果删除的是当前激活的对话，切换到其他对话
        if (this.activeConversationId === id) {
          const activeConvs = this.activeConversations
          this.activeConversationId = activeConvs.length > 0 ? activeConvs[0].id : null
        }
        
        this.saveToLocalStorage()
      }
    },

    /**
     * 设置活跃对话
     */
    setActiveConversation(id: string): void {
      const conversation = this.conversations.find(c => c.id === id)
      if (conversation && conversation.status === 'active') {
        this.activeConversationId = id
      }
    },

    /**
     * 更新对话标题
     */
    updateConversationTitle(id: string, title: string): void {
      const conversation = this.conversations.find(c => c.id === id)
      if (conversation) {
        conversation.title = title
        conversation.updatedAt = new Date()
        this.saveToLocalStorage()
      }
    },

    /**
     * 切换对话固定状态
     */
    toggleConversationPin(id: string): void {
      const conversation = this.conversations.find(c => c.id === id)
      if (conversation) {
        conversation.isPinned = !conversation.isPinned
        this.saveToLocalStorage()
      }
    },

    // ========== 消息管理 ==========
    
    /**
     * 发送消息
     */
    async sendMessage(content: string, attachments?: any[]): Promise<void> {
      if (!this.activeConversationId) {
        this.createConversation()
      }

      const conversation = this.activeConversation
      if (!conversation) return

      // 创建用户消息
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        role: 'user',
        content,
        timestamp: new Date(),
        status: 'sent',
        attachments
      }

      conversation.messages.push(userMessage)
      conversation.updatedAt = new Date()

      // 自动生成对话标题（如果是第一条消息）
      if (conversation.messages.length === 1) {
        conversation.title = content.substring(0, 30) + (content.length > 30 ? '...' : '')
      }

      this.isLoading = true
      this.saveToLocalStorage()

      try {
        // TODO: 调用LLM API
        // 这里暂时创建一个占位的AI回复消息
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          role: 'assistant',
          content: '这是一个占位回复，实际实现需要调用LLM API。',
          timestamp: new Date(),
          status: 'sent'
        }

        conversation.messages.push(assistantMessage)
        conversation.updatedAt = new Date()
        this.saveToLocalStorage()
      } catch (error) {
        console.error('发送消息失败:', error)
        // 添加错误消息
        const errorMessage: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          status: 'error',
          error: '发送消息失败，请重试'
        }
        conversation.messages.push(errorMessage)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 重新生成消息
     */
    async regenerateMessage(messageId: string): Promise<void> {
      const conversation = this.activeConversation
      if (!conversation) return

      const messageIndex = conversation.messages.findIndex(m => m.id === messageId)
      if (messageIndex === -1) return

      // 找到要重新生成的消息
      const message = conversation.messages[messageIndex]
      message.status = 'streaming'

      try {
        // TODO: 调用LLM API重新生成
        message.content = '重新生成的回复内容'
        message.status = 'sent'
        message.timestamp = new Date()
        this.saveToLocalStorage()
      } catch (error) {
        message.status = 'error'
        message.error = '重新生成失败'
      }
    },

    /**
     * 删除消息
     */
    deleteMessage(messageId: string): void {
      const conversation = this.activeConversation
      if (!conversation) return

      const index = conversation.messages.findIndex(m => m.id === messageId)
      if (index !== -1) {
        conversation.messages.splice(index, 1)
        conversation.updatedAt = new Date()
        this.saveToLocalStorage()
      }
    },

    // ========== 模型管理 ==========
    
    /**
     * 设置选中的模型列表
     */
    setSelectedModels(models: string[]): void {
      this.selectedModels = models
      
      // 如果当前没有默认模型，设置第一个为默认
      if (!this.defaultModel && models.length > 0) {
        this.defaultModel = models[0]
      }
      
      // 如果默认模型不在选中列表中，更新默认模型
      if (this.defaultModel && !models.includes(this.defaultModel)) {
        this.defaultModel = models[0] || null
      }
      
      this.saveToLocalStorage()
    },

    /**
     * 设置默认模型
     */
    setDefaultModel(modelId: string): void {
      if (this.selectedModels.includes(modelId)) {
        this.defaultModel = modelId
        this.saveToLocalStorage()
      }
    },

    /**
     * 校验模型（移除已失效的模型）
     */
    validateModels(activeModelIds: string[]): void {
      // 过滤出仍然活跃的模型
      this.selectedModels = this.selectedModels.filter(id => activeModelIds.includes(id))
      
      // 检查默认模型
      if (this.defaultModel && !activeModelIds.includes(this.defaultModel)) {
        this.defaultModel = this.selectedModels[0] || null
      }
      
      this.saveToLocalStorage()
    },

    // ========== 项目集成 ==========
    
    /**
     * 设置项目上下文
     */
    setProjectContext(context: ProjectContext): void {
      this.projectContext = context
    },

    /**
     * 添加文件引用
     */
    addFileReference(filePath: string): void {
      if (this.projectContext) {
        if (!this.projectContext.recentFiles.includes(filePath)) {
          this.projectContext.recentFiles.unshift(filePath)
          // 限制最近文件数量
          if (this.projectContext.recentFiles.length > 10) {
            this.projectContext.recentFiles.pop()
          }
        }
      }
    },

    // ========== 导航状态管理 ==========
    
    /**
     * 切换内容区可见性
     */
    toggleContentVisibility(): void {
      this.isContentVisible = !this.isContentVisible
    },

    /**
     * 设置活跃的导航项
     */
    setActiveNavItem(item: string): void {
      this.activeNavItem = item
      this.isContentVisible = true
    },

    // ========== 布局管理 ==========
    
    /**
     * 设置侧栏宽度
     */
    setSidebarWidth(width: number): void {
      // 限制宽度范围
      this.leftSidebarWidth = Math.max(
        this.minSidebarWidth,
        Math.min(width, this.maxSidebarWidth)
      )
      
      // 保存到localStorage
      localStorage.setItem('nimbria_sidebar_width', this.leftSidebarWidth.toString())
    },

    /**
     * 重置侧栏宽度
     */
    resetSidebarWidth(): void {
      this.leftSidebarWidth = 328
      localStorage.removeItem('nimbria_sidebar_width')
    },

    // ========== 数据持久化 ==========
    
    /**
     * 保存到LocalStorage
     */
    saveToLocalStorage(): void {
      try {
        const settings: ChatSettings = {
          selectedModels: this.selectedModels,
          defaultModel: this.defaultModel,
          conversations: this.conversations,
          preferences: DEFAULT_PREFERENCES
        }
        
        localStorage.setItem('nimbria_chat_settings', JSON.stringify(settings))
      } catch (error) {
        console.error('保存聊天设置失败:', error)
      }
    },

    /**
     * 从LocalStorage加载
     */
    loadFromLocalStorage(): void {
      try {
        const settingsStr = localStorage.getItem('nimbria_chat_settings')
        if (settingsStr) {
          const settings: ChatSettings = JSON.parse(settingsStr)
          this.selectedModels = settings.selectedModels || []
          this.defaultModel = settings.defaultModel
          this.conversations = settings.conversations || []
        }

        // 加载侧栏宽度
        const widthStr = localStorage.getItem('nimbria_sidebar_width')
        if (widthStr) {
          const width = parseInt(widthStr)
          if (!isNaN(width)) {
            this.leftSidebarWidth = width
          }
        }
      } catch (error) {
        console.error('加载聊天设置失败:', error)
      }
    },

    /**
     * 清空所有数据
     */
    clearAll(): void {
      this.conversations = []
      this.activeConversationId = null
      this.selectedModels = []
      this.defaultModel = null
      localStorage.removeItem('nimbria_chat_settings')
      localStorage.removeItem('nimbria_chat_conversations')
      localStorage.removeItem('nimbria_chat_temp')
    }
  }
})

