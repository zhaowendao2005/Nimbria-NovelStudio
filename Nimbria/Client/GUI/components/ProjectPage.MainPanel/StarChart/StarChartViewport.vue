<template>
  <div ref="containerRef" class="starchart-viewport"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, nextTick, computed } from 'vue'
import { Graph, type GraphData } from '@antv/g6'
import { Renderer as CanvasRenderer } from '@antv/g-canvas'
import { useStarChartStore, useStarChartConfigStore } from '@stores/projectPage/starChart'
import { PluginRegistry } from '@stores/projectPage/starChart/plugins'
import type { 
  ILayoutPlugin
} from '@stores/projectPage/starChart/plugins/types'

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
let isInitializing = false  // 防止重复初始化

/**
 * 获取当前插件
 */
const currentPlugin = computed((): ILayoutPlugin | undefined => {
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
  // 防止重复初始化
  if (isInitializing) {
    console.log('[StarChartViewport] 正在初始化中，跳过重复调用')
    return
  }
  
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
  
  // 设置初始化标志
  isInitializing = true

  try {
    // 销毁旧实例
    if (graphInstance) {
      console.log('[StarChartViewport] 销毁旧的图实例')
      graphInstance.destroy()
      graphInstance = null
    }
    
    // ===== 1. 执行布局计算（插件内部处理数据适配） =====
    const layoutResult = await plugin.execute(data, {
      width: containerRef.value.clientWidth,
      height: containerRef.value.clientHeight
    })
    
    // ===== 2. 获取样式规则 =====
    const pluginStyles = plugin.getDefaultStyles()
    const finalStyles = plugin.mergeStyles(data, pluginStyles)
    
    // ===== 3. 创建G6实例 =====
    graphInstance = new Graph({
      container: containerRef.value,
      width: containerRef.value.clientWidth,
      height: containerRef.value.clientWidth,
      renderer: () => new CanvasRenderer(),
      
      // 使用布局计算的结果（包含树结构）
      data: layoutResult as unknown as GraphData,
      
      // 使用preset布局（位置已计算）
      layout: { type: 'preset' },
      
      // 使用插件提供的样式
      node: {
        type: 'circle',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style: finalStyles.node as any
      },
      
      edge: {
        type: (edge) => (edge as Record<string, unknown>).type as string || 'line',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style: finalStyles.edge as any
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
    })
    
    // 事件绑定
    graphInstance.on('node:click', (evt) => {
      const evtObj = evt as unknown as Record<string, unknown>
      const itemId = evtObj.itemId
      if (itemId && typeof itemId === 'string') {
        starChartStore.selectNode(itemId)
      }
    })
    
    graphInstance.on('viewportchange', (evt) => {
      const evtObj = evt as unknown as Record<string, unknown>
      starChartStore.updateViewport({
        zoom: (evtObj.zoom as number) || 1,
        pan: (evtObj.translate as { x: number; y: number }) || { x: 0, y: 0 }
      })
    })
    
    // 渲染
    await graphInstance.render()
    
    console.log('[StarChartViewport] G6 初始化完成')
  } catch (error) {
    console.error('[StarChartViewport] 初始化失败:', error)
  } finally {
    // 无论成功失败都重置标志
    isInitializing = false
  }
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
  void nextTick(() => {
    void initGraph()
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
  if (starChartStore.graphData?.nodes && starChartStore.graphData.nodes.length > 0) {
    void nextTick(() => void initGraph())
  }
}, { deep: true })

// 监听布局变化
watch(() => configStore.layoutConfig, () => {
  void nextTick(() => void initGraph())
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

