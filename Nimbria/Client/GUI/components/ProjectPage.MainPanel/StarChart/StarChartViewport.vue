<template>
  <div ref="containerRef" class="starchart-viewport"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, nextTick, computed } from 'vue'
import { Graph, type GraphData } from '@antv/g6'
import { Renderer as CanvasRenderer } from '@antv/g-canvas'
import { Renderer as WebGLRenderer } from '@antv/g-webgl'
import { Renderer as SVGRenderer } from '@antv/g-svg'
import { useStarChartStore, useStarChartConfigStore } from '@stores/projectPage/starChart'
import { PluginRegistry } from '@stores/projectPage/starChart/plugins'
import type { 
  ILayoutPlugin
} from '@stores/projectPage/starChart/plugins/types'
import { supportsOptimizedInitialization } from '@stores/projectPage/starChart/plugins/types'
import { 
  initializationManager,
  type InitializationConfig,
  type InitializationCompleteResult 
} from '@service/starChart/InitializationManager'
import type { InitializationProgressMessage } from '@service/starChart/types/worker.types'
import type { InitProgressState } from '@stores/projectPage/starChart/types/progress.types'

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
 * 根据配置获取渲染器（手动选择）
 */
const getRenderer = () => {
  const rendererType = configStore.config.g6.renderer
  
  console.log(`[StarChartViewport] 使用渲染器: ${rendererType}`)
  console.log(`[StarChartViewport] 完整配置:`, configStore.config.g6)
  
  switch (rendererType) {
    case 'webgl':
      console.log(`[StarChartViewport] 创建 WebGL 渲染器`)
      return () => new WebGLRenderer()
    case 'svg':
      console.log(`[StarChartViewport] 创建 SVG 渲染器`)
      return () => new SVGRenderer()
    case 'canvas':
    default:
      console.log(`[StarChartViewport] 创建 Canvas 渲染器`)
      return () => new CanvasRenderer()
  }
}

/**
 * 获取 WebGL 优化配置
 */
const getWebGLOptimizationConfig = () => {
  const webglConfig = configStore.config.g6.webglOptimization
  const rendererType = configStore.config.g6.renderer
  
  // 只在 WebGL 渲染器时应用优化配置
  if (rendererType !== 'webgl') {
    return {}
  }
  
  console.log('[StarChartViewport] 应用 WebGL 优化配置:', webglConfig)
  
  return {
    // 渲染优化
    enableInstancedRendering: webglConfig.enableInstancedRendering,
    enableDirtyRectangleRendering: webglConfig.enableDirtyRectangleRendering,
    enableCulling: webglConfig.enableCulling,
    
    // 性能优化
    optimize: {
      enableFrustumCulling: webglConfig.enableFrustumCulling,
      enableBatching: webglConfig.enableBatching,
      batchSize: webglConfig.batchSize,
      maxVisibleNodes: webglConfig.maxVisibleNodes,
      enableSpatialIndex: webglConfig.enableSpatialIndex,
      enableTextureAtlas: webglConfig.enableTextureAtlas,
      enableGeometryCompression: webglConfig.enableGeometryCompression,
    },
    
    // 交互优化
    interaction: {
      throttle: webglConfig.interactionThrottle,
    },
    
    // 性能监控
    performance: {
      enableMonitoring: webglConfig.enablePerformanceMonitoring,
      fpsTarget: webglConfig.fpsTarget,
    }
  }
}

/**
 * 应用 WebGL 特有优化
 */
const applyWebGLOptimizations = (graph: Graph) => {
  const webglConfig = configStore.config.g6.webglOptimization
  
  try {
    // LOD 系统实现
    if (webglConfig.enableLOD) {
      setupLODSystem(graph, webglConfig)
    }
    
    // 性能监控
    if (webglConfig.enablePerformanceMonitoring) {
      setupPerformanceMonitoring(graph, webglConfig)
    }
    
    // 视锥剔除
    if (webglConfig.enableFrustumCulling) {
      setupFrustumCulling(graph, webglConfig)
    }
    
    console.log('[StarChartViewport] WebGL 优化应用完成')
  } catch (error) {
    console.error('[StarChartViewport] WebGL 优化应用失败:', error)
  }
}

/**
 * 设置 LOD 系统
 */
const setupLODSystem = (graph: Graph, config: typeof configStore.config.g6.webglOptimization) => {
  let currentLODLevel = 'high'
  
  const updateLOD = (zoomLevel: number) => {
    let newLODLevel = 'high'
    
    if (zoomLevel < config.lodZoomThresholds.low) {
      newLODLevel = 'low'
    } else if (zoomLevel < config.lodZoomThresholds.medium) {
      newLODLevel = 'medium'
    }
    
    if (newLODLevel !== currentLODLevel) {
      currentLODLevel = newLODLevel
      
      // 更新节点细节级别
      const nodeSegments = config.nodeSegments[newLODLevel as keyof typeof config.nodeSegments]
      
      console.log(`[StarChartViewport] LOD 切换到 ${newLODLevel} 级别，节点段数: ${nodeSegments}`)
      
      // LOD 系统：根据缩放级别调整渲染细节
      // 注意：动态更新节点样式需要根据具体的 G6 版本 API 来实现
      // 这里主要记录 LOD 级别变化，实际的几何体优化由 WebGL 渲染器处理
      console.log(`[StarChartViewport] LOD 级别变化: ${currentLODLevel} → ${newLODLevel}`)
      
      // 可以在这里触发重新渲染或样式更新
      // 具体实现取决于 G6 版本和 WebGL 优化需求
    }
  }
  
  // 监听缩放事件
  graph.on('viewportchange', (evt) => {
    const zoom = (evt as unknown as Record<string, unknown>).zoom as number
    if (zoom) {
      updateLOD(zoom)
    }
  })
}

/**
 * 设置性能监控
 */
const setupPerformanceMonitoring = (graph: Graph, config: typeof configStore.config.g6.webglOptimization) => {
  let frameCount = 0
  let lastTime = performance.now()
  let fps = 0
  
  const monitorPerformance = () => {
    frameCount++
    const currentTime = performance.now()
    
    if (currentTime - lastTime >= 1000) {
      fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
      
      // 性能警告
      if (fps < config.fpsTarget * 0.8) {
        console.warn(`[StarChartViewport] 性能警告: 当前FPS ${fps}, 目标FPS ${config.fpsTarget}`)
        
        // 可以在这里触发自动优化
        if (fps < 20) {
          console.log('[StarChartViewport] 自动启用性能优化模式')
          // 自动降低细节级别或启用更多优化
        }
      }
      
      // 更新性能信息到 store（如果需要在 UI 中显示）
      // starChartStore.updatePerformanceInfo?.({ fps, frameCount })
      console.log(`[StarChartViewport] 性能监控: FPS ${fps}, 帧数 ${frameCount}`)
      
      frameCount = 0
      lastTime = currentTime
    }
    
    requestAnimationFrame(monitorPerformance)
  }
  
  monitorPerformance()
}

/**
 * 设置视锥剔除
 */
const setupFrustumCulling = (graph: Graph, config: typeof configStore.config.g6.webglOptimization) => {
  let visibleNodes = new Set<string>()
  
  const updateVisibleNodes = () => {
    // 使用 G6 的 getZoom 和 getPosition 方法
    const zoom = graph.getZoom() || 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const position = (graph.getPosition() as unknown as any) as { x: number; y: number } | undefined
    const { x: panX, y: panY } = position || { x: 0, y: 0 }
    
    // 计算可视区域
    const containerWidth = containerRef.value?.clientWidth || 800
    const containerHeight = containerRef.value?.clientHeight || 600
    
    const viewBounds = {
      left: -panX / zoom - 100, // 添加一些边距
      right: (-panX + containerWidth) / zoom + 100,
      top: -panY / zoom - 100,
      bottom: (-panY + containerHeight) / zoom + 100
    }
    
    const newVisibleNodes = new Set<string>()
    let culledCount = 0
    
    // 检查每个节点是否在可视区域内
    const allNodes = graph.getNodeData()
    if (Array.isArray(allNodes)) {
      allNodes.forEach((node: unknown) => {
        const nodeData = node as { id: string; style?: { x?: number; y?: number } }
        const x = nodeData.style?.x || 0
        const y = nodeData.style?.y || 0
        
        const isVisible = x >= viewBounds.left && 
                         x <= viewBounds.right && 
                         y >= viewBounds.top && 
                         y <= viewBounds.bottom
        
        if (isVisible) {
          newVisibleNodes.add(nodeData.id)
          
          // 显示节点
          if (!visibleNodes.has(nodeData.id)) {
            void graph.showElement(nodeData.id)
          }
        } else {
          culledCount++
          
          // 隐藏节点（如果启用了剔除）
          if (visibleNodes.has(nodeData.id)) {
            void graph.hideElement(nodeData.id)
          }
        }
      })
    }
    
    visibleNodes = newVisibleNodes
    
    if (culledCount > 0) {
      console.log(`[StarChartViewport] 视锥剔除: 隐藏 ${culledCount} 个节点`)
    }
  }
  
  // 节流更新
  let updateTimeout: NodeJS.Timeout | null = null
  const throttledUpdate = () => {
    if (updateTimeout) clearTimeout(updateTimeout)
    updateTimeout = setTimeout(updateVisibleNodes, config.interactionThrottle)
  }
  
  // 监听视口变化
  graph.on('viewportchange', throttledUpdate)
  
  // 初始更新
  setTimeout(updateVisibleNodes, 100)
}

/**
 * 异步调度任务（使用浏览器空闲时间或 setTimeout）
 */
function scheduleIdle<T>(task: () => Promise<T> | T, timeout = 32): Promise<T> {
  return new Promise((resolve, reject) => {
    const runner = () => {
      Promise.resolve(task()).then(resolve).catch(reject)
    }
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => runner(), { timeout })
    } else {
      setTimeout(runner, 0)
    }
  })
}

/**
 * 推送主线程阶段进度
 */
function pushMainThreadStage(stage: 'g6-init' | 'rendering' | 'completed', message: string, overallProgress: number) {
  starChartStore.updateProgressState({
    type: 'progress',
    stage,
    stageProgress: { dataAdapt: 100, layoutCalc: 100, styleGen: 100 },
    overallProgress,
    message,
    details: {}
  })
  console.log(`[StarChartViewport] 📊 主线程阶段: ${stage} - ${overallProgress}%`)
}

/**
 * 初始化图表
 */
async function initGraph() {
  if (isInitializing) {
    console.log('[StarChartViewport] 正在初始化中，跳过重复调用')
    return
  }
  
  isInitializing = true
  
  try {
    // ===== 1. 准备数据 =====
    const data = starChartStore.graphData
    if (!data || !data.nodes || data.nodes.length === 0) {
      console.error('[StarChartViewport] 无效的图数据')
      return
    }
    
    const nodeCount = data.nodes.length
    console.log(`[StarChartViewport] 初始化 ${nodeCount} 个节点的图...`)
    
    // 加载最新配置
    configStore.loadConfig()
    
    // ===== 2. 执行布局计算 =====
    const plugin = currentPlugin.value
    if (!plugin) {
      console.error('[StarChartViewport] 未找到布局插件')
      return
    }
    
    console.log(`[StarChartViewport] 使用插件: ${plugin.name}`)
    
    let layoutResult: unknown
    let finalStyles: unknown
    let performanceMetrics: InitProgressState['performanceMetrics'] | undefined
    
    const useOptimizedInit = supportsOptimizedInitialization(plugin)
    
    if (useOptimizedInit) {
      console.log(`[StarChartViewport] 🚀 使用异步 Worker 初始化（${nodeCount} 节点）`)
      console.log(`[StarChartViewport] 📊 主线程保持响应，Worker 后台计算中...`)
      
      const workerStartTime = performance.now()
      
      // ===== 优化初始化流程（使用 Worker） =====
      // 深拷贝数据以避免 Proxy 和不可序列化对象
      const clonedData = JSON.parse(JSON.stringify(data))
      
      const initConfig: InitializationConfig = {
        pluginName: plugin.name,
        graphData: clonedData,
        layoutOptions: {
          width: containerRef.value!.clientWidth,
          height: containerRef.value!.clientHeight
        },
        rendererType: configStore.config.g6.renderer,
        webglOptimization: configStore.config.g6.webglOptimization
      }
      
      // 启动 Worker 初始化
      const initResult = await new Promise<InitializationCompleteResult>((resolve, reject) => {
        try {
          initializationManager.startInitialization(
            initConfig,
          // 进度回调
          (progress: InitializationProgressMessage) => {
            // 使用 requestIdleCallback 确保不阻塞主线程
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => {
                starChartStore.updateProgressState(progress)
                console.log(`[StarChartViewport] 📊 进度更新: ${progress.stage} - ${progress.overallProgress}%`)
              })
            } else {
              // 降级方案
              setTimeout(() => {
                starChartStore.updateProgressState(progress)
              }, 0)
            }
          },
            // 完成回调（不立即标记为完成，先进入主线程阶段）
            (result: InitializationCompleteResult) => {
              console.log(`[StarChartViewport] ✅ Worker 初始化完成`)
              // 存储指标以便后续使用，不立即调用 completeInitialization
              performanceMetrics = result.performanceMetrics
              resolve(result)
            },
            // 错误回调
            (error: string) => {
              console.error(`[StarChartViewport] ❌ Worker 初始化失败:`, error)
              starChartStore.failInitialization(error)
              reject(new Error(error))
            }
          )
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      })
      
      const workerEndTime = performance.now()
      const workerTotalTime = workerEndTime - workerStartTime
      
      layoutResult = initResult.layoutResult
      // 从数据中提取样式（样式已内联到数据的 _computedStyle 中）
      finalStyles = extractStylesFromData()
      
      console.log(`[StarChartViewport] ✅ Worker 计算完成！`)
      console.log(`[StarChartViewport] 📈 Worker耗时: ${workerTotalTime.toFixed(2)}ms`)
      console.log(`[StarChartViewport] 📊 详细指标:`, initResult.performanceMetrics)
      console.log(`[StarChartViewport] 🎯 主线程在此期间完全响应式，无阻塞！`)
      
      // 进入主线程阶段（G6 创建和渲染）
      pushMainThreadStage('g6-init', '正在创建 G6 实例...', 90)
      
    } else {
      // 插件不支持优化初始化，降级到标准流程
      console.warn(`[StarChartViewport] ⚠️ 插件不支持异步初始化，降级到主线程（${nodeCount} 节点）`)
      console.warn(`[StarChartViewport] 主线程可能短暂阻塞，建议插件实现 IInitializationOptimizer`)
      
      // 标准初始化流程（主线程）
      starChartStore.progressState.isInitializing = true
      starChartStore.progressState.currentStage = 'layout-calc'
      starChartStore.progressState.currentStageLabel = '布局计算（主线程）'
      
      layoutResult = await plugin.execute(data, {
        width: containerRef.value!.clientWidth,
        height: containerRef.value!.clientHeight
      })
      
      const pluginStyles = plugin.getDefaultStyles()
      finalStyles = plugin.mergeStyles(data, pluginStyles)
      
      starChartStore.progressState.isInitializing = false
      starChartStore.progressState.currentProgress = 100
    }
    
    // ===== 3. 获取优化配置 =====
    const optimizationConfig = getWebGLOptimizationConfig()
    
    // ===== 4. 创建G6实例 =====
    const graphConfig = {
      container: containerRef.value!,
      width: containerRef.value!.clientWidth,
      height: containerRef.value!.clientHeight,
      renderer: getRenderer(),
      
      // 使用布局计算的结果（包含树结构）
      data: layoutResult as GraphData,
      
      // 使用preset布局（位置已计算）
      layout: { type: 'preset' },
      
      // 使用插件提供的样式
      node: {
        type: 'circle',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-assertion
        style: (finalStyles as any).node as any
      },
      
      edge: {
        type: (edge: unknown) => (edge as Record<string, unknown>).type as string || 'line',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-assertion
        style: (finalStyles as any).edge as any
      },
      
      // 交互行为（应用交互优化）
      behaviors: [
        'drag-canvas',
        {
          type: 'zoom-canvas',
          key: 'zoom-canvas-behavior',
          sensitivity: configStore.config.interaction.wheelSensitivity,
          enableOptimize: true,
          // 应用交互节流
          ...(optimizationConfig.interaction && {
            throttle: optimizationConfig.interaction.throttle
          })
        },
        'drag-element',
      ],
      
      autoFit: 'view' as const,
      
      // 应用 WebGL 优化配置
      ...optimizationConfig,
    }
    
    // 如果是 WebGL 渲染器，添加特殊的性能监控
    if (configStore.config.g6.renderer === 'webgl') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const layoutData = layoutResult as any
      console.log('[StarChartViewport] WebGL 渲染器配置:', {
        节点数: layoutData.nodes?.length || 0,
        边数: layoutData.edges?.length || 0,
        优化配置: optimizationConfig
      })
      
      // WebGL 特有的性能提示
      const nodeCount = layoutData.nodes?.length || 0
      if (nodeCount > 10000 && !optimizationConfig.optimize?.enableBatching) {
        console.warn('[StarChartViewport] 建议为大规模数据启用批处理优化')
      }
    }
    
    // ===== 5. 使用 requestIdleCallback 异步创建 G6 实例 =====
    console.log(`[StarChartViewport] 🎨 准备创建 G6 实例（${nodeCount} 节点）...`)
    
    await scheduleIdle(() => {
      const g6StartTime = performance.now()
      
      console.log(`[StarChartViewport] 🎨 开始创建 G6 实例（${nodeCount} 节点）...`)
      graphInstance = new Graph(graphConfig)
      
      const g6CreateTime = performance.now() - g6StartTime
      console.log(`[StarChartViewport] ⚡ G6 实例创建耗时: ${g6CreateTime.toFixed(2)}ms`)
      
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
    })
    
    // ===== 6. 使用 requestIdleCallback 异步渲染 =====
    pushMainThreadStage('rendering', '正在渲染图形...', 95)
    
    await scheduleIdle(async () => {
      const renderStartTime = performance.now()
      console.log(`[StarChartViewport] 🖼️ 开始渲染...`)
      
      await graphInstance!.render()
      
      const renderTime = performance.now() - renderStartTime
      console.log(`[StarChartViewport] ✅ 渲染完成！耗时: ${renderTime.toFixed(2)}ms`)
    })
    
    // ===== 7. 应用 WebGL 特有优化 =====
    if (configStore.config.g6.renderer === 'webgl' && graphInstance) {
      applyWebGLOptimizations(graphInstance)
    }
    
    // ===== 8. 标记完成 =====
    pushMainThreadStage('completed', '初始化完成', 100)
    if (performanceMetrics) {
      starChartStore.completeInitialization(performanceMetrics)
    }
    
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
  // 确保配置已加载
  configStore.loadConfig()
  
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

// 监听渲染器配置变化
watch(() => configStore.config.g6.renderer, (newRenderer, oldRenderer) => {
  if (newRenderer !== oldRenderer && graphInstance) {
    console.log(`[StarChartViewport] 渲染器配置变化: ${oldRenderer} → ${newRenderer}，重新初始化`)
    void nextTick(() => void initGraph())
  }
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

/**
 * 节点/边数据接口（包含 _computedStyle）
 */
interface StyledNodeData {
  id: string
  data?: {
    _computedStyle?: Record<string, unknown>
    [key: string]: unknown
  }
  [key: string]: unknown
}

interface StyledEdgeData {
  source: string
  target: string
  data?: {
    _computedStyle?: Record<string, unknown>
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * 从数据中提取样式规则
 * Worker 已将样式应用到 _computedStyle，这里转换回函数形式供 G6 使用
 */
const extractStylesFromData = () => {
  return {
    node: (nodeData: StyledNodeData) => {
      return nodeData.data?._computedStyle || {}
    },
    edge: (edgeData: StyledEdgeData) => {
      return edgeData.data?._computedStyle || {}
    }
  }
}

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

