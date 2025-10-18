<template>
  <div ref="containerRef" class="starchart-g6-viewport"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { Graph } from '@antv/g6'
import type { IEvent } from '@antv/g6'
import { Renderer as CanvasRenderer } from '@antv/g-canvas'
import { Renderer as WebGLRenderer } from '@antv/g-webgl'
import { Renderer as SVGRenderer } from '@antv/g-svg'
import type { G6Data } from '@stores/projectPage/starChart/transforms/G6Transformer'
import type { LayoutConfig } from '@stores/projectPage/starChart/layouts/types'
import { useStarChartConfigStore } from '@stores/projectPage/starChart'

/**
 * Props
 */
const props = defineProps<{
  g6Data: G6Data             // G6 格式的数据
  layout: LayoutConfig       // 布局配置
  wheelSensitivity?: number  // 滚轮灵敏度
  fastRebuild?: boolean      // 快速重建模式（禁用动画）
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  'viewport-change': [state: { zoom: number; pan: { x: number; y: number } }]
  'node-selected': [nodeId: string]
  'render-complete': []
}>()

// 容器 DOM 引用
const containerRef = ref<HTMLDivElement | null>(null)
// G6 图实例
let graphInstance: Graph | null = null
// 配置 Store
const configStore = useStarChartConfigStore()

/**
 * 获取渲染器实例
 * 根据配置选择 Canvas / WebGL / SVG
 */
const getRenderer = (layer?: string) => {
  const rendererType = configStore.config.g6.renderer
  
  // 自动选择：根据节点数量
  if (rendererType === 'auto') {
    const nodeCount = props.g6Data.nodes.length
    if (nodeCount > 5000) {
      console.log('[G6Viewport] 自动选择 WebGL 渲染器（节点数：' + nodeCount + '）')
      return new WebGLRenderer()
    } else {
      console.log('[G6Viewport] 自动选择 Canvas 渲染器（节点数：' + nodeCount + '）')
      return new CanvasRenderer()
    }
  }
  
  // 手动选择
  const rendererMap: Record<string, any> = {
    'canvas': () => new CanvasRenderer(),
    'webgl': () => new WebGLRenderer(),
    'svg': () => new SVGRenderer(),
  }
  
  const selectedRenderer = rendererMap[rendererType]
  if (selectedRenderer) {
    console.log(`[G6Viewport] 使用 ${rendererType.toUpperCase()} 渲染器`)
    return selectedRenderer()
  }
  
  // 默认 Canvas
  console.log('[G6Viewport] 使用默认 Canvas 渲染器')
  return new CanvasRenderer()
}

/**
 * 获取 G6 布局配置
 * 将通用布局配置映射到 G6 格式
 */
const getG6LayoutConfig = () => {
  const layoutType = props.layout.name
  
  const layoutMap: Record<string, any> = {
    'concentric': {
      type: 'preset',  // 使用预计算位置
    },
    'force-directed': {
      type: 'force',
      preventOverlap: true,
      nodeSize: 30,
      linkDistance: 100,
      nodeStrength: -300,
      edgeStrength: 0.6,
      gravity: 5,
      animate: !props.fastRebuild,
    },
  }
  
  return layoutMap[layoutType] || layoutMap['force-directed']
}

/**
 * 初始化 G6 图
 */
const initGraph = () => {
  if (!containerRef.value) {
    console.error('[G6Viewport] 容器未就绪')
    return
  }
  
  // 🔥 检查数据是否就绪
  if (!props.g6Data || !props.g6Data.nodes || !props.g6Data.edges) {
    console.warn('[G6Viewport] 数据未就绪，跳过初始化')
    return
  }
  
  console.log('[G6Viewport] 开始初始化 G6')
  console.log(`[G6Viewport] 数据：${props.g6Data.nodes.length} 节点，${props.g6Data.edges.length} 边`)
  
  // 使用内置节点类型，后续根据 G6 v5 扩展 API 再行注册自定义节点
  
  // 获取容器尺寸
  const containerWidth = containerRef.value.clientWidth
  const containerHeight = containerRef.value.clientHeight
  
  // 获取滚轮灵敏度配置
  const sensitivity = props.wheelSensitivity || configStore.config.interaction.wheelSensitivity
  
  console.log('[G6Viewport] 初始化交互配置，滚轮灵敏度:', sensitivity)
  
  // 创建 G6 图实例
  graphInstance = new Graph({
    container: containerRef.value,
    width: containerWidth,
    height: containerHeight,
    
    // 渲染器（动态选择）
    renderer: getRenderer,
    
    // 数据
    data: props.g6Data as unknown as any,
    
    // 布局
    layout: getG6LayoutConfig(),
    
    // 节点配置
    node: {
      style: {
        size: 30,
        fill: '#5B8FF9',
        stroke: '#5B8FF9',
        lineWidth: 2,
      },
    } as any,
    
    // 边配置
    edge: {
      style: {
        stroke: '#e2e2e2',
        lineWidth: 1,
        opacity: 0.6,
      },
    } as any,
    
    // 🔥 关键：配置交互行为（G6 v5 behaviors配置）
    behaviors: [
      {
        type: 'drag-canvas',
        key: 'drag-canvas',
        enable: true,
      },
      {
        type: 'zoom-canvas',
        key: 'zoom-canvas',
        enable: true,
        sensitivity: sensitivity,
      },
      {
        type: 'drag-element',
        key: 'drag-element',
        enable: true,
      },
    ],
    
    // 自动适应视口（初始渲染后自动fit）
    autoFit: 'view',
  })
  
  // 事件绑定
  setupEventListeners()
  
  // 渲染
  console.log('[G6Viewport] 开始渲染')
  graphInstance.render()
  
  console.log('[G6Viewport] 初始化完成')
  emit('render-complete')
}

/**
 * 更新交互行为配置（动态更新灵敏度）
 */
const setupBehaviors = () => {
  if (!graphInstance) return
  
  // 获取滚轮灵敏度配置
  const sensitivity = props.wheelSensitivity || configStore.config.interaction.wheelSensitivity
  
  console.log('[G6Viewport] 更新交互行为，滚轮灵敏度:', sensitivity)
  
  try {
    // G6 v5 使用 updateBehavior 方法动态更新behavior配置
    graphInstance.updateBehavior({
      key: 'zoom-canvas',
      sensitivity: sensitivity,
    })
    
    console.log('[G6Viewport] 滚轮灵敏度更新完成')
  } catch (error) {
    console.warn('[G6Viewport] 更新交互行为时出错:', error)
  }
}

/**
 * 设置事件监听
 */
const setupEventListeners = () => {
  if (!graphInstance) return
  
  // 节点点击
  graphInstance.on('node:click', (evt: IEvent) => {
    const nodeId = (evt as unknown as any).itemId as string
    console.log('[G6Viewport] 节点点击：', nodeId)
    emit('node-selected', nodeId)
  })
  
  // 视口变化
  graphInstance.on('viewportchange', () => {
    if (!graphInstance) return
    const zoom = (graphInstance as unknown as any).getZoom?.() as number | undefined
    const center = (graphInstance as unknown as any).getViewportCenter?.() as [number, number] | undefined
    const x = center ? center[0] : 0
    const y = center ? center[1] : 0
    emit('viewport-change', { zoom: zoom ?? 1, pan: { x, y } })
  })
  
  console.log('[G6Viewport] 事件监听已设置')
}

// 省略高亮逻辑：G6 v5 API 与 v4 差异较大，后续按需补全

/**
 * 销毁图实例
 */
const destroyGraph = () => {
  if (graphInstance) {
    console.log('[G6Viewport] 销毁图实例')
    graphInstance.destroy()
    graphInstance = null
  }
}

/**
 * 监听数据变化
 */
watch(
  () => props.g6Data,
  async (newData) => {
    if (!graphInstance) return
    
    console.log('[G6Viewport] 数据更新：', newData.nodes.length, '节点')
    
    // 更新数据
    ;(graphInstance as unknown as any).setData(newData as unknown as any)
    
    // 重新渲染
    await graphInstance.render()
  },
  { deep: true }
)

/**
 * 监听布局变化
 */
watch(
  () => props.layout,
  async () => {
    if (!graphInstance) return
    
    console.log('[G6Viewport] 布局变化，重新应用布局')
    
    // 更新布局配置
    const newLayoutConfig = getG6LayoutConfig()
    graphInstance.setLayout(newLayoutConfig)
    
    // 重新布局
    await graphInstance.layout()
  },
  { deep: true }
)

/**
 * 监听滚轮灵敏度变化
 */
watch(
  () => props.wheelSensitivity,
  (newSensitivity) => {
    if (!graphInstance || !newSensitivity) return
    
    console.log('[G6Viewport] 滚轮灵敏度变化:', newSensitivity)
    setupBehaviors()
  }
)

/**
 * 监听store中的灵敏度配置变化
 */
watch(
  () => configStore.config.interaction.wheelSensitivity,
  (newSensitivity) => {
    if (!graphInstance) return
    
    console.log('[G6Viewport] Store灵敏度变化:', newSensitivity)
    setupBehaviors()
  }
)

// 生命周期
onMounted(async () => {
  await nextTick()
  
  // 🔥 调试日志：查看 props.g6Data 的状态
  console.log('[G6Viewport] onMounted: props.g6Data =', props.g6Data)
  console.log('[G6Viewport] onMounted: typeof =', typeof props.g6Data)
  console.log('[G6Viewport] onMounted: isArray =', Array.isArray(props.g6Data))
  console.log('[G6Viewport] onMounted: keys =', Object.keys(props.g6Data || {}))
  console.log('[G6Viewport] onMounted: nodes =', (props.g6Data as any)?.nodes)
  console.log('[G6Viewport] onMounted: nodes length =', props.g6Data?.nodes?.length)
  console.log('[G6Viewport] onMounted: edges length =', props.g6Data?.edges?.length)
  
  // 🔥 只有数据就绪时才初始化（检查是否有真实数据）
  if (props.g6Data && 
      props.g6Data.nodes && 
      props.g6Data.edges && 
      props.g6Data.nodes.length > 0) {
    console.log('[G6Viewport] onMounted: 数据已就绪，开始初始化')
    initGraph()
  } else {
    console.warn('[G6Viewport] onMounted: 数据未就绪，等待数据加载')
  }
})

onBeforeUnmount(() => {
  destroyGraph()
})

// 🔥 监听 elements 的初始化（从空到有数据）
watch(
  () => props.g6Data,
  (newData) => {
    console.log('[G6Viewport] watch triggered: g6Data =', newData)
    console.log('[G6Viewport] watch: nodes length =', newData?.nodes?.length)
    console.log('[G6Viewport] watch: graphInstance =', graphInstance)
    
    // 检查是否有真实数据（不是空数组）
    if (newData && 
        newData.nodes && 
        newData.edges && 
        newData.nodes.length > 0 && 
        !graphInstance) {
      console.log('[G6Viewport] 数据已就绪，开始初始化')
      nextTick(() => {
        initGraph()
      })
    }
  },
  { immediate: true, deep: true }
)
</script>

<style scoped lang="scss">
.starchart-g6-viewport {
  width: 100%;
  height: 100%;
  background-color: #ffffff;  // 🔥 改为白色背景
  position: relative;
  overflow: hidden;
}
</style>

