## 📚 SearchAndScraper 爬虫业务域完整文档

# SearchAndScraper（小说爬虫）业务域完整架构文档

**文档状态**：🟡 开发中 - 当前实现到 Iteration 3（章节爬取功能）

**最后更新**：2025-10-26

---

## 📊 目录

1. [架构概览](#架构概览)
2. [系统分层](#系统分层)
3. [数据流向](#数据流向)
4. [核心服务](#核心服务)
5. [IPC 通信协议](#ipc-通信协议)
6. [前端 Pinia Store 设计](#前端-pinia-store-设计)
7. [数据存储层](#数据存储层)
8. [实现状态](#实现状态)

---

## 架构概览

### 整体架构图

```mermaid
graph TB
    subgraph MainProcess["🔧 Electron 主进程"]
        DB["DatabaseService\n(SQLite CRUD)"]
        BVM["BrowserViewManager\n(Chromium)"]
        IPC_HANDLERS["IPC Handlers\ndatabase:*\nsearch-scraper:*"]
        
        DB --- IPC_HANDLERS
        BVM --- IPC_HANDLERS
    end
    
    subgraph RenderProcess["🎨 Vue 3 渲染进程 Quasar"]
        subgraph PanelContainer["SearchAndScraperPanel"]
            LeftPanel["LeftPanel\n(搜索引擎)"]
            HistoryPanel["HistoryPanel\n(浏览历史)"]
            RightPanel["RightPanel"]
            
            subgraph NovelTab["NovelScraperPanel"]
                BatchSelect["- BatchSelect"]
                ChapterList["- ChapterList"]
                ChapterSummary["- ChapterSummary"]
            end
            
            RightPanel --- NovelTab
        end
        
        PiniaStore["Pinia Store\n(多实例支持)\nuseSearchAndScraperStore"]
        Service["SearchAndScraperService\n+ ScraperStorageService"]
        Components["Vue Components\n(ChapterListSection, etc.)"]
        
        PanelContainer --- PiniaStore
        PanelContainer --- Service
        PiniaStore --- Components
    end
    
    Storage["💾 Storage"]
    LocalStorage["localStorage\n(browse-history)"]
    
    RenderProcess <-->|IPC invoke/send| MainProcess
    RenderProcess --> LocalStorage
    Storage -.->|SQLite| DB
    
    style MainProcess fill:#e1f5fe
    style RenderProcess fill:#f3e5f5
    style Storage fill:#fff3e0
```

---

## 系统分层

### 分层架构

```mermaid
graph TB
    GUI["🖼️ GUI Layer<br/>Vue Components<br/>SearchAndScraperPanel<br/>NovelScraperPanel<br/>HistoryPanel"]
    
    State["📊 State Management<br/>Pinia Store<br/>useSearchAndScraperStore<br/>多实例支持"]
    
    Service["🔧 Service Layer (Frontend)<br/>SearchAndScraperService<br/>ScraperStorageService<br/>LightModeScraper"]
    
    IPC["📡 IPC Communication<br/>database:* handlers<br/>search-scraper:* handlers<br/>Event listeners"]
    
    Backend["⚙️ Backend Service Layer<br/>DatabaseService<br/>BrowserViewManager<br/>BrowserSessionManager<br/>LightModeScraper"]
    
    Data["💾 Data Layer<br/>SQLite: project.db<br/>SQLite: nimbria.db<br/>localStorage"]
    
    GUI -->|Props/Events| State
    State -->|Invoke/Send| Service
    Service -->|IPC invoke| IPC
    IPC -->|Handlers| Backend
    Backend -->|CRUD| Data
    
    style GUI fill:#f3e5f5
    style State fill:#e3f2fd
    style Service fill:#e8f5e9
    style IPC fill:#fff3e0
    style Backend fill:#fce4ec
    style Data fill:#ede7f6
```

---

## 数据流向

### 场景1：批次创建 → 章节匹配 → 章节爬取

```mermaid
sequenceDiagram
    participant User as 👤 用户
    participant UI as 🎨 Vue Component
    participant Store as 📊 Pinia Store
    participant Service as 🔧 SearchAndScraperService
    participant IPC as 📡 IPC
    participant Main as ⚙️ Main Process
    participant DB as 💾 Database
    
    User->>UI: 1️⃣ 创建批次
    activate UI
    UI->>Store: updateInstance()
    UI->>IPC: invoke database:create-novel-batch
    activate IPC
    IPC->>Main: 接收请求
    activate Main
    Main->>DB: 生成 ID + INSERT batch
    DB-->>Main: ✅ success, batchId
    Main-->>IPC: 返回结果
    deactivate Main
    IPC-->>UI: ✅ batchId
    deactivate IPC
    UI->>Store: 更新 batchList
    deactivate UI
    
    User->>UI: 2️⃣ 手动打开目录页
    activate IPC
    IPC->>Main: 监听导航事件
    Main->>IPC: send navigation-changed
    IPC-->>Store: 更新 currentUrl
    deactivate IPC
    
    User->>UI: 3️⃣ 点击"智能匹配章节"
    activate UI
    UI->>Service: extractChapters()
    activate Service
    Service-->>UI: {success, chapters}
    deactivate Service
    UI->>IPC: invoke save-matched-chapters
    activate IPC
    IPC->>Main: {batchId, chapters, sourcePageUrl}
    activate Main
    Main->>DB: 批量 INSERT matched_chapters
    Main->>DB: UPDATE batch.total_matched
    DB-->>Main: {success, chapters:[{id,title,url}]}
    Main-->>IPC: 返回完整数据
    deactivate Main
    IPC-->>UI: ✅ chapters with id
    deactivate IPC
    UI->>Store: 更新 matchedChapters
    deactivate UI
    
    User->>UI: 4️⃣ 选择要爬取的章节
    Note over UI: ChapterListSection 显示列表<br/>用户选择（默认全选）
    
    User->>UI: 5️⃣ 点击"爬取章节"
    activate UI
    alt Browser Mode
        UI->>Service: scrapeBrowserMode()
        activate Service
        loop 每个章节
            Service->>Main: loadURL + querySelector
            Main-->>Service: content
            Service->>IPC: invoke save-scraped-chapter
            activate IPC
            IPC->>Main: 保存
            Main->>DB: INSERT scraped_chapters
            Main->>DB: UPDATE matched_chapters is_scraped=1
            DB-->>Main: ✅
            Main-->>IPC: ✅
            IPC-->>Service: ✅
            deactivate IPC
        end
        Service-->>UI: 爬取完成
        deactivate Service
    else Light Mode
        UI->>Service: scrapeLightMode()
        activate Service
        Service->>Main: 并行 HTTP 请求 (axios + cheerio)
        Main-->>Service: 所有结果
        Service->>IPC: invoke save-scraped-chapter (批量)
        activate IPC
        IPC->>Main: 批量保存
        Main->>DB: 批量 INSERT
        DB-->>Main: ✅
        Main-->>IPC: ✅
        IPC-->>Service: ✅
        deactivate IPC
        Service-->>UI: 爬取完成
        deactivate Service
    end
    deactivate UI
    
    UI->>Store: 更新 scrapedChapters
    UI->>UI: 实时显示爬取进度
```

---

## 核心服务

### 1. SearchAndScraperService（前端服务）

**位置**：`Nimbria/Client/Service/SearchAndScraper/search-and-scraper.service.ts`

**职责**：
- BrowserView 生命周期管理
- 导航控制（goBack, goForward, loadURL）
- 元素选取
- 章节提取（智能选择器）
- 章节爬取（点击、填充等）
- Cookie 管理

**核心方法**：

```typescript
// Session 管理
static async initSession(): Promise<SearchScraperInitResponse>
static async getCookies(url: string): Promise<SearchScraperCookiesResponse>
static async getAllCookies(): Promise<SearchScraperCookiesResponse>

// BrowserView 控制
static async createView(tabId: string): Promise<{ success: boolean }>
static async showView(tabId: string, bounds: BrowserViewBounds): Promise<{ success: boolean }>
static async hideView(tabId: string): Promise<{ success: boolean }>
static async destroyView(tabId: string): Promise<{ success: boolean }>
static async loadURL(tabId: string, url: string): Promise<{ success: boolean }>

// 导航控制
static async goBack(tabId: string): Promise<{ success: boolean }>
static async goForward(tabId: string): Promise<{ success: boolean }>
static async reload(tabId: string): Promise<{ success: boolean }>

// 元素选取
static async startSelectingElement(tabId: string, elementPath?: string): Promise<{ success: boolean }>
static async stopSelectingElement(tabId: string): Promise<{ success: boolean }>

// 章节相关
static async extractChapters(tabId: string): Promise<{
  success: boolean
  chapters?: Array<{ title: string; url: string }>
  error?: string
}>
static async scrapeChapter(tabId: string, url: string): Promise<{
  success: boolean
  chapter?: { title: string; content: string }
  error?: string
}>
static async scrapeChaptersLight(
  tabId: string,
  chapters: Array<{ title: string; url: string }>,
  options: LightScrapeOptions
): Promise<{
  success: boolean
  results?: ScrapeResult[]
  error?: string
}>

// 获取状态
static async getNavigationState(tabId: string): Promise<NavigationState>
```

---

### 2. ScraperStorageService（存储服务）🟡 已实现

**位置**：`Nimbria/Client/Service/SearchAndScraper/scraper-storage.service.ts`

**职责**：
- 隔离数据存储逻辑
- 为不同爬取方式提供统一接口
- 处理数据库 IPC 调用

**核心方法**：

```typescript
// 单个保存
static async saveScrapedChapter(
  projectPath: string,
  data: {
    matchedChapterId: string
    batchId: string
    title: string
    url: string
    content: string
    summary: string
    scrapeDuration: number
  }
): Promise<{ success: boolean; error?: string }>

// 批量保存
static async batchSaveScrapedChapters(
  projectPath: string,
  chapters: Array<{...}>
): Promise<{
  successCount: number
  failedChapters: Array<{ title: string; error: string }>
}>

// 获取数据
static async getScrapedChapters(
  projectPath: string,
  batchId: string
): Promise<{
  success: boolean
  chapters?: NovelScrapedChapter[]
  error?: string
}>

static async getBatchSummary(
  projectPath: string,
  batchId: string
): Promise<{
  success: boolean
  summary?: NovelBatchSummary
  error?: string
}>

// 辅助方法
static generateSummary(content: string, maxLength: number = 200): string
```

---

### 3. LightModeScraper（轻量爬虫）🟡 已实现

**位置**：`Nimbria/src-electron/services/search-scraper-service/light-mode-scraper.ts`

**职责**：
- 使用 HTTP 请求并行爬取
- 使用 cheerio 解析 HTML
- 支持批量并行控制

**核心方法**：

```typescript
export class LightModeScraper {
  // 并行爬取多个章节
  public async scrapeChapters(
    chapters: ChapterData[],
    options: LightScrapeOptions,
    onProgress?: (current: number, total: number, currentChapter: string) => void
  ): Promise<ScrapeResult[]>

  // 爬取单个章节（私有方法）
  private async scrapeChapter(
    chapter: ChapterData,
    options: LightScrapeOptions
  ): Promise<ScrapeResult>
}

// 配置接口
export interface LightScrapeOptions {
  selector: string              // CSS 选择器
  parallelCount: number         // 并行数（默认3）
  timeout: number               // 超时（毫秒）
  urlPrefix?: string            // URL 前缀
  headers?: Record<string, string>  // 自定义 Headers
}

// 结果接口
export interface ScrapeResult {
  success: boolean
  chapter: ChapterData
  content?: string
  error?: string
}
```

**并行机制**：使用 `p-limit` 库控制并行数量

```typescript
const limit = pLimit(options.parallelCount)
const tasks = chapters.map(chapter =>
  limit(async () => {
    // 爬取逻辑
    return await this.scrapeChapter(chapter, options)
  })
)
return await Promise.all(tasks)
```

---

### 4. BrowserViewManager（浏览器管理）

**位置**：`Nimbria/src-electron/services/search-scraper-service/browser-view-manager.ts`

**职责**：
- 创建和管理 BrowserView 实例
- 监听导航事件、加载事件
- 处理 console 消息（元素选取、缩放控制）
- 提供 JavaScript 注入

**核心事件**：

```typescript
// Chromium 事件（BrowserView 内部）
view.webContents.on('did-navigate', ...)          // 页面导航完成
view.webContents.on('did-navigate-in-page', ...)  // 页面内导航
view.webContents.on('did-start-loading', ...)     // 开始加载
view.webContents.on('did-stop-loading', ...)      // 加载完成
view.webContents.on('did-finish-load', ...)       // 页面加载完毕
view.webContents.on('did-fail-load', ...)         // 加载失败
view.webContents.on('console-message', ...)       // console 消息

// 转发给主窗口（window.webContents.send）
'search-scraper:navigation-changed'       // 导航状态变化
'search-scraper:loading-changed'          // 加载状态变化
'search-scraper:load-failed'              // 加载失败
'search-scraper:element-selected'         // 元素选取完成
```

---

### 5. DatabaseService（数据库服务）

**位置**：`Nimbria/src-electron/services/database-service/`

**职责**：
- 管理项目数据库和全局数据库
- 执行 CRUD 操作
- 版本管理和迁移

**项目数据库方法**（与爬虫相关）：

```typescript
// 批次管理
createNovelBatch(data: { name: string; description?: string }): string
getAllNovelBatches(): Array<SearchAndScraperNovelBatch>
getNovelBatch(batchId: string): SearchAndScraperNovelBatch | null
updateNovelBatchStats(batchId: string, stats: { totalMatched?: number; totalScraped?: number }): void

// 匹配章节
saveMatchedChapters(
  batchId: string, 
  chapters: Array<{ title: string; url: string }>,
  sourcePageUrl?: string
): Array<{ id: string; title: string; url: string; chapterIndex: number }>

getMatchedChapters(batchId: string): Array<NovelMatchedChapterRow>
toggleChapterSelection(chapterId: string, selected: boolean): void
toggleAllChaptersSelection(batchId: string, selected: boolean): void

// 爬取章节
saveScrapedChapter(data: {
  matchedChapterId: string
  batchId: string
  title: string
  url: string
  content: string
  summary: string
  scrapeDuration: number
}): void

getScrapedChapters(batchId: string): Array<NovelScrapedChapterRow>
getNovelBatchSummary(batchId: string): NovelBatchSummary
```

---

## IPC 通信协议

### 命名约定

- **数据库操作**：`database:*`
- **搜索爬虫操作**：`search-scraper:*`
- **事件广播**：`on` 监听（服务端发起）
- **方法调用**：`invoke` 调用（客户端发起）

### 核心 IPC 通道

#### 1. 数据库通道（database:*）

```typescript
// ================== 批次管理 ==================

// 创建批次
ipcRenderer.invoke('database:search-scraper-create-novel-batch', {
  projectPath: string
  data: { name: string; description?: string }
})
→ { success: boolean; batchId?: string; error?: string }

// 获取所有批次
ipcRenderer.invoke('database:search-scraper-get-all-novel-batches', {
  projectPath: string
})
→ { success: boolean; batches?: NovelBatch[]; error?: string }

// ================== 匹配章节 ==================

// 保存匹配章节（返回完整数据包含id）
ipcRenderer.invoke('database:search-scraper-save-matched-chapters', {
  projectPath: string
  batchId: string
  chapters: Array<{ title: string; url: string }>
  sourcePageUrl?: string
})
→ { 
  success: boolean
  error?: string
  chapters?: Array<{ id: string; title: string; url: string; chapterIndex: number }>
}

// 获取匹配章节
ipcRenderer.invoke('database:search-scraper-get-matched-chapters', {
  projectPath: string
  batchId: string
})
→ { success: boolean; chapters?: NovelMatchedChapterRow[]; error?: string }

// 切换章节选中状态
ipcRenderer.invoke('database:search-scraper-toggle-chapter-selection', {
  projectPath: string
  chapterId: string
  selected: boolean
})
→ { success: boolean; error?: string }

// ================== 爬取章节 ==================

// 保存单个爬取章节
ipcRenderer.invoke('database:search-scraper-save-scraped-chapter', {
  projectPath: string
  data: {
    matchedChapterId: string
    batchId: string
    title: string
    url: string
    content: string
    summary: string
    scrapeDuration: number
  }
})
→ { success: boolean; error?: string }

// 获取爬取章节
ipcRenderer.invoke('database:search-scraper-get-scraped-chapters', {
  projectPath: string
  batchId: string
})
→ { success: boolean; chapters?: NovelScrapedChapterRow[]; error?: string }

// 获取批次统计
ipcRenderer.invoke('database:search-scraper-get-batch-summary', {
  projectPath: string
  batchId: string
})
→ {
  success: boolean
  summary?: {
    totalMatched: number
    totalScraped: number
    totalWords: number
    avgScrapeDuration: number
  }
  error?: string
}
```

#### 2. 搜索爬虫通道（search-scraper:*）

```typescript
// ================== 事件监听 (ipcRenderer.on) ==================

// BrowserView 导航状态变化
ipcRenderer.on('search-scraper:navigation-changed', (event, data) => {
  tabId: string
  url: string
  canGoBack: boolean
  canGoForward: boolean
})

// 页面加载状态
ipcRenderer.on('search-scraper:loading-changed', (event, data) => {
  tabId: string
  isLoading: boolean
})

// 加载失败
ipcRenderer.on('search-scraper:load-failed', (event, data) => {
  tabId: string
  url: string
  errorCode: number
  errorDescription: string
})

// 元素选取完成
ipcRenderer.on('search-scraper:element-selected', (event, data) => {
  tabId: string
  selector: string
  tagName: string
  textContent?: string
  xpath?: string
  timestamp: number
})
```

#### 3. Preload API（window.nimbria）

```typescript
// 在 project-preload.ts 中定义的接口

window.nimbria.searchScraper = {
  // Session
  initSession(): Promise<SearchScraperInitResponse>
  getCookies(url: string): Promise<SearchScraperCookiesResponse>
  getAllCookies(): Promise<SearchScraperCookiesResponse>
  
  // BrowserView
  createView(tabId: string): Promise<{ success: boolean }>
  showView(tabId: string, bounds: BrowserViewBounds): Promise<{ success: boolean }>
  hideView(tabId: string): Promise<{ success: boolean }>
  destroyView(tabId: string): Promise<{ success: boolean }>
  
  // Navigation
  loadURL(tabId: string, url: string): Promise<{ success: boolean }>
  goBack(tabId: string): Promise<{ success: boolean }>
  goForward(tabId: string): Promise<{ success: boolean }>
  reload(tabId: string): Promise<{ success: boolean }>
  
  // Element Selection
  startSelectingElement(tabId: string, elementPath?: string): Promise<{ success: boolean }>
  stopSelectingElement(tabId: string): Promise<{ success: boolean }>
  
  // Scraping
  extractChapters(tabId: string): Promise<{ success: boolean; chapters?: [...] }>
  scrapeChapter(tabId: string, url: string): Promise<{ success: boolean; chapter?: [...] }>
  scrapeChaptersLight(tabId: string, chapters: [...], options: LightScrapeOptions): Promise<{ success: boolean; results?: [...] }>
  
  // Status
  getNavigationState(tabId: string): Promise<NavigationState>
}

window.nimbria.database = {
  // 批次
  searchScraperCreateNovelBatch(args): Promise<{...}>
  searchScraperGetAllNovelBatches(args): Promise<{...}>
  
  // 匹配章节
  searchScraperSaveMatchedChapters(args): Promise<{...}>
  searchScraperGetMatchedChapters(args): Promise<{...}>
  
  // 爬取章节
  searchScraperSaveScrapedChapter(args): Promise<{...}>
  searchScraperGetScrapedChapters(args): Promise<{...}>
  
  // 统计
  searchScraperGetBatchSummary(args): Promise<{...}>
}
```

---

## 前端 Pinia Store 设计

### useSearchAndScraperStore

**位置**：`Nimbria/Client/stores/projectPage/searchAndScraper/searchAndScraper.store.ts`

**设计原则**：
- 多实例支持（每个标签页一个独立状态）
- 全局浏览历史共享（跨标签页）
- 响应式状态管理

**核心状态**：

```typescript
export interface SearchInstanceState {
  // ========== 基础信息 ==========
  tabId: string                    // 标签页ID
  initialized: boolean             // 是否已初始化
  
  // ========== 搜索引擎 ==========
  currentEngine: SearchEngine      // 当前搜索引擎
  searchHistory: SearchHistoryItem[] // 搜索历史
  
  // ========== BrowserView 状态 ==========
  isViewCreated: boolean          // BrowserView 是否已创建
  isBrowserViewVisible: boolean   // 是否可见
  currentUrl: string              // 当前 URL
  searchQuery: string             // 搜索查询
  
  // ========== 元素选取 ==========
  isSelectingElement: boolean     // 是否正在选取元素
  selectedElements: SelectedElement[] // 选取的元素列表
  
  // ========== 小说爬取 (Iteration 1-3) ==========
  urlPrefix: string               // URL 前缀
  urlPrefixEnabled: boolean       // 是否启用 URL 前缀
  matchedChapters: Chapter[]      // 匹配的章节（Iteration 2）
  scrapedChapters: ScrapedChapter[] // 已爬取章节（Iteration 3）
  isScrapingInProgress: boolean   // 爬取进行中
  scrapingProgress: {             // 爬取进度
    current: number
    total: number
    currentChapter: string
  } | null
  
  // ========== 章节选择 ==========
  chapterSelectMode: boolean      // 选择模式是否启用
  selectedChapterIndexes: Set<number> // 选中的章节索引
  chapterSearchQuery: string      // 章节搜索查询
  
  // ========== 爬取模式 ==========
  scrapeMode: ScrapeMode          // 'browser' | 'light'
  lightModeConfig: {              // 轻量模式配置
    parallelCount: number         // 并行数
    requestTimeout: number        // 请求超时
    contentSelector?: string      // 内容选择器
    selectorLearned: boolean      // 是否已学习
  }
}
```

**核心方法**：

```typescript
// 实例管理
getInstance(tabId: string): SearchInstanceState | undefined
initInstance(tabId: string): SearchInstanceState
updateInstance(tabId: string, updates: Partial<SearchInstanceState>): void
removeInstance(tabId: string): void
reset(): void

// 全局历史管理
loadHistoryFromStorage(): void
saveHistoryToStorage(): void
addHistoryItem(item: Omit<BrowseHistoryItem, 'timestamp'>): void
clearHistory(): void

// 爬取模式管理
updateScrapeMode(tabId: string, mode: ScrapeMode): void
updateLightModeConfig(tabId: string, config: Partial<LightModeConfig>): void
setContentSelector(tabId: string, selector: string): void
resetLightModeSelector(tabId: string): void
```

**LocalStorage 键**：

```typescript
const HISTORY_STORAGE_KEY = 'search-scraper-browse-history-global'
const MAX_HISTORY_ITEMS = 100
```

---

## 数据存储层

### SQLite Schema（v1.2.5）

#### 项目数据库表

```sql
-- ==================== 批次表 ====================
CREATE TABLE SearchAndScraper_novel_batch (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  total_matched INTEGER DEFAULT 0,
  total_scraped INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

-- ==================== 匹配章节表 ====================
CREATE TABLE SearchAndScraper_novel_matched_chapters (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  chapter_index INTEGER NOT NULL,
  
  site_domain TEXT,
  is_selected INTEGER DEFAULT 1,
  is_scraped INTEGER DEFAULT 0,  -- 🔥 标记是否已爬取
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (batch_id) REFERENCES SearchAndScraper_novel_batch(id) ON DELETE CASCADE
)

-- ==================== 爬取章节表 ====================
CREATE TABLE SearchAndScraper_novel_scraped_chapters (
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
)
```

#### 全局数据库表

```sql
-- ==================== 网站选择器表 ====================
CREATE TABLE SearchAndScraper_novel_site_selectors (
  id TEXT PRIMARY KEY,
  site_domain TEXT NOT NULL UNIQUE,
  site_name TEXT NOT NULL,
  
  chapter_list_selector TEXT,    -- Iteration 2 学习
  chapter_content_selector TEXT, -- Iteration 3 学习
  
  special_logic TEXT,            -- JSON 序列化
  
  success_count INTEGER DEFAULT 0,
  last_used_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

## 实现状态

### ✅ 已完成 (Iteration 1-3)

| 功能 | 状态 | 文件位置 | 说明 |
|------|------|--------|------|
| 批次创建 | ✅ | `project-database.ts` | 支持简化版批次创建（name + description） |
| 匹配章节保存 | ✅ | `project-database.ts` | 返回完整数据包含 id |
| 章节选择 | ✅ | `project-database.ts` | 支持单个/全选切换 |
| 爬取章节保存 | ✅ | `project-database.ts` | 单个/批量保存 |
| BrowserView 管理 | ✅ | `browser-view-manager.ts` | 完整的生命周期管理 |
| LightMode 爬虫 | ✅ | `light-mode-scraper.ts` | HTTP 并行爬虫 + cheerio 解析 |
| IPC 通信 | ✅ | `database-handlers.ts` | 所有数据库操作通道 |
| Pinia Store | ✅ | `searchAndScraper.store.ts` | 多实例支持 |
| 浏览历史 | ✅ | `localStorage` | 全局共享历史 |
| 前端 UI | ✅ | `NovelScraperPanel.vue` | 基础 UI 组件 |

---

### 🟡 开发中 (Iteration 4-5)

| 功能 | 状态 | 计划 | 说明 |
|------|------|------|------|
| 选择器学习（章节列表） | 🟡 | Iteration 4 | 从目录页自动学习 `chapter_list_selector` |
| 选择器学习（章节内容） | 🟡 | Iteration 4 | 从章节页自动学习 `chapter_content_selector` |
| 跨项目选择器复用 | 🟡 | Iteration 4 | 从全局数据库加载已有选择器 |
| 选择器管理界面 | 🟡 | Iteration 4 | 显示/编辑/删除已学习选择器 |
| 批次管理增强 | 🟡 | Iteration 5 | 重命名/删除/复制/导出 |
| 批次导出 | 🟡 | Iteration 5 | 导出为 JSON/TXT/EPUB |
| 断点续爬 | 🟡 | Iteration 5 | 爬取中断后继续 |

---

### ❌ 未开始

| 功能 | 计划 | 说明 |
|------|------|------|
| 代理支持 | Future | 支持代理配置 |
| 验证码处理 | Future | 图像验证码/滑块验证码识别 |
| 混合爬取 | Future | 不同网站使用不同策略 |
| 内容去重 | Future | 去除重复内容 |
| 增量更新 | Future | 只爬取新增章节 |

---

## 关键设计决策

### 1. 数据存储与爬取解耦

**决策**：引入 `ScraperStorageService` 封装所有数据存储逻辑

**优势**：
- 不同爬取方式（Browser + Light + Future）共用存储接口
- 易于扩展新的爬取方式
- 存储逻辑变更时无需修改爬取代码

**实现**：
```
爬取管线 (BrowserMode / LightMode)
         ↓
    ScraperStorageService.saveScrapedChapter()
         ↓
    IPC invoke: database:search-scraper-save-scraped-chapter
         ↓
    DatabaseService (SQLite CRUD)
```

---

### 2. ID 生成和传递

**问题**：前端需要 `matched_chapter_id` 来关联爬取结果，但新创建的章节 ID 在后端生成

**解决**：`saveMatchedChapters` 返回完整数据（包含生成的 id）

**流程**：
```
前端：调用 IPC saveMatchedChapters
           ↓
后端：批量 INSERT，生成 id，收集数据
           ↓
后端：返回 {success, chapters: [{id, title, url}]}
           ↓
前端：接收 id，更新 Store 中的 matchedChapters
           ↓
前端：爬取时直接使用 chapter.id
```

---

### 3. 多实例 Store 设计

**需求**：同一个应用可能打开多个 SearchAndScraper 标签页，各标签页状态独立

**解决**：使用 Map 存储多个 SearchInstanceState

```typescript
const instances = ref<Map<string, SearchInstanceState>>(new Map())

// 每个标签页有唯一的 tabId
getInstance(tabId: string) // 获取某标签页的状态
updateInstance(tabId: string, updates) // 更新某标签页的状态
```

---

### 4. 浏览历史全局共享

**设计**：所有标签页共享一个浏览历史，存储在 localStorage

```typescript
const browseHistory = ref<BrowseHistoryItem[]>([])
const HISTORY_STORAGE_KEY = 'search-scraper-browse-history-global'

// 限制最多 100 条历史
const MAX_HISTORY_ITEMS = 100
```

---

## 文档维护说明

**文档版本**：v1.0.0-dev（开发中）

**更新周期**：
- 每完成一个 Iteration，更新对应功能状态
- 发现架构问题时及时记录并更新决策部分
- 定期同步代码实现与文档

**维护人员**：SearchAndScraper 开发团队

**联系方式**：Boss（项目经理）

