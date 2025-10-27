# 📋 VueFlow工作流体系 - 完整技术与交互指南

**文档版本**: v2.0 - 高级交互详解版  
**最后更新**: 2025-10-27  
**覆盖范围**: 系统架构 + 类型系统 + IPC通信 + 执行引擎 + 两种交互模式 + 详细UX/UI流程

---

## 目录
1. [系统架构](#系统架构)
2. [核心类型系统](#核心类型系统)
3. [两种交互模式](#两种交互模式)
4. [详细UX/UI交互](#详细uiux交互)
5. [执行引擎详解](#执行引擎详解)
6. [IPC通信协议](#ipc通信协议)
7. [Pinia状态管理](#pinia状态管理)
8. [下一步开发指南](#下一步开发指南)

---

## 系统架构

### 🏗️ **完整分层架构**

```
┌─────────────────────────────────────────────────────────────┐
│ 🎨 前端层（Vue 3 + Quasar + VueFlow）                       │
├─────────────────────────────────────────────────────────────┤
│ • WorkflowCanvas.vue              [VueFlow画布]              │
│ • NodeConfigContent.vue           [节点配置表单+执行]        │
│ • AdvancedSettingsDrawer.vue      [浏览器环境设置]          │
│ • Nodes/GetTextNode.vue           [自定义节点视图]          │
│ • RightDrawer.vue                 [通用抽屉容器]            │
├─────────────────────────────────────────────────────────────┤
│ 📊 状态管理层（Pinia）                                      │
├─────────────────────────────────────────────────────────────┤
│ • workflow.store.ts               [多实例工作流状态]        │
│   - instances: Map<tabId, WorkflowInstance>                │
│   - browserExecutablePath: 浏览器路径配置                  │
│   - 18+ Actions + Computed Getters                         │
├─────────────────────────────────────────────────────────────┤
│ 📡 IPC通信层（Electron Bridge）                            │
├─────────────────────────────────────────────────────────────┤
│ • project-preload.ts              [安全API暴露]             │
│ • workflow-handlers.ts            [IPC请求处理]            │
│   - workflow:execute-node                                   │
│   - workflow:detect-browsers                                │
│   - workflow:set/get-browser-path                          │
├─────────────────────────────────────────────────────────────┤
│ ⚙️ 后端执行层（Node.js Worker）                           │
├─────────────────────────────────────────────────────────────┤
│ • GetTextExecutor.ts              [文本提取核心]            │
│   - executeWithBrowserView()      [Electron Chromium]       │
│   - executeWithCheerio()          [HTTP+解析]               │
│   - executeWithPuppeteer()        [独立浏览器]              │
│ • browser-view-manager.ts         [浏览器实例管理]         │
│ • BrowserViewManager              [Chromium生命周期]        │
├─────────────────────────────────────────────────────────────┤
│ 💾 数据存储层（持久化）                                     │
├─────────────────────────────────────────────────────────────┤
│ • SQLite: project.db              [工作流数据]             │
│ • localStorage                    [前端配置缓存]           │
│ • Memory (Map)                    [执行结果缓存]           │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心类型系统

### 📝 **前端类型定义** (`AdvancedMode/types.ts`)

```typescript
// ==================== 基础类型 ====================

/** 🔥 爬取引擎类型 - 3种选择 */
type ScraperEngine = 'browserview' | 'cheerio' | 'puppeteer'

/** VueFlow节点通用类型 */
interface WorkflowNode {
  id: string                              // 节点唯一ID (nanoid)
  type: 'get-text' | 'get-links' | ...  // 节点类型
  position: { x: number; y: number }     // 画布坐标
  data: WorkflowNodeData                  // 节点配置数据
  dragHandle?: string                     // 拖拽手柄CSS选择器
}

/** 获取文本节点配置 */
interface GetTextNodeConfig {
  strategy: 'direct' | 'max-text'        // 提取策略
  removeSelectors?: string                 // 要移除的元素
  engine?: ScraperEngine                   // ✨ 关键：爬取引擎
  densityWeight?: number                   // ✨ 权重(0-100, 默认70)
  titleSelector?: string                   // 标题选择器
}

/** 工作流执行状态 */
type WorkflowExecutionStatus = 
  | 'idle'        // ⏹️ 空闲
  | 'running'     // ⏳ 执行中
  | 'paused'      // ⏸️ 暂停
  | 'completed'   // ✅ 完成
  | 'error'       // ❌ 错误

/** 工作流实例 - 存储在Store中 */
interface WorkflowInstance {
  id: string                                    // 与tabId相同
  batchId?: string                              // 关联的爬虫批次
  nodes: WorkflowNode[]                         // 节点列表
  edges: WorkflowEdge[]                         // 连接关系
  
  // 🔥 执行状态
  status: WorkflowExecutionStatus               // 当前工作流状态
  currentNodeId?: string                        // 正在执行的节点
  
  // 🔥 执行结果缓存
  nodeOutputs: Map<string, NodeExecutionResult> // 节点ID → 执行结果
  
  // 🔥 用户配置
  titleSelector?: string                        // 全局标题选择器
  
  // 元数据
  createdAt: number
  updatedAt: number
}
```

### 🔙 **后端类型定义** (`workflow-executor/types.ts`)

```typescript
/** 节点执行器接口 - 所有执行器必须实现 */
interface NodeExecutor {
  execute(
    node: WorkflowNode,
    context: WorkflowExecutionContext,
    input?: any
  ): Promise<NodeExecutionResult>
}

/** 执行上下文 - 传递给执行器的环境信息 */
interface WorkflowExecutionContext {
  tabId: string                    // 标签页ID（用于访问BrowserView）
  currentUrl?: string              // 当前页面URL
  variables?: Map<string, any>     // 工作流变量（未来用）
}

/** 文本提取结果子对象 */
interface TextExtractionResult {
  text: string      // 提取的文本内容
  length: number    // 文本长度（字符数）
  selector: string  // 使用的CSS选择器（或自动检测说明）
}

/** 获取文本节点的输出 */
interface GetTextOutput {
  title?: TextExtractionResult      // 标题结果（可选）
  content: TextExtractionResult     // 内容结果（必须）
  url: string                       // 页面URL
  engine: ScraperEngine             // 实际使用的引擎
  duration?: number                 // 执行耗时(ms)
}

/** 通用节点执行结果 */
interface NodeExecutionResult {
  nodeId: string           // 节点ID
  success: boolean         // 是否成功
  output?: GetTextOutput   // 节点特定输出
  error?: string           // 错误信息（仅失败时）
  executedAt: number       // 执行时间戳
  engine?: ScraperEngine   // 使用的引擎
  duration?: number        // 执行耗时(ms)
}
```

---

## 两种交互模式

### 🎯 **模式对比表**

| 维度 | 普通模式 | 详细模式 |
|------|---------|---------|
| **激活方式** | 点击"执行"按钮 | 点击"选取"按钮启动元素选取 |
| **交互复杂度** | ⭐️ 简单 | ⭐️⭐️⭐️ 复杂 |
| **用户操作流** | 1步执行 | 多步（选择→确认→执行） |
| **UI展示** | 结果面板 | 详情面板+进度提示 |
| **适用场景** | 快速测试、已知选择器 | 精确元素定位、反爬网站 |
| **反爬能力** | 中等 | 强（CDP绕过检测） |
| **代码复杂度** | 简洁 | ~1600行（browser-view-manager.ts） |

---

### 🔵 **普通模式详解**

#### **模式定义**
普通模式是**直接执行模式**，用户输入CSS选择器或配置后，直接点击"执行"按钮进行爬取。

#### **完整交互流程**

```
用户视图：
┌─────────────────────────────────────┐
│ NodeConfigContent.vue               │
├─────────────────────────────────────┤
│ 📝 内容选择器                        │
│ ┌─────────────────────────────────┐ │
│ │ .content                        │ │
│ └──────────┬──────────────────────┘ │
│            │ [选取]               │
│ 📝 标题选择器                        │
│ ┌─────────────────────────────────┐ │
│ │ h1                              │ │
│ └──────────┬──────────────────────┘ │
│            │ [选取]               │
│                                    │
│ 🎛️ 爬取引擎: ① BrowserView         │
│ 🎛️ 提取策略: ② 找文字最多的div     │
│ 🎛️ 权重调节: ███████░░░ 70%        │
│                                    │
│ 🔘 [执行] ← 点击这里               │
└─────────────────────────────────────┘
                  ↓ 
        [状态: 执行中...]
                  ↓
┌─────────────────────────────────────┐
│ 执行结果卡片                         │
├─────────────────────────────────────┤
│ ✅ 执行成功                         │
│ 引擎: BrowserView                   │
│ 耗时: 523ms                         │
│ URL: https://example.com            │
│                                    │
│ 📖 标题                             │
│ ├─ 文本: "第一章 开始"              │
│ ├─ 长度: 7                         │
│ └─ 选择器: h1                       │
│                                    │
│ 📄 内容                             │
│ ├─ 文本: "从前有座山..."            │
│ ├─ 长度: 2048                      │
│ └─ 选择器: .content                 │
└─────────────────────────────────────┘
```

#### **代码执行流**

```typescript
// 1. 用户点击执行按钮 (NodeConfigContent.vue L149)
const handleTestExecute = () => {
  emit('execute-node')  // ← 触发事件
}

// 2. 父组件接收事件 (NovelScraperPanel.vue)
@on:execute-node="handleNodeConfigExecute"

// 3. 父组件处理
const handleNodeConfigExecute = async () => {
  isExecuting.value = true
  
  try {
    // 构建请求
    const request = {
      node: currentNode,  // WorkflowNode
      context: {
        tabId: props.tabId,
        currentUrl: getCurrentUrl()  // ← 获取当前URL
      }
    }
    
    // IPC调用后端
    const result = await window.nimbria.workflow.executeNode(request)
    
    // 更新Store
    workflowStore.setNodeOutput(tabId, currentNode.id, result)
    
    // 触发UI更新
    nodeExecutionResult.value = result
    
  } finally {
    isExecuting.value = false
  }
}

// 4. 后端处理 (workflow-handlers.ts L27-94)
ipcMain.handle('workflow:execute-node', async (event, request) => {
  const browserViewManager = getBrowserViewManager()
  
  // 创建执行器
  const executor = new GetTextExecutor(browserViewManager)
  
  // 执行
  return await executor.execute(
    request.node,
    request.context,
    request.input
  )
})
```

#### **普通模式优化建议**
- ✅ 快速反馈（通常<1s）
- ✅ UI简洁清晰
- ❌ 难以精确定位复杂元素
- 🔧 可考虑添加"最近使用的选择器"历史

---

### 🟡 **详细模式详解**

#### **模式定义**
详细模式是**交互式元素选取模式**，提供实时DOM预览、多层导航、详细信息面板，支持反爬网站。

#### **完整交互流程**

```
第1步：启动选取模式
┌──────────────────────────────┐
│ 用户界面                      │
├──────────────────────────────┤
│ 📝 内容选择器                 │
│ ┌────────────────────────────┐│
│ │ (空)                       ││
│ └────────┬───────────────────┘│
│          │ [选取] ← 点这里   │
│          │ 状态: 已激活 🔵   │
│          ↓                   │
└──────────────────────────────┘

第2步：展示被调查的页面
┌──────────────────────────────┐
│ 目标页面 (BrowserView)        │
├──────────────────────────────┤
│ [页面内容]                    │
│ ├─ <header>标题</header>     │
│ ├─ <main id="c-xxx">        │ ← 鼠标移入
│ │   <article>              │
│ │     <h2>章节</h2>        │
│ │     <div class="txt">    │ ← 🟡 当前悬停位置
│ │       正文内容...         │
│ │     </div>               │
│ │   </article>             │
│ └─ <footer>页脚</footer>    │
└──────────────────────────────┘
       鼠标悬停，显示：
       ┌─────────────────┐
       │ ⏳ 3秒进度条   │
       │ ████░░░░░░░░  │
       │ 悬停在此处...   │
       └─────────────────┘

第3步：显示详细面板（3秒后自动展开，或Hover详情框）
┌──────────────────────────────────────┐
│ 🔍 详细信息面板                       │
├──────────────────────────────────────┤
│ 元素标签: div                        │
│ ID: (无)                            │
│ Class: txt, main-content            │
│ XPath: /html/body/main/article/div  │
│                                     │
│ 📊 属性                             │
│ ├─ 文本长度: 1240 字符             │
│ ├─ 子元素数: 3                     │
│ ├─ 文本密度: 413 (长/子)           │
│ └─ CSS选择器: div.txt              │
│                                     │
│ 📝 文本预览                         │
│ ┌──────────────────────────────────┐│
│ │ 某某说道："我有个故事想讲..."   ││
│ │ 那是个雪夜，风很大...              ││
│ │ [向下滚动查看更多]                ││
│ └──────────────────────────────────┘│
│                                     │
│ ⬆️ ⬇️ [切换层级] [确认选择] [取消]  │
└──────────────────────────────────────┘

第4步：用户操作
- ⬆️ 选中父元素 <article>
- ⬇️ 选中子元素 <p>
- 或直接 [确认选择] → 选择当前元素

第5步：执行爬取
- 选择器已确定: div.txt
- 点击主面板 [执行] 按钮
- 开始爬取过程
```

#### **详细模式的核心交互**

##### **A. 元素悬停效果** (L300-400 browser-view-manager.ts)

```typescript
view.webContents.on('mouse-move-in-page', (event, x, y) => {
  // 1. 获取鼠标下的元素
  const element = document.elementFromPoint(x, y)
  
  // 2. 更新背景高亮
  element.style.outline = '2px solid #409EFF'
  element.style.boxShadow = '0 0 0 9999px rgba(64, 158, 255, 0.1)'
  
  // 3. 启动进度计时器（3秒后展开详细面板）
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => {
    showDetailBox(element)  // 展开详情面板
  }, 3000)
})
```

##### **B. 多层导航** (L450-550 browser-view-manager.ts)

```typescript
// 按Up箭头键 - 选择父元素
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && isPickerActive) {
    currentElement = currentElement.parentElement
    updateDetailBox(currentElement)
    updateHighlight(currentElement)
  }
})

// 按Down箭头键 - 选择第一个子元素
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' && isPickerActive) {
    currentElement = currentElement.firstElementChild
    updateDetailBox(currentElement)
    updateHighlight(currentElement)
  }
})

// Enter键 - 确认选择
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && isPickerActive) {
    confirmSelection(currentElement)
  }
})

// Esc键 - 取消选取
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isPickerActive) {
    cancelPicker()
  }
})
```

##### **C. 详细面板内容** (L500-600 browser-view-manager.ts)

```typescript
interface ElementDetailInfo {
  // 基础信息
  tagName: string        // 'DIV'
  id: string            // 'main-content' 或 ''
  classList: string[]   // ['content', 'article']
  
  // 内容分析
  textContent: string   // 元素的全部文本
  textLength: number    // 文本字符数
  childCount: number    // 直接子元素数
  textDensity: number   // textLength / childCount
  
  // 路径信息
  xpath: string         // '/html/body/main/article/div'
  cssSelector: string   // 'div.content.article'
  
  // 层级信息
  hierarchy: string[]   // ['html', 'body', 'main', 'article', 'div']
}

// 详情面板HTML结构
const detailBox = `
  <div class="detail-box">
    <div class="detail-header">
      <span>🔍 元素信息</span>
      <button class="close-btn">✕</button>
    </div>
    
    <div class="detail-content">
      <!-- 基础信息 -->
      <div class="info-group">
        <label>标签:</label> <span>${info.tagName}</span>
      </div>
      
      <!-- 内容预览 -->
      <div class="content-preview">
        ${info.textContent.substring(0, 200)}...
      </div>
      
      <!-- 统计数据 -->
      <div class="stats">
        <div>长度: ${info.textLength}</div>
        <div>密度: ${info.textDensity}</div>
        <div>子元素: ${info.childCount}</div>
      </div>
      
      <!-- 选择器 -->
      <div class="selector-copy">
        <input readonly value="${info.cssSelector}">
        <button>复制</button>
      </div>
      
      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button>⬆️ 父元素</button>
        <button>⬇️ 子元素</button>
        <button class="confirm">✅ 确认选择</button>
      </div>
    </div>
  </div>
`
```

#### **详细模式 vs CDP确认路径** 

对于**普通网站**：
```
用户点击"确认选择"
  ↓ 
injected JS: confirmSelection()
  ↓
console.log('__NIMBRIA_ELEMENT_SELECTED__', JSON.stringify(data))
  ↓
主进程接收→更新前端
```

对于**反爬网站（起点中文网等）**：
```
用户点击"确认选择"
  ↓
injected JS: console.log('__NIMBRIA_CDP_CONFIRM__', selector)
  ↓
主进程检测到日志
  ↓
使用 webContents.debugger (CDP)
  ↓
直接查询DOM（不注入JS）
  ↓
返回结果到前端
```

---

## 详细UX/UI交互

### 🎨 **完整用户交互流程地图**

```
┌─────────────────────────────────────────────────────────────┐
│                    用户开始使用工作流                         │
└─────────────┬───────────────────────────────────────────────┘
              │
              ├─ ✨ 第1步：高级设置（可选）
              │   ├─ 点击 ⚙️ 按钮
              │   ├─ 打开 AdvancedSettingsDrawer
              │   ├─ 自动检测或手动选择浏览器
              │   └─ 保存配置 → localStorage
              │
              ├─ 🎯 第2步：添加节点
              │   ├─ 在画布右键/左侧菜单 "添加节点"
              │   ├─ 选择节点类型 (目前仅支持 get-text)
              │   └─ 双击打开 NodeConfigContent 配置抽屉
              │
              ├─ ⚙️ 第3步：配置节点参数
              │   ├─ 输入 CSS 选择器 或 选择策略
              │   ├─ 选择爬取引擎（重要决策）
              │   ├─ 调整权重（如果使用 max-text）
              │   └─ 配置变更实时同步到 Store
              │
              ├─ 🔍 第4步：元素选取（两种模式分支）
              │   │
              │   ├─【普通模式】─ 已知选择器 ────┐
              │   │   ├─ 直接在表单输入                │
              │   │   ├─ 点击 [执行] 按钮              │
              │   │   └─ 显示执行结果                  │
              │   │                                  │
              │   └─【详细模式】─ 精确定位 ────┐    │
              │       ├─ 点击 [选取] 按钮       │    │
              │       ├─ 进入选取模式 🟡       │    │
              │       ├─ 在目标页面选择元素     │    │
              │       ├─ 查看详细面板          │    │
              │       └─ 确认选择              │    │
              │                                  │    │
              └──────────────────────────────────┼────┘
                                                 │
              ┌──────────────────────────────────┴────┐
              │                                       │
              ├─ ▶️ 第5步：执行节点
              │   ├─ IPC 调用 workflow:execute-node
              │   ├─ 主进程创建 GetTextExecutor
              │   ├─ 选择引擎执行
              │   └─ 返回结果
              │
              ├─ 📊 第6步：显示结果
              │   ├─ 元数据卡片（URL, 引擎, 耗时）
              │   ├─ 标题提取结果（文本/长度/选择器）
              │   ├─ 内容提取结果（文本/长度/选择器）
              │   ├─ 可复制选择器
              │   └─ 支持结果重新执行
              │
              └─ 🔗 第7步：连接或存储
                  ├─ 连接到下一个节点
                  ├─ 或保存工作流
                  └─ 或导出结果
```

### 🎬 **实际操作场景演示**

#### **场景1：快速测试现有选择器（普通模式）**

```
用户目标: 快速验证 CSS 选择器是否有效

操作步骤:
1. 打开 NovelScraperPanel → AdvancedMode 标签
2. 在工作流画布上有一个现成的节点
3. 双击节点打开 NodeConfigContent 抽屉
4. 在"内容选择器"输入: .article-content
5. 点击蓝色 [执行] 按钮
6. 等待 1-3 秒
7. 下方显示结果:
   ✅ 执行成功
   引擎: BrowserView
   耗时: 342ms
   📄 内容
   ├─ 文本: "某某在夜色中走过..."
   ├─ 长度: 1523
   └─ 选择器: .article-content

用户反应: "好的，这个选择器有效！" → 继续下一步
```

#### **场景2：精确定位反爬网站元素（详细模式）**

```
用户目标: 从反爬网站（起点中文网）精确提取章节内容

操作步骤:
1. 打开起点中文网某章节页面
2. BrowserView 中显示页面内容
3. 在 NodeConfigContent 中点击"内容选择器"旁的 [选取] 按钮
4. 按钮变蓝 "选择中"，进入选取模式

5. 在 BrowserView 页面中鼠标移动
   - 目标是找到章节内容容器
   - 看到 <main id="c-846331310"> 这个元素
   
6. 鼠标悬停在 <main> 上 3 秒钟
   - 看到蓝色高亮框
   - 下方出现进度球: ⏳ 3秒进度条...
   
7. 3秒后详情面板自动展开:
   🔍 元素信息
   ├─ 标签: main
   ├─ ID: c-846331310
   ├─ 文本长度: 3456
   ├─ 子元素数: 5
   └─ 选择器: main#c-846331310
   
   📝 文本预览:
   "第一段内容..."
   
   ⬆️ ⬇️ [切换层级] ✅ [确认选择] ✕

8. 用户满意，点击 ✅ [确认选择]
   - 选择器自动填入表单: main#c-846331310
   - 详情面板关闭
   - 选取模式关闭
   - "选取" 按钮变回灰色

9. 点击 [执行] 按钮开始爬取
   - 使用 Puppeteer 引擎（反爬对策）
   - 带上 Session cookies
   - Anti-detection 脚本注入
   - 成功提取！

结果:
✅ 执行成功
引擎: Puppeteer (CDP 确认路径)
耗时: 1245ms
📄 内容
├─ 文本: "某某推开门，看到..." (3456 字)
├─ 长度: 3456
└─ 选择器: main#c-846331310
```

#### **场景3：使用自动检测算法（max-text模式）**

```
用户目标: 不知道选择器，使用 AI 自动检测

操作步骤:
1. 在配置表单中不输入选择器（留空）
2. 选择策略: 🔘 "找文字最多的div"
3. 调整权重: 密度权重 70% | 长度权重 30%
   (这表示: 优先选择文本密集的元素，而不是仅看长度)

4. 点击 [执行]

后台执行流程:
- BrowserView 收到请求
- 注入 JS：遍历所有 <div>, <article>, <section>, <main>
- 对每个候选元素计算:
  score = textLength * 0.3 + (textLength / childCount) * 1000 * 0.7
- 选择最高分的元素
- 返回结果

用户看到:
✅ 执行成功
引擎: BrowserView
耗时: 523ms
📄 内容
├─ 文本: "第一段正文内容..." (2048 字)
├─ 长度: 2048
└─ 选择器: article.main-content (auto-detected)

(选择器是自动检测出的，而不是用户手动输入的！)
```

### 🔘 **UI组件的状态转移**

#### **选取按钮的状态机**

```
选取按钮状态转移图:

   初始态
     │
     │ 点击 [选取]
     ↓
  ┌──────────────┐
  │ 选择中 🔵    │ ← 蓝色，禁止其他操作
  │ (内容禁用)   │
  └──────────────┘
     ↑        │
     │        │ 按 Esc 或取消
     │        ├─→ 取消选取
     │        │
     │        │ 选中元素并确认
     │        ↓
  ┌──────────────────┐
  │ 选取完成 ✓       │ ← 表单填充选择器
  └──────────────────┘
     ↑        │
     │        │ 用户修改表单
     │        ↓
  ┌──────────────────┐
  │ 已修改 (灰色)    │ ← 需要重新选取
  └──────────────────┘
```

#### **执行按钮的状态机**

```
执行按钮:

  待命 [执行] ← 灰色
     │ 点击
     ↓
  加载中 [执行中...] ← 禁用+加载动画
     │
     ├─ 成功 → 显示结果面板
     ├─ 失败 → 显示错误信息 ❌
     └─ 超时 → 显示超时提示 ⏱️
```

---

## 执行引擎详解

### ⚙️ **三个执行引擎对比**

| 特性 | BrowserView | Cheerio | Puppeteer |
|------|------------|---------|-----------|
| **基础** | Electron原生 | Node.js库 | 独立浏览器 |
| **渲染** | 完整Chromium | 无渲染 | 完整Chromium |
| **JS执行** | ✅ 支持 | ❌ 不支持 | ✅ 支持 |
| **性能** | 中等 | ⚡️ 快速 | 中等偏低 |
| **内存** | 中等 | 💾 轻量 | 高 |
| **反爬** | 中等 | 弱 | ⭐️⭐️⭐️ 强 |
| **Session** | ✅ 复用 | ❌ 无法复用 | ✅ 可复用 |
| **成本** | 免费(已有) | 免费 | 额外进程 |
| **适用场景** | 普通+复杂网站 | 简单静态页面 | 防爬网站 |

### 🚀 **BrowserView引擎** (L92-232)

```typescript
private async executeWithBrowserView(
  node: WorkflowNode,
  context: WorkflowExecutionContext,
  url: string
): Promise<GetTextOutput> {
  // ========== 第1步：预加载 ==========
  const currentUrl = this.browserViewManager.getNavigationState(context.tabId).currentUrl
  
  if (currentUrl !== url) {
    // URL不同，需要重新加载
    this.browserViewManager.loadURL(context.tabId, url)
    await new Promise(resolve => setTimeout(resolve, 2000))  // 等待页面加载
  }
  
  // ========== 第2步：获取WebContents ==========
  // @ts-expect-error - BrowserViewManager 的 views 是 private
  const viewInstance = this.browserViewManager.views.get(context.tabId)
  
  if (!viewInstance) {
    throw new Error(`BrowserView for tab ${context.tabId} not found`)
  }
  
  // ========== 第3步：执行JS提取 ==========
  const { selector, config } = node.data
  const strategy = config?.strategy || 'max-text'
  const titleSelector = config?.titleSelector || 'h1, title'
  const removeSelectors = config?.removeSelectors || 'script, style, nav, header, footer'
  const densityWeight = config?.densityWeight ?? 70
  
  const result = await viewInstance.view.webContents.executeJavaScript(`
    (function() {
      const strategy = '${strategy}';
      const contentSelector = '${selector || ''}';
      const titleSelector = '${titleSelector}';
      const removeSelectors = '${removeSelectors}';
      const densityWeightPercent = ${densityWeight};
      
      // ========== 移除干扰元素 ==========
      document.querySelectorAll(removeSelectors).forEach(el => el.remove());
      
      let contentText = '';
      let titleText = '';
      let actualContentSelector = '';
      let actualTitleSelector = '';
      
      // ========== 提取标题 ==========
      const titleElem = document.querySelector(titleSelector);
      if (titleElem) {
        titleText = (titleElem.textContent || '').trim();
        actualTitleSelector = titleSelector;
      } else {
        titleText = document.title || '';
        actualTitleSelector = 'document.title';
      }
      
      // ========== 提取内容（根据策略选择） ==========
      if (strategy === 'max-text') {
        // 自动检测模式：找文字最多的div
        const densityWeight = densityWeightPercent / 100;
        const lengthWeight = 1 - densityWeight;
        
        let maxScore = 0;
        let maxText = '';
        let maxElem = null;
        
        const candidates = document.querySelectorAll('div, article, section, main');
        candidates.forEach(elem => {
          const elemText = elem.textContent || '';
          const textLength = elemText.trim().length;
          
          // 计算文本密度 = 文本长度 / 子元素数量
          const tagCount = elem.querySelectorAll('*').length || 1;
          const density = textLength / tagCount;
          
          // 评分公式：权重调整文本长度和密度的影响力
          const score = textLength * lengthWeight + density * 1000 * densityWeight;
          
          // 最小长度限制500字，避免选中太短的内容
          if (textLength > 500 && score > maxScore) {
            maxScore = score;
            maxText = elemText;
            maxElem = elem;
          }
        });
        
        contentText = maxText.trim();
        
        if (maxElem) {
          const tagName = maxElem.tagName.toLowerCase();
          const id = maxElem.id ? '#' + maxElem.id : '';
          const className = maxElem.className ? '.' + maxElem.className.split(' ').join('.') : '';
          actualContentSelector = tagName + id + className + ' (auto-detected)';
        }
      } else {
        // 直接提取模式：使用用户指定的选择器
        if (contentSelector) {
          const elem = document.querySelector(contentSelector);
          if (elem) {
            contentText = (elem.textContent || '').trim();
            actualContentSelector = contentSelector;
          } else {
            actualContentSelector = contentSelector + ' (not found)';
          }
        }
      }
      
      return {
        title: {
          text: titleText,
          length: titleText.length,
          selector: actualTitleSelector
        },
        content: {
          text: contentText,
          length: contentText.length,
          selector: actualContentSelector
        },
        url: window.location.href
      };
    })()
  `)
  
  return {
    title: result.title,
    content: result.content,
    url: result.url,
    engine: 'browserview'
  }
}
```

### 💨 **Cheerio引擎** (L237-364)

```typescript
// 适合快速爬取纯静态HTML页面
private async executeWithCheerio(
  node: WorkflowNode,
  context: WorkflowExecutionContext,
  url: string
): Promise<GetTextOutput> {
  // 1. HTTP请求获取HTML
  const response = await axios.get(url, {
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9...',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    }
  })
  
  // 2. Cheerio 加载HTML
  const $ = load(response.data)
  
  // 3. 移除干扰元素
  const removeSelectors = node.data.config?.removeSelectors || 'script, style'
  removeSelectors.split(',').forEach(sel => {
    $(sel.trim()).remove()
  })
  
  // 4. 提取标题和内容（逻辑同BrowserView）
  // 使用Cheerio API: $().text(), $().first(), 等等
}
```

### 🔥 **Puppeteer引擎** (L369-544)

```typescript
// 适合反爬网站，需要完整浏览器环境
private async executeWithPuppeteer(
  node: WorkflowNode,
  context: WorkflowExecutionContext,
  url: string
): Promise<GetTextOutput> {
  // 1️⃣ 初始化浏览器（Edge或Chrome）
  if (!this.puppeteerBrowser) {
    await this.initPuppeteerBrowser()  // 使用 EdgePath 优先级
  }
  
  // 2️⃣ 从BrowserView复用用户Session
  const cookies = await this.getCookiesFromBrowserView(context.tabId)
  console.log(`Got ${cookies.length} cookies from BrowserView`)
  
  // 3️⃣ 创建新页面
  const page = await this.puppeteerBrowser!.newPage()
  
  try {
    // 4️⃣ 反检测脚本注入
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false  // 隐藏 webdriver 属性
      })
      // @ts-ignore
      window.chrome = {  // 伪装 Chrome 对象
        runtime: {}
      }
    })
    
    // 5️⃣ 设置User-Agent和Cookies
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...'
    )
    if (cookies.length > 0) {
      await page.setCookie(...cookies)  // 复用Session
    }
    
    // 6️⃣ 导航到页面
    await page.goto(url, {
      waitUntil: 'domcontentloaded',  // 只等DOM完成，不等所有资源
      timeout: 30000
    })
    
    // 7️⃣ 移除干扰元素
    await page.evaluate((selectors) => {
      document.querySelectorAll(selectors).forEach(el => el.remove())
    }, removeSelectors)
    
    // 8️⃣ 执行提取逻辑（同BrowserView）
    const result = await page.evaluate(({ strategy, selector, titleSelector }) => {
      // 提取逻辑...
    }, { strategy, selector: node.data.selector, titleSelector })
    
    return {
      title: result.title,
      content: result.content,
      url: result.url,
      engine: 'puppeteer'
    }
    
  } finally {
    await page.close()  // 清理页面
  }
}
```

---

## IPC通信协议

### 📡 **完整通信流程**

```
前端 (Renderer)          IPC Bridge              主进程 (Main)
    │                         │                      │
    │ 1. emit('execute-node') │                      │
    ├────────────────────────>│                      │
    │                         │ 2. invoke            │
    │                         │ workflow:execute-    │
    │                         │      node             │
    │                         │────────────────────> │
    │                         │                      │
    │                         │                    3. 创建
    │                         │                    GetTextExecutor
    │                         │                      │
    │                         │                    4. executor
    │                         │                    .execute()
    │                         │                      │
    │                         │                    5. 选择引擎
    │                         │                    (BrowserView/
    │                         │                     Cheerio/
    │                         │                     Puppeteer)
    │                         │                      │
    │                         │                    6. 执行提取
    │                         │                      │
    │                         │ 7. return result    │
    │                         │<────────────────── │
    │                         │                      │
    │ 8. Promise resolve      │                      │
    │<────────────────────────│                      │
    │                         │                      │
    │ 9. 更新UI              │                      │
    │    显示结果             │                      │
    └                         └                      ┘
```

### 🔧 **IPC API详解**

#### **window.nimbria.workflow.executeNode()**

```typescript
// 请求格式
interface ExecuteNodeRequest {
  node: WorkflowNode        // 节点配置
  context: {
    tabId: string          // 当前标签页ID
    currentUrl: string     // 页面URL
  }
  input?: any              // 前链节点的输出（未来用）
}

// 响应格式
interface NodeExecutionResult {
  nodeId: string
  success: boolean
  output?: {
    title?: {
      text: string
      length: number
      selector: string
    }
    content: {
      text: string
      length: number
      selector: string
    }
    url: string
    engine: 'browserview' | 'cheerio' | 'puppeteer'
    duration?: number
  }
  error?: string            // 失败时返回错误信息
  executedAt: number        // 执行时间戳
  duration?: number         // 执行耗时
}

// 使用示例
const result = await window.nimbria.workflow.executeNode({
  node: currentNode,
  context: {
    tabId: 'tab-123',
    currentUrl: 'https://example.com/article'
  }
})

if (result.success) {
  console.log('提取成功！')
  console.log('标题:', result.output.title.text)
  console.log('内容长度:', result.output.content.length)
  console.log('耗时:', result.duration, 'ms')
} else {
  console.error('提取失败:', result.error)
}
```

#### **window.nimbria.workflow.detectBrowsers()**

```typescript
// 检测系统可用的浏览器

const result = await window.nimbria.workflow.detectBrowsers()

// 返回值
{
  success: true,
  browsers: [
    {
      name: 'Microsoft Edge',
      type: 'edge',
      path: 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    },
    {
      name: 'Google Chrome',
      type: 'chrome',
      path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    }
  ]
}
```

#### **window.nimbria.workflow.setBrowserPath() / getBrowserPath()**

```typescript
// 保存用户配置的浏览器路径
await window.nimbria.workflow.setBrowserPath(
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
)

// 获取当前配置的路径
const result = await window.nimbria.workflow.getBrowserPath()
// { success: true, path: 'C:\\...' }
```

---

## Pinia状态管理

### 📊 **Store结构详解**

```typescript
export const useWorkflowStore = defineStore('workflow', () => {
  // ==================== 状态 ====================
  
  const instances = ref<Map<string, WorkflowInstance>>()
  const browserExecutablePath = ref<string | null>()
  
  // ==================== Getters ====================
  
  const getInstance = computed(() => 
    (tabId: string): WorkflowInstance | undefined => {
      return instances.value.get(tabId)
    }
  )
  
  // ==================== Actions ====================
  
  // 实例管理
  function initializeInstance(tabId: string, batchId?: string): WorkflowInstance
  function getOrCreateInstance(tabId: string, batchId?: string): WorkflowInstance
  function deleteInstance(tabId: string): void
  
  // 节点和边管理
  function updateNodes(tabId: string, nodes: WorkflowNode[]): void
  function updateEdges(tabId: string, edges: WorkflowEdge[]): void
  function updateNodeData(tabId: string, nodeId: string, data: Partial<WorkflowNodeData>): void
  
  // 执行结果管理
  function setNodeOutput(tabId: string, nodeId: string, result: NodeExecutionResult): void
  function getNodeOutput(tabId: string, nodeId: string): NodeExecutionResult | undefined
  
  // 状态管理
  function updateStatus(tabId: string, status: WorkflowExecutionStatus, currentNodeId?: string): void
  
  // 浏览器配置（新增）
  function setBrowserExecutablePath(path: string | null): void  // 保存 + 同步后端
  function loadBrowserExecutablePath(): void                    // 启动时加载
  
  // 工作流操作
  function exportWorkflow(tabId: string): WorkflowExportData
  function clearWorkflow(tabId: string): void
})
```

### 🔄 **状态流转示例**

```
初始化 → 创建工作流实例
  ↓
updateNodes(tabId, [...])  → 添加节点
  ↓
updateNodeData(tabId, nodeId, {...})  → 修改节点配置
  ↓
setNodeOutput(tabId, nodeId, result)  → 缓存执行结果
  ↓
updateStatus(tabId, 'running', nodeId)  → 更新执行状态
  ↓
updateStatus(tabId, 'completed')  → 执行完成
  ↓
exportWorkflow(tabId)  → 导出数据
```

---

## 下一步开发指南

### 📌 **扩展功能建议**

#### **1. 添加新节点类型**

```typescript
// 1. 扩展类型定义
type WorkflowNode = {
  type: 'get-text' | 'get-links' | 'operation' | 'iterator' | 'object'
  //                                ↑ 新增节点类型
}

// 2. 创建新的Executor
class OperationExecutor implements NodeExecutor {
  async execute(node, context, input): Promise<NodeExecutionResult> {
    // 实现操作逻辑
  }
}

// 3. 注册到workflow-handlers.ts
case 'operation': {
  const executor = new OperationExecutor()
  return await executor.execute(request.node, request.context)
}

// 4. 创建UI组件
// Nodes/OperationNode.vue
```

#### **2. 性能优化方向**

- **Puppeteer连接池**：避免每次创建新进程
- **结果缓存**：相同URL+选择器的结果缓存24小时
- **并行执行**：支持多个节点同时执行
- **增量爬取**：只爬取新增内容

#### **3. 用户体验改进**

- **执行历史**：记录最近20次执行及结果
- **选择器建议**：基于历史选择器的自动完成
- **预览窗口**：在选择器旁显示提取结果预览
- **快捷键**：Ctrl+Enter执行，Ctrl+S保存等

---

这就是完整的VueFlow工作流系统的详细指南！包括两种模式的完整交互流程、UI状态转移、引擎对比、IPC协议等。可以直接作为开发参考和用户文档。🗺️