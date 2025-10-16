## 🎯 设计方案

### **整体架构**

```
参考 SQLite 架构：
DatabaseService → DatabaseManager → ProjectDatabase

Gun.js 架构：
StarChartService → StarChartManager → ProjectStarChart
```

---

## 📂 文件结构设计

```
Nimbria/src-electron/services/star-chart-service/
├── star-chart-service.ts         # 主服务类（EventEmitter）
├── star-chart-manager.ts         # Gun.js 实例管理
├── project-star-chart.ts         # 项目级 StarChart 操作
├── types/
│   └── index.ts                  # 类型定义
└── utils/
    └── path-helper.ts            # 路径工具（复用 SQLite 的逻辑）
```

---

## 💻 核心代码设计

### **1. 类型定义** (`types/index.ts`)

```typescript
// src-electron/services/star-chart-service/types/index.ts

export interface StarChartInitEvent {
  initId: string
  success?: boolean
}

export interface StarChartProjectCreatedEvent {
  operationId: string
  projectPath: string
  starChartPath: string
}

export interface StarChartErrorEvent {
  operationId?: string
  projectPath?: string
  error: string
}

// 测试数据结构
export interface StarChartMetadata {
  created_at: number
  project_name?: string
  version?: string
}
```

---

### **2. StarChartService** (`star-chart-service.ts`)

```typescript
// src-electron/services/star-chart-service/star-chart-service.ts
import { EventEmitter } from 'events'
import { StarChartManager } from './star-chart-manager'

export interface StarChartServiceEvents {
  'starchart:init-start': StarChartInitEvent
  'starchart:init-complete': StarChartInitEvent
  'starchart:init-error': StarChartErrorEvent
  'starchart:project-create-start': { operationId: string; projectPath: string }
  'starchart:project-created': StarChartProjectCreatedEvent
  'starchart:project-error': StarChartErrorEvent
}

export class StarChartService extends EventEmitter {
  private starChartManager: StarChartManager
  private projectStarCharts: Map<string, any> = new Map()
  private isInitialized = false

  constructor() {
    super()
    this.starChartManager = new StarChartManager()
  }

  /**
   * ✅ 事件驱动方法：立即返回initId，通过事件反馈状态
   */
  async initialize(): Promise<string> {
    const initId = `starchart-init-${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    
    this.emit('starchart:init-start', { initId })
    
    setImmediate(async () => {
      try {
        await this.starChartManager.initialize()
        this.isInitialized = true
        this.emit('starchart:init-complete', { initId, success: true })
      } catch (error) {
        this.emit('starchart:init-error', { 
          initId, 
          error: error instanceof Error ? error.message : String(error) 
        })
      }
    })
    
    return initId
  }

  /**
   * ✅ 创建项目的 StarChart 数据库
   */
  async createProjectStarChart(projectPath: string): Promise<string> {
    const operationId = `create-starchart-${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    
    this.emit('starchart:project-create-start', { operationId, projectPath })
    
    setImmediate(async () => {
      try {
        if (!this.isInitialized) {
          throw new Error('StarChart service not initialized')
        }

        const starChartPath = await this.starChartManager.createProjectStarChart(projectPath)
        
        // 初始化测试：写入创建时间
        const gun = this.starChartManager.getProjectGun(projectPath)
        if (gun) {
          gun.get('metadata').put({
            created_at: Date.now(),
            version: '1.0.0'
          })
        }
        
        this.emit('starchart:project-created', {
          operationId,
          projectPath, 
          starChartPath
        })
        
      } catch (error) {
        this.emit('starchart:project-error', {
          operationId,
          projectPath, 
          error: error instanceof Error ? error.message : String(error)
        })
      }
    })

    return operationId
  }

  /**
   * 获取项目的 StarChart 实例
   */
  getProjectStarChart(projectPath: string) {
    return this.starChartManager.getProjectGun(projectPath)
  }

  /**
   * 关闭项目的 StarChart
   */
  async closeProjectStarChart(projectPath: string): Promise<void> {
    await this.starChartManager.closeProjectStarChart(projectPath)
  }

  /**
   * 清理所有资源
   */
  async cleanup(): Promise<void> {
    await this.starChartManager.cleanup()
    this.projectStarCharts.clear()
    this.isInitialized = false
  }
}

// 类型增强
declare interface StarChartService {
  on<K extends keyof StarChartServiceEvents>(
    event: K, 
    listener: (data: StarChartServiceEvents[K]) => void
  ): this
  emit<K extends keyof StarChartServiceEvents>(
    event: K, 
    data: StarChartServiceEvents[K]
  ): boolean
}
```

---

### **3. StarChartManager** (`star-chart-manager.ts`)

```typescript
// src-electron/services/star-chart-service/star-chart-manager.ts
import Gun from 'gun'
import path from 'path'
import fs from 'fs-extra'

export class StarChartManager {
  private projectGuns: Map<string, any> = new Map()
  private isInitialized = false

  /**
   * 初始化 StarChart 服务
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('StarChart manager already initialized')
      return
    }
    
    // Gun.js 本身不需要全局初始化，但我们可以做一些准备工作
    console.log('StarChart manager initialized')
    this.isInitialized = true
  }

  /**
   * 为项目创建 StarChart 数据库
   * 参考 SQLite 的路径结构：{projectPath}/.Database/StarChart
   */
  async createProjectStarChart(projectPath: string): Promise<string> {
    // 1. 确保 .Database 目录存在（复用 SQLite 的路径逻辑）
    const databaseDir = path.join(projectPath, '.Database')
    await fs.ensureDir(databaseDir)
    
    // 2. StarChart 数据存储路径
    const starChartDir = path.join(databaseDir, 'StarChart')
    await fs.ensureDir(starChartDir)
    
    // 3. 初始化 Gun.js 实例
    const gun = Gun({
      file: path.join(starChartDir, 'starchart.json'),
      localStorage: false,
      radisk: true, // 启用持久化
      multicast: false // 单机模式
    })
    
    // 4. 存储实例
    this.projectGuns.set(projectPath, gun)
    
    console.log(`StarChart created for project: ${projectPath}`)
    return starChartDir
  }

  /**
   * 获取项目的 Gun 实例
   */
  getProjectGun(projectPath: string) {
    return this.projectGuns.get(projectPath)
  }

  /**
   * 关闭项目的 StarChart
   */
  async closeProjectStarChart(projectPath: string): Promise<void> {
    const gun = this.projectGuns.get(projectPath)
    if (gun) {
      // Gun.js 没有显式的 close 方法，但我们可以清理引用
      this.projectGuns.delete(projectPath)
      console.log(`StarChart closed for project: ${projectPath}`)
    }
  }

  /**
   * 清理所有资源
   */
  async cleanup(): Promise<void> {
    this.projectGuns.clear()
    this.isInitialized = false
    console.log('StarChart manager cleaned up')
  }
}
```

---

### **4. IPC Handlers** (`ipc/main-renderer/star-chart-handlers.ts`)

```typescript
// src-electron/ipc/main-renderer/star-chart-handlers.ts
import { ipcMain, BrowserWindow } from 'electron'
import type { StarChartService } from '../../services/star-chart-service/star-chart-service'

export function registerStarChartHandlers(starChartService: StarChartService) {
  // ========== 事件监听器（只注册一次） ==========
  
  starChartService.on('starchart:init-start', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('starchart:init-start', data)
    })
  })

  starChartService.on('starchart:init-complete', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('starchart:init-complete', data)
    })
  })

  starChartService.on('starchart:init-error', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('starchart:init-error', data)
    })
  })
  
  starChartService.on('starchart:project-create-start', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('starchart:project-create-start', data)
    })
  })
  
  starChartService.on('starchart:project-created', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('starchart:project-created', data)
    })
  })
  
  starChartService.on('starchart:project-error', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('starchart:project-error', data)
    })
  })
  
  // ========== IPC Handlers ==========
  
  ipcMain.handle('starchart:initialize', async () => {
    try {
      // ✅ 全局初始化 StarChart 服务（只需调用一次）
      const initId = await starChartService.initialize()
      return { success: true, initId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // ✅ 为当前项目创建 StarChart 数据库
  ipcMain.handle('starchart:create-project', async (_event, { projectPath }) => {
    try {
      const operationId = await starChartService.createProjectStarChart(projectPath)
      return { success: true, operationId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // ✅ 测试：读取项目 StarChart 的元数据
  ipcMain.handle('starchart:get-metadata', async (_event, { projectPath }) => {
    try {
      const gun = starChartService.getProjectStarChart(projectPath)
      if (!gun) {
        return { success: false, error: 'StarChart not found for this project' }
      }
      
      return new Promise((resolve) => {
        gun.get('metadata').once((data: any) => {
          resolve({ success: true, metadata: data })
        })
      })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  console.log('StarChart IPC handlers registered')
}
```

---

### **5. Preload 暴露** (`project-preload.ts`)

```typescript
// 在现有的 project-preload.ts 中的 contextBridge.exposeInMainWorld('nimbria', { ... }) 中添加：

starChart: {
  // ✅ 初始化 - 自动使用当前项目路径
  initialize: () => ipcRenderer.invoke('starchart:initialize'),
  
  // ✅ 创建项目的 StarChart - 自动使用 currentProjectPath
  createProject: async () => {
    if (!currentProjectPath) {
      return { success: false, error: 'No project path available' }
    }
    return ipcRenderer.invoke('starchart:create-project', { projectPath: currentProjectPath })
  },
  
  // ✅ 读取元数据 - 自动使用 currentProjectPath
  getMetadata: async () => {
    if (!currentProjectPath) {
      return { success: false, error: 'No project path available' }
    }
    return ipcRenderer.invoke('starchart:get-metadata', { projectPath: currentProjectPath })
  },
  
  // 事件监听
  onInitStart: (callback: (data: any) => void) => {
    ipcRenderer.on('starchart:init-start', (_event, data) => callback(data))
  },
  onInitComplete: (callback: (data: any) => void) => {
    ipcRenderer.on('starchart:init-complete', (_event, data) => callback(data))
  },
  onInitError: (callback: (data: any) => void) => {
    ipcRenderer.on('starchart:init-error', (_event, data) => callback(data))
  },
  onProjectCreateStart: (callback: (data: any) => void) => {
    ipcRenderer.on('starchart:project-create-start', (_event, data) => callback(data))
  },
  onProjectCreated: (callback: (data: any) => void) => {
    ipcRenderer.on('starchart:project-created', (_event, data) => callback(data))
  },
  onProjectError: (callback: (data: any) => void) => {
    ipcRenderer.on('starchart:project-error', (_event, data) => callback(data))
  }
}
```

---

### **6. 前端按钮** (`SettingsPanel.vue`)

```vue
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

      <!-- StarChart初始化按钮 -->
        <el-button 
          type="success" 
        @click="initializeStarChart"
        :loading="starChartLoading"
        class="starchart-btn"
      >
        <el-icon><Star /></el-icon>
        初始化 StarChart
        </el-button>

      <!-- 测试按钮：读取创建时间 -->
        <el-button 
        v-if="starChartInitialized"
          type="info" 
        @click="testStarChart"
        class="starchart-test-btn"
        >
        <el-icon><View /></el-icon>
        测试 StarChart
        </el-button>

      <!-- 显示测试结果 -->
      <div v-if="testResult" class="test-result">
        <p>创建时间: {{ new Date(testResult.created_at).toLocaleString() }}</p>
        <p>版本: {{ testResult.version }}</p>
      </div>
    </div>

    <!-- DemoPage抽屉 -->
    <DemoPageDrawer 
      v-model:visible="drawerVisible" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Document, Star, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import DemoPageDrawer from './DemoPageDrawer.vue'

const drawerVisible = ref(false)
const starChartLoading = ref(false)
const starChartInitialized = ref(false)
const testResult = ref<any>(null)

const openDemoPageDrawer = () => {
  drawerVisible.value = true
}

// ✅ 初始化 StarChart - 直接调用，自动使用当前项目路径
const initializeStarChart = async () => {
  starChartLoading.value = true
  
  try {
    const result = await window.nimbria.starChart.createProject()
    
    if (result.success) {
      ElMessage.success('StarChart 初始化成功！')
      starChartInitialized.value = true
    } else {
      ElMessage.error(`初始化失败: ${result.error}`)
    }
  } catch (error: any) {
    ElMessage.error(`初始化异常: ${error.message}`)
  } finally {
    starChartLoading.value = false
  }
}

// ✅ 测试 StarChart：读取创建时间 - 直接调用，自动使用当前项目路径
const testStarChart = async () => {
  try {
    const result = await window.nimbria.starChart.getMetadata()
    
    if (result.success) {
      testResult.value = result.metadata
      ElMessage.success('读取成功！')
    } else {
      ElMessage.error(`读取失败: ${result.error}`)
    }
  } catch (error: any) {
    ElMessage.error(`读取异常: ${error.message}`)
  }
}

// 设置事件监听
onMounted(() => {
  window.nimbria.starChart?.onProjectCreated((data: any) => {
    console.log('StarChart 项目创建成功:', data)
  })
  
  window.nimbria.starChart?.onProjectError((data: any) => {
    console.error('StarChart 错误:', data.error)
  })
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

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.demo-page-btn,
.starchart-btn,
.starchart-test-btn {
  width: 100%;
  height: 40px;
}

.test-result {
  margin-top: 16px;
  padding: 12px;
  background: var(--obsidian-background-secondary);
  border-radius: 6px;
  font-size: 14px;
  color: var(--obsidian-text-primary);
}

.test-result p {
  margin: 4px 0;
}
</style>
```

---

### **7. 主进程集成** (`app-manager.ts`)

```typescript
// 在 Nimbria/src-electron/core/app-manager.ts 中集成

import { StarChartService } from '../services/star-chart-service/star-chart-service'
import { registerStarChartHandlers } from '../ipc/main-renderer/star-chart-handlers'

export class AppManager {
  private starChartService: StarChartService
  
  constructor() {
    // ... 其他初始化代码 ...
    this.starChartService = new StarChartService()
  }

  async initialize(): Promise<void> {
    // ... 其他初始化代码 ...
    
    // ✅ 初始化 StarChart 服务（全局初始化，只需调用一次）
    console.log('Initializing StarChart service...')
    await this.starChartService.initialize()
    
    // ✅ 注册 StarChart 的 IPC 处理器
    registerStarChartHandlers(this.starChartService)
    
    // ... 其他初始化代码 ...
  }

  async cleanup(): Promise<void> {
    // ... 其他清理代码 ...
    
    // ✅ 清理 StarChart 服务
    await this.starChartService.cleanup()
    
    // ... 其他清理代码 ...
  }
}
```

---

## 📦 依赖安装

在 `Nimbria/package.json` 中添加 Gun.js 依赖：

```bash
# 或者直接修改 package.json 然后执行：
npm install gun
```

```json
{
  "dependencies": {
    "gun": "^0.2020.1240"
  }
}
```

---

## 🎯 实现步骤

### **第一阶段：基础设置**

1. **安装 Gun.js 依赖**
   ```bash
   npm install gun
   ```

2. **创建服务文件结构**
   - `Nimbria/src-electron/services/star-chart-service/types/index.ts` - 类型定义
   - `Nimbria/src-electron/services/star-chart-service/star-chart-service.ts` - 主服务类
   - `Nimbria/src-electron/services/star-chart-service/star-chart-manager.ts` - Gun.js 管理器
   - `Nimbria/src-electron/ipc/main-renderer/star-chart-handlers.ts` - IPC 处理器

3. **主进程集成**
   - 修改 `Nimbria/src-electron/core/app-manager.ts`
   - 在 `constructor` 中创建 `StarChartService` 实例
   - 在 `initialize()` 中调用 `await this.starChartService.initialize()`
   - 在 `initialize()` 中调用 `registerStarChartHandlers(this.starChartService)`
   - 在 `cleanup()` 中调用 `await this.starChartService.cleanup()`

4. **前端 API 暴露**
   - 修改 `Nimbria/src-electron/core/project-preload.ts`
   - 在 `contextBridge.exposeInMainWorld('nimbria', { ... })` 中添加 `starChart` API
   - ✅ **项目窗口级别**：每个项目窗口都有独立的 StarChart 实例

5. **UI 集成**
   - 修改 `Nimbria/Client/GUI/components/ProjectPage.Shell/Navbar.content/Settings/SettingsPanel.vue`
   - 添加"初始化 StarChart"按钮
   - 添加"测试 StarChart"按钮（初始化成功后显示）
   - 显示创建时间的测试结果

---

## ✅ 测试验证

初始化成功后，应该能看到：

```
项目目录/
└── .Database/
    ├── project.db          # SQLite 数据库
    └── StarChart/          # Gun.js 图数据库
        └── starchart.json  # Gun 持久化数据文件
```

### **测试步骤**

1. **打开项目**：加载一个项目到项目窗口

2. **初始化 StarChart**：点击"初始化 StarChart"按钮
   - 成功消息：`StarChart 初始化成功！`
   - 文件系统：`.Database/StarChart/starchart.json` 文件被创建

3. **测试读取**：点击"测试 StarChart"按钮
   - 成功消息：`读取成功！`
   - 显示的数据：
     ```
     创建时间: 2025/10/16 14:30:00
     版本: 1.0.0
     ```

### **预期返回数据**

```json
{
  "created_at": 1729060800000,
  "version": "1.0.0"
}
```

---

## 📝 架构说明

### **为什么是项目窗口级别？**

- ✅ **多窗口隔离**：每个项目窗口有独立的 StarChart 实例
- ✅ **并行工作**：多个项目可同时工作，互不影响
- ✅ **数据隔离**：项目级数据存储在 `.Database/StarChart/` 目录
- ✅ **简化 API**：Preload 中自动使用 `currentProjectPath`，前端无需传递项目路径

### **时间维度快照架构**

每个 StarChart 实例会维护多个时间快照：

```
StarChart/
├── T0: { characters: {...}, organizations: {...}, ... }  // 初始快照
├── T1: { characters: {...}, organizations: {...}, ... }  // 第一个时间点
├── T2: { characters: {...}, organizations: {...}, ... }  // 第二个时间点
└── ...

查询 → 根据时间点 T 定位快照 → 返回该时间点的完整世界状态
```

---

Boss，设计文件已完全修正，现在可以开始实现了！