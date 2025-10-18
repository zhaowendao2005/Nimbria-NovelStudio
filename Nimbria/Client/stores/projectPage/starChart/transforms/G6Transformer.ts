/**
 * G6Transformer
 * 将布局后的节点和边转换为 G6 图形库的数据格式
 */
import type { LayoutedNode, RawEdge } from '../data/types'
import type { StarChartConfig } from '../starChart.config.types'

/**
 * G6 节点数据格式
 */
export interface G6Node {
  id: string
  data: {
    name: string
    score: number
    type: string
    hierarchy: number
    color: string
    // SVG图标相关
    svgIcon?: any
  }
  style: {
    fill: string
    size: number
    stroke: string
    lineWidth: number
  }
  x?: number
  y?: number
}

/**
 * G6 边数据格式
 */
export interface G6Edge {
  id: string
  source: string
  target: string
  data: {
    weight: number
    type?: string
    label?: string
  }
  style: {
    stroke: string
    lineWidth: number
    endArrow?: {
      path: string
      fill: string
    }
  }
}

/**
 * G6 图数据格式
 */
export interface G6Data {
  nodes: G6Node[]
  edges: G6Edge[]
}

/**
 * G6 数据转换器
 */
export class G6Transformer {
  /**
   * 转换为 G6 格式
   * @param nodes 布局后的节点（带位置）
   * @param edges 原始边数据
   * @param config StarChart 配置
   * @param needsG6Layout 是否需要 G6 计算布局（false=使用预计算位置）
   */
  transform(
    nodes: LayoutedNode[],
    edges: RawEdge[],
    config: StarChartConfig,
    needsG6Layout: boolean
  ): G6Data {
    console.log('[G6Transformer] 开始转换数据格式')
    console.log(`[G6Transformer] 节点数: ${nodes.length}, 边数: ${edges.length}`)
    console.log(`[G6Transformer] needsG6Layout: ${needsG6Layout}`)
    
    // 创建节点ID到颜色的映射（性能优化）
    const nodeColorMap = new Map<string, string>()
    
    const g6Nodes: G6Node[] = nodes.map(node => {
      const nodeColor = node.color || '#999'
      nodeColorMap.set(node.id, nodeColor)
      
      // 预计算节点的样式
      const nodeSize = this.calculateNodeSize(node, config)
      
      const g6Node: G6Node = {
        id: node.id,
        data: {
          name: node.name,
          score: node.score || 0.5,
          type: node.type,
          hierarchy: node.hierarchy || 3,
          color: nodeColor,
        },
        style: {
          fill: nodeColor,
          size: nodeSize,
          stroke: nodeColor,
          lineWidth: config.nodeStyle.strokeWidth || 2,
        }
      }
      
      // 如果布局已计算位置（同心圆），传递位置
      // 如果需要 G6 计算（力导向），不传递位置
      if (!needsG6Layout && node.position) {
        g6Node.x = node.position.x
        g6Node.y = node.position.y
      }
      
      return g6Node
    })
    
    // 预先计算边的所有样式属性（避免拖动时动态计算导致卡顿）
    const g6Edges: G6Edge[] = edges.map((edge, index) => {
      const sourceColor = nodeColorMap.get(edge.source) || '#999'
      const targetColor = nodeColorMap.get(edge.target) || '#999'
      // 同色用该色，异色用源节点色
      const edgeColor = sourceColor === targetColor ? sourceColor : sourceColor
      
      // 预计算边宽度
      const edgeWidth = Math.max(1, Math.min(4, config.edgeStyle.defaultEdgeWidth + (edge.weight || 0.5) * 2))
      
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        data: {
          weight: edge.weight || 0.5,
          type: edge.type,
          label: edge.label,
        },
        style: {
          stroke: edgeColor,
          lineWidth: edgeWidth,
          endArrow: {
            path: 'M 0,0 L 8,4 L 8,-4 Z',
            fill: edgeColor,
          },
        }
      }
    })
    
    console.log(`[G6Transformer] 转换完成：${g6Nodes.length} 节点，${g6Edges.length} 边`)
    return { nodes: g6Nodes, edges: g6Edges }
  }
  
  /**
   * 计算节点大小
   */
  private calculateNodeSize(node: LayoutedNode, config: StarChartConfig): number {
    const baseSize = config.nodeStyle.defaultSize * config.nodeStyle.sizeMultiplier
    return Math.max(20, Math.min(60, baseSize + (node.score || 0.5) * 20))
  }
}

