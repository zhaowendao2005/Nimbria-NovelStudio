# StarChart 系统 - 重构后完整架构

**重构日期**：2025年10月21日  
**版本**：v2.0（重构版）

---

## 📐 完整文件架构树

```
Nimbria/Client/Service/StarChart/
├── Engine/                                    # 渲染引擎核心（通用）
│   ├── EngineCore.ts [新增]                   # 统一导出和初始化管理
│   │   └── 内部模块：管理所有 Engine 模块的初始化顺序
│   │   └── 内部模块：提供统一的 API 接口
│   │   └── 内部模块：确保依赖关系正确（SigmaManager → DataManager → 其他）
│   │
│   ├── SigmaManager/ [完全重写]
│   │   ├── SigmaManager.ts
│   │   │   └── 内部模块：完整实现 Sigma + Graphology 初始化
│   │   │   └── 内部模块：实现 nodeReducer 和 edgeReducer 支持
│   │   │   └── 内部模块：Camera API 访问接口
│   │   │   └── 内部模块：严格类型（import Sigma, Graph）
│   │   └── index.ts
│   │
│   ├── DataManager/ [新增模块]
│   │   ├── DataManager.ts
│   │   │   └── 内部模块：分块数据加载器（Chunk-based）
│   │   │   └── 内部模块：内存数据管理（Hot/Warm/Cold）
│   │   │   └── 内部模块：批量添加/移除节点到 Graphology
│   │   │   └── 内部模块：内存统计和监控
│   │   └── index.ts
│   │
│   ├── RenderScheduler/ [完全重写]
│   │   ├── RenderScheduler.ts
│   │   │   └── 内部模块：直接操作 Graphology (graph.setNodeAttribute)
│   │   │   └── 内部模块：智能判断 skipIndexation
│   │   │   └── 内部模块：使用 requestAnimationFrame 防抖
│   │   │   └── 内部模块：调用 sigma.refresh() 而非自定义渲染
│   │   └── index.ts
│   │
│   ├── ViewportManager/ [完全重写]
│   │   ├── ViewportManager.ts
│   │   │   └── 内部模块：使用 Sigma Camera API
│   │   │   └── 内部模块：camera.graphToViewport() 坐标转换
│   │   │   └── 内部模块：camera.viewportToGraph() 逆转换
│   │   │   └── 内部模块：监听 Sigma 的 afterRender 事件
│   │   └── index.ts
│   │
│   ├── EventBus/ [完全重写]
│   │   ├── EventBus.ts
│   │   │   └── 内部模块：桥接 Sigma.js 原生事件
│   │   │   └── 内部模块：sigma.on('clickNode') → eventBus.emit('node:click')
│   │   │   └── 内部模块：自动解绑事件防止内存泄漏
│   │   └── index.ts
│   │
│   ├── AsyncTaskManager/ [修改]
│   │   ├── AsyncTaskManager.ts
│   │   │   └── 内部模块：修正 Worker 消息协议
│   │   │   └── 内部模块：严格的消息类型定义
│   │   └── index.ts
│   │
│   ├── SpatialIndex/ [保留]
│   │   ├── SpatialIndex.ts
│   │   │   └── 内部模块：四叉树空间索引
│   │   └── index.ts
│   │
│   ├── PerformanceMonitor/ [保留]
│   │   ├── PerformanceMonitor.ts
│   │   └── index.ts
│   │
│   ├── MemoryManager/ [保留]
│   │   ├── MemoryManager.ts
│   │   └── index.ts
│   │
│   ├── Logger/ [保留]
│   │   ├── Logger.ts
│   │   └── index.ts
│   │
│   ├── ConfigManager/ [保留]
│   │   ├── ConfigManager.ts
│   │   └── index.ts
│   │
│   ├── LayerManager/ [保留]
│   │   ├── LayerManager.ts
│   │   └── index.ts
│   │
│   └── index.ts [修改]
│       └── 导出所有 Engine 模块
│
├── Graphs/ [新增目录]                         # 具体图实现（业务）
│   ├── BaseGraph.ts [新增]
│   │   └── 抽象基类：定义图的生命周期
│   │   └── 提供 Engine API 访问
│   │   └── 定义数据加载、布局、交互的抽象方法
│   │
│   ├── RecipeGraph/ [新增]
│   │   ├── RecipeGraph.ts
│   │   │   └── 内部模块：MC 配方图实现
│   │   │   └── 内部模块：节点展开/收起逻辑
│   │   │   └── 内部模块：六边形分区（预留）
│   │   │   └── 内部模块：弧形布局算法
│   │   └── index.ts
│   │
│   └── index.ts [新增]
│
├── Workers/                                   # Web Worker 模块
│   ├── LayoutWorker/
│   │   ├── layout.worker.ts [修改]
│   │   │   └── 内部模块：完善消息协议
│   │   └── index.ts
│   │
│   ├── SpatialWorker/
│   │   ├── spatial.worker.ts
│   │   └── index.ts
│   │
│   └── index.ts
│
├── index.ts [完全重写]
│   └── 导出 Engine + Graphs + 类型
│
├── visualizationService.ts [保留]
│
├── starChart.service.types.ts [保留]
│
└── README.md [新增]
    └── 完整的使用文档和示例
```

---

## 🔄 类型系统架构

```
Client/types/Business/StarChart/
├── Core/
│   ├── public.ts [完全重写]
│   │   ├── 导入 Sigma.js 官方类型（Sigma, Camera, NodeDisplayData 等）
│   │   ├── 导入 Graphology 官方类型（Graph, Attributes）
│   │   ├── StarChartEngineAPI（统一 API）
│   │   ├── NodeData/EdgeData（添加 size, color 等必需属性）
│   │   ├── NodeReducer/EdgeReducer（动态样式类型）
│   │   ├── DataManagerAPI（渐进式加载 API）
│   │   └── 所有 API 接口严格类型
│   │
│   ├── internal.ts [修改]
│   │   └── 移除 any 类型
│   │   └── 严格定义 Worker 消息协议
│   │
│   └── index.ts
│
├── Data/
│   ├── public.ts
│   └── index.ts
│
├── Renderer/
│   ├── public.ts
│   └── index.ts
│
└── index.ts [修改]
    └── 导出所有类型
```

---

## 🔀 数据流架构

### 完整的数据流（修正后）

```
用户交互
    ↓
Graph 层（业务逻辑）
    ↓
Engine API 调用
    ↓
┌─────────────────────────────────────┐
│  Engine 核心                         │
│                                     │
│  DataManager.loadChunk()            │
│    ↓                                │
│  graph.addNode() (Graphology)      │
│    ↓                                │
│  Sigma.js 自动监听                  │
│    ↓                                │
│  Sigma.js 自动 refresh()            │
│    ↓                                │
│  WebGL/Canvas 渲染                  │
│                                     │
│  或者：                             │
│                                     │
│  RenderScheduler.scheduleUpdate()  │
│    ↓                                │
│  graph.setNodeAttribute()          │
│    ↓                                │
│  sigma.refresh({ skipIndexation }) │
│    ↓                                │
│  增量渲染                           │
└─────────────────────────────────────┘
```

### Worker 后台计算流程

```
Graph.computeLayout()
    ↓
AsyncTaskManager.computeLayout()
    ↓
LayoutWorker（后台计算）
    ↓
Worker 返回 positions: { nodeId: { x, y } }
    ↓
Graph 层处理结果：
  for (const [nodeId, pos] of Object.entries(positions)) {
    graph.setNodeAttribute(nodeId, 'x', pos.x)
    graph.setNodeAttribute(nodeId, 'y', pos.y)
  }
    ↓
Sigma.js 自动监听 → 自动刷新
```

---

## 🎯 关键设计原则

### 1. 职责分离

| 层级 | 职责 | 不负责 |
|------|------|--------|
| **Graphology** | 数据存储 | 渲染、布局 |
| **Sigma.js** | 渲染、交互 | 数据管理、业务逻辑 |
| **Engine** | 协调、API 提供 | 业务逻辑 |
| **Graph** | 业务逻辑、数据加载策略 | 底层渲染 |

### 2. 数据唯一性

- **唯一数据源**：Graphology Graph 实例
- **只读视图**：Reducer 提供动态视图，不修改原始数据
- **写操作**：所有修改都通过 `graph.setNodeAttribute()` 等 API

### 3. 事件驱动

- **Sigma.js 事件** → EventBus 统一分发
- **Engine 事件** → Graph 层响应
- **Graph 事件** → GUI 层响应

### 4. 类型安全

- **导入官方类型**：`Sigma`, `Graph`, `Camera` 等
- **零 any 类型**：所有接口严格类型
- **编译时检查**：TypeScript strict 模式

---

## 📚 相关文档

- [StarChart 系统介绍](./StarChart系统-渲染引擎介绍1.md)
- [Sigma.js 兼容性 Review](./StarChart系统-渲染引擎介绍1.md#深度-review)
- [图数据可视化视口设计](../../../Design/数据库系统/图数据可视化视口.md)
- [重构完成总结](../../总结/StarChart渲染引擎重构完成_2025-10-21.md)

---

**重构完成标志**：✅ 所有核心问题已修复，系统已可用！

