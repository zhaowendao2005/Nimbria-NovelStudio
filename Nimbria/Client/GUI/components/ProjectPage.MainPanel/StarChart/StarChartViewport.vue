<template>
  <div ref="containerRef" class="starchart-viewport"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, nextTick, computed } from 'vue'
import { Graph } from '@antv/g6'
import { Renderer as CanvasRenderer } from '@antv/g-canvas'
import { useStarChartStore, useStarChartConfigStore } from '@stores/projectPage/starChart'
import { PluginRegistry } from '@stores/projectPage/starChart/plugins'

/**
 * StarChartViewport - 插件化版本
 * 使用插件系统，极大简化组件逻辑
 */

// Stores
const starChartStore = useStarChartStore()
const configStore = useStarChartConfigStore()

// Refs
const containerRef = ref<HTMLDivElement>()
let graphInstance: Graph | null = null

/**
 * 获取当前插件
 */
const currentPlugin = computed(() => {
  const layoutName = configStore.layoutConfig.name
  // 映射布局名称到插件名称
  const pluginNameMap: Record<string, string> = {
    'compact-box': 'multi-root-radial',
    'concentric': 'concentric',
    'force-directed': 'force-directed'
  }
  
  const pluginName = pluginNameMap[layoutName] || 'multi-root-radial'
  return PluginRegistry.get(pluginName)
})

/**
 * 初始化G6图实例
 */
const initGraph = async () => {
  const data = starChartStore.graphData
  const layout = configStore.layoutConfig
  const plugin = currentPlugin.value
  
  if (!containerRef.value || !data?.nodes?.length) {
    console.log('[StarChartViewport] 初始化跳过：容器或数据未就绪')
    return
  }

  if (!plugin) {
    console.error(`[StarChartViewport] 未找到插件: ${layout.name}`)
    return
  }
  
  console.log(`[StarChartViewport] 使用插件: ${plugin.displayName}`)

  // 销毁旧实例
  if (graphInstance) {
    graphInstance.destroy()
    graphInstance = null
  }
  
  // ===== 1. 数据适配 =====
  let adaptedData = data
  const adapter = plugin.createDataAdapter()
  
  if (adapter) {
    if (Array.isArray(adapter)) {
      // 多个适配器
      for (const a of adapter) {
        adaptedData = await a.adapt(adaptedData)
    }
  } else {
      // 单个适配器
      adaptedData = await adapter.adapt(adaptedData)
    }
  }
  
  // ===== 2. 执行布局计算 =====
  const layoutResult = await plugin.execute(adaptedData, {
    width: containerRef.value.clientWidth,
    height: containerRef.value.clientHeight,
    rootIds: adaptedData.rootIds
  })
  
  // ===== 3. 获取样式规则 =====
  const pluginStyles = plugin.getDefaultStyles()
  const finalStyles = plugin.mergeStyles(adaptedData, pluginStyles)
  
  // ===== 4. 创建G6实例 =====
  const graphConfig: any = {
    container: containerRef.value,
    width: containerRef.value.clientWidth,
    height: containerRef.value.clientWidth,
    renderer: () => new CanvasRenderer(),
    
    // 使用布局计算的结果（包含树结构）
    data: layoutResult,
    
    // 使用preset布局（位置已计算）
    layout: { type: 'preset' },
    
    // 使用插件提供的样式
    node: {
      type: 'circle',
      style: finalStyles.node
    },
    
    edge: {
      type: (edge: any) => edge.type || 'line',
      style: finalStyles.edge
    },
    
    // 交互行为
    behaviors: [
      'drag-canvas',
      {
        type: 'zoom-canvas',
        key: 'zoom-canvas-behavior',
        sensitivity: configStore.config.interaction.wheelSensitivity,
        enableOptimize: true,
      },
      'drag-element',
    ],
    
    autoFit: 'view',
  }
  
  graphInstance = new Graph(graphConfig)
  
  // 事件绑定
  graphInstance.on('node:click', (evt: any) => {
    starChartStore.selectNode(evt.itemId)
  })
  
  graphInstance.on('viewportchange', (evt: any) => {
    starChartStore.updateViewport({
      zoom: evt.zoom || 1,
      pan: evt.translate || { x: 0, y: 0 }
    })
  })
  
  // 渲染
  graphInstance.render()
  
  console.log('[StarChartViewport] G6 初始化完成')
}

/**
 * 调整画布大小
 */
const resize = () => {
  if (!graphInstance || !containerRef.value) return
  
  const { clientWidth, clientHeight } = containerRef.value
  graphInstance.setSize(clientWidth, clientHeight)
}

// 生命周期
onMounted(() => {
  nextTick(() => {
    initGraph()
  })
})

onBeforeUnmount(() => {
  if (graphInstance) {
    graphInstance.destroy()
    graphInstance = null
  }
})

// 监听数据变化
watch(() => starChartStore.graphData, () => {
  if (starChartStore.graphData?.nodes?.length > 0) {
    nextTick(initGraph)
  }
}, { deep: true })

// 监听布局变化
watch(() => configStore.layoutConfig, () => {
  nextTick(initGraph)
})

// 监听滚轮灵敏度变化
watch(() => configStore.config.interaction.wheelSensitivity, () => {
  if (graphInstance) {
    graphInstance.updateBehavior({
      key: 'zoom-canvas-behavior',
      sensitivity: configStore.config.interaction.wheelSensitivity,
      enableOptimize: true,
    })
  }
})

// 暴露方法
defineExpose({
  resize,
  getInstance: () => graphInstance,
})
</script>

<style scoped lang="scss">
.starchart-viewport {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #ffffff;
  border-radius: 4px;
  overflow: hidden;
}
</style>

