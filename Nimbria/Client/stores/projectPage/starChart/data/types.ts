/**
 * StarChart 数据类型定义
 * 基于G6原生格式设计
 */

/**
 * G6标准节点格式（原生）
 */
export interface G6Node {
  id: string
  label?: string        // 节点标签
  x?: number           // 位置（可选，布局算法会计算）
  y?: number
  size?: number        // 节点大小
  color?: string       // 节点颜色
  img?: string         // 图标URL（支持SVG DataURL）
  // 业务扩展字段
  type?: string
  score?: number
  hierarchy?: number
  [key: string]: any   // 允许任意扩展字段
}

/**
 * G6标准边格式（原生）
 */
export interface G6Edge {
  id?: string
  source: string       // 源节点ID
  target: string       // 目标节点ID
  label?: string       // 边标签
  weight?: number      // 权重
  type?: string        // 类型
  [key: string]: any   // 允许任意扩展字段
}

/**
 * G6标准图数据格式（原生）
 */
export interface G6GraphData {
  nodes: G6Node[]
  edges: G6Edge[]
}

/**
 * 数据源类型
 */
export type DataSourceType = 
  | 'mock-normal'       // 测试数据A（30节点）
  | 'mock-large'        // 测试数据B（100节点）
  | 'mcrecipe-static'   // MC配方静态数据
  | 'gun'               // GUN动态数据源
  | 'api'               // API数据源

/**
 * 数据加载选项
 */
export interface LoadOptions {
  cache?: boolean
  timeout?: number
  [key: string]: any
}
