/**
 * StarChart Store
 * 负责为 Vue 组件提供响应式数据
 * 重构版本：数据与布局分离
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ViewportState } from './starChart.types'
import type { CytoscapeElement } from './starChart.types'
import type { RawGraphData, LayoutedNode, DataSourceType } from './data/types'
import type { LayoutType } from './layouts/types'
import { dataSourceManager } from './data/DataSourceManager'
import { layoutManager } from './layouts/LayoutManager'
import { CytoscapeTransformer } from './transforms/CytoscapeTransformer'
import { useStarChartConfigStore } from './starChart.config.store'

export const useStarChartStore = defineStore('projectPage-starChart', () => {
  // ==================== 状态 ====================
  
  // 🆕 原始数据（无位置）
  const rawGraphData = ref<RawGraphData | null>(null)
  
  // 🆕 布局后的节点（带位置）
  const layoutedNodes = ref<LayoutedNode[]>([])
  
  // Cytoscape元素（用于渲染）
  const cytoscapeElements = ref<CytoscapeElement[]>([])
  
  // 视口状态
  const viewportState = ref<ViewportState>({
    zoom: 1,
    pan: { x: 0, y: 0 }
  })
  
  // 加载和错误状态
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const initialized = ref<boolean>(false)
  const fastRebuild = ref<boolean>(false)  // 🚀 快速重建模式标志
  
  // ==================== 计算属性 ====================
  
  const hasData = computed(() => rawGraphData.value !== null)
  const nodeCount = computed(() => rawGraphData.value?.nodes.length || 0)
  const edgeCount = computed(() => rawGraphData.value?.edges.length || 0)
  
  // ==================== 方法 ====================
  
  /**
   * 初始化：加载数据 + 应用布局
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
      
      // 1. 加载原始数据
      rawGraphData.value = await dataSourceManager.loadData(configStore.dataSource)
      console.log(`[StarChart Store] 数据加载完成：${rawGraphData.value.nodes.length} 节点，${rawGraphData.value.edges.length} 边`)
      
      // 2. 应用布局
      await applyLayout()
      
      initialized.value = true
      console.log('[StarChart Store] 初始化成功')
    } catch (err) {
      error.value = err instanceof Error ? err.message : '初始化失败'
      console.error('[StarChart Store] 初始化失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 应用布局（计算位置 + 转换格式）
   */
  const applyLayout = async () => {
    if (!rawGraphData.value) {
      console.warn('[StarChart Store] 无数据，跳过布局')
      return
    }
    
    const configStore = useStarChartConfigStore()
    const layoutEngine = layoutManager.getLayout(configStore.currentLayoutType)
    
    console.log(`[StarChart Store] 应用布局：${configStore.currentLayoutType}`)
    
    // 计算布局
    layoutedNodes.value = layoutEngine.compute(rawGraphData.value, configStore.layoutConfig)
    console.log(`[StarChart Store] 布局计算完成：${layoutedNodes.value.length} 个节点`)
    
    // 转换为Cytoscape格式
    const transformer = new CytoscapeTransformer()
    cytoscapeElements.value = transformer.transform(
      layoutedNodes.value,
      rawGraphData.value.edges,
      configStore.config,
      layoutEngine.needsCytoscapeCompute()
    )
    console.log(`[StarChart Store] Cytoscape格式转换完成：${cytoscapeElements.value.length} 个元素`)
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
      rawGraphData.value = await dataSourceManager.loadData(source)
      console.log(`[StarChart Store] 数据加载完成：${rawGraphData.value.nodes.length} 节点，${rawGraphData.value.edges.length} 边`)
      
      // 重新应用布局
      await applyLayout()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '切换数据源失败'
      console.error('[StarChart Store] 切换数据源失败:', err)
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 切换布局
   */
  const switchLayout = async (layoutType: LayoutType) => {
    if (!rawGraphData.value) {
      console.warn('[StarChart Store] 无数据，无法切换布局')
      return
    }
    
    const configStore = useStarChartConfigStore()
    configStore.setLayoutType(layoutType)
    
    console.log(`[StarChart Store] 切换布局：${layoutType}`)
    
    // 重新应用布局
    await applyLayout()
  }
  
  /**
   * 重新计算布局（配置变更时）
   */
  const recomputeLayout = async () => {
    console.log('[StarChart Store] 重新计算布局')
    await applyLayout()
  }
  
  /**
   * 添加节点
   */
  const addNode = async (node: RawGraphData['nodes'][0]) => {
    try {
      const configStore = useStarChartConfigStore()
      await dataSourceManager.addNode(configStore.dataSource, node)
      
      if (rawGraphData.value) {
        rawGraphData.value.nodes.push(node)
        await applyLayout()
      }
      return true
    } catch (err) {
      console.error('[StarChart Store] 添加节点失败:', err)
      return false
    }
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
    rawGraphData.value = null
    layoutedNodes.value = []
    cytoscapeElements.value = []
    initialized.value = false
    loading.value = false
    error.value = null
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    rawGraphData,
    layoutedNodes,
    cytoscapeElements,
    viewportState,
    loading,
    error,
    initialized,
    fastRebuild,
    
    // 计算属性
    hasData,
    nodeCount,
    edgeCount,
    
    // 方法
    initialize,
    applyLayout,
    switchDataSource,
    switchLayout,
    recomputeLayout,
    addNode,
    updateViewport,
    reset
  }
})
