## 📋 完整的 SearchAndScraper 方案

### 🏗️ 多例架构设计

SearchAndScraper 支持多实例场景：

1. **多标签页** - 每个标签页通过 `tabId` 维护独立状态
2. **拆分到独立窗口** - 独立窗口通过 IPC 共享母窗口的 Session，不创建新的
3. **状态持久化** - 使用 `localStorage` 和 Electron 的 Session API 持久化

**多实例状态流：**
```
标签页1 (tabId: search-123)  ──┐
标签页2 (tabId: search-456)  ──┤─→ [searchAndScraperStore (Pinia)]
标签页3 (拆分窗口)         ──┘     ↓
                        [BrowserSessionManager (主进程)]
                        ↓
                    [Electron Session (持久化)]
```

### 📋 文件架构修改树
```
Nimbria/
├── Client/
│   ├── GUI/components/ProjectPage.MainPanel/
│   │   └── SearchAndScraper/                          # ✨ 新建组件目录
│   │       ├── SearchAndScraperPanel.vue              # 主组件
│   │       └── index.ts                               # 导出
│   │
│   ├── Service/
│   │   └── SearchAndScraper/                          # ✨ 新建服务目录
│   │       ├── types/                                 # ✨ 前端类型目录
│   │       │   ├── index.ts                           # 统一导出
│   │       │   ├── config.ts                          # 配置类型
│   │       │   ├── session.ts                         # Session/Cookie 类型
│   │       │   └── api.ts                             # IPC API 类型
│   │       ├── search-and-scraper.service.ts          # 前端服务（IPC 调用）
│   │       └── index.ts                               # Service 导出
│   │
│   └── stores/projectPage/
│       └── searchAndScraper/                          # ✨ 重命名 search → searchAndScraper
│           ├── searchAndScraper.store.ts              # Store
│           ├── searchAndScraper.types.ts              # Store 内部类型
│           └── index.ts
│
└── src-electron/
    ├── types/
    │   └── SearchAndScraper/                          # ✨ 后端类型桥接层
    │       ├── index.ts                               # 根导出
    │       ├── client/
    │       │   └── index.ts                           # 别名转发前端类型
    │       └── backend/
    │           └── index.ts                           # 后端独有类型
    │
    ├── services/
    │   └── search-scraper-service/                    # ✨ 新建服务目录
    │       ├── browser-session-manager.ts             # Session 管理
    │       ├── search-scraper-service.ts              # 主服务
    │       └── index.ts
    │
    └── ipc/main-renderer/
        └── search-scraper-handlers.ts                 # ✨ 新建 IPC 处理
```

### 🔧 实现方案代码

**1. 后端服务** (`src-electron/services/search-scraper-service/browser-session-manager.ts`)

```typescript
import type { Session } from 'electron'
import { session } from 'electron'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

export class BrowserSessionManager {
  private sessionInstance: Session
  private sessionPath: string
  
  constructor() {
    // 创建独立的 session，与主窗口隔离
    this.sessionPath = path.join(app.getPath('userData'), 'search-scraper-session')
    
    // 确保目录存在
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true })
    }
    
    // 创建持久化 session
    this.sessionInstance = session.fromPartition('persist:search-scraper')
  }
  
  async initialize(): Promise<void> {
    // 设置 User-Agent
    this.sessionInstance.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    
    // 配置请求头
    this.sessionInstance.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = {
        ...details.requestHeaders,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'cache-control': 'max-age=0',
        'upgrade-insecure-requests': '1'
      }
      callback({ requestHeaders: headers })
    })
    
    console.log('[BrowserSessionManager] Initialized')
  }
  
  getSession(): Session {
    return this.sessionInstance
  }
  
  async getCookies(url: string): Promise<Electron.Cookie[]> {
    return this.sessionInstance.cookies.get({ url })
  }
  
  async getCookiesAll(): Promise<Electron.Cookie[]> {
    return this.sessionInstance.cookies.get({})
  }
}
```

**2. IPC 处理** (`src-electron/ipc/main-renderer/search-scraper-handlers.ts`)

```typescript
import type { IpcMainInvokeEvent } from 'electron'
import { ipcMain } from 'electron'
import { BrowserSessionManager } from '../../services/search-scraper-service'
import type { 
  SearchScraperInitResponse, 
  SearchScraperCookiesResponse,
  GetCookiesRequest
} from '../../types/SearchAndScraper'

const browserSessionManager = new BrowserSessionManager()

export function setupSearchScraperHandlers(): void {
  // 初始化 Session
  ipcMain.handle('search-scraper:init', async (): Promise<SearchScraperInitResponse> => {
    await browserSessionManager.initialize()
    return { success: true }
  })
  
  // 获取指定 URL 的 Cookies
  ipcMain.handle('search-scraper:get-cookies', async (
    _event: IpcMainInvokeEvent,
    request: GetCookiesRequest
  ): Promise<SearchScraperCookiesResponse> => {
    const cookies = await browserSessionManager.getCookies(request.url)
    return { cookies }
  })
  
  // 获取所有 Cookies
  ipcMain.handle('search-scraper:get-all-cookies', async (
    _event: IpcMainInvokeEvent
  ): Promise<SearchScraperCookiesResponse> => {
    const cookies = await browserSessionManager.getCookiesAll()
    return { cookies }
  })
}
```

**3. 前端 Service** (`Client/Service/SearchAndScraper/search-and-scraper.service.ts`)

```typescript
import type { 
  SearchScraperInitResponse,
  SearchScraperCookiesResponse,
  GetCookiesRequest
} from './types'

export class SearchAndScraperService {
  static async initSession(): Promise<SearchScraperInitResponse> {
    if (!window.nimbria?.invoke) {
      throw new Error('IPC not available')
    }
    return window.nimbria.invoke('search-scraper:init', {})
  }
  
  static async getCookies(url: string): Promise<SearchScraperCookiesResponse> {
    if (!window.nimbria?.invoke) {
      throw new Error('IPC not available')
    }
    const request: GetCookiesRequest = { url }
    return window.nimbria.invoke('search-scraper:get-cookies', request)
  }
  
  static async getAllCookies(): Promise<SearchScraperCookiesResponse> {
    if (!window.nimbria?.invoke) {
      throw new Error('IPC not available')
    }
    return window.nimbria.invoke('search-scraper:get-all-cookies', {})
  }
}
```

**4. 前端 Vue 组件** (`Client/GUI/components/ProjectPage.MainPanel/SearchAndScraper/SearchAndScraperPanel.vue`)

```vue
<template>
  <div class="search-and-scraper-panel">
    <el-splitter style="height: 100%;">
      <el-splitter-panel size="30%">
        <div class="left-panel">
          <div class="search-container">
            <!-- 搜索引擎选择 -->
            <el-dropdown @command="handleEngineSelect" trigger="click">
              <button class="engine-btn">
                <span class="engine-icon">{{ currentEngine }}</span>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="google">Google</el-dropdown-item>
                  <el-dropdown-item command="bing">Bing</el-dropdown-item>
                  <el-dropdown-item command="baidu">Baidu</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            
            <!-- 搜索框 -->
            <el-input
              v-model="searchQuery"
              placeholder="搜索..."
              clearable
              @keyup.enter="handleSearch"
              class="search-input"
            >
              <template #suffix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>
      </el-splitter-panel>
      <el-splitter-panel>
        <div class="right-panel"></div>
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import type { SearchEngine } from '@service/SearchAndScraper/types'
import type { SearchInstanceState } from '@stores/projectPage/searchAndScraper'
import { useSearchAndScraperStore } from '@stores/projectPage/searchAndScraper'
import { SearchAndScraperService } from '@service/SearchAndScraper'

interface Props {
  tabId: string
}

const props = defineProps<Props>()
const searchAndScraperStore = useSearchAndScraperStore()
const instanceState = computed((): SearchInstanceState | undefined => {
  return searchAndScraperStore.getInstance(props.tabId)
})

const searchQuery = ref<string>('')
const currentEngine = ref<string>('G')

const handleEngineSelect = (command: SearchEngine): void => {
  const engineMap: Record<SearchEngine, string> = {
    google: 'G',
    bing: 'B',
    baidu: '百'
  }
  currentEngine.value = engineMap[command]
  localStorage.setItem('search_engine', command)
}

const handleSearch = async (): Promise<void> => {
  if (!searchQuery.value.trim()) return
  console.log('[SearchAndScraper] Searching:', searchQuery.value)
}

onMounted(async (): Promise<void> => {
  searchAndScraperStore.initInstance(props.tabId)
  await SearchAndScraperService.initSession()
  const saved = localStorage.getItem('search_engine')
  if (saved) {
    handleEngineSelect(saved)
  }
})
</script>

<style scoped lang="scss">
.search-and-scraper-panel {
  display: flex;
  height: 100%;
  width: 100%;
  background: var(--el-bg-color-page);
}

.left-panel {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}

.search-container {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.engine-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.search-input {
  flex: 1;

  :deep(.el-input__wrapper) {
    border-radius: 20px;
    padding: 0 16px;
  }
}

.right-panel {
  height: 100%;
  overflow-y: auto;
}
</style>
```

### 📐 类型系统结构（遵循类型通用规范）

#### 第1层：前端类型定义
📍 **位置：** `Client/Service/SearchAndScraper/types/`

```
types/
├── index.ts          # 统一导出口
├── config.ts         # 配置类型（搜索引擎、历史等）
├── session.ts        # Session 和 Cookie 相关
└── api.ts            # IPC API 请求/响应类型
```

**types/config.ts**
```typescript
// 搜索引擎配置
export type SearchEngine = 'google' | 'bing' | 'baidu'

export interface SearchEngineConfig {
  engine: SearchEngine
  baseUrl: string
}

// 搜索历史
export interface SearchHistoryItem {
  query: string
  engine: SearchEngine
  timestamp: number
}
```

**types/session.ts**
```typescript
// Cookie 数据
export interface CookieData {
  name: string
  value: string
  domain: string
  path: string
  expirationDate?: number
}
```

**types/api.ts**
```typescript
// IPC API 类型
export interface SearchScraperInitResponse {
  success: boolean
}

export interface SearchScraperCookiesResponse {
  cookies: CookieData[]
}

export interface GetCookiesRequest {
  url: string
}
```

**types/index.ts**
```typescript
export * from './config'
export * from './session'
export * from './api'
```

#### 第2层：Store 类型（独立定义）
📍 **位置：** `Client/stores/projectPage/searchAndScraper/searchAndScraper.types.ts`

```typescript
import type { SearchEngine, SearchHistoryItem } from '@service/SearchAndScraper/types'

/**
 * Store 内部状态类型
 * 每个 tabId 对应一个实例状态
 */
export interface SearchInstanceState {
  tabId: string
  initialized: boolean
  currentEngine: SearchEngine
  searchHistory: SearchHistoryItem[]
}
```

#### 第3层：后端类型桥接层
📍 **位置：** `src-electron/types/SearchAndScraper/`

```
SearchAndScraper/
├── index.ts           # 根导出（client + backend）
├── client/
│   └── index.ts       # 🌉 别名转发前端类型
└── backend/
    └── index.ts       # 后端独有类型（如有需要）
```

**client/index.ts**
```typescript
/**
 * 前端类型转发
 * 通过别名导入前端类型，转发给后端使用
 */

// 从前端 Service 模块导入类型（使用别名路径）
export type {
  SearchEngine,
  SearchEngineConfig,
  SearchHistoryItem,
  CookieData,
  SearchScraperInitResponse,
  SearchScraperCookiesResponse,
  GetCookiesRequest
} from '@service/SearchAndScraper/types'

/**
 * 注意：这些类型来自前端 Service 层
 * 路径：Nimbria/Client/Service/SearchAndScraper/types/
 * 
 * 在后端使用时，请使用这个中转模块：
 * import type { CookieData } from '../../types/SearchAndScraper'
 */
```

**backend/index.ts**
```typescript
/**
 * 后端独有类型
 * 如：Session 管理内部状态、事件类型等
 */

// 暂时为空，后续有需要再添加
```

**index.ts**
```typescript
/**
 * SearchAndScraper 类型系统统一导出
 */

// 导出前端类型（供后端使用）
export * from './client'

// 导出后端独有类型
export * from './backend'
```

#### 类型导入规范

**✅ 前端组件/Store 导入：**
```typescript
// 从 Service 类型导入
import type { SearchEngine, CookieData } from '@service/SearchAndScraper/types'

// 从 Store 类型导入
import type { SearchInstanceState } from '@stores/projectPage/searchAndScraper'
```

**✅ 后端 Service 导入：**
```typescript
// 通过桥接层导入（实际来自前端）
import type { CookieData, SearchScraperInitResponse } from '../../types/SearchAndScraper'
```

**✅ IPC Handler 导入：**
```typescript
import type { SearchScraperInitResponse, GetCookiesRequest } from '../../types/SearchAndScraper'
```

**❌ 禁止的导入方式：**
```typescript
// ❌ 后端直接导入前端路径
import type { CookieData } from 'Client/Service/SearchAndScraper/types'

// ❌ 前端导入后端类型
import type { SomeBackendType } from 'src-electron/types/SearchAndScraper/backend'
```

### 📝 现有文件修改清单

1. **`ProjectNavbar.vue`** - 将 `type === 'search'` 改为 `type === 'search-and-scraper'`
2. **`markdown.store.ts`** - 将 `openSearch()` 改为 `openSearchAndScraper()`
3. **`PaneContent.vue`** - 导入改为 `SearchAndScraperPanel`
4. **`types.ts` (Markdown)** - `type` 联合改为 `'search-and-scraper'`
5. **`ipc-handlers.ts` (src-electron/ipc)** - 添加 `setupSearchScraperHandlers()` 调用

