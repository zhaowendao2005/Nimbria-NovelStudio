/**
 * 多根径向树布局算法
 * 从原 MultiRootRadialLayout 提取的纯算法逻辑
 */

import type { LayoutResult } from '../types'

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

export class MultiRootRadialLayoutAlgorithm {
  /**
   * 计算布局
   */
  calculate(data: any, config: LayoutConfig): LayoutResult {
    const { nodes = [], edges = [] } = data
    const {
      width,
      height,
      rootIds,
      baseRadiusMultiplier = 5,
      minArcLengthMultiplier = 3,
      maxArcLengthMultiplier = 5,
      baseDistance = 300,
      hierarchyStep = 100,
      angleSpread = Math.PI / 3,
      randomOffset = 20
    } = config
    
    if (!rootIds || rootIds.length === 0) {
      console.warn('[MultiRootRadialLayout] 没有提供rootIds，返回原始数据')
      return { nodes: nodes.map((n: any) => ({ id: n.id, style: { x: 0, y: 0 } })) }
    }
    
    // 根节点尺寸
    const rootNodeSize = 35
    
    // 计算环形分布参数
    const centerX = width / 2
    const centerY = height / 2
    const baseRadius = rootNodeSize * baseRadiusMultiplier
    
    const minArcLength = rootNodeSize * minArcLengthMultiplier
    const maxArcLength = rootNodeSize * maxArcLengthMultiplier
    
    const rootPositions = new Map<string, { x: number; y: number; angle: number }>()
    
    // 在大环上随机分布根节点
    let currentAngle = Math.random() * Math.PI * 2
    
    rootIds.forEach((rootId: string) => {
      const x = centerX + baseRadius * Math.cos(currentAngle)
      const y = centerY + baseRadius * Math.sin(currentAngle)
      
      rootPositions.set(rootId, { x, y, angle: currentAngle })
      
      const arcLength = minArcLength + Math.random() * (maxArcLength - minArcLength)
      const angleStep = arcLength / baseRadius
      currentAngle += angleStep
    })
    
    // 为所有节点计算位置
    const rootSet = new Set(rootIds)
    
    const layoutedNodes = nodes.map((node: any) => {
      const nodeData = node.data || node
      const nodeId = node.id
      
      if (rootSet.has(nodeId)) {
        const pos = rootPositions.get(nodeId)
        return {
          id: nodeId,
          style: {
            x: pos!.x,
            y: pos!.y
          }
        }
      } else {
        const groupId = nodeData.groupId
        const hierarchy = nodeData.hierarchy || 1
        
        if (groupId !== undefined && groupId >= 0 && groupId < rootIds.length) {
          const rootId = rootIds[groupId]
          const rootPosData = rootPositions.get(rootId)
          
          if (rootPosData) {
            const { x: rootX, y: rootY, angle: rootAngle } = rootPosData
            const outwardAngle = rootAngle
            
            const distance = baseDistance + hierarchy * hierarchyStep + (Math.random() - 0.5) * randomOffset
            const randomAngle = outwardAngle + (Math.random() - 0.5) * angleSpread
            
            const x = rootX + distance * Math.cos(randomAngle)
            const y = rootY + distance * Math.sin(randomAngle)
            
            return {
              id: nodeId,
              style: { x, y }
            }
          }
        }
        
        throw new Error(`[MultiRootRadialLayout] 无法为节点 ${nodeId} 计算位置，groupId: ${groupId}`)
      }
    })
    
    // 为边添加标记：第一层子节点到根的边用直线，其他用曲线
    const layoutedEdges = edges.map((edge: any) => {
      const sourceNode = nodes.find((n: any) => n.id === edge.source)
      const targetNode = nodes.find((n: any) => n.id === edge.target)
      
      const sourceData = sourceNode?.data || sourceNode
      const targetData = targetNode?.data || targetNode
      
      // 判断是否是"根到第一层"的边
      const isRootToFirstLevel = 
        (rootSet.has(edge.source) && (targetData?.hierarchy === 1 || targetData?.hierarchy === undefined)) ||
        (rootSet.has(edge.target) && (sourceData?.hierarchy === 1 || sourceData?.hierarchy === undefined))
      
      return {
        ...edge,
        isDirectLine: isRootToFirstLevel
      }
    })
    
    return {
      nodes: layoutedNodes,
      edges: layoutedEdges
    }
  }
}

