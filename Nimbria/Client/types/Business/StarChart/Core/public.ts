/**
 * Engine 对外接口类型
 * 严格类型定义，基于 Sigma.js 和 Graphology 官方类型
 */

import type { Sigma } from 'sigma'
import type Graph from 'graphology'
import type { Attributes } from 'graphology-types'
import type { Settings } from 'sigma/settings'
import type { NodeDisplayData, EdgeDisplayData, Camera } from 'sigma/types'
import type { LayoutResult, SpatialIndexResult, ViewportState } from './internal'

// ==================== Engine API 统一入口 ====================

export interface StarChartEngineAPI {
  readonly sigmaManager: SigmaManagerAPI
  readonly dataManager: DataManagerAPI
  readonly asyncTask: AsyncTaskManagerAPI
  readonly eventBus: EventBusAPI
  readonly renderScheduler: RenderSchedulerAPI
  readonly viewportManager: ViewportManagerAPI
  readonly spatialIndex: SpatialIndexAPI
}

// ==================== SigmaManager API ====================

export interface SigmaManagerAPI {
  /**
   * 创建 Sigma 实例
   */
  create(container: HTMLElement, options?: SigmaOptions): Promise<void>

  /**
   * 销毁 Sigma 实例
   */
  destroy(): Promise<void>

  /**
   * 获取 Sigma 实例（严格类型）
   */
  getInstance(): Sigma

  /**
   * 获取 Graphology Graph 实例（严格类型）
   */
  getGraph(): Graph

  /**
   * 获取 Camera 实例
   */
  getCamera(): Camera

  /**
   * 刷新渲染
   */
  refresh(options?: RefreshOptions): void

  /**
   * 设置节点 Reducer（动态样式关键）
   */
  setNodeReducer(reducer: NodeReducer | null): void

  /**
   * 设置边 Reducer
   */
  setEdgeReducer(reducer: EdgeReducer | null): void
}

export interface SigmaOptions {
  renderMode?: 'webgl' | 'canvas'
  renderEdgeLabels?: boolean
  enableEdgeEvents?: boolean
  settings?: Partial<Settings>
}

export interface RefreshOptions {
  skipIndexation?: boolean
  schedule?: boolean
}

// Reducer 类型（关键！用于动态样式）
export type NodeReducer = (
  node: string,
  data: NodeDisplayData
) => NodeDisplayData

export type EdgeReducer = (
  edge: string,
  data: EdgeDisplayData
) => EdgeDisplayData

// ==================== AsyncTaskManager API ====================

export interface AsyncTaskManagerAPI {
  /**
   * 计算布局
   */
  computeLayout(
    nodes: NodeData[],
    edges: EdgeData[],
    algorithm: string,
    options?: Record<string, any>
  ): Promise<LayoutResult>

  /**
   * 构建空间索引
   */
  buildSpatialIndex(nodes: NodeData[], indexType: 'quadtree' | 'rtree'): Promise<SpatialIndexResult>

  /**
   * 数据转换
   */
  transformData(rawData: unknown, transformer: DataTransformer): Promise<GraphData>

  /**
   * 计算可见节点
   */
  computeVisibleNodes(
    allNodes: NodeData[],
    viewport: ViewportInfo,
    spatialIndex: any
  ): Promise<string[]>

  /**
   * 路径查找
   */
  findPath(
    graph: GraphData,
    startId: string,
    endId: string,
    algorithm: 'dijkstra' | 'astar'
  ): Promise<PathResult>

  /**
   * 取消任务
   */
  cancelTask(taskId: string): void
}

// ==================== EventBus API ====================

export interface EventBusAPI {
  /**
   * 监听事件
   */
  on(event: string, listener: EventListener): void

  /**
   * 监听一次事件
   */
  once(event: string, listener: EventListener): void

  /**
   * 移除监听
   */
  off(event: string, listener: EventListener): void

  /**
   * 触发事件
   */
  emit(event: string, data?: any): void

  /**
   * 清空所有监听
   */
  clear(): void
}

export interface EventListener {
  (data: any): void
}

// ==================== DataManager API ====================

export interface DataManagerAPI {
  /**
   * 加载数据块
   */
  loadChunk(chunk: ChunkDescriptor): Promise<void>

  /**
   * 卸载数据块
   */
  unloadChunk(chunkId: string): Promise<void>

  /**
   * 加载视口内可见数据
   */
  loadVisibleData(viewportBounds: ViewportBounds): Promise<void>

  /**
   * 获取已加载的数据块
   */
  getLoadedChunks(): ReadonlySet<string>

  /**
   * 清空所有数据
   */
  clearAll(): void
}

export interface ChunkDescriptor {
  readonly id: string
  readonly bounds: ViewportBounds
  readonly priority: 'critical' | 'high' | 'normal' | 'low'
  readonly nodeIds?: readonly string[]
}

export interface ViewportBounds {
  readonly minX: number
  readonly maxX: number
  readonly minY: number
  readonly maxY: number
}

// ==================== RenderScheduler API ====================

export interface RenderSchedulerAPI {
  /**
   * 调度单个节点更新（严格类型）
   */
  scheduleNodeUpdate(nodeId: string, update: Partial<Attributes>): void

  /**
   * 调度批量节点更新
   */
  scheduleNodeUpdates(updates: Array<{ nodeId: string; update: Partial<Attributes> }>): void

  /**
   * 触发立即渲染
   */
  flushRender(): void

  /**
   * 设置帧率限制
   */
  setFrameRateLimit(fps: number): void

  /**
   * 获取待更新数量
   */
  getPendingUpdateCount(): number
}

// ==================== ViewportManager API ====================

export interface ViewportManagerAPI {
  /**
   * 获取当前视口状态
   */
  getCurrentViewport(): ViewportState

  /**
   * 获取可见区域边界
   */
  getVisibleBounds(): VisibleBoundsAPI

  /**
   * 设置视口缩放
   */
  setZoom(scale: number): void

  /**
   * 设置视口位置
   */
  setPan(offsetX: number, offsetY: number): void

  /**
   * 适配所有节点
   */
  fitToNodes(nodeIds: string[]): void
}

export interface VisibleBoundsAPI {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

// ==================== SpatialIndex API ====================

export interface SpatialIndexAPI {
  /**
   * 范围查询
   */
  query(bounds: ViewportBounds): NodeData[]

  /**
   * 圆形查询
   */
  queryCircle(x: number, y: number, radius: number): NodeData[]

  /**
   * 查找最近的 K 个节点
   */
  findNearestK(x: number, y: number, k: number): NodeData[]

  /**
   * 重建索引
   */
  rebuild(nodes: NodeData[]): void

  /**
   * 清空索引
   */
  clear(): void
}

// ==================== 通用数据类型（严格符合 Sigma.js）====================

export interface GraphData {
  nodes: NodeData[]
  edges: EdgeData[]
  metadata?: Readonly<Record<string, unknown>>
}

/**
 * 节点数据（符合 Sigma.js + Graphology 规范）
 */
export interface NodeData {
  // 基础属性（必需）
  id: string
  x: number
  y: number
  size: number
  color: string
  
  // 可选属性
  label?: string
  type?: string
  
  // 渲染控制
  hidden?: boolean
  forceLabel?: boolean
  zIndex?: number
  highlighted?: boolean
  
  // 自定义扩展（严格类型）
  properties?: Readonly<Record<string, string | number | boolean | null>>
}

/**
 * 边数据（符合 Sigma.js + Graphology 规范）
 */
export interface EdgeData {
  // 基础属性（必需）
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
  
  // 自定义扩展（严格类型）
  properties?: Readonly<Record<string, string | number | boolean | null>>
}

export interface ViewportInfo {
  scale: number
  offsetX: number
  offsetY: number
  width: number
  height: number
}

export interface PathResult {
  path: string[]
  distance: number
  metadata?: Record<string, any>
}

export interface DataTransformer {
  (rawData: unknown): Promise<GraphData>
}

export type LayoutAlgorithm = 'force-directed' | 'tree' | 'circle' | 'grid' | string

export interface LayoutOptions {
  iterations?: number
  nodeSpacing?: number
  edgeLength?: number
  priority?: 'critical' | 'high' | 'normal' | 'low'
}
