/**
 * StarChart 数据类型定义
 * 基于G6原生格式设计
 */

// 从统一的类型定义导入
import type { 
  G6NodeData, 
  G6EdgeData, 
  G6GraphData,
  TreeNodeData
} from '../types/g6.types'

/**
 * 重新导出 G6 类型（为了保持兼容性）
 */
export type G6Node = G6NodeData
export type G6Edge = G6EdgeData
export { 
  G6GraphData,
  TreeNodeData
}

/**
 * 数据源类型
 */
export type DataSourceType = 
  | 'mock-normal'       // 测试数据A（30节点）
  | 'mock-xlarge'       // 测试数据C（10000节点）
  | 'mock-large'        // 测试数据B（400节点）
  | 'mcrecipe-static'   // MC配方静态数据
  | 'gun'               // GUN动态数据源
  | 'api'               // API数据源

/**
 * 数据加载选项
 */
export interface LoadOptions {
  cache?: boolean
  timeout?: number
  [key: string]: unknown
}
