# StarChart 系统架构文档

> **版本**: 2.0 (插件化重构版)  
> **更新日期**: 2025-10-18  
> **维护者**: Nimbria 开发团队

---

## 📋 目录

- [1. 系统概述](#1-系统概述)
- [2. 核心架构](#2-核心架构)
- [3. 插件系统](#3-插件系统)
- [4. 数据流](#4-数据流)
- [5. 开发规范](#5-开发规范)
- [6. API 参考](#6-api-参考)
- [7. 最佳实践](#7-最佳实践)

---

## 1. 系统概述

### 1.1 简介

**StarChart** 是一个基于 **G6** 的可视化图表系统，专门为小说设定关系图设计。通过插件化架构，支持多种布局算法和数据源，提供灵活的可视化解决方案。

### 1.2 核心特性

- ✅ **插件化架构** - 布局算法完全解耦，易于扩展
- ✅ **数据源抽象** - 支持静态/动态/远程数据源
- ✅ **自包含插件** - 每个插件独立管理依赖，无外部耦合
- ✅ **类型安全** - 完整的 TypeScript 类型定义
- ✅ **状态管理** - 基于 Pinia 的响应式状态
- ✅ **多布局支持** - 径向树、同心圆、力导向等

### 1.3 技术栈

```
前端框架: Vue 3 + TypeScript
可视化库: @antv/g6
状态管理: Pinia
样式方案: SCSS
构建工具: Vite
```

---

## 2. 核心架构

### 2.1 目录结构

```
Client/stores/projectPage/starChart/
├── config/                          # 配置管理
│   └── types.ts                     # 配置类型定义
├── data/                            # 数据层
│   ├── base/                        # 数据源基类
│   │   ├── DataSourceBase.ts
│   │   └── DataSourceTypes.ts
│   ├── static/                      # 静态数据源
│   │   ├── mock.normal.ts
│   │   └── mock.large.ts
│   ├── DataSourceManager.ts         # 数据源管理器
│   └── types.ts                     # 数据类型
├── plugins/                         # 🔥 插件系统
│   ├── types.ts                     # 核心契约
│   ├── registry.ts                  # 插件注册表
│   ├── index.ts                     # 导出入口
│   ├── base/                        # 基础抽象
│   │   └── BaseLayoutPlugin.ts
│   └── MultiRootRadialPlugin/       # 🌟 多根径向树插件
│       ├── index.ts                 # 插件主类
│       ├── layout.ts                # 布局算法
│       ├── adapter.ts               # 数据适配器
│       ├── styles.ts                # 样式管理
│       └── types.ts                 # 插件类型
├── starChart.store.ts               # 主 Store
├── starChart.config.store.ts        # 配置 Store
└── starChart.config.types.ts        # 配置类型

Client/GUI/components/ProjectPage.MainPanel/StarChart/
├── StarChartPage.vue                # 页面容器
├── StarChartPanel.vue               # 面板组件
├── StarChartTopBar.vue              # 顶部工具栏
├── StarChartViewport.vue            # 🎨 视口渲染器
├── register.ts                      # 页面注册
└── index.ts                         # 导出入口
```

### 2.2 架构分层

```
┌─────────────────────────────────────────┐
│          UI Layer (Vue 组件)            │
│  StarChartPage → StarChartViewport      │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      State Layer (Pinia Stores)         │
│  starChart.store + starChart.config     │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│       Plugin Layer (布局插件)           │
│  PluginRegistry → ILayoutPlugin         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      Data Layer (数据源)                │
│  DataSourceManager → IDataSource        │
└─────────────────────────────────────────┘
```

---

## 3. 插件系统

### 3.1 设计理念

#### 🎯 核心原则

1. **自包含** - 每个插件独立管理所有依赖
2. **解耦** - 插件间无直接依赖
3. **契约驱动** - 通过接口定义行为
4. **可扩展** - 易于添加新插件

#### 📦 插件结构

```typescript
MultiRootRadialPlugin/          # 插件包（自包含）
├── index.ts                    # 插件主类（唯一对外接口）
│   └── implements ILayoutPlugin
├── layout.ts                   # 算法实现
│   └── class MultiRootRadialLayoutAlgorithm
├── adapter.ts                  # 数据适配
│   └── class TreeDataAdapter
├── styles.ts                   # 样式计算
│   └── class HierarchyStyleHelper
└── types.ts                    # 插件专用类型
    └── interface RadialLayoutConfig
```

### 3.2 核心接口

#### ILayoutPlugin

所有布局插件必须实现的接口：

```typescript
export interface ILayoutPlugin {
  // ===== 元信息 =====
  name: string                       // 唯一标识符
  displayName: string                // 显示名称
  version: string                    // 版本号
  description?: string               // 描述
  
  // ===== 能力声明 =====
  supportedDataFormats: DataFormat[] // 支持的数据格式
  
  // ===== 核心方法 =====
  
  /**
   * 执行布局计算（包含数据适配）
   */
  execute(data: G6GraphData, options?: LayoutOptions): Promise<LayoutResult>
  
  /**
   * 获取默认样式规则
   */
  getDefaultStyles(): StyleRules
  
  /**
   * 合并样式
   */
  mergeStyles(
    dataStyles: any,
    pluginStyles: StyleRules,
    userConfig?: UserStyleConfig
  ): FinalStyleRules
  
  /**
   * 获取配置 Schema
   */
  getConfigSchema(): ConfigSchema
}
```

### 3.3 插件生命周期

```
1. 注册阶段
   └─> PluginRegistry.register(new MyPlugin())

2. 数据准备阶段
   └─> plugin.execute(data, options)
       ├─> adapter.adapt(data)        // 内部：数据适配
       └─> algorithm.calculate()       // 内部：布局计算

3. 样式计算阶段
   └─> plugin.getDefaultStyles()
       └─> plugin.mergeStyles()

4. 渲染阶段
   └─> G6.render(layoutResult)
```

### 3.4 数据契约

#### 输入数据格式

```typescript
interface G6GraphData {
  nodes: G6Node[]                // 节点数组
  edges: G6Edge[]                // 边数组
  
  // 树布局必需的元数据
  tree?: TreeNode                // 单树结构
  treesData?: TreeNode[]         // 多树结构
  rootIds?: string[]             // 根节点 ID 列表
}
```

#### 输出数据格式

```typescript
interface LayoutResult extends G6GraphData {
  // 继承输入的所有字段
  // 节点位置已计算（node.style.x, node.style.y）
  // 边类型已确定（edge.type）
  
  // ⚠️ 必须保留原始的树结构字段
  tree?: TreeNode
  treesData?: TreeNode[]
  rootIds?: string[]
}
```

---

## 4. 数据流

### 4.1 完整数据流路径

```
┌─────────────────┐
│   DataSource    │ 生成原始数据
│  (mock.large)   │ {nodes, edges, treesData, rootIds}
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  StarChart      │ 存储到 Store
│    Store        │ graphData = ...
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Viewport      │ 获取插件
│  (StarChart     │ plugin = PluginRegistry.get(name)
│   Viewport)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Layout Plugin  │ 执行布局（内部包含适配）
│   .execute()    │ layoutResult = await plugin.execute(data)
└────────┬────────┘
         │
         ├─> adapter.adapt()    // 内部步骤
         └─> algorithm.calc()   // 内部步骤
         │
         ▼
┌─────────────────┐
│   G6 Render     │ 渲染到画布
│  new Graph()    │ data: layoutResult
└─────────────────┘
```

### 4.2 数据传递保证

#### ✅ 必须保留的字段

在整个数据流中，以下字段**必须**在每一步保留：

```typescript
{
  nodes,        // 节点（可修改位置）
  edges,        // 边（可修改类型）
  tree,         // 单树结构（不可修改）
  treesData,    // 多树结构（不可修改）
  rootIds       // 根节点 ID（不可修改）
}
```

#### 🔑 使用扩展运算符保留字段

```typescript
// ✅ 正确：保留所有原始字段
return {
  ...data,                    // 保留所有原始字段
  nodes: layoutedNodes,       // 只覆盖需要修改的
  edges: layoutedEdges
}

// ❌ 错误：丢失原始字段
return {
  nodes: layoutedNodes,
  edges: layoutedEdges
  // tree、treesData、rootIds 丢失！
}
```

---

## 5. 开发规范

### 5.1 添加新插件

#### Step 1: 创建插件目录

```bash
plugins/
└── MyNewPlugin/
    ├── index.ts       # 插件主类
    ├── algorithm.ts   # 布局算法
    ├── adapter.ts     # 数据适配（可选）
    ├── styles.ts      # 样式管理（可选）
    └── types.ts       # 插件类型
```

#### Step 2: 实现插件主类

```typescript
// plugins/MyNewPlugin/index.ts
import { BaseLayoutPlugin } from '../base/BaseLayoutPlugin'
import type { LayoutOptions, LayoutResult } from '../types'

export class MyNewPlugin extends BaseLayoutPlugin {
  override name = 'my-new-layout'
  override displayName = '我的新布局'
  override version = '1.0.0'
  override supportedDataFormats = ['graph' as const]
  
  override async execute(
    data: any, 
    options?: LayoutOptions
  ): Promise<LayoutResult> {
    // 1. 数据适配（如需要）
    const adaptedData = this.adaptData(data)
    
    // 2. 布局计算
    const layoutedNodes = this.calculateLayout(adaptedData, options)
    
    // 3. 返回结果（保留所有原始字段）
    return {
      ...data,
      nodes: layoutedNodes,
      edges: data.edges
    }
  }
  
  override getDefaultStyles() {
    return {
      node: { size: 20, fill: '#5B8FF9' },
      edge: { lineWidth: 2, stroke: '#99a9bf' }
    }
  }
}
```

#### Step 3: 注册插件

```typescript
// plugins/index.ts
import { MyNewPlugin } from './MyNewPlugin'

PluginRegistry.register(new MyNewPlugin())
```

### 5.2 添加新数据源

#### Step 1: 创建数据源类

```typescript
// data/static/my-data.ts
import { StaticDataSource } from '../base/DataSourceBase'
import type { G6GraphData } from '../types'

export class MyDataSource extends StaticDataSource {
  readonly metadata = {
    id: 'my-data',
    name: '我的数据源',
    category: 'static',
    description: '描述',
    estimatedNodeCount: 100,
    estimatedEdgeCount: 150,
    recommendedLayouts: ['my-new-layout']
  }
  
  async loadGraphData(): Promise<G6GraphData> {
    const nodes = [/* ... */]
    const edges = [/* ... */]
    
    return {
      nodes,
      edges,
      // 如果是树形数据，必须提供：
      tree,
      treesData,
      rootIds
    }
  }
}
```

#### Step 2: 注册数据源

```typescript
// data/DataSourceManager.ts
import { myDataSource } from './static/my-data'

dataSourceManager.register(myDataSource)
```

### 5.3 类型定义规范

#### 核心契约类型 (`plugins/types.ts`)

只定义**插件系统的核心接口**，不包含具体实现：

```typescript
// ✅ 应该在这里定义
export interface ILayoutPlugin { /* ... */ }
export interface G6GraphData { /* ... */ }
export interface LayoutOptions { /* ... */ }

// ❌ 不应该在这里定义
export interface RadialLayoutConfig { /* ... */ }  // 插件专用，应在插件内
export class HierarchyStyleHelper { /* ... */ }    // 具体实现，应在插件内
```

#### 插件专用类型 (`MyPlugin/types.ts`)

定义插件内部使用的类型：

```typescript
export interface MyPluginConfig {
  // 插件专用配置
}

export interface MyAlgorithmOptions {
  // 算法专用选项
}
```

### 5.4 代码风格

#### 命名约定

```typescript
// 插件类名：Plugin 后缀
export class MultiRootRadialPlugin extends BaseLayoutPlugin

// 算法类名：Algorithm 后缀
export class MultiRootRadialLayoutAlgorithm

// 适配器类名：Adapter 后缀
export class TreeDataAdapter

// 辅助类名：Helper 后缀
export class HierarchyStyleHelper
```

#### 注释规范

```typescript
/**
 * 执行布局计算
 * 
 * @param data 输入数据（任意格式，插件内部负责适配）
 * @param options 布局选项
 * @returns 布局结果（必须包含完整的树结构信息）
 */
async execute(data: any, options?: LayoutOptions): Promise<LayoutResult>
```

---

## 6. API 参考

### 6.1 PluginRegistry API

```typescript
// 注册插件
PluginRegistry.register(plugin: ILayoutPlugin): void

// 获取插件
PluginRegistry.get(name: string): ILayoutPlugin | undefined

// 获取所有插件
PluginRegistry.getAll(): ILayoutPlugin[]
```

### 6.2 DataSourceManager API

```typescript
// 注册数据源
dataSourceManager.register(dataSource: IDataSource): void

// 加载数据
dataSourceManager.loadData(type: DataSourceType): Promise<G6GraphData>

// 获取元数据
dataSourceManager.getMetadata(type: DataSourceType): DataSourceMetadata
```

### 6.3 Store API

```typescript
// StarChart Store
const starChartStore = useStarChartStore()

// 初始化
await starChartStore.init()

// 切换数据源
await starChartStore.switchDataSource('mock-large')

// 切换布局
starChartStore.switchLayout('compact-box')

// StarChart Config Store
const configStore = useStarChartConfigStore()

// 更新配置
configStore.updateConfig({ /* ... */ })

// 设置布局类型
configStore.setLayoutType('compact-box')
```

---

## 7. 最佳实践

### 7.1 数据完整性检查

在关键节点添加数据完整性校验：

```typescript
// 在适配器中检查
async adapt(data: G6GraphData): Promise<G6GraphData> {
  const result = { /* ... */ }
  
  if (data.treesData && !result.treesData) {
    console.error('[Adapter] 树结构数据丢失！')
  }
  
  return result
}
```

### 7.2 错误处理

```typescript
try {
  const layoutResult = await plugin.execute(data, options)
} catch (error) {
  console.error('[StarChart] 布局计算失败:', error)
  // 降级处理：返回原始数据
  return data
}
```

### 7.3 性能优化

```typescript
// 缓存计算结果
private cachedResult: LayoutResult | null = null

async execute(data: any, options?: LayoutOptions) {
  const cacheKey = this.generateCacheKey(data, options)
  
  if (this.cachedResult?.key === cacheKey) {
    return this.cachedResult.data
  }
  
  // 执行计算...
}
```

### 7.4 开发时调试

```typescript
if (import.meta.env.DEV) {
  console.log('[Plugin] 输入数据:', {
    nodeCount: data.nodes.length,
    edgeCount: data.edges.length,
    hasTree: !!data.tree,
    hasTreesData: !!data.treesData,
    rootIds: data.rootIds
  })
}
```

---

## 8. 故障排除

### 8.1 常见问题

#### Q: "Tree structure not found" 错误

**原因**: `cubic-radial` 边类型需要树结构信息，但数据中缺少 `tree` 或 `treesData`。

**解决**:
1. 确保数据源生成了完整的树结构
2. 检查适配器是否保留了 `tree`、`treesData`、`rootIds`
3. 检查布局算法返回时使用了 `...data` 扩展运算符

#### Q: 插件注册失败

**原因**: 导入链路中有错误或循环依赖。

**解决**:
1. 检查 `plugins/index.ts` 是否有废弃的导出
2. 确保插件内部模块使用相对路径导入
3. 重启 TypeScript Server

#### Q: 布局不生效

**原因**: 插件未正确注册或数据格式不匹配。

**解决**:
1. 检查 `PluginRegistry.getAll()` 是否包含该插件
2. 查看控制台是否有 `[StarChart Plugins] 插件系统初始化完成`
3. 确认 `supportedDataFormats` 包含当前数据格式

---

## 9. 版本历史

### v2.0.0 (2025-10-18) - 插件化重构

- ✨ 全新的插件化架构
- 🎯 自包含插件设计
- 🧹 清理废弃代码
- 📝 完善类型定义
- 🚀 性能优化

### v1.0.0 - 初始版本

- 基础的 G6 可视化
- 简单的布局系统
- 静态数据源

---

## 10. 未来规划

- [ ] 添加力导向布局插件
- [ ] 支持动态数据源（WebSocket）
- [ ] 节点编辑功能
- [ ] 布局动画
- [ ] 导出为图片/SVG
- [ ] 主题系统

---

## 11. 贡献指南

### 提交插件

1. Fork 项目
2. 在 `plugins/` 下创建你的插件目录
3. 实现 `ILayoutPlugin` 接口
4. 添加单元测试
5. 更新文档
6. 提交 Pull Request

### 代码审查标准

- ✅ 类型定义完整
- ✅ 保留数据完整性
- ✅ 遵循命名约定
- ✅ 包含注释和文档
- ✅ 通过 ESLint 检查

---

## 12. 联系方式

- **项目地址**: Nimbria-NovelStudio
- **文档地址**: `.Document/功能与架构设计/`
- **技术支持**: Nimbria 开发团队

---

**最后更新**: 2025-10-18  
**文档版本**: 2.0.0

