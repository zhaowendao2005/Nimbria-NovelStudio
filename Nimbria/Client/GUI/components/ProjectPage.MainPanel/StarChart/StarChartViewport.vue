<template>
  <template v-if="configStore.renderEngine === 'g6'">
    <G6Viewport
      :key="configStore.renderEngine"
      :g6-data="g6ElementsToPass"
      :layout="props.layout"
      :wheel-sensitivity="props.wheelSensitivity ?? 0.2"
      :fast-rebuild="props.fastRebuild"
      @viewport-change="handleViewportChange"
      @node-selected="handleNodeSelected"
      @render-complete="handleRenderComplete"
    />
  </template>
  <template v-else>
    <CytoscapeViewport
      :key="configStore.renderEngine"
      :elements="cytoElementsToPass"
      :layout="props.layout"
      :wheel-sensitivity="props.wheelSensitivity ?? 0.2"
      :fast-rebuild="props.fastRebuild"
      @viewport-change="handleViewportChange"
      @node-selected="handleNodeSelected"
      @render-complete="handleRenderComplete"
    />
  </template>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useStarChartStore, useStarChartConfigStore } from '@stores/projectPage/starChart'
import type { LayoutConfig } from '@stores/projectPage/starChart/layouts/types'
import type { ViewportState, CytoscapeElement } from '@stores/projectPage/starChart'
import type { G6Data } from '@stores/projectPage/starChart/transforms/G6Transformer'

/**
 * Props
 */
const props = defineProps<{
  layout: LayoutConfig
  wheelSensitivity?: number
  fastRebuild?: boolean
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  'viewport-change': [state: ViewportState]
  'node-selected': [nodeId: string]
  'render-complete': []
}>()

// Store
const starChartStore = useStarChartStore()
const configStore = useStarChartConfigStore()

// 懒加载视口组件
const CytoscapeViewport = defineAsyncComponent(
  () => import('./viewports/StarChartViewport.Cytoscape.vue')
)
const G6Viewport = defineAsyncComponent(
  () => import('./viewports/StarChartViewport.G6.vue')
)

// 当前渲染引擎日志（初始化时）
console.log('[StarChartViewport] 当前渲染引擎：', configStore.renderEngine)

// 分离两种需要传递的数据，避免联合类型造成 TS 报错
const g6ElementsToPass = computed<G6Data>(() => {
  const data = starChartStore.g6Data || { nodes: [], edges: [] }
  return data as G6Data
})

const cytoElementsToPass = computed<CytoscapeElement[]>(() => {
  return (starChartStore.cytoscapeElements || []) as CytoscapeElement[]
})

/**
 * 事件处理：统一不同引擎的事件
 */
const handleViewportChange = (state: ViewportState) => {
  emit('viewport-change', state)
}

const handleNodeSelected = (nodeId: string) => {
  emit('node-selected', nodeId)
}

const handleRenderComplete = () => {
  emit('render-complete')
}
</script>

<style scoped lang="scss">
// 容器组件不需要样式，样式由子组件处理
</style>
