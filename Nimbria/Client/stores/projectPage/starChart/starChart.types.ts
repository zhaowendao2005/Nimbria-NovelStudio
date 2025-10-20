/**
 * StarChart 核心类型定义
 * 用于图数据可视化面板
 */

/**
 * 节点类型
 */
export interface GraphNode {
  id: string
  label: string
  type?: string
  properties?: Record<string, any>
  x?: number
  y?: number
}

/**
 * 边/关系类型
 */
export interface GraphEdge {
  id: string
  source: string
  target: string
  label?: string
  type?: string
  properties?: Record<string, any>
}

/**
 * 图数据结构
 */
export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/**
 * StarChart 配置类型
 */
export interface StarChartConfig {
  layoutType: 'force' | 'tree' | 'circle' | 'grid'
  showLabels: boolean
  nodeSize: number
  edgeWidth: number
  enableZoom: boolean
  enableDrag: boolean
}

/**
 * 可视化视口状态
 */
export interface ViewportState {
  scale: number
  offsetX: number
  offsetY: number
}

/**
 * 导出配置
 */
export interface ExportConfig {
  format: 'json' | 'png' | 'svg'
  includeMetadata: boolean
}

