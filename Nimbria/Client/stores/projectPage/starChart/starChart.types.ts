/**
 * StarChart 核心类型定义
 */

// 节点数据结构
export interface StarChartNode {
  id: string
  name: string
  type?: string          // 节点类型 (角色/地点/事件等)
  score?: number         // 重要性评分 (影响节点大小)
  color?: string         // 节点颜色
  metadata?: Record<string, unknown>
}

// 边数据结构
export interface StarChartEdge {
  id: string
  source: string         // 源节点 ID
  target: string         // 目标节点 ID
  weight?: number        // 权重 (影响边粗细)
  type?: string          // 关系类型
  label?: string         // 边标签
  metadata?: Record<string, unknown>
}

// 图数据结构
export interface StarChartGraphData {
  nodes: StarChartNode[]
  edges: StarChartEdge[]
}

// Cytoscape 元素类型 (兼容 Cytoscape.js 格式)
export interface CytoscapeElement {
  data: {
    id: string
    name?: string
    source?: string
    target?: string
    weight?: number
    score?: number
    [key: string]: unknown
  }
  group?: 'nodes' | 'edges'
}

// 布局配置
export interface LayoutConfig {
  name: 'fcose' | 'grid' | 'circle' | 'cose'
  nodeRepulsion?: number
  idealEdgeLength?: number
  animate?: boolean
  randomize?: boolean
}

// 视图状态
export interface ViewportState {
  zoom: number
  pan: { x: number; y: number }
}

