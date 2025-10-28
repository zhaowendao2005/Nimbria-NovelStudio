<template>
  <StandaloneWindowShell title="链接节点视图">
    <!-- 业务内容：完全独立的 Sigma 图表系统 -->
    <div class="link-node-view-content">
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
  </StandaloneWindowShell>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Select, Delete, Refresh, Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import Sigma from 'sigma'
import type Graph from 'graphology'
import { analyzeLinkSimilarity } from '@service/LinkNodeView'
import { CircularLayoutEngine } from '@service/LinkNodeView'
import StandaloneWindowShell from '@pages/StandaloneWindowShell.vue'

// LinkItem 类型定义
interface LinkItem {
  id: string
  title: string
  url: string
}

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
const links = ref<LinkItem[]>([])
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
    links.value = JSON.parse(linksData) as LinkItem[]

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

  // 动态导入graphology
  const { default: Graph } = await import('graphology')

  // 创建图实例
  graph = new Graph()

  // 添加节点
  links.value.forEach((link: LinkItem) => {
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
    nodes: links.value.map((l: LinkItem) => ({ id: l.id, isMain: l.id === mainNodeId.value })),
    canvasWidth: sigmaContainerRef.value.clientWidth,
    canvasHeight: sigmaContainerRef.value.clientHeight
  })

  // 更新节点位置
  positions.forEach((pos: { x: number; y: number }, nodeId: string) => {
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
    window.nimbria.linkNodeView.deleteLinks({
      tabId: route.query.tabId as string,
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
.link-node-view-content {
  width: 100%;
  height: 100%;
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

