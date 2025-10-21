/**
 * SpatialWorker - 空间索引 Web Worker
 * 
 * 职责：
 * - 四叉树构建
 * - 空间范围查询
 * - 碰撞检测
 * - 邻近节点查找
 */

interface SpatialNode {
  id: string
  x: number
  y: number
  width?: number
  height?: number
}

interface QuadTreeNode {
  bounds: { x: number; y: number; width: number; height: number }
  capacity: number
  points: Array<{ node: SpatialNode; x: number; y: number }>
  divided: boolean
  northeast?: QuadTreeNode
  northwest?: QuadTreeNode
  southeast?: QuadTreeNode
  southwest?: QuadTreeNode
}

interface SpatialPayload {
  nodes: SpatialNode[]
  bounds: { x: number; y: number; width: number; height: number }
  capacity?: number
}

interface QueryPayload {
  operation: 'range' | 'circle' | 'nearest' | 'collision'
  data: any
}

/**
 * 创建四叉树节点
 */
function createQuadTreeNode(
  x: number,
  y: number,
  width: number,
  height: number,
  capacity: number
): QuadTreeNode {
  return {
    bounds: { x, y, width, height },
    capacity,
    points: [],
    divided: false
  }
}

/**
 * 构建四叉树
 */
function buildQuadTree(payload: SpatialPayload): QuadTreeNode {
  const { nodes, bounds, capacity = 16 } = payload

  const root = createQuadTreeNode(bounds.x, bounds.y, bounds.width, bounds.height, capacity)

  for (const node of nodes) {
    insertIntoQuadTree(root, { node, x: node.x, y: node.y })
  }

  return root
}

/**
 * 插入到四叉树
 */
function insertIntoQuadTree(
  quadTree: QuadTreeNode,
  point: { node: SpatialNode; x: number; y: number }
): boolean {
  const { bounds } = quadTree

  // 检查点是否在边界内
  if (
    point.x < bounds.x ||
    point.x >= bounds.x + bounds.width ||
    point.y < bounds.y ||
    point.y >= bounds.y + bounds.height
  ) {
    return false
  }

  // 如果还有空间，直接插入
  if (quadTree.points.length < quadTree.capacity) {
    quadTree.points.push(point)
    return true
  }

  // 如果未分割，进行分割
  if (!quadTree.divided) {
    subdivideQuadTree(quadTree)
    quadTree.divided = true
  }

  // 插入到相应的象限
  return (
    insertIntoQuadTree(quadTree.northeast!, point) ||
    insertIntoQuadTree(quadTree.northwest!, point) ||
    insertIntoQuadTree(quadTree.southeast!, point) ||
    insertIntoQuadTree(quadTree.southwest!, point)
  )
}

/**
 * 分割四叉树
 */
function subdivideQuadTree(quadTree: QuadTreeNode): void {
  const { x, y, width, height } = quadTree.bounds
  const halfWidth = width / 2
  const halfHeight = height / 2

  quadTree.northeast = createQuadTreeNode(
    x + halfWidth,
    y,
    halfWidth,
    halfHeight,
    quadTree.capacity
  )
  quadTree.northwest = createQuadTreeNode(x, y, halfWidth, halfHeight, quadTree.capacity)
  quadTree.southeast = createQuadTreeNode(
    x + halfWidth,
    y + halfHeight,
    halfWidth,
    halfHeight,
    quadTree.capacity
  )
  quadTree.southwest = createQuadTreeNode(
    x,
    y + halfHeight,
    halfWidth,
    halfHeight,
    quadTree.capacity
  )
}

/**
 * 范围查询
 */
function rangeQuery(
  quadTree: QuadTreeNode,
  range: { x: number; y: number; width: number; height: number }
): SpatialNode[] {
  const result: SpatialNode[] = []

  // 检查边界是否相交
  if (
    range.x + range.width < quadTree.bounds.x ||
    range.x > quadTree.bounds.x + quadTree.bounds.width ||
    range.y + range.height < quadTree.bounds.y ||
    range.y > quadTree.bounds.y + quadTree.bounds.height
  ) {
    return result
  }

  // 检查该节点中的点
  for (const point of quadTree.points) {
    if (
      point.x >= range.x &&
      point.x < range.x + range.width &&
      point.y >= range.y &&
      point.y < range.y + range.height
    ) {
      result.push(point.node)
    }
  }

  // 递归查询子节点
  if (quadTree.divided) {
    result.push(...rangeQuery(quadTree.northeast!, range))
    result.push(...rangeQuery(quadTree.northwest!, range))
    result.push(...rangeQuery(quadTree.southeast!, range))
    result.push(...rangeQuery(quadTree.southwest!, range))
  }

  return result
}

/**
 * 圆形查询
 */
function circleQuery(
  quadTree: QuadTreeNode,
  cx: number,
  cy: number,
  radius: number
): SpatialNode[] {
  const result: SpatialNode[] = []

  // 检查圆与矩形是否相交
  const dx = Math.max(Math.abs(cx - (quadTree.bounds.x + quadTree.bounds.width / 2)) - quadTree.bounds.width / 2, 0)
  const dy = Math.max(Math.abs(cy - (quadTree.bounds.y + quadTree.bounds.height / 2)) - quadTree.bounds.height / 2, 0)

  if (dx * dx + dy * dy > radius * radius) {
    return result
  }

  // 检查该节点中的点
  for (const point of quadTree.points) {
    const dist = (point.x - cx) * (point.x - cx) + (point.y - cy) * (point.y - cy)
    if (dist <= radius * radius) {
      result.push(point.node)
    }
  }

  // 递归查询子节点
  if (quadTree.divided) {
    result.push(...circleQuery(quadTree.northeast!, cx, cy, radius))
    result.push(...circleQuery(quadTree.northwest!, cx, cy, radius))
    result.push(...circleQuery(quadTree.southeast!, cx, cy, radius))
    result.push(...circleQuery(quadTree.southwest!, cx, cy, radius))
  }

  return result
}

// 存储当前的四叉树
let currentQuadTree: QuadTreeNode | null = null

/**
 * Worker 消息处理
 */
self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data

  try {
    let result: any

    switch (type) {
      case 'build':
        currentQuadTree = buildQuadTree(payload as SpatialPayload)
        result = {
          success: true,
          nodeCount: countQuadTreeNodes(currentQuadTree)
        }
        break

      case 'query':
        if (!currentQuadTree) {
          throw new Error('QuadTree not built yet')
        }

        const query = payload as QueryPayload
        switch (query.operation) {
          case 'range': {
            const nodes = rangeQuery(currentQuadTree, query.data)
            result = { nodeIds: nodes.map(n => n.id), count: nodes.length }
            break
          }

          case 'circle': {
            const { cx, cy, radius } = query.data
            const nodes = circleQuery(currentQuadTree, cx, cy, radius)
            result = { nodeIds: nodes.map(n => n.id), count: nodes.length }
            break
          }

          default:
            throw new Error(`Unknown query type: ${query.operation}`)
        }
        break

      default:
        throw new Error(`Unknown message type: ${type}`)
    }

    self.postMessage({
      type: 'result',
      data: result
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    self.postMessage({
      type: 'error',
      error: errorMsg
    })
  }
}

/**
 * 计算四叉树节点数
 */
function countQuadTreeNodes(quadTree: QuadTreeNode): number {
  let count = quadTree.points.length

  if (quadTree.divided) {
    count += countQuadTreeNodes(quadTree.northeast!)
    count += countQuadTreeNodes(quadTree.northwest!)
    count += countQuadTreeNodes(quadTree.southeast!)
    count += countQuadTreeNodes(quadTree.southwest!)
  }

  return count
}

/**
 * Worker 初始化
 */
self.postMessage({
  type: 'ready',
  message: 'SpatialWorker initialized'
})

export { buildQuadTree, rangeQuery, circleQuery }
