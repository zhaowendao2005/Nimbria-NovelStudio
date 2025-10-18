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
    const { width = 1000, height = 1000, rootIds = [] } = allOptions

    if (!rootIds || rootIds.length === 0) {
      console.warn('[MultiRootRadialLayout] 没有提供rootIds，返回原始数据')
      return data
    }

    // ============ 布局参数配置 ============
    // 根节点尺寸（单位：像素）
    // 用于计算节点间距和向外扩散距离
    // 可调范围：20-60，根据节点视觉大小调整
    const rootNodeSize = 35

    // 1. 计算环形分布参数
    const centerX = width / 2
    const centerY = height / 2
    
    // 根节点环形分布的大环半径系数
    // baseRadius = rootNodeSize * 10
    // 含义：根节点围绕画布中心排成的大圆半径
    // 可调范围：5-15倍，值越大根节点越分散
    // - 5：根节点紧凑分布
    // - 10：默认，适度分散
    // - 15：根节点均匀分布在边缘
    const baseRadius = rootNodeSize * 5

    // 相邻根节点之间的弧长范围
    const minArcLength = rootNodeSize * 3  // 最小弧长 = 节点直径 * 3
    const maxArcLength = rootNodeSize * 5  // 最大弧长 = 节点直径 * 5
    // 含义：控制根节点间的间距均匀性
    // - min/max越接近：排列越规则，越均匀
    // - 差值越大：排列越随机，更自然
    // 可调范围：min应为2-4倍，max应为4-6倍
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
            
            // ============ 子节点向外扩散参数 ============
            // 基础距离 = 60 + 层级 * 50
            // 含义：子节点距离根节点的基础距离
            // - 60：最内层子节点的起始距离
            // - 50：每增加一层，距离增加50像素
            // 可调范围：
            // - 基础距离：40-80，影响整体布局紧凑度
            // - 层级步进：30-70，影响层间间距
            const baseDistance = 300 + hierarchy * 100
            
            // 随机波动距离
            // distance = baseDistance + (Math.random() - 0.5) * 20
            // 含义：为了避免节点重叠，在基础距离上加随机偏移
            // 范围：±10 像素（20 / 2）
            // 可调范围：0-40，值越大布局越随机越自然
            const distance = baseDistance + (Math.random() - 0.5) * 20
            
            // 子节点向外扩散的角度范围（60度扇形）
            // angleSpread = Math.PI / 3 ≈ 60度
            // 含义：控制子节点树围绕根节点的扇形宽度
            // 可调范围（常见值）：
            // - Math.PI / 6 ≈ 30度：紧凑扇形
            // - Math.PI / 3 ≈ 60度：标准扇形（推荐）
            // - Math.PI / 2 ≈ 90度：宽扇形
            // - Math.PI ≈ 180度：半圆
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

    // 为边添加标记：第一层子节点到根的边用直线，其他用曲线
    const layoutedEdges = edges.map((edge: any) => {
      const sourceNode = nodes.find((n: any) => n.id === edge.source)
      const targetNode = nodes.find((n: any) => n.id === edge.target)
      
      const sourceData = sourceNode?.data || sourceNode
      const targetData = targetNode?.data || targetNode
      
      // 判断是否是"根到第一层"的边
      // 情况1：source是根节点，target的hierarchy === 1
      // 情况2：target是根节点，source的hierarchy === 1
      const isRootToFirstLevel = 
        (rootSet.has(edge.source) && (targetData?.hierarchy === 1 || targetData?.hierarchy === undefined)) ||
        (rootSet.has(edge.target) && (sourceData?.hierarchy === 1 || sourceData?.hierarchy === undefined))
      
      return {
        ...edge,
        // 添加标记供边样式函数使用
        isDirectLine: isRootToFirstLevel
      }
    })

    return {
      nodes: layoutedNodes,
      edges: layoutedEdges
    }
  }
}

export default MultiRootRadialLayout

