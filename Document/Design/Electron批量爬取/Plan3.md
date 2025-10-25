## 📋 需求分析

### 核心业务场景
1. **批次管理**：用户可以创建多个爬取批次（例如不同小说、不同章节范围）
2. **数据隔离**：每个批次独立存储匹配的章节列表和爬取的章节内容
3. **选择器学习**：全局记录不同网站的智能选择器，跨项目复用

### 数据流程
```
用户创建批次 → 智能匹配章节列表 → 存储到 matched_chapters 
→ 用户选择爬取 → 存储到 scraped_chapters
→ 学习到的选择器 → 存储到全局数据库 site_selectors
```

---

## 🗄️ 数据库 Schema 设计

### 1️⃣ 项目数据库 Schema（存储在项目目录 `.Database/project.db`）

按照数据库修改工作流，我需要创建新版本的 Schema：

```typescript
// ==================== 批次表 ====================
export interface SearchAndScraperNovelBatch {
  id: string                    // 批次ID（主键）
  name: string                  // 批次名称（用户自定义）
  source_url: string            // 来源URL（小说目录页）
  site_domain: string           // 网站域名（用于关联全局选择器）
  scrape_mode: 'smart' | 'light' // 爬取模式
  
  // 统计信息
  total_matched: number         // 匹配到的章节总数
  total_scraped: number         // 已爬取的章节总数
  
  // 轻量模式配置（JSON 序列化）
  light_mode_config?: string    // { selector, parallelCount, timeout }
  
  // 时间戳
  created_at: string
  updated_at: string
}

const SEARCH_AND_SCRAPER_NOVEL_BATCH_TABLE: TableDefinition = {
  name: 'SearchAndScraper_novel_batch',
  sql: `CREATE TABLE IF NOT EXISTS SearchAndScraper_novel_batch (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    site_domain TEXT NOT NULL,
    scrape_mode TEXT DEFAULT 'smart' CHECK(scrape_mode IN ('smart', 'light')),
    
    total_matched INTEGER DEFAULT 0,
    total_scraped INTEGER DEFAULT 0,
    
    light_mode_config TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  indexes: [
    `CREATE INDEX IF NOT EXISTS idx_novel_batch_updated ON SearchAndScraper_novel_batch(updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_novel_batch_domain ON SearchAndScraper_novel_batch(site_domain)`
  ]
}

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
export interface SearchAndScraperNovelSiteSelector {
  id: string                    // 主键
  site_domain: string           // 网站域名（唯一键，如 www.qidian.com）
  site_name: string             // 网站名称（用户友好的显示名）
  
  // 选择器配置
  chapter_list_selector: string // 章节列表选择器
  chapter_content_selector: string // 章节内容选择器
  
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
 * 创建新批次
 */
async createNovelBatch(data: {
  name: string
  sourceUrl: string
  scrapeMode: 'smart' | 'light'
}): Promise<string> {
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  
  // 提取域名
  const siteDomain = this.extractDomain(data.sourceUrl)
  
  this.execute(
    `INSERT INTO SearchAndScraper_novel_batch 
    (id, name, source_url, site_domain, scrape_mode) 
    VALUES (?, ?, ?, ?, ?)`,
    [batchId, data.name, data.sourceUrl, siteDomain, data.scrapeMode]
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
 */
async saveMatchedChapters(batchId: string, chapters: Array<{
  title: string
  url: string
}>): Promise<void> {
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
    
    <!-- 🆕 创建批次对话框 -->
    <el-dialog
      v-model="showCreateBatchDialog"
      title="创建新批次"
      width="500px"
    >
      <el-form :model="createBatchForm" label-width="100px">
        <el-form-item label="批次名称">
          <el-input
            v-model="createBatchForm.name"
            placeholder="例如：《三体》第一部"
          />
        </el-form-item>
        <el-form-item label="来源URL">
          <el-input
            v-model="createBatchForm.sourceUrl"
            placeholder="小说目录页URL"
          />
        </el-form-item>
        <el-form-item label="爬取模式">
          <el-radio-group v-model="createBatchForm.scrapeMode">
            <el-radio label="smart">智能模式</el-radio>
            <el-radio label="light">轻量模式</el-radio>
          </el-radio-group>
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
  sourceUrl: '',
  scrapeMode: 'smart' as 'smart' | 'light'
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

// 🆕 创建批次
const handleCreateBatch = async () => {
  if (!createBatchForm.value.name || !createBatchForm.value.sourceUrl) {
    ElMessage.warning({ message: '请填写完整信息' })
    return
  }
  
  const result = await window.api.database.createNovelBatch({
    projectPath: currentProjectPath.value,
    ...createBatchForm.value
  })
  
  if (result.success) {
    ElMessage.success({ message: '批次创建成功' })
    showCreateBatchDialog.value = false
    
    // 刷新批次列表并选中新批次
    await loadBatchList()
    currentBatchId.value = result.batchId
    await loadBatchData(result.batchId)
  } else {
    ElMessage.error({ message: '批次创建失败' })
  }
}

// 🆕 智能匹配章节（保存到数据库）
const handleMatchChapters = async () => {
  if (!isOperationEnabled.value) return
  
  // ... 原有的匹配逻辑 ...
  
  // 匹配成功后，保存到数据库
  await window.api.database.saveMatchedChapters({
    projectPath: currentProjectPath.value,
    batchId: currentBatchId.value!,
    chapters: matchedChapters
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
  
  ipcMain.handle('database:create-novel-batch', async (_event, { projectPath, name, sourceUrl, scrapeMode }) => {
    try {
      const projectDb = databaseService.getProjectDatabase(projectPath)
      const batchId = await projectDb.createNovelBatch({ name, sourceUrl, scrapeMode })
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
  
  ipcMain.handle('database:save-matched-chapters', async (_event, { projectPath, batchId, chapters }) => {
    try {
      const projectDb = databaseService.getProjectDatabase(projectPath)
      await projectDb.saveMatchedChapters(batchId, chapters)
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

## 🎯 实施步骤总结

按照数据库修改工作流文档的规范，分以下步骤实施：

### Phase 1: 全局数据库改造（基础设施阶段）

这是必须首先完成的基础改造，使全局数据库支持渐进式开发模式。

#### 1.1 改造 `database-manager.ts`

- 第11行：改为 `import { CURRENT_GLOBAL_SCHEMA_VERSION, CURRENT_PROJECT_SCHEMA_VERSION } from './schema/versions'`
- 第26-56行：改造 `initialize()` 方法，支持版本迁移检查（参考上面"💾 全局数据库渐进式开发改造"章节）
- 新增 `getLatestGlobalSchema()` 私有方法

#### 1.2 更新 `project-database.ts`

- 第8行：改为 `import { CURRENT_PROJECT_SCHEMA_VERSION } from './schema/versions'`
- 逻辑代码无需修改

✅ **验证**：应用启动，全局数据库从硬编码版本改为动态版本

---

### Phase 2: SearchAndScraper 数据库功能实现（业务功能阶段）

#### 2.1 创建新版本 Schema

**文件：** `v1.2.5.schema.ts`

参考 Plan3.md 前面"🗄️ 数据库 Schema 设计"章节的 Schema 定义

包含：
- ✅ 全局数据库表：`SearchAndScraper_novel_site_selectors`
- ✅ 项目数据库表：`SearchAndScraper_novel_batch`、`SearchAndScraper_novel_matched_chapters`、`SearchAndScraper_novel_scraped_chapters`

#### 2.2 更新 `schema/versions/index.ts`

```typescript
export { GLOBAL_SCHEMA_V1_2_5, PROJECT_SCHEMA_V1_2_5, MIGRATION_1_2_4_TO_1_2_5 } from './v1.2.5.schema'

export const CURRENT_GLOBAL_SCHEMA_VERSION = '1.2.5'
export const CURRENT_PROJECT_SCHEMA_VERSION = '1.2.5'
```

✅ **验证**：新项目创建时，数据库自动包含所有新表

#### 2.3 为 `ProjectDatabase` 添加业务方法

参考 Plan3.md 前面"📝 数据库操作层设计"章节的方法集合

包含：
- 批次管理：`createNovelBatch()`、`getAllNovelBatches()`、`getNovelBatch()`、`updateNovelBatchStats()`
- 匹配章节：`saveMatchedChapters()`、`getMatchedChapters()`、`toggleChapterSelection()`
- 爬取章节：`saveScrapedChapter()`、`getScrapedChapters()`、`getNovelBatchSummary()`

#### 2.4 为 `DatabaseService` 添加全局数据库方法

参考 Plan3.md 前面"🌐 全局数据库操作"章节的方法集合

包含：
- `saveNovelSiteSelector()`：保存或更新网站选择器
- `getNovelSiteSelector()`：获取指定网站的选择器
- `getAllNovelSiteSelectors()`：获取所有网站选择器

#### 2.5 更新 `database-handlers.ts`

参考 Plan3.md 前面"📡 IPC 通信层设计"章节的 IPC 处理器

注册以下 IPC 通道：
- `database:create-novel-batch` - 创建批次
- `database:get-all-novel-batches` - 获取所有批次
- `database:save-matched-chapters` - 保存匹配章节
- `database:get-matched-chapters` - 获取匹配章节
- `database:save-scraped-chapter` - 保存爬取章节
- `database:get-scraped-chapters` - 获取爬取章节
- `database:save-novel-site-selector` - 保存网站选择器
- `database:get-novel-site-selector` - 获取网站选择器

✅ **验证**：前端可通过 IPC 调用所有数据库操作

#### 2.6 扩展前端 Store 和 Service 层

在 `databaseStore.ts` 中添加对应的 IPC 调用包装方法。

---

### Phase 3: 前端 UI 改造（用户界面阶段）

#### 3.1 改造 `NovelScraperPanel.vue`

参考 Plan3.md 前面"🎨 前端组件扩展设计"章节的设计

主要改造：
- ✅ 添加批次选择下拉菜单（顶部左侧）
- ✅ 未选择批次时禁用所有操作
- ✅ 创建新批次对话框
- ✅ 自动加载批次数据并恢复 UI 状态

#### 3.2 改造 `ChapterListSection.vue`

- ✅ 添加搜索框
- ✅ 添加选择模式切换
- ✅ 支持全选/取消全选

#### 3.3 改造 `ChapterSummarySection.vue`

- 无需大改，支持显示已爬取章节摘要（已有功能）

✅ **验证**：用户可以创建批次、管理章节、查看爬取进度

---

### Phase 4: 集成与测试（交付阶段）

#### 4.1 功能测试

- [ ] 新用户场景：创建项目 → 创建批次 → 智能匹配 → 爬取章节
- [ ] 批次管理：创建多个批次 → 切换批次 → 数据隔离验证
- [ ] 选择器学习：匹配到的选择器是否正确保存到全局数据库
- [ ] 跨项目使用：在新项目中验证是否能访问已学习的选择器

#### 4.2 数据库迁移测试

- [ ] 新用户升级：v1.0.0 → v1.2.5 自动迁移验证
- [ ] 数据完整性：迁移前后数据是否完好
- [ ] 日志检查：迁移过程是否有正确的控制台日志输出

#### 4.3 性能测试

- [ ] 批量创建批次（100+）性能
- [ ] 批量保存匹配章节（1000+）性能
- [ ] 批量保存爬取章节（1000+）性能

---

### 快速检查清单

```
✅ Phase 1: 全局数据库改造
  □ database-manager.ts 改造完成
  □ project-database.ts 导入改为动态版本
  □ 验证应用启动正常

✅ Phase 2: SearchAndScraper 数据库功能
  □ v1.2.5.schema.ts 创建完成
  □ schema/versions/index.ts 更新完成
  □ ProjectDatabase 业务方法添加完成
  □ DatabaseService 全局方法添加完成
  □ database-handlers.ts IPC 处理器注册完成
  □ 前端 Store 包装方法添加完成

✅ Phase 3: 前端 UI 改造
  □ NovelScraperPanel.vue 改造完成
  □ ChapterListSection.vue 改造完成
  □ ChapterSummarySection.vue 验证完成

✅ Phase 4: 集成与测试
  □ 功能测试全部通过
  □ 数据库迁移测试通过
  □ 性能测试通过
```

---

Boss，这就是完整的改造计划！核心特点：

1. ✅ **分阶段实施**：基础改造 → 业务功能 → UI 改造 → 集成测试
2. ✅ **渐进式开发**：全局数据库现在支持版本演进，每次只需添加新Schema
3. ✅ **数据隔离**：批次之间数据完全独立，互不影响
4. ✅ **选择器复用**：全局学习选择器，跨项目共享
5. ✅ **易于验证**：提供了详细的测试清单和验证点