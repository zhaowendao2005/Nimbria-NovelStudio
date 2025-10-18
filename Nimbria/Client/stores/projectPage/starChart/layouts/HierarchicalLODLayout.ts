/**
 * 分层LOD布局引擎
 * 支持大规模数据的六边形分区、LOD渲染和递归展开
 */
import type { RawGraphData, LayoutedNode, ZoneInfo } from '../data/types'
import type { 
  ILayoutEngine, 
  LayoutConfig, 
  HierarchicalLODLayoutConfig,
  ZoneDefinition 
} from './types'

/**
 * 六边形边界
 */
interface HexagonBoundary {
  center: { x: number; y: number }
  radius: number
  vertices: Array<{ x: number; y: number }>
}

/**
 * 分层LOD布局引擎
 */
export class HierarchicalLODLayout implements ILayoutEngine {
  readonly name = 'hierarchical-lod' as const
  
  /**
   * 计算布局
   */
  compute(data: RawGraphData, config: LayoutConfig): LayoutedNode[] {
    if (config.name !== 'hierarchical-lod') {
      throw new Error(`配置类型不匹配: 期望 hierarchical-lod, 实际 ${config.name}`)
    }
    
    console.log('[HierarchicalLODLayout] 开始计算分层LOD布局')
    const startTime = Date.now()
    
    const lodConfig = config as HierarchicalLODLayoutConfig
    const layoutedNodes: LayoutedNode[] = []
    
    // 1. 获取或检测分区
    const zones = this.getZones(data, lodConfig)
    console.log(`[HierarchicalLODLayout] 共 ${zones.length} 个分区`)
    
    // 2. 计算每个分区的六边形边界
    const zoneBoundaries = this.calculateZoneBoundaries(zones, lodConfig)
    console.log('[HierarchicalLODLayout] 六边形边界计算完成')
    
    // 3. 为每个分区布局节点
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i]
      const boundary = zoneBoundaries[i]
      
      if (!zone || !boundary) continue
      
      const zoneNodes = data.nodes.filter(n => 
        zone.nodeIds.includes(n.id)
      )
      
      // 分离边缘节点和内部节点
      const boundaryNodes = zoneNodes.filter(n => n.metadata?.isBoundaryNode)
      const internalNodes = zoneNodes.filter(n => !n.metadata?.isBoundaryNode)
      
      console.log(`[HierarchicalLODLayout] 分区 ${zone.name}: ${boundaryNodes.length} 边缘节点, ${internalNodes.length} 内部节点`)
      
      // 布局边缘节点（放置在六边形边缘）
      const layoutedBoundary = this.layoutBoundaryNodes(
        boundaryNodes,
        boundary,
        data.edges,
        lodConfig
      )
      
      // 布局内部节点（六边形内部的力导向）
      const layoutedInternal = this.layoutInternalNodes(
        internalNodes,
        boundary,
        layoutedBoundary,
        lodConfig
      )
      
      layoutedNodes.push(...layoutedBoundary, ...layoutedInternal)
    }
    
    // 4. 处理未分配到任何分区的节点（如果有）
    const assignedIds = new Set(layoutedNodes.map(n => n.id))
    const unassignedNodes = data.nodes.filter(n => !assignedIds.has(n.id))
    
    if (unassignedNodes.length > 0) {
      console.log(`[HierarchicalLODLayout] 发现 ${unassignedNodes.length} 个未分配节点，随机放置`)
      const unassignedLayouted = this.layoutUnassignedNodes(unassignedNodes)
      layoutedNodes.push(...unassignedLayouted)
    }
    
    const elapsed = Date.now() - startTime
    console.log(`[HierarchicalLODLayout] 布局计算完成: ${layoutedNodes.length} 节点，耗时 ${elapsed}ms`)
    
    return layoutedNodes
  }
  
  /**
   * 是否需要Cytoscape计算
   */
  needsCytoscapeCompute(): boolean {
    return false  // 我们自己计算位置
  }
  
  /**
   * 获取分区信息
   */
  private getZones(
    data: RawGraphData,
    config: HierarchicalLODLayoutConfig
  ): ZoneInfo[] {
    // 如果数据中有zones元数据，使用它
    if (data.metadata?.zones && data.metadata.zones.length > 0) {
      return data.metadata.zones
    }
    
    // 如果配置中有手动定义的zones
    if (config.zones.manualZones && config.zones.manualZones.length > 0) {
      return config.zones.manualZones.map(z => ({
        id: z.id,
        name: z.name,
        color: z.color,
        nodeIds: z.nodeIds,
        parentZone: z.parentZone,
        level: z.level
      }))
    }
    
    // 否则自动检测（基于metadata.zoneId）
    if (config.zones.autoDetect) {
      return this.autoDetectZones(data)
    }
    
    // 默认：所有节点在一个大区
    return [{
      id: 'default',
      name: '默认分区',
      color: '#868e96',
      nodeIds: data.nodes.map(n => n.id),
      level: 0
    }]
  }
  
  /**
   * 自动检测分区
   */
  private autoDetectZones(data: RawGraphData): ZoneInfo[] {
    const zoneMap = new Map<string, RawNode[]>()
    
    for (const node of data.nodes) {
      const zoneId = node.metadata?.zoneId || 'default'
      if (!zoneMap.has(zoneId)) {
        zoneMap.set(zoneId, [])
      }
      zoneMap.get(zoneId)!.push(node)
    }
    
    const zones: ZoneInfo[] = []
    for (const [zoneId, nodes] of zoneMap.entries()) {
      if (nodes.length > 0) {
        zones.push({
          id: zoneId,
          name: zoneId,
          color: this.hashColor(zoneId),
          nodeIds: nodes.map(n => n.id),
          level: 0
        })
      }
    }
    
    return zones
  }
  
  /**
   * 计算六边形边界
   */
  private calculateZoneBoundaries(
    zones: ZoneInfo[],
    config: HierarchicalLODLayoutConfig
  ): HexagonBoundary[] {
    const boundaries: HexagonBoundary[] = []
    
    // 计算网格布局（六边形排列）
    const cols = Math.ceil(Math.sqrt(zones.length))
    const baseRadius = 800  // 基础半径
    const spacing = baseRadius * 2.2  // 六边形间距
    
    for (let i = 0; i < zones.length; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      
      // 六边形网格偏移（奇数行向右偏移半个间距）
      const offsetX = row % 2 === 1 ? spacing * 0.5 : 0
      
      const center = {
        x: col * spacing + offsetX,
        y: row * spacing * 0.866  // 0.866 ≈ sin(60°)
      }
      
      const radius = baseRadius
      const vertices = this.calculateHexagonVertices(center, radius)
      
      boundaries.push({ center, radius, vertices })
    }
    
    return boundaries
  }
  
  /**
   * 计算六边形顶点
   */
  private calculateHexagonVertices(
    center: { x: number; y: number },
    radius: number
  ): Array<{ x: number; y: number }> {
    const vertices: Array<{ x: number; y: number }> = []
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i  // 60度间隔
      vertices.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      })
    }
    
    return vertices
  }
  
  /**
   * 布局边缘节点（放置在六边形边缘）
   */
  private layoutBoundaryNodes(
    nodes: RawNode[],
    boundary: HexagonBoundary,
    edges: RawEdge[],
    config: HierarchicalLODLayoutConfig
  ): LayoutedNode[] {
    if (nodes.length === 0) return []
    
    const layouted: LayoutedNode[] = []
    const edgeCount = 6
    const nodesPerEdge = Math.ceil(nodes.length / edgeCount)
    
    // 将节点均匀分布在六条边上
    nodes.forEach((node, index) => {
      const edgeIndex = Math.floor(index / nodesPerEdge)
      const positionOnEdge = (index % nodesPerEdge) / nodesPerEdge
      
      const v1 = boundary.vertices[edgeIndex]
      const v2 = boundary.vertices[(edgeIndex + 1) % 6]
      
      if (!v1 || !v2) {
        // 如果顶点不存在，放在中心
        layouted.push({
          ...node,
          position: boundary.center
        })
        return
      }
      
      // 在边上线性插值
      const position = {
        x: v1.x + (v2.x - v1.x) * positionOnEdge,
        y: v1.y + (v2.y - v1.y) * positionOnEdge
      }
      
      layouted.push({
        ...node,
        position
      })
    })
    
    return layouted
  }
  
  /**
   * 布局内部节点（六边形内部）
   */
  private layoutInternalNodes(
    nodes: RawNode[],
    boundary: HexagonBoundary,
    boundaryNodes: LayoutedNode[],
    config: HierarchicalLODLayoutConfig
  ): LayoutedNode[] {
    if (nodes.length === 0) return []
    
    // 简单的径向布局：从中心向外扩散
    const layouted: LayoutedNode[] = []
    const layers = Math.ceil(Math.sqrt(nodes.length))
    const innerRadius = boundary.radius * 0.3  // 内圈半径
    const maxRadius = boundary.radius * 0.8    // 最大半径（留出边缘空间）
    
    let nodeIndex = 0
    for (let layer = 0; layer < layers && nodeIndex < nodes.length; layer++) {
      const layerRadius = innerRadius + (maxRadius - innerRadius) * (layer / layers)
      const nodesInLayer = Math.min(
        Math.ceil(2 * Math.PI * layerRadius / 100),  // 根据周长计算节点数
        nodes.length - nodeIndex
      )
      
      for (let i = 0; i < nodesInLayer && nodeIndex < nodes.length; i++) {
        const angle = (2 * Math.PI * i) / nodesInLayer
        const position = {
          x: boundary.center.x + layerRadius * Math.cos(angle),
          y: boundary.center.y + layerRadius * Math.sin(angle)
        }
        
        layouted.push({
          ...nodes[nodeIndex],
          position
        })
        
        nodeIndex++
      }
    }
    
    return layouted
  }
  
  /**
   * 布局未分配节点
   */
  private layoutUnassignedNodes(nodes: RawNode[]): LayoutedNode[] {
    // 随机放置在一个较大的区域
    return nodes.map((node, index) => ({
      ...node,
      position: {
        x: Math.random() * 5000 - 2500,
        y: Math.random() * 5000 - 2500
      }
    }))
  }
  
  /**
   * 基于字符串哈希生成颜色
   */
  private hashColor(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash) % 360
    return `hsl(${hue}, 60%, 50%)`
  }
}

// 导出单例
export const hierarchicalLODLayout = new HierarchicalLODLayout()

