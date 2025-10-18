/**
 * 分组多中心同心圆布局引擎
 * 架构：大环形（组分布）+ 小同心圆（组内分布）
 */
import type { G6GraphData, G6Node } from '../data/types'
import type { ILayoutEngine, ConcentricLayoutConfig, LayoutConfig } from './types'

interface Point {
  x: number
  y: number
}

export class ConcentricLayout implements ILayoutEngine {
  readonly name = 'concentric' as const
  
  /**
   * 计算布局（分组环形+同心圆混合布局）
   */
  compute(data: G6GraphData, config: LayoutConfig): G6Node[] {
    if (config.name !== 'concentric') {
      throw new Error('配置类型错误：期望 concentric 布局配置')
    }
    
    const concentricConfig = config as ConcentricLayoutConfig
    
    console.log('[ConcentricLayout] 开始计算分组多中心布局')
    
    // 1. 按groupId分组节点
    const groups = this.groupNodesByGroupId(data.nodes)
    console.log(`[ConcentricLayout] 节点分组完成：${groups.size} 个组`)
    
    // 2. 计算组的环形分布位置（大环）
    const groupCenters = this.computeGroupCircularLayout(groups, concentricConfig)
    console.log(`[ConcentricLayout] 组中心环形布局完成`)
    
    // 3. 对每个组内部计算同心圆布局（小同心圆）
    this.computeGroupConcentricLayouts(groups, groupCenters, concentricConfig)
    console.log(`[ConcentricLayout] 组内同心圆布局完成`)
    
    // 4. 节点间距修正（可选）
    if (concentricConfig.enableNodeSpacingCorrection && data.nodes.length < 1000) {
      this.correctNodeSpacing(data.nodes, concentricConfig)
      console.log(`[ConcentricLayout] 节点间距修正完成`)
    }
    
    console.log('[ConcentricLayout] 布局计算完成')
    return data.nodes
  }
  
  /**
   * 按groupId分组节点
   */
  private groupNodesByGroupId(nodes: G6Node[]): Map<number, G6Node[]> {
    const groups = new Map<number, G6Node[]>()
    
    for (const node of nodes) {
      // 使用groupId，如果没有则随机分配到0-4组
      let groupId = node.groupId
      if (groupId === undefined || groupId === null) {
        groupId = Math.floor(Math.random() * 5)
        node.groupId = groupId  // 回写groupId
      }
      
      if (!groups.has(groupId)) {
        groups.set(groupId, [])
      }
      groups.get(groupId)!.push(node)
    }
    
    return groups
  }
  
  /**
   * 计算组的环形分布位置（大环）
   */
  private computeGroupCircularLayout(
    groups: Map<number, G6Node[]>,
    config: ConcentricLayoutConfig
  ): Map<number, Point> {
    const groupCenters = new Map<number, Point>()
    const groupIds = Array.from(groups.keys()).sort((a, b) => a - b)
    const groupCount = groupIds.length
    
    if (groupCount === 0) return groupCenters
    
    // 计算大环半径（根据组数和节点总数动态调整）
    const totalNodes = Array.from(groups.values()).reduce((sum, nodes) => sum + nodes.length, 0)
    const baseRadius = Math.max(300, Math.sqrt(totalNodes) * 30)
    
    // 如果只有1个组，放在中心
    if (groupCount === 1) {
      groupCenters.set(groupIds[0], { x: 0, y: 0 })
      return groupCenters
    }
    
    // 多个组：环形分布
    const angleStep = (2 * Math.PI) / groupCount
    
    groupIds.forEach((groupId, index) => {
      const angle = index * angleStep - Math.PI / 2  // 从顶部开始
      const x = baseRadius * Math.cos(angle)
      const y = baseRadius * Math.sin(angle)
      groupCenters.set(groupId, { x, y })
    })
    
    return groupCenters
  }
  
  /**
   * 对每个组内部计算同心圆布局
   */
  private computeGroupConcentricLayouts(
    groups: Map<number, G6Node[]>,
    groupCenters: Map<number, Point>,
    config: ConcentricLayoutConfig
  ): void {
    for (const [groupId, nodes] of groups.entries()) {
      const center = groupCenters.get(groupId) || { x: 0, y: 0 }
      this.layoutGroupConcentric(nodes, center, config)
    }
  }
  
  /**
   * 单个组的同心圆布局
   */
  private layoutGroupConcentric(
    nodes: G6Node[],
    center: Point,
    config: ConcentricLayoutConfig
  ): void {
    // 按hierarchy分层
    const layers = this.layerNodesByHierarchy(nodes)
    const layerKeys = Array.from(layers.keys()).sort((a, b) => b - a)  // 从高到低
    
    layerKeys.forEach((hierarchyLevel, layerIndex) => {
      const layerNodes = layers.get(hierarchyLevel)!
      const radius = layerIndex === 0 ? 0 : 60 + layerIndex * 80  // 第一层在中心，其他层递增
      
      if (layerNodes.length === 1 && radius === 0) {
        // 中心节点
        layerNodes[0].x = center.x
        layerNodes[0].y = center.y
      } else {
        // 圆周分布
        const angleStep = (2 * Math.PI) / layerNodes.length
        layerNodes.forEach((node, index) => {
          const angle = index * angleStep - Math.PI / 2  // 从顶部开始
          node.x = center.x + radius * Math.cos(angle)
          node.y = center.y + radius * Math.sin(angle)
        })
      }
    })
  }
  
  /**
   * 按hierarchy分层
   */
  private layerNodesByHierarchy(nodes: G6Node[]): Map<number, G6Node[]> {
    const layers = new Map<number, G6Node[]>()
    
    for (const node of nodes) {
      const hierarchy = node.hierarchy ?? 0
      if (!layers.has(hierarchy)) {
        layers.set(hierarchy, [])
      }
      layers.get(hierarchy)!.push(node)
    }
    
    return layers
  }
  
  /**
   * 节点间距修正（力导向微调）
   */
  private correctNodeSpacing(
    nodes: G6Node[],
    config: ConcentricLayoutConfig
  ): void {
    const minDistance = config.minNodeDistanceMultiplier * 30
    const iterations = 50
    const strength = config.spacingCorrectionStrength
    
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i]
        if (!nodeA.x || !nodeA.y) continue
        
        let dx = 0
        let dy = 0
        
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue
          const nodeB = nodes[j]
          if (!nodeB.x || !nodeB.y) continue
          
          const deltaX = nodeA.x - nodeB.x
          const deltaY = nodeA.y - nodeB.y
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
          
          if (distance < minDistance && distance > 0) {
            const force = (minDistance - distance) / distance * strength
            dx += deltaX * force
            dy += deltaY * force
          }
        }
        
        nodeA.x += dx
        nodeA.y += dy
      }
    }
  }
}
