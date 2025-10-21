/**
 * LayoutWorker - 布局计算 Web Worker
 * 
 * 职责：
 * - 布局算法计算（力导向、层级等）
 * - 迭代优化
 * - 进度报告
 * - 支持多种算法
 */

interface LayoutNode {
  id: string
  x?: number
  y?: number
  vx?: number
  vy?: number
  mass?: number
}

interface LayoutEdge {
  source: string | LayoutNode
  target: string | LayoutNode
  weight?: number
}

interface LayoutPayload {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  algorithm: string
  options?: Record<string, any>
}

interface LayoutResult {
  positions: Record<string, { x: number; y: number }>
  algorithm: string
  iterations: number
  converged: boolean
}

/**
 * 力导向布局算法
 */
function forceDirectedLayout(payload: LayoutPayload): LayoutResult {
  const { nodes, edges, options } = payload

  const config = {
    iterations: options?.iterations ?? 100,
    nodeSpacing: options?.nodeSpacing ?? 50,
    repulsion: options?.repulsion ?? 1000,
    attraction: options?.attraction ?? 30,
    damping: options?.damping ?? 0.85,
    convergenceThreshold: options?.convergenceThreshold ?? 0.01
  }

  // 初始化节点位置和速度
  const nodeMap = new Map<string, LayoutNode>()
  nodes.forEach(node => {
    nodeMap.set(node.id, {
      ...node,
      x: node.x ?? Math.random() * 1000,
      y: node.y ?? Math.random() * 1000,
      vx: 0,
      vy: 0,
      mass: 1
    })
  })

  let converged = false

  // 迭代计算
  for (let i = 0; i < config.iterations; i++) {
    let maxForce = 0

    // 计算斥力（节点间相斥）
    const nodeArray = Array.from(nodeMap.values())
    for (let j = 0; j < nodeArray.length; j++) {
      const node1 = nodeArray[j]
      for (let k = j + 1; k < nodeArray.length; k++) {
        const node2 = nodeArray[k]

        const dx = node2.x! - node1.x!
        const dy = node2.y! - node1.y!
        const distance = Math.sqrt(dx * dx + dy * dy) + 0.01

        const force = (config.repulsion * config.nodeSpacing) / (distance * distance)

        const fx = (force * dx) / distance
        const fy = (force * dy) / distance

        node1.vx! -= fx
        node1.vy! -= fy
        node2.vx! += fx
        node2.vy! += fy

        maxForce = Math.max(maxForce, Math.abs(fx), Math.abs(fy))
      }
    }

    // 计算引力（边的吸引）
    edges.forEach(edge => {
      const source = nodeMap.get(
        typeof edge.source === 'string' ? edge.source : edge.source.id
      )
      const target = nodeMap.get(
        typeof edge.target === 'string' ? edge.target : edge.target.id
      )

      if (source && target) {
        const dx = target.x! - source.x!
        const dy = target.y! - source.y!
        const distance = Math.sqrt(dx * dx + dy * dy) + 0.01

        const force = (config.attraction * (distance - config.nodeSpacing)) / distance
        const edgeWeight = edge.weight ?? 1

        const fx = (force * dx) / distance * edgeWeight
        const fy = (force * dy) / distance * edgeWeight

        source.vx! += fx
        source.vy! += fy
        target.vx! -= fx
        target.vy! -= fy
      }
    })

    // 应用速度
    nodeArray.forEach(node => {
      node.vx! *= config.damping
      node.vy! *= config.damping
      node.x! += node.vx!
      node.y! += node.vy!
    })

    // 检查收敛
    if (maxForce < config.convergenceThreshold) {
      converged = true
      break
    }

    // 报告进度（每10次迭代）
    if (i % 10 === 0) {
      self.postMessage({
        type: 'progress',
        progress: (i / config.iterations) * 100
      })
    }
  }

  // 生成结果
  const positions: Record<string, { x: number; y: number }> = {}
  nodeMap.forEach((node, id) => {
    positions[id] = { x: node.x!, y: node.y! }
  })

  return {
    positions,
    algorithm: 'force-directed',
    iterations: config.iterations,
    converged
  }
}

/**
 * 层级布局算法
 */
function hierarchicalLayout(payload: LayoutPayload): LayoutResult {
  const { nodes, edges, options } = payload

  const config = {
    levelHeight: options?.levelHeight ?? 100,
    nodeWidth: options?.nodeWidth ?? 60
  }

  // 计算节点层级
  const levels = new Map<string, number>()
  const visited = new Set<string>()
  const queue: string[] = []

  // 找根节点（没有入度的节点）
  const inDegree = new Map<string, number>()
  nodes.forEach(n => inDegree.set(n.id, 0))
  edges.forEach(e => {
    const targetId = typeof e.target === 'string' ? e.target : e.target.id
    inDegree.set(targetId, (inDegree.get(targetId) ?? 0) + 1)
  })

  // BFS 计算层级
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId)
      levels.set(nodeId, 0)
    }
  })

  while (queue.length > 0) {
    const nodeId = queue.shift()!

    edges.forEach(e => {
      const sourceId = typeof e.source === 'string' ? e.source : e.source.id
      const targetId = typeof e.target === 'string' ? e.target : e.target.id

      if (sourceId === nodeId && !visited.has(targetId)) {
        const level = (levels.get(nodeId) ?? 0) + 1
        levels.set(targetId, Math.max(levels.get(targetId) ?? 0, level))
        queue.push(targetId)
      }
    })

    visited.add(nodeId)
  }

  // 计算位置
  const positions: Record<string, { x: number; y: number }> = {}
  const levelNodes = new Map<number, string[]>()

  levels.forEach((level, nodeId) => {
    if (!levelNodes.has(level)) {
      levelNodes.set(level, [])
    }
    levelNodes.get(level)!.push(nodeId)
  })

  levelNodes.forEach((nodeIds, level) => {
    const y = level * config.levelHeight
    const totalWidth = nodeIds.length * config.nodeWidth

    nodeIds.forEach((nodeId, index) => {
      const x = (index - nodeIds.length / 2) * config.nodeWidth + totalWidth / 2

      positions[nodeId] = { x, y }
    })
  })

  return {
    positions,
    algorithm: 'hierarchical',
    iterations: 1,
    converged: true
  }
}

/**
 * Worker 消息处理
 */
self.onmessage = (event: MessageEvent<LayoutPayload>) => {
  const payload = event.data

  try {
    let result: LayoutResult

    switch (payload.algorithm) {
      case 'force-directed':
        result = forceDirectedLayout(payload)
        break

      case 'hierarchical':
        result = hierarchicalLayout(payload)
        break

      default:
        throw new Error(`Unknown algorithm: ${payload.algorithm}`)
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
 * Worker 初始化
 */
self.postMessage({
  type: 'ready',
  message: 'LayoutWorker initialized'
})

export { forceDirectedLayout, hierarchicalLayout }
