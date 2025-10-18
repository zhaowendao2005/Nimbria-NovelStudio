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
} from '../../types/llmChat'

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
  
  // 🔥 外部设置的项目路径（用于新窗口等场景）
  externalProjectPath: string | null
}

// 类型声明已经在 Client/types/core/window.d.ts 中定义，不需要重复声明

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
    maxSidebarWidth: 600,
    
    // 外部项目路径初始化
    externalProjectPath: null
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
      console.log('🚀 [Store] 开始初始化 LLM Chat Store')
      
      // 检查 window.nimbria 可用性
      console.log('🔍 [Store] window.nimbria 可用性:', !!window.nimbria)
      console.log('🔍 [Store] window.nimbria.llmChat 可用性:', !!window.nimbria?.llmChat)
      
      // 加载UI设置
      this.loadUISettings()
      
      // ✅ 不再自动加载所有对话
      // 对话只在以下情况加载：
      // 1. 用户创建新对话
      // 2. 用户从历史记录打开对话
      // conversations 数组保持为空，直到用户主动操作
      
      // 设置流式响应监听器（带重试机制）
      await this.setupStreamListenersWithRetry()
      
      console.log('✅ [Store] LLM Chat Store 初始化完成')
      console.log('📊 [Store] 当前打开的对话数:', this.conversations.length)
    },

    /**
     * 设置流式响应监听器（带重试机制）
     */
    async setupStreamListenersWithRetry(maxRetries: number = 5, delay: number = 100) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`🔄 [Store] 尝试设置事件监听器 (${attempt}/${maxRetries})`)
        
        if (window.nimbria?.llmChat) {
          console.log('✅ [Store] window.nimbria.llmChat 可用，设置监听器')
          this.setupStreamListeners()
          return
        }
        
        console.warn(`⚠️ [Store] window.nimbria.llmChat 不可用，${delay}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 2 // 指数退避
      }
      
      console.error('❌ [Store] 设置事件监听器失败，已达到最大重试次数')
    },

    /**
     * 设置流式响应监听器
     */
    setupStreamListeners() {
      if (!window.nimbria?.llmChat) {
        console.warn('⚠️ [Store] window.nimbria.llmChat 不可用')
        return
      }

      console.log('🔧 [Store] 设置事件监听器...')
      
      // 调试：列出 llmChat 对象的所有属性
      console.log('🔍 [Store] llmChat 对象属性:', Object.keys(window.nimbria.llmChat))
      console.log('🔍 [Store] onConversationStart 类型:', typeof window.nimbria.llmChat.onConversationStart)
      console.log('🔍 [Store] onConversationCreated 类型:', typeof window.nimbria.llmChat.onConversationCreated)
      console.log('🔍 [Store] onConversationError 类型:', typeof window.nimbria.llmChat.onConversationError)

      // 监听对话创建开始
      if (window.nimbria.llmChat.onConversationStart) {
        console.log('✅ [Store] 设置 onConversationStart 监听器')
        window.nimbria.llmChat.onConversationStart((data: any) => {
          console.log('🚀 [Store] 对话创建开始:', data.conversationId)
          // 可以在这里显示加载状态
        })
      } else {
        console.warn('❌ [Store] onConversationStart 方法不存在')
      }

      // 监听对话创建成功
      if (window.nimbria.llmChat.onConversationCreated) {
        console.log('✅ [Store] 设置 onConversationCreated 监听器')
        window.nimbria.llmChat.onConversationCreated((data: any) => {
          console.log('✅ [Store] 对话创建成功:', data.conversationId)
          
          // 添加到对话列表
          this.conversations.push(data.conversation)
          
          // 设置为活跃对话
          this.activeConversationId = data.conversationId
        })
      } else {
        console.warn('❌ [Store] onConversationCreated 方法不存在')
      }

      // 监听对话创建错误
      if (window.nimbria.llmChat.onConversationError) {
        console.log('✅ [Store] 设置 onConversationError 监听器')
        window.nimbria.llmChat.onConversationError((data: any) => {
          console.error('❌ [Store] 对话创建失败:', data.conversationId, data.error)
          
          // 处理模型相关错误，显示用户友好的提示
          if (this.isModelNotFoundError(data.error)) {
            // 动态导入 ElMessage 避免循环依赖
            import('element-plus').then(({ ElMessage }) => {
              ElMessage.error('请先配置并选择一个模型')
            }).catch(() => {
              console.error('无法显示错误提示')
            })
          } else {
            // 其他错误的通用处理
            import('element-plus').then(({ ElMessage }) => {
              ElMessage.error('创建对话失败：' + (data.error || '未知错误'))
            }).catch(() => {
              console.error('无法显示错误提示')
            })
          }
        })
      } else {
        console.warn('❌ [Store] onConversationError 方法不存在')
      }

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
          
          // ❌ 移除重复加载：对话已经在 onConversationCreated 中添加
          // 消息会通过流式事件实时更新，不需要重新加载整个对话
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
        
        // 尝试从数据库加载
        const projectPath = this.getCurrentProjectPath()
        console.log('🔍 [Store] 当前项目路径:', projectPath)
        console.log('🔍 [Store] database API 可用性:', !!window.nimbria?.database?.llmGetConversations)
        
        if (projectPath && window.nimbria?.database?.llmGetConversations) {
          console.log('📂 [Store] 从数据库加载对话...')
          // 使用数据库加载
          const response = await window.nimbria.database.llmGetConversations({ projectPath })
          console.log('📂 [Store] 数据库响应:', response)
          
          if (response.success && response.conversations) {
            this.conversations = response.conversations
            console.log('✅ [Store] 从数据库加载了', response.conversations.length, '个对话')
            
            // 同步到标签页管理器
            this.syncConversationsToTabs()
            return
          } else {
            console.warn('⚠️ [Store] 数据库加载失败，回退到 IPC 方法')
          }
        } else {
          console.warn('⚠️ [Store] 项目路径或数据库 API 不可用，使用 IPC 方法')
        }
        
        // 备选方案：使用旧的 IPC 方法
        console.log('📞 [Store] 使用 IPC 方法加载对话...')
        const response = await window.nimbria.llmChat.getConversations()
        console.log('📞 [Store] IPC 响应:', response)
        
        if (response.success && response.conversations) {
          this.conversations = response.conversations
          console.log('✅ [Store] 从 IPC 加载了', response.conversations.length, '个对话')
          
          // 同步到标签页管理器
          this.syncConversationsToTabs()
        }
      } catch (error) {
        console.error('❌ [Store] 加载对话列表失败:', error)
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
        
        // ✅ 修复：使用 response.data 而不是 response.conversation
        if (response.success && response.data) {
          const index = this.conversations.findIndex(c => c.id === conversationId)
          if (index !== -1) {
            this.conversations[index] = response.data
          } else {
            this.conversations.push(response.data)
          }
        }
      } catch (error) {
        console.error('加载对话失败:', error)
      }
    },

    /**
     * 🔥 按ID加载单个对话（用于窗口拆分、标签页恢复等场景）
     * 这个方法会加载完整的对话数据包括消息历史
     */
    async loadConversationById(conversationId: string): Promise<Conversation> {
      console.log('[Store] Loading conversation by ID:', conversationId)
      
      // 1. 检查是否已加载
      const existing = this.conversations.find(c => c.id === conversationId)
      if (existing) {
        console.log('[Store] Conversation already loaded, setting as active')
        this.activeConversationId = conversationId
        return existing
      }
      
      try {
        // 2. 从后端加载对话基本信息
        const convResponse = await window.nimbria.llmChat.getConversation(conversationId)
        if (!convResponse.success || !convResponse.data) {
          throw new Error('对话不存在')
        }
        
        console.log('[Store] Conversation loaded:', convResponse.data)
        
        // 3. 加载消息历史
        console.log('[Store] Loading messages for conversation:', conversationId)
        const messagesResponse = await window.nimbria.llmChat.getMessages(conversationId)
        const messages = messagesResponse.success ? (messagesResponse.data || []) : []
        
        console.log('[Store] Messages loaded:', messages.length)
        
        // 4. 构建完整的对话对象
        const conversation: Conversation = {
          ...convResponse.data,
          messages
        }
        
        // 5. 添加到 conversations 列表
        this.conversations.push(conversation)
        
        // 6. 设置为活跃对话
        this.activeConversationId = conversationId
        
        console.log('[Store] Conversation loaded and set as active:', conversationId)
        
        return conversation
      } catch (error) {
        console.error('[Store] Failed to load conversation:', error)
        throw error
      }
    },

    /**
     * 创建新对话（事件驱动模式）
     */
    async createConversation(modelId?: string): Promise<string | null> {
      try {
        const selectedModelId = modelId || this.selectedModels[0]
        
        // 取消前端检查，让后端处理验证
        const response = await window.nimbria.llmChat.createConversation({
          modelId: selectedModelId || '' // 确保不传undefined
        })

        if (response.success && response.conversationId) {
          // 立即激活新创建的对话（Element Plus Tabs 会自动切换）
          this.activeConversationId = response.conversationId
          return response.conversationId
        }

        // 如果后端返回失败，在这里处理特定错误
        if (response.error && this.isModelNotFoundError(response.error)) {
          throw new Error('请先配置并选择一个模型')
        }

        return null
      } catch (error) {
        console.error('创建对话失败:', error)
        throw error // 重新抛出错误，让UI层处理
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

    /**
     * 检查错误是否为模型未找到相关错误
     */
    isModelNotFoundError(errorMessage: string): boolean {
      return errorMessage.includes('Provider') && 
             errorMessage.includes('not found') ||
             errorMessage.includes('模型') ||
             errorMessage.includes('model')
    },

    /**
     * 搜索对话
     */
    async searchConversations(query: string) {
      try {
        this.isLoading = true
        
        // 获取当前项目路径
        const projectPath = this.getCurrentProjectPath()
        
        if (!projectPath) {
          console.error('无法获取项目路径')
          return
        }
        
        // 调用数据库搜索
        const response = await window.nimbria.database.llmSearchConversations({
          projectPath,
          query
        })
        
        if (response.success && response.conversations) {
          this.conversations = response.conversations
        }
      } catch (error) {
        console.error('搜索对话失败:', error)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 设置外部项目路径（用于新窗口等场景）
     */
    setProjectPath(projectPath: string) {
      this.externalProjectPath = projectPath
      console.log('✅ [Store] 设置外部项目路径:', projectPath)
    },

    /**
     * 获取当前项目路径
     */
    getCurrentProjectPath(): string {
      try {
        // 🔥 优先使用外部设置的项目路径
        if (this.externalProjectPath) {
          console.log('🔍 [Store] 使用外部项目路径:', this.externalProjectPath)
          return this.externalProjectPath
        }
        
        // 从 window 对象获取（project-preload.ts 中的实现）
        if (window.nimbria?.getCurrentProjectPath) {
          const projectPath = window.nimbria.getCurrentProjectPath()
          console.log('🔍 [Store] getCurrentProjectPath 返回:', projectPath)
          return projectPath || ''
        }
        
        // 备选方案：从 localStorage 获取
        const lastProjectPath = localStorage.getItem('nimbria_last_project_path')
        console.log('🔍 [Store] localStorage 项目路径:', lastProjectPath)
        return lastProjectPath || ''
      } catch (error) {
        console.error('❌ [Store] 获取项目路径失败:', error)
        return ''
      }
    },

    /**
     * 同步对话到标签页管理器
     */
    /**
     * 同步对话到标签页（不再需要，Element Plus Tabs 会自动同步）
     * 保留方法体以防其他地方调用，但内部为空
     */
    syncConversationsToTabs() {
      // Element Plus Tabs 组件会自动根据 conversations 数组渲染标签页
      // 不再需要单独的标签页管理器
      console.log('✅ [Store] 对话数据已就绪，共', this.conversations.length, '个对话')
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

