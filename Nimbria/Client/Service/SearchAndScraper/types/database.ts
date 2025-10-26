/**
 * SearchAndScraper 数据库相关类型
 * 
 * 遵循类型通用规范：前端定义数据结构，后端转发导入
 */

/**
 * 批次数据（数据库原始结构）
 */
export interface NovelBatchRow {
  id: string
  name: string
  description: string | null
  total_matched: number
  total_scraped: number
  created_at: string
  updated_at: string
}

/**
 * 批次数据（前端使用，驼峰命名）
 */
export interface NovelBatch {
  id: string
  name: string
  description: string | null
  totalMatched: number
  totalScraped: number
  createdAt: Date
  updatedAt: Date
}

/**
 * 创建批次的参数
 */
export interface CreateNovelBatchParams {
  name: string
  description?: string
}

/**
 * 批次统计更新参数
 */
export interface UpdateNovelBatchStatsParams {
  totalMatched?: number
  totalScraped?: number
}

/**
 * 将数据库行转换为前端对象
 */
export function mapBatchRowToBatch(row: NovelBatchRow): NovelBatch {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    totalMatched: row.total_matched,
    totalScraped: row.total_scraped,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

