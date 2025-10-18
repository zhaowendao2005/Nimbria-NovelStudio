/**
 * Cytoscape格式转换器
 * 将布局后的节点和边转换为Cytoscape元素格式
 */
import type { LayoutedNode, RawEdge } from '../data/types'
import type { StarChartConfig } from '../config/starChart.config.types'

export class CytoscapeTransformer {
  /**
   * 转换为Cytoscape格式
   */
  transform(
    nodes: LayoutedNode[],
    edges: RawEdge[],
    config: StarChartConfig,
    needsCytoscapeLayout: boolean
  ): any[] {
    console.log('[CytoscapeTransformer] 开始转换数据格式')
    
    // 创建节点ID到颜色的映射（性能优化）
    const nodeColorMap = new Map<string, string>()
    
    const cytoscapeNodes = nodes.map(node => {
      const nodeColor = node.color || '#999'
      nodeColorMap.set(node.id, nodeColor)
      
      // 预计算节点的边框颜色（用于高亮状态）
      const borderColor = nodeColor
      const highlightBorderColor = nodeColor
      
      const element: any = {
        data: {
          id: node.id,
          name: node.name,
          score: node.score || 0.5,
          type: node.type,
          color: nodeColor,
          hierarchy: node.hierarchy || 3,
          // 预计算的样式属性
          borderColor: borderColor,
          highlightBorderColor: highlightBorderColor,
          // 预计算节点大小（避免mapData函数调用）
          nodeWidth: this.calculateNodeSize(node, config),
          nodeHeight: this.calculateNodeSize(node, config)
        },
        group: 'nodes' as const
      }
      
      // 如果布局已计算位置（同心圆），传递position
      // 如果需要Cytoscape计算（力导向），不传递position
      if (!needsCytoscapeLayout && node.position) {
        element.position = node.position
      }
      
      return element
    })
    
    // 预先计算边的所有样式属性（避免拖动时动态计算导致卡顿）
    const cytoscapeEdges = edges.map((edge, index) => {
      const sourceColor = nodeColorMap.get(edge.source) || '#999'
      const targetColor = nodeColorMap.get(edge.target) || '#999'
      // 同色用该色，异色用源节点色
      const edgeColor = sourceColor === targetColor ? sourceColor : sourceColor
      
      // 预计算弧线控制点距离（基于边的索引，避免字符串解析）
      const controlPointDistance = ((index % 100) - 50) * 0.8 // 降低弧度变化范围
      
      // 预计算边宽度
      const edgeWidth = Math.max(1, Math.min(4, 1 + (edge.weight || 0.5) * 3))
      
      return {
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          weight: edge.weight || 0.5,
          type: edge.type,
          label: edge.label,
          // 预计算的样式属性
          edgeColor: edgeColor,
          edgeWidth: edgeWidth,
          controlPointDistance: controlPointDistance,
          targetArrowColor: edgeColor
        },
        group: 'edges' as const
      }
    })
    
    console.log(`[CytoscapeTransformer] 转换完成：${cytoscapeNodes.length} 节点，${cytoscapeEdges.length} 边`)
    return [...cytoscapeNodes, ...cytoscapeEdges]
  }
  
  /**
   * 计算节点大小
   */
  private calculateNodeSize(node: LayoutedNode, config: StarChartConfig): number {
    const baseSize = config.nodeStyle.defaultSize * config.nodeStyle.sizeMultiplier
    return Math.max(20, Math.min(60, baseSize + (node.score || 0.5) * 20))
  }
}

