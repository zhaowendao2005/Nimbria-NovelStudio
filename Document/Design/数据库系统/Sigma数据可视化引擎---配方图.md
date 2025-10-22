好的Boss，我来为StarChart系统设计完整的集成方案。根据您的需求，我会设计一个配置面板系统，让图可以声明式地定义自己的配置项。

## 📐 完整文件架构修改树

```
Nimbria/Client/
├── types/Business/StarChart/
│   ├── Core/
│   │   └── public.ts [修改内容]
│   │       ├── 内部模块：新增 GraphMetadata（图元数据）
│   │       ├── 内部模块：新增 DataSourceDescriptor（数据源描述符）
│   │       ├── 内部模块：新增 GraphRegistry 接口
│   │       └── 内部模块：导入 Sigma, Camera 类型
│   │
│   ├── Data/ [新增目录]
│   │   ├── index.ts [新增文件]
│   │   │   └── 内部模块：导出所有数据相关类型
│   │   ├── public.ts [新增文件]
│   │   │   ├── 内部模块：导入 graphology 类型
│   │   │   ├── 内部模块：RawGraphData（原始图数据）
│   │   │   ├── 内部模块：NormalizedGraphData（标准化图数据）
│   │   │   ├── 内部模块：LayoutInputData（布局输入数据）
│   │   │   ├── 内部模块：LayoutOutputData（布局输出数据）
│   │   │   └── 内部模块：GraphDataFormat 枚举
│   │   │
│   │   └── adapter.ts [新增文件]
│   │       ├── 内部模块：LayoutRequirement（布局需求）
│   │       ├── 内部模块：DataAdapterConfig（适配器配置）
│   │       └── 内部模块：AdapterResult（适配结果）
│   │
│   ├── Layout/ [新增目录]
│   │   ├── index.ts [新增文件]
│   │   │   └── 内部模块：导出所有布局相关类型
│   │   ├── public.ts [新增文件]
│   │   │   ├── 内部模块：LayoutAlgorithm 枚举
│   │   │   ├── 内部模块：LayoutConfig 联合类型
│   │   │   ├── 内部模块：CustomArcOptions 弧形布局配置
│   │   │   ├── 内部模块：CustomHexOptions 六边形布局配置
│   │   │   └── 内部模块：导入官方布局库类型
│   │   │
│   │   └── requirements.ts [新增文件]
│   │       ├── 内部模块：每个布局算法的数据格式需求
│   │       └── 内部模块：LayoutRequirementsRegistry
│   │
│   ├── Config/ [新增目录]
│   │   ├── index.ts [新增文件]
│   │   │   └── 内部模块：导出所有配置相关类型
│   │   ├── base.ts [新增文件]
│   │   │   ├── 内部模块：ConfigField（配置字段基类）
│   │   │   ├── 内部模块：ConfigFieldType（字段类型枚举）
│   │   │   ├── 内部模块：ConfigSection（配置区块）
│   │   │   └── 内部模块：ConfigSchema（配置模式）
│   │   ├── init.ts [新增文件]
│   │   │   ├── 内部模块：InitConfigSchema（初始化配置）
│   │   │   └── 内部模块：InitConfigValues（初始化值）
│   │   └── live.ts [新增文件]
│   │       ├── 内部模块：LiveConfigSchema（实时配置）
│   │       └── 内部模块：LiveConfigValues（实时值）
│   │
│   └── index.ts [修改内容]
│       └── 内部模块：导出 Data、Layout、Config 和 Core 类型
│
├── Service/starChart/
│   ├── Engine/
│   │   ├── ConfigManager/ [新增模块]
│   │   │   ├── ConfigManager.ts [新增文件]
│   │   │   │   ├── 内部模块：管理 InitConfig 和 LiveConfig
│   │   │   │   ├── 内部模块：配置变更监听和通知
│   │   │   │   ├── 内部模块：配置验证
│   │   │   │   └── 内部模块：配置持久化接口
│   │   │   └── index.ts [新增文件]
│   │   │
│   │   ├── EngineCore.ts [修改内容]
│   │   │   └── 内部模块：集成 ConfigManager
│   │   │
│   │   ├── Adapters/ [新增目录] - 通用适配器
│   │   │   ├── DataAdapter/ [新增目录]
│   │   │   │   ├── DataAdapter.ts [新增文件]
│   │   │   │   │   ├── 内部模块：BaseDataAdapter 抽象类
│   │   │   │   │   ├── 内部模块：transform() 方法（缓存机制）
│   │   │   │   │   ├── 内部模块：validate() 验证方法
│   │   │   │   │   └── 内部模块：确保转换只发生一次
│   │   │   │   ├── RecipeDataAdapter.ts [新增文件]
│   │   │   │   │   └── 内部模块：MC 配方数据适配器实现
│   │   │   │   └── index.ts [新增文件]
│   │   │   │
│   │   │   ├── LayoutAdapter/ [新增目录]
│   │   │   │   ├── ILayoutTransformer.ts [新增文件]
│   │   │   │   │   ├── 内部模块：ILayoutTransformer 接口
│   │   │   │   │   └── 内部模块：BaseLayoutTransformer 抽象类
│   │   │   │   ├── LayoutAdapter.ts [新增文件]
│   │   │   │   │   ├── 内部模块：支持注册自定义 transformer
│   │   │   │   │   ├── 内部模块：adaptForLayout() 按优先级应用转换
│   │   │   │   │   └── 内部模块：registerTransformer() 方法
│   │   │   │   ├── transformers/ [新增目录]
│   │   │   │   │   ├── DirectedToUndirected.ts [新增文件]
│   │   │   │   │   ├── AddWeights.ts [新增文件]
│   │   │   │   │   ├── FilterIsolated.ts [新增文件]
│   │   │   │   │   └── index.ts [新增文件]
│   │   │   │   └── index.ts [新增文件]
│   │   │   │
│   │   │   └── index.ts [新增文件]
│   │   │
│   │   ├── Layouts/ [新增目录] - 通用布局算法
│   │   │   ├── BaseLayout.ts [新增文件]
│   │   │   │   ├── 内部模块：布局抽象基类
│   │   │   │   ├── 内部模块：getRequirements() 返回布局需求
│   │   │   │   └── 内部模块：compute() 计算布局
│   │   │   ├── LayoutRegistry.ts [新增文件]
│   │   │   │   ├── 内部模块：布局算法注册表
│   │   │   │   └── 内部模块：registerLayout() 方法
│   │   │   ├── ForceAtlas2Layout.ts [新增文件]
│   │   │   │   ├── 内部模块：力导向布局封装
│   │   │   │   └── 内部模块：导入 graphology-layout-forceatlas2
│   │   │   ├── CircularLayout.ts [新增文件]
│   │   │   │   └── 内部模块：环形布局封装
│   │   │   ├── NoverlapLayout.ts [新增文件]
│   │   │   │   └── 内部模块：防重叠布局封装
│   │   │   └── index.ts [新增文件]
│   │   │
│   │   ├── Graphs/
│   │   │   ├── GraphRegistry.ts [新增文件]
│   │   │   │   ├── 内部模块：全局图注册表
│   │   │   │   ├── 内部模块：registerGraph() 方法
│   │   │   │   ├── 内部模块：getRegisteredGraphs() 方法
│   │   │   │   └── 内部模块：getGraphMetadata() 方法
│   │   │   │
│   │   │   ├── BaseGraph.ts [修改内容]
│   │   │   │   ├── 内部模块：新增 getMetadata() 抽象方法
│   │   │   │   ├── 内部模块：新增 getInitConfigSchema() 抽象方法
│   │   │   │   ├── 内部模块：新增 getLiveConfigSchema() 抽象方法
│   │   │   │   ├── 内部模块：新增 getDataSources() 抽象方法
│   │   │   │   ├── 内部模块：新增 onConfigChange() 钩子
│   │   │   │   ├── 内部模块：新增 getPrivateLayoutAdapters() 方法
│   │   │   │   └── 内部模块：新增 createLayoutAdapter() 方法
│   │   │   │
│   │   │   ├── RecipeGraph/
│   │   │   │   ├── RecipeGraph.ts [修改内容]
│   │   │   │   │   ├── 内部模块：实现 getMetadata()
│   │   │   │   │   ├── 内部模块：实现 getInitConfigSchema()
│   │   │   │   │   ├── 内部模块：实现 getLiveConfigSchema()
│   │   │   │   │   ├── 内部模块：实现 getDataSources()
│   │   │   │   │   ├── 内部模块：实现 onConfigChange()
│   │   │   │   │   ├── 内部模块：使用 Mock 数据或 DataAdapter
│   │   │   │   │   ├── 内部模块：注册私有布局和适配器
│   │   │   │   │   └── 内部模块：切换布局算法
│   │   │   │   │
│   │   │   │   ├── Data/ [保留目录]
│   │   │   │   │   ├── mockData.ts [新增文件]
│   │   │   │   │   │   ├── 内部模块：createMockRecipeData() 函数
│   │   │   │   │   │   └── 内部模块：createLargeMockRecipeData() 用于性能测试
│   │   │   │   │   ├── RecipeRawData.ts [新增文件]
│   │   │   │   │   │   └── 内部模块：MC 配方原始数据格式定义
│   │   │   │   │   ├── McRecipeDataSource.ts [新增文件]
│   │   │   │   │   │   ├── 内部模块：实现 DataSource 接口
│   │   │   │   │   │   ├── 内部模块：loadChunk() 方法
│   │   │   │   │   │   └── 内部模块：getDescriptor() 方法
│   │   │   │   │   └── index.ts [新增文件]
│   │   │   │   │
│   │   │   │   ├── Layouts/ [新增目录] - 私有布局
│   │   │   │   │   ├── CustomArcLayout.ts [新增文件]
│   │   │   │   │   │   ├── 内部模块：继承 BaseLayout
│   │   │   │   │   │   └── 内部模块：弧形布局算法实现
│   │   │   │   │   ├── HexagonalLayout.ts [新增文件]
│   │   │   │   │   │   └── 内部模块：六边形分区布局
│   │   │   │   │   └── index.ts [新增文件]
│   │   │   │   │
│   │   │   │   ├── Adapters/ [新增目录] - 私有适配器
│   │   │   │   │   ├── ArcLayoutAdapter.ts [新增文件]
│   │   │   │   │   │   ├── 内部模块：实现 ILayoutTransformer
│   │   │   │   │   │   ├── 内部模块：为弧形布局准备数据
│   │   │   │   │   │   └── 内部模块：标记父子节点关系
│   │   │   │   │   ├── HexLayoutAdapter.ts [新增文件]
│   │   │   │   │   │   ├── 内部模块：实现 ILayoutTransformer
│   │   │   │   │   │   └── 内部模块：六边形布局数据适配
│   │   │   │   │   └── index.ts [新增文件]
│   │   │   │   │
│   │   │   │   ├── config/ [新增目录]
│   │   │   │   │   ├── initConfig.ts [新增文件]
│   │   │   │   │   │   └── 内部模块：定义 RecipeGraph 的初始化配置
│   │   │   │   │   ├── liveConfig.ts [新增文件]
│   │   │   │   │   │   └── 内部模块：定义 RecipeGraph 的实时配置
│   │   │   │   │   └── index.ts [新增文件]
│   │   │   │   │
│   │   │   │   └── index.ts [修改内容]
│   │   │   │       └── 内部模块：导出配置、布局、适配器
│   │   │   │
│   │   │   ├── DataSourceRegistry.ts [新增文件]
│   │   │   │   ├── 内部模块：数据源注册表
│   │   │   │   ├── 内部模块：registerDataSource() 方法
│   │   │   │   └── 内部模块：getDataSourcesByGraph() 方法
│   │   │   │
│   │   │   ├── BaseDataSource.ts [新增文件]
│   │   │   │   ├── 内部模块：DataSource 抽象基类
│   │   │   │   ├── 内部模块：getDescriptor() 抽象方法
│   │   │   │   └── 内部模块：loadChunk() 抽象方法
│   │   │   │
│   │   │   └── index.ts [修改内容]
│   │   │       └── 内部模块：导出 GraphRegistry、DataSourceRegistry
│   │   │
│   │   └── index.ts [修改内容]
│   │       └── 内部模块：导出所有 Service 模块
│   │
│   ├── DataSource/ [新增目录]
│   │   ├── DataSourceRegistry.ts [新增文件]
│   │   │   ├── 内部模块：数据源注册表
│   │   │   ├── 内部模块：registerDataSource() 方法
│   │   │   └── 内部模块：getDataSourcesByGraph() 方法
│   │   ├── BaseDataSource.ts [新增文件]
│   │   │   ├── 内部模块：DataSource 抽象基类
│   │   │   ├── 内部模块：getDescriptor() 抽象方法
│   │   │   └── 内部模块：loadChunk() 抽象方法
│   │   └── index.ts [新增文件]
│   │
│   └── index.ts [修改内容]
│       └── 内部模块：导出 DataSource、GraphRegistry
│
├── stores/projectPage/starChart/ [新增目录]
│   ├── starChart.store.ts [新增文件]
│   │   ├── 内部模块：当前选中的图类型
│   │   ├── 内部模块：当前选中的数据源
│   │   ├── 内部模块：初始化配置状态
│   │   ├── 内部模块：实时配置状态
│   │   ├── 内部模块：初始化进度状态
│   │   └── 内部模块：图实例管理
│   ├── types.ts [新增文件]
│   │   ├── 内部模块：StarChartState（Store 状态类型）
│   │   └── 内部模块：StarChartActions（Store 操作类型）
│   └── index.ts [新增文件]
│
└── GUI/components/ProjectPage.Shell/Navbar.content/NovelAgent/
    ├── components/ [新增目录]
    │   ├── base/ [新增目录]
    │   │   ├── BaseSlider.vue [新增文件]
    │   │   │   └── 内部模块：通用滑动条组件
    │   │   ├── BaseSwitch.vue [新增文件]
    │   │   │   └── 内部模块：通用开关组件
    │   │   ├── BaseSelect.vue [新增文件]
    │   │   │   └── 内部模块：通用下拉选择组件
    │   │   ├── BaseInput.vue [新增文件]
    │   │   │   └── 内部模块：通用输入框组件
    │   │   ├── BaseNumberInput.vue [新增文件]
    │   │   │   └── 内部模块：通用数字输入框组件
    │   │   └── index.ts [新增文件]
    │   │
    │   ├── ConfigField.vue [新增文件]
    │   │   ├── 内部模块：根据 ConfigFieldType 动态渲染组件
    │   │   └── 内部模块：双向绑定配置值
    │   │
    │   ├── ConfigSection.vue [新增文件]
    │   │   └── 内部模块：渲染配置区块（包含多个字段）
    │   │
    │   ├── GraphSelector.vue [新增文件]
    │   │   ├── 内部模块：从 GraphRegistry 获取可用图
    │   │   ├── 内部模块：显示图的 metadata（名称、描述）
    │   │   └── 内部模块：选中图时触发事件
    │   │
    │   ├── DataSourceSelector.vue [新增文件]
    │   │   ├── 内部模块：根据选中的图获取可用数据源
    │   │   ├── 内部模块：显示数据源描述
    │   │   └── 内部模块：选中数据源时触发事件
    │   │
    │   └── index.ts [新增文件]
    │
    ├── ConfigInitPanel.vue [完全重写]
    │   ├── 内部模块：使用 GraphSelector 组件
    │   ├── 内部模块：使用 DataSourceSelector 组件
    │   ├── 内部模块：动态渲染图的 InitConfigSchema
    │   └── 内部模块：绑定 starChartStore
    │
    ├── ConfigLivePanel.vue [完全重写]
    │   ├── 内部模块：动态渲染图的 LiveConfigSchema
    │   ├── 内部模块：实时更新图配置
    │   └── 内部模块：绑定 starChartStore
    │
    ├── ConsolePanel.vue [修改内容]
    │   ├── 内部模块：修改 handleCreate 逻辑
    │   ├── 内部模块：从 starChartStore 读取配置
    │   ├── 内部模块：创建图实例时传入配置
    │   └── 内部模块：监听初始化进度
    │
    ├── ProgressPanel.vue [修改内容]
    │   ├── 内部模块：从 starChartStore 读取进度状态
    │   ├── 内部模块：显示初始化进度（加载数据、计算布局等）
    │   └── 内部模块：支持取消操作
    │
    └── index.ts [新增文件]

Nimbria/Client/GUI/components/ProjectPage.MainPanel/StarChart/
├── StarChartPanel.vue [修改内容]
│   ├── 内部模块：接收 graphType 和 dataSourceId 作为 props
│   ├── 内部模块：根据配置创建图实例
│   └── 内部模块：监听配置变更
│
└── VisualizationArea.vue [修改内容]
    └── 内部模块：接收图实例，管理渲染容器
```

---

## 🔄 数据适配层设计

### 核心原则

```
RawData → DataAdapter（🔒 缓存 + 一次性转换）→ NormalizedGraphData
                                                      ↓
                                        LayoutAdapter（🔓 可多次转换）
                                                      ↓
                                        LayoutTransformer Chain
                                                      ↓
                                        Layout Algorithm
```

### 三层转换机制

#### 1️⃣ **DataAdapter 层**（数据源 → 标准化数据）

**职责：**
- 将原始数据源格式转换为统一的 NormalizedGraphData
- 缓存转换结果
- 防止重复转换（isTransformed 标志）

**特点：**
- 只发生一次
- RecipeDataAdapter：MC 配方 JSON → 标准化图数据
- 支持验证和错误处理

**Mock 开发时的处理：**
```typescript
// 跳过 RawData 和 DataAdapter，直接定义 NormalizedGraphData
const mockData = createMockRecipeData()  // 返回 NormalizedGraphData
this.normalizedData = mockData
```

#### 2️⃣ **LayoutAdapter 层**（标准化数据 → 布局数据）

**职责：**
- 根据布局算法的需求调整图结构
- 管理转换器链（Transformer Chain）
- 支持公共和私有转换器

**转换器类型：**
- **公共转换器**（所有图都可用）：DirectedToUndirected、AddWeights、FilterIsolated
- **私有转换器**（图特定）：ArcLayoutAdapter、HexLayoutAdapter

**特点：**
- 可多次发生（切换布局时重新适配）
- 按优先级执行转换器链
- 支持条件判断（shouldApply）

#### 3️⃣ **Layout 层**（布局数据 → 位置数据）

**职责：**
- 声明数据格式需求（LayoutRequirement）
- 计算节点和边的位置

**需求声明示例：**
```typescript
// ForceAtlas2 需要无向图 + 权重
getRequirements(): LayoutRequirement {
  return {
    name: 'ForceAtlas2',
    requiredFormat: GraphDataFormat.UNDIRECTED,
    requiresWeights: true,
    requiresNodeSizes: false,
    supportsIsolatedNodes: true
  }
}

// CustomArc 需要有向图 + 节点层级
getRequirements(): LayoutRequirement {
  return {
    name: 'CustomArc',
    requiredFormat: GraphDataFormat.DIRECTED,
    requiresWeights: false,
    customRequirements: { nodeLevel: true }
  }
}
```

### 私有适配器注册流程

```typescript
// RecipeGraph 内部：注册私有适配器
getPrivateLayoutAdapters(): ILayoutTransformer[] {
  return [
    new ArcLayoutAdapter(),      // 优先级 50
    new HexLayoutAdapter()       // 优先级 50
  ]
}

// LayoutAdapter 初始化：
const adapter = new LayoutAdapter()
adapter.registerTransformers(graph.getPrivateLayoutAdapters())
```

---

## 🎯 核心设计思路

### 1. **配置系统架构**

```typescript
// 配置字段类型枚举
enum ConfigFieldType {
  SLIDER = 'slider',        // 滑动条
  SWITCH = 'switch',        // 开关
  SELECT = 'select',        // 下拉选择
  INPUT = 'input',          // 文本输入
  NUMBER = 'number',        // 数字输入
  COLOR = 'color',          // 颜色选择
  MULTI_SELECT = 'multi_select' // 多选
}

// 配置字段定义
interface ConfigField {
  key: string                  // 配置项的键
  label: string                // 显示标签
  type: ConfigFieldType        // 字段类型
  defaultValue: any            // 默认值
  options?: {                  // 类型特定的选项
    min?: number               // slider/number 最小值
    max?: number               // slider/number 最大值
    step?: number              // slider/number 步长
    choices?: Array<{          // select 选项
      label: string
      value: any
    }>
    placeholder?: string       // input 占位符
  }
  validator?: (value: any) => boolean  // 验证函数
  description?: string         // 描述文字
}

// 配置区块
interface ConfigSection {
  title: string
  fields: ConfigField[]
  collapsible?: boolean        // 是否可折叠
  defaultExpanded?: boolean    // 默认展开
}

// 配置模式（Schema）
interface ConfigSchema {
  sections: ConfigSection[]
}
```

### 2. **图注册机制**

```typescript
// 图元数据
interface GraphMetadata {
  id: string                   // 图的唯一标识
  name: string                 // 显示名称
  description: string          // 描述
  icon?: string                // 图标（可选）
  version: string              // 版本
  author?: string              // 作者
}

// 数据源描述符
interface DataSourceDescriptor {
  id: string                   // 数据源ID
  name: string                 // 显示名称
  description: string          // 描述
  graphId: string              // 所属图ID
  configFields?: ConfigField[] // 数据源特定配置
}

// 图注册表
class GraphRegistry {
  private static graphs = new Map<string, GraphClass>()
  
  static register(graphClass: GraphClass) {
    const metadata = graphClass.getMetadata()
    this.graphs.set(metadata.id, graphClass)
  }
  
  static getAll(): GraphMetadata[] {
    return Array.from(this.graphs.values())
      .map(g => g.getMetadata())
  }
  
  static getById(id: string): GraphClass | undefined {
    return this.graphs.get(id)
  }
}
```

### 3. **BaseGraph 扩展**

```typescript
abstract class BaseGraph {
  // 现有方法...
  
  // 新增抽象方法
  abstract getMetadata(): GraphMetadata
  abstract getInitConfigSchema(): ConfigSchema
  abstract getLiveConfigSchema(): ConfigSchema
  abstract getDataSources(): DataSourceDescriptor[]
  
  // 配置变更钩子
  onConfigChange(type: 'init' | 'live', key: string, value: any) {
    // 子类可以重写
  }
}
```

### 4. **单一事实来源（Store）**

```typescript
// starChart.store.ts
export const useStarChartStore = defineStore('starChart', {
  state: (): StarChartState => ({
    // 图选择
    selectedGraphId: null,
    selectedDataSourceId: null,
    
    // 配置
    initConfig: {},           // 初始化配置值
    liveConfig: {},           // 实时配置值
    
    // 初始化状态
    initProgress: {
      status: 'idle',         // idle | loading | success | error
      progress: 0,            // 0-100
      message: '',
      cancelable: true
    },
    
    // 图实例
    graphInstance: null
  }),
  
  actions: {
    selectGraph(graphId: string) {
      this.selectedGraphId = graphId
      this.selectedDataSourceId = null
      this.initConfig = {}
      this.loadDefaultInitConfig()
    },
    
    selectDataSource(dataSourceId: string) {
      this.selectedDataSourceId = dataSourceId
    },
    
    updateInitConfig(key: string, value: any) {
      this.initConfig[key] = value
    },
    
    updateLiveConfig(key: string, value: any) {
      this.liveConfig[key] = value
      // 立即应用到图实例
      this.graphInstance?.onConfigChange('live', key, value)
    },
    
    async createGraphInstance() {
      if (!this.selectedGraphId || !this.selectedDataSourceId) {
        throw new Error('请先选择图和数据源')
      }
      
      const GraphClass = GraphRegistry.getById(this.selectedGraphId)
      if (!GraphClass) throw new Error('图未注册')
      
      this.initProgress.status = 'loading'
      this.initProgress.progress = 0
      
      try {
        // 创建引擎
        const engine = new EngineCore({...})
        await engine.initialize()
        
        this.initProgress.progress = 30
        
        // 创建图实例
        this.graphInstance = new GraphClass(
          engine.getAPI(),
          {
            initConfig: this.initConfig,
            liveConfig: this.liveConfig,
            dataSourceId: this.selectedDataSourceId
          }
        )
        
        await this.graphInstance.initialize()
        this.initProgress.progress = 60
        
        await this.graphInstance.load()
        this.initProgress.progress = 100
        
        this.initProgress.status = 'success'
      } catch (error) {
        this.initProgress.status = 'error'
        this.initProgress.message = error.message
        throw error
      }
    }
  }
})
```

---

## 🔧 关键代码示例

### 示例 1: RecipeGraph 配置定义

```typescript
// Nimbria/Client/Service/starChart/Graphs/RecipeGraph/config/initConfig.ts

import type { ConfigSchema, ConfigFieldType } from '@types/Business/StarChart/Config'

export const recipeGraphInitConfig: ConfigSchema = {
  sections: [
    {
      title: '基础配置',
      fields: [
        {
          key: 'graphType',
          label: '图类型',
          type: ConfigFieldType.SELECT,
          defaultValue: 'recipe',
          options: {
            choices: [
              { label: 'MC配方图', value: 'recipe' }
            ]
          },
          description: '选择要创建的图类型'
        },
        {
          key: 'dataSource',
          label: '数据源',
          type: ConfigFieldType.SELECT,
          defaultValue: '',
          options: {
            choices: [] // 动态填充
          },
          description: '选择数据源'
        }
      ]
    },
    {
      title: '布局配置',
      fields: [
        {
          key: 'layoutType',
          label: '布局算法',
          type: ConfigFieldType.SELECT,
          defaultValue: 'arc',
          options: {
            choices: [
              { label: '弧形布局', value: 'arc' },
              { label: '力导向布局', value: 'force' },
              { label: '分层布局', value: 'hierarchical' }
            ]
          }
        },
        {
          key: 'nodeSpacing',
          label: '节点间距',
          type: ConfigFieldType.SLIDER,
          defaultValue: 100,
          options: {
            min: 50,
            max: 500,
            step: 10
          }
        }
      ]
    },
    {
      title: '六边形分区',
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: 'enableHexGrid',
          label: '启用六边形分区',
          type: ConfigFieldType.SWITCH,
          defaultValue: false
        },
        {
          key: 'hexRadius',
          label: '六边形半径',
          type: ConfigFieldType: NUMBER,
          defaultValue: 1000,
          options: {
            min: 500,
            max: 5000,
            step: 100
          }
        }
      ]
    }
  ]
}

// liveConfig.ts
export const recipeGraphLiveConfig: ConfigSchema = {
  sections: [
    {
      title: '视图控制',
      fields: [
        {
          key: 'zoom',
          label: '缩放',
          type: ConfigFieldType.SLIDER,
          defaultValue: 1,
          options: { min: 0.1, max: 5, step: 0.1 }
        },
        {
          key: 'opacity',
          label: '不透明度',
          type: ConfigFieldType.SLIDER,
          defaultValue: 1,
          options: { min: 0, max: 1, step: 0.1 }
        },
        {
          key: 'showLabels',
          label: '显示标签',
          type: ConfigFieldType.SWITCH,
          defaultValue: true
        },
        {
          key: 'enableAnimation',
          label: '启用动画',
          type: ConfigFieldType.SWITCH,
          defaultValue: true
        }
      ]
    },
    {
      title: '节点样式',
      fields: [
        {
          key: 'nodeSize',
          label: '节点大小',
          type: ConfigFieldType.SLIDER,
          defaultValue: 15,
          options: { min: 5, max: 50, step: 1 }
        },
        {
          key: 'highlightColor',
          label: '高亮颜色',
          type: ConfigFieldType.COLOR,
          defaultValue: '#FF0000'
        }
      ]
    }
  ]
}
```

### 示例 2: RecipeGraph 实现

```typescript
// Nimbria/Client/Service/starChart/Graphs/RecipeGraph/RecipeGraph.ts

import { BaseGraph } from '../BaseGraph'
import type { GraphMetadata, ConfigSchema, DataSourceDescriptor } from '@types/Business/StarChart'
import { recipeGraphInitConfig } from './config/initConfig'
import { recipeGraphLiveConfig } from './config/liveConfig'
import type { StarChartEngineAPI } from '@types/Business/StarChart/Core'
import type { Camera } from 'sigma'

export class RecipeGraph extends BaseGraph {
  private camera: Camera | null = null
  
  getMetadata(): GraphMetadata {
    return {
      id: 'recipe-graph',
      name: 'MC配方图',
      description: '展示Minecraft配方关系的30000+节点大规模图',
      icon: '🔧',
      version: '1.0.0',
      author: 'Nimbria Team'
    }
  }
  
  getInitConfigSchema(): ConfigSchema {
    return recipeGraphInitConfig
  }
  
  getLiveConfigSchema(): ConfigSchema {
    return recipeGraphLiveConfig
  }
  
  getDataSources(): DataSourceDescriptor[] {
    return [
      {
        id: 'mc-recipe-local',
        name: 'MC配方数据（本地）',
        description: '从本地JSON文件加载MC配方数据',
        graphId: 'recipe-graph'
      },
      {
        id: 'mc-recipe-api',
        name: 'MC配方数据（API）',
        description: '从远程API加载MC配方数据',
        graphId: 'recipe-graph'
      }
    ]
  }
  
  async initialize(): Promise<void> {
    await super.initialize()
    
    // 获取 Sigma Camera
    this.camera = this.engine.sigmaManager.getCamera()
    
    // 设置 NodeReducer（动态样式）
    this.setupNodeReducer()
    
    // 绑定事件
    this.bindEvents()
  }
  
  onConfigChange(type: 'init' | 'live', key: string, value: any) {
    if (type === 'live') {
      switch (key) {
        case 'zoom':
          this.camera?.animatedZoom({ duration: 300 })
          this.engine.viewportManager.setZoom(value)
          break
          
        case 'opacity':
          this.updateOpacity(value)
          break
          
        case 'showLabels':
          this.toggleLabels(value)
          break
          
        case 'nodeSize':
          this.updateNodeSize(value)
          break
          
        // ... 其他配置项
      }
    }
  }
  
  private setupNodeReducer() {
    this.engine.sigmaManager.setNodeReducer((nodeId, data) => {
      const config = this.config.liveConfig
      
      return {
        ...data,
        size: data.size * (config.nodeSize / 15), // 归一化
        hidden: data.hidden || !config.showLabels && data.type === 'label'
      }
    })
  }
  
  private updateOpacity(opacity: number) {
    this.engine.sigmaManager.setNodeReducer((nodeId, data) => ({
      ...data,
      color: this.applyOpacity(data.color, opacity)
    }))
    this.engine.sigmaManager.refresh()
  }
  
  private applyOpacity(color: string, opacity: number): string {
    // 实现颜色透明度转换
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0')
    return `${color}${alpha}`
  }
}

// 注册图
GraphRegistry.register(RecipeGraph)
```

### 示例 3: ConfigInitPanel 重写

```vue
<!-- Nimbria/Client/GUI/components/ProjectPage.Shell/Navbar.content/NovelAgent/ConfigInitPanel.vue -->

<template>
  <div class="config-init-panel">
    <div class="card">
      <div class="card-title">
        <span>视图配置（初始化）</span>
      </div>
      
      <div class="card-content">
        <!-- 图选择器（固定第一项） -->
        <div class="config-item">
          <span class="config-label">选择图</span>
          <GraphSelector 
            :model-value="store.selectedGraphId"
            @update:model-value="handleGraphSelect"
          />
        </div>
        
        <!-- 数据源选择器（固定第二项） -->
        <div v-if="store.selectedGraphId" class="config-item">
          <span class="config-label">数据源</span>
          <DataSourceSelector
            :graph-id="store.selectedGraphId"
            :model-value="store.selectedDataSourceId"
            @update:model-value="handleDataSourceSelect"
          />
        </div>
        
        <!-- 动态配置项 -->
        <template v-if="initConfigSchema">
          <ConfigSection
            v-for="section in initConfigSchema.sections"
            :key="section.title"
            :section="section"
            :values="store.initConfig"
            @update:value="handleConfigUpdate"
          />
        </template>
        
        <div v-else class="placeholder-text">
          请先选择图类型
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStarChartStore } from '@stores/projectPage/starChart'
import { GraphRegistry } from '@service/starChart'
import GraphSelector from './components/GraphSelector.vue'
import DataSourceSelector from './components/DataSourceSelector.vue'
import ConfigSection from './components/ConfigSection.vue'
import type { ConfigSchema } from '@types/Business/StarChart/Config'

const store = useStarChartStore()

const initConfigSchema = computed<ConfigSchema | null>(() => {
  if (!store.selectedGraphId) return null
  
  const GraphClass = GraphRegistry.getById(store.selectedGraphId)
  return GraphClass?.getInitConfigSchema() ?? null
})

const handleGraphSelect = (graphId: string) => {
  store.selectGraph(graphId)
}

const handleDataSourceSelect = (dataSourceId: string) => {
  store.selectDataSource(dataSourceId)
}

const handleConfigUpdate = (key: string, value: any) => {
  store.updateInitConfig(key, value)
}
</script>

<style scoped>
/* 样式保持不变 */
</style>
```

### 示例 4: GraphSelector 组件

```vue
<!-- components/GraphSelector.vue -->

<template>
  <BaseSelect
    :model-value="modelValue"
    :options="graphOptions"
    placeholder="选择图类型"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #option="{ option }">
      <div class="graph-option">
        <span v-if="option.icon" class="graph-icon">{{ option.icon }}</span>
        <div class="graph-info">
          <div class="graph-name">{{ option.label }}</div>
          <div class="graph-desc">{{ option.description }}</div>
        </div>
      </div>
    </template>
  </BaseSelect>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GraphRegistry } from '@service/starChart'
import BaseSelect from './base/BaseSelect.vue'
import type { GraphMetadata } from '@types/Business/StarChart/Core'

interface Props {
  modelValue?: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const graphOptions = computed(() => {
  const graphs = GraphRegistry.getAll()
  
  return graphs.map((meta: GraphMetadata) => ({
    value: meta.id,
    label: meta.name,
    description: meta.description,
    icon: meta.icon
  }))
})
</script>

<style scoped>
.graph-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.graph-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.graph-info {
  flex: 1;
  min-width: 0;
}

.graph-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--obsidian-text-primary);
}

.graph-desc {
  font-size: 10px;
  color: var(--obsidian-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
```

---

## 📋 类型定义（关键部分）

```typescript
// Nimbria/Client/types/Business/StarChart/Config/base.ts

import type { Sigma } from 'sigma'
import type { Camera } from 'sigma/types'

export enum ConfigFieldType {
  SLIDER = 'slider',
  SWITCH = 'switch',
  SELECT = 'select',
  INPUT = 'input',
  NUMBER = 'number',
  COLOR = 'color',
  MULTI_SELECT = 'multi_select'
}

export interface ConfigFieldOption {
  min?: number
  max?: number
  step?: number
  choices?: Array<{
    label: string
    value: any
    description?: string
    icon?: string
  }>
  placeholder?: string
  disabled?: boolean
}

export interface ConfigField {
  key: string
  label: string
  type: ConfigFieldType
  defaultValue: any
  options?: ConfigFieldOption
  validator?: (value: any) => boolean | string
  description?: string
  tooltip?: string
  visible?: (config: Record<string, any>) => boolean  // 条件显示
}

export interface ConfigSection {
  title: string
  fields: ConfigField[]
  collapsible?: boolean
  defaultExpanded?: boolean
  icon?: string
}

export interface ConfigSchema {
  sections: ConfigSection[]
}

export interface InitConfigValues extends Record<string, any> {
  graphType?: string
  dataSourceId?: string
}

export interface LiveConfigValues extends Record<string, any> {
  zoom?: number
  opacity?: number
  showLabels?: boolean
  enableAnimation?: boolean
}
```

---

## ✅ 实现步骤建议

### 🔸 第一阶段：类型系统
- 创建 `Data` 类型目录
  - `public.ts`：RawGraphData、NormalizedGraphData、LayoutInputData、GraphDataFormat
  - `adapter.ts`：LayoutRequirement、DataAdapterConfig、AdapterResult
- 创建 `Layout` 类型目录
  - `public.ts`：LayoutAlgorithm、LayoutConfig 及各算法的配置类型
  - `requirements.ts`：布局需求定义
- 创建 `Config` 类型目录
  - `base.ts`：ConfigField、ConfigFieldType、ConfigSchema
  - `init.ts`、`live.ts`：初始化和实时配置类型
- 更新 `index.ts` 统一导出

### 🔸 第二阶段：数据适配层
- 实现 `Adapters/DataAdapter/`
  - `DataAdapter.ts`：BaseDataAdapter 抽象类（缓存机制、一次性转换）
  - `RecipeDataAdapter.ts`：MC 配方数据适配器
- 实现 `Adapters/LayoutAdapter/`
  - `ILayoutTransformer.ts`：转换器接口
  - `LayoutAdapter.ts`：支持注册自定义转换器
  - `transformers/`：通用转换器（DirectedToUndirected、AddWeights 等）

### 🔸 第三阶段：布局系统
- 实现 `Layouts/` 通用布局
  - `BaseLayout.ts`：抽象基类
  - `LayoutRegistry.ts`：布局注册表
  - `ForceAtlas2Layout.ts`、`CircularLayout.ts`、`NoverlapLayout.ts`
- RecipeGraph 私有布局
  - `Graphs/RecipeGraph/Layouts/`：CustomArcLayout、HexagonalLayout
  - `Graphs/RecipeGraph/Adapters/`：ArcLayoutAdapter、HexLayoutAdapter

### 🔸 第四阶段：数据源系统
- 实现 `Graphs/BaseDataSource.ts`
- 实现 `Graphs/DataSourceRegistry.ts`
- RecipeGraph 数据源
  - `Graphs/RecipeGraph/Data/mockData.ts`：Mock 数据（跳过适配层）
  - `Graphs/RecipeGraph/Data/RecipeDataSource.ts`：数据源实现

### 🔸 第五阶段：图注册和配置
- 实现 `Graphs/GraphRegistry.ts`
- 扩展 `Graphs/BaseGraph.ts`
  - 新增抽象方法：getMetadata、getInitConfigSchema、getLiveConfigSchema、getDataSources
  - 新增方法：getPrivateLayoutAdapters、createLayoutAdapter
- 实现 RecipeGraph
  - `config/initConfig.ts`、`config/liveConfig.ts`
  - 实现所有抽象方法
  - 注册私有布局和适配器

### 🔸 第六阶段：状态管理
- 创建 `stores/projectPage/starChart/`
  - `types.ts`：StarChartState 类型定义
  - `starChart.store.ts`：Pinia 状态管理
    - 状态：selectedGraphId、selectedDataSourceId、initConfig、liveConfig、initProgress、graphInstance
    - 操作：selectGraph、selectDataSource、updateInitConfig、updateLiveConfig、createGraphInstance

### 🔸 第七阶段：基础 UI 组件
- 实现 `GUI/components/NovelAgent/components/base/`
  - BaseSlider.vue、BaseSwitch.vue、BaseSelect.vue、BaseInput.vue、BaseNumberInput.vue
- 实现通用配置渲染
  - `ConfigField.vue`：动态渲染字段
  - `ConfigSection.vue`：渲染配置区块

### 🔸 第八阶段：图选择和数据源选择
- 实现 `GraphSelector.vue`：从 GraphRegistry 获取可用图
- 实现 `DataSourceSelector.vue`：根据选中图获取可用数据源

### 🔸 第九阶段：面板集成
- 重写 `ConfigInitPanel.vue`
  - 第一行：图选择器
  - 第二行：数据源选择器
  - 动态渲染 InitConfigSchema
- 重写 `ConfigLivePanel.vue`
  - 动态渲染 LiveConfigSchema
  - 实时更新图配置
- 修改 `ConsolePanel.vue`
  - 从 starChartStore 读取配置
  - 创建图实例
- 修改 `ProgressPanel.vue`
  - 显示初始化进度

### 🔸 第十阶段：标签页集成
- 修改 `StarChartPanel.vue`：接收图实例、管理配置
- 修改 `VisualizationArea.vue`：渲染容器管理

---

## 📋 开发模式对比表

| 维度 | Mock 开发模式 | 生产数据模式 |
|------|------------|-----------|
| **数据来源** | `mockData.ts` | API / 数据库 / 文件 |
| **第一步** | 直接定义 NormalizedGraphData | 加载 RawData |
| **第二步** | 跳过 DataAdapter | DataAdapter 转换（缓存一次） |
| **第三步** | LayoutAdapter 转换 | LayoutAdapter 转换 |
| **第四步** | Layout 计算位置 | Layout 计算位置 |
| **优势** | 快速开发、调试性强 | 支持多数据源、实际生产可用 |
| **迁移成本** | 低（只需添加 DataAdapter） | — |

---

## 📊 数据流总结

```
【Mock 开发流程】
mockData.ts → NormalizedGraphData
    ↓
LayoutAdapter（应用私有适配器）
    ↓
Layout 计算位置
    ↓
Graphology → Sigma 渲染

【生产数据流程】
RawData → DataAdapter（缓存、一次性转换）
    ↓
NormalizedGraphData
    ↓
LayoutAdapter（应用公共/私有适配器）
    ↓
Layout 计算位置
    ↓
Graphology → Sigma 渲染

【配置流程】
ConfigInitPanel（图 + 数据源 + 初始配置）
    ↓
starChartStore（单一事实来源）
    ↓
createGraphInstance → RecipeGraph.load()
    ↓
ConfigLivePanel（实时配置）
    ↓
RecipeGraph.onConfigChange() 应用配置
```

---

## 🎯 关键设计要点

### ✅ 数据适配层
- **一次性转换**：RawData → NormalizedGraphData 只发生一次（缓存机制）
- **多次适配**：NormalizedGraphData → LayoutData 可根据布局需求多次适配

### ✅ 布局系统
- **公共布局**：ForceAtlas2、Circular 等放在 `Layouts/`
- **私有布局**：图特定的 Arc、Hexagonal 放在 `Graphs/RecipeGraph/Layouts/`
- **私有适配器**：图可注册自己的 transformer（ArcLayoutAdapter、HexLayoutAdapter）

### ✅ 单一事实来源
- **starChartStore**：管理所有状态（图选择、数据源、配置、进度、实例）
- **避免重复**：所有面板都从 Store 读写状态

### ✅ 类型安全
- 导入官方 graphology 类型（Graph、Attributes、NodeData 等）
- 导入官方 sigma 类型（Sigma、Camera、NodeDisplayData 等）
- 零 any 类型，strict 模式编译

---

## 🚀 快速开始（Mock 开发）

### 第1天：Mock 数据定义
```typescript
// Nimbria/Client/Service/starChart/Graphs/RecipeGraph/Data/mockData.ts
export function createMockRecipeData(): NormalizedGraphData {
  const nodes = new Map<string, NodeData>()
  // ... 定义节点
  return {
    nodes,
    edges,
    format: GraphDataFormat.DIRECTED,
    metadata: { ... }
  }
}
```

### 第2天：类型和注册
```typescript
// 1. 类型定义完成
// 2. 实现 RecipeGraph.getMetadata()
// 3. 实现 RecipeGraph.getInitConfigSchema()
// 4. 实现 RecipeGraph.getDataSources()
// 5. GraphRegistry.register(RecipeGraph)
```

### 第3天：加载和渲染
```typescript
// 1. 实现 RecipeGraph.load()
// 2. 使用 MockData
// 3. LayoutAdapter 转换
// 4. Layout 计算位置
// 5. Graphology → Sigma 渲染
```

### 第4天：配置和交互
```typescript
// 1. 实现 getInitConfigSchema()
// 2. 实现 getLiveConfigSchema()
// 3. 实现 onConfigChange()
// 4. 绑定事件和交互
```

---

## ❓ 常见问题

### Q: 什么时候使用 Mock 数据？
**A:** 开发初期，数据源还未准备好时。只需定义 mockData.ts，跳过 DataAdapter。

### Q: Mock 数据如何迁移到真实数据？
**A:** 
1. 创建 RecipeDataAdapter 继承 BaseDataAdapter
2. 在 load() 中调用 `const result = await this.dataAdapter.transform(rawData)`
3. 使用 `result.data` 作为 normalizedData

### Q: 如何添加新的布局算法？
**A:** 
1. 继承 BaseLayout
2. 实现 getRequirements() 声明数据需求
3. 实现 compute() 计算布局
4. 在 RecipeGraph 中切换使用

### Q: 如何实现私有布局适配器？
**A:**
```typescript
// 1. 继承 BaseLayoutTransformer
export class MyTransformer extends BaseLayoutTransformer {
  shouldApply(requirement: LayoutRequirement): boolean {
    return requirement.name === 'MyLayout'
  }
  async transform(graph: Graph, normalizedData) { ... }
}

// 2. 在 RecipeGraph 中注册
getPrivateLayoutAdapters(): ILayoutTransformer[] {
  return [new MyTransformer()]
}
```

### Q: 如何调试数据流转过程？
**A:**
```typescript
// 1. 检查 NormalizedGraphData 是否正确
console.log('nodes:', this.normalizedData.nodes.size)
console.log('edges:', this.normalizedData.edges.size)

// 2. 检查 LayoutAdapter 的转换
const layoutGraph = await this.layoutAdapter.adaptForLayout(...)
console.log('graph:', layoutGraph.order, layoutGraph.size)

// 3. 检查布局计算结果
const layoutResult = await this.layout.compute(layoutGraph)
console.log('positions:', layoutResult.positions.size)
```

---

**✨ Boss，系统完整设计已整合！现在可以开始实现了。**

