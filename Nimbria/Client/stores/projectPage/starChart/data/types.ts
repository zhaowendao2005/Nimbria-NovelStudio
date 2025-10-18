/**
 * StarChart 数据层类型定义
 * 原始图数据（不包含位置信息）
 */

/**
 * 原始图数据
 */
export interface RawGraphData {
  nodes: RawNode[]
  edges: RawEdge[]
  metadata?: GraphMetadata
}

/**
 * 原始节点（无位置）
 */
export interface RawNode {
  id: string
  name: string
  type: string
  score?: number         // 节点重要性（0-1）
  color?: string         // 节点颜色
  hierarchy?: number     // 节点层级（1-5）- 随机分配或从数据中获取
  metadata?: Record<string, any>  // 扩展元数据
}

/**
 * 原始边
 */
export interface RawEdge {
  id: string
  source: string
  target: string
  type?: string
  weight?: number        // 边权重（0-1）
  label?: string
}

/**
 * 图元数据
 */
export interface GraphMetadata {
  groupCount?: number    // 分组数量（用于同心圆布局）
  groups?: GroupInfo[]   // 分组信息
}

export interface GroupInfo {
  id: number
  name: string
  nodeIds: string[]
  color?: string
}

/**
 * 布局后的节点（带位置）
 */
export interface LayoutedNode extends RawNode {
  position: { x: number; y: number }
}

/**
 * 数据源类型
 */
export type DataSourceType = 'mock-large' | 'mock-normal' | 'gun'

