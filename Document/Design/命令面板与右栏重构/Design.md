## 🎯 **极简插件式架构设计（VSCode风格）**

### 📋 **核心设计理念**

1. **命令面板**：只负责显示+搜索+执行，命令来源由外部注册
2. **右侧栏**：只负责标签页管理+显示区域，内容由外部提供
3. **不过度设计**：不在组件内写具体业务逻辑
4. **插件式扩展**：通过简单的API注册命令和面板
5. **API封装**：为右栏与命令面板提供统一的状态操作API

---

### 一、**文件组织架构（符合Nimbria规范）**

```
Nimbria/Client/
├── GUI/
│   ├── components/
│   │   └── ProjectPage.Shell/                    # Shell组件（整合命令面板和右侧栏）
│   │       ├── CommandPalette/                   # 命令面板系统
│   │       │   ├── CommandPalette.vue            # 主组件（仅UI+基础逻辑）
│   │       │   └── CommandPalette.scss           # 样式
│   │       └── RightSidebar/                     # 右侧栏系统
│   │           ├── RightSidebar.vue              # 主组件（标签页容器）
│   │           ├── RightSidebar.scss             # 样式
│   │           └── panels/                        # 右侧栏面板组件
│   │               └── OutlinePanel.vue           # 大纲面板（从OutlineContent迁移）
│   │
│   ├── PagesLayout/
│   │   └── ProjectPage.MainPanel.vue [修改]     # 集成右侧栏（RightSidebar）
│   │
│   └── layouts/
│       └── ProjectMainLayout.vue [修改]         # 移除原有的右栏router-view，集成CommandPalette
│
├── stores/
│   └── projectPage/                              # 按模块组织（遵循Nimbria规范）
│       ├── commandPalette/                       # 命令面板状态模块
│       │   ├── index.ts                          # 统一导出入口
│       │   ├── commandPalette.store.ts           # 命令注册中心（轻量）
│       │   └── types.ts                          # 命令类型定义
│       └── rightSidebar/                         # 右侧栏状态模块
│           ├── index.ts                          # 统一导出入口
│           ├── rightSidebar.store.ts             # 右侧栏状态（轻量）
│           └── types.ts                          # 右侧栏类型定义
│
├── Service/
│   └── CommandPanelRightSidebar/                 # 命令面板与右侧栏API服务层
│       ├── command.api.ts                        # 封装操作 command store 的API
│       └── rightSidebar.api.ts                   # 封装操作 right sidebar store 的API
│
└── Utils/
    └── Plugins/                                   # 插件目录
        ├── commands/                              # 命令插件
        │   ├── index.ts                           # 统一注册所有命令插件
        │   └── view-commands.plugin.ts            # 视图类命令插件实现
        └── panels/                                # 面板插件
            ├── index.ts                           # 统一注册所有面板插件
            └── outline-panel.plugin.ts            # 大纲面板插件实现
```

**🗑️ 需要删除的文件：**
- `Client/GUI/components/ProjectPage.Shell/Outline/OutlineContent.vue` （其内容迁移到 `RightSidebar/panels/OutlinePanel.vue`）

**📝 需要修改的文件：**
- `Client/GUI/layouts/ProjectMainLayout.vue` （移除右栏的 `<el-aside>` 和 `<router-view name="right" />`，集成CommandPalette）
- `Client/GUI/PagesLayout/ProjectPage.Shell.vue` （移除旧的 Outline 相关内容）

---

### 二、**状态设计与API详解**

#### 2.1 **命令面板状态设计**

##### 2.1.1 **核心状态结构**

```typescript
// Client/stores/projectPage/commandPalette/types.ts

/** 命令定义 */
export interface Command {
  id: string                           // 唯一标识（格式: category.action，如 'view.toggleSidebar'）
  label: string                        // 显示文本
  category: CommandCategory            // 分类
  action: () => void | Promise<void>   // 执行函数（由外部提供）
  icon?: string                        // 可选图标（Element Plus icon name）
  keywords?: string[]                  // 搜索关键词（支持中英文）
  shortcut?: string                    // 快捷键显示文本（如 'Ctrl+S'，仅用于展示）
  priority?: number                    // 优先级（数值越大越靠前，默认0）
  when?: () => boolean                 // 显示条件（返回false则不显示）
}

/** 命令分类 */
export type CommandCategory = 
  | 'view'      // 视图操作
  | 'file'      // 文件操作
  | 'edit'      // 编辑操作
  | 'navigate'  // 导航操作
  | 'tools'     // 工具
  | 'custom'    // 自定义

/** Store状态 */
export interface CommandPaletteState {
  commands: Command[]       // 注册的命令列表
  isOpen: boolean          // 面板是否打开
  searchQuery: string      // 当前搜索关键词（可选，用于持久化）
}
```

##### 2.1.2 **Store实现**

```typescript
// Client/stores/projectPage/commandPalette/commandPalette.store.ts

import { defineStore } from 'pinia'
import type { Command, CommandPaletteState } from './types'

export const useCommandPaletteStore = defineStore('commandPalette', () => {
  // ==================== 状态 ====================
  const commands = ref<Command[]>([])
  const isOpen = ref(false)
  
  // ==================== Getters ====================
  
  /** 获取所有可用命令（过滤掉条件不满足的） */
  const availableCommands = computed(() => {
    return commands.value
      .filter(cmd => !cmd.when || cmd.when())
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
  })
  
  /** 按分类分组的命令 */
  const commandsByCategory = computed(() => {
    const grouped = new Map<string, Command[]>()
    
    availableCommands.value.forEach(cmd => {
      const category = cmd.category || 'custom'
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(cmd)
    })
    
    return grouped
  })
  
  // ==================== Actions ====================
  
  /** 注册命令 */
  const register = (command: Command) => {
    // 检查是否已存在
    const existing = commands.value.findIndex(c => c.id === command.id)
    if (existing >= 0) {
      console.warn(`Command "${command.id}" already exists, replacing it.`)
      commands.value[existing] = command
    } else {
      commands.value.push(command)
    }
  }
  
  /** 批量注册 */
  const registerBatch = (cmds: Command[]) => {
    cmds.forEach(register)
  }
  
  /** 注销命令 */
  const unregister = (commandId: string) => {
    const index = commands.value.findIndex(c => c.id === commandId)
    if (index >= 0) {
      commands.value.splice(index, 1)
    }
  }
  
  /** 执行命令 */
  const executeCommand = async (commandId: string) => {
    const command = commands.value.find(c => c.id === commandId)
    if (!command) {
      console.warn(`Command "${commandId}" not found`)
      return false
    }
    
    try {
      await command.action()
      isOpen.value = false
      return true
    } catch (error) {
      console.error(`Failed to execute command "${commandId}":`, error)
      return false
    }
  }
  
  /** 打开面板 */
  const open = () => { isOpen.value = true }
  
  /** 关闭面板 */
  const close = () => { isOpen.value = false }
  
  /** 切换面板 */
  const toggle = () => { isOpen.value = !isOpen.value }
  
  /** 清空所有命令（用于重置） */
  const clear = () => {
    commands.value = []
  }
  
  return {
    // State
    commands,
    isOpen,
    
    // Getters
    availableCommands,
    commandsByCategory,
    
    // Actions
    register,
    registerBatch,
    unregister,
    executeCommand,
    open,
    close,
    toggle,
    clear
  }
})
```

---

#### 2.2 **右侧栏状态设计**

##### 2.2.1 **核心状态结构**

```typescript
// Client/stores/projectPage/rightSidebar/types.ts

/** 右侧栏面板定义 */
export interface RightSidebarPanel {
  id: string                    // 唯一标识
  label: string                 // 标签文本
  component: Component          // Vue组件
  icon?: string                 // 图标（Element Plus icon name）
  closable?: boolean            // 是否可关闭（默认true）
  order?: number                // 排序权重（数值越小越靠前）
  when?: () => boolean          // 显示条件
}

/** Store状态 */
export interface RightSidebarState {
  panels: RightSidebarPanel[]   // 注册的面板列表
  activeId: string | null       // 当前激活的面板ID
  visible: boolean              // 是否可见
  width: string                 // 宽度（如 '280px'）
}
```

##### 2.2.2 **Store实现**

```typescript
// Client/stores/projectPage/rightSidebar/rightSidebar.store.ts

import { defineStore } from 'pinia'
import type { RightSidebarPanel, RightSidebarState } from './types'

const DEFAULT_WIDTH = '280px'
const STORAGE_KEY = 'nimbria:rightSidebar:state'

export const useRightSidebarStore = defineStore('rightSidebar', () => {
  // ==================== 状态 ====================
  const panels = ref<RightSidebarPanel[]>([])
  const activeId = ref<string | null>(null)
  const visible = ref(true)
  const width = ref(DEFAULT_WIDTH)
  
  // ==================== Getters ====================
  
  /** 获取所有可用面板（过滤掉条件不满足的） */
  const availablePanels = computed(() => {
    return panels.value
      .filter(panel => !panel.when || panel.when())
      .sort((a, b) => (a.order || 999) - (b.order || 999))
  })
  
  /** 当前激活的面板 */
  const activePanel = computed(() => {
    return availablePanels.value.find(p => p.id === activeId.value) || null
  })
  
  /** 是否有面板 */
  const hasPanels = computed(() => availablePanels.value.length > 0)
  
  // ==================== Actions ====================
  
  /** 注册面板 */
  const register = (panel: RightSidebarPanel) => {
    const existing = panels.value.findIndex(p => p.id === panel.id)
    if (existing >= 0) {
      console.warn(`Panel "${panel.id}" already exists, replacing it.`)
      panels.value[existing] = panel
    } else {
      panels.value.push(panel)
    }
    
    // 如果没有激活面板，自动激活第一个
    if (!activeId.value && availablePanels.value.length > 0) {
      activeId.value = availablePanels.value[0].id
    }
  }
  
  /** 注销面板 */
  const unregister = (panelId: string) => {
    const index = panels.value.findIndex(p => p.id === panelId)
    if (index >= 0) {
      panels.value.splice(index, 1)
      
      // 如果删除的是当前面板，切换到下一个
      if (activeId.value === panelId) {
        const nextPanel = availablePanels.value[0]
        activeId.value = nextPanel?.id || null
        
        // 如果没有面板了，隐藏侧边栏
        if (!nextPanel) {
          visible.value = false
        }
      }
    }
  }
  
  /** 切换到指定面板 */
  const switchTo = (panelId: string) => {
    const panel = availablePanels.value.find(p => p.id === panelId)
    if (panel) {
      activeId.value = panelId
      visible.value = true
    } else {
      console.warn(`Panel "${panelId}" not found or not available`)
    }
  }
  
  /** 显示侧边栏 */
  const show = () => { 
    if (hasPanels.value) {
      visible.value = true 
    }
  }
  
  /** 隐藏侧边栏 */
  const hide = () => { visible.value = false }
  
  /** 切换显示/隐藏 */
  const toggle = () => { 
    if (hasPanels.value) {
      visible.value = !visible.value 
    }
  }
  
  /** 设置宽度 */
  const setWidth = (newWidth: string) => {
    width.value = newWidth
    persistState()
  }
  
  /** 清空所有面板（用于重置） */
  const clear = () => {
    panels.value = []
    activeId.value = null
  }
  
  // ==================== 持久化 ====================
  
  /** 保存状态到 localStorage */
  const persistState = () => {
    const state = {
      activeId: activeId.value,
      visible: visible.value,
      width: width.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
  
  /** 从 localStorage 恢复状态 */
  const restoreState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const state = JSON.parse(saved)
        activeId.value = state.activeId ?? null
        visible.value = state.visible ?? true
        width.value = state.width ?? DEFAULT_WIDTH
      }
    } catch (error) {
      console.error('Failed to restore rightSidebar state:', error)
    }
  }
  
  // 监听状态变化，自动持久化
  watch([activeId, visible, width], persistState, { deep: true })
  
  // 初始化时恢复状态
  restoreState()
  
  return {
    // State
    panels,
    activeId,
    visible,
    width,
    
    // Getters
    availablePanels,
    activePanel,
    hasPanels,
    
    // Actions
    register,
    unregister,
    switchTo,
    show,
    hide,
    toggle,
    setWidth,
    clear
  }
})
```

---

#### 2.3 **Service层API设计**

##### 2.3.1 **命令API**

```typescript
// Client/Service/CommandPanelRightSidebar/command.api.ts

import { useCommandPaletteStore } from '@stores/projectPage/commandPalette'
import type { Command } from '@stores/projectPage/commandPalette/types'

/**
 * 命令API服务
 * 封装对命令面板状态的所有操作
 */
class CommandApiService {
  /** 获取store实例（确保在Vue上下文中调用） */
  private get store() {
    return useCommandPaletteStore()
  }
  
  // ==================== 命令注册 ====================
  
  /** 注册单个命令 */
  register(command: Command): void {
    this.store.register(command)
  }
  
  /** 批量注册命令 */
  registerBatch(commands: Command[]): void {
    this.store.registerBatch(commands)
  }
  
  /** 注销命令 */
  unregister(commandId: string): void {
    this.store.unregister(commandId)
  }
  
  /** 清空所有命令 */
  clear(): void {
    this.store.clear()
  }
  
  // ==================== 命令执行 ====================
  
  /** 执行命令（返回是否成功） */
  async execute(commandId: string): Promise<boolean> {
    return await this.store.executeCommand(commandId)
  }
  
  // ==================== 面板控制 ====================
  
  /** 打开命令面板 */
  open(): void {
    this.store.open()
  }
  
  /** 关闭命令面板 */
  close(): void {
    this.store.close()
  }
  
  /** 切换命令面板 */
  toggle(): void {
    this.store.toggle()
  }
  
  // ==================== 查询 ====================
  
  /** 获取所有可用命令 */
  getAvailableCommands(): Command[] {
    return this.store.availableCommands
  }
  
  /** 按分类获取命令 */
  getCommandsByCategory(): Map<string, Command[]> {
    return this.store.commandsByCategory
  }
  
  /** 查找命令 */
  findCommand(commandId: string): Command | undefined {
    return this.store.commands.find(c => c.id === commandId)
  }
}

// 导出单例
export const commandApi = new CommandApiService()
```

##### 2.3.2 **右侧栏API**

```typescript
// Client/Service/CommandPanelRightSidebar/rightSidebar.api.ts

import { useRightSidebarStore } from '@stores/projectPage/rightSidebar'
import type { RightSidebarPanel } from '@stores/projectPage/rightSidebar/types'

/**
 * 右侧栏API服务
 * 封装对右侧栏状态的所有操作
 */
class RightSidebarApiService {
  /** 获取store实例 */
  private get store() {
    return useRightSidebarStore()
  }
  
  // ==================== 面板注册 ====================
  
  /** 注册面板 */
  register(panel: RightSidebarPanel): void {
    this.store.register(panel)
  }
  
  /** 注销面板 */
  unregister(panelId: string): void {
    this.store.unregister(panelId)
  }
  
  /** 清空所有面板 */
  clear(): void {
    this.store.clear()
  }
  
  // ==================== 面板切换 ====================
  
  /** 切换到指定面板 */
  switchTo(panelId: string): void {
    this.store.switchTo(panelId)
  }
  
  /** 切换到下一个面板 */
  switchToNext(): void {
    const panels = this.store.availablePanels
    const currentIndex = panels.findIndex(p => p.id === this.store.activeId)
    const nextIndex = (currentIndex + 1) % panels.length
    if (panels[nextIndex]) {
      this.store.switchTo(panels[nextIndex].id)
    }
  }
  
  /** 切换到上一个面板 */
  switchToPrev(): void {
    const panels = this.store.availablePanels
    const currentIndex = panels.findIndex(p => p.id === this.store.activeId)
    const prevIndex = (currentIndex - 1 + panels.length) % panels.length
    if (panels[prevIndex]) {
      this.store.switchTo(panels[prevIndex].id)
    }
  }
  
  // ==================== 显示控制 ====================
  
  /** 显示侧边栏 */
  show(): void {
    this.store.show()
  }
  
  /** 隐藏侧边栏 */
  hide(): void {
    this.store.hide()
  }
  
  /** 切换显示/隐藏 */
  toggle(): void {
    this.store.toggle()
  }
  
  /** 设置宽度 */
  setWidth(width: string): void {
    this.store.setWidth(width)
  }
  
  // ==================== 查询 ====================
  
  /** 获取所有可用面板 */
  getAvailablePanels(): RightSidebarPanel[] {
    return this.store.availablePanels
  }
  
  /** 获取当前激活的面板 */
  getActivePanel(): RightSidebarPanel | null {
    return this.store.activePanel
  }
  
  /** 查找面板 */
  findPanel(panelId: string): RightSidebarPanel | undefined {
    return this.store.panels.find(p => p.id === panelId)
  }
  
  /** 是否有面板 */
  hasPanels(): boolean {
    return this.store.hasPanels
  }
}

// 导出单例
export const rightSidebarApi = new RightSidebarApiService()
```

---

#### 2.4 **API使用示例**

##### 2.4.1 **在插件中使用**

```typescript
// 插件中注册命令
import { commandApi } from '@/Service/CommandPanelRightSidebar/command.api'

commandApi.register({
  id: 'view.toggleSidebar',
  label: '切换右侧栏',
  category: 'view',
  keywords: ['sidebar', '侧边栏'],
  action: () => {
    rightSidebarApi.toggle()
  }
})

// 插件中注册面板
import { rightSidebarApi } from '@/Service/CommandPanelRightSidebar/rightSidebar.api'

rightSidebarApi.register({
  id: 'outline',
  label: '大纲',
  component: OutlinePanel,
  order: 1
})
```

##### 2.4.2 **在组件中使用**

```typescript
// 在组件中直接调用API
import { commandApi } from '@/Service/CommandPanelRightSidebar/command.api'
import { rightSidebarApi } from '@/Service/CommandPanelRightSidebar/rightSidebar.api'

// 打开命令面板
commandApi.open()

// 切换右侧栏
rightSidebarApi.toggle()

// 切换到大纲面板
rightSidebarApi.switchTo('outline')

// 获取所有可用命令
const commands = commandApi.getAvailableCommands()
```

---

### 三、**跨模块状态访问设计（多窗口支持）**

#### 3.1 **问题场景**

在多窗口应用中，命令/面板常需要访问其他业务模块的状态：
- **示例**：查看Markdown大纲的命令，需要获取：
  - 当前打开的文件列表（来自文件管理器）
  - 当前查看的文件（来自编辑器）
  - Markdown内容和大纲数据（来自Markdown模块）

**核心需求**：
1. **无侵入**：不修改被访问模块的业务逻辑
2. **解耦**：命令/面板不直接依赖具体业务模块
3. **多窗口隔离**：每个窗口实例的状态独立
4. **类型安全**：编译时类型检查

---

#### 3.2 **解决方案：状态注册中心**

##### 3.2.1 **核心架构**

```
Client/Service/
├── StateAccess/                          # 状态访问服务
│   ├── state-registry.api.ts            # 状态注册中心API
│   ├── state-provider.interface.ts      # 状态提供者接口
│   └── types.ts                          # 类型定义

业务模块（在 store 初始化时注册状态）：
├── stores/projectPage/markdown/
│   └── markdown.store.ts                 # 注册 'markdown.editor' 状态
├── stores/projectPage/fileManager/
│   └── fileManager.store.ts              # 注册 'file.manager' 状态

命令/面板（通过注册中心访问状态）：
└── Utils/Plugins/commands/
    └── markdown-outline.plugin.ts        # 使用 stateRegistry.get('markdown.editor')
```

##### 3.2.2 **类型定义**

```typescript
// Client/Service/StateAccess/types.ts

/** 状态提供者接口 */
export interface StateProvider<T = any> {
  id: string                              // 状态标识（如 'markdown.editor'）
  getState: () => T                       // 获取当前状态（实时）
  subscribe?: (callback: (state: T) => void) => UnsubscribeFn  // 可选的订阅
}

/** 取消订阅函数 */
export type UnsubscribeFn = () => void

/** 状态访问选项 */
export interface StateAccessOptions {
  fallback?: any                          // 状态不存在时的默认值
  required?: boolean                      // 是否必需（不存在时抛出错误）
}
```

##### 3.2.3 **状态注册中心实现**

```typescript
// Client/Service/StateAccess/state-registry.api.ts

import type { StateProvider, StateAccessOptions, UnsubscribeFn } from './types'

/**
 * 状态注册中心
 * 提供跨模块状态访问能力，支持多窗口隔离
 */
class StateRegistryService {
  private providers = new Map<string, StateProvider>()
  
  // ==================== 注册管理 ====================
  
  /**
   * 注册状态提供者
   * @param provider 状态提供者
   */
  register<T = any>(provider: StateProvider<T>): void {
    if (this.providers.has(provider.id)) {
      console.warn(`StateProvider "${provider.id}" already exists, replacing it.`)
    }
    this.providers.set(provider.id, provider)
  }
  
  /**
   * 注销状态提供者
   * @param providerId 状态标识
   */
  unregister(providerId: string): void {
    this.providers.delete(providerId)
  }
  
  /**
   * 清空所有状态提供者（用于窗口关闭时清理）
   */
  clear(): void {
    this.providers.clear()
  }
  
  // ==================== 状态访问 ====================
  
  /**
   * 获取状态（实时）
   * @param providerId 状态标识
   * @param options 访问选项
   * @returns 状态数据或null
   */
  get<T = any>(providerId: string, options?: StateAccessOptions): T | null {
    const provider = this.providers.get(providerId)
    
    if (!provider) {
      if (options?.required) {
        throw new Error(`Required state provider "${providerId}" not found`)
      }
      return options?.fallback ?? null
    }
    
    try {
      return provider.getState() as T
    } catch (error) {
      console.error(`Failed to get state from "${providerId}":`, error)
      return options?.fallback ?? null
    }
  }
  
  /**
   * 订阅状态变化
   * @param providerId 状态标识
   * @param callback 状态变化回调
   * @returns 取消订阅函数
   */
  subscribe<T = any>(
    providerId: string, 
    callback: (state: T) => void
  ): UnsubscribeFn | null {
    const provider = this.providers.get(providerId)
    
    if (!provider?.subscribe) {
      console.warn(`StateProvider "${providerId}" does not support subscription`)
      return null
    }
    
    return provider.subscribe(callback)
  }
  
  /**
   * 检查状态提供者是否存在
   * @param providerId 状态标识
   */
  has(providerId: string): boolean {
    return this.providers.has(providerId)
  }
  
  /**
   * 获取所有已注册的状态标识
   */
  getRegisteredIds(): string[] {
    return Array.from(this.providers.keys())
  }
}

// 导出单例
export const stateRegistry = new StateRegistryService()
```

---

#### 3.3 **业务模块注册状态**

##### 3.3.1 **Markdown 模块示例**

```typescript
// Client/stores/projectPage/markdown/markdown.store.ts

import { defineStore } from 'pinia'
import { stateRegistry } from '@/Service/StateAccess/state-registry.api'

/** Markdown 编辑器状态（对外暴露） */
export interface MarkdownEditorState {
  currentFile: string | null              // 当前文件路径
  content: string                         // 当前内容
  outline: OutlineItem[]                  // 大纲数据
  isDirty: boolean                        // 是否有未保存修改
  openTabs: MarkdownTab[]                 // 打开的标签页列表
}

export const useMarkdownStore = defineStore('markdown', () => {
  // ==================== 业务状态 ====================
  const activeTab = ref<MarkdownTab | null>(null)
  const tabs = ref<MarkdownTab[]>([])
  const outlineData = ref<OutlineItem[]>([])
  
  // ... 业务逻辑 ...
  
  // ==================== 注册状态提供者 ====================
  
  onMounted(() => {
    stateRegistry.register<MarkdownEditorState>({
      id: 'markdown.editor',
      
      // 实时获取状态
      getState: () => ({
        currentFile: activeTab.value?.filePath || null,
        content: activeTab.value?.content || '',
        outline: outlineData.value,
        isDirty: activeTab.value?.isDirty || false,
        openTabs: tabs.value
      }),
      
      // 支持订阅（可选）
      subscribe: (callback) => {
        const stop = watch(
          [activeTab, tabs, outlineData],
          () => {
            callback({
              currentFile: activeTab.value?.filePath || null,
              content: activeTab.value?.content || '',
              outline: outlineData.value,
              isDirty: activeTab.value?.isDirty || false,
              openTabs: tabs.value
            })
          },
          { deep: true }
        )
        return stop  // 返回取消订阅函数
      }
    })
  })
  
  // 窗口卸载时清理
  onUnmounted(() => {
    stateRegistry.unregister('markdown.editor')
  })
  
  return {
    // ... 导出的 actions ...
  }
})
```

##### 3.3.2 **文件管理器模块示例**

```typescript
// Client/stores/projectPage/fileManager/fileManager.store.ts

import { stateRegistry } from '@/Service/StateAccess/state-registry.api'

/** 文件管理器状态 */
export interface FileManagerState {
  openFiles: string[]                     // 打开的文件列表
  currentDirectory: string                // 当前目录
  selectedFiles: string[]                 // 选中的文件
}

export const useFileManagerStore = defineStore('fileManager', () => {
  const openFiles = ref<string[]>([])
  const currentDirectory = ref<string>('')
  const selectedFiles = ref<string[]>([])
  
  // 注册状态
  onMounted(() => {
    stateRegistry.register<FileManagerState>({
      id: 'file.manager',
      getState: () => ({
        openFiles: openFiles.value,
        currentDirectory: currentDirectory.value,
        selectedFiles: selectedFiles.value
      })
    })
  })
  
  onUnmounted(() => {
    stateRegistry.unregister('file.manager')
  })
  
  return { /* ... */ }
})
```

---

#### 3.4 **命令/面板中使用**

##### 3.4.1 **基础使用**

```typescript
// Client/Utils/Plugins/commands/markdown-outline.plugin.ts

import { commandApi } from '@/Service/CommandPanelRightSidebar/command.api'
import { rightSidebarApi } from '@/Service/CommandPanelRightSidebar/rightSidebar.api'
import { stateRegistry } from '@/Service/StateAccess/state-registry.api'
import type { MarkdownEditorState } from '@stores/projectPage/markdown/types'

export function registerMarkdownOutlineCommand() {
  commandApi.register({
    id: 'markdown.showOutline',
    label: '显示Markdown大纲',
    category: 'view',
    keywords: ['outline', '大纲', 'markdown'],
    
    // 只在有Markdown编辑器时显示
    when: () => stateRegistry.has('markdown.editor'),
    
    action: () => {
      // 获取Markdown编辑器状态
      const editorState = stateRegistry.get<MarkdownEditorState>('markdown.editor')
      
      if (!editorState) {
        console.warn('Markdown editor not available')
        return
      }
      
      // 检查是否有大纲数据
      if (editorState.outline.length === 0) {
        Notify.create({
          type: 'warning',
          message: '当前文件没有大纲'
        })
        return
      }
      
      // 切换到大纲面板
      rightSidebarApi.switchTo('outline')
      
      console.log(`显示大纲：${editorState.outline.length} 项`)
    }
  })
}
```

##### 3.4.2 **高级使用：组合多个状态**

```typescript
// 组合Markdown和文件管理器状态
export function registerSaveAllCommand() {
  commandApi.register({
    id: 'file.saveAll',
    label: '保存所有文件',
    category: 'file',
    
    action: async () => {
      // 获取多个模块的状态
      const editorState = stateRegistry.get<MarkdownEditorState>('markdown.editor')
      const fileState = stateRegistry.get<FileManagerState>('file.manager')
      
      // 判断是否有未保存的文件
      if (!editorState?.isDirty) {
        Notify.create({ message: '没有需要保存的文件' })
        return
      }
      
      // 执行保存
      const markdownStore = useMarkdownStore()
      await markdownStore.saveAllTabs()
      
      console.log(`保存了 ${fileState?.openFiles.length || 0} 个文件`)
    }
  })
}
```

##### 3.4.3 **订阅状态变化**

```typescript
// 在面板组件中订阅状态
export default defineComponent({
  setup() {
    const outline = ref<OutlineItem[]>([])
    
    onMounted(() => {
      // 订阅Markdown编辑器状态
      const unsubscribe = stateRegistry.subscribe<MarkdownEditorState>(
        'markdown.editor',
        (state) => {
          // 状态变化时自动更新
          outline.value = state.outline
        }
      )
      
      // 组件卸载时取消订阅
      onUnmounted(() => {
        unsubscribe?.()
      })
    })
    
    return { outline }
  }
})
```

---

#### 3.5 **多窗口隔离机制**

##### 3.5.1 **问题说明**

在多窗口应用中，每个窗口有独立的Vue实例和Store，但状态注册中心是**全局单例**，如何隔离？

##### 3.5.2 **解决方案：窗口ID前缀**

```typescript
// 为每个窗口的状态提供者添加窗口ID前缀
const windowId = getCurrentWindowId()  // 从Electron获取

stateRegistry.register({
  id: `${windowId}:markdown.editor`,  // 窗口ID前缀
  getState: () => ({ /* ... */ })
})

// 访问时也使用窗口ID
const state = stateRegistry.get(`${windowId}:markdown.editor`)
```

##### 3.5.3 **封装窗口级API**

```typescript
// Client/Service/StateAccess/window-state-registry.api.ts

import { stateRegistry } from './state-registry.api'

/**
 * 窗口级状态注册API
 * 自动添加窗口ID前缀，实现多窗口隔离
 */
class WindowStateRegistryService {
  private windowId: string
  
  constructor() {
    this.windowId = this.getWindowId()
  }
  
  private getWindowId(): string {
    // 从 window.nimbria 获取当前窗口ID（Electron提供）
    return window.nimbria?.getWindowId?.() || 'default'
  }
  
  private prefixId(id: string): string {
    return `${this.windowId}:${id}`
  }
  
  register<T>(provider: StateProvider<T>): void {
    stateRegistry.register({
      ...provider,
      id: this.prefixId(provider.id)
    })
  }
  
  get<T>(providerId: string, options?: StateAccessOptions): T | null {
    return stateRegistry.get<T>(this.prefixId(providerId), options)
  }
  
  subscribe<T>(providerId: string, callback: (state: T) => void) {
    return stateRegistry.subscribe<T>(this.prefixId(providerId), callback)
  }
  
  // 窗口关闭时清理所有相关状态
  cleanup(): void {
    const allIds = stateRegistry.getRegisteredIds()
    const prefix = `${this.windowId}:`
    
    allIds.forEach(id => {
      if (id.startsWith(prefix)) {
        stateRegistry.unregister(id)
      }
    })
  }
}

// 导出窗口级API
export const windowStateRegistry = new WindowStateRegistryService()
```

##### 3.5.4 **业务模块使用窗口级API**

```typescript
// 使用窗口级API，自动隔离
import { windowStateRegistry } from '@/Service/StateAccess/window-state-registry.api'

// 注册时不需要手动添加窗口ID
windowStateRegistry.register({
  id: 'markdown.editor',  // 自动转换为 'window-1:markdown.editor'
  getState: () => ({ /* ... */ })
})

// 访问时也不需要窗口ID
const state = windowStateRegistry.get('markdown.editor')
```

---

#### 3.6 **最佳实践**

##### 3.6.1 **定义状态接口**

```typescript
// Client/stores/projectPage/markdown/state-exports.ts

/** 对外暴露的状态接口（供命令/面板使用） */
export interface MarkdownEditorState {
  currentFile: string | null
  content: string
  outline: OutlineItem[]
  isDirty: boolean
  openTabs: MarkdownTab[]
}

// 在其他地方可以导入这个类型
import type { MarkdownEditorState } from '@stores/projectPage/markdown/state-exports'
```

##### 3.6.2 **状态访问错误处理**

```typescript
// 使用 required 选项确保状态存在
const state = stateRegistry.get<MarkdownEditorState>(
  'markdown.editor',
  { required: true }  // 不存在时抛出错误
)

// 使用 fallback 提供默认值
const state = stateRegistry.get<MarkdownEditorState>(
  'markdown.editor',
  { fallback: { currentFile: null, content: '', outline: [] } }
)
```

##### 3.6.3 **性能优化**

```typescript
// 避免频繁调用 getState，可以缓存结果
let cachedState: MarkdownEditorState | null = null

const unsubscribe = stateRegistry.subscribe<MarkdownEditorState>(
  'markdown.editor',
  (state) => {
    cachedState = state
  }
)

// 后续直接使用缓存
console.log(cachedState?.currentFile)
```

---

### 四、**命令面板实现（使用Headless UI）**

#### 3.1 **CommandPalette.vue（仅UI容器）**

```vue
<!-- Client/GUI/components/ProjectPage.Shell/CommandPalette/CommandPalette.vue -->
<template>
  <!-- 使用 Headless UI 的 Combobox -->
  <TransitionRoot :show="commandStore.isOpen" as="template">
    <Dialog as="div" class="command-palette-dialog" @close="commandStore.close()">
      <TransitionChild
        enter="duration-200 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-150 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="dialog-overlay" />
      </TransitionChild>

      <div class="dialog-container">
        <TransitionChild
          enter="duration-200 ease-out"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="duration-150 ease-in"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel class="palette-panel">
            <Combobox v-model="selected" @update:modelValue="handleExecute">
              <div class="palette-input-wrapper">
                <ComboboxInput
                  class="palette-input"
                  placeholder="输入命令..."
                  @change="query = $event.target.value"
                />
              </div>

              <ComboboxOptions class="palette-options">
                <div v-if="filteredCommands.length === 0" class="empty-state">
                  未找到命令
                </div>
                
                <ComboboxOption
                  v-for="command in filteredCommands"
                  :key="command.id"
                  :value="command"
                  v-slot="{ active }"
                >
                  <li :class="['command-item', { 'active': active }]">
                    <span class="command-label">{{ command.label }}</span>
                    <span v-if="command.category" class="command-category">
                      {{ command.category }}
                    </span>
                  </li>
                </ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/vue'
import { useCommandPaletteStore } from '@stores/projectPage/commandPalette'

const commandStore = useCommandPaletteStore()
const query = ref('')
const selected = ref(null)

// 过滤命令（仅UI逻辑）
const filteredCommands = computed(() => {
  const q = query.value.toLowerCase()
  if (!q) return commandStore.commands
  
  return commandStore.commands.filter(cmd => 
    cmd.label.toLowerCase().includes(q) ||
    cmd.keywords?.some(k => k.toLowerCase().includes(q))
  )
})

// 执行命令（调用外部提供的action）
const handleExecute = (command: any) => {
  if (command) {
    commandStore.executeCommand(command.id)
  }
}
</script>

<style scoped lang="scss">
@import './CommandPalette.scss';
</style>
```

#### 3.2 **commandPalette.store.ts（极简注册中心）**

```typescript
// Client/stores/projectPage/commandPalette/commandPalette.store.ts

import { defineStore } from 'pinia'
import type { Command } from './types'

export const useCommandPaletteStore = defineStore('commandPalette', () => {
  // ==================== 状态 ====================
  const commands = ref<Command[]>([])
  const isOpen = ref(false)
  
  // ==================== Actions ====================
  
  /** 注册命令（由API调用） */
  const register = (command: Command) => {
    const existing = commands.value.findIndex(c => c.id === command.id)
    if (existing >= 0) {
      commands.value[existing] = command
    } else {
      commands.value.push(command)
    }
  }
  
  /** 批量注册（由API调用） */
  const registerBatch = (cmds: Command[]) => {
    cmds.forEach(register)
  }
  
  /** 注销命令（由API调用） */
  const unregister = (commandId: string) => {
    const index = commands.value.findIndex(c => c.id === commandId)
    if (index >= 0) {
      commands.value.splice(index, 1)
    }
  }
  
  /** 执行命令 */
  const executeCommand = async (commandId: string) => {
    const command = commands.value.find(c => c.id === commandId)
    if (!command) return
    
    try {
      await command.action()  // 调用外部提供的函数
      isOpen.value = false
    } catch (error) {
      console.error(`Command execution failed: ${commandId}`, error)
    }
  }
  
  /** 打开/关闭面板 */
  const open = () => { isOpen.value = true }
  const close = () => { isOpen.value = false }
  const toggle = () => { isOpen.value = !isOpen.value }
  
  return {
    commands,
    isOpen,
    register,
    registerBatch,
    unregister,
    executeCommand,
    open,
    close,
    toggle
  }
})
```

---

### 四、**右侧栏实现（Element Plus Tabs）**

#### 4.1 **RightSidebar.vue（标签页容器）**

```vue
<!-- Client/GUI/components/ProjectPage.Shell/RightSidebar/RightSidebar.vue -->
<template>
  <div v-if="rightSidebarStore.visible" class="right-sidebar">
    <el-tabs
      v-model="rightSidebarStore.activeId"
      type="card"
      closable
      @tab-remove="handleRemove"
    >
      <el-tab-pane
        v-for="panel in rightSidebarStore.panels"
        :key="panel.id"
        :name="panel.id"
        :label="panel.label"
        :closable="panel.closable !== false"
      >
        <!-- 动态组件（由外部提供） -->
        <component :is="panel.component" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { useRightSidebarStore } from '@stores/projectPage/rightSidebar'

const rightSidebarStore = useRightSidebarStore()

const handleRemove = (panelId: string) => {
  rightSidebarStore.unregister(panelId)
}
</script>

<style scoped lang="scss">
@import './RightSidebar.scss';
</style>
```

#### 4.2 **rightSidebar.store.ts（极简标签管理）**

```typescript
// Client/stores/projectPage/rightSidebar/rightSidebar.store.ts

import { defineStore } from 'pinia'
import type { RightSidebarPanel } from './types'

export const useRightSidebarStore = defineStore('rightSidebar', () => {
  // ==================== 状态 ====================
  const panels = ref<RightSidebarPanel[]>([])
  const activeId = ref<string | null>(null)
  const visible = ref(true)
  
  // ==================== Actions ====================
  
  /** 注册面板（由API调用） */
  const register = (panel: RightSidebarPanel) => {
    const existing = panels.value.findIndex(p => p.id === panel.id)
    if (existing >= 0) {
      panels.value[existing] = panel
    } else {
      panels.value.push(panel)
    }
    
    // 如果是第一个面板，自动激活
    if (!activeId.value && panels.value.length > 0) {
      activeId.value = panel.id
    }
  }
  
  /** 注销面板（由API调用） */
  const unregister = (panelId: string) => {
    const index = panels.value.findIndex(p => p.id === panelId)
    if (index >= 0) {
      panels.value.splice(index, 1)
      
      // 如果删除的是当前面板，切换到下一个
      if (activeId.value === panelId) {
        activeId.value = panels.value[0]?.id || null
      }
    }
  }
  
  /** 切换面板 */
  const switchTo = (panelId: string) => {
    activeId.value = panelId
    visible.value = true
  }
  
  /** 显示/隐藏 */
  const show = () => { visible.value = true }
  const hide = () => { visible.value = false }
  const toggle = () => { visible.value = !visible.value }
  
  return {
    panels,
    activeId,
    visible,
    register,
    unregister,
    switchTo,
    show,
    hide,
    toggle
  }
})
```

---

### 五、**Service层API实现**

#### 5.1 **命令注册API**

```typescript
// Client/Service/CommandPanelRightSidebar/command.api.ts

import { useCommandPaletteStore } from '@stores/projectPage/commandPalette'
import type { Command } from '@stores/projectPage/commandPalette/types'

/**
 * 命令注册API服务
 * 提供与命令状态交互的封装接口
 */
class CommandApiService {
  private get store() {
    // 确保在组件上下文中调用
    return useCommandPaletteStore()
  }
  
  /** 注册单个命令 */
  register(command: Command) {
    this.store.register(command)
  }
  
  /** 批量注册命令 */
  registerBatch(commands: Command[]) {
    this.store.registerBatch(commands)
  }
  
  /** 注销命令 */
  unregister(commandId: string) {
    this.store.unregister(commandId)
  }
}

// 导出单例
export const commandApi = new CommandApiService()
```

#### 5.2 **右侧栏注册API**

```typescript
// Client/Service/CommandPanelRightSidebar/rightSidebar.api.ts

import { useRightSidebarStore } from '@stores/projectPage/rightSidebar'
import type { RightSidebarPanel } from '@stores/projectPage/rightSidebar/types'

/**
 * 右侧栏API服务
 * 提供与右侧栏状态交互的封装接口
 */
class RightSidebarApiService {
  private get store() {
    return useRightSidebarStore()
  }
  
  /** 注册面板 */
  register(panel: RightSidebarPanel) {
    this.store.register(panel)
  }
  
  /** 注销面板 */
  unregister(panelId: string) {
    this.store.unregister(panelId)
  }
}

// 导出单例
export const rightSidebarApi = new RightSidebarApiService()
```

---

### 六、**插件实现 (Utils/Plugins)**

#### 6.1 **视图命令插件**

```typescript
// Client/Utils/Plugins/commands/view-commands.plugin.ts

import { commandApi } from '@/Service/CommandPanelRightSidebar/command.api'
import { useRightSidebarStore } from '@stores/projectPage/rightSidebar'
import type { Command } from '@stores/projectPage/commandPalette/types'

const createViewCommands = (): Command[] => {
  // store 可以在 action 中按需获取
  const rightSidebarStore = useRightSidebarStore()

  return [
    {
      id: 'view.toggleRightSidebar',
      label: '切换右侧栏',
      category: 'view',
      keywords: ['sidebar', '侧边栏', '右栏'],
      action: () => {
        rightSidebarStore.toggle()
      }
    },
    {
      id: 'view.showOutline',
      label: '显示大纲',
      category: 'view',
      keywords: ['outline', '大纲'],
      action: () => {
        rightSidebarStore.switchTo('outline')
      }
    }
  ]
}

/**
 * 注册视图命令插件
 */
export function registerViewCommands() {
  commandApi.registerBatch(createViewCommands())
}
```

#### 6.2 **大纲面板插件**

```typescript
// Client/Utils/Plugins/panels/outline-panel.plugin.ts

import { rightSidebarApi } from '@/Service/CommandPanelRightSidebar/rightSidebar.api'
import { defineAsyncComponent } from 'vue'

/**
 * 注册大纲面板插件
 */
export function registerOutlinePanel() {
  rightSidebarApi.register({
    id: 'outline',
    label: '大纲',
    component: defineAsyncComponent(() => 
      import('@components/ProjectPage.Shell/RightSidebar/panels/OutlinePanel.vue')
    ),
    closable: false
  })
}
```

---

### 七、**集成到项目**

#### 7.1 **插件统一注册**

```typescript
// Client/Utils/Plugins/commands/index.ts

import { registerViewCommands } from './view-commands.plugin'

export function registerAllCommandPlugins() {
  registerViewCommands()
  // ... 在此注册其他命令插件
}
```

```typescript
// Client/Utils/Plugins/panels/index.ts

import { registerOutlinePanel } from './outline-panel.plugin'

export function registerAllPanelPlugins() {
  registerOutlinePanel()
  // ... 在此注册其他面板插件
}
```

#### 7.2 **在应用中调用**

```typescript
// Client/GUI/Index/ProjectPageSystem.vue

import { onMounted } from 'vue'
import { registerAllCommandPlugins } from '@/Utils/Plugins/commands'
import { registerAllPanelPlugins } from '@/Utils/Plugins/panels'

onMounted(() => {
  // 注册所有插件
  registerAllCommandPlugins()
  registerAllPanelPlugins()
})
```

---

### 八、**快捷键监听**

```typescript
// Client/GUI/layouts/ProjectMainLayout.vue

import { onMounted, onUnmounted } from 'vue'
import { useCommandPaletteStore } from '@stores/projectPage/commandPalette'

const commandStore = useCommandPaletteStore()

const handleKeydown = (e: KeyboardEvent) => {
  // Ctrl+Shift+P 打开命令面板
  if (e.ctrlKey && e.shiftKey && e.key === 'P') {
    e.preventDefault()
    commandStore.toggle()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
```

---

## ✅ **设计优势**

1. **极简**：组件只做显示+基础操作，0业务逻辑
2. **插件式**：命令和面板都由插件实现，通过Service层API注册，易扩展
3. **类型安全**：完整的TypeScript类型定义
4. **符合规范**：严格遵循Nimbria的文件组织架构
5. **无过度设计**：只有必要的抽象，没有复杂的注册机制
6. **清晰分层**：Store负责状态，Service负责API，Utils/Plugins负责实现，GUI负责展示

---
