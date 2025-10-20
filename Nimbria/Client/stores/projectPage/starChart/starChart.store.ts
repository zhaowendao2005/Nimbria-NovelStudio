/**
 * StarChart Store
 * 图数据可视化面板的状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  GraphData, 
  StarChartConfig, 
  ViewportState 
} from './starChart.types'
import { starChartMockData, defaultStarChartConfig } from './starChart.mock'

export const useStarChartStore = defineStore('projectPage-starChart', () => {
  // ==================== 状态 ====================
  
  /** 图数据 */
  const graphData = ref<GraphData | null>(null)
  
  /** 可视化配置 */
  const config = ref<StarChartConfig>(defaultStarChartConfig)
  
  /** 视口状态 */
  const viewport = ref<ViewportState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  })
  
  /** 加载状态 */
  const loading = ref<boolean>(false)
  
  /** 错误信息 */
  const error = ref<string | null>(null)
  
  /** 选中的节点ID */
  const selectedNodeIds = ref<Set<string>>(new Set())
  
  /** 选中的边ID */
  const selectedEdgeIds = ref<Set<string>>(new Set())
  
  // ==================== 计算属性 ====================
  
  /** 是否有数据 */
  const hasData = computed(() => {
    return graphData.value !== null && 
           graphData.value.nodes.length > 0
  })
  
  /** 节点数量 */
  const nodeCount = computed(() => {
    return graphData.value?.nodes.length || 0
  })
  
  /** 边数量 */
  const edgeCount = computed(() => {
    return graphData.value?.edges.length || 0
  })
  
  // ==================== 方法 ====================
  
  /**
   * 加载图数据（Mock版本）
   */
  const loadGraphData = async () => {
    loading.value = true
    error.value = null
    
    try {
      // 模拟异步加载
      await new Promise(resolve => setTimeout(resolve, 500))
      
      graphData.value = starChartMockData
      console.log('[StarChart Store] 图数据加载完成:', {
        nodes: nodeCount.value,
        edges: edgeCount.value
      })
    } catch (err) {
      error.value = `加载失败: ${err}`
      console.error('[StarChart Store] 加载错误:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 更新配置
   */
  const updateConfig = (newConfig: Partial<StarChartConfig>) => {
    config.value = { ...config.value, ...newConfig }
    console.log('[StarChart Store] 配置已更新:', config.value)
  }
  
  /**
   * 更新视口状态
   */
  const updateViewport = (newViewport: Partial<ViewportState>) => {
    viewport.value = { ...viewport.value, ...newViewport }
  }
  
  /**
   * 选中节点
   */
  const selectNode = (nodeId: string, multi = false) => {
    if (!multi) {
      selectedNodeIds.value.clear()
    }
    selectedNodeIds.value.add(nodeId)
  }
  
  /**
   * 取消选中节点
   */
  const deselectNode = (nodeId: string) => {
    selectedNodeIds.value.delete(nodeId)
  }
  
  /**
   * 清除所有选中
   */
  const clearSelection = () => {
    selectedNodeIds.value.clear()
    selectedEdgeIds.value.clear()
  }
  
  /**
   * 重置状态
   */
  const reset = () => {
    graphData.value = null
    config.value = defaultStarChartConfig
    viewport.value = {
      scale: 1,
      offsetX: 0,
      offsetY: 0
    }
    loading.value = false
    error.value = null
    clearSelection()
    console.log('[StarChart Store] 状态已重置')
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    graphData,
    config,
    viewport,
    loading,
    error,
    selectedNodeIds,
    selectedEdgeIds,
    
    // 计算属性
    hasData,
    nodeCount,
    edgeCount,
    
    // 方法
    loadGraphData,
    updateConfig,
    updateViewport,
    selectNode,
    deselectNode,
    clearSelection,
    reset
  }
})

