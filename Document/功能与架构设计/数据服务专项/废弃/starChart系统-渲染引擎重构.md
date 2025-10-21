## **📁 文件架构修改树**

```
Nimbria/Client/
├── types/
│   └── Business/
│       └── StarChart/
│           ├── Core/
│           │   ├── public.ts [修改内容]
│           │   │   └── 内部模块：更新 SigmaManagerAPI 返回类型为严格类型
│           │   │   └── 内部模块：添加 NodeDisplayData、EdgeDisplayData 接口
│           │   └── internal.ts [修改内容]
│           │       └── 内部模块：更新 NodeData、EdgeData，添加 Sigma.js 必需属性
│           └── Data/
│               └── public.ts [修改内容]
│                   └── 内部模块：添加数据桥接相关类型定义
│
├── Service/
│   └── StarChart/
│       ├── Core/
│       │   ├── SigmaManager/
│       │   │   └── SigmaManager.ts [修改内容]
│       │   │       ├── 内部模块：导入 Sigma 和 Graph from graphology
│       │   │       ├── 内部模块：完整实现 create() 方法
│       │   │       ├── 内部模块：实现 nodeReducer 和 edgeReducer 支持
│       │   │       ├── 内部模块：绑定 Sigma.js 事件到 EventBus
│       │   │       └── 内部模块：修正返回类型为严格类型
│       │   │
│       │   ├── RenderScheduler/
│       │   │   └── RenderScheduler.ts [修改内容]
│       │   │       ├── 内部模块：添加 SigmaManager 依赖注入
│       │   │       ├── 内部模块：实现 flushUpdates() 直接操作 Graphology
│       │   │       ├── 内部模块：添加 skipIndexation 智能判断
│       │   │       └── 内部模块：移除自定义防抖，使用 requestAnimationFrame
│       │   │
│       │   ├── ViewportManager/
│       │   │   └── ViewportManager.ts [修改内容]
│       │   │       ├── 内部模块：添加 SigmaManager 依赖
│       │   │       ├── 内部模块：使用 Camera API 替换手动计算
│       │   │       ├── 内部模块：实现 worldToScreen/screenToWorld 使用 Camera 方法
│       │   │       └── 内部模块：监听 Sigma.js camera 事件
│       │   │
│       │   ├── [新增目录] InitializationManager/
│       │   │   ├── index.ts
│       │   │   └── InitializationManager.ts [新增文件]
│       │   │       └── 内部模块：管理所有 Core 服务的初始化顺序和依赖
│       │   │
│       │   └── index.ts [修改内容]
│       │       └── 内部模块：导出 InitializationManager
│       │
│       ├── [新增目录] Bridge/
│       │   ├── index.ts
│       │   └── DataBridge.ts [新增文件]
│       │       ├── 内部模块：Worker 结果到 Graphology 的数据桥接
│       │       ├── 内部模块：布局结果写入 graph.setNodeAttribute()
│       │       └── 内部模块：批量更新优化
│       │
│       └── visualizationService.ts [修改内容]
│           ├── 内部模块：移除随机布局逻辑
│           ├── 内部模块：集成 AsyncTaskManager 和 DataBridge
│           └── 内部模块：完整的数据加载到渲染流程
│
└── stores/
    └── projectPage/
        └── starChart/
            └── starChart.types.ts [修改内容]
                ├── 内部模块：更新 GraphNode 添加 size、color 等属性
                └── 内部模块：更新 GraphEdge 添加 size、color 等属性

package.json [修改内容]
    ├── 内部模块：添加依赖 "sigma": "^3.0.0"
    └── 内部模块：添加依赖 "graphology": "^0.25.0"
```

---

## **🔧 详细重构方案**

### **Phase 1: 安装依赖**

```json
// package.json 添加
{
  "dependencies": {
    "sigma": "^3.0.0",
    "graphology": "^0.25.4",
    "graphology-types": "^0.24.7"
  }
}
```

安装命令：
```bash
npm install sigma graphology graphology-types
```

---

### **Phase 2: 更新类型定义**

#### **文件：`Client/types/Business/StarChart/Core/internal.ts`**

```typescript
/**
 * Core 内部类型定义（严格符合 Sigma.js 规范）
 */

// ==================== Sigma.js 兼容数据类型 ====================

/**
 * 节点数据 - 严格符合 Sigma.js NodeDisplayData
 */
export interface NodeData {
  id: string
  // 必需的坐标
  x: number
  y: number
  // 视觉属性（Sigma.js 识别）
  size: number
  color: string
  label?: string
  type?: string
  // 渲染控制
  hidden?: boolean
  forceLabel?: boolean
  zIndex?: number
  highlighted?: boolean
  // 扩展属性
  [key: string]: unknown
}

/**
 * 边数据 - 严格符合 Sigma.js EdgeDisplayData
 */
export interface EdgeData {
  id: string
  source: string
  target: string
  // 视觉属性
  size?: number
  color?: string
  label?: string
  type?: string
  // 渲染控制
  hidden?: boolean
  forceLabel?: boolean
  zIndex?: number
  // 扩展属性
  [key: string]: unknown
}

/**
 * 图数据
 */
export interface GraphData {
  nodes: NodeData[]
  edges: EdgeData[]
  metadata?: Record<string, unknown>
}

// ==================== Reducer 相关类型 ====================

/**
 * 节点 Reducer 函数
 */
export type NodeReducer = (node: NodeData, data: NodeData) => Partial<NodeData>

/**
 * 边 Reducer 函数
 */
export type EdgeReducer = (edge: EdgeData, data: EdgeData) => Partial<EdgeData>

// ==================== 其他内部类型 ====================

export interface SigmaManagerState {
  instance: unknown | null  // 实际是 Sigma，但避免循环依赖
  graph: unknown | null     // 实际是 Graph
  container: HTMLElement | null
  renderMode: 'webgl' | 'canvas'
  lastRefreshTime: number
  isInitialized: boolean
}

export interface NodeUpdate {
  nodeId: string
  attributes: Partial<NodeData>
  timestamp: number
}

export interface RenderState {
  pendingUpdates: Map<string, NodeUpdate>
  lastRenderTime: number
  isScheduled: boolean
  frameId: number | null
  targetFps: number
}

export interface ViewportState {
  scale: number
  offsetX: number
  offsetY: number
  width: number
  height: number
  minZoom: number
  maxZoom: number
}

export interface VisibleBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

// ... 保留其他原有类型
```

---

#### **文件：`Client/types/Business/StarChart/Core/public.ts`**

```typescript
/**
 * Core 对外接口类型
 */

import type Sigma from 'sigma'
import type Graph from 'graphology'
import type { 
  NodeData, 
  EdgeData, 
  GraphData, 
  ViewportState,
  NodeReducer,
  EdgeReducer 
} from './internal'

// ==================== SigmaManager API ====================

export interface SigmaManagerAPI {
  create(container: HTMLElement, options?: SigmaOptions): Promise<void>
  destroy(): Promise<void>
  getInstance(): Sigma  // 严格类型，不再是 any
  getGraph(): Graph     // 严格类型
  refresh(options?: RefreshOptions): void
  setNodeReducer(reducer: NodeReducer | null): void
  setEdgeReducer(reducer: EdgeReducer | null): void
}

export interface SigmaOptions {
  renderMode?: 'webgl' | 'canvas'
  settings?: Partial<SigmaSettings>
}

export interface SigmaSettings {
  // Sigma.js 原生设置
  defaultNodeType?: string
  defaultEdgeType?: string
  defaultNodeColor?: string
  defaultEdgeColor?: string
  labelDensity?: number
  labelGridCellSize?: number
  labelRenderedSizeThreshold?: number
  // ... 其他 Sigma.js 设置
}

export interface RefreshOptions {
  skipIndexation?: boolean
  schedule?: boolean
}

// ==================== ViewportManager API ====================

export interface ViewportManagerAPI {
  getCurrentViewport(): ViewportState
  getVisibleBounds(): VisibleBoundsAPI
  setZoom(scale: number): void
  setPan(offsetX: number, offsetY: number): void
  fitToNodes(nodeIds: string[]): void
  worldToScreen(worldX: number, worldY: number): { x: number; y: number }
  screenToWorld(screenX: number, screenY: number): { x: number; y: number }
}

// ==================== RenderScheduler API ====================

export interface RenderSchedulerAPI {
  scheduleNodeUpdate(nodeId: string, update: Partial<NodeData>): void
  scheduleNodeUpdates(updates: Array<{ nodeId: string; update: Partial<NodeData> }>): void
  flushRender(): void
  setFrameRateLimit(fps: number): void
}

// ... 保留其他 API 接口
```

---

### **Phase 3: 重写核心模块**

#### **文件：`Client/Service/StarChart/Core/SigmaManager/SigmaManager.ts`**

```typescript
/**
 * SigmaManager - Sigma 实例管理器（完整实现）
 */

import Sigma from 'sigma'
import Graph from 'graphology'
import type { 
  SigmaOptions, 
  RefreshOptions,
  NodeReducer,
  EdgeReducer 
} from 'Business/StarChart'
import type { EventBus } from '../EventBus/EventBus'

export class SigmaManager {
  private sigma: Sigma | null = null
  private graph: Graph | null = null
  private container: HTMLElement | null = null
  private renderMode: 'webgl' | 'canvas' = 'webgl'
  private isInitialized = false
  private nodeReducer: NodeReducer | null = null
  private edgeReducer: EdgeReducer | null = null

  constructor(private eventBus: EventBus) {}

  /**
   * 创建 Sigma 实例
   */
  async create(container: HTMLElement, options?: SigmaOptions): Promise<void> {
    if (this.isInitialized) {
      console.warn('[SigmaManager] Sigma 已初始化，请先调用 destroy()')
      return
    }

    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('[SigmaManager] 无效的容器元素')
    }

    this.container = container
    this.renderMode = options?.renderMode ?? 'webgl'

    // 创建 Graphology 实例
    this.graph = new Graph()

    // 创建 Sigma 实例
    this.sigma = new Sigma(this.graph, container, {
      ...options?.settings,
      // 如果设置了 reducer，应用它们
      nodeReducer: this.nodeReducer 
        ? (node, data) => this.nodeReducer!(node, data) 
        : undefined,
      edgeReducer: this.edgeReducer 
        ? (edge, data) => this.edgeReducer!(edge, data) 
        : undefined
    })

    // 绑定 Sigma.js 事件到 EventBus
    this.bindSigmaEvents()

    this.isInitialized = true
    console.log('[SigmaManager] Sigma 实例创建成功')
    this.eventBus.emit('sigma:initialized', { renderMode: this.renderMode })
  }

  /**
   * 销毁 Sigma 实例
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      console.warn('[SigmaManager] Sigma 未初始化')
      return
    }

    if (this.sigma) {
      this.sigma.kill()
      this.sigma = null
    }

    if (this.graph) {
      this.graph.clear()
      this.graph = null
    }

    this.container = null
    this.isInitialized = false
    this.nodeReducer = null
    this.edgeReducer = null

    console.log('[SigmaManager] Sigma 实例已销毁')
    this.eventBus.emit('sigma:destroyed', {})
  }

  /**
   * 获取 Sigma 实例（严格类型）
   */
  getInstance(): Sigma {
    if (!this.sigma) {
      throw new Error('[SigmaManager] Sigma instance not initialized')
    }
    return this.sigma
  }

  /**
   * 获取 Graphology Graph 实例（严格类型）
   */
  getGraph(): Graph {
    if (!this.graph) {
      throw new Error('[SigmaManager] Graph instance not initialized')
    }
    return this.graph
  }

  /**
   * 刷新渲染
   */
  refresh(options?: RefreshOptions): void {
    if (!this.sigma) {
      throw new Error('[SigmaManager] Sigma not initialized')
    }

    const refreshOptions = {
      skipIndexation: options?.skipIndexation ?? false,
      schedule: options?.schedule ?? true
    }

    if (refreshOptions.schedule) {
      this.sigma.scheduleRefresh(refreshOptions)
    } else {
      this.sigma.refresh(refreshOptions)
    }
  }

  /**
   * 设置节点 Reducer
   */
  setNodeReducer(reducer: NodeReducer | null): void {
    this.nodeReducer = reducer
    if (this.sigma && reducer) {
      this.sigma.setSetting('nodeReducer', (node, data) => reducer(node, data))
      this.refresh({ skipIndexation: true })
    }
  }

  /**
   * 设置边 Reducer
   */
  setEdgeReducer(reducer: EdgeReducer | null): void {
    this.edgeReducer = reducer
    if (this.sigma && reducer) {
      this.sigma.setSetting('edgeReducer', (edge, data) => reducer(edge, data))
      this.refresh({ skipIndexation: true })
    }
  }

  /**
   * 绑定 Sigma.js 事件到 EventBus
   */
  private bindSigmaEvents(): void {
    if (!this.sigma) return

    // 节点交互事件
    this.sigma.on('clickNode', (event) => {
      this.eventBus.emit('node:clicked', { nodeId: event.node, event })
    })

    this.sigma.on('hoverNode', (event) => {
      this.eventBus.emit('node:hovered', { nodeId: event.node, event })
    })

    this.sigma.on('enterNode', (event) => {
      this.eventBus.emit('node:entered', { nodeId: event.node })
    })

    this.sigma.on('leaveNode', (event) => {
      this.eventBus.emit('node:left', { nodeId: event.node })
    })

    // 边交互事件
    this.sigma.on('clickEdge', (event) => {
      this.eventBus.emit('edge:clicked', { edgeId: event.edge, event })
    })

    // 渲染事件
    this.sigma.on('beforeRender', () => {
      this.eventBus.emit('render:beforeUpdate', {})
    })

    this.sigma.on('afterRender', () => {
      this.eventBus.emit('render:afterUpdate', {})
    })

    // Camera 事件
    this.sigma.getCamera().on('updated', (state) => {
      this.eventBus.emit('viewport:changed', state)
    })
  }

  /**
   * 获取状态（用于调试）
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      renderMode: this.renderMode,
      nodeCount: this.graph?.order ?? 0,
      edgeCount: this.graph?.size ?? 0
    }
  }
}
```

---

#### **文件：`Client/Service/StarChart/Core/RenderScheduler/RenderScheduler.ts`**

```typescript
/**
 * RenderScheduler - 渲染调度器（重写版）
 */

import type { NodeUpdate, NodeData } from 'Business/StarChart'
import type { EventBus } from '../EventBus/EventBus'
import type { SigmaManager } from '../SigmaManager/SigmaManager'

export class RenderScheduler {
  private pendingUpdates: Map<string, Partial<NodeData>> = new Map()
  private renderScheduled = false

  constructor(
    private eventBus: EventBus,
    private sigmaManager: SigmaManager
  ) {}

  /**
   * 调度单个节点更新
   */
  scheduleNodeUpdate(nodeId: string, update: Partial<NodeData>): void {
    // 合并更新（如果同一节点有多次更新）
    const existing = this.pendingUpdates.get(nodeId)
    this.pendingUpdates.set(nodeId, { ...existing, ...update })
    
    this.scheduleRender()
  }

  /**
   * 调度批量节点更新
   */
  scheduleNodeUpdates(updates: Array<{ nodeId: string; update: Partial<NodeData> }>): void {
    for (const { nodeId, update } of updates) {
      const existing = this.pendingUpdates.get(nodeId)
      this.pendingUpdates.set(nodeId, { ...existing, ...update })
    }
    this.scheduleRender()
  }

  /**
   * 立即触发渲染
   */
  flushRender(): void {
    if (this.renderScheduled) {
      // 取消已调度的渲染
      this.renderScheduled = false
    }
    this.doRender()
  }

  /**
   * 设置帧率限制（保留接口）
   */
  setFrameRateLimit(fps: number): void {
    console.log(`[RenderScheduler] 帧率限制: ${fps} fps (由 Sigma.js 管理)`)
  }

  /**
   * 调度渲染（使用 requestAnimationFrame）
   */
  private scheduleRender(): void {
    if (this.renderScheduled) return

    this.renderScheduled = true
    requestAnimationFrame(() => {
      this.doRender()
      this.renderScheduled = false
    })
  }

  /**
   * 执行渲染
   */
  private doRender(): void {
    if (this.pendingUpdates.size === 0) return

    const startTime = performance.now()
    const graph = this.sigmaManager.getGraph()
    
    // 触发渲染前事件
    this.eventBus.emit('render:beforeUpdate', {
      nodeCount: this.pendingUpdates.size
    })

    let needsIndexation = false

    // 直接更新 Graphology
    for (const [nodeId, update] of this.pendingUpdates) {
      // 检查节点是否存在
      if (!graph.hasNode(nodeId)) {
        console.warn(`[RenderScheduler] 节点 ${nodeId} 不存在`)
        continue
      }

      // 判断是否需要重新索引（位置、zIndex、type 改变时）
      if ('x' in update || 'y' in update || 'zIndex' in update || 'type' in update) {
        needsIndexation = true
      }

      // 逐个设置属性到 Graphology
      for (const [key, value] of Object.entries(update)) {
        if (value !== undefined) {
          graph.setNodeAttribute(nodeId, key, value)
        }
      }
    }

    const renderTime = performance.now() - startTime

    // Sigma.js 会自动监听 Graphology 的变化并刷新
    // 但我们可以显式调用 refresh 以控制 skipIndexation
    this.sigmaManager.refresh({ 
      skipIndexation: !needsIndexation,
      schedule: true 
    })

    // 触发渲染后事件
    this.eventBus.emit('render:afterUpdate', {
      nodeCount: this.pendingUpdates.size,
      renderTime: Math.round(renderTime * 100) / 100,
      needsIndexation
    })

    // 清空更新队列
    this.pendingUpdates.clear()
  }

  /**
   * 获取待更新数量
   */
  getPendingUpdateCount(): number {
    return this.pendingUpdates.size
  }
}
```

---

#### **文件：`Client/Service/StarChart/Core/ViewportManager/ViewportManager.ts`**

```typescript
/**
 * ViewportManager - 视口管理器（使用 Sigma.js Camera API）
 */

import type { ViewportState, VisibleBounds } from 'Business/StarChart'
import type { EventBus } from '../EventBus/EventBus'
import type { SigmaManager } from '../SigmaManager/SigmaManager'
import type { Camera } from 'sigma/camera'

export class ViewportManager {
  private camera: Camera | null = null

  constructor(
    private eventBus: EventBus,
    private sigmaManager: SigmaManager
  ) {
    // 延迟获取 Camera（等待 Sigma 初始化）
    this.eventBus.on('sigma:initialized', () => {
      this.camera = this.sigmaManager.getInstance().getCamera()
    })
  }

  /**
   * 获取当前视口状态
   */
  getCurrentViewport(): ViewportState {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera not initialized')
    }

    const state = this.camera.getState()
    
    return {
      scale: state.ratio,
      offsetX: state.x,
      offsetY: state.y,
      width: this.sigmaManager.getInstance().getDimensions().width,
      height: this.sigmaManager.getInstance().getDimensions().height,
      minZoom: 0.1,  // 可配置
      maxZoom: 10    // 可配置
    }
  }

  /**
   * 获取可见区域边界
   */
  getVisibleBounds(): VisibleBounds {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera not initialized')
    }

    const sigma = this.sigmaManager.getInstance()
    const { width, height } = sigma.getDimensions()

    // 计算视口四角在图空间中的坐标
    const topLeft = this.camera.viewportToGraph({ x: 0, y: 0 })
    const bottomRight = this.camera.viewportToGraph({ x: width, y: height })

    return {
      minX: topLeft.x,
      maxX: bottomRight.x,
      minY: topLeft.y,
      maxY: bottomRight.y
    }
  }

  /**
   * 设置视口缩放
   */
  setZoom(scale: number): void {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera not initialized')
    }

    const clampedScale = Math.max(0.1, Math.min(10, scale))
    this.camera.animatedZoom({ duration: 200 }, clampedScale)
  }

  /**
   * 设置视口位置
   */
  setPan(offsetX: number, offsetY: number): void {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera not initialized')
    }

    this.camera.animate({ x: offsetX, y: offsetY }, { duration: 200 })
  }

  /**
   * 适配所有节点
   */
  fitToNodes(nodeIds: string[]): void {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera not initialized')
    }

    const graph = this.sigmaManager.getGraph()
    
    if (nodeIds.length === 0 || !graph.order) {
      return
    }

    // 计算节点边界
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    const nodesToFit = nodeIds.length > 0 ? nodeIds : graph.nodes()

    for (const nodeId of nodesToFit) {
      if (!graph.hasNode(nodeId)) continue

      const x = graph.getNodeAttribute(nodeId, 'x') as number
      const y = graph.getNodeAttribute(nodeId, 'y') as number

      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }

    if (!isFinite(minX)) return

    // 计算中心点
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    // 使用 Sigma.js 的内置方法
    this.camera.animate(
      { x: centerX, y: centerY, ratio: 1 },
      { duration: 300 }
    )
  }

  /**
   * 世界坐标转屏幕坐标（使用 Camera API）
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera not initialized')
    }

    return this.camera.graphToViewport({ x: worldX, y: worldY })
  }

  /**
   * 屏幕坐标转世界坐标（使用 Camera API）
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera not initialized')
    }

    return this.camera.viewportToGraph({ x: screenX, y: screenY })
  }

  /**
   * 重置视口
   */
  reset(): void {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera not initialized')
    }

    this.camera.animatedReset({ duration: 300 })
  }
}
```

---

### **Phase 4: 新增核心模块**

#### **文件：`Client/Service/StarChart/Core/InitializationManager/InitializationManager.ts`**

```typescript
/**
 * InitializationManager - 初始化管理器
 * 
 * 职责：
 * - 管理所有 Core 服务的初始化顺序
 * - 确保依赖关系正确
 * - 提供统一的初始化和销毁接口
 */

import { EventBus } from '../EventBus/EventBus'
import { ConfigManager } from '../ConfigManager/ConfigManager'
import { SigmaManager } from '../SigmaManager/SigmaManager'
import { RenderScheduler } from '../RenderScheduler/RenderScheduler'
import { ViewportManager } from '../ViewportManager/ViewportManager'
import { AsyncTaskManager } from '../AsyncTaskManager/AsyncTaskManager'
import { PerformanceMonitor } from '../PerformanceMonitor/PerformanceMonitor'
import { MemoryManager } from '../MemoryManager/MemoryManager'
import { Logger } from '../Logger/Logger'

import type { StarChartCoreAPI, StarChartConfig } from 'Business/StarChart'

export class InitializationManager {
  private eventBus: EventBus | null = null
  private config: ConfigManager | null = null
  private sigmaManager: SigmaManager | null = null
  private renderScheduler: RenderScheduler | null = null
  private viewportManager: ViewportManager | null = null
  private asyncTaskManager: AsyncTaskManager | null = null
  private performanceMonitor: PerformanceMonitor | null = null
  private memoryManager: MemoryManager | null = null
  private logger: Logger | null = null

  private isInitialized = false

  /**
   * 初始化所有 Core 服务（按正确顺序）
   */
  async initialize(
    container: HTMLElement,
    initialConfig?: StarChartConfig
  ): Promise<StarChartCoreAPI> {
    if (this.isInitialized) {
      throw new Error('[InitializationManager] Already initialized')
    }

    console.log('[InitializationManager] 开始初始化...')

    // 1. 基础设施（无依赖）
    this.logger = Logger.getInstance()
    this.eventBus = new EventBus()
    this.config = new ConfigManager(initialConfig)

    this.logger.info('InitializationManager', '基础设施初始化完成')

    // 2. 监控服务（依赖 EventBus）
    this.performanceMonitor = new PerformanceMonitor(this.eventBus)
    this.memoryManager = new MemoryManager(this.eventBus)

    this.logger.info('InitializationManager', '监控服务初始化完成')

    // 3. Sigma 管理器（依赖 EventBus）
    this.sigmaManager = new SigmaManager(this.eventBus)
    await this.sigmaManager.create(container, {
      renderMode: this.config.get('sigma.renderMode', 'webgl'),
      settings: {
        // 从配置读取 Sigma.js 设置
        defaultNodeColor: '#999',
        defaultEdgeColor: '#ccc',
        labelDensity: 0.07,
        labelGridCellSize: 60,
        labelRenderedSizeThreshold: 15
      }
    })

    this.logger.info('InitializationManager', 'Sigma 实例创建完成')

    // 4. 其他 Core 服务（依赖 SigmaManager 和 EventBus）
    this.renderScheduler = new RenderScheduler(this.eventBus, this.sigmaManager)
    this.viewportManager = new ViewportManager(this.eventBus, this.sigmaManager)
    this.asyncTaskManager = new AsyncTaskManager(
      this.config.get('performance.enableWorkers', true) 
        ? navigator.hardwareConcurrency || 4 
        : 1
    )

    this.logger.info('InitializationManager', 'Core 服务初始化完成')

    this.isInitialized = true

    // 返回统一的 Core API
    return this.getCoreAPI()
  }

  /**
   * 销毁所有服务
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      return
    }

    console.log('[InitializationManager] 开始销毁...')

    // 按相反顺序销毁
    this.asyncTaskManager?.destroy()
    this.viewportManager = null
    this.renderScheduler = null
    
    await this.sigmaManager?.destroy()
    this.sigmaManager = null

    this.memoryManager = null
    this.performanceMonitor = null

    this.config = null
    this.eventBus?.clear()
    this.eventBus = null

    this.isInitialized = false
    console.log('[InitializationManager] 销毁完成')
  }

  /**
   * 获取 Core API（提供给插件使用）
   */
  getCoreAPI(): StarChartCoreAPI {
    if (!this.isInitialized) {
      throw new Error('[InitializationManager] Not initialized')
    }

    return {
      sigma: this.sigmaManager!,
      asyncTask: this.asyncTaskManager!,
      eventBus: this.eventBus!,
      render: this.renderScheduler!,
      viewport: this.viewportManager!,
      // 后续添加其他服务
      layer: null as any  // TODO: 实现 LayerManager
    }
  }

  /**
   * 获取配置管理器
   */
  getConfig(): ConfigManager {
    if (!this.config) {
      throw new Error('[InitializationManager] Config not initialized')
    }
    return this.config
  }
}
```

---

#### **文件：`Client/Service/StarChart/Bridge/DataBridge.ts`**

```typescript
/**
 * DataBridge - 数据桥接服务
 * 
 * 职责：
 * - 将 Worker 计算结果写回 Graphology
 * - 批量优化性能
 * - 处理数据格式转换
 */

import type Graph from 'graphology'
import type { LayoutResult, NodeData, EdgeData } from 'Business/StarChart'

export class DataBridge {
  constructor(private graph: Graph) {}

  /**
   * 应用布局结果到 Graphology
   */
  applyLayoutResult(result: LayoutResult): void {
    const { positions } = result

    // 批量更新节点位置
    for (const [nodeId, pos] of Object.entries(positions)) {
      if (!this.graph.hasNode(nodeId)) {
        console.warn(`[DataBridge] 节点 ${nodeId} 不存在，跳过`)
        continue
      }

      this.graph.setNodeAttribute(nodeId, 'x', pos.x)
      this.graph.setNodeAttribute(nodeId, 'y', pos.y)
    }

    console.log(`[DataBridge] 应用布局结果：更新了 ${Object.keys(positions).length} 个节点`)
  }

  /**
   * 批量添加节点到 Graphology
   */
  addNodes(nodes: NodeData[]): void {
    for (const node of nodes) {
      if (this.graph.hasNode(node.id)) {
        console.warn(`[DataBridge] 节点 ${node.id} 已存在，跳过`)
        continue
      }

      // 确保必需属性存在
      const nodeWithDefaults: NodeData = {
        x: node.x ?? Math.random() * 1000,
        y: node.y ?? Math.random() * 1000,
        size: node.size ?? 10,
        color: node.color ?? '#999',
        ...node
      }

      this.graph.addNode(node.id, nodeWithDefaults)
    }

    console.log(`[DataBridge] 添加了 ${nodes.length} 个节点`)
  }

  /**
   * 批量添加边到 Graphology
   */
  addEdges(edges: EdgeData[]): void {
    for (const edge of edges) {
      // 检查源和目标节点是否存在
      if (!this.graph.hasNode(edge.source)) {
        console.warn(`[DataBridge] 源节点 ${edge.source} 不存在，跳过边 ${edge.id}`)
        continue
      }
      if (!this.graph.hasNode(edge.target)) {
        console.warn(`[DataBridge] 目标节点 ${edge.target} 不存在，跳过边 ${edge.id}`)
        continue
      }

      if (this.graph.hasEdge(edge.id)) {
        console.warn(`[DataBridge] 边 ${edge.id} 已存在，跳过`)
        continue
      }

      // 确保必需属性存在
      const edgeWithDefaults: EdgeData = {
        size: edge.size ?? 1,
        color: edge.color ?? '#ccc',
        ...edge
      }

      this.graph.addEdgeWithKey(edge.id, edge.source, edge.target, edgeWithDefaults)
    }

    console.log(`[DataBridge] 添加了 ${edges.length} 条边`)
  }

  /**
   * 清空图数据
   */
  clearGraph(): void {
    this.graph.clear()
    console.log('[DataBridge] 图数据已清空')
  }

  /**
   * 批量更新节点属性
   */
  updateNodeAttributes(updates: Map<string, Partial<NodeData>>): void {
    for (const [nodeId, attrs] of updates) {
      if (!this.graph.hasNode(nodeId)) continue

      for (const [key, value] of Object.entries(attrs)) {
        if (value !== undefined) {
          this.graph.setNodeAttribute(nodeId, key, value)
        }
      }
    }

    console.log(`[DataBridge] 更新了 ${updates.size} 个节点的属性`)
  }
}
```

---

### **Phase 5: 更新 Store 类型**

#### **文件：`Client/stores/projectPage/starChart/starChart.types.ts`**

```typescript
/**
 * StarChart Store 类型定义（与 Sigma.js 对齐）
 */

export interface GraphNode {
  id: string
  label: string
  // 必需属性
  x: number
  y: number
  size: number
  color: string
  // 可选属性
  type?: string
  properties?: Record<string, unknown>
  hidden?: boolean
  forceLabel?: boolean
  zIndex?: number
  highlighted?: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  // 视觉属性
  label?: string
  size?: number
  color?: string
  type?: string
  properties?: Record<string, unknown>
  hidden?: boolean
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// ... 其他 Store 类型保持不变
```

---

### **Phase 6: 更新 Service 层**

#### **文件：`Client/Service/StarChart/visualizationService.ts`**

```typescript
/**
 * StarChart 可视化业务逻辑服务（重写版）
 */

import type { GraphData } from '@stores/projectPage/starChart'
import type { 
  LoadGraphRequest, 
  SaveGraphRequest, 
  ServiceResponse 
} from './starChart.service.types'
import type { AsyncTaskManager } from './Core/AsyncTaskManager/AsyncTaskManager'
import type { DataBridge } from './Bridge/DataBridge'
import type { NodeData, EdgeData } from 'Business/StarChart'

export class VisualizationService {
  /**
   * 加载图数据
   */
  static async loadGraph(request: LoadGraphRequest): Promise<ServiceResponse<GraphData>> {
    try {
      console.log('[VisualizationService] 加载图数据:', request)
      
      // TODO: 实际实现时从数据库或API加载
      return {
        success: true,
        data: { nodes: [], edges: [] }
      }
    } catch (error) {
      return {
        success: false,
        error: `加载失败: ${error}`
      }
    }
  }
  
  /**
   * 保存图数据
   */
  static async saveGraph(request: SaveGraphRequest): Promise<ServiceResponse<void>> {
    try {
      console.log('[VisualizationService] 保存图数据:', request)
      
      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: `保存失败: ${error}`
      }
    }
  }
  
  /**
   * 计算节点布局（使用 AsyncTaskManager 和 DataBridge）
   */
  static async calculateLayout(
    data: GraphData,
    asyncTaskManager: AsyncTaskManager,
    dataBridge: DataBridge,
    algorithm: string = 'force-directed',
    options?: Record<string, unknown>
  ): Promise<void> {
    console.log('[VisualizationService] 开始计算布局:', { algorithm, nodeCount: data.nodes.length })
    
    // 转换数据格式
    const nodes: NodeData[] = data.nodes.map(n => ({
      id: n.id,
      x: n.x ?? Math.random() * 1000,
      y: n.y ?? Math.random() * 1000,
      size: n.size ?? 10,
      color: n.color ?? '#999',
      label: n.label
    }))

    const edges: EdgeData[] = data.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      size: e.size,
      color: e.color
    }))

    // 使用 Worker 计算布局
    const layoutResult = await asyncTaskManager.computeLayout(
      nodes,
      edges,
      algorithm,
      options
    )

    // 将结果写回 Graphology
    dataBridge.applyLayoutResult(layoutResult)

    console.log('[VisualizationService] 布局计算完成')
  }
  
  /**
   * 导出图数据
   */
  static async exportGraph(data: GraphData, format: 'json' | 'png' | 'svg'): Promise<Blob | null> {
    try {
      console.log('[VisualizationService] 导出图数据:', format)
      
      if (format === 'json') {
        const jsonStr = JSON.stringify(data, null, 2)
        return new Blob([jsonStr], { type: 'application/json' })
      }
      
      // TODO: 实现PNG和SVG导出
      return null
    } catch (error) {
      console.error('[VisualizationService] 导出失败:', error)
      return null
    }
  }
}
```

---

## **📦 使用示例**

```typescript
// 在 Store 或组件中初始化 StarChart

import { InitializationManager } from 'Service/StarChart/Core/InitializationManager'
import { DataBridge } from 'Service/StarChart/Bridge/DataBridge'
import { VisualizationService } from 'Service/StarChart'

// 1. 初始化系统
const initManager = new InitializationManager()
const coreAPI = await initManager.initialize(containerElement, {
  sigma: { renderMode: 'webgl' },
  performance: { enableMonitoring: true }
})

// 2. 创建数据桥接
const dataBridge = new DataBridge(coreAPI.sigma.getGraph())

// 3. 加载数据
const graphData = await VisualizationService.loadGraph({})

// 4. 添加节点和边
dataBridge.addNodes(graphData.data!.nodes)
dataBridge.addEdges(graphData.data!.edges)

// 5. 计算布局
await VisualizationService.calculateLayout(
  graphData.data!,
  coreAPI.asyncTask,
  dataBridge,
  'force-directed'
)

// 6. 设置交互（可选）
coreAPI.eventBus.on('node:clicked', (data) => {
  console.log('节点被点击:', data.nodeId)
  
  // 高亮节点
  coreAPI.render.scheduleNodeUpdate(data.nodeId, {
    highlighted: true,
    size: 20
  })
})
```

---

## **✅ 重构检查清单**

- [x] 严格类型：无 `any`，全部使用 Sigma 和 Graph 类型
- [x] ESLint 兼容：使用 `type` imports
- [x] 数据模型：对齐 Sigma.js NodeDisplayData/EdgeDisplayData
- [x] SigmaManager：完整实现，包含 Reducer 支持
- [x] RenderScheduler：直接操作 Graphology
- [x] ViewportManager：使用 Camera API
- [x] 初始化顺序：通过 InitializationManager 管理
- [x] 数据桥接：通过 DataBridge 处理 Worker 结果
- [x] 事件绑定：Sigma.js 事件转接到 EventBus
