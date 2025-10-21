/**
 * StarChart 图数据可视化系统
 * 
 * 导出：
 * - Engine: 渲染引擎核心
 * - Graphs: 具体图实现
 * - Workers: Web Worker 模块
 */

// Engine 核心导出
export { EngineCore } from './Engine/EngineCore'
export type { StarChartConfig } from './Engine/ConfigManager/ConfigManager'
export type { ChunkLoaderFunction } from './Engine/DataManager/DataManager'

// Graphs 导出
export { BaseGraph, type GraphConfig } from './Graphs/BaseGraph'
export { RecipeGraph } from './Graphs/RecipeGraph/RecipeGraph'

// 所有类型从统一位置导出
export type {
  // Engine API
  StarChartEngineAPI,
  SigmaManagerAPI,
  DataManagerAPI,
  RenderSchedulerAPI,
  ViewportManagerAPI,
  SpatialIndexAPI,
  EventBusAPI,
  
  // 数据类型
  GraphData,
  NodeData,
  EdgeData,
  
  // Reducer
  NodeReducer,
  EdgeReducer,
  
  // 配置
  SigmaOptions,
  RefreshOptions,
  ChunkDescriptor,
  ViewportBounds
} from 'Business/StarChart'
