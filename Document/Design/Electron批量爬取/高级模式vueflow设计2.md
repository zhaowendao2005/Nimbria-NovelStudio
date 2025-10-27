Boss，收到！这是一个很有野心的高级模式设计，让我先研究技术可行性，再给出完整的实现方案。

## 🔍 **技术可行性研究**

让我先查看现有的技术栈和实现方式：

[12 tools called]

Boss，我已经完成技术可行性研究！现在给您完整的方案：

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
│ - 获取文本节点（静态内容）                        │
│ - 获取链接节点（静态内容）                        │
│ - 优点：快速、高并发、低资源                      │
│ - 缺点：仅支持静态HTML，不支持JS渲染              │
│ - 适用场景：传统服务器渲染的页面                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 重型节点（BrowserView 隐藏渲染 + JS 注入）      │
├─────────────────────────────────────────────────┤
│ - 操作节点（点击、滚动、等待）                    │
│ - 获取文本节点（动态内容）                        │
│ - 获取链接节点（动态内容）                        │
│ - 优点：完整浏览器环境，支持动态内容              │
│ - 缺点：慢、资源占用高                           │
│ - 适用场景：SPA应用、JS动态加载的页面            │
│                                                  │
│ 🔧 隐藏渲染技术方案：                            │
│ 1. 使用 offscreen BrowserView（不attach窗口）   │
│ 2. 或设置 bounds: { x: 0, y: 0, w: 0, h: 0 }   │
│ 3. 创建虚拟BrowserView池，按需调度               │
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
          :disabled="!isBatchSelected"
          @click="handleRunWorkflow"
        >
          <el-icon><VideoPlay /></el-icon>
          <span v-if="!isNarrow" class="button-text">启动工作流</span>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Aim, Download, Setting, VideoPlay } from '@element-plus/icons-vue'

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
            <el-button size="small" @click="handleClearWorkflow">
              <el-icon><Delete /></el-icon>
              清空
            </el-button>
          </div>
        </div>
        <div class="section-body workflow-viewport">
          <div class="viewport-container">
            <WorkflowCanvas
              :workflow-nodes="workflowNodes"
              :workflow-edges="workflowEdges"
              @update:nodes="workflowNodes = $event"
              @update:edges="workflowEdges = $event"
              @node-click="handleNodeClick"
            />
          </div>
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
import { ref } from 'vue'
import WorkflowCanvas from './AdvancedMode/WorkflowCanvas.vue'
import NodeConfigDrawer from './AdvancedMode/NodeConfigDrawer.vue'
import type { WorkflowNode, WorkflowEdge } from './AdvancedMode/types'
import type { Node } from '@vue-flow/core'

const workflowNodes = ref<WorkflowNode[]>([])
const workflowEdges = ref<WorkflowEdge[]>([])
const nodeConfigDrawerRef = ref<InstanceType<typeof NodeConfigDrawer> | null>(null)
const nodeOutputs = ref<Map<string, any>>(new Map())

const handleNodeClick = (node: Node) => {
  // 获取节点输出结果（如果有）
  const output = nodeOutputs.value.get(node.id)
  // 打开配置抽屉
  nodeConfigDrawerRef.value?.openNodeConfig(node, output)
}

const handleClearWorkflow = () => {
  workflowNodes.value = []
  workflowEdges.value = []
}
</script>

<style scoped lang="scss">
// 工作流视口样式
.workflow-viewport {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  overflow: hidden;
}

.viewport-container {
  position: relative;
  width: 100%;
  height: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  background: var(--el-bg-color-page);
}
</style>
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
      @node-click="handleNodeClick"
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
  (e: 'node-click', node: Node): void
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

// 处理节点点击事件
const handleNodeClick = (event: { node: Node }) => {
  // 转发到父组件，打开配置抽屉
  emit('node-click', event.node)
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

### **Phase 6：节点配置抽屉**

#### **6.1 抽屉组件设计**

**功能说明**：点击 VueFlow 节点（非按钮区域）打开右侧抽屉，显示节点配置和输出结果

```vue
<template>
  <el-drawer
    v-model="nodeConfigDrawerVisible"
    title="节点配置"
    size="400px"
    direction="rtl"
  >
    <!-- 上部分：节点配置 -->
    <div class="node-config-section">
      <h4>节点配置</h4>
      <component
        :is="currentNodeConfigComponent"
        v-if="currentNode"
        :node="currentNode"
        @update:node="handleNodeUpdate"
      />
    </div>
    
    <!-- 下部分：输出结果 -->
    <div class="node-output-section">
      <h4>输出结果</h4>
      <div v-if="currentNodeOutput" class="output-content">
        <pre>{{ JSON.stringify(currentNodeOutput, null, 2) }}</pre>
      </div>
      <el-empty v-else description="暂无输出结果" />
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Node } from '@vue-flow/core'
import GetTextNodeConfig from './NodeConfigs/GetTextNodeConfig.vue'
import GetLinksNodeConfig from './NodeConfigs/GetLinksNodeConfig.vue'
import OperationNodeConfig from './NodeConfigs/OperationNodeConfig.vue'

const nodeConfigDrawerVisible = ref(false)
const currentNode = ref<Node | null>(null)
const currentNodeOutput = ref<any>(null)

// 根据节点类型动态选择配置组件
const currentNodeConfigComponent = computed(() => {
  if (!currentNode.value) return null
  
  const componentMap: Record<string, any> = {
    'get-text': GetTextNodeConfig,
    'get-links': GetLinksNodeConfig,
    'operation': OperationNodeConfig,
    'iterator': null, // 待实现
    'object': null    // 待实现
  }
  
  return componentMap[currentNode.value.type] || null
})

const handleNodeUpdate = (updatedNode: Node) => {
  // 更新节点数据
  currentNode.value = updatedNode
}

// 暴露方法供父组件调用
defineExpose({
  openNodeConfig(node: Node, output?: any) {
    currentNode.value = node
    currentNodeOutput.value = output
    nodeConfigDrawerVisible.value = true
  }
})
</script>

<style scoped lang="scss">
.node-config-section {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
  
  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 500;
  }
}

.node-output-section {
  padding: 16px;
  
  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 500;
  }
  
  .output-content {
    background: var(--el-fill-color-light);
    border-radius: 4px;
    padding: 12px;
    
    pre {
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      overflow-x: auto;
    }
  }
}
</style>
```

#### **6.2 节点配置组件示例**

**GetTextNodeConfig.vue**（获取文本节点配置）

```vue
<template>
  <el-form :model="nodeData" label-width="80px" size="small">
    <el-form-item label="选择器">
      <el-input
        v-model="nodeData.selector"
        placeholder="CSS选择器"
        @input="handleUpdate"
      />
    </el-form-item>
    
    <el-form-item label="提取策略">
      <el-select v-model="nodeData.config.strategy" @change="handleUpdate">
        <el-option label="找文字最多的div" value="max-text" />
        <el-option label="直接提取" value="direct" />
      </el-select>
    </el-form-item>
    
    <el-form-item label="去除元素">
      <el-input
        v-model="nodeData.config.removeSelectors"
        type="textarea"
        :rows="2"
        placeholder="script, style, nav"
        @input="handleUpdate"
      />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Node } from '@vue-flow/core'

interface Props {
  node: Node
}

interface Emits {
  (e: 'update:node', node: Node): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const nodeData = ref({
  selector: props.node.data.selector || '',
  config: {
    strategy: props.node.data.config?.strategy || 'max-text',
    removeSelectors: props.node.data.config?.removeSelectors || 'script, style, nav'
  }
})

const handleUpdate = () => {
  // 更新节点数据
  const updatedNode = {
    ...props.node,
    data: {
      ...props.node.data,
      selector: nodeData.value.selector,
      config: nodeData.value.config
    }
  }
  emit('update:node', updatedNode)
}

// 监听props变化
watch(() => props.node, (newNode) => {
  nodeData.value = {
    selector: newNode.data.selector || '',
    config: {
      strategy: newNode.data.config?.strategy || 'max-text',
      removeSelectors: newNode.data.config?.removeSelectors || 'script, style, nav'
    }
  }
}, { deep: true })
</script>
```

#### **6.3 集成到主组件**

在 Phase 2 的 `NovelScraperPanel.vue` 中添加：

```vue
<template>
  <!-- ... 其他内容 ... -->
  
  <!-- 节点配置抽屉 -->
  <NodeConfigDrawer ref="nodeConfigDrawerRef" />
</template>
```

**说明**：
- 节点配置抽屉已通过 `handleNodeClick` 方法集成
- 点击节点时自动打开抽屉
- 抽屉内容根据节点类型动态渲染
- 支持实时编辑节点配置
- 显示节点执行的输出结果

---

## 🔧 **BrowserView 隐藏渲染技术实现**

### **方案1：Offscreen BrowserView（推荐）**

```typescript
// Nimbria/src-electron/services/workflow-executor/virtual-browser-pool.ts

export class VirtualBrowserPool {
  private pool: BrowserView[] = []
  private maxSize = 5
  private session: Session
  
  constructor(session: Session) {
    this.session = session
  }
  
  /**
   * 创建虚拟 BrowserView（不attach到窗口）
   */
  public createVirtualView(): BrowserView {
    const view = new BrowserView({
      webPreferences: {
        session: this.session,
        offscreen: true,  // 🔥 关键：启用离屏渲染
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    
    // 设置为0尺寸（不显示）
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    
    this.pool.push(view)
    console.log(`[VirtualBrowserPool] Created virtual BrowserView, pool size: ${this.pool.length}`)
    
    return view
  }
  
  /**
   * 获取可用的虚拟 BrowserView
   */
  public acquireView(): BrowserView {
    if (this.pool.length < this.maxSize) {
      return this.createVirtualView()
    }
    
    // 复用池中的 BrowserView
    const view = this.pool.shift()!
    this.pool.push(view)
    return view
  }
  
  /**
   * 释放 BrowserView
   */
  public releaseView(view: BrowserView): void {
    // 清空页面
    view.webContents.loadURL('about:blank').catch(() => {})
  }
  
  /**
   * 清理所有虚拟 BrowserView
   */
  public destroy(): void {
    this.pool.forEach(view => {
      // @ts-ignore - destroy方法存在但类型定义可能缺失
      if (view.webContents && !view.webContents.isDestroyed()) {
        view.webContents.destroy()
      }
    })
    this.pool = []
  }
}
```

### **方案2：隐藏窗口渲染**

```typescript
// 创建隐藏的专用窗口
const hiddenWindow = new BrowserWindow({
  show: false,
  width: 1280,
  height: 800,
  webPreferences: {
    offscreen: true
  }
})

// 在隐藏窗口中attach BrowserView
const view = new BrowserView({
  webPreferences: {
    session: this.session
  }
})

hiddenWindow.setBrowserView(view)
view.setBounds({ x: 0, y: 0, width: 1280, height: 800 })
```

### **方案3：零尺寸渲染（兼容性最好）**

```typescript
// 在现有窗口中创建BrowserView，但设置为0尺寸
const view = new BrowserView({
  webPreferences: {
    session: this.session
  }
})

// 添加到窗口但不显示
window.setBrowserView(view)
view.setBounds({ x: -10000, y: -10000, width: 0, height: 0 })

// 或使用负坐标移出视野
view.setBounds({ x: -1280, y: 0, width: 1280, height: 800 })
```

### **性能对比**

| 方案 | 渲染速度 | 资源占用 | 兼容性 | 推荐指数 |
|------|---------|---------|--------|---------|
| Offscreen | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 隐藏窗口 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 零尺寸 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

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
    "@vue-flow/minimap": "^1.4.0",    // ❌ 需要安装
    "nanoid": "^5.0.0"                // ❌ 需要安装（生成唯一ID）
  }
}
```

---

## 🎯 **总结与下一步计划**

### **✅ 已完成的设计**

1. **技术可行性验证**
   - ✅ 确认 Cheerio 适合静态内容爬取
   - ✅ 确认 BrowserView 支持隐藏渲染
   - ✅ 无需安装 Playwright（Electron 原生能力足够）

2. **UI 设计**
   - ✅ Toolbar 自适应按钮设计
   - ✅ 高级模式按钮简化（启动工作流 + 设置）
   - ✅ 工作流配置视口结构
   - ✅ 复用智能模式的章节列表组件

3. **工作流节点设计**
   - ✅ 获取文本节点（Cheerio + BrowserView）
   - ✅ 获取链接节点（Cheerio + BrowserView）
   - ✅ 操作节点（BrowserView 点击/等待）
   - ✅ 迭代节点（并发控制）
   - ✅ 对象节点（数据展示）

4. **后端架构设计**
   - ✅ 混合架构（轻量级 + 重型节点）
   - ✅ 虚拟 BrowserView 池设计
   - ✅ 节点执行器接口定义
   - ✅ 三种隐藏渲染方案

5. **交互设计**
   - ✅ 节点配置抽屉（点击节点打开）
   - ✅ 动态配置组件（根据节点类型）
   - ✅ 输出结果展示

### **📋 下一步开发计划**

#### **Phase 1：基础 UI 搭建**（预计 2-3 天）
- [ ] 修改 `NovelScraperPanel.vue`：Toolbar 自适应
- [ ] 添加高级模式选择器
- [ ] 创建 `WorkflowCanvas.vue` 组件
- [ ] 安装 VueFlow 依赖
- [ ] 实现工作流配置视口

#### **Phase 2：自定义节点开发**（预计 3-4 天）
- [ ] 实现 `GetTextNode.vue`
- [ ] 实现 `GetLinksNode.vue`
- [ ] 实现 `OperationNode.vue`
- [ ] 实现 `IteratorNode.vue`
- [ ] 实现 `ObjectNode.vue`
- [ ] 集成元素选取工具

#### **Phase 3：节点配置抽屉**（预计 1-2 天）
- [ ] 实现 `NodeConfigDrawer.vue`
- [ ] 实现 `GetTextNodeConfig.vue`
- [ ] 实现 `GetLinksNodeConfig.vue`
- [ ] 实现 `OperationNodeConfig.vue`
- [ ] 集成输出结果展示

#### **Phase 4：虚拟 BrowserView 池**（预计 2-3 天）
- [ ] 实现 `VirtualBrowserPool.ts`
- [ ] 测试 offscreen 渲染性能
- [ ] 实现资源池调度逻辑
- [ ] 错误处理与清理机制

#### **Phase 5：节点执行器**（预计 4-5 天）
- [ ] 实现 `GetTextExecutor.ts`
- [ ] 实现 `GetLinksExecutor.ts`
- [ ] 实现 `OperationExecutor.ts`
- [ ] 实现 `IteratorExecutor.ts`
- [ ] 实现工作流编排引擎

#### **Phase 6：IPC 通信与集成**（预计 2-3 天）
- [ ] 注册工作流执行 IPC 处理器
- [ ] 前后端通信联调
- [ ] 工作流状态管理
- [ ] 输出结果回传

#### **Phase 7：测试与优化**（预计 2-3 天）
- [ ] 端到端测试
- [ ] 性能优化（并发、缓存）
- [ ] 异常情况处理
- [ ] 用户体验优化

### **🚀 建议开发顺序**

```
1️⃣ 先搞定前端 UI（Phase 1-3）
   ↓
2️⃣ 再实现后端核心（Phase 4-5）
   ↓
3️⃣ 最后集成联调（Phase 6-7）
```

### **🎨 Boss，现在开始哪一步？**

1. **🎨 Phase 1：基础 UI 搭建**（推荐先做，可视化效果好）
2. **🔧 Phase 4：虚拟 BrowserView 池**（技术难点，可以先攻克）
3. **⚙️ Phase 5：节点执行器**（核心业务逻辑）
4. **📦 直接安装依赖，全面开工**（激进策略）

请指示！

