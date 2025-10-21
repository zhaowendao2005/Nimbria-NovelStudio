/**
 * Core 内部类型
 * 这些类型仅供 Core 内部使用，不暴露给插件
 */

// ==================== SigmaManager 内部状态 ====================

export interface SigmaManagerState {
  instance: any | null // Sigma 实例
  graph: any | null // Graphology Graph 实例
  container: HTMLElement | null
  renderMode: 'webgl' | 'canvas'
  lastRefreshTime: number
  isInitialized: boolean
}

// ==================== AsyncTaskManager 内部状态 ====================

export interface AsyncTask {
  id: string
  type: 'layout' | 'spatial-index' | 'data-transform' | 'viewport-culling' | 'pathfinding'
  payload: unknown
  priority: 'critical' | 'high' | 'normal' | 'low'
  status: 'queued' | 'running' | 'completed' | 'error' | 'cancelled'
  createdAt: number
  startedAt?: number
  completedAt?: number
  progress?: number
  result?: unknown
  error?: Error
}

export interface TaskQueueState {
  queue: AsyncTask[]
  running: Map<string, AsyncTask>
  completed: AsyncTask[]
  workerLoad: number[]
}

export interface WorkerPoolState {
  workers: Worker[]
  availableWorkers: Set<Worker>
  workerTaskMap: Map<Worker, string>
}

export interface WorkerMessage {
  taskId: string
  type: 'result' | 'error' | 'progress'
  data: unknown
}

// ==================== RenderScheduler 内部状态 ====================

export interface RenderState {
  pendingUpdates: Map<string, NodeUpdate>
  lastRenderTime: number
  isScheduled: boolean
  frameId: number | null
  targetFps: number
}

export interface NodeUpdate {
  nodeId: string
  attributes: Record<string, any>
  timestamp: number
}

// ==================== LayerManager 内部状态 ====================

export interface LayerManagerState {
  layers: Array<{
    id: string
    type: 'dom' | 'canvas' | 'webgl'
    visible: boolean
    zIndex: number
  }>
  totalLayers: number
  visibleCount: number
}

// ==================== ViewportManager 内部状态 ====================

export interface ViewportState {
  scale: number
  offsetX: number
  offsetY: number
  width: number
  height: number
  minZoom: number
  maxZoom: number
}

export interface VisibleBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

// ==================== EventBus 内部状态 ====================

export type TaskEvent = 'queued' | 'started' | 'progress' | 'completed' | 'error' | 'cancelled'

export interface TaskListener {
  (event: TaskEvent, data: any): void
}

// ==================== 通用内部类型 ====================

export interface TaskConfig {
  type: AsyncTask['type']
  payload: unknown
  priority: AsyncTask['priority']
}

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>
  metadata?: Record<string, any>
}

export interface SpatialIndexResult {
  index: any // 实际的空间索引结构
  metadata?: Record<string, any>
}

export interface PluginInstanceInternal {
  plugin: any
  context: any
  installedAt: number
}
