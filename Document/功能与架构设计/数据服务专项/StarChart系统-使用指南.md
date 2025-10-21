# StarChart 系统使用指南

## 🚀 快速上手（5分钟）

### Step 1: 安装依赖

```bash
cd Nimbria
npm install
```

新依赖已自动添加：
- `sigma`: ^3.0.0-beta.29
- `graphology`: ^0.25.4
- `graphology-types`: ^0.24.7

---

### Step 2: 创建最简示例

```typescript
import { EngineCore, RecipeGraph } from 'Service/StarChart'

// 1. 创建 Engine
const engine = new EngineCore({
  container: document.getElementById('graph-container')!,
  chunkLoader: async (chunkId: string) => {
    // 简单示例：返回模拟数据
    return {
      nodes: [
        { id: 'node-1', x: 0, y: 0, size: 15, color: '#4A90E2', label: '节点 1' },
        { id: 'node-2', x: 100, y: 100, size: 15, color: '#66BB6A', label: '节点 2' }
      ],
      edges: [
        { id: 'edge-1', source: 'node-1', target: 'node-2', size: 2, color: '#999' }
      ]
    }
  },
  sigmaOptions: {
    renderMode: 'webgl'
  }
})

// 2. 初始化 Engine
await engine.initialize()

// 3. 加载初始数据
await engine.dataManager.loadChunk({
  id: 'initial-chunk',
  bounds: { minX: -500, maxX: 500, minY: -500, maxY: 500 },
  priority: 'critical'
})

// 4. 刷新显示
engine.sigmaManager.refresh()

console.log('✅ 图已显示！')
```

---

## 📋 核心 API 参考

### EngineCore

```typescript
// 初始化
await engine.initialize()

// 获取 API
const api = engine.getAPI()

// 销毁
await engine.destroy()

// 检查状态
const status = engine.getStatus()
```

### SigmaManager

```typescript
const sigmaManager = engine.sigmaManager

// 获取 Sigma 实例
const sigma = sigmaManager.getInstance()

// 获取 Graphology Graph
const graph = sigmaManager.getGraph()

// 获取 Camera
const camera = sigmaManager.getCamera()

// 刷新渲染
sigmaManager.refresh()
sigmaManager.refresh({ skipIndexation: true })  // 性能优化

// 设置动态样式
sigmaManager.setNodeReducer((nodeId, data) => {
  if (selectedNodes.has(nodeId)) {
    return { ...data, size: data.size * 1.5, color: '#FF0000' }
  }
  return data
})
```

### DataManager

```typescript
const dataManager = engine.dataManager

// 加载数据块
await dataManager.loadChunk({
  id: 'chunk-1',
  bounds: { minX: 0, maxX: 1000, minY: 0, maxY: 1000 },
  priority: 'high'
})

// 卸载数据块（释放内存）
await dataManager.unloadChunk('chunk-1')

// 批量添加节点
dataManager.addNodes([
  { id: 'new-node', x: 200, y: 200, size: 10, color: '#999', label: 'New' }
])

// 批量移除节点
dataManager.removeNodes(['node-1', 'node-2'])

// 获取统计
const stats = dataManager.getMemoryStats()
// { loadedChunks, hotNodes, totalNodes, totalEdges }
```

### RenderScheduler

```typescript
const scheduler = engine.renderScheduler

// 更新单个节点
scheduler.scheduleNodeUpdate('node-1', { color: '#FF0000', size: 20 })

// 批量更新（自动防抖）
scheduler.scheduleNodeUpdates([
  { nodeId: 'node-1', update: { color: '#FF0000' } },
  { nodeId: 'node-2', update: { color: '#00FF00' } }
])

// 立即刷新（跳过防抖）
scheduler.flushRender()
```

### ViewportManager

```typescript
const viewport = engine.viewportManager

// 缩放
viewport.setZoom(2.0)

// 平移
viewport.setPan(100, 100)

// 适配节点
viewport.fitToNodes(['node-1', 'node-2', 'node-3'])

// 坐标转换
const screen = viewport.worldToScreen(100, 100)
const world = viewport.screenToWorld(500, 500)

// 获取可见边界
const bounds = viewport.getVisibleBounds()
// { minX, maxX, minY, maxY }
```

### EventBus

```typescript
const eventBus = engine.eventBus

// 监听 Sigma.js 原生事件（已自动桥接）
eventBus.on('node:click', (event) => {
  console.log('节点点击:', event.node)
})

eventBus.on('node:hover', (event) => {
  console.log('节点悬浮:', event.node)
})

eventBus.on('render:after', () => {
  console.log('渲染完成')
})

// 发送自定义事件
eventBus.emit('graph:dataLoaded', { count: 1000 })

// 移除监听
eventBus.off('node:click', handler)
```

---

## 🎨 创建自定义图

### 完整示例

```typescript
import { BaseGraph, type GraphConfig, type StarChartEngineAPI } from 'Service/StarChart'

export class MyCustomGraph extends BaseGraph {
  private selectedNodes = new Set<string>()

  constructor(engine: StarChartEngineAPI, config: GraphConfig) {
    super(engine, config)
  }

  async initialize(): Promise<void> {
    // 1. 设置节点 Reducer（动态样式）
    this.engine.sigmaManager.setNodeReducer((nodeId, data) => {
      if (this.selectedNodes.has(nodeId)) {
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

    // 2. 绑定事件
    this.engine.eventBus.on('node:click', (event) => {
      this.handleNodeClick(event.node)
    })

    this.engine.eventBus.on('node:doubleClick', (event) => {
      this.handleNodeDoubleClick(event.node)
    })
  }

  async load(): Promise<void> {
    // 加载初始数据
    await this.engine.dataManager.loadChunk({
      id: 'initial',
      bounds: { minX: -1000, maxX: 1000, minY: -1000, maxY: 1000 },
      priority: 'critical'
    })

    // 刷新显示
    this.engine.sigmaManager.refresh()
  }

  async destroy(): Promise<void> {
    this.selectedNodes.clear()
    this.engine.dataManager.clearAll()
  }

  protected async loadChunkData(chunkId: string) {
    // 从数据源加载（数据库、API 等）
    const data = await fetchDataFromSource(chunkId)
    return {
      nodes: data.items.map(item => ({
        id: item.id,
        x: item.position.x,
        y: item.position.y,
        size: 10,
        color: item.color || '#999',
        label: item.name
      })),
      edges: data.connections.map(conn => ({
        id: conn.id,
        source: conn.from,
        target: conn.to,
        size: 2,
        color: '#ccc'
      }))
    }
  }

  protected async getChunkDescriptors() {
    // 定义如何分块
    return [
      { id: 'chunk-1', bounds: {...}, priority: 'high' },
      { id: 'chunk-2', bounds: {...}, priority: 'normal' }
    ]
  }

  protected async computeLayout(nodes: any[], edges: any[]) {
    // 使用 Worker 计算布局
    const result = await this.engine.asyncTask.computeLayout(
      nodes,
      edges,
      'force-directed',
      { iterations: 100 }
    )

    // 写回 Graphology
    for (const [nodeId, pos] of Object.entries(result.positions)) {
      if (this.graph.hasNode(nodeId)) {
        this.graph.setNodeAttribute(nodeId, 'x', (pos as any).x)
        this.graph.setNodeAttribute(nodeId, 'y', (pos as any).y)
      }
    }

    return result
  }

  protected async updateLayout(changedNodeIds: string[]) {
    // 增量布局更新
  }

  protected handleNodeClick(nodeId: string) {
    // 切换选中状态
    if (this.selectedNodes.has(nodeId)) {
      this.selectedNodes.delete(nodeId)
    } else {
      this.selectedNodes.add(nodeId)
    }

    // 刷新显示（Reducer 会自动应用新样式）
    this.engine.sigmaManager.refresh()
  }

  protected async handleNodeDoubleClick(nodeId: string) {
    // 实现展开/收起逻辑
    console.log('双击节点:', nodeId)
  }

  protected handleNodeHover(nodeId: string) {
    // 高亮悬浮节点
    this.engine.renderScheduler.scheduleNodeUpdate(nodeId, {
      highlighted: true
    })
  }
}
```

---

## 🔧 常见任务

### 任务 1: 添加节点

```typescript
const graph = engine.sigmaManager.getGraph()

graph.addNode('new-node', {
  x: 100,
  y: 100,
  size: 15,
  color: '#4A90E2',
  label: 'New Node'
})

// Sigma.js 自动刷新（或手动）
engine.sigmaManager.refresh()
```

### 任务 2: 更新节点样式

```typescript
// 方式 1: 直接修改 Graphology（永久）
graph.setNodeAttribute('node-1', 'color', '#FF0000')

// 方式 2: 使用 Reducer（动态，不修改原始数据）
engine.sigmaManager.setNodeReducer((nodeId, data) => {
  if (nodeId === 'node-1') {
    return { ...data, color: '#FF0000' }
  }
  return data
})
engine.sigmaManager.refresh()
```

### 任务 3: 移除节点

```typescript
const graph = engine.sigmaManager.getGraph()

// 移除节点（会自动移除相关的边）
graph.dropNode('node-1')

// Sigma.js 自动刷新
```

### 任务 4: 视口控制

```typescript
// 缩放到节点
engine.viewportManager.fitToNodes(['node-1', 'node-2'])

// 动画缩放
engine.viewportManager.setZoom(2.5)

// 重置视口
engine.viewportManager.reset()
```

### 任务 5: 监听事件

```typescript
// 节点选中
engine.eventBus.on('node:click', (event) => {
  const nodeId = event.node
  console.log('选中节点:', nodeId)
})

// 渲染完成
engine.eventBus.on('render:after', () => {
  console.log('渲染完成')
})
```

---

## ⚠️ 注意事项

### ❌ 错误做法

```typescript
// ❌ 手动计算坐标
const screenX = worldX * scale + offsetX

// ❌ 直接修改 Sigma 内部状态
sigma._something = value

// ❌ 跳过 Graphology 直接渲染
sigma.render()

// ❌ 使用 any 类型
const node: any = graph.getNode('id')
```

### ✅ 正确做法

```typescript
// ✅ 使用 Camera API
const screen = camera.graphToViewport({ x: worldX, y: worldY })

// ✅ 通过 Graphology 修改
graph.setNodeAttribute('node-1', 'color', '#FF0000')

// ✅ 使用严格类型
const graph: Graph = engine.sigmaManager.getGraph()
const sigma: Sigma = engine.sigmaManager.getInstance()
```

---

## 🎯 开发流程

### 添加新图

1. 创建目录：`Graphs/MyGraph/`
2. 创建文件：`MyGraph.ts`
3. 继承 `BaseGraph`
4. 实现抽象方法
5. 导出到 `Graphs/index.ts`

### 扩展 Engine 功能

1. 评估是否通用（所有图都需要）
2. 在 Engine 层添加新模块
3. 更新 `StarChartEngineAPI` 类型
4. 在 `EngineCore` 中集成
5. 更新文档

---

## 📚 类型参考

### Engine API

```typescript
interface StarChartEngineAPI {
  sigmaManager: SigmaManagerAPI
  dataManager: DataManagerAPI
  renderScheduler: RenderSchedulerAPI
  viewportManager: ViewportManagerAPI
  asyncTask: AsyncTaskManagerAPI
  eventBus: EventBusAPI
  spatialIndex: SpatialIndexAPI
}
```

### 节点数据

```typescript
interface NodeData {
  id: string
  x: number       // 必需
  y: number       // 必需
  size: number    // 必需
  color: string   // 必需
  label?: string
  type?: string
  hidden?: boolean
  forceLabel?: boolean
  zIndex?: number
  highlighted?: boolean
  properties?: Readonly<Record<string, string | number | boolean | null>>
}
```

---

## 🔍 调试技巧

### 查看图状态

```typescript
// Engine 状态
console.log(engine.getStatus())

// Graph 状态
console.log(graph.getStats())

// 内存状态
console.log(engine.dataManager.getMemoryStats())

// 事件统计
console.log(engine.eventBus.getStats())
```

### 性能监控

```typescript
// 渲染时间
engine.eventBus.on('render:afterUpdate', (event) => {
  console.log(`渲染耗时: ${event.renderTime}ms, 节点数: ${event.nodeCount}`)
})

// Worker 任务
engine.eventBus.on('task:completed', (event) => {
  console.log('任务完成:', event)
})
```

---

## 💡 最佳实践

1. **使用 Reducer 实现动态样式**，不要频繁修改 Graphology
2. **批量操作**使用 `scheduleNodeUpdates()`，不要逐个 update
3. **渐进式加载**：只加载视口内和附近的数据
4. **及时卸载**：不可见的数据要卸载释放内存
5. **Worker 计算**：布局算法等耗时操作使用 AsyncTaskManager

---

Boss，使用指南已生成！现在整个系统已经重构完成并可用。

