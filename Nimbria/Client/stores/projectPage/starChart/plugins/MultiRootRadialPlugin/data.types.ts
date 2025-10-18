/**
 * MultiRootRadialPlugin 数据格式定义
 * 
 * 此文件定义了插件接受的数据格式和 adapter 的目标格式
 * 确保数据契约的明确性和类型安全
 */

import type { G6NodeData, G6EdgeData, TreeNodeData } from '../types'

// ==================== 节点数据要求 ====================

/**
 * 多根径向布局节点数据（必需字段）
 */
export interface RadialNodeData extends G6NodeData {
  id: string
  
  /**
   * 节点数据（包含业务字段）
   */
  data: {
    /**
     * 层级（必需）
     * - 0: 根节点
     * - 1: 一级子节点
     * - 2+: 更深层级
     */
    hierarchy: number
    
    /**
     * 所属组ID（必需）
     * 表示该节点属于哪棵树（对应 rootIds 的索引）
     */
    groupId: number
    
    /**
     * 节点标签（可选）
     */
    label?: string
    
    /**
     * 节点类型（可选）
     */
    type?: string
    
    /**
     * 其他自定义字段
     */
    [key: string]: unknown
  }
  
  /**
   * 节点样式（可选，布局算法会计算位置）
   */
  style?: {
    size?: number
    fill?: string
    stroke?: string
    x?: number  // 布局算法会覆盖
    y?: number  // 布局算法会覆盖
    [key: string]: unknown
  }
}

/**
 * 边数据要求
 */
export interface RadialEdgeData extends G6EdgeData {
  source: string
  target: string
  
  /**
   * 边数据（可选）
   */
  data?: {
    /**
     * 权重（可选）
     */
    weight?: number
    
    /**
     * 其他自定义字段
     */
    [key: string]: unknown
  }
  
  /**
   * 边类型（布局算法会自动判断，通常不需要手动设置）
   * - 'line': 根节点到一级子节点（自动）
   * - 'cubic-radial': 其他边（自动）
   */
  type?: string
}

// ==================== 输入数据格式 ====================

/**
 * 输入格式1: 完整的图数据格式（推荐）
 * 
 * @example
 * ```typescript
 * const data: RadialGraphDataInput = {
 *   nodes: [
 *     { id: 'root1', data: { hierarchy: 0, groupId: 0 } },
 *     { id: 'child1', data: { hierarchy: 1, groupId: 0 } }
 *   ],
 *   edges: [
 *     { source: 'root1', target: 'child1' }
 *   ],
 *   rootIds: ['root1'],
 *   treesData: [...],  // 可选
 *   tree: {...}        // 可选
 * }
 * ```
 */
export interface RadialGraphDataInput {
  /**
   * 节点列表（必需）
   */
  nodes: RadialNodeData[]
  
  /**
   * 边列表（必需）
   */
  edges: RadialEdgeData[]
  
  /**
   * 根节点ID列表（必需）
   * 按顺序对应 groupId 0, 1, 2...
   */
  rootIds: string[]
  
  /**
   * 多树结构数据（可选，用于 cubic-radial 边渲染）
   */
  treesData?: TreeNodeData[]
  
  /**
   * 单树结构数据（可选）
   */
  tree?: TreeNodeData
  
  /**
   * 其他扩展字段
   */
  [key: string]: unknown
}

/**
 * 输入格式2: 单树格式
 * 
 * adapter 会自动转换为 RadialGraphDataInput
 * 
 * @example
 * ```typescript
 * const data: TreeNodeData = {
 *   id: 'root',
 *   data: { hierarchy: 0, groupId: 0 },
 *   children: [
 *     { id: 'child1', data: { hierarchy: 1, groupId: 0 } }
 *   ]
 * }
 * ```
 */
export type RadialTreeInput = TreeNodeData

/**
 * 插件接受的所有输入格式
 */
export type RadialPluginInput = RadialGraphDataInput | RadialTreeInput

// ==================== Adapter 输出格式 ====================

/**
 * Adapter 输出的标准化数据格式
 * 
 * 这是布局算法期望接收的格式
 */
export interface RadialAdapterOutput {
  /**
   * 节点列表（必需，已标准化）
   */
  nodes: RadialNodeData[]
  
  /**
   * 边列表（必需）
   */
  edges: RadialEdgeData[]
  
  /**
   * 根节点ID列表（必需）
   */
  rootIds: string[]
  
  /**
   * 多树结构（必需，即使只有一棵树也转为数组）
   */
  treesData: TreeNodeData[]
  
  /**
   * 单树结构（可选，通常是 treesData[0]）
   */
  tree?: TreeNodeData
  
  /**
   * 允许其他扩展字段
   */
  [key: string]: unknown
}

// ==================== 数据验证 ====================

/**
 * 节点数据验证器
 */
export interface NodeDataValidator {
  /**
   * 检查节点是否符合要求
   */
  validate(node: G6NodeData): node is RadialNodeData
  
  /**
   * 获取验证错误信息
   */
  getErrors(node: G6NodeData): string[]
}

/**
 * 图数据验证器
 */
export interface GraphDataValidator {
  /**
   * 检查图数据是否符合要求
   */
  validate(data: unknown): data is RadialGraphDataInput
  
  /**
   * 获取验证错误信息
   */
  getErrors(data: unknown): string[]
}

// ==================== 数据转换工具类型 ====================

/**
 * 节点数据填充选项
 * 
 * 用于自动补全缺失的字段
 */
export interface NodeDataFillOptions {
  /**
   * 默认节点大小
   */
  defaultSize?: number
  
  /**
   * 默认颜色
   */
  defaultColor?: string
  
  /**
   * 是否自动推断层级（如果节点缺少 hierarchy 字段）
   */
  inferHierarchy?: boolean
  
  /**
   * 是否自动推断 groupId（如果节点缺少 groupId 字段）
   */
  inferGroupId?: boolean
}

/**
 * 数据标准化选项
 */
export interface DataNormalizationOptions {
  /**
   * 节点填充选项
   */
  nodeFillOptions?: NodeDataFillOptions
  
  /**
   * 是否严格模式（缺少必需字段时抛出错误）
   */
  strict?: boolean
  
  /**
   * 是否自动生成 rootIds（基于 hierarchy=0 的节点）
   */
  autoGenerateRootIds?: boolean
}

// ==================== 类型导出 ====================

/**
 * 重新导出常用类型
 */
export type {
  G6NodeData,
  G6EdgeData,
  TreeNodeData
}

/**
 * 类型守卫：检查是否为径向图数据
 */
export function isRadialGraphData(data: unknown): data is RadialGraphDataInput {
  if (typeof data !== 'object' || data === null) return false
  
  const d = data as Record<string, unknown>
  
  return (
    Array.isArray(d.nodes) &&
    Array.isArray(d.edges) &&
    Array.isArray(d.rootIds) &&
    (d.rootIds as unknown[]).length > 0
  )
}

/**
 * 类型守卫：检查是否为树数据
 */
export function isTreeData(data: unknown): data is TreeNodeData {
  if (typeof data !== 'object' || data === null) return false
  
  const d = data as Record<string, unknown>
  
  return (
    typeof d.id === 'string' &&
    ('children' in d || 'data' in d)
  )
}

/**
 * 类型守卫：检查节点是否符合径向布局要求
 */
export function isValidRadialNode(node: G6NodeData): node is RadialNodeData {
  if (!node.id || !node.data) return false
  
  const data = node.data
  
  return (
    typeof data.hierarchy === 'number' &&
    typeof data.groupId === 'number' &&
    data.hierarchy >= 0 &&
    data.groupId >= 0
  )
}

