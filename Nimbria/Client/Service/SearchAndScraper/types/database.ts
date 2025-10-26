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

/**
 * 匹配章节数据（数据库原始结构）
 */
export interface NovelMatchedChapterRow {
  id: string
  batch_id: string
  chapter_index: number
  title: string
  url: string
  site_domain: string | null
  is_selected: number
  created_at: string
}

/**
 * 匹配章节数据（前端使用，驼峰命名）
 */
export interface NovelMatchedChapter {
  id: string
  batchId: string
  chapterIndex: number
  title: string
  url: string
  siteDomain: string | null
  isSelected: boolean
  createdAt: Date
}

/**
 * 保存匹配章节的参数
 */
export interface SaveMatchedChaptersParams {
  batchId: string
  chapters: Array<{
    title: string
    url: string
  }>
  sourcePageUrl?: string
}

/**
 * 保存匹配章节的返回结果（包含生成的ID）
 */
export interface SaveMatchedChaptersResult {
  success: boolean
  error?: string
  chapters?: Array<{
    id: string
    title: string
    url: string
    chapterIndex: number
  }>
}

/**
 * 将匹配章节数据库行转换为前端对象
 */
export function mapMatchedChapterRowToChapter(row: NovelMatchedChapterRow): NovelMatchedChapter {
  return {
    id: row.id,
    batchId: row.batch_id,
    chapterIndex: row.chapter_index,
    title: row.title,
    url: row.url,
    siteDomain: row.site_domain,
    isSelected: row.is_selected === 1,
    createdAt: new Date(row.created_at)
  }
}

// ==================== 爬取章节类型（Iteration 3）====================

/**
 * 爬取章节数据（数据库原始结构）
 */
export interface NovelScrapedChapterRow {
  id: string
  batch_id: string
  matched_chapter_id: string
  title: string
  url: string
  content: string
  summary: string | null
  word_count: number
  scrape_duration: number
  created_at: string
}

/**
 * 爬取章节数据（前端使用）
 */
export interface NovelScrapedChapter {
  id: string
  batchId: string
  matchedChapterId: string
  title: string
  url: string
  content: string
  summary: string | null
  wordCount: number
  scrapeDuration: number
  createdAt: Date
}

/**
 * 批次统计摘要
 */
export interface NovelBatchSummary {
  totalMatched: number
  totalScraped: number
  totalWords: number
  avgScrapeDuration: number
}

/**
 * 将爬取章节数据库行转换为前端对象
 */
export function mapScrapedChapterRowToChapter(row: NovelScrapedChapterRow): NovelScrapedChapter {
  return {
    id: row.id,
    batchId: row.batch_id,
    matchedChapterId: row.matched_chapter_id,
    title: row.title,
    url: row.url,
    content: row.content,
    summary: row.summary,
    wordCount: row.word_count,
    scrapeDuration: row.scrape_duration,
    createdAt: new Date(row.created_at)
  }
}

