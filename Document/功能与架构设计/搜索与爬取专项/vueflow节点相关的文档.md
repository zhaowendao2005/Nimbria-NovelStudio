## 📋 VueFlow工作流体系 - 完整代码遍览

Boss，我已经系统地遍览了整个VueFlow工作流系统。让我为你编制一份完整的技术地图：

---

### 🏗️ **系统架构层级**

```
┌─────────────────────────────────────────────────────────────┐
│ 前端层（Vue 3 + Quasar）                                    │
├─────────────────────────────────────────────────────────────┤
│ • WorkflowCanvas.vue              [VueFlow画布]              │
│ • NodeConfigContent.vue           [节点配置表单]            │
│ • AdvancedSettingsDrawer.vue      [浏览器设置]              │
│ • Nodes/GetTextNode.vue           [自定义节点]              │
├─────────────────────────────────────────────────────────────┤
│ 状态管理层（Pinia）                                         │
├─────────────────────────────────────────────────────────────┤
│ • workflow.store.ts               [多实例工作流状态]        │
│   - instances: Map<tabId, WorkflowInstance>                │
│   - browserExecutablePath: 浏览器配置                      │
│   - Actions: 18+ 状态操作                                   │
├─────────────────────────────────────────────────────────────┤
│ IPC通信层                                                   │
├─────────────────────────────────────────────────────────────┤
│ • project-preload.ts              [前端API暴露]             │
│   - window.nimbria.workflow.*                              │
│   - window.nimbria.database.*                              │
│ • workflow-handlers.ts            [后端IPC处理器]          │
│   - workflow:execute-node                                   │
│   - workflow:detect-browsers                                │
│   - workflow:set/get-browser-path                          │
├─────────────────────────────────────────────────────────────┤
│ 后端执行层                                                  │
├─────────────────────────────────────────────────────────────┤
│ • GetTextExecutor.ts              [文本提取执行器]          │
│   - executeWithBrowserView()                                │
│   - executeWithCheerio()                                    │
│   - executeWithPuppeteer()                                  │
│ • browser-view-manager.ts         [浏览器管理]             │
│ • BrowserViewManager (Service)    [Chromium实例管理]       │
├─────────────────────────────────────────────────────────────┤
│ 数据存储层（SQLite + localStorage）                        │
├─────────────────────────────────────────────────────────────┤
│ • project.db                      [项目工作流数据]         │
│ • localStorage                    [浏览器配置缓存]         │
└─────────────────────────────────────────────────────────────┘
```

---

### 📝 **类型定义系统**

#### **前端类型** (`AdvancedMode/types.ts`)

```typescript
// 🔥 核心数据结构
type ScraperEngine = 'browserview' | 'cheerio' | 'puppeteer'

interface WorkflowNode {
  id: string
  type: 'get-text' | 'get-links' | 'operation' | 'iterator' | 'object'
  position: { x: number; y: number }
  data: WorkflowNodeData
  dragHandle?: string
}

interface WorkflowNodeData {
  label: string
  selector?: string
  config?: GetTextNodeConfig
  output?: any
}

interface GetTextNodeConfig {
  strategy: 'direct' | 'max-text'      // 提取策略
  removeSelectors?: string               // 移除元素
  engine?: ScraperEngine                 // 爬取引擎（关键参数）
  densityWeight?: number                 // 权重（0-100%）
}

interface WorkflowExecutionStatus = 
  | 'idle' | 'running' | 'paused' | 'completed' | 'error'

interface WorkflowInstance {
  id: string
  batchId?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  status: WorkflowExecutionStatus
  currentNodeId?: string
  nodeOutputs: Map<string, NodeExecutionResult>  // 节点ID→执行结果
  titleSelector?: string
  createdAt: number
  updatedAt: number
}
```

#### **后端类型** (`workflow-executor/types.ts`)

```typescript
interface NodeExecutor {
  execute(
    node: WorkflowNode,
    context: WorkflowExecutionContext,
    input?: any
  ): Promise<NodeExecutionResult>
}

interface WorkflowExecutionContext {
  tabId: string
  currentUrl?: string
  variables?: Map<string, any>
}

interface GetTextOutput {
  title?: TextExtractionResult
  content: TextExtractionResult
  url: string
  engine: ScraperEngine
  duration?: number
}

interface TextExtractionResult {
  text: string
  length: number
  selector: string
}

interface NodeExecutionResult {
  nodeId: string
  success: boolean
  output?: any
  error?: string
  executedAt: number
  engine?: ScraperEngine
  duration?: number
}
```

---

### 🔌 **IPC通信接口总览**

#### **前端API** (`window.nimbria.workflow`)

```typescript
// 🔥 核心API
window.nimbria.workflow = {
  // 执行相关
  executeNode(request: {
    node: WorkflowNode
    context: WorkflowExecutionContext
    input?: any
  }): Promise<NodeExecutionResult>
  
  // 浏览器配置
  detectBrowsers(): Promise<{
    success: boolean
    browsers?: Array<{
      name: string
      type: 'edge' | 'chrome'
      path: string
    }>
    error?: string
  }>
  
  setBrowserPath(path: string | null): Promise<{
    success: boolean
    error?: string
  }>
  
  getBrowserPath(): Promise<{
    success: boolean
    path?: string | null
    error?: string
  }>
}
```

#### **后端IPC Handler** (`workflow-handlers.ts`)

```typescript
// 处理器列表
ipcMain.handle('workflow:execute-node', async (event, request) => {
  // 1. 获取BrowserViewManager
  // 2. 根据node.type选择执行器
  // 3. 调用executor.execute()
  // 4. 返回NodeExecutionResult
})

ipcMain.handle('workflow:detect-browsers', async () => {
  // 调用GetTextExecutor.detectAllBrowsers()
  // 返回检测到的Edge/Chrome列表
})

ipcMain.handle('workflow:set-browser-path', async (event, {path}) => {
  // 调用GetTextExecutor.setUserBrowserPath(path)
  // 设置全局userBrowserPath变量
})

ipcMain.handle('workflow:get-browser-path', async () => {
  // 返回当前配置的浏览器路径
})
```

---

### 🔄 **执行流程管线**

#### **节点执行完整流程**

```
用户点击"执行"按钮 (NodeConfigContent.vue)
  ↓
emit('execute-node') 事件
  ↓
父组件(NovelScraperPanel.vue)捕获
  ↓
handleNodeClick() 触发
  ↓
构建NodeExecutionRequest {
  node: WorkflowNode,
  context: {
    tabId: string,
    currentUrl: string
  }
}
  ↓
IPC invoke 'workflow:execute-node'
  ↓
❌ 前端 → 主进程 ↔ IPC通道 ❌
  ↓
Main Process workflow-handler.ts
  ↓
getOrCreateExecutor(node.type)
  ├─ case 'get-text':
  │   └─ new GetTextExecutor(browserViewManager)
  └─ case 'get-links': TODO
  └─ case 'operation': TODO
  ↓
executor.execute(node, context)
  ↓
GetTextExecutor.execute()
  ├─ 1️⃣ 检查URL
  ├─ 2️⃣ 根据config.engine选择执行方式
  │   ├─ BrowserView: await this.executeWithBrowserView()
  │   ├─ Cheerio: await this.executeWithCheerio()
  │   └─ Puppeteer: await this.executeWithPuppeteer()
  ├─ 3️⃣ 计算执行时间
  └─ 4️⃣ 返回GetTextOutput
  ↓
返回 NodeExecutionResult {
  nodeId, success, output, engine, duration, executedAt
}
  ↓
IPC主进程 → 前端 ↔ 返回结果
  ↓
前端Promise resolve
  ↓
更新formData.output
  ↓
UI显示执行结果
  ├─ 元数据卡片（URL、引擎、耗时）
  └─ 提取结果（标题、内容、选择器）
```

---

### ⚙️ **3个执行引擎对比**

| 引擎 | 入口 | 特点 | 场景 | 性能 |
|------|------|------|------|------|
| **BrowserView** | `executeWithBrowserView()` | ✅ 支持动态JS / ✅ 可视化 / ✅ Cookie复用 | 防爬网站、需要JS执行 | 中等 |
| **Cheerio** | `executeWithCheerio()` | ✅ 轻量级 / ✅ 快速 / ❌ 仅静态HTML | 开放API、静态内容 | 高 |
| **Puppeteer** | `executeWithPuppeteer()` | ✅ 完整Chromium / ✅ Anti-detection / ❌ 资源占用 | 中等规模爬虫、复杂反爬 | 中低 |

#### **BrowserView执行逻辑** (L92-232)

```typescript
// 1. 加载URL（如果不同）
if (currentUrl !== url) {
  browserViewManager.loadURL(tabId, url)
  await new Promise(resolve => setTimeout(resolve, 2000))
}

// 2. 获取WebContents
const viewInstance = browserViewManager.views.get(tabId)

// 3. 执行JS提取
const result = await viewInstance.view.webContents.executeJavaScript(`
  (function() {
    // 移除干扰元素
    document.querySelectorAll(removeSelectors).forEach(el => el.remove())
    
    // 根据策略提取
    if (strategy === 'max-text') {
      // 遍历候选元素，计算评分
      // score = length * w1 + density * 1000 * w2
      // 返回最高分元素
    } else {
      // 直接querySelector
    }
    
    return {
      title: { text, length, selector },
      content: { text, length, selector },
      url: window.location.href
    }
  })()
`)
```

#### **Cheerio执行逻辑** (L237-364)

```typescript
// 1. HTTP请求
const response = await axios.get(url, {
  timeout: 30000,
  headers: {
    'User-Agent': '...',
    'Accept': '...'
  }
})

// 2. 使用Cheerio解析
const $ = load(response.data)

// 3. 移除干扰
removeSelectors.split(',').forEach(sel => $(sel).remove())

// 4. 提取内容（同BrowserView逻辑）
```

#### **Puppeteer执行逻辑** (L369-544)

```typescript
// 1. 初始化Browser
if (!this.puppeteerBrowser) {
  await this.initPuppeteerBrowser()
}

// 2. 获取用户Session
const cookies = await this.getCookiesFromBrowserView(tabId)

// 3. 创建新Page
const page = await this.puppeteerBrowser.newPage()

// 4. 设置反检测
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => false
  })
  window.chrome = { runtime: {} }
})

// 5. 导航 + 等待DOM加载
await page.goto(url, { waitUntil: 'domcontentloaded' })

// 6. 提取内容（同BrowserView逻辑）
```

---

### 🧠 **Pinia Store管理**

#### **工作流Store** (`workflow.store.ts`)

```typescript
const instances = ref<Map<string, WorkflowInstance>>()
const browserExecutablePath = ref<string | null>()

// 核心Actions（18个）
{
  initializeInstance(tabId, batchId?)
  getOrCreateInstance(tabId, batchId?)
  
  updateNodes(tabId, nodes)
  updateEdges(tabId, edges)
  updateNodeData(tabId, nodeId, data)
  
  setNodeOutput(tabId, nodeId, result)      // 🔥 缓存执行结果
  getNodeOutput(tabId, nodeId)
  
  updateStatus(tabId, status, currentNodeId)
  setTitleSelector(tabId, selector)
  
  clearWorkflow(tabId)
  deleteInstance(tabId)
  exportWorkflow(tabId)
  
  // 浏览器配置
  setBrowserExecutablePath(path)             // 🔥 保存到localStorage + IPC
  loadBrowserExecutablePath()                // 🔥 启动时加载
}
```

---

### 🔧 **关键服务与方法**

#### **GetTextExecutor** (786行核心服务)

| 方法 | 职责 | 返回值 |
|------|------|--------|
| `execute()` | 主入口，分发到3个引擎 | Promise<NodeExecutionResult> |
| `executeWithBrowserView()` | BrowserView爬取 | Promise<GetTextOutput> |
| `executeWithCheerio()` | HTTP+解析爬取 | Promise<GetTextOutput> |
| `executeWithPuppeteer()` | 独立浏览器爬取 | Promise<GetTextOutput> |
| `getBrowserPath()` | 路径优先级获取 | Promise<string> |
| `detectAllBrowsers()` | 检测系统Edge/Chrome | Browser[] |
| `detectEdge()` | Edge路径检测 | string |
| `detectChrome()` | Chrome路径检测 | string |
| `getCookiesFromBrowserView()` | 复用Session | Cookie[] |
| `initPuppeteerBrowser()` | 初始化Puppeteer | 启动Edge/Chrome |
| `cleanup()` | 资源清理 | 关闭浏览器进程 |

#### **BrowserViewManager** (1623行)

| 关键方法 | 职责 |
|---------|------|
| `startElementPicker()` | 启动元素选取模式 |
| `confirmSelection()` | 确认选中元素 |
| `confirmSelectionWithCDP()` | 使用CDP确认（反爬网站） |
| `updateDetailBox()` | 更新详细信息面板 |
| `handleMouseMove()` | 鼠标移动事件 |

---

### 📊 **前端执行流程**

#### **NodeConfigContent.vue** (792行组件)

```
Props:
  - currentNode: WorkflowNode | null
  - currentNodeOutput: NodeExecutionResult | null
  
State:
  - formData: { selector, titleSelector, strategy, engine, densityWeight, removeSelectors }
  - isExecuting: boolean
  - selectedEngine: ScraperEngine
  - isContentPickerActive: boolean
  - isTitlePickerActive: boolean
  
Methods:
  - handleTestExecute()                      // 执行节点
  - handlePickElement()                       // 启动内容选取
  - handlePickTitleElement()                  // 启动标题选取
  - handleConfigChange()                      // 配置变更
  - formatWeightTooltip()                     // 权重提示
  
Events emit:
  - execute-node                              // 请求执行
  - update-config                             // 配置更新
```

---

### 🎨 **UI层组件系统**

| 组件 | 路径 | 职责 | 行数 |
|------|------|------|------|
| WorkflowCanvas | `.../WorkflowCanvas.vue` | VueFlow画布容器 | ~100 |
| GetTextNode | `.../Nodes/GetTextNode.vue` | 自定义节点渲染 | ~100 |
| NodeConfigContent | `.../NodeConfigContent.vue` | 节点配置表单 | 792 |
| AdvancedSettingsDrawer | `.../AdvancedSettingsDrawer.vue` | 浏览器设置 | 337 |

---

### 🔐 **数据流向**

```
VueFlow UI (用户操作)
  ↓ 节点配置
Pinia Store (状态缓存)
  ↓ IPC invoke
Main Process (后端处理)
  ↓ 执行引擎选择
GetTextExecutor (3个引擎之一)
  ↓ 内容提取
BrowserView / Cheerio / Puppeteer
  ↓ 结果返回
IPC Promise resolve
  ↓ 状态更新
UI 渲染执行结果
```

---

### 📌 **下一步开发指南**

当你继续开发时，关键路径：

1. **添加新的节点类型**：
   - 在 `types.ts` 的 `WorkflowNode['type']` 中添加
   - 在 `workflow-handlers.ts` 的 switch 中添加case
   - 创建对应的 `XxxExecutor` 类实现 `NodeExecutor` 接口

2. **扩展执行引擎**：
   - 修改 `ScraperEngine` 类型
   - 在 `GetTextExecutor` 中添加 `executeWithNewEngine()` 方法
   - 在 `workflow-handlers.ts` 中适配

3. **增强内容检测**：
   - 调整 `max-text` 算法（L155-192 in BrowserView）
   - 修改 `densityWeight` 权重系数

4. **优化性能**：
   - 考虑Puppeteer连接池（目前单线程）
   - Session持久化（不是每次重新登录）

---

这就是完整的VueFlow工作流体系！所有关键路径、接口、执行流程都在这里了，可以直接用作后续开发的参考地图。 🗺️