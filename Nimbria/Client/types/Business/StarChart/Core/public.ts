/**
 * Core 对外接口类型
 * 这些类型是插件可以使用的 Core API 接口
 */

import type { LayoutResult, SpatialIndexResult, ViewportState } from './internal'

// ==================== Core API 统一入口 ====================

export interface StarChartCoreAPI {
  readonly sigma: SigmaManagerAPI
  readonly asyncTask: AsyncTaskManagerAPI
  readonly eventBus: EventBusAPI
  readonly render: RenderSchedulerAPI
  readonly viewport: ViewportManagerAPI
  readonly layer: LayerManagerAPI
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
   * 获取 Sigma 实例
   */
  getInstance(): any | null

  /**
   * 获取 Graphology Graph 实例
   */
  getGraph(): any | null

  /**
   * 刷新渲染
   */
  refresh(): void
}

export interface SigmaOptions {
  renderMode?: 'webgl' | 'canvas'
  settings?: Record<string, any>
}

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

// ==================== RenderScheduler API ====================

export interface RenderSchedulerAPI {
  /**
   * 调度单个节点更新
   */
  scheduleNodeUpdate(nodeId: string, update: Partial<any>): void

  /**
   * 调度批量节点更新
   */
  scheduleNodesUpdate(updates: Map<string, Partial<any>>): void

  /**
   * 触发立即渲染
   */
  flushRender(): void

  /**
   * 设置帧率限制
   */
  setFrameRateLimit(fps: number): void
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

// ==================== LayerManager API ====================

export interface LayerManagerAPI {
  /**
   * 注册自定义层
   */
  registerLayer(layerId: string, layer: CustomLayer): void

  /**
   * 移除层
   */
  removeLayer(layerId: string): void

  /**
   * 获取层
   */
  getLayer(layerId: string): CustomLayer | null

  /**
   * 获取所有层
   */
  getAllLayers(): Map<string, CustomLayer>

  /**
   * 更新层渲染顺序
   */
  setLayerOrder(layerIds: string[]): void
}

export interface CustomLayer {
  id: string
  zIndex: number
  render(context: CanvasRenderingContext2D | WebGLRenderingContext, viewport: ViewportState): void
}

// ==================== 通用数据类型 ====================

export interface GraphData {
  nodes: NodeData[]
  edges: EdgeData[]
  metadata?: Record<string, any>
}

export interface NodeData {
  id: string
  label?: string
  type?: string
  x?: number
  y?: number
  properties?: Record<string, any>
}

export interface EdgeData {
  id: string
  source: string
  target: string
  label?: string
  type?: string
  properties?: Record<string, any>
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
