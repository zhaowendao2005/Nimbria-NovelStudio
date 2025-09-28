## 🎯 **多进程窗口架构设计文档**

### 📋 **系统架构设计**

#### **1. 核心架构组件**

```typescript
// 🏗️ 系统核心架构
┌─────────────────────────────────────────────────────────────┐
│                    主进程 (Main Process)                       │
├─────────────────────────────────────────────────────────────┤
│  ProcessManager                                             │
│  ├── createMainProcess(): MainWindowProcess                │
│  ├── createProjectProcess(path): ProjectWindowProcess      │
│  ├── getProcess(id): WindowProcess | null                  │
│  ├── destroyProcess(id): Promise<void>                     │
│  └── broadcastMessage(message): void                       │
│                                                              │
│  MessageRouter                                              │
│  ├── setupChannel(process): MessagePort                    │
│  ├── routeMessage(from, to, data): void                    │
│  └── closeChannel(processId): void                         │
│                                                              │
│  TypeSafeIPC                                                │
│  ├── registerHandler<T>(channel, handler): void            │
│  ├── invoke<T>(channel, data): Promise<T>                  │
│  └── send<T>(channel, data): void                          │
└─────────────────────────────────────────────────────────────┘
```

#### **2. TypeScript类型系统架构**

```typescript
// 🔧 类型系统设计
interface WindowProcessConfig {
  type: 'main' | 'project'
  width: number
  height: number
  webPreferences: Electron.WebPreferences
  preloadScript: string
}

interface ProcessInfo {
  id: string
  type: WindowType
  window: BrowserWindow
  port: MessagePortMain
  processId: number
  projectPath?: string
}

interface IPCChannelMap {
  // 窗口控制
  'window:minimize': { request: void; response: void }
  'window:maximize': { request: void; response: void }
  'window:close': { request: void; response: void }
  
  // 项目管理
  'project:create': { request: { path: string }; response: ProjectResult }
  'project:open': { request: { path: string }; response: ProjectResult }
  'project:save': { request: ProjectData; response: SaveResult }
  
  // 进程间通信
  'process:broadcast': { request: BroadcastMessage; response: void }
  'process:direct': { request: DirectMessage; response: any }
}
```

### 🗂️ **文件架构修改树**

```
Nimbria/
├── src-electron/ (🔄 重构主进程架构)
│   ├── core/
│   │   ├── electron-main.ts [修改内容]
│   │   │   └── 🔄 集成ProcessManager，移除单一窗口逻辑
│   │   ├── main-preload.ts [新增文件]
│   │   │   └── 🆕 主窗口预加载脚本，MessageChannel接收
│   │   ├── project-preload.ts [新增文件]
│   │   │   └── 🆕 项目窗口预加载脚本，独立API暴露
│   │   └── electron-preload.ts [修改内容]
│   │       └── 🔄 重构为基础预加载，支持多窗口类型
│   │
│   ├── services/window-service/
│   │   ├── process-manager.ts [新增文件]
│   │   │   └── 🆕 核心进程管理器，MessageChannel架构
│   │   ├── message-router.ts [新增文件]
│   │   │   └── 🆕 消息路由器，跨进程通信
│   │   ├── window-factory.ts [新增文件]
│   │   │   └── 🆕 窗口工厂，统一窗口创建
│   │   ├── window-manager.ts [修改内容]
│   │   │   └── 🔄 重构为进程管理器的代理
│   │   └── multi-window.ts [删除文件]
│   │       └── ❌ 删除空实现，功能整合到ProcessManager
│   │
│   ├── ipc/
│   │   ├── types/ [新增目录]
│   │   │   ├── channels.ts [新增文件]
│   │   │   │   └── 🆕 IPC通道类型定义
│   │   │   ├── messages.ts [新增文件]
│   │   │   │   └── 🆕 消息类型定义
│   │   │   └── handlers.ts [新增文件]
│   │   │       └── 🆕 处理器类型定义
│   │   ├── main-renderer/
│   │   │   ├── channel-definitions.ts [修改内容]
│   │   │   │   └── 🔄 重构为类型安全的通道定义
│   │   │   ├── ipc-handlers.ts [修改内容]
│   │   │   │   └── 🔄 重构为TypeSafe IPC处理器
│   │   │   └── types.ts [修改内容]
│   │   │       └── 🔄 整合多进程IPC类型
│   │   └── process-bridge/ [新增目录]
│   │       ├── main-bridge.ts [新增文件]
│   │       │   └── 🆕 主窗口进程桥接
│   │       └── project-bridge.ts [新增文件]
│   │           └── 🆕 项目窗口进程桥接
│   │
│   └── types/ [新增目录]
│       ├── process.ts [新增文件]
│       │   └── 🆕 进程相关类型定义
│       ├── window.ts [新增文件]
│       │   └── 🆕 窗口相关类型定义
│       └── ipc.ts [新增文件]
│           └── 🆕 IPC相关类型定义
│
├── Client/ (🔄 扩展前端架构)
│   ├── GUI/ (保持现有结构)
│   │   ├── layouts/
│   │   │   └── MainLayout.vue [修改内容]
│   │   │       └── 🔄 适配新的多进程API调用
│   │   ├── components/
│   │   │   └── HomeDashboard/ [修改内容]
│   │   │       └── 🔄 集成项目窗口创建功能
│   │   └── types/ [新增目录]
│   │       └── window-api.ts [新增文件]
│   │           └── 🆕 前端窗口API类型定义
│   │
│   ├── ProjectGUI/ [新增目录]
│   │   ├── layouts/
│   │   │   └── ProjectLayout.vue [新增文件]
│   │   │       └── 🆕 项目专用布局组件
│   │   ├── components/
│   │   │   ├── Editor/ [新增目录]
│   │   │   ├── Sidebar/ [新增目录]
│   │   │   └── Toolbar/ [新增目录]
│   │   ├── pages/
│   │   │   └── ProjectWorkspace.vue [新增文件]
│   │   │       └── 🆕 项目工作区主页面
│   │   └── types/
│   │       └── project-api.ts [新增文件]
│   │           └── 🆕 项目窗口API类型定义
│   │
│   ├── stores/
│   │   ├── main-window/ [新增目录]
│   │   │   ├── process.store.ts [新增文件]
│   │   │   │   └── 🆕 主窗口进程状态管理
│   │   │   └── types.ts [新增文件]
│   │   │       └── 🆕 主窗口状态类型
│   │   └── home/ [修改内容]
│   │       └── 🔄 适配多进程项目管理
│   │
│   ├── projectStores/ [新增目录]
│   │   ├── project/ [新增目录]
│   │   │   ├── workspace.store.ts [新增文件]
│   │   │   │   └── 🆕 项目工作区状态管理
│   │   │   ├── communication.store.ts [新增文件]
│   │   │   │   └── 🆕 项目间通信状态管理
│   │   │   └── types.ts [新增文件]
│   │   │       └── 🆕 项目状态类型定义
│   │   └── index.ts [新增文件]
│   │       └── 🆕 项目Store统一导出
│   │
│   └── Types/ [修改内容]
│       ├── window.d.ts [新增文件]
│       │   └── 🆕 全局窗口API类型声明
│       ├── process.d.ts [新增文件]
│       │   └── 🆕 进程通信类型声明
│       └── nimbria.d.ts [修改内容]
│           └── 🔄 扩展为多进程窗口API
│
├── [新增文件] project.html
│   └── 🆕 项目窗口HTML入口
│
└── quasar.config.ts [修改内容]
    └── 🔄 配置多入口构建，支持项目窗口
```

### 🔧 **TypeScript类型提示设计**

#### **1. 核心类型定义**

```typescript
// src-electron/types/process.ts
export type WindowType = 'main' | 'project'

export interface WindowProcessConfig {
  type: WindowType
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  webPreferences: {
    contextIsolation: boolean
    nodeIntegration: boolean
    nodeIntegrationInWorker?: boolean
    preload: string
    partition?: string
    sandbox?: boolean
  }
}

export interface ProcessInfo {
  id: string
  type: WindowType
  window: BrowserWindow
  port: MessagePortMain
  processId: number
  projectPath?: string
  createdAt: Date
  lastActive: Date
}

export interface CreateProcessOptions {
  type: WindowType
  projectPath?: string
  config?: Partial<WindowProcessConfig>
}
```

#### **2. IPC类型安全系统**

```typescript
// src-electron/types/ipc.ts
export interface IPCChannelMap {
  // 窗口控制
  'window:minimize': { request: void; response: void }
  'window:maximize': { request: void; response: void }
  'window:close': { request: void; response: void }
  'window:is-maximized': { request: void; response: boolean }
  
  // 项目管理
  'project:create-window': { 
    request: { projectPath: string }
    response: { success: boolean; processId?: string; error?: string }
  }
  'project:close-window': { 
    request: { projectPath: string }
    response: { success: boolean; error?: string }
  }
  'project:save': { 
    request: { projectData: ProjectData }
    response: { success: boolean; error?: string }
  }
  'project:get-recent': { 
    request: void
    response: RecentProject[]
  }
  
  // 进程间通信
  'process:broadcast': { 
    request: { message: BroadcastMessage }
    response: void
  }
  'process:send-to-main': { 
    request: { message: any }
    response: void
  }
}

export type IPCChannelName = keyof IPCChannelMap
export type IPCRequest<T extends IPCChannelName> = IPCChannelMap[T]['request']
export type IPCResponse<T extends IPCChannelName> = IPCChannelMap[T]['response']
```

#### **3. 前端API类型声明**

```typescript
// Client/Types/window.d.ts
interface NimbriaWindowAPI {
  window: {
    minimize(): Promise<void>
    close(): Promise<void>
    maximize(): Promise<void>
    unmaximize(): Promise<void>
    isMaximized(): Promise<boolean>
  }
  
  project: {
    createWindow(projectPath: string): Promise<{ success: boolean; processId?: string; error?: string }>
    closeWindow(projectPath: string): Promise<{ success: boolean; error?: string }>
    save(projectData: ProjectData): Promise<{ success: boolean; error?: string }>
    getRecent(): Promise<RecentProject[]>
    broadcastToProjects(message: BroadcastMessage): void
  }
  
  process: {
    sendToMain(message: any): void
    onBroadcast(callback: (message: BroadcastMessage) => void): void
    createWorker(scriptPath: string): Worker
  }
}

declare global {
  interface Window {
    nimbria: NimbriaWindowAPI
  }
}

export {}
```

#### **4. 业务数据类型**

```typescript
// Client/Types/project.ts
export interface ProjectData {
  id: string
  name: string
  path: string
  lastModified: Date
  content: {
    chapters: Chapter[]
    characters: Character[]
    settings: ProjectSettings
  }
}

export interface RecentProject {
  id: string
  name: string
  path: string
  lastOpened: Date
  thumbnail?: string
}

export interface BroadcastMessage {
  type: 'theme-change' | 'project-saved' | 'settings-updated' | string
  data: any
  timestamp: Date
  fromProcess: string
}

export interface Chapter {
  id: string
  title: string
  content: string
  wordCount: number
  createdAt: Date
  modifiedAt: Date
}

export interface Character {
  id: string
  name: string
  description: string
  avatar?: string
}

export interface ProjectSettings {
  theme: 'light' | 'dark' | 'auto'
  fontSize: number
  fontFamily: string
  autoSave: boolean
  autoSaveInterval: number
}
```

### 📋 **详细实施TODO列表**


#### **阶段1: 核心架构 (2-3天)**

**1.1 TypeScript类型系统**
- [ ] 创建 `src-electron/types/process.ts` - 进程相关类型
- [ ] 创建 `src-electron/types/window.ts` - 窗口相关类型  
- [ ] 创建 `src-electron/types/ipc.ts` - IPC通信类型
- [ ] 创建 `Client/Types/window.d.ts` - 前端API类型声明

**1.2 ProcessManager核心**
- [ ] 实现 `src-electron/services/window-service/process-manager.ts`
  - createMainProcess(): Promise<MainWindowProcess>
  - createProjectProcess(path: string): Promise<ProjectWindowProcess>
  - getProcess(id: string): WindowProcess | null
  - destroyProcess(id: string): Promise<void>
  - broadcastMessage(message: BroadcastMessage): void

**1.3 MessageRouter通信**
- [ ] 实现 `src-electron/services/window-service/message-router.ts`
  - setupChannel(process: WindowProcess): MessagePort
  - routeMessage(from: string, to: string, data: any): void
  - closeChannel(processId: string): void

#### **阶段2: IPC与预加载 (2天)**

**2.1 预加载脚本**
- [ ] 重构 `src-electron/core/main-preload.ts` - 主窗口专用
- [ ] 创建 `src-electron/core/project-preload.ts` - 项目窗口专用
- [ ] 更新 `src-electron/core/electron-preload.ts` - 基础通用部分

**2.2 类型安全IPC**
- [ ] 实现 `src-electron/ipc/types/channels.ts` - 通道定义
- [ ] 实现 `src-electron/ipc/main-renderer/ipc-handlers.ts` - 类型安全处理器
- [ ] 创建 `src-electron/ipc/process-bridge/` - 进程桥接层

#### **阶段3: 前端界面 (2天)**

**3.1 主窗口适配**
- [ ] 更新 `Client/GUI/layouts/MainLayout.vue` - 适配新API
- [ ] 更新 `Client/GUI/components/HomeDashboard/` - 项目窗口创建
- [ ] 创建 `Client/GUI/types/window-api.ts` - 前端API类型

**3.2 项目窗口GUI**
- [ ] 创建 `Client/ProjectGUI/layouts/ProjectLayout.vue`
- [ ] 创建 `Client/ProjectGUI/pages/ProjectWorkspace.vue`
- [ ] 创建 `Client/ProjectGUI/components/` 目录结构
- [ ] 创建 `project.html` 项目窗口入口

#### **阶段4: 状态管理与测试 (1-2天)**

**4.1 Pinia多实例**
- [ ] 实现 `Client/stores/main-window/process.store.ts`
- [ ] 实现 `Client/projectStores/project/workspace.store.ts`
- [ ] 实现 `Client/projectStores/project/communication.store.ts`

**4.2 构建配置**
- [ ] 更新 `quasar.config.ts` - 多入口构建
- [ ] 配置TypeScript类型检查
- [ ] 测试类型提示功能

### 🎯 **TypeScript智能提示配置**

#### **1. VSCode智能提示设置**

```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.suggest.autoImports": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.workspaceSymbols.scope": "allOpenProjects"
}
```

#### **2. TSConfig配置优化**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  },
  "include": [
    "src-electron/**/*",
    "Client/**/*",
    "Client/Types/**/*.d.ts"
  ]
}
```

#### **3. 智能提示示例代码**

```typescript
// 使用时的智能提示效果
export default {
  methods: {
    async openProject(projectPath: string) {
      // 💡 TypeScript会提示可用方法和参数类型
      const result = await window.nimbria.project.createWindow(projectPath)
      //                                   ↑ 自动补全: createWindow, closeWindow, save, getRecent
      
      if (result.success) {
        // 💡 TypeScript知道result的类型结构
        console.log('项目窗口创建成功，进程ID:', result.processId)
        //                                      ↑ 类型安全，processId可能为undefined
      } else {
        console.error('创建失败:', result.error)
        //                         ↑ 类型安全，error可能为undefined
      }
    },
    
    async saveProject(data: ProjectData) {
      // 💡 ProjectData类型会被检查
      const result = await window.nimbria.project.save(data)
      //                                           ↑ 参数类型检查
    }
  }
}
```

### 🛠️ **接口调用代码模板**

#### **1. 主进程调用模板**

```typescript
// src-electron/services/window-service/process-manager.ts
export class ProcessManager {
  async createProjectProcess(projectPath: string): Promise<ProjectWindowProcess> {
    const processId = `project-${Date.now()}`
    
    const projectWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, '../core/project-preload.js'),
        nodeIntegrationInWorker: true,
        partition: `persist:project-${processId}`,
      }
    })
    
    // 🔧 MessageChannel通信设置
    const { port1, port2 } = new MessageChannelMain()
    projectWindow.webContents.once('did-finish-load', () => {
      projectWindow.webContents.postMessage('port', null, [port1])
    })
    
    // 🗄️ 进程信息注册
    const processInfo: ProcessInfo = {
      id: processId,
      type: 'project',
      window: projectWindow,
      port: port2,
      processId: projectWindow.webContents.getProcessId(),
      projectPath,
      createdAt: new Date(),
      lastActive: new Date()
    }
    
    this.processes.set(processId, processInfo)
    return processInfo
  }
}
```

#### **2. 前端调用模板**

```vue
<!-- Client/GUI/components/HomeDashboard/QuickActions.vue -->
<script setup lang="ts">
import type { ProjectData, RecentProject } from '@/Types/project'

// 🎯 类型安全的API调用
const openProject = async (projectPath: string) => {
  try {
    const result = await window.nimbria.project.createWindow(projectPath)
    if (result.success) {
      console.log('项目窗口创建成功')
      // 可选：最小化主窗口
      await window.nimbria.window.minimize()
    } else {
      throw new Error(result.error || '未知错误')
    }
  } catch (error) {
    console.error('创建项目窗口失败:', error)
  }
}

// 🔄 获取最近项目
const recentProjects = ref<RecentProject[]>([])
const loadRecentProjects = async () => {
  recentProjects.value = await window.nimbria.project.getRecent()
}

// 📡 进程间通信
const broadcastThemeChange = (theme: string) => {
  window.nimbria.project.broadcastToProjects({
    type: 'theme-change',
    data: { theme },
    timestamp: new Date(),
    fromProcess: 'main'
  })
}
</script>
```

[1 tool called]

## 🎯 **总结**

这个设计方案提供了：

### ✅ **完整的架构设计**
- 详细的文件架构修改树
- 清晰的组件职责划分
- 完整的TypeScript类型系统

### ✅ **类型安全的开发体验**
- 完整的接口定义和类型检查
- IDE智能提示和自动补全
- 编译时错误检测

### ✅ **分阶段实施计划**
- 10个具体的TODO任务
- 4个阶段的递进式开发
- 7-8天的合理工作量估计

### ✅ **实用的代码模板**
- 主进程ProcessManager实现
- 前端API调用示例
- MessageChannel通信模式

