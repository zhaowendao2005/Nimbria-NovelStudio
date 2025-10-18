/**
 * 同心圆布局引擎
 * 提取自原 data.mock.ts 的布局逻辑
 */
import type { RawGraphData, LayoutedNode } from '../data/types'
import type { ILayoutEngine, ConcentricLayoutConfig, LayoutConfig } from './types'

export class ConcentricLayout implements ILayoutEngine {
  readonly name = 'concentric' as const
  
  needsCytoscapeCompute(): boolean {
    return false  // 同心圆布局手动计算位置，不需要Cytoscape
  }
  
  compute(data: RawGraphData, config: LayoutConfig): LayoutedNode[] {
    if (config.name !== 'concentric') {
      throw new Error('配置类型错误：期望 concentric 布局配置')
    }
    
    const concentricConfig = config as ConcentricLayoutConfig
    
    console.log('[ConcentricLayout] 开始计算同心圆布局')
    
    // 1. 按组分配节点
    const groups = this.groupNodes(data)
    
    // 2. 计算组中心位置（内圈随机 + 外圈环绕）
    const groupCenters = this.calculateGroupCenters(groups.size, concentricConfig)
    
    // 3. 计算组内节点位置（层级化小圆簇）
    const layoutedNodes = this.layoutNodesInGroups(groups, groupCenters, concentricConfig)
    
    // 4. 跨组分散处理
    this.scatterNodes(layoutedNodes, groupCenters, concentricConfig)
    
    // 5. 节点距离修正（如果启用）
    if (concentricConfig.enableNodeSpacingCorrection) {
      console.log('[ConcentricLayout] 执行节点间距修正')
      this.correctNodeSpacing(layoutedNodes, concentricConfig)
    }
    
    console.log('[ConcentricLayout] 布局计算完成')
    return layoutedNodes
  }
  
  /**
   * 按组分配节点
   */
  private groupNodes(data: RawGraphData): Map<number, RawGraphData['nodes']> {
    const groups = new Map<number, RawGraphData['nodes']>()
    
    for (const node of data.nodes) {
      const groupId = node.metadata?.groupId ?? 0
      if (!groups.has(groupId)) {
        groups.set(groupId, [])
      }
      groups.get(groupId)!.push(node)
    }
    
    console.log(`[ConcentricLayout] 节点分组完成，共 ${groups.size} 个组`)
    return groups
  }
  
  /**
   * 计算组中心位置（内圈随机 + 外圈环绕）
   */
  private calculateGroupCenters(
    groupCount: number, 
    config: ConcentricLayoutConfig
  ): Array<{ x: number; y: number }> {
    const centers: Array<{ x: number; y: number }> = []
    
    // 内圈随机分布
    for (let i = 0; i < config.innerGroupCount && i < groupCount; i++) {
      let validPosition = false
      let centerX = 0
      let centerY = 0
      let attempts = 0
      
      while (!validPosition && attempts < 100) {
        const angle = Math.random() * 2 * Math.PI
        const distance = Math.random() * config.innerRadius
        centerX = Math.cos(angle) * distance
        centerY = Math.sin(angle) * distance
        
        // 检查与已有组中心的距离
        validPosition = true
        for (const existing of centers) {
          const dist = Math.sqrt((centerX - existing.x) ** 2 + (centerY - existing.y) ** 2)
          if (dist < config.minGroupDistance) {
            validPosition = false
            break
          }
        }
        attempts++
      }
      
      centers.push({ x: centerX, y: centerY })
    }
    
    // 外圈环绕分布
    const outerGroupCount = Math.min(config.outerGroupCount, groupCount - config.innerGroupCount)
    for (let i = 0; i < outerGroupCount; i++) {
      const angle = (i / outerGroupCount) * 2 * Math.PI
      const centerX = Math.cos(angle) * config.outerRadius
      const centerY = Math.sin(angle) * config.outerRadius
      centers.push({ x: centerX, y: centerY })
    }
    
    console.log(`[ConcentricLayout] 组中心计算完成：内圈 ${config.innerGroupCount} 组，外圈 ${outerGroupCount} 组`)
    return centers
  }
  
  /**
   * 计算组内节点位置（层级化小圆簇）
   */
  private layoutNodesInGroups(
    groups: Map<number, RawGraphData['nodes']>,
    centers: Array<{ x: number; y: number }>,
    config: ConcentricLayoutConfig
  ): LayoutedNode[] {
    const layoutedNodes: LayoutedNode[] = []
    
    groups.forEach((groupNodes, groupId) => {
      const center = centers[groupId]
      if (!center) return
      
      groupNodes.forEach((node, nodeIdx) => {
        const hierarchy = node.hierarchy ?? 3
        
        // 层级越高越靠近组中心
        // hierarchy: 5(中心) -> 距离系数 0.2
        // hierarchy: 1(普通) -> 距离系数 1.0
        const distanceFactor = 1.2 - (hierarchy * 0.2)
        
        // 节点在组内小圆上的角度（加入随机扰动避免规则排列）
        const nodeAngle = (nodeIdx / groupNodes.length) * 2 * Math.PI + Math.random() * 0.3
        
        // 计算节点位置
        const radius = config.clusterRadius * distanceFactor
        const position = {
          x: center.x + Math.cos(nodeAngle) * radius,
          y: center.y + Math.sin(nodeAngle) * radius
        }
        
        layoutedNodes.push({ ...node, position })
      })
    })
    
    console.log(`[ConcentricLayout] 节点位置计算完成：共 ${layoutedNodes.length} 个节点`)
    return layoutedNodes
  }
  
  /**
   * 跨组分散处理（部分节点重新分配到其他组附近）
   */
  private scatterNodes(
    nodes: LayoutedNode[],
    centers: Array<{ x: number; y: number }>,
    config: ConcentricLayoutConfig
  ): void {
    const scatterCount = Math.floor(nodes.length * config.scatterRatio)
    const scatteredIndices = new Set<number>()
    
    for (let i = 0; i < scatterCount; i++) {
      const randomIndex = Math.floor(Math.random() * nodes.length)
      if (scatteredIndices.has(randomIndex)) continue
      
      const node = nodes[randomIndex]
      if (!node) continue
      
      const currentGroupId = node.metadata?.groupId ?? 0
      const targetGroupIdx = Math.floor(Math.random() * centers.length)
      
      if (targetGroupIdx === currentGroupId) continue
      
      const targetCenter = centers[targetGroupIdx]
      if (!targetCenter) continue
      
      const scatterAngle = Math.random() * 2 * Math.PI
      const scatterDistance = config.clusterRadius * (0.6 + Math.random() * 0.6)
      
      node.position = {
        x: targetCenter.x + Math.cos(scatterAngle) * scatterDistance,
        y: targetCenter.y + Math.sin(scatterAngle) * scatterDistance
      }
      
      scatteredIndices.add(randomIndex)
    }
    
    console.log(`[ConcentricLayout] 跨组分散完成：${scatteredIndices.size} 个节点`)
  }
  
  /**
   * 节点间距修正（防止节点重叠）
   * 提取自 StarChartViewport.vue 的 correctNodeSpacing 函数
   */
  private correctNodeSpacing(
    nodes: LayoutedNode[],
    config: ConcentricLayoutConfig
  ): void {
    const multiplier = config.minNodeDistanceMultiplier
    const strength = config.spacingCorrectionStrength
    
    // 1. 计算每个节点的实际直径
    const nodeSizes = new Map<string, number>()
    for (const node of nodes) {
      // 基于 score 计算节点大小（与 CytoscapeTransformer 保持一致）
      const baseSize = 28  // defaultSize
      const size = Math.max(20, Math.min(60, baseSize + (node.score || 0.5) * 20))
      nodeSizes.set(node.id, size)
    }
    
    // 2. 迭代修正节点位置
    const maxIterations = 50
    let iteration = 0
    let hasOverlap = true
    
    while (hasOverlap && iteration < maxIterations) {
      hasOverlap = false
      
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i]
        if (!nodeA) continue
        
        const sizeA = nodeSizes.get(nodeA.id) || 28
        
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j]
          if (!nodeB) continue
          
          const sizeB = nodeSizes.get(nodeB.id) || 28
          
          // 计算两节点间距
          const dx = nodeB.position.x - nodeA.position.x
          const dy = nodeB.position.y - nodeA.position.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          // 计算最小安全距离
          const largerSize = Math.max(sizeA, sizeB)
          const minDistance = largerSize * multiplier
          
          // 如果距离小于最小安全距离，进行修正
          if (distance < minDistance && distance > 0) {
            hasOverlap = true
            
            // 计算修正向量
            const overlap = minDistance - distance
            const pushDistance = (overlap / 2) * strength
            
            const angle = Math.atan2(dy, dx)
            const pushX = Math.cos(angle) * pushDistance
            const pushY = Math.sin(angle) * pushDistance
            
            // 推开两个节点
            nodeA.position.x -= pushX
            nodeA.position.y -= pushY
            nodeB.position.x += pushX
            nodeB.position.y += pushY
          }
        }
      }
      
      iteration++
    }
    
    console.log(`[ConcentricLayout] 节点间距修正完成：迭代 ${iteration} 次`)
  }
}

