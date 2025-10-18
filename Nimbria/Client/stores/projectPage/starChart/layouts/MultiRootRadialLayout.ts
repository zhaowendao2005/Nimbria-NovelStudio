import { BaseLayout } from '@antv/g6'
import type { GraphData } from '@antv/g6'

/**
 * 多根径向树布局
 * 根节点在大环上随机分布，子节点朝外径向扩散
 */
export class MultiRootRadialLayout extends BaseLayout {
  constructor(options?: any) {
    super(options)
  }

  async execute(data: GraphData, options?: any): Promise<GraphData> {
    const { nodes = [], edges = [] } = data
    const allOptions = { ...this.options, ...options }
    const { width = 800, height = 600, rootIds = [] } = allOptions

    if (!rootIds || rootIds.length === 0) {
      console.warn('[MultiRootRadialLayout] 没有提供rootIds，返回原始数据')
      return data
    }

    // 根节点尺寸
    const rootNodeSize = 35

    // 1. 计算环形分布参数
    const centerX = width / 2
    const centerY = height / 2
    const baseRadius = rootNodeSize * 10

    const minArcLength = rootNodeSize * 3
    const maxArcLength = rootNodeSize * 5

    const rootPositions = new Map<string, { x: number; y: number; angle: number }>()

    // 2. 在大环上随机分布根节点
    let currentAngle = Math.random() * Math.PI * 2

    rootIds.forEach((rootId: string) => {
      const x = centerX + baseRadius * Math.cos(currentAngle)
      const y = centerY + baseRadius * Math.sin(currentAngle)

      rootPositions.set(rootId, { x, y, angle: currentAngle })

      const arcLength = minArcLength + Math.random() * (maxArcLength - minArcLength)
      const angleStep = arcLength / baseRadius
      currentAngle += angleStep
    })

    // 3. 为所有节点计算位置
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
            const baseDistance = 60 + hierarchy * 50
            const distance = baseDistance + (Math.random() - 0.5) * 20
            const angleSpread = Math.PI / 3
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

    return {
      nodes: layoutedNodes
    }
  }
}

export default MultiRootRadialLayout

