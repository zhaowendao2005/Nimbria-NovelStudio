<template>
  <div ref="containerRef" class="starchart-viewport"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, nextTick, computed } from 'vue'
import { Graph } from '@antv/g6'
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
 * StarChartViewport - 完全通用的图表渲染组件
 * 
 * 重构说明：
 * - 不再依赖任何特定插件类型或实现细节
 * - 插件的自定义元素（边、节点）由插件自己注册
 * - 插件的行为初始化由插件自己在 onGraphCreated 钩子中完成
 * - ViewPort 只负责容器管理、Graph 生命周期、数据加载和渲染
 */

// Stores
const starChartStore = useStarChartStore()
const configStore = useStarChartConfigStore()

// Refs
const containerRef = ref<HTMLDivElement>()
let graphInstance: Graph | null = null
let preloadedGraphInstance: Graph | null = null  // 预热的G6实例
let isInitializing = false  // 防止重复初始化
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let isPreloading = false  // 防止重复预热（用于调试）
let preloadingPromise: Promise<void> | null = null  // 预热过程的Promise

/**
 * 获取当前插件
 */
const currentPlugin = computed((): ILayoutPlugin | undefined => {
  const layoutName = configStore.layoutConfig.name
  // 映射布局名称到插件名称
  const pluginNameMap: Record<string, string> = {
    'multi-root-radial': 'multi-root-radial',
    'lazy-multi-root-radial': 'lazy-multi-root-radial',
    'compact-box': 'multi-root-radial',
    'concentric': 'concentric',
    'force-directed': 'force-directed'
  }
  
  const pluginName = pluginNameMap[layoutName] || 'multi-root-radial'
  const plugin = PluginRegistry.get(pluginName)
  
  console.log(`[StarChartViewport] 布局配置: layoutConfig.name="${layoutName}", currentLayoutType="${configStore.currentLayoutType}", 映射到插件="${pluginName}", 插件实例=${plugin ? '✅' : '❌'}`)
  
  return plugin
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
 * 预热 G6 实例（在空闲时间创建）
 * 🔥 完全通用化：不依赖任何特定插件
 * 支持并发调用，会等待同一个预热过程完成
 */
async function preloadGraphInstance() {
  // 如果已经有预热的实例，直接返回
  if (preloadedGraphInstance) {
    return
  }

  // 如果正在预热，等待预热完成
  if (preloadingPromise) {
    await preloadingPromise
    return
  }

  // 没有容器，无法创建实例
  if (!containerRef.value) {
    return
  }

  isPreloading = true
  console.log('[StarChartViewport] 🔥 开始预热 G6 实例...')
  
  // 创建预热Promise
  preloadingPromise = (async () => {
    try {
      await scheduleIdle(() => {
        // 获取当前插件
        const plugin = currentPlugin.value
        
        // 🔥 基础配置（通用）
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const baseConfig: any = {
          container: containerRef.value!,
          width: containerRef.value!.clientWidth,
          height: containerRef.value!.clientHeight,
          renderer: getRenderer(),
    layout: { type: 'preset' },
          data: { nodes: [], edges: [] },
          
          // 基础交互行为
    behaviors: [
      'drag-canvas',
      {
        type: 'zoom-canvas',
        key: 'zoom-canvas-behavior',
        sensitivity: configStore.config.interaction.wheelSensitivity,
              enableOptimize: true
            },
            'drag-element'
          ],
          
          autoFit: 'view' as const
        }
        
        // 🔥 合并插件特定配置
        if (plugin) {
          const pluginConfig = PluginRegistry.getMergedGraphConfig(plugin.name)
          Object.assign(baseConfig, pluginConfig)
          console.log(`[StarChartViewport] 📦 合并插件 ${plugin.name} 配置:`, pluginConfig)
        }
        
        // 创建实例
        preloadedGraphInstance = new Graph(baseConfig)
        
        // 🔥 通知插件系统 Graph 已创建（插件会自动注册自定义元素）
        PluginRegistry.setGraphInstance(preloadedGraphInstance, containerRef.value!)
        
        // 绑定通用事件
        preloadedGraphInstance.on('node:click', (evt) => {
          const evtObj = evt as unknown as Record<string, unknown>
          const itemId = evtObj.itemId
          if (itemId && typeof itemId === 'string') {
            starChartStore.selectNode(itemId)
          }
        })
        
        preloadedGraphInstance.on('viewportchange', (evt) => {
          const evtObj = evt as unknown as Record<string, unknown>
    starChartStore.updateViewport({
            zoom: (evtObj.zoom as number) || 1,
            pan: (evtObj.translate as { x: number; y: number }) || { x: 0, y: 0 }
          })
        })
      })
      
      console.log('[StarChartViewport] ✅ G6 实例预热完成')
    } catch (error) {
      console.error('[StarChartViewport] ❌ G6 实例预热失败:', error)
      preloadedGraphInstance = null
    } finally {
      isPreloading = false
      preloadingPromise = null
    }
  })()
  
  await preloadingPromise
}

/**
 * 推送主线程阶段进度
 */
function pushMainThreadStage(
  stage: 'g6-preload' | 'g6-data-load' | 'g6-render' | 'completed', 
  message: string, 
  overallProgress: number,
  details: Record<string, unknown> = {}
) {
  starChartStore.updateProgressState({
    type: 'progress',
    stage,
    stageProgress: { dataAdapt: 100, layoutCalc: 100, styleGen: 100 },
    overallProgress,
    message,
    details
  })
  console.log(`[StarChartViewport] 📊 主线程阶段: ${stage} - ${overallProgress}% - ${message}`)
}

/**
 * 一次性加载数据到 G6 实例（GPU 优化）
 */
async function loadDataOnce(
  graph: Graph,
  layoutResult: { nodes: unknown[]; edges: unknown[]; [key: string]: unknown },
  onProgress: () => void
) {
  const totalNodes = layoutResult.nodes.length
  const totalEdges = layoutResult.edges.length
  
  console.log(`[StarChartViewport] 📦 一次性加载数据：${totalNodes} 节点，${totalEdges} 边`)
  
  await scheduleIdle(() => {
    // 🔥 关键优化：使用 setData() 一次性加载所有数据
    // 这样 G6 内部会做批量优化，比循环 addData() 快得多
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph.setData(layoutResult as any)
  })
  
  onProgress()
  console.log(`[StarChartViewport] ✅ 数据加载完成：${totalNodes} 节点，${totalEdges} 边`)
}

/**
 * 单次渲染（让 GPU 全力工作）
 */
async function renderOnce(
  graph: Graph,
  onProgress: () => void
) {
  console.log(`[StarChartViewport] 🎬 开始渲染 (GPU 加速)`)
  
  // 🔥 关键优化：只调用一次 render()，让 WebGL GPU 连续工作
  // 不要循环调用，那样会打断 GPU 管线，反而更慢
  await scheduleIdle(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        void graph.render()
        onProgress()
        resolve()
      })
    })
  })
  
  console.log(`[StarChartViewport] ✅ 渲染完成`)
}

/**
 * 主线程管线：一次性加载数据并单次 GPU 渲染
 */
async function runMainThreadPipeline(
  layoutResult: { nodes: unknown[]; edges: unknown[]; [key: string]: unknown },
  performanceMetrics: InitProgressState['performanceMetrics']
) {
  console.log(`[StarChartViewport] 🚀 开始主线程管线`)
  
  // 确保有预热的实例，没有则创建
  if (!preloadedGraphInstance) {
    pushMainThreadStage('g6-preload', '正在预热 G6 实例...', 80)
    await preloadGraphInstance()
  }
  
  // 使用预热的实例
  graphInstance = preloadedGraphInstance
  preloadedGraphInstance = null  // 清空，下次重新预热
  
  if (!graphInstance) {
    throw new Error('G6 实例创建失败')
  }
  
  const totalNodes = layoutResult.nodes.length
  const totalEdges = layoutResult.edges.length
  
  // 阶段 1: 一次性加载数据
  pushMainThreadStage('g6-data-load', '正在加载数据...', 85)
  await loadDataOnce(
    graphInstance,
    layoutResult,
    () => {
      pushMainThreadStage('g6-data-load', '数据加载完成', 88, { 
        totalNodes, 
        totalEdges 
      })
    }
  )
  
  // 阶段 2: 单次 GPU 渲染
  pushMainThreadStage('g6-render', '正在渲染 (GPU 加速)...', 92)
  await renderOnce(
    graphInstance,
    () => {
      pushMainThreadStage('g6-render', '渲染完成', 96)
    }
  )
  
  // 阶段 3: 调用插件的后处理钩子（如果需要）
  // 🔥 新增：在渲染完成后，通知插件可以进行后处理（如初始化行为）
  const plugin = currentPlugin.value
  if (plugin && plugin.onGraphCreated && graphInstance && containerRef.value) {
    console.log('[StarChartViewport] 🎯 调用插件后处理钩子...')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await plugin.onGraphCreated(graphInstance as any, containerRef.value)
  }
  
  // 阶段 4: 标记完成
  pushMainThreadStage('completed', '初始化完成', 100)
  if (performanceMetrics) {
    starChartStore.completeInitialization(performanceMetrics)
  }
  
  console.log(`[StarChartViewport] ✅ 主线程管线完成`)
  console.log(`[StarChartViewport] 📊 最终节点数: ${totalNodes}，边数: ${totalEdges}`)
  
  // 注意：不在这里预热下一个实例，因为 new Graph() 是同步的会阻塞主线程
  // 预热已在 onMounted 时完成，后续需要时会自动创建
  // void preloadGraphInstance()
}

/**
 * 初始化图表
 * 🔥 完全通用化：不再有任何插件特定逻辑
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
    let performanceMetrics: InitProgressState['performanceMetrics'] | undefined
    
    // 检查是否支持优化初始化（Worker）
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
        rendererType: configStore.config.g6.renderer
        // ✅ webglOptimization 已清理
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _finalStyles = extractStylesFromData()
      
      console.log(`[StarChartViewport] ✅ Worker 计算完成！`)
      console.log(`[StarChartViewport] 📈 Worker耗时: ${workerTotalTime.toFixed(2)}ms`)
      console.log(`[StarChartViewport] 📊 详细指标:`, initResult.performanceMetrics)
      console.log(`[StarChartViewport] 🎯 主线程在此期间完全响应式，无阻塞！`)
      
      // 进入主线程管线（分批加载 + 分帧渲染）
      await runMainThreadPipeline(layoutResult as { nodes: unknown[]; edges: unknown[]; [key: string]: unknown }, performanceMetrics)
      
    } else {
      // 插件不支持优化初始化，降级到标准流程（简化版，直接使用管线）
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
      // 插件自己处理样式
      plugin.mergeStyles(data, pluginStyles)
      
      starChartStore.progressState.isInitializing = false
      starChartStore.progressState.currentProgress = 80
      
      // 同样使用管线
      await runMainThreadPipeline(layoutResult as { nodes: unknown[]; edges: unknown[]; [key: string]: unknown }, undefined)
    }
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
  
  // 预热 G6 实例（异步，不阻塞）
  void nextTick(() => {
    void preloadGraphInstance()
    void initGraph()
  })
})

onBeforeUnmount(() => {
  // 🔥 通知插件系统清理（插件会自动清理资源）
  void PluginRegistry.cleanup()
  
  // 清理预热状态
  preloadingPromise = null
  isPreloading = false
  
  // 清理 G6 实例
  if (graphInstance) {
    graphInstance.destroy()
    graphInstance = null
  }
  if (preloadedGraphInstance) {
    preloadedGraphInstance.destroy()
    preloadedGraphInstance = null
  }
  
  console.log('[StarChartViewport] ✅ 组件卸载，资源已清理')
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

