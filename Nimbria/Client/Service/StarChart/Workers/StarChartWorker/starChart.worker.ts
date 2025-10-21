/**
 * StarChartWorker - 主 Web Worker 框架
 * 
 * 职责：
 * - 接收主线程的异步任务
 * - 分发任务到相应的处理器
 * - 返回任务结果或错误
 * - 支持进度报告
 */

interface WorkerMessage {
  id: string
  type: 'layout' | 'spatial-index' | 'data-transform' | 'viewport-culling' | 'pathfinding' | 'custom'
  payload: any
  priority?: 'critical' | 'high' | 'normal' | 'low'
}

interface WorkerResult {
  id: string
  type: 'progress' | 'result' | 'error'
  data?: any
  progress?: number
  error?: string
}

interface TaskHandler {
  (payload: any): Promise<any> | any
}

// 任务处理器注册表
const taskHandlers: Map<string, TaskHandler> = new Map()

/**
 * 注册任务处理器
 */
function registerTaskHandler(type: string, handler: TaskHandler): void {
  taskHandlers.set(type, handler)
}

/**
 * 处理消息
 */
async function handleMessage(message: WorkerMessage): Promise<void> {
  const { id, type, payload } = message

  try {
    const handler = taskHandlers.get(type)

    if (!handler) {
      sendError(id, `Unknown task type: ${type}`)
      return
    }

    // 执行任务
    const result = await handler(payload)

    // 发送结果
    sendResult(id, result)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    sendError(id, errorMsg)
  }
}

/**
 * 发送进度
 */
function sendProgress(id: string, progress: number): void {
  const message: WorkerResult = {
    id,
    type: 'progress',
    progress: Math.min(100, Math.max(0, progress))
  }

  self.postMessage(message)
}

/**
 * 发送结果
 */
function sendResult(id: string, data: any): void {
  const message: WorkerResult = {
    id,
    type: 'result',
    data
  }

  self.postMessage(message)
}

/**
 * 发送错误
 */
function sendError(id: string, error: string): void {
  const message: WorkerResult = {
    id,
    type: 'error',
    error
  }

  self.postMessage(message)
}

/**
 * 内置任务处理器 - 布局计算
 */
registerTaskHandler('layout', async (payload: any) => {
  // 布局计算由 LayoutWorker 专门处理
  // 这里作为示例实现
  const { nodes, edges, algorithm, options } = payload

  if (!nodes || !edges) {
    throw new Error('Missing nodes or edges')
  }

  // 简单的模拟布局计算
  const result: Record<string, any> = {}

  for (const node of nodes) {
    result[node.id] = {
      x: Math.random() * 1000,
      y: Math.random() * 1000
    }
  }

  return { positions: result, algorithm }
})

/**
 * 内置任务处理器 - 空间索引
 */
registerTaskHandler('spatial-index', async (payload: any) => {
  // 空间索引由 SpatialWorker 专门处理
  const { nodes, bounds } = payload

  if (!nodes) {
    throw new Error('Missing nodes')
  }

  // 返回空间索引数据
  return {
    indexType: 'quadtree',
    nodeCount: nodes.length,
    bounds: bounds || { x: 0, y: 0, width: 1000, height: 1000 }
  }
})

/**
 * 内置任务处理器 - 数据转换
 */
registerTaskHandler('data-transform', async (payload: any) => {
  const { data, transformer } = payload

  if (!data) {
    throw new Error('Missing data')
  }

  // 数据转换示例
  if (Array.isArray(data)) {
    return data.map((item: any) => ({
      ...item,
      transformed: true,
      timestamp: Date.now()
    }))
  }

  return { ...data, transformed: true }
})

/**
 * 内置任务处理器 - 视口裁剪
 */
registerTaskHandler('viewport-culling', async (payload: any) => {
  const { nodes, viewport } = payload

  if (!nodes || !viewport) {
    throw new Error('Missing nodes or viewport')
  }

  // 筛选视口内的节点
  const visibleNodes = nodes.filter((node: any) => {
    return (
      node.x >= viewport.x &&
      node.x <= viewport.x + viewport.width &&
      node.y >= viewport.y &&
      node.y <= viewport.y + viewport.height
    )
  })

  return {
    visibleCount: visibleNodes.length,
    totalCount: nodes.length,
    nodeIds: visibleNodes.map((n: any) => n.id)
  }
})

/**
 * 内置任务处理器 - 路径查找
 */
registerTaskHandler('pathfinding', async (payload: any) => {
  const { graph, startId, endId, algorithm } = payload

  if (!graph || !startId || !endId) {
    throw new Error('Missing required parameters')
  }

  // 简化的路径查找示例
  return {
    path: [startId, endId],
    distance: Math.random() * 1000,
    algorithm: algorithm || 'dijkstra'
  }
})

/**
 * Worker 消息处理
 */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data

  if (!message.id || !message.type) {
    console.error('[StarChartWorker] Invalid message format')
    return
  }

  handleMessage(message).catch(err => {
    console.error('[StarChartWorker] Unhandled error:', err)
    sendError(message.id, String(err))
  })
}

/**
 * Worker 初始化
 */
self.postMessage({
  type: 'ready',
  message: 'StarChartWorker initialized'
})

export { registerTaskHandler, sendProgress, sendResult, sendError }
