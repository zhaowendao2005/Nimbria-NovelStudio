/**
 * StarChart Store - G6原生版
 * 直接管理G6格式数据，同心圆布局需要预计算坐标
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ViewportState } from './starChart.config.types'
import type { G6GraphData, DataSourceType } from './data/types'
import { dataSourceManager } from './data/DataSourceManager'
import { layoutManager } from './layouts/LayoutManager'
import { useStarChartConfigStore } from './starChart.config.store'

export const useStarChartStore = defineStore('projectPage-starChart', () => {
  // ==================== 状态 ====================
  
  // G6原生数据（直接用于渲染，无需转换）
  const graphData = ref<G6GraphData | null>(null)
  
  // 视口状态
  const viewportState = ref<ViewportState>({
    zoom: 1,
    pan: { x: 0, y: 0 }
  })
  
  // 加载和错误状态
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const initialized = ref<boolean>(false)
  
  // ==================== 计算属性 ====================
  
  const nodeCount = computed(() => graphData.value?.nodes?.length || 0)
  const edgeCount = computed(() => graphData.value?.edges?.length || 0)
  const hasData = computed(() => nodeCount.value > 0)
  
  // ==================== 方法 ====================
  
  /**
   * 初始化
   */
  const initialize = async () => {
    if (initialized.value) {
      console.log('[StarChart Store] 已初始化，跳过')
      return
    }
    
    loading.value = true
    error.value = null
    
    try {
      const configStore = useStarChartConfigStore()
      
      console.log('[StarChart Store] 开始初始化')
      
      // 1. 加载G6格式数据
      graphData.value = await dataSourceManager.loadData(configStore.dataSource)
      console.log(`[StarChart Store] 数据加载完成：${graphData.value.nodes.length} 节点，${graphData.value.edges.length} 边`)
      
      // 2. 如果是同心圆布局，预计算坐标
      if (configStore.currentLayoutType === 'concentric') {
        const layoutEngine = layoutManager.getLayout('concentric')
        layoutEngine.compute(graphData.value, configStore.layoutConfig)
        console.log('[StarChart Store] 同心圆布局坐标已计算')
      }
      
      initialized.value = true
      console.log('[StarChart Store] 初始化成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      console.error('[StarChart Store] 初始化失败:', err)
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 切换数据源
   */
  const switchDataSource = async (source: DataSourceType) => {
    loading.value = true
    
    try {
      const configStore = useStarChartConfigStore()
      configStore.setDataSource(source)
      
      console.log(`[StarChart Store] 切换数据源：${source}`)
      
      // 重新加载数据
      graphData.value = await dataSourceManager.loadData(source)
      console.log(`[StarChart Store] 数据加载完成：${graphData.value.nodes.length} 节点，${graphData.value.edges.length} 边`)
      
      // 如果是同心圆布局，重新计算坐标
      if (configStore.currentLayoutType === 'concentric') {
        const layoutEngine = layoutManager.getLayout('concentric')
        layoutEngine.compute(graphData.value, configStore.layoutConfig)
        console.log('[StarChart Store] 同心圆布局坐标已重新计算')
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      console.error('[StarChart Store] 切换数据源失败:', err)
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 切换布局
   */
  const switchLayout = async (layoutType: 'concentric' | 'compact-box') => {
    const configStore = useStarChartConfigStore()
    configStore.setLayoutType(layoutType)
    
    // 如果切换到同心圆，预计算坐标
    if (layoutType === 'concentric' && graphData.value) {
      const layoutEngine = layoutManager.getLayout('concentric')
      layoutEngine.compute(graphData.value, configStore.layoutConfig)
      console.log(`[StarChart Store] 切换到同心圆布局，坐标已计算`)
    } else {
      console.log(`[StarChart Store] 切换到紧凑树布局，由G6处理`)
    }
  }
  
  /**
   * 重新计算布局
   */
  const recomputeLayout = async () => {
    const configStore = useStarChartConfigStore()
    
    // 只有同心圆需要重新计算
    if (configStore.currentLayoutType === 'concentric' && graphData.value) {
      const layoutEngine = layoutManager.getLayout('concentric')
      layoutEngine.compute(graphData.value, configStore.layoutConfig)
      console.log('[StarChart Store] 同心圆布局已重新计算')
    }
  }
  
  /**
   * 更新视口状态
   */
  const updateViewport = (state: ViewportState) => {
    viewportState.value = state
  }
  
  /**
   * 选中节点
   */
  const selectNode = (nodeId: string) => {
    console.log(`[StarChart Store] 选中节点: ${nodeId}`)
  }
  
  /**
   * 重置
   */
  const reset = () => {
    graphData.value = null
    initialized.value = false
    loading.value = false
    error.value = null
  }
  
  return {
    // 状态
    graphData,
    viewportState,
    loading,
    error,
    initialized,
    
    // 计算属性
    nodeCount,
    edgeCount,
    hasData,
    
    // 方法
    initialize,
    switchDataSource,
    switchLayout,
    recomputeLayout,
    updateViewport,
    selectNode,
    reset
  }
})
