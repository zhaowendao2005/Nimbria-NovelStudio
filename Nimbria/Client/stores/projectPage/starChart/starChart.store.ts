/**
 * StarChart Store - 插件化版本
 * 管理图数据，布局由插件系统处理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ViewportState } from './config/types'
import type { G6GraphData, DataSourceType } from './data/types'
import { dataSourceManager } from './data/DataSourceManager'
import { useStarChartConfigStore } from './starChart.config.store'
import { InitProgressState, DEFAULT_INIT_PROGRESS_STATE } from './types/progress.types'
import type { InitializationProgressMessage } from '@service/starChart/types/worker.types'

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
  
  // 初始化进度状态（新增）
  const progressState = ref<InitProgressState>({ ...DEFAULT_INIT_PROGRESS_STATE })
  
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
      
      // 加载G6格式数据（布局由插件系统在视图层处理）
      graphData.value = await dataSourceManager.loadData(configStore.dataSource)
      console.log(`[StarChart Store] 数据加载完成：${graphData.value.nodes.length} 节点，${graphData.value.edges.length} 边`)
      
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
      
      // 重新加载数据（布局由插件系统处理）
      graphData.value = await dataSourceManager.loadData(source)
      console.log(`[StarChart Store] 数据加载完成：${graphData.value.nodes.length} 节点，${graphData.value.edges.length} 边`)
      
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      console.error('[StarChart Store] 切换数据源失败:', err)
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 切换布局（由插件系统处理）
   */
  const switchLayout = (layoutType: 'concentric' | 'compact-box') => {
    const configStore = useStarChartConfigStore()
    configStore.setLayoutType(layoutType)
    
    console.log(`[StarChart Store] 切换布局: ${layoutType}（由插件系统处理）`)
  }
  
  /**
   * 重新计算布局（现由插件系统处理，此方法保留用于触发视图更新）
   */
  const recomputeLayout = () => {
    // 布局计算现在由插件系统在视图层处理
    // 这里只需触发响应式更新
    if (graphData.value) {
      // 触发一个响应式更新
      graphData.value = { ...graphData.value }
      console.log('[StarChart Store] 触发布局重新计算（由插件系统处理）')
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
   * 更新进度状态（Worker 回调）
   */
  const updateProgressState = (message: InitializationProgressMessage) => {
    progressState.value = {
      ...progressState.value,
      isInitializing: true,
      currentStage: message.stage,
      currentStageLabel: getStageLabel(message.stage),
      currentProgress: message.overallProgress || 0,
      stageProgress: {
        dataAdapt: message.stageProgress.dataAdapt,
        layoutCalc: message.stageProgress.layoutCalc,
        styleGen: message.stageProgress.styleGen
      },
      details: {
        processedNodes: message.details.processedNodes || progressState.value.details.processedNodes,
        totalNodes: message.details.totalNodes || progressState.value.details.totalNodes,
        speed: message.details.speed || progressState.value.details.speed,
        elapsedTime: message.details.elapsedTime || progressState.value.details.elapsedTime,
        estimatedRemaining: message.details.estimatedRemaining || progressState.value.details.estimatedRemaining
      },
      error: message.error || null,
      errorStack: message.errorStack || undefined,
      canCancel: message.stage !== 'completed' && message.stage !== 'error'
    }
  }
  
  /**
   * 开始初始化（触发 Worker）
   */
  const startInitialization = (
    onComplete?: (layoutResult: unknown, performanceMetrics: unknown) => void,
    onError?: (errorMsg: string) => void
  ) => {
    console.log('[StarChart Store] 🚀 开始异步初始化（Worker）')
    
    // 重置进度状态
    progressState.value = { 
      ...DEFAULT_INIT_PROGRESS_STATE,
      isInitializing: true
    }
    
    // 这里只是占位，实际触发在 StarChartViewport
    // 因为需要容器尺寸等视图层信息
    console.log('[StarChart Store] 等待 Viewport 调用 InitializationManager')
  }
  
  /**
   * 完成初始化
   */
  const completeInitialization = (performanceMetrics: InitProgressState['performanceMetrics']) => {
    progressState.value = {
      ...progressState.value,
      isInitializing: false,
      currentProgress: 100,
      performanceMetrics: performanceMetrics || undefined
    }
    console.log('[StarChart Store] ✅ 初始化完成', performanceMetrics)
  }
  
  /**
   * 初始化失败
   */
  const failInitialization = (errorMsg: string, errorStack?: string) => {
    progressState.value = {
      ...progressState.value,
      isInitializing: false,
      error: errorMsg,
      errorStack: errorStack || undefined
    }
    console.error('[StarChart Store] ❌ 初始化失败:', errorMsg)
  }
  
  /**
   * 重置进度状态
   */
  const resetProgress = () => {
    progressState.value = { ...DEFAULT_INIT_PROGRESS_STATE }
  }
  
  /**
   * 获取阶段标签
   */
  const getStageLabel = (stage: string): string => {
    const labels: Record<string, string> = {
      'data-adapt': '数据适配',
      'layout-calc': '布局计算',
      'style-gen': '样式生成',
      'g6-preload': 'G6实例预热',
      'g6-data-load': '数据分批加载',
      'g6-render': '分帧渲染',
      'completed': '完成',
      'error': '错误'
    }
    return labels[stage] || stage
  }
  
  /**
   * 重置
   */
  const reset = () => {
    graphData.value = null
    initialized.value = false
    loading.value = false
    error.value = null
    resetProgress()
  }
  
  return {
    // 状态
    graphData,
    viewportState,
    loading,
    error,
    initialized,
    progressState,
    
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
    updateProgressState,
    startInitialization,
    completeInitialization,
    failInitialization,
    resetProgress,
    reset
  }
})
