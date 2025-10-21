/**
 * StarChart 类型系统全局导出
 * 
 * 这里集中导出所有 StarChart 相关的类型，包括：
 * - Core: 核心服务类型（AsyncTaskManager、EventBus、RenderScheduler等）
 * - Plugin: 插件系统类型（插件接口、插件上下文等）
 * - Data: 数据域类型（数据验证、转换等）
 * - Renderer: 渲染域类型（样式、配置等）
 */

// ==================== Engine/Core 类型 ====================

export type {
  // Engine API
  StarChartEngineAPI,
  SigmaManagerAPI,
  SigmaOptions,
  RefreshOptions,
  NodeReducer,
  EdgeReducer,
  
  // Data Manager
  DataManagerAPI,
  ChunkDescriptor,
  ViewportBounds,
  
  // Async Task
  AsyncTaskManagerAPI,
  
  // Event Bus
  EventBusAPI,
  EventListener,
  
  // Render Scheduler
  RenderSchedulerAPI,
  
  // Viewport Manager
  ViewportManagerAPI,
  VisibleBoundsAPI,
  
  // Spatial Index
  SpatialIndexAPI,
  
  // 数据类型
  GraphData,
  NodeData,
  EdgeData,
  ViewportInfo,
  PathResult,
  DataTransformer,
  LayoutAlgorithm,
  LayoutOptions,
  
  // 内部类型
  SigmaManagerState,
  AsyncTask,
  TaskQueueState,
  WorkerPoolState,
  WorkerMessage,
  NodeUpdate,
  RenderState,
  ViewportState,
  VisibleBounds,
  TaskEvent,
  TaskListener,
  TaskConfig,
  LayoutResult,
  SpatialIndexResult
} from './Core'

// ==================== Plugin 类型 ====================

export type {
  // 基础接口
  PluginType,
  PluginDependency,
  PluginConfig,
  StarChartPlugin,
  // 插件上下文
  PluginContext,
  StarChartConfig,
  PluginUtils,
  // 具体插件
  DataAdapterPlugin,
  LayoutPlugin,
  Position,
  LODPlugin,
  InteractionPlugin,
  StarChartEvent,
  RendererPlugin,
  UtilityPlugin
} from './Plugin'

// ==================== Data 类型 ====================

export type {
  // 数据源
  DataSourceAPI,
  DataSourceInfo,
  // 验证
  DataValidator,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  // 转换
  DataTransformResult,
  TransformStats
} from './Data'

// ==================== Renderer 类型 ====================

export type {
  // 配置
  RenderConfig,
  // 样式
  NodeStyle,
  IconStyle,
  LabelStyle,
  BackgroundStyle,
  EdgeStyle,
  // 统计
  RenderStats,
  MemoryUsage
} from './Renderer'
