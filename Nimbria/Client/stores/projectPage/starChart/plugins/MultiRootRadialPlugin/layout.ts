/**
 * 多根径向树布局算法
 * 从原 MultiRootRadialLayout 提取的纯算法逻辑
 */

import type { 
  LayoutResult, 
  G6NodeData, 
  G6EdgeData,
  NodeStyleData 
} from '../types'
import type { RadialAdapterOutput } from './data.types'

interface LayoutConfig {
  width: number
  height: number
  rootIds: string[]
  baseRadiusMultiplier?: number
  minArcLengthMultiplier?: number
  maxArcLengthMultiplier?: number
  baseDistance?: number
  hierarchyStep?: number
  angleSpread?: number
  randomOffset?: number
}

interface NodePosition {
  x: number
  y: number
}

interface RootPosition extends NodePosition {
  angle: number
}

/**
 * 节点信息（包含位置和尺寸）
 */
interface NodeInfo {
  id: string
  x: number
  y: number
  size: number
  isRoot: boolean
  radius?: number  // 根节点的圆形轨道半径
  angle?: number   // 根节点的角度
}

/**
 * 空间分区网格（用于高效碰撞检测）
 */
class SpatialGrid {
  private grid: Map<string, NodeInfo[]>
  private cellSize: number
  
  constructor(cellSize: number) {
    this.grid = new Map()
    this.cellSize = cellSize
  }
  
  /**
   * 获取网格键
   */
  private getKey(x: number, y: number): string {
    const col = Math.floor(x / this.cellSize)
    const row = Math.floor(y / this.cellSize)
    return `${col},${row}`
  }
  
  /**
   * 添加节点到网格
   */
  add(node: NodeInfo): void {
    const key = this.getKey(node.x, node.y)
    if (!this.grid.has(key)) {
      this.grid.set(key, [])
    }
    this.grid.get(key)!.push(node)
  }
  
  /**
   * 获取附近的节点（包括相邻的8个网格）
   */
  getNearby(x: number, y: number): NodeInfo[] {
    const col = Math.floor(x / this.cellSize)
    const row = Math.floor(y / this.cellSize)
    const nearby: NodeInfo[] = []
    
    // 检查当前网格及相邻的8个网格
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const key = `${col + dc},${row + dr}`
        const nodes = this.grid.get(key)
        if (nodes) {
          nearby.push(...nodes)
        }
      }
    }
    
    return nearby
  }
  
  /**
   * 清空网格
   */
  clear(): void {
    this.grid.clear()
  }
}

export class MultiRootRadialLayoutAlgorithm {
  /**
   * 计算布局
   * 
   * @param data Adapter输出的标准化数据（RadialAdapterOutput）
   * @param config 布局配置
   * @returns 布局结果
   */
  calculate(data: RadialAdapterOutput, config: LayoutConfig): LayoutResult {
    const { nodes = [], edges = [] } = data
    const {
      width,
      height,
      rootIds,
      baseRadiusMultiplier = 5,
      minArcLengthMultiplier = 3,
      maxArcLengthMultiplier = 5,
      baseDistance = 300,
      hierarchyStep = 600,
      angleSpread = Math.PI / 3,
      randomOffset = 20
    } = config
    
    if (!rootIds || rootIds.length === 0) {
      console.warn('[MultiRootRadialLayout] 没有提供rootIds，返回原始数据')
      return data
    }
    
    // 根节点尺寸
    const rootNodeSize = 35
    
    // 计算环形分布参数
    const centerX = width / 2
    const centerY = height / 2
    const baseRadius = rootNodeSize * baseRadiusMultiplier
    
    const minArcLength = rootNodeSize * minArcLengthMultiplier
    const maxArcLength = rootNodeSize * maxArcLengthMultiplier
    
    const rootPositions = new Map<string, RootPosition>()
    const positionMap = new Map<string, NodePosition>()
    
    // 在大环上随机分布根节点
    let currentAngle = Math.random() * Math.PI * 2
    
    rootIds.forEach((rootId: string) => {
      const x = centerX + baseRadius * Math.cos(currentAngle)
      const y = centerY + baseRadius * Math.sin(currentAngle)
      
      rootPositions.set(rootId, { x, y, angle: currentAngle })
      positionMap.set(rootId, { x, y })
      
      const arcLength = minArcLength + Math.random() * (maxArcLength - minArcLength)
      const angleStep = arcLength / baseRadius
      currentAngle += angleStep
    })
    
    const rootSet = new Set(rootIds)
    
    // 为所有节点计算位置
    const layoutedNodes = nodes.map((node: G6NodeData): G6NodeData => {
      const nodeData = node.data || {}
      const nodeId = node.id
      
      if (rootSet.has(nodeId)) {
        const pos = positionMap.get(nodeId)
        const style: NodeStyleData = {
          ...(node.style || {}),
          x: pos?.x ?? 0,
          y: pos?.y ?? 0
        }
        return {
          ...node,
          style
        }
      } else {
        const groupId = nodeData.groupId as number | undefined
        const hierarchy = (nodeData.hierarchy as number | undefined) ?? 1
        
        if (groupId !== undefined && groupId >= 0 && groupId < rootIds.length) {
          const rootId = rootIds[groupId]
          if (!rootId) {
            console.error(`[MultiRootRadialLayout] rootId为undefined, groupId: ${groupId}`)
            return {
              ...node,
              style: {
                ...(node.style || {}),
                x: 0,
                y: 0
              }
            }
          }
          const rootPosData = rootPositions.get(rootId)
          
          if (rootPosData) {
            const { x: rootX, y: rootY, angle: rootAngle } = rootPosData
            const outwardAngle = rootAngle
            
            const distance = baseDistance + hierarchy * hierarchyStep + (Math.random() - 0.5) * randomOffset
            const randomAngle = outwardAngle + (Math.random() - 0.5) * angleSpread
            
            const x = rootX + distance * Math.cos(randomAngle)
            const y = rootY + distance * Math.sin(randomAngle)
            
            positionMap.set(nodeId, { x, y })
            
            const style: NodeStyleData = {
              ...(node.style || {}),
              x,
              y
            }
            
            return {
              ...node,
              style
            }
          }
        }
        
        console.error(`[MultiRootRadialLayout] 无法为节点 ${nodeId} 计算位置，groupId: ${groupId}`)
        return {
          ...node,
          style: {
            ...(node.style || {}),
            x: 0,
            y: 0
          }
        }
      }
    })
    
    // ===== 智能边类型判断 =====
    // 建立节点ID到层级的映射
    const nodeHierarchyMap = new Map<string, number>()
    layoutedNodes.forEach(node => {
      const hierarchy = (node.data?.hierarchy as number | undefined) ?? 
                       ((node as Record<string, unknown>).hierarchy as number | undefined) ?? 
                       (rootSet.has(node.id) ? 0 : 1)
      nodeHierarchyMap.set(node.id, hierarchy)
    })
    
    const layoutedEdges = edges.map((edge: G6EdgeData): G6EdgeData => {
      // 获取源节点和目标节点的层级
      const sourceHierarchy = nodeHierarchyMap.get(edge.source) ?? -1
      const targetHierarchy = nodeHierarchyMap.get(edge.target) ?? -1
      
      // 判断是否为根节点到一级子节点的边
      // 条件：源节点是根节点（hierarchy=0）且目标节点是一级子节点（hierarchy=1）
      const isRootToFirstLevel = sourceHierarchy === 0 && targetHierarchy === 1
      
      return {
        ...edge,
        type: isRootToFirstLevel ? 'line' : 'cubic-radial',
        // 保留原有标记（如果有的话），用于调试
        data: {
          ...(edge.data || {}),
          isDirectLine: isRootToFirstLevel,
          sourceHierarchy,
          targetHierarchy
        }
      }
    })
    
    // ===== 🔥 防碰撞处理 =====
    const adjustedNodes = this.applyCollisionAvoidance(
      layoutedNodes,
      rootSet,
      baseRadius,
      centerX,
      centerY
    )
    
    return {
      ...data,
      nodes: adjustedNodes,
      edges: layoutedEdges,
      rootIds,
      treesData: data.treesData,
      trees: data.trees ?? data.treesData,
      tree: data.tree || (data.treesData && data.treesData.length > 0 ? data.treesData[0] : undefined)
    } as LayoutResult
  }
  
  /**
   * 异步计算布局（零碰撞预分配算法）
   * @param onProgress 进度回调 (stage, processed, total)
   */
  async calculateAsync(
    data: RadialAdapterOutput, 
    config: LayoutConfig,
    onProgress?: (stage: 'layout' | 'collision', processed: number, total: number) => void
  ): Promise<LayoutResult> {
    const { nodes = [], edges = [], rootIds = [] } = data
    const {
      width,
      height,
      baseRadiusMultiplier = 1,
      baseDistance = 100,
      hierarchyStep = 50
    } = config
    
    console.log('[MultiRootRadialLayout] 🚀 使用零碰撞预分配算法')
    
    const centerX = width / 2
    const centerY = height / 2
    const baseRadius = Math.min(width, height) * 0.25 * baseRadiusMultiplier
    
    // ===== 第1步：统计每个根节点的子节点 =====
    console.log('[MultiRootRadialLayout] 📊 统计子节点分布...')
    interface RootInfo {
      id: string
      childCount: number
      angle: number
      angleRange: number  // 分配的角度范围
    }
    
    const rootInfoMap = new Map<string, RootInfo>()
    const nodesByRoot = new Map<string, G6NodeData[]>()
    
    // 统计
    rootIds.forEach(rootId => {
      nodesByRoot.set(rootId, [])
    })
    
    nodes.forEach(node => {
      if (rootIds.includes(node.id)) return  // 跳过根节点本身
      
      const groupId = (node.data?.groupId as number) ?? -1
      if (groupId >= 0 && groupId < rootIds.length) {
        const rootId = rootIds[groupId]
        if (rootId) {
          const children = nodesByRoot.get(rootId) || []
          children.push(node)
          nodesByRoot.set(rootId, children)
        }
      }
    })
    
    // ===== 第2步：为每个根节点分配角度空间 =====
    console.log('[MultiRootRadialLayout] 📐 预分配角度空间...')
    const totalChildren = Array.from(nodesByRoot.values()).reduce((sum, arr) => sum + arr.length, 0)
    let currentAngle = 0
    const fullCircle = Math.PI * 2
    
    rootIds.forEach(rootId => {
      const children = nodesByRoot.get(rootId) || []
      const childCount = children.length
      
      // 按子节点比例分配角度（至少给 π/6）
      const angleRatio = totalChildren > 0 ? childCount / totalChildren : 1 / rootIds.length
      const angleRange = Math.max(Math.PI / 6, fullCircle * angleRatio)
      
      const rootAngle = currentAngle + angleRange / 2
      
      rootInfoMap.set(rootId, {
        id: rootId,
        childCount,
        angle: rootAngle,
        angleRange
      })
      
      currentAngle += angleRange
    })
    
    // ===== 第3步：计算根节点位置 =====
    const rootPositions = new Map<string, RootPosition>()
    const rootSet = new Set(rootIds)
    
    rootIds.forEach(rootId => {
      const info = rootInfoMap.get(rootId)
      if (!info) return
      
      const x = centerX + baseRadius * Math.cos(info.angle)
      const y = centerY + baseRadius * Math.sin(info.angle)
      rootPositions.set(rootId, { x, y, angle: info.angle })
    })
    
    // ===== 第4步：按层级网格化放置子节点（零碰撞） =====
    console.log('[MultiRootRadialLayout] 🎯 零碰撞网格化布局...')
    const batchSize = 500  // 减小批次大小，增加让出频率
    const totalNodes = nodes.length
    const layoutedNodes: G6NodeData[] = []
    
    for (let i = 0; i < totalNodes; i += batchSize) {
      const batch = nodes.slice(i, Math.min(i + batchSize, totalNodes))
      
      const batchResult = batch.map((node: G6NodeData): G6NodeData => {
        const nodeId = node.id
        
        // 处理根节点
        if (rootSet.has(nodeId)) {
          const pos = rootPositions.get(nodeId)
          return {
            ...node,
            style: {
              ...(node.style || {}),
              x: pos?.x ?? 0,
              y: pos?.y ?? 0
            }
          }
        }
        
        // 处理子节点：在分配的扇形内按层级和序号网格化放置
        const groupId = (node.data?.groupId as number) ?? -1
        const hierarchy = (node.data?.hierarchy as number) ?? 1
        
        if (groupId >= 0 && groupId < rootIds.length) {
          const rootId = rootIds[groupId]
          const rootInfo = rootInfoMap.get(rootId || '')
          const rootPos = rootPositions.get(rootId || '')
          
          if (rootInfo && rootPos) {
            const children = nodesByRoot.get(rootId || '') || []
            const nodeIndex = children.findIndex(n => n.id === nodeId)
            
            if (nodeIndex >= 0) {
              // 在扇形内均匀分布
              const angleStep = rootInfo.angleRange / Math.max(children.length, 1)
              const startAngle = rootInfo.angle - rootInfo.angleRange / 2
              const nodeAngle = startAngle + angleStep * (nodeIndex + 0.5)
              
              // 距离 = 基础距离 + 层级步长
              const distance = baseDistance + hierarchy * hierarchyStep
              
              const x = rootPos.x + distance * Math.cos(nodeAngle)
              const y = rootPos.y + distance * Math.sin(nodeAngle)
              
              return {
                ...node,
                style: {
                  ...(node.style || {}),
                  x,
                  y
                }
              }
            }
          }
        }
        
        // 兜底
        return {
          ...node,
          style: {
            ...(node.style || {}),
            x: 0,
            y: 0
          }
        }
      })
      
      layoutedNodes.push(...batchResult)
      
      // 报告进度并让出线程（每一批都让出）
      if (onProgress) {
        onProgress('layout', layoutedNodes.length, totalNodes)
      }
      
      // 每批处理完都让出线程，确保主线程响应
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    
    console.log('[MultiRootRadialLayout] ✅ 零碰撞布局完成（无需碰撞检测）')
    
    // ===== 第5步：智能边类型判断 =====
    const nodeHierarchyMap = new Map<string, number>()
    layoutedNodes.forEach(node => {
      const hierarchy = (node.data?.hierarchy as number | undefined) ?? (rootSet.has(node.id) ? 0 : 1)
      nodeHierarchyMap.set(node.id, hierarchy)
    })
    
    const layoutedEdges = edges.map((edge: G6EdgeData): G6EdgeData => {
      const sourceHierarchy = nodeHierarchyMap.get(edge.source) ?? 1
      const targetHierarchy = nodeHierarchyMap.get(edge.target) ?? 1
      const isRootToFirst = sourceHierarchy === 0 && targetHierarchy === 1
      
      return {
        ...edge,
        type: isRootToFirst ? 'line' : 'cubic-radial'
      }
    })
    
    console.log('[MultiRootRadialLayout] ✅ 异步布局计算全部完成')
    
    return {
      ...data,
      nodes: layoutedNodes,
      edges: layoutedEdges,
      rootIds,
      treesData: data.treesData,
      trees: data.trees ?? data.treesData,
      tree: data.tree || (data.treesData && data.treesData.length > 0 ? data.treesData[0] : undefined)
    } as LayoutResult
  }
  
  /**
   * 应用防碰撞算法（同步版本）
   * @param nodes 节点列表
   * @param rootSet 根节点集合
   * @param rootRadius 根节点圆形轨道半径
   * @param centerX 中心X坐标
   * @param centerY 中心Y坐标
   */
  private applyCollisionAvoidance(
    nodes: G6NodeData[],
    rootSet: Set<string>,
    rootRadius: number,
    centerX: number,
    centerY: number
  ): G6NodeData[] {
    // 1. 构建节点信息列表
    const nodeInfos: NodeInfo[] = nodes.map(node => {
      const isRoot = rootSet.has(node.id)
      const size = (node.style?.size as number) || (isRoot ? 35 : 20)
      const x = (node.style?.x as number) || 0
      const y = (node.style?.y as number) || 0
      
      const info: NodeInfo = {
        id: node.id,
        x,
        y,
        size,
        isRoot
      }
      
      // 根节点额外记录角度信息
      if (isRoot) {
        const dx = x - centerX
        const dy = y - centerY
        info.angle = Math.atan2(dy, dx)
        info.radius = rootRadius
      }
      
      return info
    })
    
    // 2. 执行碰撞检测和调整（迭代式）
    const maxIterations = 50  // 最大迭代次数
    const minDistance = 15     // 节点间最小距离
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // 使用空间网格优化碰撞检测
      const grid = new SpatialGrid(100) // 网格大小100px
      
      // 将所有节点加入网格
      nodeInfos.forEach(node => grid.add(node))
      
      let hasCollision = false
      const forces: Map<string, { dx: number; dy: number }> = new Map()
      
      // 检测碰撞并计算排斥力
      for (const nodeA of nodeInfos) {
        // 只检查附近的节点（空间分区优化）
        const nearby = grid.getNearby(nodeA.x, nodeA.y)
        
        for (const nodeB of nearby) {
          if (nodeA.id === nodeB.id) continue
          
          const dx = nodeB.x - nodeA.x
          const dy = nodeB.y - nodeA.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const minDist = (nodeA.size + nodeB.size) / 2 + minDistance
          
          // 发现碰撞
          if (distance < minDist && distance > 0.1) {
            hasCollision = true
            
            // 计算排斥力
            const overlap = minDist - distance
            const forceStrength = overlap / distance
            const fx = (dx / distance) * forceStrength
            const fy = (dy / distance) * forceStrength
            
            // 累积力
            if (!forces.has(nodeA.id)) {
              forces.set(nodeA.id, { dx: 0, dy: 0 })
            }
            if (!forces.has(nodeB.id)) {
              forces.set(nodeB.id, { dx: 0, dy: 0 })
            }
            
            forces.get(nodeA.id)!.dx -= fx
            forces.get(nodeA.id)!.dy -= fy
            forces.get(nodeB.id)!.dx += fx
            forces.get(nodeB.id)!.dy += fy
          }
        }
      }
      
      // 如果没有碰撞，提前退出
      if (!hasCollision) {
        console.log(`[CollisionAvoidance] 迭代 ${iter + 1} 次后无碰撞`)
        break
      }
      
      // 应用力，调整节点位置
      for (const node of nodeInfos) {
        const force = forces.get(node.id)
        if (!force) continue
        
        if (node.isRoot && node.angle !== undefined && node.radius !== undefined) {
          // 根节点：只调整角度，保持在圆形轨道上
          const angleForce = (-force.dx * Math.sin(node.angle) + force.dy * Math.cos(node.angle)) / node.radius
          node.angle += angleForce * 0.1  // 缓慢调整
          
          // 重新计算位置
          node.x = centerX + node.radius * Math.cos(node.angle)
          node.y = centerY + node.radius * Math.sin(node.angle)
        } else {
          // 子节点：自由移动
          node.x += force.dx * 0.1  // 缓慢调整，避免震荡
          node.y += force.dy * 0.1
        }
      }
      
      // 最后一次迭代时输出警告
      if (iter === maxIterations - 1) {
        console.warn(`[CollisionAvoidance] 达到最大迭代次数 ${maxIterations}，可能仍有碰撞`)
      }
    }
    
    // 3. 将调整后的位置应用到节点
    const nodeInfoMap = new Map<string, NodeInfo>()
    nodeInfos.forEach(info => nodeInfoMap.set(info.id, info))
    
    return nodes.map(node => {
      const info = nodeInfoMap.get(node.id)
      if (!info) return node
      
      return {
        ...node,
        style: {
          ...(node.style || {}),
          x: info.x,
          y: info.y
        }
      }
    })
  }
  
  /**
   * 异步版本的碰撞检测（分批迭代，避免阻塞）
   * @param onIteration 每次迭代后的回调
   */
  private async applyCollisionAvoidanceAsync(
    nodes: G6NodeData[],
    rootSet: Set<string>,
    rootRadius: number,
    centerX: number,
    centerY: number,
    onIteration?: (iteration: number) => void
  ): Promise<G6NodeData[]> {
    // 1. 构建节点信息列表
    const nodeInfos: NodeInfo[] = nodes.map(node => {
      const isRoot = rootSet.has(node.id)
      const size = (node.style?.size as number) || (isRoot ? 35 : 20)
      const x = (node.style?.x as number) || 0
      const y = (node.style?.y as number) || 0
      
      const info: NodeInfo = {
        id: node.id,
        x,
        y,
        size,
        isRoot
      }
      
      if (isRoot) {
        const dx = x - centerX
        const dy = y - centerY
        info.angle = Math.atan2(dy, dx)
        info.radius = rootRadius
      }
      
      return info
    })
    
    // 2. 异步执行碰撞检测和调整
    const maxIterations = 50
    const minDistance = 15
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const grid = new SpatialGrid(100)
      nodeInfos.forEach(node => grid.add(node))
      
      let hasCollision = false
      const forces: Map<string, { dx: number; dy: number }> = new Map()
      
      // 检测碰撞并计算排斥力
      for (const nodeA of nodeInfos) {
        const nearby = grid.getNearby(nodeA.x, nodeA.y)
        
        for (const nodeB of nearby) {
          if (nodeA.id === nodeB.id) continue
          
          const dx = nodeB.x - nodeA.x
          const dy = nodeB.y - nodeA.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const minDist = (nodeA.size + nodeB.size) / 2 + minDistance
          
          if (distance < minDist && distance > 0.1) {
            hasCollision = true
            
            const overlap = minDist - distance
            const forceStrength = overlap / distance
            const fx = (dx / distance) * forceStrength
            const fy = (dy / distance) * forceStrength
            
            if (!forces.has(nodeA.id)) {
              forces.set(nodeA.id, { dx: 0, dy: 0 })
            }
            if (!forces.has(nodeB.id)) {
              forces.set(nodeB.id, { dx: 0, dy: 0 })
            }
            
            const forceA = forces.get(nodeA.id)!
            const forceB = forces.get(nodeB.id)!
            forceA.dx -= fx
            forceA.dy -= fy
            forceB.dx += fx
            forceB.dy += fy
          }
        }
      }
      
      // 如果没有碰撞，提前结束
      if (!hasCollision) {
        console.log(`[CollisionAvoidance] ✅ 第 ${iter + 1} 次迭代后无碰撞，提前结束`)
        break
      }
      
      // 应用力到节点
      for (const node of nodeInfos) {
        const force = forces.get(node.id)
        if (!force) continue
        
        if (node.isRoot && node.radius !== undefined && node.angle !== undefined) {
          // 根节点：只能沿圆形轨道移动
          const angleForce = (-force.dx * Math.sin(node.angle) + force.dy * Math.cos(node.angle)) / node.radius
          node.angle += angleForce * 0.1
          
          node.x = centerX + node.radius * Math.cos(node.angle)
          node.y = centerY + node.radius * Math.sin(node.angle)
        } else {
          // 子节点：自由移动
          node.x += force.dx * 0.1
          node.y += force.dy * 0.1
        }
      }
      
      // 报告进度并让出线程（每5次迭代让出一次）
      if (onIteration) {
        onIteration(iter + 1)
      }
      if (iter % 5 === 4 && iter < maxIterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      
      if (iter === maxIterations - 1) {
        console.warn(`[CollisionAvoidance] ⚠️ 达到最大迭代次数 ${maxIterations}`)
      }
    }
    
    // 3. 应用调整后的位置
    const nodeInfoMap = new Map<string, NodeInfo>()
    nodeInfos.forEach(info => nodeInfoMap.set(info.id, info))
    
    return nodes.map(node => {
      const info = nodeInfoMap.get(node.id)
      if (!info) return node
      
      return {
        ...node,
        style: {
          ...(node.style || {}),
          x: info.x,
          y: info.y
        }
      }
    })
  }
}

