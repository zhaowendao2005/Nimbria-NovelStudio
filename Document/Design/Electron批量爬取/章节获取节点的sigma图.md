好的Boss！这个需求很有意思，让我先查询Sigma.js的文档，然后给你一个完整的设计方案。

[3 tools called]

让我直接阅读现有的Sigma实例文档和相关代码：

[5 tools called]

好的Boss！让我继续阅读相关代码，然后给你一个完整的策划方案：

[2 tools called]

现在让我给你一个完整的策划方案。基于你的需求，我需要：

1. **链接标题相似度算法**
2. **节点视图窗口实现**（类似标签页拆分，但是显示Sigma图）
3. **自定义布局**（主节点在中心，附节点包围）
4. **框选删除功能**

## 🎯 完整策划方案

### 一、链接标题相似度算法

```typescript
/**
 * 链接标题相似度计算与主节点识别算法
 */

// 1. 字符串相似度计算（Levenshtein距离 + 结构化分析）
interface LinkItem {
  title: string
  url: string
  id: string
}

interface SimilarityResult {
  mainNode: LinkItem | null
  clusters: Map<string, LinkItem[]>
  mainClusterPattern: string
}

/**
 * 计算两个字符串的编辑距离
 */
function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length
  const len2 = s2.length
  const dp: number[][] = Array.from({ length: len1 + 1 }, () =>
    Array(len2 + 1).fill(0)
  )

  for (let i = 0; i <= len1; i++) dp[i][0] = i
  for (let j = 0; j <= len2; j++) dp[0][j] = j

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // 删除
          dp[i][j - 1] + 1,    // 插入
          dp[i - 1][j - 1] + 1 // 替换
        ) as number
      }
    }
  }

  return dp[len1][len2] as number
}

/**
 * 计算相似度百分比（0-1）
 */
function calculateSimilarity(s1: string, s2: string): number {
  const distance = levenshteinDistance(s1, s2)
  const maxLen = Math.max(s1.length, s2.length)
  return maxLen === 0 ? 1 : 1 - distance / maxLen
}
//再多列举个十五种
/**
 * 提取章节标题的结构模式
 * 例如: "第1章 标题" -> "第{N}章 {T}"
 */
function extractPattern(title: string): string | null {
  // 常见模式
  const patterns = [
    /第(\d+)章\s*(.*)$/,           // 第N章 XXX
    /第(\d+)节\s*(.*)$/,           // 第N节 XXX
    /Chapter\s*(\d+)\s*[:\-]?\s*(.*)$/i,  // Chapter N: XXX
    /(\d+)\.\s*(.*)$/,             // N. XXX
    /\[(\d+)\]\s*(.*)$/,           // [N] XXX
  ]

  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) {
      return pattern.source // 返回匹配的模式
    }
  }

  return null
}

/**
 * 计算所有链接的相似度并识别主节点
 */
function analyzeLinkSimilarity(links: LinkItem[]): SimilarityResult {
  if (links.length === 0) {
    return { mainNode: null, clusters: new Map(), mainClusterPattern: '' }
  }

  // 1. 提取所有链接的模式
  const patternMap = new Map<string, LinkItem[]>()
  
  links.forEach(link => {
    const pattern = extractPattern(link.title)
    if (pattern) {
      if (!patternMap.has(pattern)) {
        patternMap.set(pattern, [])
      }
      patternMap.get(pattern)!.push(link)
    } else {
      // 无模式的归为"其他"
      if (!patternMap.has('other')) {
        patternMap.set('other', [])
      }
      patternMap.get('other')!.push(link)
    }
  })

  // 2. 找出最大的簇（即主节点类型）
  let maxClusterSize = 0
  let mainClusterPattern = ''
  let mainCluster: LinkItem[] = []

  patternMap.forEach((cluster, pattern) => {
    if (cluster.length > maxClusterSize) {
      maxClusterSize = cluster.length
      mainClusterPattern = pattern
      mainCluster = cluster
    }
  })

  // 3. 如果没有明显的模式，使用相似度聚类
  if (mainClusterPattern === 'other' || patternMap.size === 1) {
    // 使用相似度矩阵进行聚类
    const similarityMatrix = computeSimilarityMatrix(links)
    const clusters = clusterBySimilarity(links, similarityMatrix, 0.6) // 60%相似度阈值
    
    // 找出最大的簇
    let maxCluster: LinkItem[] = []
    clusters.forEach(cluster => {
      if (cluster.length > maxCluster.length) {
        maxCluster = cluster
      }
    })

    mainCluster = maxCluster
  }

  // 4. 主节点是主簇中第一个（或可以选择最具代表性的）
  const mainNode = mainCluster.length > 0 ? mainCluster[0] : null

  return {
    mainNode,
    clusters: patternMap,
    mainClusterPattern
  }
}

/**
 * 计算相似度矩阵
 */
function computeSimilarityMatrix(links: LinkItem[]): number[][] {
  const n = links.length
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const similarity = calculateSimilarity(links[i].title, links[j].title)
      matrix[i][j] = similarity
      matrix[j][i] = similarity
    }
    matrix[i][i] = 1 // 自己与自己100%相似
  }

  return matrix
}

/**
 * 基于相似度矩阵进行聚类（简单的阈值聚类）
 */
function clusterBySimilarity(
  links: LinkItem[],
  similarityMatrix: number[][],
  threshold: number
): LinkItem[][] {
  const n = links.length
  const visited = new Array(n).fill(false)
  const clusters: LinkItem[][] = []

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue

    const cluster: LinkItem[] = [links[i]]
    visited[i] = true

    for (let j = i + 1; j < n; j++) {
      if (!visited[j] && similarityMatrix[i][j] >= threshold) {
        cluster.push(links[j])
        visited[j] = true
      }
    }

    clusters.push(cluster)
  }

  return clusters
}
```

---

### 二、节点视图窗口架构设计

#### 2.1 文件架构

```
Nimbria/
├── Client/
│   ├── GUI/
│   │   ├── components/
│   │   │   └── ProjectPage.MainPanel/
│   │   │       └── SearchAndScraper/
│   │   │           └── RightPanel/
│   │   │               └── TabContents/
│   │   │                   └── AdvancedMode/
│   │   │                       ├── [新增] LinkNodeViewModal.vue
│   │   │                       │   └── 弹窗组件，加载Sigma图表
│   │   │                       ├── Nodes/
│   │   │                       │   └── GetLinksNode.vue
│   │   │                       ├── NodeConfigContent.vue [修改]
│   │   │                       │   └── 添加"节点视图"按钮，弹出LinkNodeViewModal
│   │   │                       └── WorkflowCanvas.vue
│   ├── Service/
│   │   └── [新增目录] LinkNodeView/
│   │       ├── LinkSimilarityAnalyzer.ts  // 相似度算法
│   │       ├── CircularLayoutEngine.ts    // 圆形布局引擎
│   │       ├── types.ts
│   │       └── index.ts
│   ├── stores/
│   │   └── projectPage/
│   │       └── workflow.store.ts [修改]
│   │           └── 添加 linkNodeViewModal 状态管理
├── src-electron/
│   ├── ipc/
│   │   └── main-renderer/
│   │       └── link-node-view-handlers.ts [新增]
│   │           └── IPC handlers处理窗口创建和链接删除同步
│   └── types/
│       └── link-node-view.ts [新增]
```

**架构说明**：
- LinkNodeViewModal.vue 作为 AdvancedMode 的子组件，通过 v-if 控制显示隐藏
- 通过 Pinia store 管理弹窗状态（是否显示、数据传递）
- 子窗口创建通过 IPC 完全由后端 Electron 处理
- 窗口通信参考 @标签页新建为新窗口.md 的握手机制

#### 2.2 IPC 通信设计

```typescript
// src-electron/ipc/main-renderer/link-node-view-handlers.ts

import { ipcMain, BrowserWindow } from 'electron'
import path from 'path'

/**
 * 创建链接节点视图窗口（独立子窗口）
 * 
 * 工作流：
 * 1. LinkNodeViewModal.vue（前端弹窗）显示后，用户点击"查看节点图"
 * 2. 前端调用此 IPC handle 创建独立窗口
 * 3. 后端创建新窗口，加载链接数据，通过 URL 参数传递
 * 4. 新窗口与母窗口通过 IPC 进行删除操作的同步
 */
ipcMain.handle('link-node-view:open-window', async (event, payload: {
  links: Array<{ title: string; url: string; id: string }>
  tabId: string
  projectPath: string
}) => {
  try {
    const transferId = `link-view-${Date.now()}`
    
    // 创建子窗口
    const nodeViewWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      title: '链接节点视图',
      titleBarStyle: 'hidden',
      backgroundColor: '#1e1e1e',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.resolve(__dirname, '../../preload/project-preload.js')
      },
      parent: BrowserWindow.fromWebContents(event.sender) || undefined, // 设置为父窗口
      modal: false
    })

    // 构建URL参数
    const params = new URLSearchParams({
      transferId,
      tabId: payload.tabId,
      projectPath: payload.projectPath,
      linksData: encodeURIComponent(JSON.stringify(payload.links))
    })

    // 加载页面
    if (process.env.DEV) {
      await nodeViewWindow.loadURL(`${process.env.APP_URL}/#/link-node-view?${params}`)
    } else {
      await nodeViewWindow.loadFile('index.html', {
        hash: `/link-node-view?${params}`
      })
    }

    return { success: true, windowId: nodeViewWindow.id, transferId }
  } catch (error) {
    return {
      success: false,
      error: { message: (error as Error).message }
    }
  }
})

/**
 * 删除链接（同步到主窗口）
 */
ipcMain.on('link-node-view:delete-links', (event, payload: {
  tabId: string
  linkIds: string[]
}) => {
  // 找到父窗口（主窗口）
  const allWindows = BrowserWindow.getAllWindows()
  const parentWindow = allWindows.find(win => !win.isModal())
  
  if (parentWindow) {
    parentWindow.webContents.send('link-node-view:sync-delete', {
      tabId: payload.tabId,
      linkIds: payload.linkIds
    })
  }
})
```

#### 2.2.5 LinkNodeViewModal.vue（弹窗组件）

```vue
<!-- Client/GUI/components/ProjectPage.MainPanel/SearchAndScraper/RightPanel/TabContents/AdvancedMode/LinkNodeViewModal.vue -->
<template>
  <el-dialog
    v-model="isVisible"
    title="链接节点视图"
    width="90%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 加载中 -->
    <div v-if="isLoading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>分析链接结构中...</p>
    </div>

    <!-- 主要内容区域 -->
    <template v-else>
      <div class="modal-toolbar">
        <div class="stats">
          <span>总链接数: {{ links.length }}</span>
          <span>|</span>
          <span>主节点类型: {{ mainClusterPattern }}</span>
        </div>
        <el-button type="primary" size="small" @click="openInNewWindow">
          <el-icon><FullScreen /></el-icon>
          在新窗口查看
        </el-button>
      </div>

      <!-- 预览Sigma图（缩小版） -->
      <div ref="previewContainerRef" class="sigma-preview"></div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Loading, FullScreen } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import Sigma from 'sigma'
import Graph from 'graphology'
import { analyzeLinkSimilarity } from '@service/LinkNodeView/LinkSimilarityAnalyzer'
import { CircularLayoutEngine } from '@service/LinkNodeView/CircularLayoutEngine'

// Props
const props = defineProps<{
  visible: boolean
  links: Array<{ title: string; url: string; id: string }>
  tabId: string
  projectPath: string
}>()

// Emits
const emit = defineEmits<{
  'update:visible': [boolean]
}>()

// 响应式数据
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const previewContainerRef = ref<HTMLDivElement | null>(null)
const isLoading = ref(true)

// 分析结果
const mainClusterPattern = ref('')
const mainNodeId = ref<string | null>(null)

let sigma: Sigma | null = null
let graph: Graph | null = null

/**
 * 监听弹窗显示，初始化图
 */
watch(
  () => isVisible.value,
  async (newVal) => {
    if (newVal && props.links.length > 0) {
      await initializePreview()
    }
  }
)

/**
 * 初始化预览图
 */
const initializePreview = async () => {
  if (!previewContainerRef.value) return

  try {
    isLoading.value = true

    // 分析链接相似度
    const analysis = analyzeLinkSimilarity(props.links)
    mainClusterPattern.value = analysis.mainClusterPattern
    mainNodeId.value = analysis.mainNode?.id || null

    // 创建图
    graph = new Graph()

    // 添加节点
    props.links.forEach(link => {
      const isMainNode = link.id === mainNodeId.value
      graph!.addNode(link.id, {
        label: link.title.substring(0, 20), // 截断长标题
        size: isMainNode ? 15 : 10,
        color: isMainNode ? '#faad14' : '#5b7fff',
        x: 0,
        y: 0
      })
    })

    // 应用布局
    const layoutEngine = new CircularLayoutEngine()
    const positions = layoutEngine.computeLayout({
      mainNodeId: mainNodeId.value,
      nodes: props.links.map(l => ({ id: l.id, isMain: l.id === mainNodeId.value })),
      canvasWidth: previewContainerRef.value.clientWidth,
      canvasHeight: previewContainerRef.value.clientHeight
    })

    // 更新位置
    positions.forEach((pos, nodeId) => {
      graph!.setNodeAttribute(nodeId, 'x', pos.x)
      graph!.setNodeAttribute(nodeId, 'y', pos.y)
    })

    // 初始化Sigma
    sigma = new Sigma(graph, previewContainerRef.value, {
      renderLabels: true,
      labelSize: 10,
      labelColor: { color: '#fff' },
      allowInvalidContainer: false
    })

    isLoading.value = false
  } catch (error) {
    console.error('[LinkNodeViewModal] Init failed:', error)
    ElMessage.error('初始化失败')
    isLoading.value = false
  }
}

/**
 * 在新窗口打开
 */
const openInNewWindow = async () => {
  try {
    const result = await window.nimbria.ipcInvoke('link-node-view:open-window', {
      links: props.links,
      tabId: props.tabId,
      projectPath: props.projectPath
    })

    if (result.success) {
      ElMessage.success('新窗口已打开')
    } else {
      ElMessage.error('打开失败: ' + result.error.message)
    }
  } catch (error) {
    console.error('[LinkNodeViewModal] Open window failed:', error)
    ElMessage.error('打开失败')
  }
}

/**
 * 关闭弹窗
 */
const handleClose = () => {
  if (sigma) {
    sigma.kill()
    sigma = null
  }
  if (graph) {
    graph = null
  }
}
</script>

<style scoped lang="scss">
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #999;

  .is-loading {
    font-size: 48px;
    margin-bottom: 16px;
  }
}

.modal-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color);

  .stats {
    display: flex;
    gap: 16px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

.sigma-preview {
  width: 100%;
  height: 500px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: #0a0e27;
}
</style>
```

#### 2.3 前端页面组件（独立窗口）

```vue
<!-- 独立子窗口页面（在新 Electron 窗口中加载）
     路由参数：/#/link-node-view?tabId=xxx&projectPath=xxx&linksData=xxx
     
     功能：完整的 Sigma 图表，支持框选、删除等交互
-->
<template>
  <div class="link-node-view-page">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button 
          :type="selectionMode ? 'primary' : 'default'"
          size="small"
          @click="toggleSelectionMode"
        >
          <el-icon><Select /></el-icon>
          {{ selectionMode ? '取消选择' : '选择' }}
        </el-button>
        
        <el-button
          type="danger"
          size="small"
          :disabled="selectedNodeIds.length === 0"
          @click="handleDeleteSelected"
        >
          <el-icon><Delete /></el-icon>
          删除选中 ({{ selectedNodeIds.length }})
        </el-button>
      </div>

      <div class="toolbar-center">
        <span class="stats">
          节点总数: {{ totalNodes }} | 主节点: {{ mainNodeCount }} | 附节点: {{ attachedNodeCount }}
        </span>
      </div>

      <div class="toolbar-right">
        <el-button size="small" @click="resetView">
          <el-icon><Refresh /></el-icon>
          重置视图
        </el-button>
      </div>
    </div>

    <!-- Sigma 画布 -->
    <div ref="sigmaContainerRef" class="sigma-canvas"></div>

    <!-- 选择框（拖拽圈选） -->
    <div
      v-if="selectionBox.visible"
      class="selection-box"
      :style="{
        left: selectionBox.left + 'px',
        top: selectionBox.top + 'px',
        width: selectionBox.width + 'px',
        height: selectionBox.height + 'px'
      }"
    ></div>

    <!-- 加载遮罩 -->
    <div v-if="isLoading" class="loading-overlay">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>分析链接结构中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Select, Delete, Refresh, Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import Sigma from 'sigma'
import Graph from 'graphology'
import { analyzeLinkSimilarity } from '@service/LinkNodeView/LinkSimilarityAnalyzer'
import { CircularLayoutEngine } from '@service/LinkNodeView/CircularLayoutEngine'

// 响应式数据
const route = useRoute()
const sigmaContainerRef = ref<HTMLDivElement | null>(null)
const isLoading = ref(true)
const selectionMode = ref(false)
const selectedNodeIds = ref<string[]>([])

// Sigma 实例
let sigma: Sigma | null = null
let graph: Graph | null = null

// 数据
const links = ref<Array<{ title: string; url: string; id: string }>>([])
const mainNodeId = ref<string | null>(null)
const totalNodes = computed(() => links.value.length)
const mainNodeCount = computed(() => (mainNodeId.value ? 1 : 0))
const attachedNodeCount = computed(() => totalNodes.value - mainNodeCount.value)

// 选择框
const selectionBox = ref({
  visible: false,
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  startX: 0,
  startY: 0
})

/**
 * 初始化
 */
onMounted(async () => {
  try {
    // 解析URL参数
    const linksData = decodeURIComponent(route.query.linksData as string)
    links.value = JSON.parse(linksData)

    // 分析相似度
    const analysis = analyzeLinkSimilarity(links.value)
    mainNodeId.value = analysis.mainNode?.id || null

    // 初始化图
    await initializeGraph()

    isLoading.value = false
  } catch (error) {
    console.error('[LinkNodeView] Init failed:', error)
    ElMessage.error('初始化失败')
    isLoading.value = false
  }
})

/**
 * 初始化Sigma图
 */
const initializeGraph = async () => {
  if (!sigmaContainerRef.value) return

  // 创建图实例
  graph = new Graph()

  // 添加节点
  links.value.forEach(link => {
    const isMainNode = link.id === mainNodeId.value
    graph!.addNode(link.id, {
      label: link.title,
      size: isMainNode ? 20 : 12,
      color: isMainNode ? '#faad14' : '#5b7fff', // 主节点黄色，附节点蓝色
      x: 0,
      y: 0
    })
  })

  // 应用圆形布局
  const layoutEngine = new CircularLayoutEngine()
  const positions = layoutEngine.computeLayout({
    mainNodeId: mainNodeId.value,
    nodes: links.value.map(l => ({ id: l.id, isMain: l.id === mainNodeId.value })),
    canvasWidth: sigmaContainerRef.value.clientWidth,
    canvasHeight: sigmaContainerRef.value.clientHeight
  })

  // 更新节点位置
  positions.forEach((pos, nodeId) => {
    graph!.setNodeAttribute(nodeId, 'x', pos.x)
    graph!.setNodeAttribute(nodeId, 'y', pos.y)
  })

  // 初始化Sigma
  sigma = new Sigma(graph, sigmaContainerRef.value, {
    renderLabels: true,
    labelSize: 12,
    labelColor: { color: '#fff' },
    defaultNodeColor: '#5b7fff',
    allowInvalidContainer: false
  })

  // 绑定事件
  bindEvents()
}

/**
 * 绑定事件
 */
const bindEvents = () => {
  if (!sigma || !sigmaContainerRef.value) return

  const container = sigmaContainerRef.value

  // 点击节点
  sigma.on('clickNode', ({ node }) => {
    if (selectionMode.value) {
      toggleNodeSelection(node)
    }
  })

  // 拖拽圈选
  let isMouseDown = false
  container.addEventListener('mousedown', (e) => {
    if (!selectionMode.value) return
    isMouseDown = true
    selectionBox.value.startX = e.clientX
    selectionBox.value.startY = e.clientY
    selectionBox.value.left = e.clientX
    selectionBox.value.top = e.clientY
    selectionBox.value.width = 0
    selectionBox.value.height = 0
    selectionBox.value.visible = true
  })

  container.addEventListener('mousemove', (e) => {
    if (!isMouseDown || !selectionMode.value) return
    
    const currentX = e.clientX
    const currentY = e.clientY
    
    selectionBox.value.left = Math.min(selectionBox.value.startX, currentX)
    selectionBox.value.top = Math.min(selectionBox.value.startY, currentY)
    selectionBox.value.width = Math.abs(currentX - selectionBox.value.startX)
    selectionBox.value.height = Math.abs(currentY - selectionBox.value.startY)
  })

  container.addEventListener('mouseup', () => {
    if (!isMouseDown) return
    isMouseDown = false

    // 计算选择框内的节点
    if (selectionBox.value.width > 5 && selectionBox.value.height > 5) {
      selectNodesInBox()
    }

    selectionBox.value.visible = false
  })
}

/**
 * 选择框内的节点
 */
const selectNodesInBox = () => {
  if (!sigma || !graph) return

  const { left, top, width, height } = selectionBox.value
  const containerRect = sigmaContainerRef.value!.getBoundingClientRect()

  graph.forEachNode((nodeId) => {
    const nodeDisplayData = sigma!.getNodeDisplayData(nodeId)
    if (!nodeDisplayData) return

    // 转换为屏幕坐标
    const screenX = nodeDisplayData.x + containerRect.left
    const screenY = nodeDisplayData.y + containerRect.top

    // 检查是否在选择框内
    if (
      screenX >= left &&
      screenX <= left + width &&
      screenY >= top &&
      screenY <= top + height
    ) {
      if (!selectedNodeIds.value.includes(nodeId)) {
        selectedNodeIds.value.push(nodeId)
        highlightNode(nodeId, true)
      }
    }
  })
}

/**
 * 切换节点选择状态
 */
const toggleNodeSelection = (nodeId: string) => {
  const index = selectedNodeIds.value.indexOf(nodeId)
  if (index > -1) {
    selectedNodeIds.value.splice(index, 1)
    highlightNode(nodeId, false)
  } else {
    selectedNodeIds.value.push(nodeId)
    highlightNode(nodeId, true)
  }
}

/**
 * 高亮节点
 */
const highlightNode = (nodeId: string, highlight: boolean) => {
  if (!graph) return
  graph.setNodeAttribute(nodeId, 'highlighted', highlight)
  graph.setNodeAttribute(nodeId, 'color', highlight ? '#52c41a' : (nodeId === mainNodeId.value ? '#faad14' : '#5b7fff'))
}

/**
 * 切换选择模式
 */
const toggleSelectionMode = () => {
  selectionMode.value = !selectionMode.value
  if (!selectionMode.value) {
    // 取消选择时清空
    selectedNodeIds.value.forEach(id => highlightNode(id, false))
    selectedNodeIds.value = []
  }
}

/**
 * 删除选中的节点
 */
const handleDeleteSelected = async () => {
  if (selectedNodeIds.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedNodeIds.value.length} 个链接吗？`,
      '批量删除',
      { type: 'warning' }
    )

    // 通过IPC通知主窗口删除
    window.nimbria.send('link-node-view:delete-links', {
      tabId: route.query.tabId,
      linkIds: selectedNodeIds.value
    })

    // 从图中移除节点
    selectedNodeIds.value.forEach(nodeId => {
      if (graph) graph.dropNode(nodeId)
    })

    // 清空选择
    selectedNodeIds.value = []
    ElMessage.success('删除成功')

  } catch {
    // 用户取消
  }
}

/**
 * 重置视图
 */
const resetView = () => {
  if (sigma) {
    sigma.getCamera().animatedReset()
  }
}

onUnmounted(() => {
  if (sigma) sigma.kill()
})
</script>

<style scoped lang="scss">
.link-node-view-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  position: relative;
}

.toolbar {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #252525;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.sigma-canvas {
  flex: 1;
  position: relative;
}

.selection-box {
  position: fixed;
  border: 2px dashed #52c41a;
  background: rgba(82, 196, 26, 0.1);
  pointer-events: none;
  z-index: 9999;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  z-index: 10000;
}
</style>
```

---

### 三、圆形布局引擎

```typescript
// Client/Service/LinkNodeView/CircularLayoutEngine.ts

export interface LayoutNode {
  id: string
  isMain: boolean
}

export interface LayoutConfig {
  mainNodeId: string | null
  nodes: LayoutNode[]
  canvasWidth: number
  canvasHeight: number
}

export class CircularLayoutEngine {
  /**
   * 计算圆形布局
   * 主节点在中心，附节点环绕
   */
  computeLayout(config: LayoutConfig): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>()
    const centerX = config.canvasWidth / 2
    const centerY = config.canvasHeight / 2

    // 1. 放置主节点在中心
    if (config.mainNodeId) {
      positions.set(config.mainNodeId, { x: centerX, y: centerY })
    }

    // 2. 计算附节点的圆形排列
    const attachedNodes = config.nodes.filter(n => !n.isMain)
    const radius = Math.min(config.canvasWidth, config.canvasHeight) * 0.35 // 半径为画布的35%
    const angleStep = (2 * Math.PI) / attachedNodes.length

    attachedNodes.forEach((node, index) => {
      const angle = index * angleStep
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      positions.set(node.id, { x, y })
    })

    return positions
  }
}
```

---

## 📋 实施步骤

### 阶段一：算法与基础服务（1天）
1. 实现链接标题相似度算法
2. 实现圆形布局引擎
3. 编写单元测试

### 阶段二：IPC与窗口创建（0.5天）
1. 添加IPC handlers
2. 实现窗口创建逻辑
3. 测试父子窗口通信

### 阶段三：前端页面（1.5天）
1. 创建LinkNodeViewPage.vue
2. 集成Sigma.js
3. 实现圆形布局渲染
4. 实现框选功能

### 阶段四：交互与同步（0.5天）
1. 实现选择/删除功能
2. 实现母窗口状态同步
3. 完整测试

---

Boss，这就是完整的策划方案！核心要点：
- ✅ **相似度算法**：结合编辑距离和模式识别
- ✅ **窗口架构**：参考标签页拆分方案，使用IPC通信
- ✅ **圆形布局**：主节点中心，附节点环绕
- ✅ **框选删除**：鼠标拖拽 + 双向同步

需要我开始实施吗？或者需要我先创建详细的类型定义文件？