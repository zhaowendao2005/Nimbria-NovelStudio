/**
 * G6 类型定义扩展
 * 从 @antv/g6 导入并扩展必要的类型
 */

import type {
  GraphData,
  NodeData,
  EdgeData,
} from '@antv/g6'

// ==================== 基础数据类型 ====================

/**
 * G6 节点数据（完整类型）
 */
export interface G6NodeData {
  id: string
  data?: Record<string, unknown>
  style?: NodeStyleData
  [key: string]: unknown
}

/**
 * G6 边数据（完整类型）
 */
export interface G6EdgeData {
  id?: string
  source: string
  target: string
  data?: Record<string, unknown>
  style?: EdgeStyleData
  type?: string
  [key: string]: unknown
}

/**
 * 树节点数据
 */
export interface TreeNodeData {
  id: string
  data?: Record<string, unknown>
  children?: TreeNodeData[]
  [key: string]: unknown
}

/**
 * G6 图数据（扩展支持树结构）
 */
export interface G6GraphData {
  nodes: G6NodeData[]
  edges: G6EdgeData[]
  
  // 树布局相关元数据（cubic-radial等树布局必需）
  tree?: TreeNodeData
  treesData?: TreeNodeData[]
  rootIds?: string[]
  
  [key: string]: unknown
}

// ==================== 样式类型 ====================

/**
 * 节点样式数据
 */
export interface NodeStyleData {
  x?: number
  y?: number
  z?: number
  size?: number
  fill?: string
  stroke?: string
  lineWidth?: number
  opacity?: number
  fillOpacity?: number
  strokeOpacity?: number
  shadowColor?: string
  shadowBlur?: number
  shadowOffsetX?: number
  shadowOffsetY?: number
  [key: string]: unknown
}

/**
 * 边样式数据
 */
export interface EdgeStyleData {
  stroke?: string
  lineWidth?: number
  opacity?: number
  lineDash?: number[]
  lineAppendWidth?: number
  [key: string]: unknown
}

/**
 * 节点样式函数类型
 */
export type NodeStyleFunction = (node: G6NodeData) => NodeStyleData

/**
 * 边样式函数类型
 */
export type EdgeStyleFunction = (edge: G6EdgeData) => EdgeStyleData

/**
 * 节点类型函数
 */
export type NodeTypeFunction = (node: G6NodeData) => string

/**
 * 边类型函数
 */
export type EdgeTypeFunction = (edge: G6EdgeData) => string

// ==================== 样式规则类型 ====================

/**
 * 节点样式规则（可以是静态对象或动态函数）
 */
export type NodeStyleRule = NodeStyleData | NodeStyleFunction

/**
 * 边样式规则（可以是静态对象或动态函数）
 */
export type EdgeStyleRule = EdgeStyleData | EdgeStyleFunction

/**
 * 样式规则集合
 */
export interface StyleRules {
  node?: NodeStyleRule
  edge?: EdgeStyleRule
}

/**
 * 用户样式配置
 */
export interface UserStyleConfig {
  node?: NodeStyleFunction
  edge?: EdgeStyleFunction
}

/**
 * 最终样式规则（经过合并后的函数）
 */
export interface FinalStyleRules {
  node: NodeStyleFunction
  edge: EdgeStyleFunction
}

// ==================== 布局类型 ====================

/**
 * 布局选项
 */
export interface LayoutOptions {
  width?: number
  height?: number
  center?: [number, number]
  [key: string]: unknown
}

/**
 * 布局结果（必须包含完整的图数据和树结构信息）
 */
export interface LayoutResult extends G6GraphData {
  // 继承 G6GraphData 的所有字段
  // 布局计算后应保留所有原始字段
  nodes: G6NodeData[]
  edges: G6EdgeData[]
}

// ==================== 交互事件类型 ====================

/**
 * G6 事件对象
 */
export interface G6Event {
  itemId?: string
  itemType?: 'node' | 'edge' | 'canvas'
  target?: unknown
  x?: number
  y?: number
  zoom?: number
  translate?: { x: number; y: number }
  [key: string]: unknown
}

/**
 * 视口信息
 */
export interface ViewportInfo {
  zoom: number
  pan: { x: number; y: number }
}

// ==================== G6 配置类型 ====================

/**
 * G6 图配置（简化版）- 已废弃，使用 G6 原生配置
 * @deprecated
 */
export type G6GraphConfig = Record<string, unknown>

/**
 * 行为配置（已废弃）
 * @deprecated
 */
export type BehaviorConfig = Record<string, unknown>

// ==================== 配置Schema类型 ====================

/**
 * 配置项值类型
 */
export type ConfigValue = string | number | boolean | unknown

/**
 * 配置项选项
 */
export interface ConfigOption {
  label: string
  value: ConfigValue
}

/**
 * 配置项定义
 */
export interface ConfigItem {
  type: 'slider' | 'select' | 'switch' | 'input'
  label: string
  default?: ConfigValue
  description?: string
  min?: number
  max?: number
  step?: number
  options?: ConfigOption[]
}

/**
 * 配置组
 */
export interface ConfigGroup {
  type: 'group'
  label: string
  children: Record<string, ConfigItem>
}

/**
 * 配置Schema
 */
export type ConfigSchema = Record<string, ConfigItem | ConfigGroup>

// ==================== 辅助类型 ====================

/**
 * 节点样式映射
 */
export type NodeStyleMap = Record<string, Partial<NodeStyleData>>

/**
 * 边样式映射
 */
export type EdgeStyleMap = Record<string, Partial<EdgeStyleData>>

/**
 * 节点位置
 */
export interface NodePosition {
  x: number
  y: number
  z?: number
}

/**
 * 适配后的数据（泛型）
 */
export interface AdaptedData extends G6GraphData {
  // 继承 G6GraphData，确保包含树结构信息
}

// ==================== 导出原始G6类型 ====================

export type {
  GraphData,
  NodeData,
  EdgeData,
}

