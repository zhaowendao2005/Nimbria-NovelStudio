/**
 * StarChart 数据域内部类型
 */

import type { GraphData } from '../Core'

// ==================== 数据加载内部状态 ====================

export interface DataLoaderState {
  sourceId: string
  status: 'idle' | 'loading' | 'loaded' | 'error'
  data?: GraphData
  error?: Error
  progress?: number
}

// ==================== 数据转换内部 ====================

export interface TransformContext {
  sourceType: string
  targetType: string
  options?: Record<string, any>
}

// ==================== 缓存内部 ====================

export interface CacheEntry<T> {
  key: string
  value: T
  createdAt: number
  expiresAt?: number
  accessCount: number
  lastAccessedAt: number
}

export interface CacheConfig {
  maxSize: number
  maxAge?: number
  evictionPolicy: 'lru' | 'lfu' | 'fifo'
}
