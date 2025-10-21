/**
 * StarChart 数据域对外接口类型
 */

import type { NodeData, EdgeData, GraphData } from '../Core'

// ==================== 数据源接口 ====================

export interface DataSourceAPI {
  /**
   * 加载数据
   */
  load(sourceId: string): Promise<GraphData>

  /**
   * 保存数据
   */
  save(sourceId: string, data: GraphData): Promise<void>

  /**
   * 删除数据
   */
  delete(sourceId: string): Promise<void>

  /**
   * 列表数据源
   */
  list(): Promise<DataSourceInfo[]>
}

export interface DataSourceInfo {
  id: string
  name: string
  type: string
  createdAt: number
  updatedAt: number
  size: number
}

// ==================== 数据验证 ====================

export interface DataValidator {
  /**
   * 验证图数据
   */
  validateGraph(data: GraphData): ValidationResult

  /**
   * 验证节点
   */
  validateNode(node: NodeData): ValidationResult

  /**
   * 验证边
   */
  validateEdge(edge: EdgeData): ValidationResult
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  value?: any
}

export interface ValidationWarning {
  field: string
  message: string
}

// ==================== 数据转换 ====================

export interface DataTransformResult {
  data: GraphData
  stats: TransformStats
  metadata?: Record<string, any>
}

export interface TransformStats {
  nodeCount: number
  edgeCount: number
  transformTime: number
  warnings?: string[]
}
