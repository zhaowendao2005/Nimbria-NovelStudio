/**
 * 数据源基础类型定义
 */
import type { LayoutType } from '../../layouts/types'

/**
 * 数据源类别
 */
export type DataSourceCategory = 'static' | 'dynamic'

/**
 * 数据源类型枚举
 */
export type DataSourceType = 
  | 'mock-large'      // 静态：性能测试数据（400节点）
  | 'mock-normal'     // 静态：测试数据A（30节点）
  | 'mcrecipe-static' // 静态：MC配方数据（3.4万配方）
  | 'gun'             // 动态：Gun数据库
  | 'api'             // 动态：REST API

/**
 * 数据源元信息
 */
export interface DataSourceMetadata {
  id: DataSourceType
  name: string
  category: DataSourceCategory
  description: string
  
  // 数据规模
  estimatedNodeCount?: number
  estimatedEdgeCount?: number
  
  // 支持的布局
  recommendedLayouts: LayoutType[]
  requiredLayouts?: LayoutType[]  // 必须使用的布局（某些数据源强制要求）
  
  // 数据特性
  supportsRealtime?: boolean      // 支持实时更新
  supportsIncremental?: boolean   // 支持增量加载
  requiresPreprocessing?: boolean // 需要预处理（如MC配方解析）
}

/**
 * 数据源配置
 */
export interface DataSourceConfig {
  type: DataSourceType
  options?: Record<string, any>
  
  // 静态数据源配置
  staticConfig?: {
    dataPath?: string       // 数据文件路径
    preprocessor?: string   // 预处理器名称
    cacheEnabled?: boolean  // 启用缓存
  }
  
  // 动态数据源配置
  dynamicConfig?: {
    endpoint?: string       // API端点
    authToken?: string
    refreshInterval?: number  // 刷新间隔（ms）
    maxRetries?: number     // 最大重试次数
  }
}

/**
 * 加载选项
 */
export interface LoadOptions {
  offset?: number
  limit?: number
  filter?: Record<string, any>
  includeMetadata?: boolean
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean
  missingFields?: string[]
  errors?: string[]
  warnings?: string[]
}

