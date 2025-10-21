# StarChart 图数据可视化系统

## 🎯 系统概览

StarChart 是基于 **Sigma.js** 和 **Graphology** 的高性能图数据可视化引擎，支持数百万节点的渐进式加载和渲染。

## 📐 架构设计

```
StarChart/
├── Engine/              # 渲染引擎核心（通用）
│   ├── SigmaManager     # Sigma.js 生命周期管理
│   ├── DataManager      # 渐进式数据加载
│   ├── RenderScheduler  # 渲染调度
│   ├── ViewportManager  # 视口管理（Camera API）
│   ├── EventBus         # 事件系统（桥接 Sigma 事件）
│   ├── AsyncTaskManager # Worker 池管理
│   ├── SpatialIndex     # 空间索引（四叉树）
│   └── EngineCore       # 统一导出
│
└── Graphs/              # 具体图实现（业务逻辑）
    ├── BaseGraph        # 抽象基类
    ├── RecipeGraph/     # MC 配方图
    └── [其他图实现]
```

## 🚀 快速开始

### 1. 初始化 Engine

```typescript
import { EngineCore } from 'Service/StarChart'

// 创建 Engine
const engine = new EngineCore({
  container: document.getElementById('graph-container')!,
  chunkLoader: async (chunkId) => {
    // 实现你的数据加载逻辑
    return { nodes: [], edges: [] }
  },
  sigmaOptions: {
    renderMode: 'webgl',
    renderEdgeLabels: false,
    enableEdgeEvents: true
  }
})

// 初始化（严格顺序）
await engine.initialize()
```

### 2. 创建图实例

```typescript
import { RecipeGraph } from 'Service/StarChart'

// 创建图
const graph = new RecipeGraph(engine.getAPI(), {
  id: 'recipe-graph-1',
  name: 'MC 配方图',
  enableProgressiveLoading: true
})

// 初始化并加载数据
await graph.initialize()
await graph.load()
```

### 3. 交互和事件

```typescript
// 监听节点点击
engine.eventBus.on('node:click', (event) => {
  console.log('节点被点击:', event.node)
})

// 监听节点双击（展开/收起）
engine.eventBus.on('node:doubleClick', async (event) => {
  // RecipeGraph 会自动处理展开逻辑
})

// 手动更新节点样式
engine.renderScheduler.scheduleNodeUpdate('node-1', {
  color: '#FF0000',
  size: 20
})
```

### 4. 视口控制

```typescript
// 缩放
engine.viewportManager.setZoom(2.0)

// 平移
engine.viewportManager.setPan(100, 100)

// 适配节点
engine.viewportManager.fitToNodes(['node-1', 'node-2'])

// 获取可见边界
const bounds = engine.viewportManager.getVisibleBounds()
```

## 🔧 核心概念

### Engine vs Graph

- **Engine**：通用的渲染引擎，不包含业务逻辑
  - 管理 Sigma.js 生命周期
  - 提供数据加载、渲染调度、视口管理等基础能力
  - 可以被多个 Graph 共享

- **Graph**：具体的图实现，包含业务逻辑
  - 定义数据加载策略（如何分块、从哪里加载）
  - 定义布局算法（力导向、层级、自定义）
  - 定义交互逻辑（展开/收起、选中、拖拽）
  - 每个 Graph 是独立的插件

### 渐进式加载

```typescript
// 定义数据块
const chunk: ChunkDescriptor = {
  id: 'chunk-1',
  bounds: { minX: 0, maxX: 1000, minY: 0, maxY: 1000 },
  priority: 'high'
}

// 加载数据块
await engine.dataManager.loadChunk(chunk)

// 卸载数据块（释放内存）
await engine.dataManager.unloadChunk('chunk-1')
```

### 动态样式（Reducer）

```typescript
// 设置节点 Reducer
engine.sigmaManager.setNodeReducer((nodeId, data) => {
  if (selectedNodes.has(nodeId)) {
    return {
      ...data,
      size: data.size * 1.5,
      color: '#FF0000',
      borderColor: '#000',
      borderSize: 2
    }
  }
  return data
})

// 更新后自动刷新
engine.sigmaManager.refresh()
```

## 📋 数据格式

### NodeData（严格类型）

```typescript
interface NodeData {
  // 必需属性
  id: string
  x: number
  y: number
  size: number
  color: string
  
  // 可选属性
  label?: string
  type?: string
  hidden?: boolean
  forceLabel?: boolean
  zIndex?: number
  highlighted?: boolean
  
  // 自定义扩展
  properties?: Record<string, string | number | boolean | null>
}
```

### EdgeData（严格类型）

```typescript
interface EdgeData {
  // 必需属性
  id: string
  source: string
  target: string
  
  // 可选属性
  size?: number
  color?: string
  label?: string
  type?: string
  hidden?: boolean
  forceLabel?: boolean
  zIndex?: number
  
  // 自定义扩展
  properties?: Record<string, string | number | boolean | null>
}
```

## 🎨 自定义图实现

```typescript
import { BaseGraph, type GraphConfig } from 'Service/StarChart'

export class MyCustomGraph extends BaseGraph {
  async initialize(): Promise<void> {
    // 1. 设置样式 Reducer
    this.engine.sigmaManager.setNodeReducer((node, data) => {
      // 自定义样式逻辑
      return data
    })

    // 2. 绑定事件
    this.engine.eventBus.on('node:click', this.handleNodeClick.bind(this))
  }

  async load(): Promise<void> {
    // 加载数据
    const data = await this.loadChunkData('initial')
    this.engine.dataManager.addNodes(data.nodes)
  }

  async destroy(): Promise<void> {
    // 清理资源
    this.engine.dataManager.clearAll()
  }

  protected async loadChunkData(chunkId: string) {
    // 实现数据加载
    return { nodes: [], edges: [] }
  }

  protected async getChunkDescriptors() {
    return []
  }

  protected async computeLayout(nodes: any[], edges: any[]) {
    return await this.engine.asyncTask.computeLayout(nodes, edges, 'force-directed')
  }

  protected async updateLayout(changedNodeIds: string[]) {
    // 增量布局
  }

  protected handleNodeClick(nodeId: string) {
    // 处理点击
  }

  protected async handleNodeDoubleClick(nodeId: string) {
    // 处理双击
  }

  protected handleNodeHover(nodeId: string) {
    // 处理悬浮
  }
}
```

## 📊 性能优化

### Worker 后台计算

```typescript
// 布局计算不阻塞主线程
const result = await engine.asyncTask.computeLayout(nodes, edges, 'force-directed', {
  iterations: 100,
  nodeSpacing: 50
})

// 将结果写回 Graph
const graph = engine.sigmaManager.getGraph()
for (const [nodeId, pos] of Object.entries(result.positions)) {
  graph.setNodeAttribute(nodeId, 'x', pos.x)
  graph.setNodeAttribute(nodeId, 'y', pos.y)
}
```

### 批量更新

```typescript
// 批量更新会自动防抖（requestAnimationFrame）
engine.renderScheduler.scheduleNodeUpdates([
  { nodeId: 'node-1', update: { color: '#FF0000' } },
  { nodeId: 'node-2', update: { color: '#00FF00' } }
])
```

### 空间索引

```typescript
// 使用四叉树快速查询
const nearbyNodes = engine.spatialIndex.queryCircle(x, y, radius)
```

## ⚠️ 重要提示

1. **初始化顺序**：必须先 `engine.initialize()`，再创建 Graph
2. **数据操作**：所有节点/边操作都通过 `graph.setNodeAttribute()` 等 Graphology API
3. **刷新机制**：Sigma.js 会自动监听 Graphology 变化，但也可手动调用 `refresh()`
4. **坐标系统**：使用 Camera API 进行坐标转换，不要手动计算
5. **Reducer**：用于动态样式，不要直接修改 Graphology 属性

## 📚 相关文档

- [Sigma.js 官方文档](https://www.sigmajs.org/)
- [Graphology 文档](https://graphology.js.org/)
- [StarChart 系统设计文档](../../../Document/功能与架构设计/数据服务专项/)

