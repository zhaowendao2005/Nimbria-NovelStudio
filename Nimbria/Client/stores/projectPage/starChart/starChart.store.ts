/**
 * StarChart Store
 * 负责为 Vue 组件提供响应式数据
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StarChartGraphData, LayoutConfig, ViewportState, StarChartNode } from './starChart.types'
import { starChartDataSource } from './DataSource'
import { convertToCytoscapeFormat } from './data.mock'
import type { CytoscapeElement } from './starChart.types'

export const useStarChartStore = defineStore('projectPage-starChart', () => {
  // ==================== 状态 ====================
  
  const graphData = ref<StarChartGraphData | null>(null)
  const cytoscapeElements = ref<CytoscapeElement[]>([])
  const layoutConfig = ref<LayoutConfig>({
    name: 'fcose',
    nodeRepulsion: 4500,
    idealEdgeLength: 1,
    animate: true,
    randomize: false
  })
  const viewportState = ref<ViewportState>({
    zoom: 1,
    pan: { x: 0, y: 0 }
  })
  
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const initialized = ref<boolean>(false)
  
  // ==================== 计算属性 ====================
  
  const hasData = computed(() => graphData.value !== null)
  const nodeCount = computed(() => graphData.value?.nodes.length || 0)
  const edgeCount = computed(() => graphData.value?.edges.length || 0)
  
  // ==================== 方法 ====================
  
  /**
   * 初始化：加载图数据
   */
  const initialize = async () => {
    if (initialized.value) {
      console.log('[StarChart Store] 已初始化，跳过')
      return
    }

    loading.value = true
    error.value = null
    
    try {
      const data = await starChartDataSource.loadGraphData()
      graphData.value = data
      cytoscapeElements.value = convertToCytoscapeFormat(data)
      initialized.value = true
      
      console.log('[StarChart Store] 初始化成功:', {
        nodes: data.nodes.length,
        edges: data.edges.length
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '初始化失败'
      error.value = errorMsg
      console.error('[StarChart Store] 初始化失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 添加节点
   */
  const addNode = async (node: StarChartNode) => {
    try {
      const success = await starChartDataSource.addNode(node)
      if (success && graphData.value) {
        graphData.value.nodes.push(node)
        cytoscapeElements.value = convertToCytoscapeFormat(graphData.value)
      }
      return success
    } catch (err) {
      console.error('[StarChart Store] 添加节点失败:', err)
      return false
    }
  }
  
  /**
   * 更新布局配置
   */
  const updateLayout = (config: Partial<LayoutConfig>) => {
    layoutConfig.value = { ...layoutConfig.value, ...config }
  }
  
  /**
   * 更新视口状态
   */
  const updateViewport = (state: Partial<ViewportState>) => {
    viewportState.value = { ...viewportState.value, ...state }
  }
  
  /**
   * 重置
   */
  const reset = () => {
    graphData.value = null
    cytoscapeElements.value = []
    initialized.value = false
    loading.value = false
    error.value = null
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    graphData,
    cytoscapeElements,
    layoutConfig,
    viewportState,
    loading,
    error,
    initialized,
    
    // 计算属性
    hasData,
    nodeCount,
    edgeCount,
    
    // 方法
    initialize,
    addNode,
    updateLayout,
    updateViewport,
    reset
  }
})

