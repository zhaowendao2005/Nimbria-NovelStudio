/**
 * StarChart Service层类型定义
 */

import type { GraphData } from '@stores/projectPage/starChart'

/**
 * 图数据加载请求
 */
export interface LoadGraphRequest {
  projectId?: string
  filter?: GraphFilter
}

/**
 * 图数据过滤器
 */
export interface GraphFilter {
  nodeTypes?: string[]
  edgeTypes?: string[]
  searchTerm?: string
}

/**
 * 图数据保存请求
 */
export interface SaveGraphRequest {
  projectId?: string
  data: GraphData
}

/**
 * 服务响应
 */
export interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: string
}

