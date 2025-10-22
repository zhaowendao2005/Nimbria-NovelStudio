## 📋 分析总结

### 现有架构状况

1. **LLM Chat 当前存储方式**：使用 LocalStorage 通过 IPC 通信存储对话数据
2. **数据库系统**：已有完整的双层数据库架构（全局 + 项目数据库）
3. **事件驱动架构**：两个系统都遵循事件驱动范式
4. **数据模型**：LLM Chat 有完整的类型定义和数据结构

### 集成目标

将 LLM Chat 的对话和历史数据从 LocalStorage 迁移到项目数据库中，实现：
- 对话数据持久化到 SQLite 数据库
- 跨窗口数据同步
- 更好的数据管理和查询性能
- 与项目数据的统一管理

## 🏗️ 实现方案

### 1. 数据库 Schema 扩展

首先需要在项目数据库中添加 LLM Chat 相关的表：

```typescript
// 文件：Nimbria/src-electron/services/database-service/schema/versions/v1.1.0.schema.ts

/**
 * Database Schema v1.1.0
 * 添加 LLM Chat 支持
 */

import type { SchemaDefinition, TableDefinition } from '../base-schema'
import { PROJECT_TABLES as V1_0_0_TABLES } from './v1.0.0.schema'

// ========== LLM Chat 相关表 ==========

const LLM_CHAT_TABLES: TableDefinition[] = [
  {
    name: 'llm_conversations',
    sql: `CREATE TABLE IF NOT EXISTS llm_conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新对话',
      model_id TEXT NOT NULL,
      settings_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_llm_conversations_model ON llm_conversations(model_id)`,
      `CREATE INDEX IF NOT EXISTS idx_llm_conversations_updated ON llm_conversations(updated_at)`
    ]
  },
  {
    name: 'llm_messages',
    sql: `CREATE TABLE IF NOT EXISTS llm_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
      content TEXT NOT NULL,
      metadata_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES llm_conversations(id) ON DELETE CASCADE
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_llm_messages_conversation ON llm_messages(conversation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_llm_messages_role ON llm_messages(role)`,
      `CREATE INDEX IF NOT EXISTS idx_llm_messages_created ON llm_messages(created_at)`
    ]
  },
  {
    name: 'llm_conversation_stats',
    sql: `CREATE TABLE IF NOT EXISTS llm_conversation_stats (
      conversation_id TEXT PRIMARY KEY,
      message_count INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES llm_conversations(id) ON DELETE CASCADE
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_llm_stats_activity ON llm_conversation_stats(last_activity)`
    ]
  }
]

// ========== 合并所有表 ==========

const PROJECT_TABLES_V1_1_0: TableDefinition[] = [
  ...V1_0_0_TABLES,
  ...LLM_CHAT_TABLES
]

export const PROJECT_SCHEMA_V1_1_0: SchemaDefinition = {
  version: '1.1.0',
  tables: PROJECT_TABLES_V1_1_0,
  description: 'Project database schema v1.1.0 - Added LLM Chat support'
}
```

### 2. 数据库操作层扩展

扩展 `ProjectDatabase` 类，添加 LLM Chat 相关的数据操作方法：

```typescript
// 文件：Nimbria/src-electron/services/database-service/project-database.ts
// 在现有类中添加以下方法

// ========== LLM Chat 数据操作 ==========

/**
 * LLM Chat 相关类型定义
 */
interface DbConversation {
  id: string
  title: string
  model_id: string
  settings_json: string
  created_at: string
  updated_at: string
}

interface DbMessage {
  id: string
  conversation_id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  metadata_json?: string
  created_at: string
}

/**
 * 创建对话
 */
async createConversation(conversation: {
  id: string
  title: string
  modelId: string
  settings: any
}): Promise<void> {
  this.execute(
    `INSERT INTO llm_conversations (id, title, model_id, settings_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      conversation.id,
      conversation.title,
      conversation.modelId,
      JSON.stringify(conversation.settings)
    ]
  )

  // 初始化统计
  this.execute(
    `INSERT INTO llm_conversation_stats (conversation_id, message_count, total_tokens, last_activity)
     VALUES (?, 0, 0, CURRENT_TIMESTAMP)`,
    [conversation.id]
  )
}

/**
 * 获取所有对话
 */
async getConversations(): Promise<any[]> {
  const rows = this.query(`
    SELECT c.*, s.message_count, s.total_tokens, s.last_activity
    FROM llm_conversations c
    LEFT JOIN llm_conversation_stats s ON c.id = s.conversation_id
    ORDER BY c.updated_at DESC
  `) as (DbConversation & { message_count: number; total_tokens: number; last_activity: string })[]

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    modelId: row.model_id,
    settings: JSON.parse(row.settings_json),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    messageCount: row.message_count,
    totalTokens: row.total_tokens,
    lastActivity: new Date(row.last_activity),
    messages: [] // 消息需要单独加载
  }))
}

/**
 * 获取单个对话（包含消息）
 */
async getConversation(conversationId: string): Promise<any | null> {
  const conversation = this.queryOne(
    'SELECT * FROM llm_conversations WHERE id = ?',
    [conversationId]
  ) as DbConversation | null

  if (!conversation) return null

  const messages = this.query(
    'SELECT * FROM llm_messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId]
  ) as DbMessage[]

  return {
    id: conversation.id,
    title: conversation.title,
    modelId: conversation.model_id,
    settings: JSON.parse(conversation.settings_json),
    createdAt: new Date(conversation.created_at),
    updatedAt: new Date(conversation.updated_at),
    messages: messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.created_at),
      metadata: msg.metadata_json ? JSON.parse(msg.metadata_json) : undefined
    }))
  }
}

/**
 * 更新对话标题
 */
async updateConversationTitle(conversationId: string, title: string): Promise<void> {
  this.execute(
    'UPDATE llm_conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [title, conversationId]
  )
}

/**
 * 更新对话设置
 */
async updateConversationSettings(conversationId: string, settings: any): Promise<void> {
  this.execute(
    'UPDATE llm_conversations SET settings_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [JSON.stringify(settings), conversationId]
  )
}

/**
 * 删除对话
 */
async deleteConversation(conversationId: string): Promise<void> {
  this.transaction(() => {
    // 删除消息（由于外键约束会自动删除）
    this.execute('DELETE FROM llm_messages WHERE conversation_id = ?', [conversationId])
    // 删除统计
    this.execute('DELETE FROM llm_conversation_stats WHERE conversation_id = ?', [conversationId])
    // 删除对话
    this.execute('DELETE FROM llm_conversations WHERE id = ?', [conversationId])
  })
}

/**
 * 添加消息
 */
async addMessage(message: {
  id: string
  conversationId: string
  role: 'system' | 'user' | 'assistant'
  content: string
  metadata?: any
}): Promise<void> {
  this.transaction(() => {
    // 插入消息
    this.execute(
      `INSERT INTO llm_messages (id, conversation_id, role, content, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        message.id,
        message.conversationId,
        message.role,
        message.content,
        message.metadata ? JSON.stringify(message.metadata) : null
      ]
    )

    // 更新对话的更新时间
    this.execute(
      'UPDATE llm_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [message.conversationId]
    )

    // 更新统计
    this.execute(
      `UPDATE llm_conversation_stats 
       SET message_count = message_count + 1, last_activity = CURRENT_TIMESTAMP 
       WHERE conversation_id = ?`,
      [message.conversationId]
    )
  })
}

/**
 * 删除消息
 */
async deleteMessage(conversationId: string, messageId: string): Promise<void> {
  this.transaction(() => {
    this.execute('DELETE FROM llm_messages WHERE id = ? AND conversation_id = ?', [messageId, conversationId])
    
    // 更新统计
    this.execute(
      `UPDATE llm_conversation_stats 
       SET message_count = message_count - 1, last_activity = CURRENT_TIMESTAMP 
       WHERE conversation_id = ?`,
      [conversationId]
    )
  })
}

/**
 * 获取对话消息
 */
async getConversationMessages(conversationId: string): Promise<any[]> {
  const messages = this.query(
    'SELECT * FROM llm_messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId]
  ) as DbMessage[]

  return messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: new Date(msg.created_at),
    metadata: msg.metadata_json ? JSON.parse(msg.metadata_json) : undefined
  }))
}
```

### 3. ConversationManager 重构

将 `ConversationManager` 从使用 LocalStorage 改为使用数据库：

```typescript
// 文件：Nimbria/src-electron/services/llm-chat-service/conversation-manager.ts
// 完全重写这个文件

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
  }

  /**
   * 初始化：从数据库加载对话
   */
  async initialize(): Promise<void> {
    if (!this.projectDatabase) {
      console.warn('Project database not set, skipping conversation initialization')
      return
    }

    try {
      const conversations = await this.projectDatabase.getConversations()
      
      // 将加载的对话转换为 Map
      for (const conv of conversations) {
        this.conversations.set(conv.id, conv)
      }

      console.log(`Loaded ${this.conversations.size} conversations from database`)
    } catch (error) {
      console.error('Failed to load conversations from database:', error)
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

    const conversation = await this.projectDatabase.getConversation(conversationId)
    if (conversation) {
      this.conversations.set(conversationId, conversation)
    }
  }
}
```

### 4. LlmChatService 修改

修改 `LlmChatService` 以支持数据库集成：

```typescript
// 文件：Nimbria/src-electron/services/llm-chat-service/llm-chat-service.ts
// 修改构造函数和初始化方法

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
    // 如果有项目路径，设置项目数据库
    if (projectPath && this.databaseService) {
      const projectDb = this.databaseService.getProjectDatabase(projectPath)
      if (projectDb) {
        this.conversationManager.setProjectDatabase(projectDb)
        console.log('LlmChatService: 已设置项目数据库')
      } else {
        console.warn('LlmChatService: 项目数据库未找到，将创建')
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

    console.log('LlmChatService initialized')
  }

  /**
   * 切换项目（重要：当用户切换项目时调用）
   */
  async switchProject(projectPath: string): Promise<void> {
    console.log('LlmChatService: 切换项目到', projectPath)
    
    // 清理当前状态
    this.activeClients.clear()
    
    // 设置新的项目数据库
    const projectDb = this.databaseService.getProjectDatabase(projectPath)
    if (projectDb) {
      this.conversationManager.setProjectDatabase(projectDb)
      await this.conversationManager.initialize()
    } else {
      console.warn('项目数据库未找到，等待创建...')
    }
  }

  // ... 其他方法保持不变
}
```

### 5. IPC 处理器扩展

扩展数据库 IPC 处理器，添加 LLM Chat 相关的数据库操作：

```typescript
// 文件：Nimbria/src-electron/ipc/main-renderer/database-handlers.ts
// 在现有文件中添加以下处理器

// ========== LLM Chat 数据库操作 ==========

// 获取对话列表
ipcMain.handle('database:llm-get-conversations', async (_event, { projectPath }) => {
  try {
    console.log('🔵 [IPC] 调用: database:llm-get-conversations')
    const projectDb = databaseService.getProjectDatabase(projectPath)
    if (!projectDb) {
      return { success: false, error: 'Project database not found' }
    }
    
    const conversations = await projectDb.getConversations()
    return { success: true, conversations }
  } catch (error: any) {
    console.error('❌ [IPC] database:llm-get-conversations 失败:', error)
    return { success: false, error: error.message }
  }
})

// 获取单个对话
ipcMain.handle('database:llm-get-conversation', async (_event, { projectPath, conversationId }) => {
  try {
    console.log('🔵 [IPC] 调用: database:llm-get-conversation')
    const projectDb = databaseService.getProjectDatabase(projectPath)
    if (!projectDb) {
      return { success: false, error: 'Project database not found' }
    }
    
    const conversation = await projectDb.getConversation(conversationId)
    return { success: true, conversation }
  } catch (error: any) {
    console.error('❌ [IPC] database:llm-get-conversation 失败:', error)
    return { success: false, error: error.message }
  }
})

// 创建对话
ipcMain.handle('database:llm-create-conversation', async (_event, { projectPath, conversation }) => {
  try {
    console.log('🔵 [IPC] 调用: database:llm-create-conversation')
    const projectDb = databaseService.getProjectDatabase(projectPath)
    if (!projectDb) {
      return { success: false, error: 'Project database not found' }
    }
    
    await projectDb.createConversation(conversation)
    return { success: true }
  } catch (error: any) {
    console.error('❌ [IPC] database:llm-create-conversation 失败:', error)
    return { success: false, error: error.message }
  }
})

// 添加消息
ipcMain.handle('database:llm-add-message', async (_event, { projectPath, message }) => {
  try {
    console.log('🔵 [IPC] 调用: database:llm-add-message')
    const projectDb = databaseService.getProjectDatabase(projectPath)
    if (!projectDb) {
      return { success: false, error: 'Project database not found' }
    }
    
    await projectDb.addMessage(message)
    return { success: true }
  } catch (error: any) {
    console.error('❌ [IPC] database:llm-add-message 失败:', error)
    return { success: false, error: error.message }
  }
})

// 删除对话
ipcMain.handle('database:llm-delete-conversation', async (_event, { projectPath, conversationId }) => {
  try {
    console.log('🔵 [IPC] 调用: database:llm-delete-conversation')
    const projectDb = databaseService.getProjectDatabase(projectPath)
    if (!projectDb) {
      return { success: false, error: 'Project database not found' }
    }
    
    await projectDb.deleteConversation(conversationId)
    return { success: true }
  } catch (error: any) {
    console.error('❌ [IPC] database:llm-delete-conversation 失败:', error)
    return { success: false, error: error.message }
  }
})
```

### 6. 前端 Store 修改

修改前端的 LLM Chat Store，移除 LocalStorage 依赖：

```typescript
// 文件：Nimbria/Client/stores/llmChat/llmChatStore.ts
// 修改相关方法

// 移除 LocalStorage 相关代码，改为使用数据库 API

/**
 * 加载所有对话
 */
async loadConversations() {
  try {
    this.isLoading = true
    
    // 获取当前项目路径
    const projectPath = this.getCurrentProjectPath() // 需要实现这个方法
    
    const response = await window.nimbria.database.llmGetConversations({ projectPath })
    
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
 * 创建新对话
 */
async createConversation(modelId?: string): Promise<string | null> {
  try {
    const selectedModelId = modelId || this.selectedModels[0]
    if (!selectedModelId) {
      console.error('没有选择模型')
      return null
    }

    // 先通过 LLM Chat Service 创建对话
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

// 移除所有 LocalStorage 相关的方法
// saveUISettings() 和 loadUISettings() 保留，但只保存 UI 状态
```

### 7. 服务注册修改

修改应用管理器，确保服务正确初始化：

```typescript
// 文件：Nimbria/src-electron/core/app-manager.ts
// 在服务初始化部分添加

// 初始化 LLM Chat 服务时传入数据库服务
const llmChatService = new LlmChatService(
  llmConfigManager,
  databaseService, // 传入数据库服务
  conversationManager,
  contextManager
)

// 在项目窗口创建时，通知 LLM Chat 服务切换项目
ipcMain.handle('project:create-window', async (event, { projectPath }) => {
  // ... 现有代码 ...
  
  // 通知 LLM Chat 服务切换项目
  await llmChatService.switchProject(projectPath)
  
  // ... 现有代码 ...
})
```

## 📁 文件架构修改树

```
Nimbria/
├── src-electron/
│   ├── services/
│   │   ├── database-service/
│   │   │   ├── schema/versions/
│   │   │   │   ├── v1.1.0.schema.ts          # 🆕 新增 LLM Chat 表定义
│   │   │   │   └── index.ts                   # 🔄 更新版本导出
│   │   │   └── project-database.ts            # 🔄 添加 LLM Chat 操作方法
│   │   └── llm-chat-service/
│   │       ├── llm-chat-service.ts            # 🔄 修改构造函数和初始化
│   │       └── conversation-manager.ts        # 🔄 完全重写，使用数据库
│   ├── ipc/main-renderer/
│   │   └── database-handlers.ts               # 🔄 添加 LLM Chat 数据库操作
│   └── core/
│       └── app-manager.ts                     # 🔄 修改服务初始化
├── Client/
│   ├── stores/llmChat/
│   │   └── llmChatStore.ts                    # 🔄 移除 LocalStorage，使用数据库 API
│   └── types/
│       └── core/window.d.ts                   # 🔄 添加数据库 API 类型定义
└── Document/
    └── 功能与架构设计/
        └── 数据服务专项/
            └── LLM-Chat数据库集成设计文档.md  # 🆕 新增设计文档
```

## 🔄 迁移策略

### 1. 数据迁移

为现有用户提供从 LocalStorage 到数据库的数据迁移：

```typescript
// 文件：Nimbria/src-electron/services/llm-chat-service/migration.ts

export class LlmChatMigration {
  /**
   * 从 LocalStorage 迁移数据到数据库
   */
  async migrateFromLocalStorage(
    projectDb: ProjectDatabase,
    localStorageData: any
  ): Promise<void> {
    console.log('开始迁移 LLM Chat 数据...')
    
    if (!localStorageData?.conversations) {
      console.log('没有需要迁移的数据')
      return
    }

    const conversations = localStorageData.conversations
    let migratedCount = 0

    for (const conv of conversations) {
      try {
        // 创建对话
        await projectDb.createConversation({
          id: conv.id,
          title: conv.title,
          modelId: conv.modelId,
          settings: conv.settings
        })

        // 迁移消息
        for (const msg of conv.messages) {
          await projectDb.addMessage({
            id: msg.id,
            conversationId: conv.id,
            role: msg.role,
            content: msg.content,
            metadata: msg.metadata
          })
        }

        migratedCount++
      } catch (error) {
        console.error(`迁移对话 ${conv.id} 失败:`, error)
      }
    }

    console.log(`成功迁移 ${migratedCount} 个对话`)
  }
}
```

### 2. 版本兼容性

确保新版本能够处理旧版本的数据：

```typescript
// 在 DatabaseManager 中添加版本检查和升级逻辑
async applySchema(db: Database.Database, schema: SchemaDefinition): Promise<void> {
  // 检查当前版本
  const currentVersion = this.getCurrentSchemaVersion(db)
  
  if (currentVersion === '1.0.0' && schema.version === '1.1.0') {
    console.log('检测到需要升级到 v1.1.0，添加 LLM Chat 表...')
    
    // 只创建新增的表
    const llmChatTables = schema.tables.filter(table => 
      table.name.startsWith('llm_')
    )
    
    for (const table of llmChatTables) {
      console.log(`创建表: ${table.name}`)
      db.exec(table.sql)
      
      if (table.indexes) {
        for (const index of table.indexes) {
          db.exec(index)
        }
      }
    }
  }
  
  // 更新版本号
  this.updateSchemaVersion(db, schema.version)
}
```

## ⚠️ 注意事项

1. **数据一致性**：确保在事务中执行相关的数据库操作
2. **错误处理**：添加完善的错误处理和回滚机制
3. **性能优化**：对频繁查询的字段添加索引
4. **内存管理**：避免在内存中缓存过多对话数据
5. **并发控制**：处理多窗口同时操作同一对话的情况

## 🎨 LLM Chat 交互重构设计

### 问题分析

当前 LLM Chat 的交互设计存在以下问题：

1. **标签页关闭 = 删除对话**：关闭标签页会直接删除对话记录，这在数据库持久化后是不合理的
2. **缺乏历史管理**：用户无法方便地查看和管理历史对话
3. **对话发现性差**：没有搜索功能，难以找到特定的历史对话
4. **标签页管理混乱**：对话管理和 UI 标签页管理耦合过紧

### 新的交互设计方案

#### 1. 分离对话管理和标签页管理

```
对话数据层 (Database)
    ↓
对话管理层 (ConversationManager)
    ↓
标签页显示层 (UI Tabs)
```

**核心原则**：
- 对话数据独立存储，不受标签页影响
- 标签页只是对话的"视图窗口"
- 关闭标签页不删除对话，只是隐藏显示

#### 2. 新的 UI 交互流程

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM Chat 面板                            │
├─────────────────────────────────────────────────────────────┤
│ [+ 创建新对话] [📋 历史记录] [⚙️ 设置]                        │
├─────────────────────────────────────────────────────────────┤
│ 标签页区域：                                                │
│ ┌─────────────┐ ┌─────────────┐                             │
│ │ 新对话   [×]│ │ GPT-4讨论[×]│  ← 关闭标签页不删除对话      │
│ └─────────────┘ └─────────────┘                             │
├─────────────────────────────────────────────────────────────┤
│                   对话内容区域                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3. 历史记录对话框设计

点击"历史记录"按钮后弹出对话框：

```vue
<template>
  <q-dialog v-model="showHistoryDialog" persistent>
    <q-card style="width: 800px; max-width: 90vw; height: 600px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">对话历史</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="showHistoryDialog = false" />
      </q-card-section>

      <!-- 搜索栏 -->
      <q-card-section class="q-pt-none">
        <q-input
          v-model="searchQuery"
          placeholder="搜索对话标题或内容..."
          outlined
          dense
          clearable
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </q-card-section>

      <!-- 对话列表 -->
      <q-card-section class="q-pt-none" style="height: 400px">
        <q-scroll-area style="height: 100%">
          <q-list separator>
            <q-item
              v-for="conversation in filteredConversations"
              :key="conversation.id"
              clickable
              @click="openConversation(conversation)"
            >
              <q-item-section>
                <q-item-label>{{ conversation.title }}</q-item-label>
                <q-item-label caption>
                  {{ conversation.modelId }} • 
                  {{ conversation.messageCount }} 条消息 • 
                  {{ formatDate(conversation.updatedAt) }}
                </q-item-label>
              </q-item-section>
              
              <q-item-section side>
                <div class="row items-center">
                  <q-btn
                    flat
                    round
                    dense
                    icon="edit"
                    size="sm"
                    @click.stop="editConversationTitle(conversation)"
                  >
                    <q-tooltip>重命名</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    size="sm"
                    color="negative"
                    @click.stop="deleteConversation(conversation.id)"
                  >
                    <q-tooltip>删除对话</q-tooltip>
                  </q-btn>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-scroll-area>
      </q-card-section>

      <!-- 底部操作 -->
      <q-card-actions align="right">
        <q-btn flat label="清空所有历史" color="negative" @click="clearAllHistory" />
        <q-btn flat label="关闭" @click="showHistoryDialog = false" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
```

#### 4. 标签页管理重构

**新的标签页行为**：

```typescript
// 标签页状态管理
interface ChatTab {
  id: string                    // 标签页 ID（不等于对话 ID）
  conversationId: string        // 关联的对话 ID
  title: string                 // 显示标题
  isActive: boolean            // 是否激活
  isDirty: boolean             // 是否有未保存内容
}

// 标签页操作
class ChatTabManager {
  private tabs: ChatTab[] = []
  private activeTabId: string | null = null

  // 打开对话（创建新标签页或激活已有标签页）
  openConversation(conversationId: string): void {
    const existingTab = this.tabs.find(tab => tab.conversationId === conversationId)
    
    if (existingTab) {
      // 激活已有标签页
      this.setActiveTab(existingTab.id)
    } else {
      // 创建新标签页
      const newTab: ChatTab = {
        id: nanoid(),
        conversationId,
        title: this.getConversationTitle(conversationId),
        isActive: true,
        isDirty: false
      }
      this.tabs.push(newTab)
      this.setActiveTab(newTab.id)
    }
  }

  // 关闭标签页（不删除对话）
  closeTab(tabId: string): void {
    const tabIndex = this.tabs.findIndex(tab => tab.id === tabId)
    if (tabIndex === -1) return

    const tab = this.tabs[tabIndex]
    
    // 如果有未保存内容，提示用户
    if (tab.isDirty) {
      this.confirmCloseTab(tab)
      return
    }

    // 移除标签页
    this.tabs.splice(tabIndex, 1)

    // 如果关闭的是活动标签页，激活其他标签页
    if (tab.isActive && this.tabs.length > 0) {
      const newActiveIndex = Math.min(tabIndex, this.tabs.length - 1)
      this.setActiveTab(this.tabs[newActiveIndex].id)
    }
  }

  // 删除对话（需要确认）
  async deleteConversation(conversationId: string): Promise<void> {
    const confirmed = await this.confirmDeleteConversation(conversationId)
    if (!confirmed) return

    // 关闭相关标签页
    const relatedTabs = this.tabs.filter(tab => tab.conversationId === conversationId)
    relatedTabs.forEach(tab => this.closeTab(tab.id))

    // 删除对话数据
    await this.conversationService.deleteConversation(conversationId)
  }
}
```

#### 5. 搜索功能实现

```typescript
// 搜索功能
class ConversationSearchService {
  // 搜索对话
  async searchConversations(query: string, options?: SearchOptions): Promise<Conversation[]> {
    if (!query.trim()) {
      return this.getAllConversations()
    }

    const conversations = await this.getAllConversations()
    
    return conversations.filter(conv => {
      // 搜索标题
      if (conv.title.toLowerCase().includes(query.toLowerCase())) {
        return true
      }

      // 搜索模型名称
      if (conv.modelId.toLowerCase().includes(query.toLowerCase())) {
        return true
      }

      // 搜索消息内容（可选，性能考虑）
      if (options?.searchContent) {
        return conv.messages.some(msg => 
          msg.content.toLowerCase().includes(query.toLowerCase())
        )
      }

      return false
    })
  }

  // 高级搜索
  async advancedSearch(criteria: SearchCriteria): Promise<Conversation[]> {
    // 实现基于时间范围、模型类型、消息数量等的高级搜索
  }
}

interface SearchOptions {
  searchContent?: boolean       // 是否搜索消息内容
  dateRange?: [Date, Date]     // 时间范围
  modelTypes?: string[]        // 模型类型过滤
}
```

#### 6. 数据库查询优化

为了支持搜索功能，需要优化数据库查询：

```sql
-- 添加全文搜索索引
CREATE VIRTUAL TABLE IF NOT EXISTS llm_conversations_fts USING fts5(
  id UNINDEXED,
  title,
  content='llm_conversations',
  content_rowid='rowid'
);

-- 为消息内容创建全文搜索
CREATE VIRTUAL TABLE IF NOT EXISTS llm_messages_fts USING fts5(
  id UNINDEXED,
  conversation_id UNINDEXED,
  content,
  content='llm_messages',
  content_rowid='rowid'
);

-- 搜索查询示例
SELECT DISTINCT c.* 
FROM llm_conversations c
LEFT JOIN llm_conversations_fts cf ON c.rowid = cf.rowid
LEFT JOIN llm_messages m ON c.id = m.conversation_id
LEFT JOIN llm_messages_fts mf ON m.rowid = mf.rowid
WHERE cf.title MATCH ? OR mf.content MATCH ?
ORDER BY c.updated_at DESC;
```

### 实现优先级

1. **P0 - 核心重构**
   - 分离标签页管理和对话管理
   - 修改关闭标签页逻辑
   - 基础历史记录对话框

2. **P1 - 搜索功能**
   - 标题和模型搜索
   - 基础过滤功能
   - 搜索结果高亮

3. **P2 - 高级功能**
   - 全文搜索（消息内容）
   - 高级过滤选项
   - 搜索历史记录

4. **P3 - 用户体验优化**
   - 搜索建议
   - 快捷键支持
   - 搜索性能优化

### 文件修改清单

```
Client/GUI/components/ProjectPage.Shell/Navbar.content/LlmChat/
├── LlmChatPanel.vue                    # 🔄 主面板重构
├── ChatTabs.vue                        # 🔄 标签页管理重构
├── ChatHistoryDialog.vue               # 🆕 历史记录对话框
├── ChatSearchBar.vue                   # 🆕 搜索组件
└── types.ts                            # 🔄 添加新类型定义

Client/stores/llmChat/
├── llmChatStore.ts                     # 🔄 添加标签页管理状态
├── chatTabManager.ts                   # 🆕 标签页管理器
└── conversationSearchService.ts        # 🆕 搜索服务

src-electron/services/database-service/
├── project-database.ts                 # 🔄 添加搜索查询方法
└── schema/versions/v1.1.0.schema.ts    # 🔄 添加全文搜索表
```

## 🧪 测试策略

1. **单元测试**：测试数据库操作方法
2. **集成测试**：测试完整的对话创建和消息发送流程
3. **迁移测试**：测试从 LocalStorage 到数据库的数据迁移
4. **性能测试**：测试大量对话和消息的查询性能
5. **交互测试**：测试新的标签页管理和历史记录功能
6. **搜索测试**：测试各种搜索场景的准确性和性能
