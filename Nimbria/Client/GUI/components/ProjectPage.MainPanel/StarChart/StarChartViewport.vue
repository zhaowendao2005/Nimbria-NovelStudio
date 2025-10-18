<template>
  <div ref="containerRef" class="starchart-viewport"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, nextTick } from 'vue'
import { Graph, treeToGraphData, register, ExtensionCategory } from '@antv/g6'
import { Renderer as CanvasRenderer } from '@antv/g-canvas'
import { useStarChartStore, useStarChartConfigStore } from '@stores/projectPage/starChart'

// 直接导入布局类并手动注册
import { MultiRootRadialLayout } from '@stores/projectPage/starChart/layouts/MultiRootRadialLayout'

// 注册自定义布局
register(ExtensionCategory.LAYOUT, 'multi-root-radial', MultiRootRadialLayout)

/**
 * StarChartViewport.vue - G6原生版本
 * 使用标准G6 v5 API，直接渲染图表
 */

// Stores
const starChartStore = useStarChartStore()
const configStore = useStarChartConfigStore()

// Refs
const containerRef = ref<HTMLDivElement>()
let graphInstance: Graph | null = null

/**
 * 初始化G6图实例
 */
const initGraph = () => {
  const data = starChartStore.graphData
  const layout = configStore.layoutConfig
  
  if (!containerRef.value || !data?.nodes?.length) {
    console.log('[StarChartViewport] 初始化跳过：容器或数据未就绪')
    return
  }

  console.log(`[StarChartViewport] 初始化 G6: ${data.nodes.length} 节点，${data.edges.length} 边`)

  // 销毁旧实例
  if (graphInstance) {
    graphInstance.destroy()
    graphInstance = null
  }

  // 准备数据：对于compact-box布局使用树数据，否则使用图数据
  let graphData: any = data
  
  if (layout.name === 'compact-box' && (data as any)?.treesData) {
    // 多树数据：将每棵树转换后合并
    const treesData = (data as any).treesData as any[]
    const rootIds = (data as any).rootIds as string[]
    
    const allNodes: any[] = []
    const allEdges: any[] = []
    
    treesData.forEach((tree) => {
      const converted = treeToGraphData(tree)
      allNodes.push(...converted.nodes)
      allEdges.push(...converted.edges)
    })
    
    graphData = {
      nodes: allNodes,
      edges: allEdges,
      rootIds: rootIds
    }
  }

  // 创建G6实例
  graphInstance = new Graph({
    container: containerRef.value,
    width: containerRef.value.clientWidth,
    height: containerRef.value.clientHeight,

    // 🔑 渲染器选择（使用Canvas渲染器）
    renderer: () => new CanvasRenderer(),

    // 🔑 数据
    data: graphData,

    // 🔑 布局配置
    layout: (() => {
      if (layout.name === 'concentric') {
        return { type: 'preset' }
      } else if (graphData.rootIds?.length > 1) {
        return {
          type: 'multi-root-radial',
          width: containerRef.value.clientWidth,
          height: containerRef.value.clientHeight,
          rootIds: graphData.rootIds
    }
  } else {
        return {
          type: 'compact-box',
          radial: true,
          direction: 'RL',
          getId: (d: any) => d.id,
          getHeight: () => 32,
          getWidth: () => 32,
          getVGap: () => 40,
          getHGap: () => 80,
          preLayout: false
        }
      }
    })(),

    // 🔑 节点配置（使用circle类型，暂时简化）
    node: {
      type: 'circle',
      style: {
        size: 20,
        fill: '#5B8FF9',
        stroke: '#5B8FF9',
        lineWidth: 2,
      },
    },

    // 🔑 边配置
    edge: layout.name === 'concentric'
      ? {
          type: 'line',
          style: {
            lineWidth: 1,
            opacity: 0.6,
            stroke: '#e2e2e2',
          },
        }
      : {
          type: 'cubic-radial',  // 径向树专用边类型
          style: {
            lineWidth: 2,
            opacity: 0.6,
            stroke: '#99a9bf',
          },
        },

    // 🔑 交互行为
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

    // 自适应视图
    autoFit: 'view',
  })

  // 🔑 事件绑定
  graphInstance.on('node:click', (evt: any) => {
    starChartStore.selectNode(evt.itemId)
    console.log(`[StarChartViewport] 节点选中: ${evt.itemId}`)
  })

  graphInstance.on('viewportchange', (evt: any) => {
    starChartStore.updateViewport({
      zoom: evt.zoom || 1,
      pan: evt.translate || { x: 0, y: 0 }
    })
  })

  // 渲染
  graphInstance.render()
  
  // 设置滚轮灵敏度
  setupBehaviors()
  
  console.log('[StarChartViewport] G6 初始化完成')
}

/**
 * 配置交互行为（更新滚轮灵敏度）
 */
const setupBehaviors = () => {
  if (!graphInstance) return

  const sensitivity = configStore.config.interaction.wheelSensitivity

  try {
    graphInstance.updateBehavior({
      key: 'zoom-canvas-behavior',
      sensitivity: sensitivity,
      enableOptimize: true,
    })
    console.log(`[StarChartViewport] 滚轮灵敏度已更新: ${sensitivity}`)
  } catch (error) {
    console.warn('[StarChartViewport] 更新滚轮灵敏度失败:', error)
  }
}

// 节流函数
let sensitivityTimeout: ReturnType<typeof setTimeout> | null = null
const updateSensitivityThrottled = () => {
  if (sensitivityTimeout) {
    clearTimeout(sensitivityTimeout)
  }
  sensitivityTimeout = setTimeout(() => {
    setupBehaviors()
  }, 300)
}

/**
 * 更新数据
 */
const updateData = (newData: G6GraphData) => {
  if (!graphInstance || !newData?.nodes?.length) return

  console.log(`[StarChartViewport] 更新数据: ${newData.nodes.length} 节点`)
  graphInstance.setData(newData)
  graphInstance.render()
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
watch(() => starChartStore.graphData, (newData) => {
  if (newData && newData.nodes.length > 0) {
    if (graphInstance) {
      updateData(newData)
    } else {
      nextTick(initGraph)
    }
  }
}, { deep: true })

// 监听布局变化
watch(() => configStore.layoutConfig, () => {
  if (graphInstance) {
    graphInstance.destroy()
    nextTick(initGraph)
  }
})

// 监听滚轮灵敏度变化（节流处理）
watch(() => configStore.config.interaction.wheelSensitivity, () => {
  updateSensitivityThrottled()
})

// 监听渲染器变化
watch(() => configStore.config.g6.renderer, () => {
  if (graphInstance) {
    graphInstance.destroy()
    nextTick(initGraph)
  }
})

// 监听点击激活配置变化
watch(() => [
  configStore.config.interaction.enableClickActivate,
  configStore.config.interaction.activateDegree
], () => {
  if (graphInstance) {
    graphInstance.destroy()
    nextTick(initGraph)
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
