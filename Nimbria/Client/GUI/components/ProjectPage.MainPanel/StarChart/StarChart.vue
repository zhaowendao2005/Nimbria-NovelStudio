<template>
  <div class="starchart-container">
    <!-- 控制栏 -->
    <div class="starchart-toolbar">
      <div class="toolbar-group">
        <el-button size="small" @click="resetGraph">重置视图</el-button>
        <el-button size="small" @click="addRandomNode">添加节点</el-button>
        <el-button size="small" @click="clearGraph">清空图表</el-button>
      </div>
      <div class="toolbar-stats">
        <span>节点数: {{ nodeCount }}</span>
        <span>边数: {{ edgeCount }}</span>
      </div>
    </div>

    <!-- Sigma 容器 -->
    <div ref="containerRef" class="starchart-canvas"></div>

    <!-- 加载提示 -->
    <div v-if="isLoading" class="loading-overlay">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>初始化图表中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * StarChart 组件
 * 基于 Sigma.js 的力结构图可视化引擎
 * 支持动态节点添加、交互等基础功能
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import type Graph from 'graphology'
import Sigma from 'sigma'

// Props 和 Emits
interface Props {
  instanceId?: string
  tabId?: string
}

defineProps<Props>()

// 响应式数据
const containerRef = ref<HTMLDivElement | null>(null)
const isLoading = ref(true)
const nodeCount = ref(0)
const edgeCount = ref(0)

let graph: Graph | null = null
let sigma: Sigma | null = null

/**
 * 初始化图表
 */
const initializeGraph = async () => {
  try {
    isLoading.value = true

    // 动态导入 graphology
    const { default: Graph } = await import('graphology')

    // 创建图实例
    graph = new Graph()

    // 生成示例数据：10个节点，若干条边
    generateSampleData(graph)

    // 初始化 Sigma
    if (containerRef.value) {
      sigma = new Sigma(graph, containerRef.value, {
        renderLabels: true,
        labelSize: 14,
        labelColor: { color: '#000' },
        defaultNodeColor: '#5b7fff',
        defaultEdgeColor: '#ccc',
        allowInvalidContainer: false
      })

      // 启用力学算法
      enableForceAlgorithm()

      console.log('[StarChart] Graph initialized successfully')
    }

    isLoading.value = false
  } catch (error) {
    console.error('[StarChart] Failed to initialize graph:', error)
    isLoading.value = false
  }
}

/**
 * 生成示例数据
 */
const generateSampleData = (g: Graph) => {
  // 添加10个节点
  const nodeIds = Array.from({ length: 10 }, (_, i) => `node-${i}`)

  nodeIds.forEach((id, index) => {
    g.addNode(id, {
      label: `节点 ${index + 1}`,
      size: 8,
      color: getNodeColor(index),
      x: Math.random() * 100,
      y: Math.random() * 100
    })
  })

  // 添加随机边（形成力结构图效果）
  for (let i = 0; i < nodeIds.length; i++) {
    // 每个节点连接到 2-3 个其他节点
    const connectionCount = Math.floor(Math.random() * 2) + 2
    for (let j = 0; j < connectionCount; j++) {
      const targetIdx = Math.floor(Math.random() * nodeIds.length)
      if (targetIdx !== i) {
        const sourceNode = nodeIds[i]
        const targetNode = nodeIds[targetIdx]
        if (sourceNode && targetNode && !g.hasEdge(sourceNode, targetNode)) {
          g.addEdge(sourceNode, targetNode, {
            color: '#d0d0d0',
            weight: Math.random() * 0.5 + 0.5
          })
        }
      }
    }
  }

  // 更新统计信息
  nodeCount.value = g.order
  edgeCount.value = g.size
}

/**
 * 节点颜色方案
 */
const getNodeColor = (index: number): string => {
  const colors = [
    '#5b7fff', // 蓝色
    '#ff7875', // 红色
    '#52c41a', // 绿色
    '#faad14', // 橙色
    '#722ed1', // 紫色
    '#13c2c2', // 青色
    '#eb2f96', // 粉色
    '#1890ff', // 深蓝
    '#fadb14', // 黄色
    '#f5222d'  // 深红
  ]
  return colors[index % colors.length] || '#5b7fff'
}

/**
 * 启用力学算法（简单的力导向布局）
 */
const enableForceAlgorithm = () => {
  if (!graph || !sigma) return

  // 使用 graphology-layout-forceatlas2 或手动实现简单力学
  try {
    // 尝试导入 forceatlas2
    import('graphology-layout-forceatlas2').then((module) => {
      const forceAtlas2 = module.default
      
      // 运行布局算法
      forceAtlas2.assign(graph!, {
        iterations: 50,
        settings: {
          barnesHutOptimize: false,
          gravity: 1,
          linLogMode: false,
          outboundAttractionDistribution: false,
          adjustSizes: false,
          edgeWeightInfluence: 1,
          scalingRatio: 10,
          slowDown: 10,
          strongGravityMode: false
        }
      })

      console.log('[StarChart] ForceAtlas2 layout applied')
    }).catch(() => {
      console.log('[StarChart] ForceAtlas2 not available, using manual layout')
      // 如果 forceatlas2 不可用，使用简单的随机布局
    })
  } catch (error) {
    console.warn('[StarChart] Force algorithm initialization skipped:', error)
  }
}

/**
 * 重置视图
 */
const resetGraph = () => {
  if (!sigma) return
  sigma.getCamera().animatedReset()
  console.log('[StarChart] Graph view reset')
}

/**
 * 添加随机节点
 */
const addRandomNode = () => {
  if (!graph || !sigma) return

  const newNodeId = `node-${Date.now()}`
  const color = getNodeColor(nodeCount.value)

  graph.addNode(newNodeId, {
    label: `新节点 ${nodeCount.value + 1}`,
    size: 8,
    color: color,
    x: Math.random() * 100,
    y: Math.random() * 100
  })

  // 连接到随机节点
  const allNodes = graph.nodes()
  if (allNodes.length > 1) {
    const targetNode = allNodes[Math.floor(Math.random() * (allNodes.length - 1))]
    if (targetNode && !graph.hasEdge(newNodeId, targetNode)) {
      graph.addEdge(newNodeId, targetNode, {
        color: '#d0d0d0'
      })
    }
  }

  nodeCount.value = graph.order
  edgeCount.value = graph.size

  console.log('[StarChart] New node added:', newNodeId)
}

/**
 * 清空图表
 */
const clearGraph = () => {
  if (!graph) return

  graph.clear()
  nodeCount.value = 0
  edgeCount.value = 0

  console.log('[StarChart] Graph cleared')
}

// 生命周期
onMounted(() => {
  initializeGraph()
})

onUnmounted(() => {
  // 清理 Sigma 实例
  if (sigma) {
    sigma.kill()
    sigma = null
  }
  graph = null
  console.log('[StarChart] Component unmounted, resources cleaned up')
})
</script>

<style scoped lang="scss">
.starchart-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background: var(--obsidian-bg-primary, #ffffff);
}

/* 工具栏 */
.starchart-toolbar {
  flex-shrink: 0;
  height: 40px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--obsidian-background-primary);
  border-bottom: 1px solid var(--obsidian-background-modifier-border);
  gap: 12px;

  .toolbar-group {
    display: flex;
    gap: 8px;
  }

  .toolbar-stats {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--obsidian-text-secondary);

    span {
      padding: 0 8px;
      border-right: 1px solid var(--obsidian-background-modifier-border);

      &:last-child {
        border-right: none;
      }
    }
  }
}

/* 画布容器 */
.starchart-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--obsidian-bg-secondary, #f5f6f8);
  min-height: 0;
}

/* 加载提示 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  z-index: 10;
  gap: 12px;

  .is-loading {
    font-size: 32px;
    animation: spin 2s linear infinite;
  }

  p {
    color: var(--obsidian-text-secondary);
    font-size: 14px;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
