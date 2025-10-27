## 📊 **技术可行性分析报告**

### ✅ **Cheerio 能力矩阵**

| 功能 | 支持度 | 说明 |
|------|--------|------|
| 解析 HTML | ✅ 完全支持 | 可以解析静态 HTML |
| CSS 选择器 | ✅ 完全支持 | 支持复杂的 CSS 选择器 |
| 提取文本 | ✅ 完全支持 | `.text()` 方法 |
| 提取链接 | ✅ 完全支持 | `$('a').attr('href')` |
| **点击操作** | ❌ **不支持** | Cheerio 是纯 HTML 解析，无法操作 DOM |
| **动态内容** | ❌ **不支持** | 无法处理 JavaScript 动态加载 |
| **等待加载** | ❌ **不支持** | 无浏览器环境 |

### ✅ **BrowserView 能力矩阵**

| 功能 | 支持度 | 说明 |
|------|--------|------|
| 加载真实网页 | ✅ 完全支持 | 完整的 Chromium 浏览器环境 |
| 执行 JavaScript | ✅ 完全支持 | `webContents.executeJavaScript()` |
| **点击操作** | ✅ **完全支持** | 通过注入脚本模拟点击 |
| **动态内容** | ✅ **完全支持** | 等待元素加载、监听事件 |
| 提取 HTML | ✅ 完全支持 | `document.documentElement.outerHTML` |
| 并发性能 | ⚠️ 中等 | 受限于浏览器实例数量 |

### ✅ **现有实现（已验证）**

从代码中发现，您的项目**已经实现**了以下功能：

```typescript
// ✅ 1. 智能提取章节列表
browserViewManager.intelligentExtractChapters(tabId)

// ✅ 2. 爬取章节内容
browserViewManager.scrapeChapterContent(tabId, chapterUrl)

// ✅ 3. 元素选取工具
browserViewManager.startElementPicker(tabId, window)

// ✅ 4. 学习内容选择器
browserViewManager.learnContentSelector(tabId, url)

// ✅ 5. 轻量模式爬取（Cheerio + Axios）
browserViewManager.scrapeChaptersLight(chapters, options)
```

### ❌ **Playwright 不需要！**

**结论**：Electron 的 BrowserView 已经提供了完整的浏览器控制能力，**无需安装 Playwright**。

---

## 🏗️ **推荐技术方案：混合架构**

### **架构设计**

```typescript
工作流节点类型分类：

┌─────────────────────────────────────────────────┐
│ 轻量级节点（Cheerio + Axios）                    │
├─────────────────────────────────────────────────┤
│ - 获取文本节点                                   │
│ - 获取链接节点                                   │
│ - 优点：快速、高并发、低资源                      │
│ - 缺点：仅支持静态内容                           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 重型节点（BrowserView + JS 注入）               │
├─────────────────────────────────────────────────┤
│ - 操作节点（点击、滚动、等待）                    │
│ - 优点：完整浏览器环境，支持动态内容              │
│ - 缺点：慢、资源占用高                           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 逻辑节点（纯前端处理）                           │
├─────────────────────────────────────────────────┤
│ - 迭代节点（并发控制）                           │
│ - 对象节点（数据展示）                           │
│ - 优点：灵活、即时响应                           │
└─────────────────────────────────────────────────┘
```

---

## 🎨 **完整实现方案（分阶段）**

### **Phase 1：UI 改造（Toolbar 自适应）**

#### **1.1 Toolbar 按钮自适应**

```vue
<template>
  <div class="novel-toolbar">
    <!-- 左侧分组 -->
    <div class="toolbar-left-group">
      <!-- 批次选择器 -->
      <div class="batch-selector-toolbar">
        <span class="batch-label">批次:</span>
        <el-select v-model="selectedBatchId" size="small" class="batch-select">
          <!-- options... -->
        </el-select>
      </div>

      <div class="toolbar-divider"></div>

      <!-- 模式选择器 -->
      <el-select v-model="currentMode" size="small" class="mode-select">
        <el-option label="智能模式" value="smart" />
        <el-option label="高级模式" value="advanced" />
      </el-select>
    </div>
    
    <!-- 中间：工具按钮组（自适应） -->
    <div class="toolbar-tools">
      <!-- 智能模式按钮 -->
      <template v-if="currentMode === 'smart'">
        <el-button
          size="small"
          class="tool-button"
          :class="{ 'icon-only': isNarrow }"
          :disabled="!isBatchSelected"
          @click="handleMatchChapters"
        >
          <el-icon><Aim /></el-icon>
          <span v-if="!isNarrow" class="button-text">智能匹配章节列表</span>
        </el-button>
        
        <el-button
          size="small"
          class="tool-button"
          :class="{ 'icon-only': isNarrow }"
          :disabled="!isBatchSelected"
          @click="handleScrapeChapters"
        >
          <el-icon><Download /></el-icon>
          <span v-if="!isNarrow" class="button-text">爬取章节</span>
        </el-button>
        
        <el-button
          size="small"
          class="tool-button"
          :class="{ 'icon-only': isNarrow }"
          @click="handleOpenSettings"
        >
          <el-icon><Setting /></el-icon>
          <span v-if="!isNarrow" class="button-text">设置</span>
        </el-button>
      </template>

      <!-- 高级模式按钮 -->
      <template v-else-if="currentMode === 'advanced'">
        <el-button
          size="small"
          class="tool-button"
          :class="{ 'icon-only': isNarrow }"
          @click="handleOpenWorkflowSettings"
        >
          <el-icon><Tools /></el-icon>
          <span v-if="!isNarrow" class="button-text">工作流设置</span>
        </el-button>
        
        <el-button
          size="small"
          class="tool-button"
          :class="{ 'icon-only': isNarrow }"
          @click="handleOpenNodeSettings"
        >
          <el-icon><Setting /></el-icon>
          <span v-if="!isNarrow" class="button-text">节点设置</span>
        </el-button>
        
        <el-button
          size="small"
          class="tool-button"
          :class="{ 'icon-only': isNarrow }"
          @click="handleOpenGlobalSettings"
        >
          <el-icon><Grid /></el-icon>
          <span v-if="!isNarrow" class="button-text">全局设置</span>
        </el-button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Aim, Download, Setting, Tools, Grid } from '@element-plus/icons-vue'

// 响应式宽度检测
const toolbarRef = ref<HTMLElement | null>(null)
const toolbarWidth = ref(0)

// 根据宽度判断是否显示文字（阈值可调整）
const isNarrow = computed(() => toolbarWidth.value < 600)

// 监听 Toolbar 宽度
const updateToolbarWidth = () => {
  if (toolbarRef.value) {
    toolbarWidth.value = toolbarRef.value.offsetWidth
  }
}

onMounted(() => {
  updateToolbarWidth()
  window.addEventListener('resize', updateToolbarWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateToolbarWidth)
})
</script>

<style scoped lang="scss">
.toolbar-tools {
  display: flex;
  gap: 6px;
  padding: 3px 6px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  flex: 1;
  align-items: center;
  margin-left: 8px;
  min-width: 0;
  overflow: hidden; // 防止按钮溢出
}

.tool-button {
  // 默认状态：图标 + 文字
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 13px;
  white-space: nowrap;
  transition: all 0.3s ease;
  
  // 图标始终显示
  .el-icon {
    flex-shrink: 0;
  }
  
  // 文字可以隐藏
  .button-text {
    transition: opacity 0.3s ease;
  }
  
  // 仅图标模式（窄屏）
  &.icon-only {
    padding: 6px;
    min-width: 32px;
    
    .button-text {
      display: none;
    }
  }
}

// 参考 Element Plus Typography
// https://element-plus.org/zh-CN/component/typography
.button-text {
  font-size: var(--el-font-size-base); // 14px
  line-height: 1.5;
}
</style>
```

---

### **Phase 2：高级模式 UI 结构**

#### **2.1 主内容区布局**

```vue
<template>
  <div class="panel-content">
    <!-- 高级模式内容 -->
    <div v-if="currentMode === 'advanced'" class="advanced-mode-content">
      <!-- 🔥 工作流配置区域 -->
      <div class="content-section workflow-config-section">
        <div class="section-header">
          <h3>工作流配置</h3>
          <div class="header-tools">
            <el-button size="small" @click="handleRunWorkflow">
              <el-icon><VideoPlay /></el-icon>
              运行工作流
            </el-button>
            <el-button size="small" @click="handleClearWorkflow">
              <el-icon><Delete /></el-icon>
              清空
            </el-button>
          </div>
        </div>
        <div class="section-body">
          <WorkflowCanvas
            :workflow-nodes="workflowNodes"
            :workflow-edges="workflowEdges"
            @update:nodes="workflowNodes = $event"
            @update:edges="workflowEdges = $event"
          />
        </div>
      </div>
      
      <!-- 🔥 匹配章节列表（复用智能模式组件） -->
      <div class="content-section chapter-list-section">
        <div class="section-header">
          <h3>匹配章节列表</h3>
        </div>
        <div class="section-body">
          <ChapterListSection
            :chapters="matchedChapters"
          />
        </div>
      </div>
      
      <!-- 🔥 已爬取章节（复用智能模式组件） -->
      <div class="content-section chapter-summary-section">
        <div class="section-header">
          <h3>已爬取章节</h3>
          <span class="chapter-count">共 {{ scrapedChapters.length }} 章</span>
        </div>
        <div class="section-body">
          <ChapterSummarySection
            :chapters="scrapedChapters"
            @view-detail="handleViewDetail"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import WorkflowCanvas from './AdvancedMode/WorkflowCanvas.vue'
import type { WorkflowNode, WorkflowEdge } from './AdvancedMode/types'

const workflowNodes = ref<WorkflowNode[]>([])
const workflowEdges = ref<WorkflowEdge[]>([])
</script>
```

---

### **Phase 3：VueFlow 工作流画布**

#### **3.1 安装依赖**

```bash
# 需要安装的包
npm install @vue-flow/core @vue-flow/background @vue-flow/controls @vue-flow/minimap
```

#### **3.2 WorkflowCanvas 组件**

```vue
<template>
  <div class="workflow-canvas">
    <VueFlow
      v-model:nodes="localNodes"
      v-model:edges="localEdges"
      :default-viewport="{ zoom: 1 }"
      :min-zoom="0.2"
      :max-zoom="4"
      fit-view-on-init
      @nodes-change="handleNodesChange"
      @edges-change="handleEdgesChange"
    >
      <!-- 背景网格 -->
      <Background pattern-color="#aaa" :gap="16" />
      
      <!-- 控制按钮 -->
      <Controls />
      
      <!-- 小地图 -->
      <MiniMap />
      
      <!-- 自定义节点 -->
      <template #node-get-text="props">
        <GetTextNode v-bind="props" @select-element="handleSelectElement" />
      </template>
      
      <template #node-get-links="props">
        <GetLinksNode v-bind="props" @select-element="handleSelectElement" />
      </template>
      
      <template #node-operation="props">
        <OperationNode v-bind="props" @select-element="handleSelectElement" />
      </template>
      
      <template #node-iterator="props">
        <IteratorNode v-bind="props" />
      </template>
      
      <template #node-object="props">
        <ObjectNode v-bind="props" />
      </template>
    </VueFlow>
    
    <!-- 节点工具栏 -->
    <div class="node-toolbar">
      <el-button size="small" @click="addNode('get-text')">
        <el-icon><Document /></el-icon>
        获取文本
      </el-button>
      <el-button size="small" @click="addNode('get-links')">
        <el-icon><Link /></el-icon>
        获取链接
      </el-button>
      <el-button size="small" @click="addNode('operation')">
        <el-icon><Pointer /></el-icon>
        操作节点
      </el-button>
      <el-button size="small" @click="addNode('iterator')">
        <el-icon><Refresh /></el-icon>
        迭代
      </el-button>
      <el-button size="small" @click="addNode('object')">
        <el-icon><Box /></el-icon>
        对象
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { VueFlow, Background, Controls, MiniMap } from '@vue-flow/core'
import type { Node, Edge } from '@vue-flow/core'
import { nanoid } from 'nanoid'
import GetTextNode from './Nodes/GetTextNode.vue'
import GetLinksNode from './Nodes/GetLinksNode.vue'
import OperationNode from './Nodes/OperationNode.vue'
import IteratorNode from './Nodes/IteratorNode.vue'
import ObjectNode from './Nodes/ObjectNode.vue'

interface Props {
  workflowNodes: Node[]
  workflowEdges: Edge[]
}

interface Emits {
  (e: 'update:nodes', nodes: Node[]): void
  (e: 'update:edges', edges: Edge[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localNodes = ref<Node[]>(props.workflowNodes)
const localEdges = ref<Edge[]>(props.workflowEdges)

// 同步到父组件
watch([localNodes, localEdges], () => {
  emit('update:nodes', localNodes.value)
  emit('update:edges', localEdges.value)
}, { deep: true })

// 添加节点
const addNode = (type: string) => {
  const newNode: Node = {
    id: nanoid(),
    type,
    position: { x: Math.random() * 500, y: Math.random() * 300 },
    data: {
      label: getNodeLabel(type),
      selector: '',
      config: {}
    }
  }
  localNodes.value.push(newNode)
}

const getNodeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'get-text': '获取文本',
    'get-links': '获取链接',
    'operation': '操作节点',
    'iterator': '迭代',
    'object': '对象'
  }
  return labels[type] || type
}

// 处理选择元素（复用选取工具）
const handleSelectElement = async (nodeId: string) => {
  // 调用 BrowserView 的选取工具
  const tabId = 'current-tab-id' // 需要从上下文获取
  await window.nimbria.searchScraper.startElementPicker({ tabId })
  
  // 监听选取结果
  window.addEventListener('element-picked', (event: Event) => {
    const customEvent = event as CustomEvent
    const { selector } = customEvent.detail
    
    // 更新节点的选择器
    const node = localNodes.value.find(n => n.id === nodeId)
    if (node) {
      node.data.selector = selector
    }
  }, { once: true })
}
</script>

<style scoped lang="scss">
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';

.workflow-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--el-bg-color-page);
}

.node-toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  gap: 8px;
  background: var(--el-bg-color);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}
</style>
```

---

### **Phase 4：自定义节点实现（示例）**

#### **4.1 GetTextNode（获取文本节点）**

```vue
<template>
  <div class="custom-node get-text-node">
    <div class="node-header">
      <el-icon><Document /></el-icon>
      <span>获取文本</span>
    </div>
    <div class="node-body">
      <el-form size="small" label-width="60px">
        <el-form-item label="选择器">
          <el-input
            v-model="nodeData.selector"
            placeholder="CSS选择器"
            readonly
          >
            <template #append>
              <el-button @click="handleSelectElement">
                <el-icon><Aim /></el-icon>
              </el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="策略">
          <el-select v-model="nodeData.config.strategy">
            <el-option label="找文字最多的div" value="max-text" />
            <el-option label="直接提取" value="direct" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- VueFlow 连接点 -->
    <Handle type="target" position="left" />
    <Handle type="source" position="right" />
  </div>
</template>

<script setup lang="ts">
import { Handle } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'

const props = defineProps<NodeProps>()
const emit = defineEmits<{
  (e: 'select-element', nodeId: string): void
}>()

const nodeData = computed(() => props.data)

const handleSelectElement = () => {
  emit('select-element', props.id)
}
</script>

<style scoped lang="scss">
.custom-node {
  background: var(--el-bg-color);
  border: 2px solid var(--el-border-color);
  border-radius: 8px;
  min-width: 200px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  &:hover {
    border-color: var(--el-color-primary);
  }
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
  font-weight: 500;
}

.node-body {
  padding: 12px;
}

.get-text-node {
  border-color: #67c23a;
}
</style>
```

---

### **Phase 5：后端节点执行器**

#### **5.1 节点执行器接口**

```typescript
// Nimbria/src-electron/services/workflow-executor/types.ts

export interface WorkflowNode {
  id: string
  type: 'get-text' | 'get-links' | 'operation' | 'iterator' | 'object'
  data: {
    selector?: string
    config?: Record<string, any>
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
}

export interface WorkflowExecutionContext {
  tabId: string
  browserViewManager: BrowserViewManager
  variables: Map<string, any>
}

export interface NodeExecutor {
  execute(
    node: WorkflowNode,
    context: WorkflowExecutionContext,
    input?: any
  ): Promise<any>
}
```

#### **5.2 获取文本节点执行器**

```typescript
// Nimbria/src-electron/services/workflow-executor/executors/get-text-executor.ts

import type { NodeExecutor, WorkflowNode, WorkflowExecutionContext } from '../types'

export class GetTextExecutor implements NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: WorkflowExecutionContext,
    input?: string // 输入可能是URL
  ): Promise<{ text: string; length: number }> {
    const { selector, config } = node.data
    const strategy = config?.strategy || 'max-text'
    
    // 1. 加载页面（如果提供了URL）
    if (input) {
      context.browserViewManager.loadURL(context.tabId, input)
      await this.waitForLoad(context.tabId, context.browserViewManager)
    }
    
    // 2. 获取HTML
    const html = await context.browserViewManager.getHTML(context.tabId)
    
    // 3. 根据策略提取文本
    let text: string
    
    if (strategy === 'max-text') {
      // 找文字最多的div
      text = await this.extractMaxTextDiv(html)
    } else {
      // 直接提取选择器内容
      text = await this.extractBySelector(html, selector!)
    }
    
    return {
      text,
      length: text.length
    }
  }
  
  private async extractMaxTextDiv(html: string): Promise<string> {
    // 使用 Cheerio 找文字最多的 div
    const { load } = await import('cheerio')
    const $ = load(html)
    
    let maxText = ''
    let maxLength = 0
    
    $('div, article, section').each((_, elem) => {
      const $elem = $(elem)
      // 移除脚本、样式
      $elem.find('script, style, nav, header, footer').remove()
      
      const text = $elem.text().trim()
      if (text.length > maxLength) {
        maxLength = text.length
        maxText = text
      }
    })
    
    return maxText
  }
  
  private async extractBySelector(html: string, selector: string): Promise<string> {
    const { load } = await import('cheerio')
    const $ = load(html)
    return $(selector).text().trim()
  }
  
  private async waitForLoad(tabId: string, manager: BrowserViewManager): Promise<void> {
    // 等待页面加载完成
    return new Promise((resolve) => {
      setTimeout(resolve, 2000) // 简化实现，实际应监听加载事件
    })
  }
}
```

#### **5.3 获取链接节点执行器**

```typescript
// Nimbria/src-electron/services/workflow-executor/executors/get-links-executor.ts

import type { NodeExecutor, WorkflowNode, WorkflowExecutionContext } from '../types'

export interface LinkObject {
  title: string
  url: string
}

export class GetLinksExecutor implements NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: WorkflowExecutionContext,
    input?: string
  ): Promise<LinkObject[]> {
    const { selector } = node.data
    
    // 1. 加载页面（如果提供了URL）
    if (input) {
      context.browserViewManager.loadURL(context.tabId, input)
      await this.waitForLoad(context.tabId, context.browserViewManager)
    }
    
    // 2. 获取HTML
    const html = await context.browserViewManager.getHTML(context.tabId)
    
    // 3. 提取链接
    return await this.extractLinks(html, selector!)
  }
  
  private async extractLinks(html: string, containerSelector: string): Promise<LinkObject[]> {
    const { load } = await import('cheerio')
    const $ = load(html)
    
    const links: LinkObject[] = []
    const container = $(containerSelector)
    
    // 提取容器内的所有链接
    container.find('a').each((_, elem) => {
      const $link = $(elem)
      const href = $link.attr('href')
      const title = $link.text().trim()
      
      if (href && title && this.isValidChapterLink(title, href)) {
        // 确保是绝对路径
        const absoluteUrl = this.resolveUrl(href, context.browserViewManager.getCurrentUrl(context.tabId))
        links.push({ title, url: absoluteUrl })
      }
    })
    
    return links
  }
  
  private isValidChapterLink(title: string, url: string): boolean {
    // 黑名单过滤
    const blacklist = ['首页', '书架', '投票', '打赏', '目录', '上一章', '下一章']
    return !blacklist.some(kw => title.includes(kw) || url.includes(kw))
  }
  
  private resolveUrl(href: string, baseUrl: string): string {
    if (href.startsWith('http')) {
      return href
    }
    
    try {
      return new URL(href, baseUrl).href
    } catch {
      return href
    }
  }
  
  private async waitForLoad(tabId: string, manager: BrowserViewManager): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 2000)
    })
  }
}
```

#### **5.4 操作节点执行器（点击）**

```typescript
// Nimbria/src-electron/services/workflow-executor/executors/operation-executor.ts

import type { NodeExecutor, WorkflowNode, WorkflowExecutionContext } from '../types'

export class OperationExecutor implements NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: WorkflowExecutionContext,
    input?: any
  ): Promise<{ success: boolean; message: string }> {
    const { selector, config } = node.data
    const operation = config?.operation || 'click'
    
    try {
      switch (operation) {
        case 'click':
          await this.clickElement(context.tabId, selector!, context.browserViewManager)
          return { success: true, message: `已点击: ${selector}` }
        
        case 'wait':
          await this.waitForElement(context.tabId, selector!, context.browserViewManager)
          return { success: true, message: `已等待: ${selector}` }
        
        default:
          throw new Error(`Unknown operation: ${operation}`)
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : '操作失败' 
      }
    }
  }
  
  private async clickElement(
    tabId: string,
    selector: string,
    manager: BrowserViewManager
  ): Promise<void> {
    const view = manager.getView(tabId)
    if (!view) throw new Error('BrowserView not found')
    
    // 注入脚本并点击
    await view.webContents.executeJavaScript(`
      (function() {
        const element = document.querySelector('${selector}');
        if (element) {
          element.click();
          return true;
        }
        return false;
      })();
    `)
    
    // 等待点击后的加载
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private async waitForElement(
    tabId: string,
    selector: string,
    manager: BrowserViewManager
  ): Promise<void> {
    const view = manager.getView(tabId)
    if (!view) throw new Error('BrowserView not found')
    
    // 等待元素出现
    await view.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const checkExist = setInterval(() => {
          const element = document.querySelector('${selector}');
          if (element) {
            clearInterval(checkExist);
            resolve(true);
          }
        }, 100);
        
        // 超时10秒
        setTimeout(() => {
          clearInterval(checkExist);
          resolve(false);
        }, 10000);
      });
    `)
  }
}
```

---

## 📦 **完整的依赖清单**

```json
{
  "dependencies": {
    "cheerio": "^1.0.0",              // ✅ 已安装
    "axios": "^1.2.1",                // ✅ 已安装
    "p-limit": "^5.0.0",              // ✅ 已安装（并发控制）
    "@vue-flow/core": "^1.33.0",      // ❌ 需要安装
    "@vue-flow/background": "^1.3.0", // ❌ 需要安装
    "@vue-flow/controls": "^1.1.0",   // ❌ 需要安装
    "@vue-flow/minimap": "^1.4.0"     // ❌ 需要安装
  }
}
```

---

## ✅ **结论**

Boss，基于您的需求和现有技术栈：

1. ✅ **Cheerio 可以实现**：获取文本、获取链接（静态内容）
2. ✅ **BrowserView 可以实现**：点击操作、动态内容、完整的浏览器控制
3. ❌ **Playwright 不需要**：Electron BrowserView 已足够
4. ✅ **VueFlow 可行**：需要安装相关包
5. ✅ **混合方案最优**：轻量节点用 Cheerio（快），重型节点用 BrowserView（全功能）

**下一步**：您希望我先实现哪一部分？
1. 🎨 Toolbar 自适应 UI？
2. 🧩 VueFlow 工作流画布？
3. ⚙️ 节点执行器后端？
4. 🔗 高级模式整体集成？