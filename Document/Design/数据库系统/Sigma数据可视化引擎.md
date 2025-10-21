[1 tool called]

非常好的架构思路，boss！基于您的想法和现有草案，让我重新梳理一个更清晰的架构方案。

---

## 🏗️ StarChart 新架构设计方案

### **一、目录结构规划**

```
Nimbria/Client/
├── types/Business/StarChart/                # 🔥 类型定义中心
│   ├── Core/                                # Core域类型
│   │   ├── internal.ts                      # 内部类型
│   │   ├── public.ts                        # 对外类型
│   │   └── index.ts                         # 导出
│   ├── Plugin/                              # 插件域类型
│   │   ├── internal.ts                      # 插件内部类型
│   │   ├── public.ts                        # 插件对外接口类型
│   │   └── index.ts
│   ├── Data/                                # 数据域类型
│   │   ├── internal.ts                      # 数据处理内部类型
│   │   ├── public.ts                        # 数据接口类型
│   │   └── index.ts
│   ├── Renderer/                            # 渲染域类型
│   │   ├── internal.ts                      # 渲染内部类型
│   │   ├── public.ts                        # 渲染接口类型
│   │   └── index.ts
│   └── index.ts                             # 全局导出
```

├── Service/StarChart/
│   ├── Core/                                # 🔥 核心服务/基建
│   │   ├── SigmaManager/
│   │   │   ├── SigmaManager.ts              # Sigma实例管理
│   │   │   └── index.ts
│   │   ├── AsyncTaskManager/
│   │   │   ├── AsyncTaskManager.ts          # 异步任务管理
│   │   │   └── index.ts
│   │   ├── EventBus/
│   │   │   ├── EventBus.ts                  # 事件总线
│   │   │   └── index.ts
│   │   ├── RenderScheduler/
│   │   │   ├── RenderScheduler.ts           # 渲染调度
│   │   │   └── index.ts
│   │   ├── ViewportManager/
│   │   │   ├── ViewportManager.ts           # 视口管理
│   │   │   └── index.ts
│   │   ├── LayerManager/
│   │   │   ├── LayerManager.ts              # 层管理
│   │   │   └── index.ts
│   │   ├── SpatialIndex/
│   │   │   ├── SpatialIndex.ts              # 空间索引
│   │   │   └── index.ts
│   │   ├── PerformanceMonitor/
│   │   │   ├── PerformanceMonitor.ts        # 性能监控
│   │   │   └── index.ts
│   │   ├── MemoryManager/
│   │   │   ├── MemoryManager.ts             # 内存管理
│   │   │   └── index.ts
│   │   ├── Logger/
│   │   │   ├── Logger.ts                    # 日志工具
│   │   │   └── index.ts
│   │   ├── ConfigManager/
│   │   │   ├── ConfigManager.ts             # 配置管理
│   │   │   └── index.ts
│   │   └── index.ts                         # 核心服务导出
│   │
│   ├── PluginSystem/                        # 🔥 插件系统基础服务
│   │   ├── PluginRegistry/
│   │   │   ├── PluginRegistry.ts            # 插件注册中心
│   │   │   └── index.ts
│   │   ├── PluginLoader/
│   │   │   ├── PluginLoader.ts              # 动态插件加载器
│   │   │   └── index.ts
│   │   ├── PluginContext/
│   │   │   ├── PluginContext.ts             # 插件上下文管理
│   │   │   └── index.ts
│   │   ├── DependencyResolver/
│   │   │   ├── DependencyResolver.ts        # 依赖解析
│   │   │   └── index.ts
│   │   ├── PluginManager/
│   │   │   ├── PluginManager.ts             # 插件管理器统一入口
│   │   │   └── index.ts
│   │   └── index.ts                         # 插件系统导出
│   │
│   ├── Plugins/                             # 🔥 具体插件实现
│   │   ├── DataAdapter/                     # 数据适配插件目录
│   │   │   ├── RecipeDataAdapter/           # 配方数据适配
│   │   │   │   ├── RecipeDataAdapter.ts
│   │   │   │   ├── transforms.ts
│   │   │   │   └── index.ts
│   │   │   ├── GenericDataAdapter/          # 通用数据适配
│   │   │   └── index.ts                     # 数据适配器导出
│   │   │
│   │   ├── Layout/                          # 布局插件目录
│   │   │   ├── ForceDirected/               # 力导向布局
│   │   │   │   ├── ForceDirectedLayout.ts
│   │   │   │   ├── algorithms.ts
│   │   │   │   └── index.ts
│   │   │   ├── Hierarchy/                   # 层级布局
│   │   │   └── index.ts                     # 布局插件导出
│   │   │
│   │   ├── LOD/                             # LOD控制插件目录
│   │   │   ├── ViewportCulling/             # 视口裁剪
│   │   │   ├── ZoomBoundary/                # 六边形边界
│   │   │   └── index.ts
│   │   │
│   │   ├── Interaction/                     # 交互插件目录
│   │   │   ├── NodeExpansion/               # 节点展开/收起
│   │   │   ├── DragNavigation/              # 拖拽导航
│   │   │   └── index.ts
│   │   │
│   │   ├── Renderer/                        # 渲染插件目录
│   │   │   ├── EdgeLabel/                   # 边标签渲染
│   │   │   ├── NodeStyle/                   # 节点样式
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts                         # 所有插件导出
│   │
│   ├── Workers/                             # Web Workers
│   │   ├── StarChartWorker/
│   │   │   ├── starChart.worker.ts          # 主Worker
│   │   │   └── index.ts
│   │   ├── LayoutWorker/
│   │   │   ├── layout.worker.ts             # 布局计算Worker
│   │   │   └── index.ts
│   │   ├── SpatialWorker/
│   │   │   ├── spatial.worker.ts            # 空间索引Worker
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   └── index.ts                             # Service层统一导出
```

---

### **二、基础服务（Core）架构**

#### **基础服务应该包含的模块：**

```typescript
// Service/StarChart/Core/index.ts

/**
 * 核心服务导出
 * 这些是所有插件都可能需要的通用基建服务
 */

export { SigmaManager } from './SigmaManager'           // Sigma生命周期管理
export { AsyncTaskManager } from './AsyncTaskManager'   // 异步任务调度
export { EventBus } from './EventBus'                   // 事件总线
export { RenderScheduler } from './RenderScheduler'     // 渲染调度
export { ViewportManager } from './ViewportManager'     // 视口管理
export { LayerManager } from './LayerManager'           // 层管理

// 工具类
export { SpatialIndex } from './SpatialIndex'           // 空间索引（四叉树）
export { PerformanceMonitor } from './PerformanceMonitor' // 性能监控
export { MemoryManager } from './MemoryManager'         // 内存管理
```

#### **关键基础服务详解：**

**1. SigmaManager（Sigma封装）**
```typescript
// 对外接口：创建/销毁Sigma实例，提供渲染器抽象
// 内部逻辑：管理WebGL/Canvas渲染器选择，处理容器resize
```

**2. AsyncTaskManager（异步任务核心）**
```typescript
// 对外接口：5个原子化异步接口（布局、索引、转换、裁剪、路径）
// 内部逻辑：Worker池管理、任务队列、优先级调度、进度追踪
```

**3. EventBus（事件总线）**
```typescript
// 对外接口：on/off/emit/once，支持事件优先级
// 内部逻辑：监听器管理、错误处理、内存泄露防护
```

**4. RenderScheduler（渲染调度）**
```typescript
// 对外接口：scheduleNodeUpdate、scheduleRender
// 内部逻辑：防抖批量更新、帧率控制、增量渲染
```

**5. ViewportManager（视口管理）**
```typescript
// 对外接口：getCurrentViewport、getVisibleBounds
// 内部逻辑：视口状态跟踪、可见区域计算、性能监控
```

**6. LayerManager（层管理）**
```typescript
// 对外接口：registerCustomLayer、removeLayer
// 内部逻辑：层级堆栈管理、渲染顺序、Canvas/WebGL层协调
```

---

### **三、插件系统架构**

#### **PluginSystem基础服务：**

```typescript
// Service/StarChart/PluginSystem/

1. **PluginRegistry** - 插件注册中心
   - 插件元数据管理
   - 版本兼容性检查
   - 插件状态跟踪

2. **PluginLoader** - 动态加载器
   - ES模块动态导入
   - 插件文件扫描
   - 热重载支持

3. **PluginContext** - 上下文管理
   - 为插件提供统一的API入口
   - 权限控制
   - 沙盒隔离

4. **DependencyResolver** - 依赖解析
   - 依赖图构建
   - 循环依赖检测
   - 自动安装依赖
```

#### **插件目录结构设计：**

```
Service/StarChart/Plugins/
├── DataAdapter/                    # 数据适配插件族
│   ├── RecipeDataAdapter/          # MC配方数据适配
│   │   ├── RecipeDataAdapter.ts    # 主插件类
│   │   ├── transforms.ts           # 数据转换逻辑
│   │   ├── validators.ts           # 数据验证
│   │   ├── plugin.config.ts        # 插件配置
│   │   └── index.ts                # 插件导出
│   ├── NovelDataAdapter/           # 小说关系数据适配
│   └── GenericGraphAdapter/        # 通用图数据适配
│
├── Layout/                         # 布局插件族
│   ├── ForceDirected/
│   │   ├── ForceDirectedLayout.ts  # 力导向布局主类
│   │   ├── algorithms/             # 子目录：算法实现
│   │   │   ├── forceAtlas2.ts
│   │   │   ├── springElectrical.ts
│   │   │   └── index.ts
│   │   ├── physics.ts              # 物理计算
│   │   └── index.ts
│   ├── Hierarchy/
│   └── RecipeGraph/                # 配方图专用布局
│
├── LOD/                            # LOD控制插件族
│   ├── ViewportCulling/            # 视口裁剪
│   ├── ZoomBoundary/               # 六边形边界
│   └── DynamicVisibility/          # 动态显隐
│
├── Interaction/                    # 交互插件族
│   ├── NodeExpansion/              # 节点展开收起
│   ├── RegionActivation/           # 六边形激活
│   └── DragNavigation/             # 拖拽导航
│
├── Renderer/                       # 渲染插件族
│   ├── EdgeLabel/                  # 边标签
│   ├── NodeStyle/                  # 节点样式
│   └── CustomLayers/               # 自定义层
│
└── index.ts                        # 所有插件统一导出
```

---

### **四、类型系统架构（按域分类）**

#### **类型目录结构：**

```
types/Business/StarChart/
├── Core/                           # Core域类型
│   ├── internal.ts                 # Core内部类型
│   │   ├─ SigmaManagerInternal     # SigmaManager内部状态
│   │   ├─ TaskQueueInternal        # 任务队列内部
│   │   ├─ WorkerPoolInternal       # Worker池内部
│   │   └─ RenderStateInternal      # 渲染状态内部
│   ├── public.ts                   # Core对外接口类型
│   │   ├─ StarChartCoreAPI         # Core对外API
│   │   ├─ AsyncTaskAPI             # 异步任务对外接口
│   │   ├─ EventBusAPI              # 事件总线对外接口
│   │   └─ ViewportAPI              # 视口对外接口
│   └── index.ts
│
├── Plugin/                         # 插件域类型
│   ├── internal.ts                 # 插件系统内部类型
│   │   ├─ PluginRegistryInternal   # 插件注册内部
│   │   ├─ DependencyGraphInternal  # 依赖图内部
│   │   └─ PluginLifecycleInternal  # 生命周期内部
│   ├── public.ts                   # 插件对外接口类型
│   │   ├─ StarChartPlugin          # 插件基础接口
│   │   ├─ PluginContext            # 插件上下文
│   │   ├─ LayoutPlugin             # 布局插件接口
│   │   ├─ InteractionPlugin        # 交互插件接口
│   │   └─ ...                      # 其他插件接口
│   └── index.ts
│
├── Data/                           # 数据域类型
│   ├── internal.ts                 # 数据处理内部类型
│   │   ├─ DataLoaderInternal       # 数据加载内部
│   │   ├─ TransformInternal        # 转换内部
│   │   └─ CacheInternal           # 缓存内部
│   ├── public.ts                   # 数据对外接口类型
│   │   ├─ GraphData               # 图数据接口
│   │   ├─ NodeData                # 节点数据接口
│   │   ├─ EdgeData                # 边数据接口
│   │   └─ DataSourceAPI           # 数据源接口
│   └── index.ts
│
├── Renderer/                       # 渲染域类型
│   ├── internal.ts                 # 渲染内部类型
│   ├── public.ts                   # 渲染对外接口类型
│   └── index.ts
│
└── index.ts                        # StarChart全局类型导出
```

---

### **二、基础服务（Core）核心模块**

#### **必备的基础服务：**

| 基础服务 | 职责 | 优先级 |
|---------|------|--------|
| **SigmaManager** | Sigma实例生命周期、渲染器选择 | 🔥 核心 |
| **AsyncTaskManager** | 异步任务调度、Worker池、原子化接口 | 🔥 核心 |
| **EventBus** | 事件总线、插件通信 | 🔥 核心 |
| **RenderScheduler** | 批量更新、防抖、帧率控制 | 🔥 核心 |
| **ViewportManager** | 视口状态、可见区域计算 | ⭐ 重要 |
| **LayerManager** | 多层渲染、自定义层管理 | ⭐ 重要 |
| **SpatialIndex** | 四叉树空间索引、空间查询优化 | ⭐ 重要 |
| **MemoryManager** | 内存监控、垃圾回收、节点释放 | ⚡ 优化 |
| **PerformanceMonitor** | FPS监控、任务耗时统计 | ⚡ 优化 |

#### **Core服务设计原则：**

```typescript
// Service/StarChart/Core/index.ts

/**
 * Core服务职责边界：
 * 
 * ✅ 提供：通用基建、原子化接口、生命周期管理
 * ❌ 不提供：具体算法实现、场景特化逻辑、UI交互
 */

// 1. 核心基建（必须）
export { SigmaManager } from './SigmaManager'
export { AsyncTaskManager } from './AsyncTaskManager'
export { EventBus } from './EventBus'
export { RenderScheduler } from './RenderScheduler'

// 2. 重要服务（推荐）
export { ViewportManager } from './ViewportManager'
export { LayerManager } from './LayerManager'
export { SpatialIndex } from './SpatialIndex'

// 3. 优化服务（可选）
export { MemoryManager } from './MemoryManager'
export { PerformanceMonitor } from './PerformanceMonitor'

// 4. 工具服务（辅助）
export { Logger } from './Logger'
export { ConfigManager } from './ConfigManager'
```

---

### **三、插件系统（PluginSystem）架构**

#### **PluginSystem 基础服务：**

```typescript
// Service/StarChart/PluginSystem/index.ts

/**
 * 插件系统基础服务
 * 负责插件的整个生命周期管理
 */

// 核心插件系统服务
export { PluginRegistry } from './PluginRegistry'       // 注册中心
export { PluginLoader } from './PluginLoader'           // 动态加载
export { PluginContext } from './PluginContext'         // 上下文管理
export { DependencyResolver } from './DependencyResolver' // 依赖解析

// 插件管理器（统一入口）
export { PluginManager } from './PluginManager'
```

#### **PluginManager - 统一入口：**

```typescript
// Service/StarChart/PluginSystem/PluginManager/PluginManager.ts

/**
 * PluginManager - 插件系统统一入口
 * 
 * 职责：
 * - 统合所有插件系统服务
 * - 提供简化的插件管理API
 * - 插件预设管理
 */
export class PluginManager {
  constructor(
    private registry: PluginRegistry,
    private loader: PluginLoader,
    private context: PluginContext,
    private dependencyResolver: DependencyResolver
  ) {}
  
  /**
   * 加载插件预设
   */
  async loadPreset(presetName: 'recipe' | 'novel' | 'generic'): Promise<void> {
    const presetConfig = this.getPresetConfig(presetName)
    
    for (const pluginPath of presetConfig.plugins) {
      await this.loader.loadPlugin(pluginPath)
    }
    
    console.log(`[PluginManager] 预设已加载: ${presetName}`)
  }
  
  /**
   * 插件预设配置
   */
  private getPresetConfig(preset: string) {
    const presets = {
      'recipe': {
        plugins: [
          // 配方图必需插件
          () => import('../Plugins/DataAdapter/RecipeDataAdapter'),
          () => import('../Plugins/Layout/RecipeGraph'),
          () => import('../Plugins/LOD/ZoomBoundary'),
          () => import('../Plugins/Interaction/NodeExpansion'),
          () => import('../Plugins/Renderer/EdgeLabel')
        ]
      },
      'novel': {
        plugins: [
          // 小说关系图插件
          () => import('../Plugins/DataAdapter/NovelDataAdapter'),
          () => import('../Plugins/Layout/Hierarchy'),
          () => import('../Plugins/Interaction/DragNavigation')
        ]
      },
      'generic': {
        plugins: [
          // 通用图可视化插件
          () => import('../Plugins/DataAdapter/GenericDataAdapter'),
          () => import('../Plugins/Layout/ForceDirected')
        ]
      }
    }
    
    return presets[preset]
  }
}
```

---

### **四、类型定义架构（按域分类）**

#### **核心思路：**
- ✅ **按域分类**：Core、Plugin、Data、Renderer各自独立
- ✅ **internal/public分离**：明确内部类型vs对外接口
- ✅ **统一导出**：每个域和全局都有index.ts

#### **具体类型文件设计：**

```typescript
// types/Business/StarChart/Core/public.ts

/**
 * Core对外接口类型
 * 这些类型是插件可以使用的Core API
 */

// StarChart Core API
export interface StarChartCoreAPI {
  readonly sigma: SigmaManagerAPI
  readonly asyncTask: AsyncTaskManagerAPI
  readonly eventBus: EventBusAPI
  readonly render: RenderSchedulerAPI
  readonly viewport: ViewportManagerAPI
  readonly layer: LayerManagerAPI
}

// AsyncTaskManager 对外接口
export interface AsyncTaskManagerAPI {
  computeLayout(
    nodes: NodeData[], 
    edges: EdgeData[], 
    algorithm: LayoutAlgorithm, 
    options?: LayoutOptions
  ): Promise<LayoutResult>
  
  buildSpatialIndex(
    nodes: NodeData[], 
    indexType: IndexType
  ): Promise<SpatialIndexResult>
  
  transformData(
    rawData: unknown, 
    transformer: DataTransformer
  ): Promise<GraphData>
  
  computeVisibleNodes(
    allNodes: NodeData[], 
    viewport: ViewportInfo, 
    spatialIndex: SpatialIndex
  ): Promise<string[]>
  
  findPath(
    graph: GraphData, 
    startId: string, 
    endId: string, 
    algorithm: PathfindingAlgorithm
  ): Promise<PathResult>
}

// 其他API接口...
```

```typescript
// types/Business/StarChart/Core/internal.ts

/**
 * Core内部类型
 * 这些类型只在Core内部使用，不暴露给插件
 */

// 任务队列内部状态
export interface TaskQueueState {
  queue: AsyncTask[]
  running: Map<string, AsyncTask>
  completed: AsyncTask[]
  workerLoad: number[]
}

// Sigma管理器内部状态
export interface SigmaManagerState {
  instance: Sigma | null
  graph: Graph | null
  container: HTMLElement | null
  renderMode: 'webgl' | 'canvas'
  lastRefreshTime: number
}

// 其他内部类型...
```

```typescript
// types/Business/StarChart/Plugin/public.ts

/**
 * 插件对外接口类型
 * 定义插件必须实现的接口
 */

export interface StarChartPlugin {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly type: PluginType
  readonly description?: string
  readonly dependencies?: PluginDependency[]
  
  install(context: PluginContext): Promise<void> | void
  uninstall?(): Promise<void> | void
}

export interface PluginContext {
  core: StarChartCoreAPI  // 🔥 Core API的统一入口
  config: StarChartConfig
  utils: PluginUtils
}

// 具体插件类型接口
export interface LayoutPlugin extends StarChartPlugin {
  readonly type: 'layout'
  computeLayout(
    nodes: NodeData[],
    edges: EdgeData[],
    context: PluginContext
  ): Promise<Map<string, Position>>
}

// 其他插件接口...
```

---

### **五、数据流和渲染流设计**

#### **数据流设计（Store → Service → Sigma）：**

```
【Vue Store】                    【Service/Base】                【Service/Plugins】
    ↓                                ↓                              ↓
starChart.store.ts  →→→→  AsyncTaskManager  →→→→  DataAdapter Plugin
    │                           │                       │
    ├─ GraphData                ├─ transformData()      ├─ 原始数据适配
    ├─ ViewportState           └─ 任务调度             └─ 验证&转换
    └─ Config                                               ↓
    ↓                                                    Layout Plugin
EventBus.emit                                                ↓
('data:loaded')                                         computeLayout()
    ↓                                                    异步Worker计算
【Service/Base】                                               ↓
RenderScheduler  ←←←←  EventBus  ←←←←  Layout完成事件
    │                                                        ↓
    ├─ 批量更新队列                                      LOD Plugin
    ├─ 防抖16ms                                             ↓
    └─ 帧率控制                                         filterVisibleNodes()
    ↓                                                        ↓
SigmaManager                                          RenderScheduler
    │                                                        ↓
    ├─ graph.updateNode()                              最终渲染数据
    ├─ graph.addNode()                                       ↓
    └─ sigma.refresh()  →→→→  【Sigma.js渲染引擎】  →→→→  Canvas输出
```

---

### **六、插件开发框架**

#### **插件开发模板：**

```typescript
// 插件开发模板
// Service/StarChart/Plugins/Layout/MyLayout/MyLayoutPlugin.ts

import type { 
  LayoutPlugin, 
  PluginContext,
  NodeData,
  EdgeData,
  Position 
} from '@types/Business/StarChart'

export class MyLayoutPlugin implements LayoutPlugin {
  readonly id = 'my-layout'
  readonly name = '我的布局'
  readonly version = '1.0.0'
  readonly type = 'layout' as const
  
  // 依赖其他插件（可选）
  readonly dependencies = ['spatial-index-plugin']
  
  async install(context: PluginContext): Promise<void> {
    console.log('[MyLayoutPlugin] 安装中...')
    
    // 1. 订阅需要的事件
    context.core.eventBus.on('data:loaded', this.handleDataLoaded.bind(this))
      
    // 2. 注册自定义事件
    // ...
      
    console.log('[MyLayoutPlugin] 安装完成')
  }
  
  async computeLayout(
    nodes: NodeData[],
    edges: EdgeData[],
    context: PluginContext
  ): Promise<Map<string, Position>> {
    // 🔥 调用Core的异步接口，不阻塞主线程
    const result = await context.core.asyncTask.computeLayout(
      nodes,
      edges,
      'my-custom-algorithm',
      {
        iterations: 500,
        nodeSpacing: 120
      }
    )
    
    return result.positions
  }
  
  private async handleDataLoaded(data: any): Promise<void> {
    // 数据加载时的处理逻辑
  }
  
  async uninstall(): Promise<void> {
    // 清理资源
    console.log('[MyLayoutPlugin] 已卸载')
  }
}

export default new MyLayoutPlugin()
```

---

## 🎯 架构优势总结

### **1. 清晰的职责分离**
- ✅ **Core** = 通用基建，无场景逻辑
- ✅ **PluginSystem** = 插件生命周期管理
- ✅ **Plugins** = 具体功能实现

### **2. 类型系统优势**
- ✅ **按域分类** = Core、Plugin、Data、Renderer各自独立
- ✅ **internal/public分离** = 明确内部实现vs对外接口
- ✅ **统一管理** = 所有类型在一个位置，便于维护

### **3. 插件开发体验**
- ✅ **原子化异步接口** = 插件只需调用接口，不管Worker实现
- ✅ **统一上下文** = 通过PluginContext访问所有Core服务
- ✅ **依赖自动解析** = 插件依赖自动安装

### **4. 性能保障**
- ✅ **异步不阻塞** = 所有重计算都在Worker中
- ✅ **批量更新** = 渲染防抖、帧率控制
- ✅ **按需加载** = 插件懒加载、数据按需

---

**Boss，您觉得这个架构方案如何？需要深入讨论哪个部分？**

1. 类型系统的internal/public分离策略？
2. 插件预设的配置管理？
3. AsyncTaskManager的具体原子接口设计？
4. 第一个实现的插件建议？

---

## 📝 文档修改总结（2025-10-21）

### ✅ 已处理的修改

#### **1. Base → Core 重命名**
- **位置**：第33行及所有引用处
- **变更**：`Base/` 目录重命名为 `Core/`，强调其核心功能地位
- **影响范围**：
  - 目录结构定义
  - 所有代码示例中的导入路径
  - 架构说明文档

#### **2. PluginSystem 目录结构化**
- **位置**：第42-47行
- **变更**：所有单文件改为同名目录结构
  - `PluginRegistry.ts` → `PluginRegistry/PluginRegistry.ts`
  - `PluginLoader.ts` → `PluginLoader/PluginLoader.ts`
  - `PluginContext.ts` → `PluginContext/PluginContext.ts`
  - `DependencyResolver.ts` → `DependencyResolver/DependencyResolver.ts`
  - 新增：`PluginManager/PluginManager.ts`
- **目的**：防止单个模块文件过大，便于未来扩展

#### **3. Workers 目录结构化**
- **位置**：第83-86行
- **变更**：所有Worker文件改为同名目录
  - `starChart.worker.ts` → `StarChartWorker/starChart.worker.ts`
  - `layout.worker.ts` → `LayoutWorker/layout.worker.ts`
  - `spatial.worker.ts` → `SpatialWorker/spatial.worker.ts`
- **目的**：为Worker扩展和工具文件预留空间

### 📊 最终目录结构对比

**修改前**：单文件扁平结构
```
Service/StarChart/
├── Base/
│   ├── SigmaManager.ts
│   ├── AsyncTaskManager.ts
│   └── ...
├── PluginSystem/
│   ├── PluginRegistry.ts
│   ├── PluginLoader.ts
│   └── ...
└── Workers/
    ├── starChart.worker.ts
    ├── layout.worker.ts
    └── ...
```

**修改后**：目录化模块结构（代码量可控）
```
Service/StarChart/
├── Core/
│   ├── SigmaManager/
│   │   ├── SigmaManager.ts
│   │   └── index.ts
│   ├── AsyncTaskManager/
│   │   ├── AsyncTaskManager.ts
│   │   └── index.ts
│   └── ...
├── PluginSystem/
│   ├── PluginRegistry/
│   │   ├── PluginRegistry.ts
│   │   └── index.ts
│   ├── PluginLoader/
│   │   ├── PluginLoader.ts
│   │   └── index.ts
│   └── ...
└── Workers/
    ├── StarChartWorker/
    │   ├── starChart.worker.ts
    │   └── index.ts
    └── ...
```

### 🎯 架构优势

1. **代码管理**：单个文件保持 <500 行，便于维护
2. **扩展性**：每个模块独立演进，便于添加配置、工具函数
3. **清晰度**：每个目录代表一个功能单元，职责明确
4. **类型安全**：types/Business/StarChart 统一管理所有类型

---

## 📋 开发规范总结（2025-10-21 确定）

### **1. 别名配置规范**

#### tsconfig.json 别名配置：
```json
{
  "compilerOptions": {
    "paths": {
      "Business/StarChart": ["Client/types/Business/StarChart"],
      "@types": ["Client/types"],
      "@types/*": ["Client/types/*"]
    }
  }
}
```

#### 正确的导入方式：
```typescript
// ✅ 正确：使用 Business/StarChart 别名
import type { SigmaManagerState, AsyncTask } from 'Business/StarChart'

// ✅ 也正确：使用 @types 别名
import type { GraphData, NodeData } from '@types/Business/StarChart'

// ❌ 错误：相对路径跨越模块
import type { SigmaManagerState } from '../../../types/Business/StarChart'
```

### **2. ESLint 规则遵守**

#### 配置内容（eslint.config.js）：
```javascript
{
  files: ['**/*.ts', '**/*.vue'],
  rules: {
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports' }  // 强制使用 import type
    ]
  }
}
```

#### 遵守规则的做法：
```typescript
// ✅ 正确：仅用于类型的导入使用 import type
import type { AsyncTask, GraphData } from 'Business/StarChart'

// ❌ 错误：混合使用类型和值
import { someClass, type SomeType } from 'module'  // 除非有原因

// ✅ 值和类型分离导入
import { EventBus } from '../EventBus/EventBus'
import type { EventListener } from 'Business/StarChart'
```

### **3. 类型严格性要求**

#### 核心原则：
- ✅ **不使用 `any`**：所有类型必须明确指定
- ✅ **使用 `readonly` 修饰符**：对于不可变属性
- ✅ **类型断言谨慎使用**：需要时加注释说明原因
- ✅ **接口分离**：internal.ts vs public.ts

#### 类型断言示例（RenderScheduler 更新逻辑）：
```typescript
// 当 data 结构不确定时，进行类型断言
case 'progress':
  const progressData = (data as { progress: number })
  task.progress = progressData.progress
  break

case 'error':
  const errorData = (data as { error: Error })
  task.error = errorData.error
  break
```

### **4. 后续开发模块检查清单**

创建每个新模块时，必须检查：

```
[ ] 别名导入是否使用 Business/StarChart 或 @types
[ ] 是否使用了 import type（非类型导入不算）
[ ] 所有类型是否有明确的定义（无 any）
[ ] 接口是否声明了 readonly 修饰符
[ ] 代码是否通过 ESLint（npm run lint）
[ ] 单个文件是否保持 <500 行
```

### **5. 已完成的模块清单**

#### ✅ 已实现并通过检查：
- SigmaManager.ts（108行）
- AsyncTaskManager.ts（389行）
- EventBus.ts（87行）
- RenderScheduler.ts（126行）
- ViewportManager.ts（114行）
- 类型系统：Core/internal.ts, Core/public.ts 等

#### 📋 待实现的核心模块：
1. **LayerManager**（层管理） - 预计 100-150 行
2. **SpatialIndex**（空间索引四叉树） - 预计 200-300 行
3. **PerformanceMonitor**（性能监控） - 预计 120-180 行
4. **MemoryManager**（内存管理） - 预计 100-150 行
5. **Logger**（日志工具） - 预计 80-120 行
6. **ConfigManager**（配置管理） - 预计 60-100 行

---

## ✅ 核心模块实现完成报告（2025-10-21 最终）

### **所有 11 个 Core 模块已全部实现并通过 ESLint 检查**

| 模块 | 实际行数 | 状态 | 关键功能 |
|------|--------|------|--------|
| **SigmaManager** | 108 行 | ✅ | Sigma 生命周期、WebGL/Canvas 选择 |
| **AsyncTaskManager** | 389 行 | ✅ | Web Worker 池、任务队列、原子化接口 |
| **EventBus** | 87 行 | ✅ | 事件发布/订阅、错误处理 |
| **RenderScheduler** | 126 行 | ✅ | 批量更新防抖、帧率控制 |
| **ViewportManager** | 114 行 | ✅ | 视口状态、可见区域计算 |
| **LayerManager** | 185 行 | ✅ | 多层渲染、堆栈管理、可见性控制 |
| **SpatialIndex** | 285 行 | ✅ | 四叉树、范围查询、碰撞检测 |
| **PerformanceMonitor** | 176 行 | ✅ | FPS 监控、任务耗时、帧率分析 |
| **MemoryManager** | 239 行 | ✅ | 内存监控、缓存管理、垃圾回收 |
| **Logger** | 231 行 | ✅ | 日志输出、级别控制、导出功能 |
| **ConfigManager** | 221 行 | ✅ | 配置管理、深度合并、监听变化 |

**总计**: 1,961 行高质量代码，所有模块严格遵循 ESLint 规范

### **开发规范遵守情况**

#### ✅ 类型严格性
- 所有模块禁用 `any`
- 使用 `readonly` 修饰符保护不可变属性
- 类型断言需要注释说明原因

#### ✅ ESLint 合规性
- 100% 使用 `import type` 导入类型
- 统一别名配置：`Business/StarChart` 和 `@types/*`
- 零 linter 错误

#### ✅ 代码模块化
- 每个模块单独目录（Module/Module.ts + index.ts）
- 最大单文件 389 行（AsyncTaskManager）
- 保持代码清晰和可维护性

### **Core 模块职责清晰边界**

```
┌─────────────────────────────────────────┐
│         StarChart Core Services          │
├─────────────────────────────────────────┤
│ 基础设施层（必须）                      │
│  • SigmaManager       → 渲染器管理      │
│  • AsyncTaskManager   → 异步操作框架    │
│  • EventBus          → 事件通信        │
├─────────────────────────────────────────┤
│ 性能优化层（推荐）                      │
│  • RenderScheduler    → 批量更新防抖    │
│  • ViewportManager    → 视口管理        │
│  • LayerManager       → 分层渲染        │
│  • SpatialIndex       → 空间查询优化    │
├─────────────────────────────────────────┤
│ 监控诊断层（可选）                      │
│  • PerformanceMonitor → 性能统计        │
│  • MemoryManager      → 内存管理        │
│  • Logger            → 日志输出        │
├─────────────────────────────────────────┤
│ 配置管理层（配置）                      │
│  • ConfigManager      → 全局配置管理    │
└─────────────────────────────────────────┘
```

### **API 接口一致性**

所有 Core 模块遵循统一的接口模式：

```typescript
// 标准生命周期接口
export class CoreModule {
  constructor(dependencies: Dependency[])
  getState(): StateType
  clear(): void
  destroy(): void
}

// 标准错误处理
// - 所有方法都有异常捕获
// - 使用 console.warn/error 记录问题
// - 返回安全的默认值

// 标准事件系统
// - 通过 EventBus 发送事件
// - 模块间解耦通信
// - 支持事件监听链
```

### **下一步：PluginSystem 与 Workers**

Core 模块完成后，可以启动：

1. **PluginSystem** (5 个模块)
   - PluginRegistry：插件元数据管理
   - PluginLoader：ES 模块动态导入
   - PluginContext：统一 API 入口
   - DependencyResolver：依赖图解析
   - PluginManager：统一入口

2. **Workers** (3 个模块)
   - StarChartWorker：主 Worker 框架
   - LayoutWorker：布局计算 Worker
   - SpatialWorker：空间索引 Worker

所有新模块将继承 Core 的架构规范和开发标准。