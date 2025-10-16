<template>
  <div ref="containerRef" class="starchart-viewport"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import cytoscape from 'cytoscape'
import fcose from 'cytoscape-fcose'
import type { CytoscapeElement, LayoutConfig, ViewportState } from '@stores/projectPage/starChart/starChart.types'

// 注册 fcose 布局
cytoscape.use(fcose)

const props = defineProps<{
  elements: CytoscapeElement[]
  layout: LayoutConfig
}>()

const emit = defineEmits<{
  'viewport-change': [state: ViewportState]
}>()

const containerRef = ref<HTMLElement | null>(null)
let cyInstance: cytoscape.Core | null = null

// 初始化 Cytoscape
const initCytoscape = () => {
  if (!containerRef.value) {
    console.error('[StarChartViewport] 容器不存在')
    return
  }

  console.log('[StarChartViewport] 初始化 Cytoscape')
  console.log('[StarChartViewport] 元素数量:', props.elements.length)
  console.log('[StarChartViewport] 元素:', props.elements)

  cyInstance = cytoscape({
    container: containerRef.value,
    elements: props.elements,
    style: getCytoscapeStyle(),
    layout: { name: 'grid' }, // 初始布局
    minZoom: 0.1,
    maxZoom: 5,
    wheelSensitivity: 0.2
  })

  console.log('[StarChartViewport] Cytoscape 实例创建成功')
  console.log('[StarChartViewport] 节点数:', cyInstance.nodes().length)
  console.log('[StarChartViewport] 边数:', cyInstance.edges().length)

  // 监听视口变化
  cyInstance.on('zoom pan', () => {
    if (cyInstance) {
      emit('viewport-change', {
        zoom: cyInstance.zoom(),
        pan: cyInstance.pan()
      })
    }
  })

  // 运行布局
  runLayout()
}

// 运行布局
const runLayout = () => {
  if (!cyInstance) return

  const layout = cyInstance.layout({
    name: props.layout.name,
    nodeRepulsion: props.layout.nodeRepulsion,
    idealEdgeLength: (edge: any) => {
      return props.layout.idealEdgeLength! / (edge.data('weight') || 1)
    },
    animate: props.layout.animate,
    randomize: props.layout.randomize
  })

  layout.run()
}

// Cytoscape 样式（基于 cy-style.json）
const getCytoscapeStyle = () => [
  {
    selector: 'node',
    style: {
      'width': 'mapData(score, 0, 1, 20, 60)',
      'height': 'mapData(score, 0, 1, 20, 60)',
      'content': 'data(name)',
      'font-size': '12px',
      'text-valign': 'center',
      'text-halign': 'center',
      'background-color': 'data(color)',
      'text-outline-color': '#555',
      'text-outline-width': '2px',
      'color': '#fff'
    }
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'opacity': 0.6,
      'line-color': '#999',
      'width': 'mapData(weight, 0, 1, 1, 8)',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#999'
    }
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': '4px',
      'border-color': '#4dabf7'
    }
  }
]

// 监听 elements 变化
watch(() => props.elements, (newElements) => {
  console.log('[StarChartViewport] Elements 变化:', newElements.length)
  if (cyInstance) {
    cyInstance.elements().remove()
    cyInstance.add(newElements)
    runLayout()
  } else if (newElements.length > 0) {
    // 如果 cyInstance 还不存在但有数据了，立即初始化
    console.log('[StarChartViewport] 延迟初始化 Cytoscape（因为数据后到）')
    initCytoscape()
  }
}, { deep: true })

// 监听 layout 变化
watch(() => props.layout, () => {
  runLayout()
}, { deep: true })

onMounted(() => {
  initCytoscape()
})

onBeforeUnmount(() => {
  if (cyInstance) {
    cyInstance.destroy()
    cyInstance = null
  }
})
</script>

<style scoped lang="scss">
.starchart-viewport {
  flex: 1; /* 占满剩余空间 */
  min-height: 0; /* 关键：允许 flex 压缩 */
  width: 100%;
  height: 100%; /* 确保占满父容器 */
  background: var(--obsidian-background-primary);
  position: relative;
}
</style>

