## 📋 TerminusDB 集成计划
基于您集成 SQLite 的经验，我将制定一个结构相似的集成方案。

---

## 🎯 集成目标

1. ✅ **一个项目一个 TerminusDB 数据库**
2. ✅ **在项目设置面板添加初始化按钮**
3. ✅ **添加浏览器访问 Web 工具的按钮**
4. ✅ **仅实现基础初始化功能，暂不做复杂的数据操作**

---

## 📁 文件结构规划

```
Nimbria/src-electron/services/terminusdb-service/
├── terminusdb-service.ts              # 主服务类（EventEmitter）
├── terminusdb-manager.ts              # TerminusDB 连接和初始化管理
├── project-terminusdb.ts              # 项目级 TerminusDB 操作封装
└── schema/
    ├── base-schema.ts                 # 基础 Schema 类型定义
    └── versions/
        ├── v1.0.0.schema.ts           # v1.0.0 版本 Schema（小说设定图结构）
        └── index.ts                   # 版本导出管理

Nimbria/src-electron/ipc/main-renderer/
└── terminusdb-handlers.ts             # IPC 处理器（事件转发）

Nimbria/Client/stores/terminusdb/
└── terminusdbStore.ts                 # 前端 TerminusDB 状态管理

Nimbria/Client/GUI/components/ProjectPage.Shell/Navbar.content/Settings/
└── SettingsPanel.vue                  # [修改] 添加 TerminusDB 按钮
```

---

## 🔧 核心实现文件

### 1. `terminusdb-service.ts` - 主服务类

```typescript
// Nimbria/src-electron/services/terminusdb-service/terminusdb-service.ts
import { EventEmitter } from 'events'
import { TerminusDBManager } from './terminusdb-manager'
import { ProjectTerminusDB } from './project-terminusdb'
import path from 'path'

interface TerminusDBServiceEvents {
  'terminusdb:init-start': { initId: string; projectPath: string }
  'terminusdb:init-complete': { initId: string; projectPath: string; success: boolean }
  'terminusdb:init-error': { initId: string; projectPath: string; error: string }
  'terminusdb:server-started': { projectPath: string; port: number }
  'terminusdb:server-stopped': { projectPath: string }
}

export class TerminusDBService extends EventEmitter {
  private terminusManager: TerminusDBManager
  private projectDatabases: Map<string, ProjectTerminusDB> = new Map()

  constructor() {
    super()
    this.terminusManager = new TerminusDBManager()
  }

  /**
   * 初始化项目的 TerminusDB 数据库
   * 立即返回操作ID，通过事件反馈状态
   */
  async initializeProjectDatabase(projectPath: string): Promise<string> {
    const initId = `terminusdb-init-${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    
    console.log(`🎬 [TerminusDBService] 开始初始化项目 TerminusDB: ${projectPath}`)
    this.emit('terminusdb:init-start', { initId, projectPath })

    setImmediate(async () => {
      try {
        // 创建项目 TerminusDB
        const projectDB = await this.terminusManager.createProjectDatabase(projectPath)
        this.projectDatabases.set(projectPath, projectDB)
        
        console.log(`✅ [TerminusDBService] 项目 TerminusDB 初始化成功: ${projectPath}`)
        this.emit('terminusdb:init-complete', { 
          initId, 
          projectPath, 
          success: true 
        })
      } catch (error: any) {
        console.error(`❌ [TerminusDBService] 项目 TerminusDB 初始化失败:`, error)
        this.emit('terminusdb:init-error', { 
          initId, 
          projectPath, 
          error: error.message 
        })
      }
    })

    return initId
  }

  /**
   * 获取 TerminusDB Web 工具的访问地址
   */
  getWebToolUrl(projectPath: string): string | null {
    const projectDB = this.projectDatabases.get(projectPath)
    if (!projectDB) {
      return null
    }
    return projectDB.getWebToolUrl()
  }

  /**
   * 获取项目数据库
   */
  getProjectDatabase(projectPath: string): ProjectTerminusDB | null {
    return this.projectDatabases.get(projectPath) || null
  }

  /**
   * 关闭项目数据库
   */
  async closeProjectDatabase(projectPath: string): Promise<void> {
    const projectDB = this.projectDatabases.get(projectPath)
    if (projectDB) {
      await projectDB.close()
      this.projectDatabases.delete(projectPath)
      console.log(`🔒 [TerminusDBService] 项目 TerminusDB 已关闭: ${projectPath}`)
    }
  }

  /**
   * 清理所有资源
   */
  async cleanup(): Promise<void> {
    console.log('🧹 [TerminusDBService] 清理 TerminusDB 服务资源...')
    
    for (const [projectPath, projectDB] of this.projectDatabases.entries()) {
      await projectDB.close()
      console.log(`  ├─ 已关闭项目数据库: ${projectPath}`)
    }
    
    this.projectDatabases.clear()
    console.log('✅ [TerminusDBService] TerminusDB 服务资源清理完成')
  }
}
```

### 2. `terminusdb-manager.ts` - 连接管理

```typescript
// Nimbria/src-electron/services/terminusdb-service/terminusdb-manager.ts
import { ProjectTerminusDB } from './project-terminusdb'
import path from 'path'
import fs from 'fs-extra'

export class TerminusDBManager {
  constructor() {}

  /**
   * 创建项目级 TerminusDB 数据库
   */
  async createProjectDatabase(projectPath: string): Promise<ProjectTerminusDB> {
    console.log(`📦 [TerminusDBManager] 创建项目 TerminusDB...`)
    console.log(`📍 [TerminusDBManager] 项目路径: ${projectPath}`)

    // 创建 .TerminusDB 目录
    const terminusDbDir = path.join(projectPath, '.TerminusDB')
    await fs.ensureDir(terminusDbDir)
    console.log(`📁 [TerminusDBManager] 创建 TerminusDB 目录: ${terminusDbDir}`)

    // 创建项目 TerminusDB 实例
    const projectDB = new ProjectTerminusDB(projectPath, terminusDbDir)
    await projectDB.initialize()

    console.log(`✅ [TerminusDBManager] 项目 TerminusDB 创建成功`)
    return projectDB
  }
}
```

### 3. `project-terminusdb.ts` - 项目数据库操作

```typescript
// Nimbria/src-electron/services/terminusdb-service/project-terminusdb.ts
import { TerminusClient } from '@terminusdb/terminusdb-client'
import path from 'path'

export class ProjectTerminusDB {
  private client: TerminusClient | null = null
  private projectPath: string
  private dbDir: string
  private dbName: string
  private serverPort: number = 6363 // TerminusDB 默认端口

  constructor(projectPath: string, dbDir: string) {
    this.projectPath = projectPath
    this.dbDir = dbDir
    // 使用项目目录名作为数据库名
    this.dbName = path.basename(projectPath).replace(/[^a-zA-Z0-9_]/g, '_')
  }

  /**
   * 初始化 TerminusDB
   */
  async initialize(): Promise<void> {
    console.log(`🚀 [ProjectTerminusDB] 初始化项目 TerminusDB: ${this.projectPath}`)
    
    try {
      // 连接到本地 TerminusDB 服务器
      this.client = new TerminusClient(`http://localhost:${this.serverPort}/`)
      
      console.log(`🔗 [ProjectTerminusDB] 连接到 TerminusDB 服务器: http://localhost:${this.serverPort}`)
      
      // 创建数据库（如果不存在）
      await this.createDatabaseIfNotExists()
      
      console.log(`✅ [ProjectTerminusDB] 项目 TerminusDB 初始化成功`)
    } catch (error: any) {
      console.error(`❌ [ProjectTerminusDB] 初始化失败:`, error)
      throw error
    }
  }

  /**
   * 创建数据库（如果不存在）
   */
  private async createDatabaseIfNotExists(): Promise<void> {
    if (!this.client) {
      throw new Error('TerminusDB client not initialized')
    }

    try {
      console.log(`📝 [ProjectTerminusDB] 创建数据库: ${this.dbName}`)
      
      await this.client.createDatabase(this.dbName, {
        label: `${this.dbName} - 小说设定数据库`,
        comment: '用于存储小说人物、组织、事件等设定的图数据库'
      })
      
      console.log(`✅ [ProjectTerminusDB] 数据库创建成功: ${this.dbName}`)
    } catch (error: any) {
      // 如果数据库已存在，忽略错误
      if (error.message && error.message.includes('already exists')) {
        console.log(`ℹ️  [ProjectTerminusDB] 数据库已存在: ${this.dbName}`)
      } else {
        throw error
      }
    }
  }

  /**
   * 获取 Web 工具访问地址
   */
  getWebToolUrl(): string {
    return `http://localhost:${this.serverPort}/`
  }

  /**
   * 获取数据库名称
   */
  getDatabaseName(): string {
    return this.dbName
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    console.log(`🔒 [ProjectTerminusDB] 关闭 TerminusDB 连接: ${this.projectPath}`)
    this.client = null
  }
}
```

### 4. `base-schema.ts` - 基础 Schema 定义

```typescript
// Nimbria/src-electron/services/terminusdb-service/schema/base-schema.ts

/**
 * TerminusDB Schema 定义接口
 */
export interface TerminusDBSchema {
  version: string
  classes: Record<string, ClassDefinition>
  description: string
}

/**
 * 类定义
 */
export interface ClassDefinition {
  '@type': 'Class'
  '@key'?: { '@type': 'Random' | 'Lexical' | 'Hash' | 'ValueHash' }
  '@documentation'?: string
  [propertyName: string]: any
}

/**
 * 属性类型
 */
export type PropertyType = 
  | 'xsd:string'
  | 'xsd:integer'
  | 'xsd:dateTime'
  | 'xsd:boolean'
  | { '@type': 'Enum'; '@values': string[] }
  | { '@type': 'Optional'; '@class': string }
  | { '@type': 'Set'; '@class': string }
  | string // 引用其他类

/**
 * 关系定义
 */
export interface RelationshipDefinition {
  from: string
  to: string
  type: string
  properties?: Record<string, PropertyType>
}
```

### 5. `v1.0.0.schema.ts` - 小说设定 Schema

```typescript
// Nimbria/src-electron/services/terminusdb-service/schema/versions/v1.0.0.schema.ts
import { TerminusDBSchema } from '../base-schema'

/**
 * TerminusDB Schema v1.0.0
 * 用于小说设定管理的图数据库结构
 */
export const TERMINUSDB_SCHEMA_V1_0_0: TerminusDBSchema = {
  version: '1.0.0',
  description: 'Novel settings management schema v1.0.0',
  
  classes: {
    // ========== 人物节点 ==========
    Character: {
      '@type': 'Class',
      '@key': { '@type': 'Random' },
      '@documentation': '小说人物',
      name: 'xsd:string',
      age: { '@type': 'Optional', '@class': 'xsd:integer' },
      gender: { '@type': 'Optional', '@class': 'xsd:string' },
      personality: { '@type': 'Optional', '@class': 'xsd:string' },
      status: { 
        '@type': 'Enum', 
        '@values': ['alive', 'dead', 'unknown'] 
      },
      description: { '@type': 'Optional', '@class': 'xsd:string' },
      created_at: 'xsd:dateTime',
      updated_at: 'xsd:dateTime'
    },

    // ========== 组织节点 ==========
    Organization: {
      '@type': 'Class',
      '@key': { '@type': 'Random' },
      '@documentation': '组织/团体',
      name: 'xsd:string',
      org_type: { '@type': 'Optional', '@class': 'xsd:string' },
      power_level: { '@type': 'Optional', '@class': 'xsd:integer' },
      description: { '@type': 'Optional', '@class': 'xsd:string' },
      founded_date: { '@type': 'Optional', '@class': 'xsd:dateTime' },
      created_at: 'xsd:dateTime'
    },

    // ========== 事件节点 ==========
    Event: {
      '@type': 'Class',
      '@key': { '@type': 'Random' },
      '@documentation': '事件/剧情节点',
      name: 'xsd:string',
      event_type: { '@type': 'Optional', '@class': 'xsd:string' },
      description: { '@type': 'Optional', '@class': 'xsd:string' },
      occurred_at: { '@type': 'Optional', '@class': 'xsd:dateTime' },
      impact_level: { '@type': 'Optional', '@class': 'xsd:integer' },
      created_at: 'xsd:dateTime'
    },

    // ========== 人物关系 ==========
    CharacterRelationship: {
      '@type': 'Class',
      '@key': { '@type': 'Random' },
      '@documentation': '人物间关系',
      from_character: 'Character',
      to_character: 'Character',
      relationship_type: {
        '@type': 'Enum',
        '@values': ['friend', 'enemy', 'lover', 'family', 'colleague', 'rival', 'unknown']
      },
      strength: { '@type': 'Optional', '@class': 'xsd:integer' },
      description: { '@type': 'Optional', '@class': 'xsd:string' },
      started_at: { '@type': 'Optional', '@class': 'xsd:dateTime' },
      created_at: 'xsd:dateTime'
    },

    // ========== 组织归属关系 ==========
    Membership: {
      '@type': 'Class',
      '@key': { '@type': 'Random' },
      '@documentation': '人物与组织的归属关系',
      character: 'Character',
      organization: 'Organization',
      role: { '@type': 'Optional', '@class': 'xsd:string' },
      joined_at: { '@type': 'Optional', '@class': 'xsd:dateTime' },
      left_at: { '@type': 'Optional', '@class': 'xsd:dateTime' },
      status: {
        '@type': 'Enum',
        '@values': ['active', 'inactive', 'expelled']
      },
      created_at: 'xsd:dateTime'
    }
  }
}
```

### 6. `terminusdb-handlers.ts` - IPC 处理器

```typescript
// Nimbria/src-electron/ipc/main-renderer/terminusdb-handlers.ts
import { ipcMain, BrowserWindow, shell } from 'electron'
import { TerminusDBService } from '../../services/terminusdb-service/terminusdb-service'

let terminusDBService: TerminusDBService

/**
 * 注册 TerminusDB IPC 处理器
 */
export function registerTerminusDBHandlers(service: TerminusDBService) {
  terminusDBService = service
  
  console.log('📡 [IPC] 注册 TerminusDB IPC 处理器...')

  // ========== 事件监听器（只注册一次） ==========
  
  // 初始化开始
  terminusDBService.on('terminusdb:init-start', (data) => {
    console.log('📢 [IPC] 广播事件: terminusdb:init-start')
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('terminusdb:init-start', data)
    })
  })

  // 初始化完成
  terminusDBService.on('terminusdb:init-complete', (data) => {
    console.log('📢 [IPC] 广播事件: terminusdb:init-complete')
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('terminusdb:init-complete', data)
    })
  })

  // 初始化错误
  terminusDBService.on('terminusdb:init-error', (data) => {
    console.log('📢 [IPC] 广播事件: terminusdb:init-error')
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('terminusdb:init-error', data)
    })
  })

  // ========== IPC Handlers（纯调用，立即返回ID） ==========

  // 初始化项目 TerminusDB
  ipcMain.handle('terminusdb:initialize-project', async (_event, { projectPath }) => {
    console.log(`🔵 [IPC] 调用: terminusdb:initialize-project, 项目路径:`, projectPath)
    
    try {
      const initId = await terminusDBService.initializeProjectDatabase(projectPath)
      return { success: true, initId }
    } catch (error: any) {
      console.error('❌ [IPC] terminusdb:initialize-project 失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取 Web 工具地址
  ipcMain.handle('terminusdb:get-web-tool-url', async (_event, { projectPath }) => {
    console.log(`🔵 [IPC] 调用: terminusdb:get-web-tool-url, 项目路径:`, projectPath)
    
    try {
      const url = terminusDBService.getWebToolUrl(projectPath)
      if (url) {
        return { success: true, url }
      } else {
        return { success: false, error: '项目 TerminusDB 未初始化' }
      }
    } catch (error: any) {
      console.error('❌ [IPC] terminusdb:get-web-tool-url 失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 打开 Web 工具（使用系统默认浏览器）
  ipcMain.handle('terminusdb:open-web-tool', async (_event, { projectPath }) => {
    console.log(`🔵 [IPC] 调用: terminusdb:open-web-tool, 项目路径:`, projectPath)
    
    try {
      const url = terminusDBService.getWebToolUrl(projectPath)
      if (url) {
        await shell.openExternal(url)
        console.log(`🌐 [IPC] 已在浏览器中打开: ${url}`)
        return { success: true, url }
      } else {
        return { success: false, error: '项目 TerminusDB 未初始化' }
      }
    } catch (error: any) {
      console.error('❌ [IPC] terminusdb:open-web-tool 失败:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('✅ [IPC] TerminusDB IPC 处理器注册完成')
}
```

### 7. `terminusdbStore.ts` - 前端状态管理

```typescript
// Nimbria/Client/stores/terminusdb/terminusdbStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

interface TerminusDBOperation {
  id: string
  type: 'initialize'
  projectPath: string
  status: 'pending' | 'success' | 'error'
  error?: string
  startTime: number
  endTime?: number
}

export const useTerminusDBStore = defineStore('terminusdb', () => {
  // ========== 状态 ==========
  const projectDatabases = ref<Map<string, boolean>>(new Map())
  const activeOperations = ref<Map<string, TerminusDBOperation>>(new Map())
  const operationHistory = ref<TerminusDBOperation[]>([])

  // ========== 计算属性 ==========
  const isProjectInitialized = computed(() => {
    return (projectPath: string) => projectDatabases.value.get(projectPath) || false
  })

  const pendingOperations = computed(() => {
    return Array.from(activeOperations.value.values()).filter(op => op.status === 'pending')
  })

  // ========== 方法 ==========

  /**
   * 初始化项目 TerminusDB
   */
  const initializeProject = async (projectPath: string): Promise<string | null> => {
    try {
      console.log('[TerminusDBStore] 初始化项目 TerminusDB:', projectPath)
      
      const result = await window.electronAPI.invoke('terminusdb:initialize-project', { projectPath })
      
      if (result.success && result.initId) {
        // 记录操作
        const operation: TerminusDBOperation = {
          id: result.initId,
          type: 'initialize',
          projectPath,
          status: 'pending',
          startTime: Date.now()
        }
        activeOperations.value.set(result.initId, operation)
        
        ElMessage.info('正在初始化 TerminusDB...')
        return result.initId
      } else {
        ElMessage.error(`初始化失败: ${result.error}`)
        return null
      }
    } catch (error: any) {
      console.error('[TerminusDBStore] 初始化失败:', error)
      ElMessage.error(`初始化失败: ${error.message}`)
      return null
    }
  }

  /**
   * 打开 Web 工具
   */
  const openWebTool = async (projectPath: string): Promise<void> => {
    try {
      console.log('[TerminusDBStore] 打开 Web 工具:', projectPath)
      
      const result = await window.electronAPI.invoke('terminusdb:open-web-tool', { projectPath })
      
      if (result.success) {
        ElMessage.success(`已在浏览器中打开 TerminusDB`)
      } else {
        ElMessage.error(`打开失败: ${result.error}`)
      }
    } catch (error: any) {
      console.error('[TerminusDBStore] 打开 Web 工具失败:', error)
      ElMessage.error(`打开失败: ${error.message}`)
    }
  }

  /**
   * 设置事件监听器
   */
  const setupListeners = () => {
    // 初始化完成
    window.electronAPI.on('terminusdb:init-complete', (data: any) => {
      console.log('[TerminusDBStore] 收到事件: terminusdb:init-complete', data)
      
      const operation = activeOperations.value.get(data.initId)
      if (operation) {
        operation.status = 'success'
        operation.endTime = Date.now()
        operationHistory.value.push(operation)
        activeOperations.value.delete(data.initId)
        
        // 标记项目已初始化
        projectDatabases.value.set(data.projectPath, true)
        
        ElMessage.success('TerminusDB 初始化成功！')
      }
    })

    // 初始化错误
    window.electronAPI.on('terminusdb:init-error', (data: any) => {
      console.error('[TerminusDBStore] 收到事件: terminusdb:init-error', data)
      
      const operation = activeOperations.value.get(data.initId)
      if (operation) {
        operation.status = 'error'
        operation.error = data.error
        operation.endTime = Date.now()
        operationHistory.value.push(operation)
        activeOperations.value.delete(data.initId)
        
        ElMessage.error(`TerminusDB 初始化失败: ${data.error}`)
      }
    })

    console.log('[TerminusDBStore] 事件监听器已设置')
  }

  /**
   * 清理已完成的操作
   */
  const clearCompletedOperations = () => {
    operationHistory.value = operationHistory.value.slice(-10) // 只保留最近10条
  }

  return {
    // 状态
    projectDatabases,
    activeOperations,
    operationHistory,
    
    // 计算属性
    isProjectInitialized,
    pendingOperations,
    
    // 方法
    initializeProject,
    openWebTool,
    setupListeners,
    clearCompletedOperations
  }
})
```

### 8. 修改 `SettingsPanel.vue` - 添加按钮

```vue
<!-- Nimbria/Client/GUI/components/ProjectPage.Shell/Navbar.content/Settings/SettingsPanel.vue -->
<template>
  <div class="settings-panel">
    <div class="settings-header">
      <h3>设置</h3>
    </div>
    
    <div class="settings-content">
      <!-- DemoPage按钮 -->
      <el-button 
        type="primary" 
        @click="openDemoPageDrawer"
        class="demo-page-btn"
      >
        <el-icon><Document /></el-icon>
        DemoPage
      </el-button>

      <!-- ========== TerminusDB 控制按钮 ========== -->
      <div class="terminusdb-section">
        <h4>TerminusDB 设定数据库</h4>
        
        <!-- 初始化按钮 -->
        <el-button 
          type="success" 
          @click="initializeTerminusDB"
          :loading="isInitializing"
          :disabled="isInitialized"
          class="terminusdb-btn"
        >
          <el-icon><CirclePlus /></el-icon>
          {{ isInitialized ? '已初始化' : '初始化 TerminusDB' }}
        </el-button>

        <!-- 打开 Web 工具按钮 -->
        <el-button 
          type="primary" 
          @click="openWebTool"
          :disabled="!isInitialized"
          class="terminusdb-btn"
        >
          <el-icon><Link /></el-icon>
          打开 Web 工具
        </el-button>

        <!-- 状态提示 -->
        <div class="terminusdb-status" v-if="isInitialized">
          <el-icon class="status-icon success"><CircleCheck /></el-icon>
          <span>TerminusDB 已就绪</span>
        </div>
      </div>
    </div>

    <!-- DemoPage抽屉 -->
    <DemoPageDrawer 
      v-model:visible="drawerVisible" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Document, CirclePlus, Link, CircleCheck } from '@element-plus/icons-vue'
import DemoPageDrawer from './DemoPageDrawer.vue'
import { useTerminusDBStore } from 'stores/terminusdb/terminusdbStore'
import { useProjectPageStore } from 'stores/projectPage/projectPageStore'

const drawerVisible = ref(false)
const terminusDBStore = useTerminusDBStore()
const projectPageStore = useProjectPageStore()

// 当前项目路径
const currentProjectPath = computed(() => projectPageStore.projectPath || '')

// 是否已初始化
const isInitialized = computed(() => {
  return terminusDBStore.isProjectInitialized(currentProjectPath.value)
})

// 是否正在初始化
const isInitializing = computed(() => {
  return terminusDBStore.pendingOperations.some(
    op => op.projectPath === currentProjectPath.value && op.type === 'initialize'
  )
})

const openDemoPageDrawer = () => {
  drawerVisible.value = true
}

// 初始化 TerminusDB
const initializeTerminusDB = async () => {
  if (!currentProjectPath.value) {
    return
  }
  await terminusDBStore.initializeProject(currentProjectPath.value)
}

// 打开 Web 工具
const openWebTool = async () => {
  if (!currentProjectPath.value) {
    return
  }
  await terminusDBStore.openWebTool(currentProjectPath.value)
}

// 设置监听器
onMounted(() => {
  terminusDBStore.setupListeners()
})
</script>

<style scoped>
.settings-panel {
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.settings-header h3 {
  margin: 0 0 16px 0;
  color: var(--obsidian-text-primary);
}

.demo-page-btn {
  width: 100%;
  height: 40px;
  margin-bottom: 24px;
}

/* TerminusDB 区域 */
.terminusdb-section {
  padding: 16px;
  background: var(--obsidian-background-secondary);
  border-radius: 8px;
}

.terminusdb-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--obsidian-text-primary);
}

.terminusdb-btn {
  width: 100%;
  height: 40px;
  margin-bottom: 8px;
}

.terminusdb-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px;
  background: var(--el-color-success-light-9);
  border-radius: 4px;
  font-size: 13px;
  color: var(--el-color-success);
}

.status-icon {
  font-size: 16px;
}
</style>
```

### 9. 修改 `app-manager.ts` - 集成服务

```typescript
// Nimbria/src-electron/core/app-manager.ts
// 在文件顶部添加导入
import { TerminusDBService } from '../services/terminusdb-service/terminusdb-service'
import { registerTerminusDBHandlers } from '../ipc/main-renderer/terminusdb-handlers'

// 在类中添加成员
export class AppManager {
  // ... 其他成员
  private terminusDBService!: TerminusDBService

  // 在 boot() 方法中初始化
  async boot() {
    // ... 现有代码
    this.initializeFileSystem()
    await this.initializeDatabase()
    await this.initializeTerminusDB()  // ✅ 新增
    this.initializeWindowManager()
    // ...
  }

  // 添加初始化方法
  private async initializeTerminusDB() {
    console.log('🎬 [AppManager] 初始化 TerminusDB 服务...')
    this.terminusDBService = new TerminusDBService()
    registerTerminusDBHandlers(this.terminusDBService)
    console.log('✅ [AppManager] TerminusDB 服务初始化完成')
  }

  // 在 shutdown() 方法中清理
  async shutdown() {
    // ... 现有代码
    if (this.terminusDBService) {
      await this.terminusDBService.cleanup()
    }
    // ...
  }
}
```

### 10. 修改 `package.json` - 添加依赖

```json
{
  "dependencies": {
    "@terminusdb/terminusdb-client": "^10.1.5",
    "better-sqlite3": "12.2.0",
    // ... 其他依赖
  }
}
```

---

## 📦 安装依赖

```powershell
cd Nimbria

# 安装 TerminusDB 客户端
npm install @terminusdb/terminusdb-client

# 重新安装所有依赖
npm install
```

---

## 🧪 测试文档

### **测试前提条件**

1. ✅ 已安装 TerminusDB 服务器（本地运行在 `localhost:6363`）
2. ✅ 已完成代码集成
3. ✅ 已安装 npm 依赖

### **TerminusDB 服务器安装**

```powershell
# 使用 Docker 运行 TerminusDB（推荐）
docker run -d \
  --name terminusdb \
  -p 6363:6363 \
  -v terminusdb_data:/app/terminusdb/storage \
  terminusdb/terminusdb-server:latest

# 或者下载本地安装包
# 访问: https://terminusdb.com/download
```

---

## 🧪 测试步骤

### **测试 1: 启动应用并检查服务初始化**

1. **启动 Nimbria 应用**
   ```powershell
   cd Nimbria
   npm run dev
   ```

2. **检查控制台日志**
   应该看到：
   ```
   🎬 [AppManager] 初始化 TerminusDB 服务...
   📡 [IPC] 注册 TerminusDB IPC 处理器...
   ✅ [IPC] TerminusDB IPC 处理器注册完成
   ✅ [AppManager] TerminusDB 服务初始化完成
   ```

3. **结果验证**
   - ✅ 无报错
   - ✅ TerminusDB 服务成功注册

---

### **测试 2: 打开项目并查看设置面板**

1. **打开或创建一个项目**
   - 点击"打开项目"或创建新项目

2. **打开左侧设置面板**
   - 点击左侧导航栏的"设置"图标

3. **查看 TerminusDB 控制按钮**
   应该看到：
   - ✅ "初始化 TerminusDB" 按钮（绿色，可点击）
   - ✅ "打开 Web 工具" 按钮（蓝色，禁用状态）
   - ❌ 没有状态提示（因为尚未初始化）

---

### **测试 3: 初始化项目 TerminusDB**

1. **点击"初始化 TerminusDB"按钮**

2. **观察界面变化**
   - ✅ 出现 loading 状态
   - ✅ 显示消息提示："正在初始化 TerminusDB..."

3. **检查控制台日志**
   应该看到：
   ```
   🔵 [IPC] 调用: terminusdb:initialize-project, 项目路径: D:\Projects\MyNovel
   🎬 [TerminusDBService] 开始初始化项目 TerminusDB: D:\Projects\MyNovel
   📢 [IPC] 广播事件: terminusdb:init-start
   📦 [TerminusDBManager] 创建项目 TerminusDB...
   📁 [TerminusDBManager] 创建 TerminusDB 目录: D:\Projects\MyNovel\.TerminusDB
   🚀 [ProjectTerminusDB] 初始化项目 TerminusDB: D:\Projects\MyNovel
   🔗 [ProjectTerminusDB] 连接到 TerminusDB 服务器: http://localhost:6363
   📝 [ProjectTerminusDB] 创建数据库: MyNovel
   ✅ [ProjectTerminusDB] 数据库创建成功: MyNovel
   ✅ [TerminusDBService] 项目 TerminusDB 初始化成功
   📢 [IPC] 广播事件: terminusdb:init-complete
   ```

4. **初始化完成后界面变化**
   - ✅ 显示成功消息："TerminusDB 初始化成功！"
   - ✅ "初始化 TerminusDB" 按钮变为禁用状态，显示"已初始化"
   - ✅ "打开 Web 工具" 按钮变为可点击状态
   - ✅ 显示状态提示："TerminusDB 已就绪"（绿色图标）

5. **检查文件系统**
   ```powershell
   # 验证目录是否创建
   Test-Path "D:\Projects\MyNovel\.TerminusDB"
   # 应该返回: True
   ```

---

### **测试 4: 打开 Web 工具**

1. **点击"打开 Web 工具"按钮**

2. **观察结果**
   - ✅ 系统默认浏览器自动打开
   - ✅ 访问地址：`http://localhost:6363`
   - ✅ 显示 TerminusDB 的 Web 管理界面
   - ✅ 可以看到刚创建的项目数据库（如 `MyNovel`）

3. **检查控制台日志**
   ```
   🔵 [IPC] 调用: terminusdb:open-web-tool, 项目路径: D:\Projects\MyNovel
   🌐 [IPC] 已在浏览器中打开: http://localhost:6363/
   ```

4. **前端消息提示**
   - ✅ 显示："已在浏览器中打开 TerminusDB"

---

### **测试 5: 错误处理测试**

#### **场景 A: TerminusDB 服务器未启动**

1. **停止 TerminusDB 服务器**
   ```powershell
   docker stop terminusdb
   ```

2. **尝试初始化**
   - 点击"初始化 TerminusDB"按钮

3. **预期结果**
   - ✅ 显示错误消息："TerminusDB 初始化失败: ..."
   - ✅ 控制台显示详细错误信息
   - ✅ 按钮恢复可点击状态

4. **恢复服务器**
   ```powershell
   docker start terminusdb
   ```

#### **场景 B: 重复初始化**

1. **在已初始化的项目中再次点击"初始化"按钮**
   - 预期：按钮应该是禁用状态，无法点击

---

### **测试 6: 多项目测试**

1. **打开第一个项目并初始化 TerminusDB**
   - ✅ 初始化成功

2. **切换到第二个项目**
   - ✅ "初始化 TerminusDB" 按钮应该是可点击状态
   - ✅ "打开 Web 工具" 按钮应该是禁用状态

3. **初始化第二个项目**
   - ✅ 初始化成功
   - ✅ 创建独立的 `.TerminusDB` 目录

4. **切回第一个项目**
   - ✅ 按钮状态正确（已初始化状态）
   - ✅ 可以直接打开 Web 工具

---

## ✅ 测试检查清单

完成以下所有测试项：

- [ ] **服务初始化**
  - [ ] TerminusDB 服务在应用启动时正确初始化
  - [ ] 控制台无报错

- [ ] **UI 显示**
  - [ ] 设置面板中显示 TerminusDB 控制按钮
  - [ ] 按钮状态正确（初始为未初始化状态）

- [ ] **初始化功能**
  - [ ] 点击初始化按钮后显示 loading
  - [ ] 初始化成功后显示成功消息
  - [ ] 按钮状态更新为已初始化
  - [ ] `.TerminusDB` 目录被正确创建

- [ ] **Web 工具访问**
  - [ ] 点击后在浏览器中打开正确的 URL
  - [ ] 能够访问 TerminusDB 管理界面

- [ ] **错误处理**
  - [ ] 服务器未启动时显示错误消息
  - [ ] 错误后可以重试

- [ ] **多项目支持**
  - [ ] 每个项目有独立的初始化状态
  - [ ] 切换项目时状态正确保持

---

## 📊 预期的控制台日志示例

### **完整的初始化流程日志**

```
========== 应用启动 ==========
🎬 [AppManager] 初始化 TerminusDB 服务...
📡 [IPC] 注册 TerminusDB IPC 处理器...
✅ [IPC] TerminusDB IPC 处理器注册完成
✅ [AppManager] TerminusDB 服务初始化完成

========== 用户点击初始化按钮 ==========
🔵 [IPC] 调用: terminusdb:initialize-project, 项目路径: D:\Projects\MyNovel
🎬 [TerminusDBService] 开始初始化项目 TerminusDB: D:\Projects\MyNovel
📢 [IPC] 广播事件: terminusdb:init-start
📦 [TerminusDBManager] 创建项目 TerminusDB...
📍 [TerminusDBManager] 项目路径: D:\Projects\MyNovel
📁 [TerminusDBManager] 创建 TerminusDB 目录: D:\Projects\MyNovel\.TerminusDB
✅ [TerminusDBManager] 项目 TerminusDB 创建成功
🚀 [ProjectTerminusDB] 初始化项目 TerminusDB: D:\Projects\MyNovel
🔗 [ProjectTerminusDB] 连接到 TerminusDB 服务器: http://localhost:6363
📝 [ProjectTerminusDB] 创建数据库: MyNovel
✅ [ProjectTerminusDB] 数据库创建成功: MyNovel
✅ [ProjectTerminusDB] 项目 TerminusDB 初始化成功
✅ [TerminusDBService] 项目 TerminusDB 初始化成功: D:\Projects\MyNovel
📢 [IPC] 广播事件: terminusdb:init-complete

========== 用户点击打开 Web 工具 ==========
🔵 [IPC] 调用: terminusdb:open-web-tool, 项目路径: D:\Projects\MyNovel
🌐 [IPC] 已在浏览器中打开: http://localhost:6363/
```

---

## 🎓 测试建议

1. **按顺序测试**：从测试1到测试6依次进行
2. **保留控制台窗口**：实时查看日志输出
3. **使用开发者工具**：打开 Electron 的 DevTools 查看前端日志
4. **记录问题**：如果出现异常，记录完整的错误日志
5. **验证文件系统**：确保 `.TerminusDB` 目录被正确创建

---

**Boss，以上就是完整的 TerminusDB 集成计划和测试文档！**

主要特点：
- ✅ 完全仿照 SQLite 的事件驱动架构
- ✅ 一个项目一个独立的 TerminusDB 数据库
- ✅ 在设置面板添加控制按钮
- ✅ 支持浏览器访问 Web 工具
- ✅ 详细的测试指导文档

您需要切换到 agent 模式让我开始实现这些代码吗？