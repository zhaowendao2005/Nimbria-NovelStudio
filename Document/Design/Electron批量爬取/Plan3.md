## 📋 需求分析

### 核心业务场景
1. **批次管理**：用户可以创建多个爬取批次（例如不同小说、不同章节范围）
2. **数据隔离**：每个批次独立存储匹配的章节列表和爬取的章节内容
3. **选择器学习**：全局记录不同网站的智能选择器，跨项目复用

### 数据流程
```
用户创建批次 
  ↓
【Iteration 2】智能匹配章节列表
  - 当前页面：目录页（同构）
  - 批量提取：章节标题 + URL
  - 存储到：matched_chapters 表
  - 学习：chapter_list_selector → site_selectors 表
  ↓
【Iteration 3】爬取章节内容
  - 遍历每个章节URL
  - 逐个提取：正文内容 + 摘要
  - 存储到：scraped_chapters 表
  - 学习：chapter_content_selector → site_selectors 表
```

### 🎯 两种操作的本质区别

| 维度 | Iteration 2：匹配章节列表 | Iteration 3：爬取章节内容 |
|------|------------------------|------------------------|
| **操作对象** | 目录页（1页或多页） | 每个章节页（N个） |
| **页面特征** | 同构（结构相同） | 可能结构不同 |
| **提取内容** | 章节标题 + URL（元数据） | 正文内容 + 摘要 |
| **操作方式** | **批量**提取 | **逐个**遍历 |
| **选择器** | `chapter_list_selector` | `chapter_content_selector` |
| **数据库表** | `matched_chapters` | `scraped_chapters` |
| **示例选择器** | `.chapter-list a` | `.read-content p` |
| **BrowserView位置** | 停留在目录页 | 遍历每个章节页 |

---

## 🗄️ 数据库 Schema 设计

### 1️⃣ 项目数据库 Schema（存储在项目目录 `.Database/project.db`）

按照数据库修改工作流，我需要创建新版本的 Schema：

```typescript
// ==================== 批次表（简化版 - Iteration 1已实现）====================
export interface SearchAndScraperNovelBatch {
  id: string                    // 批次ID（主键）
  name: string                  // 批次名称（用户自定义）
  description?: string          // 批次描述（可选）
  
  // 统计信息
  total_matched: number         // 匹配到的章节总数
  total_scraped: number         // 已爬取的章节总数
  
  // 时间戳
  created_at: string
  updated_at: string
}

const SEARCH_AND_SCRAPER_NOVEL_BATCH_TABLE: TableDefinition = {
  name: 'SearchAndScraper_novel_batch',
  sql: `CREATE TABLE IF NOT EXISTS SearchAndScraper_novel_batch (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    
    total_matched INTEGER DEFAULT 0,
    total_scraped INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  indexes: [
    `CREATE INDEX IF NOT EXISTS idx_novel_batch_updated ON SearchAndScraper_novel_batch(updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_novel_batch_name ON SearchAndScraper_novel_batch(name)`
  ]
}

/**
 * 🎯 批次表设计理念（Iteration 1决策）
 * 
 * 采用**简化设计**，不绑定来源URL，理由：
 * 1. ✅ 用户可能在不同页面匹配章节（提升灵活性）
 * 2. ✅ 一个批次可以包含来自多个来源的章节（支持合集）
 * 3. ✅ 批次作为纯粹的"组织容器"，不限定数据来源
 * 
 * URL信息存储策略：
 * - 批次级别：仅存储 name + description
 * - 章节级别：每个章节存储完整的 url 字段
 * - 选择器关联：从章节URL或当前BrowserView的URL提取域名
 * 
 * 工作流程：
 * 1. 用户创建批次（填写名称和描述）
 * 2. 用户手动在BrowserView中打开目录页
 * 3. 点击"智能匹配章节列表"，前端传递当前页面URL给后端
 * 4. 后端从URL提取域名，用于关联全局选择器表
 * 5. 章节信息（包括URL）存储在matched_chapters表中
 */

// ==================== 匹配章节表 ====================
export interface SearchAndScraperNovelMatchedChapter {
  id: string                    // 章节ID（主键）
  batch_id: string              // 所属批次ID（外键）
  
  title: string                 // 章节标题
  url: string                   // 章节URL
  chapter_index: number         // 章节序号（匹配时的顺序）
  
  is_selected: boolean          // 是否被用户选择爬取（默认全选）
  is_scraped: boolean           // 是否已爬取
  
  created_at: string
}

const SEARCH_AND_SCRAPER_NOVEL_MATCHED_CHAPTERS_TABLE: TableDefinition = {
  name: 'SearchAndScraper_novel_matched_chapters',
  sql: `CREATE TABLE IF NOT EXISTS SearchAndScraper_novel_matched_chapters (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    chapter_index INTEGER NOT NULL,
    
    is_selected BOOLEAN DEFAULT 1,
    is_scraped BOOLEAN DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (batch_id) REFERENCES SearchAndScraper_novel_batch(id) ON DELETE CASCADE
  )`,
  indexes: [
    `CREATE INDEX IF NOT EXISTS idx_matched_chapters_batch ON SearchAndScraper_novel_matched_chapters(batch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_matched_chapters_index ON SearchAndScraper_novel_matched_chapters(batch_id, chapter_index)`
  ]
}

// ==================== 爬取章节表 ====================
export interface SearchAndScraperNovelScrapedChapter {
  id: string                    // 章节ID（主键，与matched_chapter.id一致）
  batch_id: string              // 所属批次ID（外键）
  matched_chapter_id: string    // 对应的匹配章节ID
  
  title: string                 // 章节标题
  url: string                   // 章节URL
  content: string               // 章节正文内容
  summary: string               // 章节摘要（前200字）
  
  word_count: number            // 字数统计
  scrape_duration: number       // 爬取耗时（毫秒）
  
  created_at: string            // 爬取时间
}

const SEARCH_AND_SCRAPER_NOVEL_SCRAPED_CHAPTERS_TABLE: TableDefinition = {
  name: 'SearchAndScraper_novel_scraped_chapters',
  sql: `CREATE TABLE IF NOT EXISTS SearchAndScraper_novel_scraped_chapters (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    matched_chapter_id TEXT NOT NULL,
    
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    
    word_count INTEGER DEFAULT 0,
    scrape_duration INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (batch_id) REFERENCES SearchAndScraper_novel_batch(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_chapter_id) REFERENCES SearchAndScraper_novel_matched_chapters(id)
  )`,
  indexes: [
    `CREATE INDEX IF NOT EXISTS idx_scraped_chapters_batch ON SearchAndScraper_novel_scraped_chapters(batch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_scraped_chapters_matched ON SearchAndScraper_novel_scraped_chapters(matched_chapter_id)`
  ]
}
```

---

### 2️⃣ 全局数据库 Schema（存储在 AppData `.Database/nimbria.db`）

```typescript
// ==================== 网站选择器配置表 ====================
/**
 * 🎯 两种选择器的本质区别：
 * 
 * 1️⃣ chapter_list_selector（章节列表选择器）
 *    - 用途：从**目录页**批量提取章节标题和URL
 *    - 页面：一页或多页**同构**的目录页
 *    - 时机：Iteration 2 - 匹配章节列表时学习
 *    - 示例：`.chapter-list a`, `.book-catalog li a`
 *    - 特点：批量操作，一次提取多个章节的元数据
 * 
 * 2️⃣ chapter_content_selector（章节内容选择器）
 *    - 用途：从**每个章节页**提取正文内容
 *    - 页面：需要遍历每个章节URL，逐个访问
 *    - 时机：Iteration 3 - 爬取章节内容时学习
 *    - 示例：`.content p`, `#chapter-content`, `.read-content`
 *    - 特点：逐个处理，每个章节页面可能结构不同
 */
export interface SearchAndScraperNovelSiteSelector {
  id: string                    // 主键
  site_domain: string           // 网站域名（唯一键，如 www.qidian.com）
  site_name: string             // 网站名称（用户友好的显示名）
  
  // 选择器配置（两个独立的选择器，分别学习）
  chapter_list_selector: string   // 章节列表选择器（Iteration 2学习）
  chapter_content_selector: string // 章节内容选择器（Iteration 3学习）
  
  // 特殊逻辑处理（占位，JSON 序列化）
  special_logic?: string        // { type: 'pagination', config: {...} }
  
  // 统计信息
  success_count: number         // 成功使用次数
  last_used_at: string          // 最后使用时间
  
  created_at: string
  updated_at: string
}

const SEARCH_AND_SCRAPER_NOVEL_SITE_SELECTORS_TABLE: TableDefinition = {
  name: 'SearchAndScraper_novel_site_selectors',
  sql: `CREATE TABLE IF NOT EXISTS SearchAndScraper_novel_site_selectors (
    id TEXT PRIMARY KEY,
    site_domain TEXT NOT NULL UNIQUE,
    site_name TEXT NOT NULL,
    
    chapter_list_selector TEXT,
    chapter_content_selector TEXT,
    
    special_logic TEXT,
    
    success_count INTEGER DEFAULT 0,
    last_used_at DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  indexes: [
    `CREATE INDEX IF NOT EXISTS idx_site_selectors_domain ON SearchAndScraper_novel_site_selectors(site_domain)`,
    `CREATE INDEX IF NOT EXISTS idx_site_selectors_last_used ON SearchAndScraper_novel_site_selectors(last_used_at DESC)`
  ]
}
```

---

## 💾 全局数据库渐进式开发改造

### 核心问题（当前状态）

目前全局数据库存在以下问题：

1. **硬编码版本**：`database-manager.ts` 直接使用 `GLOBAL_SCHEMA_V1_0_0`，而不是像项目数据库一样使用 `CURRENT_GLOBAL_SCHEMA_VERSION`
2. **没有版本演进**：所有版本的 `GLOBAL_SCHEMA` 都是直接复制 v1.0.0 的表，从未增加过新表
3. **缺少迁移机制**：没有为全局数据库创建迁移脚本（因为从未变更过）
4. **初始化方式不统一**：全局数据库用 `applySchema`，项目数据库用 `createProjectDatabase`（支持迁移检查）

### 改造方案

#### Step 1: 改造 `database-manager.ts`

**改动位置：** 第11行和第26-56行

```typescript
// ==================== 改造前 ====================
import { GLOBAL_SCHEMA_V1_0_0 } from './schema/versions'

// ==================== 改造后 ====================
import { CURRENT_GLOBAL_SCHEMA_VERSION, CURRENT_PROJECT_SCHEMA_VERSION } from './schema/versions'

// 同时改造 initialize() 方法，支持版本迁移（与项目数据库逻辑一致）
```

改造后的 `initialize()` 方法与 `createProjectDatabase()` 逻辑一致，支持自动版本迁移：

```typescript
async initialize(): Promise<void> {
  try {
    console.log('📦 [DatabaseManager] 初始化全局数据库...')
    console.log('📍 [DatabaseManager] 全局数据库路径:', this.globalDbPath)

    // 确保目录存在
    await fs.ensureDir(path.dirname(this.globalDbPath))

    // 创建数据库连接
    this.globalDb = new Database(this.globalDbPath, {
      verbose: (message) => {
        console.log('🔍 [SQLite]', message)
      }
    })

    // 配置WAL模式
    this.configureDatabase(this.globalDb)

    // ✅ 改进1：动态加载最新版本的全局Schema
    const latestSchema = await this.getLatestGlobalSchema()
    console.log(`📦 [DatabaseManager] 使用全局Schema版本: ${latestSchema.version}`)

    // ✅ 改进2：检查是否需要迁移（与项目数据库一致）
    const currentVersion = this.getCurrentVersion(this.globalDb)
    if (currentVersion && currentVersion !== latestSchema.version) {
      console.log(`🔄 [DatabaseManager] 检测到全局数据库版本差异: ${currentVersion} → ${latestSchema.version}`)
      await this.runMigrations(this.globalDb, currentVersion, latestSchema.version)
    } else if (!currentVersion) {
      // 新数据库，直接应用Schema
      await this.applySchema(this.globalDb, latestSchema)
    }

    // 更新版本信息
    await this.initializeVersionInfo(this.globalDb, latestSchema.version)

    console.log('✅ [DatabaseManager] 全局数据库初始化成功')
  } catch (error) {
    console.error('❌ [DatabaseManager] 全局数据库初始化失败:', error)
    throw error
  }
}

/**
 * ✅ 新增方法：获取最新版本的全局Schema
 */
private async getLatestGlobalSchema(): Promise<SchemaDefinition> {
  const version = CURRENT_GLOBAL_SCHEMA_VERSION
  const versionKey = version.replace(/\./g, '_') // 1.2.4 -> 1_2_4
  const schemaName = `GLOBAL_SCHEMA_V${versionKey}`
  
  try {
    const schemas = await import('./schema/versions')
    const schema = schemas[schemaName as keyof typeof schemas] as SchemaDefinition
    
    if (!schema) {
      throw new Error(`Schema ${schemaName} not found`)
    }
    
    return schema
  } catch (error) {
    console.error(`❌ [DatabaseManager] 无法加载Schema ${schemaName}:`, error)
    throw error
  }
}
```

#### Step 2: 创建 `v1.2.5.schema.ts`

新版本包含项目数据库的 SearchAndScraper 表和全局数据库的网站选择器表。

**关键改进：**
- ✅ 全局数据库也支持版本演进（之前每个版本都直接复制 v1.0.0）
- ✅ 现在可以为全局数据库添加新表，而不是硬编码版本

#### Step 3: 更新 `schema/versions/index.ts`

```typescript
// 添加新版本导出
export { GLOBAL_SCHEMA_V1_2_5, PROJECT_SCHEMA_V1_2_5, MIGRATION_1_2_4_TO_1_2_5 } from './v1.2.5.schema'

// 更新当前版本号
export const CURRENT_GLOBAL_SCHEMA_VERSION = '1.2.5'
export const CURRENT_PROJECT_SCHEMA_VERSION = '1.2.5'
```

#### Step 4: 更新 `project-database.ts`

```typescript
// 第8行改为
import { CURRENT_PROJECT_SCHEMA_VERSION } from './schema/versions'
// 代码逻辑无需修改，因为它本来就是使用动态版本
```

### 改造效果对比

| 维度 | 改造前 | 改造后 |
|-----|-------|-------|
| **全局数据库初始化** | 硬编码 v1.0.0 | 动态加载最新版本 |
| **全局数据库迁移** | ❌ 不支持 | ✅ 支持版本迁移 |
| **全局Schema演进** | ❌ 每版本照搬 | ✅ 渐进式添加表 |
| **代码一致性** | 项目/全局不统一 | ✅ 完全统一 |
| **未来扩展性** | ❌ 需要改代码 | ✅ 只需加Schema |

### 测试场景

1. **新用户场景**：删除 `AppData/.Database` 目录，重启应用
   - 应该直接创建 v1.2.5 的全局数据库

2. **老用户升级场景**：保留现有的 v1.0.0 全局数据库
   - 重启应用后自动迁移到 v1.2.5
   - 验证迁移日志：`🔄 [DatabaseManager] 检测到全局数据库版本差异: 1.0.0 → 1.2.5`

---

## 📝 数据库操作层设计（后端 Service）

### 扩展 ProjectDatabase 的业务方法

```typescript
// 在 ProjectDatabase 类中添加 SearchAndScraper 相关方法

// ==================== 批次管理 ====================

/**
 * 创建新批次（简化版 - Iteration 1已实现）
 * 不绑定来源URL，由用户手动导航到目录页
 */
async createNovelBatch(data: {
  name: string
  description?: string
}): Promise<string> {
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  
  this.execute(
    `INSERT INTO SearchAndScraper_novel_batch 
    (id, name, description) 
    VALUES (?, ?, ?)`,
    [batchId, data.name, data.description || null]
  )
  
  return batchId
}

/**
 * 获取所有批次（按更新时间倒序）
 */
async getAllNovelBatches(): Promise<SearchAndScraperNovelBatch[]> {
  return this.query(
    `SELECT * FROM SearchAndScraper_novel_batch 
     ORDER BY updated_at DESC`
  ) as SearchAndScraperNovelBatch[]
}

/**
 * 获取批次详情
 */
async getNovelBatch(batchId: string): Promise<SearchAndScraperNovelBatch | null> {
  return this.queryOne(
    `SELECT * FROM SearchAndScraper_novel_batch WHERE id = ?`,
    [batchId]
  ) as SearchAndScraperNovelBatch | null
}

/**
 * 更新批次统计信息
 */
async updateNovelBatchStats(batchId: string, stats: {
  totalMatched?: number
  totalScraped?: number
}): Promise<void> {
  const fields: string[] = []
  const values: unknown[] = []
  
  if (stats.totalMatched !== undefined) {
    fields.push('total_matched = ?')
    values.push(stats.totalMatched)
  }
  if (stats.totalScraped !== undefined) {
    fields.push('total_scraped = ?')
    values.push(stats.totalScraped)
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP')
  
  this.execute(
    `UPDATE SearchAndScraper_novel_batch 
     SET ${fields.join(', ')} 
     WHERE id = ?`,
    [...values, batchId]
  )
}

// ==================== 匹配章节管理 ====================

/**
 * 批量保存匹配到的章节
 * @param batchId 批次ID
 * @param chapters 章节数组
 * @param sourcePageUrl 来源页面URL（可选，用于提取域名学习选择器）
 */
async saveMatchedChapters(
  batchId: string, 
  chapters: Array<{
    title: string
    url: string
  }>,
  sourcePageUrl?: string
): Promise<void> {
  // 清空旧数据
  this.execute(
    `DELETE FROM SearchAndScraper_novel_matched_chapters WHERE batch_id = ?`,
    [batchId]
  )
  
  // 批量插入
  this.transaction(() => {
    chapters.forEach((chapter, index) => {
      const chapterId = `chapter_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 11)}`
      this.execute(
        `INSERT INTO SearchAndScraper_novel_matched_chapters 
        (id, batch_id, title, url, chapter_index) 
        VALUES (?, ?, ?, ?, ?)`,
        [chapterId, batchId, chapter.title, chapter.url, index]
      )
    })
  })
  
  // 更新批次统计
  await this.updateNovelBatchStats(batchId, { totalMatched: chapters.length })
  
  // ✨ 提取域名用于选择器学习（Iteration 4）
  if (sourcePageUrl && chapters.length > 0) {
    const siteDomain = this.extractDomain(sourcePageUrl)
    // TODO: 在全局数据库中记录或更新选择器
    console.log(`[Iteration 4] 学习选择器 - 域名: ${siteDomain}`)
  }
}

/**
 * 获取批次的所有匹配章节
 */
async getMatchedChapters(batchId: string): Promise<SearchAndScraperNovelMatchedChapter[]> {
  return this.query(
    `SELECT * FROM SearchAndScraper_novel_matched_chapters 
     WHERE batch_id = ? 
     ORDER BY chapter_index ASC`,
    [batchId]
  ) as SearchAndScraperNovelMatchedChapter[]
}

/**
 * 切换章节的选中状态
 */
async toggleChapterSelection(chapterId: string, selected: boolean): Promise<void> {
  this.execute(
    `UPDATE SearchAndScraper_novel_matched_chapters 
     SET is_selected = ? 
     WHERE id = ?`,
    [selected ? 1 : 0, chapterId]
  )
}

// ==================== 爬取章节管理 ====================

/**
 * 保存爬取的章节
 */
async saveScrapedChapter(data: {
  matchedChapterId: string
  batchId: string
  title: string
  url: string
  content: string
  summary: string
  scrapeDuration: number
}): Promise<void> {
  const chapterId = `scraped_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  const wordCount = data.content.length
  
  this.execute(
    `INSERT INTO SearchAndScraper_novel_scraped_chapters 
    (id, batch_id, matched_chapter_id, title, url, content, summary, word_count, scrape_duration) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      chapterId,
      data.batchId,
      data.matchedChapterId,
      data.title,
      data.url,
      data.content,
      data.summary,
      wordCount,
      data.scrapeDuration
    ]
  )
  
  // 标记匹配章节为已爬取
  this.execute(
    `UPDATE SearchAndScraper_novel_matched_chapters 
     SET is_scraped = 1 
     WHERE id = ?`,
    [data.matchedChapterId]
  )
  
  // 更新批次统计
  const scrapedCount = this.queryOne(
    `SELECT COUNT(*) as count FROM SearchAndScraper_novel_scraped_chapters WHERE batch_id = ?`,
    [data.batchId]
  ) as { count: number }
  
  await this.updateNovelBatchStats(data.batchId, { totalScraped: scrapedCount.count })
}

/**
 * 获取批次的所有爬取章节
 */
async getScrapedChapters(batchId: string): Promise<SearchAndScraperNovelScrapedChapter[]> {
  return this.query(
    `SELECT * FROM SearchAndScraper_novel_scraped_chapters 
     WHERE batch_id = ? 
     ORDER BY created_at ASC`,
    [batchId]
  ) as SearchAndScraperNovelScrapedChapter[]
}

/**
 * 获取批次统计摘要
 */
async getNovelBatchSummary(batchId: string): Promise<{
  totalMatched: number
  totalScraped: number
  totalWords: number
  avgScrapeDuration: number
}> {
  const result = this.queryOne(
    `SELECT 
      COUNT(DISTINCT mc.id) as total_matched,
      COUNT(DISTINCT sc.id) as total_scraped,
      COALESCE(SUM(sc.word_count), 0) as total_words,
      COALESCE(AVG(sc.scrape_duration), 0) as avg_scrape_duration
    FROM SearchAndScraper_novel_matched_chapters mc
    LEFT JOIN SearchAndScraper_novel_scraped_chapters sc ON mc.id = sc.matched_chapter_id
    WHERE mc.batch_id = ?`,
    [batchId]
  ) as {
    total_matched: number
    total_scraped: number
    total_words: number
    avg_scrape_duration: number
  }
  
  return {
    totalMatched: result.total_matched,
    totalScraped: result.total_scraped,
    totalWords: result.total_words,
    avgScrapeDuration: Math.round(result.avg_scrape_duration)
  }
}

// ==================== 工具方法 ====================

/**
 * 从URL提取域名
 */
private extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return 'unknown'
  }
}
```

---

## 🌐 全局数据库操作（GlobalDatabase 扩展）

```typescript
// 在 database-service.ts 中添加全局数据库方法

/**
 * 保存或更新网站选择器
 */
async saveNovelSiteSelector(data: {
  siteDomain: string
  siteName: string
  chapterListSelector?: string
  chapterContentSelector?: string
}): Promise<void> {
  const globalDb = this.databaseManager.getGlobalDatabase()
  
  // 检查是否已存在
  const existing = globalDb.prepare(
    `SELECT id FROM SearchAndScraper_novel_site_selectors WHERE site_domain = ?`
  ).get(data.siteDomain) as { id: string } | undefined
  
  if (existing) {
    // 更新
    const fields: string[] = []
    const values: unknown[] = []
    
    if (data.chapterListSelector) {
      fields.push('chapter_list_selector = ?')
      values.push(data.chapterListSelector)
    }
    if (data.chapterContentSelector) {
      fields.push('chapter_content_selector = ?')
      values.push(data.chapterContentSelector)
    }
    
    fields.push('success_count = success_count + 1')
    fields.push('last_used_at = CURRENT_TIMESTAMP')
    fields.push('updated_at = CURRENT_TIMESTAMP')
    
    globalDb.prepare(
      `UPDATE SearchAndScraper_novel_site_selectors 
       SET ${fields.join(', ')} 
       WHERE site_domain = ?`
    ).run(...values, data.siteDomain)
  } else {
    // 插入
    const selectorId = `selector_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    globalDb.prepare(
      `INSERT INTO SearchAndScraper_novel_site_selectors 
      (id, site_domain, site_name, chapter_list_selector, chapter_content_selector, success_count, last_used_at) 
      VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`
    ).run(
      selectorId,
      data.siteDomain,
      data.siteName,
      data.chapterListSelector || null,
      data.chapterContentSelector || null
    )
  }
}

/**
 * 获取网站选择器
 */
async getNovelSiteSelector(siteDomain: string): Promise<SearchAndScraperNovelSiteSelector | null> {
  const globalDb = this.databaseManager.getGlobalDatabase()
  
  return globalDb.prepare(
    `SELECT * FROM SearchAndScraper_novel_site_selectors WHERE site_domain = ?`
  ).get(siteDomain) as SearchAndScraperNovelSiteSelector | null
}

/**
 * 获取所有网站选择器（按使用频率排序）
 */
async getAllNovelSiteSelectors(): Promise<SearchAndScraperNovelSiteSelector[]> {
  const globalDb = this.databaseManager.getGlobalDatabase()
  
  return globalDb.prepare(
    `SELECT * FROM SearchAndScraper_novel_site_selectors 
     ORDER BY success_count DESC, last_used_at DESC`
  ).all() as SearchAndScraperNovelSiteSelector[]
}
```

---

## 🎨 前端组件扩展设计

### 1️⃣ NovelScraperPanel.vue 改造

```vue
<template>
  <div class="novel-scraper-panel">
    <!-- Toolbar -->
    <div class="novel-toolbar">
      <!-- 🆕 批次选择下拉菜单 -->
      <el-select
        v-model="currentBatchId"
        placeholder="选择或创建批次"
        size="small"
        style="width: 200px"
        @change="handleBatchChange"
      >
        <!-- 第一项：创建批次 -->
        <el-option
          label="➕ 创建新批次"
          value="__create_new__"
        />
        
        <!-- 分隔线 -->
        <el-divider style="margin: 4px 0" />
        
        <!-- 已有批次列表（按更新时间倒序） -->
        <el-option
          v-for="batch in batchList"
          :key="batch.id"
          :label="`${batch.name} (${batch.total_scraped}/${batch.total_matched})`"
          :value="batch.id"
        >
          <div class="batch-option">
            <span class="batch-name">{{ batch.name }}</span>
            <span class="batch-stats">{{ batch.total_scraped }}/{{ batch.total_matched }}</span>
          </div>
        </el-option>
      </el-select>
      
      <!-- 模式选择器 -->
      <el-select
        v-model="currentMode"
        size="small"
        style="width: 120px"
        :disabled="!currentBatchId || currentBatchId === '__create_new__'"
        @change="handleModeChange"
      >
        <el-option label="智能模式" value="smart" />
      </el-select>
      
      <!-- 工具栏（未选择批次时禁用） -->
      <div class="toolbar-tools">
        <div
          class="tool-item"
          :class="{ disabled: !isOperationEnabled }"
          @click="handleMatchChapters"
        >
          <el-icon><Aim /></el-icon>
          <span>智能匹配章节列表</span>
        </div>
        
        <div
          class="tool-item"
          :class="{ disabled: !isOperationEnabled }"
          @click="handleScrapeChapters"
        >
          <el-icon><Download /></el-icon>
          <span>爬取章节</span>
        </div>
        
        <div
          class="tool-item"
          @click="handleOpenSettings"
        >
          <el-icon><Setting /></el-icon>
          <span>设置</span>
        </div>
      </div>
    </div>
    
    <!-- 主内容区 -->
    <div class="panel-content">
      <!-- 未选择批次提示 -->
      <div v-if="!currentBatchId || currentBatchId === '__create_new__'" class="empty-state">
        <el-empty
          description="请先创建或选择一个批次"
          :image-size="120"
        >
          <el-button type="primary" @click="showCreateBatchDialog = true">
            创建新批次
          </el-button>
        </el-empty>
      </div>
      
      <!-- 智能模式内容（已选择批次） -->
      <div v-else-if="currentMode === 'smart'" class="smart-mode-content">
        <!-- 原有的三个 section... -->
      </div>
    </div>
    
    <!-- 🆕 创建批次对话框（简化版） -->
    <el-dialog
      v-model="showCreateBatchDialog"
      title="创建新批次"
      width="500px"
    >
      <el-form :model="createBatchForm" label-width="100px">
        <el-form-item label="批次名称" required>
          <el-input
            v-model="createBatchForm.name"
            placeholder="例如：《三体》第一部"
          />
        </el-form-item>
        <el-form-item label="批次描述">
          <el-input
            v-model="createBatchForm.description"
            type="textarea"
            :rows="3"
            placeholder="可选：批次备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateBatchDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateBatch">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 🆕 批次相关状态
const currentBatchId = ref<string | null>(null)
const batchList = ref<SearchAndScraperNovelBatch[]>([])
const showCreateBatchDialog = ref(false)
const createBatchForm = ref({
  name: '',
  description: ''
})

// 🆕 是否允许操作（只有选择了有效批次才允许）
const isOperationEnabled = computed(() => {
  return currentBatchId.value && currentBatchId.value !== '__create_new__'
})

// 🆕 加载批次列表
const loadBatchList = async () => {
  const result = await window.api.database.getAllNovelBatches({
    projectPath: currentProjectPath.value // 需要从项目上下文获取
  })
  
  if (result.success) {
    batchList.value = result.batches
  }
}

// 🆕 处理批次切换
const handleBatchChange = async (batchId: string) => {
  if (batchId === '__create_new__') {
    showCreateBatchDialog.value = true
    currentBatchId.value = null
    return
  }
  
  // 加载该批次的数据
  await loadBatchData(batchId)
}

// 🆕 加载批次数据
const loadBatchData = async (batchId: string) => {
  // 加载匹配的章节
  const matchedResult = await window.api.database.getMatchedChapters({
    projectPath: currentProjectPath.value,
    batchId
  })
  
  if (matchedResult.success) {
    store.updateInstance(props.tabId, {
      matchedChapters: matchedResult.chapters
    })
  }
  
  // 加载已爬取的章节
  const scrapedResult = await window.api.database.getScrapedChapters({
    projectPath: currentProjectPath.value,
    batchId
  })
  
  if (scrapedResult.success) {
    store.updateInstance(props.tabId, {
      scrapedChapters: scrapedResult.chapters
    })
  }
}

// 🆕 创建批次（简化版）
const handleCreateBatch = async () => {
  if (!createBatchForm.value.name) {
    ElMessage.warning({ message: '请填写批次名称' })
    return
  }
  
  const result = await window.api.database.createNovelBatch({
    projectPath: currentProjectPath.value,
    name: createBatchForm.value.name,
    description: createBatchForm.value.description || undefined
  })
  
  if (result.success) {
    ElMessage.success({ message: '批次创建成功' })
    showCreateBatchDialog.value = false
    
    // 刷新批次列表并选中新批次
    await loadBatchList()
    currentBatchId.value = result.batchId
    await loadBatchData(result.batchId)
    
    // 清空表单
    createBatchForm.value = { name: '', description: '' }
  } else {
    ElMessage.error({ message: '批次创建失败' })
  }
}

// 🆕 智能匹配章节（保存到数据库）
const handleMatchChapters = async () => {
  if (!isOperationEnabled.value) return
  
  // ... 原有的匹配逻辑 ...
  
  // ✅ 获取当前 BrowserView 的 URL（用于提取域名学习选择器）
  const currentUrl = await window.nimbria.browserView.getCurrentUrl(props.tabId)
  
  // 匹配成功后，保存到数据库
  await window.api.database.saveMatchedChapters({
    projectPath: currentProjectPath.value,
    batchId: currentBatchId.value!,
    chapters: matchedChapters,
    sourcePageUrl: currentUrl  // ✨ 传递当前页面URL
  })
}

// 🆕 爬取章节（保存到数据库）
const scrapeBrowserMode = async (chaptersToScrape: Chapter[]) => {
  // ... 原有的爬取逻辑 ...
  
  // 每爬取成功一个章节，保存到数据库
  for (const chapter of chaptersToScrape) {
    const result = await SearchAndScraperService.scrapeChapter(props.tabId, chapter.url)
    
    if (result.success && result.chapter) {
      // 保存到数据库
      await window.api.database.saveScrapedChapter({
        projectPath: currentProjectPath.value,
        batchId: currentBatchId.value!,
        matchedChapterId: chapter.id, // 需要从matched章节获取ID
        ...result.chapter,
        scrapeDuration: 1500 // 实际爬取耗时
      })
    }
  }
}

onMounted(async () => {
  await loadBatchList()
})
</script>

<style scoped lang="scss">
.tool-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.batch-option {
  display: flex;
  justify-content: space-between;
  width: 100%;
  
  .batch-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .batch-stats {
    margin-left: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}
</style>
```

---

## 📡 IPC 通信层设计

```typescript
// database-handlers.ts 中添加新的 IPC 处理器

export function registerDatabaseHandlers(databaseService: DatabaseService) {
  // ==================== 批次管理 ====================
  
  ipcMain.handle('database:create-novel-batch', async (_event, { projectPath, name, description }) => {
    try {
      const projectDb = databaseService.getProjectDatabase(projectPath)
      const batchId = await projectDb.createNovelBatch({ name, description })
      return { success: true, batchId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('database:get-all-novel-batches', async (_event, { projectPath }) => {
    try {
      const projectDb = databaseService.getProjectDatabase(projectPath)
      const batches = await projectDb.getAllNovelBatches()
      return { success: true, batches }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  
  // ==================== 匹配章节管理 ====================
  
  ipcMain.handle('database:save-matched-chapters', async (_event, { projectPath, batchId, chapters, sourcePageUrl }) => {
    try {
      const projectDb = databaseService.getProjectDatabase(projectPath)
      await projectDb.saveMatchedChapters(batchId, chapters, sourcePageUrl)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('database:get-matched-chapters', async (_event, { projectPath, batchId }) => {
    try {
      const projectDb = databaseService.getProjectDatabase(projectPath)
      const chapters = await projectDb.getMatchedChapters(batchId)
      return { success: true, chapters }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  
  // ==================== 爬取章节管理 ====================
  
  ipcMain.handle('database:save-scraped-chapter', async (_event, { projectPath, ...data }) => {
    try {
      const projectDb = databaseService.getProjectDatabase(projectPath)
      await projectDb.saveScrapedChapter(data)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('database:get-scraped-chapters', async (_event, { projectPath, batchId }) => {
    try {
      const projectDb = databaseService.getProjectDatabase(projectPath)
      const chapters = await projectDb.getScrapedChapters(batchId)
      return { success: true, chapters }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  
  // ==================== 全局选择器管理 ====================
  
  ipcMain.handle('database:save-novel-site-selector', async (_event, data) => {
    try {
      await databaseService.saveNovelSiteSelector(data)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('database:get-novel-site-selector', async (_event, { siteDomain }) => {
    try {
      const selector = await databaseService.getNovelSiteSelector(siteDomain)
      return { success: true, selector }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}
```

---

## 🎯 端到端增量开发计划

按照端到端增量开发的原则，每次迭代都完成一个完整的功能链路（后端 → IPC → 前端），便于快速验证和发现问题。

---

## 🔄 Iteration 0: 基础设施改造（必须先行）

**目标**：让全局数据库支持渐进式开发，这是所有后续功能的基础。

### 📝 任务清单

#### 0.1 改造 `database-manager.ts`

**文件位置**：`Nimbria/src-electron/services/database-service/database-manager.ts`

- [ ] 第11行：改为 `import { CURRENT_GLOBAL_SCHEMA_VERSION, CURRENT_PROJECT_SCHEMA_VERSION } from './schema/versions'`
- [ ] 第26-56行：改造 `initialize()` 方法，支持版本迁移检查（参考前面"💾 全局数据库渐进式开发改造"）
- [ ] 新增 `getLatestGlobalSchema()` 私有方法

#### 0.2 更新 `project-database.ts`

**文件位置**：`Nimbria/src-electron/services/database-service/project-database.ts`

- [ ] 第8行：改为 `import { CURRENT_PROJECT_SCHEMA_VERSION } from './schema/versions'`

### ✅ 验证标准

```bash
# 1. 启动应用，检查全局数据库初始化日志
📦 [DatabaseManager] 使用全局Schema版本: 1.2.4  # 应该是动态版本

# 2. 验证项目数据库初始化正常
✅ [DatabaseManager] 全局数据库初始化成功
✅ [ProjectDatabase] 项目数据库创建成功
```

**预期结果**：应用正常启动，无数据库相关错误

---

## 🔄 Iteration 1: 批次创建功能（端到端）

**目标**：用户可以在前端创建批次，并保存到项目数据库

### 📝 任务清单

#### 1.1 后端：创建 Schema v1.2.5

**文件位置**：`Nimbria/src-electron/services/database-service/schema/versions/v1.2.5.schema.ts`

- [ ] 复制 `v1.2.4.schema.ts` 作为基础
- [ ] 在 `PROJECT_TABLES` 中添加 `SearchAndScraper_novel_batch` 表定义（参考前面"🗄️ 数据库 Schema 设计"）
- [ ] 在 `GLOBAL_TABLES` 中添加 `SearchAndScraper_novel_site_selectors` 表定义（为后续迭代准备）
- [ ] 创建 `MIGRATION_1_2_4_TO_1_2_5` 迁移脚本

#### 1.2 后端：更新版本索引

**文件位置**：`Nimbria/src-electron/services/database-service/schema/versions/index.ts`

- [ ] 添加 `export { GLOBAL_SCHEMA_V1_2_5, PROJECT_SCHEMA_V1_2_5, MIGRATION_1_2_4_TO_1_2_5 } from './v1.2.5.schema'`
- [ ] 更新 `CURRENT_GLOBAL_SCHEMA_VERSION = '1.2.5'`
- [ ] 更新 `CURRENT_PROJECT_SCHEMA_VERSION = '1.2.5'`

#### 1.3 后端：添加批次管理方法

**文件位置**：`Nimbria/src-electron/services/database-service/project-database.ts`

- [ ] 添加 `createNovelBatch()` 方法（简化版，参数：name, description?）
- [ ] 添加 `getAllNovelBatches()` 方法
- [ ] 添加 `getNovelBatch()` 方法
- [ ] 添加 `updateNovelBatchStats()` 方法
- [ ] 添加 `extractDomain()` 工具方法（用于Iteration 2-4）

#### 1.4 IPC：注册批次管理通道

**文件位置**：`Nimbria/src-electron/ipc/database-handlers.ts`

- [ ] 注册 `database:create-novel-batch` 处理器
- [ ] 注册 `database:get-all-novel-batches` 处理器

#### 1.5 前端：类型定义

**文件位置**：`Nimbria/Client/types/database.ts`（或新建）

- [ ] 添加 `SearchAndScraperNovelBatch` 接口定义
- [ ] 导出到 `Client/types/index.ts`

#### 1.6 前端：改造 NovelScraperPanel

**文件位置**：`Nimbria/Client/GUI/components/ProjectPage.MainPanel/SearchAndScraper/RightPanel/TabContents/NovelScraperPanel.vue`

- [ ] 添加批次选择下拉菜单（放在 toolbar 第一项）
- [ ] 添加批次创建对话框组件
- [ ] 添加 `currentBatchId` 状态
- [ ] 添加 `batchList` 状态
- [ ] 实现 `loadBatchList()` 方法
- [ ] 实现 `handleCreateBatch()` 方法
- [ ] 实现 `handleBatchChange()` 方法
- [ ] 未选择批次时显示空状态提示

### ✅ 验证标准

**测试场景1：创建批次（简化版）**
```typescript
// 操作步骤
1. 打开项目 → 进入 SearchAndScraper Panel
2. 点击批次下拉菜单 → 选择"创建新批次"
3. 填写批次名称："测试小说批次1"
4. （可选）填写批次描述："用于测试三体小说"
5. 点击"创建"

// 预期结果
✅ 对话框关闭
✅ 批次下拉菜单自动选中新创建的批次
✅ 后端日志显示：INSERT INTO SearchAndScraper_novel_batch ...
✅ 数据库中成功插入记录（用 DB Browser 验证）
✅ 数据库字段：id, name, description, total_matched=0, total_scraped=0
```

**测试场景2：批次列表展示**
```typescript
// 操作步骤
1. 创建3个批次（名称、描述各不同）
2. 刷新页面或重新进入 Panel
3. 打开批次下拉菜单

// 预期结果
✅ 下拉菜单第一项是"➕ 创建新批次"
✅ 后面显示3个已创建的批次
✅ 批次按更新时间倒序排列（最新的在最前）
✅ 批次名称显示正确（可能需要截断长名称）
```

**测试场景3：未选择批次的禁用状态**
```typescript
// 操作步骤
1. 打开 Panel，不选择任何批次

// 预期结果
✅ 显示空状态提示："请先创建或选择一个批次"
✅ "智能匹配章节列表" 按钮禁用
✅ "爬取章节" 按钮禁用
✅ 模式选择器禁用
```

---

## 🔄 Iteration 2: 章节匹配功能（端到端）

**目标**：用户可以智能匹配章节列表，并保存到数据库，切换批次时自动恢复匹配结果

**核心操作**：从**目录页**批量提取章节标题和URL
- 页面特征：一页或多页**同构**的目录页
- 提取内容：章节标题 + 章节URL（元数据）
- 数据存储：`matched_chapters` 表
- 选择器学习：`chapter_list_selector`（Iteration 4）

### 📝 任务清单

#### 2.1 后端：添加匹配章节表 Schema

**文件位置**：`Nimbria/src-electron/services/database-service/schema/versions/v1.2.5.schema.ts`

- [ ] 在 `PROJECT_TABLES` 中添加 `SearchAndScraper_novel_matched_chapters` 表定义

#### 2.2 后端：添加匹配章节管理方法

**文件位置**：`Nimbria/src-electron/services/database-service/project-database.ts`

- [ ] 添加 `saveMatchedChapters(batchId, chapters, sourcePageUrl?)` 方法
  - 参数：chapters 数组包含 title 和 url
  - 参数：sourcePageUrl（可选，用于提取域名）
  - 功能：批量插入章节，更新批次统计
  
- [ ] 添加 `getMatchedChapters(batchId)` 方法
  - 返回：按 chapter_index 排序的章节列表
  
- [ ] 添加 `toggleChapterSelection(chapterId, selected)` 方法
  - 功能：切换单个章节的选中状态
  
- [ ] 添加 `toggleAllChaptersSelection(batchId, selected)` 方法（新增）
  - 功能：全选/取消全选批次内所有章节

#### 2.3 IPC：注册匹配章节通道

**文件位置**：`Nimbria/src-electron/ipc/database-handlers.ts`

- [ ] 注册 `database:save-matched-chapters` 处理器
  - 参数：{ projectPath, batchId, chapters, sourcePageUrl? }
  
- [ ] 注册 `database:get-matched-chapters` 处理器
- [ ] 注册 `database:toggle-chapter-selection` 处理器
- [ ] 注册 `database:toggle-all-chapters-selection` 处理器（新增）

#### 2.4 前端：类型定义

**文件位置**：`Nimbria/Client/types/database.ts`

- [ ] 添加 `SearchAndScraperNovelMatchedChapter` 接口定义

#### 2.5 前端：改造 NovelScraperPanel

**文件位置**：`NovelScraperPanel.vue`

- [ ] 改造 `handleMatchChapters()` 方法
  - ✅ 获取当前 BrowserView 的 URL
  - ✅ 调用 `database:save-matched-chapters` 时传递 sourcePageUrl
  
- [ ] 实现 `loadBatchData()` 方法
  - 切换批次时自动加载匹配章节
  - 显示章节数量统计
  
- [ ] 启用"智能匹配章节列表"按钮
  - 条件：已选择批次 && BrowserView已加载页面

#### 2.6 前端：改造 ChapterListSection

**文件位置**：`ChapterListSection.vue`

- [ ] 添加搜索框（过滤章节标题）
- [ ] 添加全选/取消全选按钮
- [ ] 支持单个章节的选中/取消选中
- [ ] 章节列表项显示选中状态（复选框）
- [ ] 选中状态变更时调用 `database:toggle-chapter-selection`

### ✅ 验证标准

**测试场景1：智能匹配并保存**
```typescript
// 操作步骤
1. 选择批次1（名称："三体第一部"，无来源URL绑定）
2. ✅ 手动在 BrowserView 中打开小说目录页（例如：https://www.qidian.com/book/123）
3. 点击"智能匹配章节列表"
4. 等待匹配完成

// 预期结果
✅ ChapterListSection 显示匹配到的章节（例如50章）
✅ 后端日志：INSERT INTO SearchAndScraper_novel_matched_chapters ... (50次)
✅ 批次统计更新：total_matched = 50
✅ 所有章节默认为选中状态（is_selected = 1）
✅ ✨ 每个章节的URL字段记录了完整的章节链接
✅ ✨（Iteration 4）从当前页面URL中提取域名（www.qidian.com），尝试学习选择器
```

**测试场景2：切换批次自动恢复数据**
```typescript
// 操作步骤
1. 批次1 匹配了 50 章
2. 切换到批次2（空批次）
3. 再切换回批次1

// 预期结果
✅ 批次1 的章节列表自动恢复显示（50章）
✅ 每个章节的选中状态与之前一致
✅ 没有重新请求后端匹配
```

**测试场景3：章节选择与统计**
```typescript
// 操作步骤
1. 在章节列表中取消选中第5-10章（6章）
2. 点击全选
3. 点击取消全选

// 预期结果
✅ 取消选中后，章节复选框变为未选中状态
✅ 数据库中 is_selected 字段更新为 0
✅ 全选后，所有章节变为选中状态
✅ 取消全选后，所有章节变为未选中状态
```

**测试场景4：章节搜索**
```typescript
// 操作步骤
1. 匹配了50章
2. 在搜索框输入"第一"
3. 清空搜索框

// 预期结果
✅ 搜索后仅显示标题包含"第一"的章节
✅ 清空搜索后显示所有章节
✅ 搜索不影响选中状态
```

---

## 🔄 Iteration 3: 章节爬取功能（端到端）

**目标**：用户可以爬取选中的章节，实时保存到数据库，显示爬取进度

**核心操作**：遍历每个章节URL，逐个提取正文内容
- 页面特征：每个章节有独立的页面，可能结构不同
- 提取内容：章节正文内容 + 摘要 + 字数等
- 数据存储：`scraped_chapters` 表
- 选择器学习：`chapter_content_selector`（Iteration 4）
- 操作方式：**逐个**访问章节链接，特化处理（与Iteration 2的批量操作不同）

### 📝 任务清单

#### 3.1 后端：添加爬取章节表 Schema

**文件位置**：`v1.2.5.schema.ts`

- [ ] 在 `PROJECT_TABLES` 中添加 `SearchAndScraper_novel_scraped_chapters` 表定义

#### 3.2 后端：添加爬取章节管理方法

**文件位置**：`project-database.ts`

- [ ] 添加 `saveScrapedChapter()` 方法
- [ ] 添加 `getScrapedChapters()` 方法
- [ ] 添加 `getNovelBatchSummary()` 方法

#### 3.3 IPC：注册爬取章节通道

**文件位置**：`database-handlers.ts`

- [ ] 注册 `database:save-scraped-chapter` 处理器
- [ ] 注册 `database:get-scraped-chapters` 处理器
- [ ] 注册 `database:get-novel-batch-summary` 处理器

#### 3.4 前端：类型定义

**文件位置**：`Client/types/database.ts`

- [ ] 添加 `SearchAndScraperNovelScrapedChapter` 接口定义

#### 3.5 前端：改造爬取逻辑

**文件位置**：`NovelScraperPanel.vue`

- [ ] 改造 `scrapeBrowserMode()` 方法
- [ ] 每爬取成功一个章节，立即调用 `database:save-scraped-chapter`
- [ ] 更新 matched_chapter 的 `is_scraped` 状态
- [ ] 实时更新批次统计信息

#### 3.6 前端：改造 ChapterSummarySection

**文件位置**：`ChapterSummarySection.vue`

- [ ] 从数据库加载已爬取章节（而不是从 store）
- [ ] 显示章节摘要（前200字）
- [ ] 显示字数统计
- [ ] 显示爬取耗时

### ✅ 验证标准

**测试场景1：爬取并实时保存**
```typescript
// 操作步骤
1. 选择批次1（已匹配50章，全部选中）
2. 点击"爬取章节"
3. 观察爬取进度

// 预期结果
✅ 爬取进度实时更新（1/50, 2/50, ...）
✅ 每爬取成功1章，后端日志显示：INSERT INTO SearchAndScraper_novel_scraped_chapters ...
✅ ChapterListSection 中对应章节标记为"已爬取"（绿色勾号）
✅ ChapterSummarySection 实时更新已爬取章节列表
✅ 批次统计实时更新：total_scraped 逐步增加
```

**测试场景2：爬取中断与恢复**
```typescript
// 操作步骤
1. 开始爬取50章
2. 爬取到第10章时，点击"暂停"或关闭窗口
3. 重新打开项目，进入该批次
4. 再次点击"爬取章节"

// 预期结果
✅ 前10章显示为"已爬取"，不会重复爬取
✅ 从第11章开始继续爬取
✅ ChapterSummarySection 显示所有已爬取章节（包括之前的10章）
```

**测试场景3：批次统计准确性**
```typescript
// 操作步骤
1. 批次1：匹配100章，选中50章，爬取完成
2. 查看批次下拉菜单

// 预期结果
✅ 批次1 显示：测试小说批次1 (50/100)
✅ 批次统计准确：total_matched=100, total_scraped=50
```

**测试场景4：章节内容完整性**
```typescript
// 操作步骤
1. 爬取完成后，在 ChapterSummarySection 点击某个章节
2. 查看章节详情（可能需要添加详情弹窗）

// 预期结果
✅ 章节标题正确
✅ 章节URL正确
✅ 章节正文内容完整（与网站一致）
✅ 字数统计正确
✅ 爬取耗时显示正确（单位：毫秒）
```

---

## 🔄 Iteration 4: 全局选择器学习（端到端）

**目标**：智能模式自动学习并保存网站选择器到全局数据库，跨项目复用

**⚠️ 重要概念区分：**
- **章节列表选择器**：在Iteration 2（匹配章节列表）时学习，用于从目录页批量提取
- **章节内容选择器**：在Iteration 3（爬取章节内容）时学习，用于从每个章节页提取正文
- 这是**两个完全独立**的步骤，在**不同的页面**、**不同的时机**学习

### 📝 任务清单

#### 4.1 后端：添加全局数据库方法

**文件位置**：`Nimbria/src-electron/services/database-service/database-service.ts`

- [ ] 添加 `saveNovelSiteSelector()` 方法
- [ ] 添加 `getNovelSiteSelector()` 方法
- [ ] 添加 `getAllNovelSiteSelectors()` 方法

#### 4.2 IPC：注册选择器通道

**文件位置**：`database-handlers.ts`

- [ ] 注册 `database:save-novel-site-selector` 处理器
- [ ] 注册 `database:get-novel-site-selector` 处理器

#### 4.3 前端：类型定义

**文件位置**：`Client/types/database.ts`

- [ ] 添加 `SearchAndScraperNovelSiteSelector` 接口定义

#### 4.4 前端：集成选择器学习

**文件位置**：`NovelScraperPanel.vue`

**两个独立的学习时机：**

- [ ] **时机1：匹配章节列表时（Iteration 2）**
  - 在 `handleMatchChapters()` 成功后
  - 当前页面：目录页（例如：www.qidian.com/book/123）
  - 提取并保存 `chapter_list_selector`
  - 用途：从同构的目录页批量提取章节标题和URL
  
- [ ] **时机2：爬取章节内容时（Iteration 3）**
  - 在 `scrapeBrowserMode()` 每个章节爬取成功后
  - 当前页面：章节页（例如：www.qidian.com/book/123/chapter/456）
  - 提取并保存 `chapter_content_selector`
  - 用途：从每个章节页提取正文内容
  
- [ ] 在操作前，先尝试从全局数据库加载已有选择器（预填充）

#### 4.5 前端：选择器管理界面（可选）

**新增组件**：`SelectorManagementDialog.vue`

- [ ] 列表显示所有已学习的网站选择器
- [ ] 显示网站域名、成功次数、最后使用时间
- [ ] 支持编辑选择器
- [ ] 支持删除选择器

### ✅ 验证标准

**测试场景1：学习章节列表选择器（Iteration 2时机）**
```typescript
// 操作步骤
1. 批次1（名称："三体第一部"）
2. 手动在 BrowserView 中打开目录页：www.qidian.com/book/123
3. 点击"智能匹配章节列表"
4. 匹配成功（使用了选择器 .chapter-list a，提取到50章）

// 预期结果
✅ 全局数据库中插入或更新记录：
   - site_domain: www.qidian.com（从目录页URL提取）
   - chapter_list_selector: .chapter-list a
   - chapter_content_selector: NULL（尚未学习）
   - success_count: 1（或递增）
   - last_used_at: 当前时间
✅ matched_chapters 表中插入50条记录（章节标题+URL）
```

**测试场景1.5：学习章节内容选择器（Iteration 3时机）**
```typescript
// 操作步骤（继续上一场景）
5. 点击"爬取章节"
6. 系统自动遍历50个章节链接
7. 第一个章节：www.qidian.com/book/123/chapter/1
8. 爬取成功（使用了选择器 .read-content p）

// 预期结果
✅ 全局数据库更新记录：
   - site_domain: www.qidian.com（不变）
   - chapter_list_selector: .chapter-list a（不变）
   - chapter_content_selector: .read-content p（新学习）
   - success_count: 2（递增）
✅ scraped_chapters 表中插入50条记录（正文内容+摘要）
```

**测试场景2：跨项目复用选择器**
```typescript
// 操作步骤
1. 项目A 已经学习了 www.qidian.com 的选择器
2. 创建项目B
3. 在项目B 中创建批次（名称："流浪地球"）
4. 手动在 BrowserView 中打开 www.qidian.com/book/456
5. 智能匹配时，检查日志

// 预期结果
✅ 后端日志：[SmartMode] 从全局数据库加载选择器: www.qidian.com
✅ 匹配使用了已有选择器，无需重新学习
✅ success_count 递增，last_used_at 更新
```

**测试场景3：选择器管理**
```typescript
// 操作步骤
1. 点击 NovelScraperPanel 的"设置"按钮
2. 选择"选择器管理"
3. 查看已学习的选择器列表

// 预期结果
✅ 列表显示所有网站（按使用频率排序）
✅ 显示每个网站的选择器详情
✅ 可以编辑选择器（例如修正错误的选择器）
✅ 可以删除不再使用的选择器
```

---

## 🔄 Iteration 5: 批次管理增强（端到端）

**目标**：支持批次的重命名、删除、复制、导出等高级功能

### 📝 任务清单

#### 5.1 后端：添加批次管理方法

**文件位置**：`project-database.ts`

- [ ] 添加 `updateNovelBatch()` 方法（重命名、修改配置）
- [ ] 添加 `deleteNovelBatch()` 方法（级联删除相关章节）
- [ ] 添加 `duplicateNovelBatch()` 方法（复制批次）

#### 5.2 IPC：注册批次管理通道

**文件位置**：`database-handlers.ts`

- [ ] 注册 `database:update-novel-batch` 处理器
- [ ] 注册 `database:delete-novel-batch` 处理器
- [ ] 注册 `database:duplicate-novel-batch` 处理器

#### 5.3 前端：批次操作菜单

**文件位置**：`NovelScraperPanel.vue`

- [ ] 批次下拉菜单添加右键菜单（或更多按钮）
- [ ] 菜单项：重命名、删除、复制、导出
- [ ] 实现各操作的确认对话框

#### 5.4 前端：批次导出功能

**新增方法**：

- [ ] 导出批次为 JSON（包含批次信息、匹配章节、爬取章节）
- [ ] 导出批次为 TXT 或 EPUB（纯文本格式）

### ✅ 验证标准

**测试场景1：重命名批次**
```typescript
// 预期结果
✅ 批次名称更新，下拉菜单显示新名称
✅ 数据库记录更新，updated_at 更新
```

**测试场景2：删除批次**
```typescript
// 预期结果
✅ 批次从列表中移除
✅ 相关的 matched_chapters 和 scraped_chapters 级联删除
✅ 删除前有二次确认对话框
```

**测试场景3：复制批次**
```typescript
// 预期结果
✅ 创建新批次（名称自动加 _副本）
✅ 复制所有 matched_chapters（保留选中状态）
✅ 不复制 scraped_chapters（新批次需要重新爬取）
```

**测试场景4：导出批次**
```typescript
// 预期结果
✅ 导出为 JSON，包含完整数据
✅ 导出为 TXT，按章节顺序拼接正文
✅ 文件保存到用户选择的位置
```

---

## 📊 完整检查清单

```
✅ Iteration 0: 基础设施改造
  □ database-manager.ts 改造完成
  □ project-database.ts 导入改为动态版本
  □ 应用启动验证通过

✅ Iteration 1: 批次创建功能
  □ v1.2.5.schema.ts 创建（batch 表）
  □ schema/versions/index.ts 更新
  □ ProjectDatabase.createNovelBatch() 实现
  □ IPC 通道注册完成
  □ NovelScraperPanel 批次UI实现
  □ 测试场景1-3 全部通过

✅ Iteration 2: 章节匹配功能
  □ matched_chapters 表 Schema 添加
  □ ProjectDatabase 匹配章节方法实现
  □ IPC 通道注册完成
  □ NovelScraperPanel 匹配逻辑改造
  □ ChapterListSection 改造完成
  □ 测试场景1-4 全部通过

✅ Iteration 3: 章节爬取功能
  □ scraped_chapters 表 Schema 添加
  □ ProjectDatabase 爬取章节方法实现
  □ IPC 通道注册完成
  □ NovelScraperPanel 爬取逻辑改造
  □ ChapterSummarySection 改造完成
  □ 测试场景1-4 全部通过

✅ Iteration 4: 全局选择器学习
  □ DatabaseService 全局方法实现
  □ IPC 通道注册完成
  □ NovelScraperPanel 选择器学习集成
  □ SelectorManagementDialog 实现（可选）
  □ 测试场景1-3 全部通过

✅ Iteration 5: 批次管理增强
  □ 批次管理方法实现
  □ IPC 通道注册完成
  □ 批次操作菜单实现
  □ 批次导出功能实现
  □ 测试场景1-4 全部通过
```

---

## 🎯 端到端增量开发的优势

1. **✅ 快速验证**：每个迭代完成后立即可以测试完整功能链路
2. **✅ 及早发现问题**：如果某个环节有问题，马上就能发现，而不是等到集成阶段
3. **✅ 渐进式交付**：每个迭代都交付可用的功能，用户可以尽早使用
4. **✅ 降低风险**：避免"大爆炸式集成"，减少后期返工
5. **✅ 持续反馈**：每次迭代后可以根据反馈调整后续计划

---

Boss，这就是改造后的端到端增量开发计划！每个 Iteration 都是一个完整的功能闭环，可以独立验证。你觉得怎么样？