<template>
  <div ref="containerRef" class="starchart-viewport"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import cytoscape from 'cytoscape'
// @ts-ignore - cytoscape-fcose 没有类型定义
import fcose from 'cytoscape-fcose'
import type { CytoscapeElement, LayoutConfig, ViewportState } from '@stores/projectPage/starChart/starChart.types'
import { useStarChartConfigStore } from '@stores/projectPage/starChart'

// 注册 fcose 布局 (WebGL是内置的，不需要额外注册)
cytoscape.use(fcose)

const props = defineProps<{
  elements: CytoscapeElement[]
  layout: LayoutConfig
  wheelSensitivity?: number  // 滚轮灵敏度
}>()

const emit = defineEmits<{
  'viewport-change': [state: ViewportState]
}>()

// 使用配置store
const configStore = useStarChartConfigStore()

const containerRef = ref<HTMLElement | null>(null)
let cyInstance: cytoscape.Core | null = null
let highlightActive = false

// 🔥 修复longFrameCount作用域问题 - 提升到模块级别
let longFrameCount = 0

// 初始化配置
configStore.loadConfig()

// 🔥 性能优化：节流和防抖工具函数
const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout
  return function(this: any, ...args: any[]) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

// 🔥 LOD (Level of Detail) 渲染状态
let currentZoom = 1
let lodLevel = 'high' // 'low' | 'medium' | 'high'

// 初始化 Cytoscape
const initCytoscape = () => {
  if (!containerRef.value) {
    configStore.log('[StarChartViewport] 容器不存在', 'minimal')
    return
  }

  // 🔥 获取当前配置
  const config = configStore.config
  
  // 🔥 如果已存在实例，先销毁
  if (cyInstance) {
    if (config.logging.enableInitializationLogs) {
      configStore.log('[StarChartViewport] 销毁旧的 Cytoscape 实例')
    }
    cyInstance.destroy()
    cyInstance = null
  }

  if (config.logging.enableInitializationLogs) {
    configStore.log('[StarChartViewport] 🚀 初始化 Cytoscape (WebGL GPU加速模式)', 'verbose')
    configStore.log(`[StarChartViewport] 元素数量: ${props.elements.length}`, 'verbose')
    configStore.log(`[StarChartViewport] WebGL配置: 纹理${config.webgl.texSize}x${config.webgl.texSize}, 批处理${config.webgl.batchSize}`, 'verbose')
  }
  
  // 🔥 调试：检查节点是否有预设位置
  const nodesWithPosition = props.elements.filter((el: any) => el.group === 'nodes' && el.position)
  if (config.logging.enableInitializationLogs) {
    configStore.log(`[StarChartViewport] 有预设位置的节点数: ${nodesWithPosition.length}`, 'verbose')
    if (nodesWithPosition.length > 0 && nodesWithPosition[0]) {
      configStore.log(`[StarChartViewport] 第一个节点位置示例: ${JSON.stringify(nodesWithPosition[0].position)}`, 'verbose')
    }
  }

  cyInstance = cytoscape({
    container: containerRef.value,
    elements: props.elements,
    style: getCytoscapeStyle() as any,
    layout: { 
      name: 'preset',
      fit: config.layout.firstTimeAutoFit,
      padding: 80,
      animate: config.layout.animate,
      randomize: config.layout.randomize
    },
    
    // 🔥 使用配置store的实例配置
    ...configStore.cytoscapeInstanceConfig,
    
    // 🔥 覆盖wheelSensitivity（如果props有提供）
    wheelSensitivity: props.wheelSensitivity || config.interaction.wheelSensitivity,
    
    // 用户交互
    userZoomingEnabled: true,
    userPanningEnabled: true,
    
    ready: () => {
      if (config.logging.enableInitializationLogs) {
        configStore.log('[StarChart] 🚀 Cytoscape WebGL实例就绪！')
        if (config.webgl.enabled) {
          configStore.log('[StarChart] GPU加速已启用，节点纹理缓存生成中...')
          configStore.log('[StarChart] 预期性能提升: 400节点+2500边 → 60+ FPS')
        }
      }
    },
    
    // 🔥 使用配置store的渲染器配置
    renderer: configStore.cytoscapeRendererConfig as any
  })

  if (config.logging.enableInitializationLogs) {
    configStore.log('[StarChartViewport] Cytoscape 实例创建成功')
    configStore.log(`[StarChartViewport] 节点数: ${cyInstance.nodes().length}`)
    configStore.log(`[StarChartViewport] 边数: ${cyInstance.edges().length}`)
  }

  // 🔥 节流优化的视口变化监听
  const throttledViewportChange = throttle(() => {
    const startTime = performance.now()
    if (cyInstance) {
      currentZoom = cyInstance.zoom()
      emit('viewport-change', {
        zoom: currentZoom,
        pan: cyInstance.pan()
      })
      const endTime = performance.now()
      if (config.logging.enableEventTracking) {
        configStore.log(`📊 [事件跟踪] 视口变化: ${(endTime - startTime).toFixed(2)}ms, 缩放: ${currentZoom.toFixed(2)}`)
      }
    }
  }, config.throttle.viewportChange) // 使用配置的节流时间

  cyInstance.on('zoom pan', throttledViewportChange)

  // 🔥 根据配置决定是否启用详细跟踪
  if (config.performance.detailedEventTracking) {
    setupDetailedEventTracking()
  }

  // 添加邻域高亮功能
  setupNeighborhoodHighlight()

  // 🔥 根据配置决定是否启用性能监控
  if (config.performance.enabled || import.meta.env.DEV) {
    setupPerformanceMonitoring()
  }

  // 运行布局
  runLayout(config.layout.firstTimeAutoFit)
}

// 🔥 详细的事件耗时跟踪系统
const setupDetailedEventTracking = () => {
  if (!cyInstance) return

  const config = configStore.config
  
  if (config.logging.enableEventTracking) {
    configStore.log('🔍 [事件跟踪] 启动详细事件监控系统')
  }

  // 🔥 拖动事件详细跟踪
  let dragEventCount = 0
  let dragStartPos = { x: 0, y: 0 }
  
  cyInstance.on('grab', 'node', (event) => {
    const startTime = performance.now()
    dragStartPos = event.position || event.renderedPosition
    configStore.performanceMark('starchart-grab-start')
    if (config.logging.enableEventTracking) {
      configStore.log(`🟡 [事件跟踪] 节点抓取开始: ${event.target.data('name')}`)
    }
  })

  cyInstance.on('drag', 'node', (event) => {
    const startTime = performance.now()
    dragEventCount++
    
    if (config.logging.enableEventTracking && dragEventCount % 5 === 0) {
      const currentPos = event.position || event.renderedPosition
      const distance = Math.sqrt(
        Math.pow(currentPos.x - dragStartPos.x, 2) + 
        Math.pow(currentPos.y - dragStartPos.y, 2)
      )
      const endTime = performance.now()
      configStore.log(`🔵 [事件跟踪] 拖动第${dragEventCount}帧: ${(endTime - startTime).toFixed(2)}ms, 距离: ${distance.toFixed(1)}px`)
    }
  })

  cyInstance.on('free', 'node', (event) => {
    const startTime = performance.now()
    configStore.performanceMark('starchart-grab-end')
    configStore.performanceMeasure('starchart-grab-duration', 'starchart-grab-start', 'starchart-grab-end')
    
    const endTime = performance.now()
    if (config.logging.enableEventTracking) {
      configStore.log(`🟢 [事件跟踪] 节点释放完成: ${(endTime - startTime).toFixed(2)}ms, 总拖动帧数: ${dragEventCount}`)
    }
    dragEventCount = 0
  })

  // 🔥 缩放事件跟踪
  let zoomEventCount = 0
  cyInstance.on('zoom', (event) => {
    const startTime = performance.now()
    zoomEventCount++
    
    if (zoomEventCount % 3 === 0) { // 每3次缩放输出一次
      const zoom = event.cy.zoom()
      const endTime = performance.now()
      console.log(`🔍 [事件跟踪] 缩放事件${zoomEventCount}: ${(endTime - startTime).toFixed(2)}ms, 级别: ${zoom.toFixed(3)}`)
    }
  })

  // 🔥 平移事件跟踪
  let panEventCount = 0
  cyInstance.on('pan', (event) => {
    const startTime = performance.now()
    panEventCount++
    
    if (panEventCount % 5 === 0) { // 每5次平移输出一次
      const pan = event.cy.pan()
      const endTime = performance.now()
      console.log(`↔️ [事件跟踪] 平移事件${panEventCount}: ${(endTime - startTime).toFixed(2)}ms, 位置: (${pan.x.toFixed(1)}, ${pan.y.toFixed(1)})`)
    }
  })

  // 🔥 点击事件跟踪
  cyInstance.on('tap', 'node', (event) => {
    const startTime = performance.now()
    const nodeName = event.target.data('name')
    const endTime = performance.now()
    console.log(`🎯 [事件跟踪] 节点点击: ${(endTime - startTime).toFixed(2)}ms, 节点: ${nodeName}`)
  })

  cyInstance.on('tap', (event) => {
    if (event.target === cyInstance) {
      const startTime = performance.now()
      const endTime = performance.now()
      console.log(`🎯 [事件跟踪] 背景点击: ${(endTime - startTime).toFixed(2)}ms`)
    }
  })

  // 🔥 渲染事件跟踪（节流优化，避免过度监控）
  let renderCount = 0
  let renderTimeAccumulator = 0
  const throttledRenderTracking = throttle(() => {
    renderCount++
    console.log(`🎨 [事件跟踪] 渲染批次${Math.ceil(renderCount/5)}: 最近5次渲染`)
  }, 200) // 200ms节流
  
  cyInstance.on('render', () => {
    const startTime = performance.now()
    renderTimeAccumulator += startTime
    throttledRenderTracking()
  })

  // 🔥 布局事件跟踪
  cyInstance.on('layoutstart', (event) => {
    performance.mark('starchart-layout-start')
    console.log(`📐 [事件跟踪] 布局开始: ${event.layout.options.name}`)
  })

  cyInstance.on('layoutstop', (event) => {
    performance.mark('starchart-layout-end')
    performance.measure('starchart-layout-duration', 'starchart-layout-start', 'starchart-layout-end')
    console.log(`📐 [事件跟踪] 布局完成: ${event.layout.options.name}`)
  })

  // 🔥 样式更新事件跟踪（节流优化，避免日志爆炸）
  let styleUpdateCount = 0
  const throttledStyleUpdate = throttle(() => {
    const startTime = performance.now()
    styleUpdateCount++
    const endTime = performance.now()
    console.log(`💅 [事件跟踪] 样式更新批次${Math.ceil(styleUpdateCount/10)}: 最近10次更新耗时 ${(endTime - startTime).toFixed(2)}ms`)
  }, 100) // 100ms节流，减少日志量
  
  cyInstance.on('style', throttledStyleUpdate)

  // 🔥 视口事件跟踪（大幅减少日志频率）
  let viewportUpdateCount = 0
  const throttledViewportTracking = throttle(() => {
    const startTime = performance.now()
    const zoom = cyInstance.zoom()
    const pan = cyInstance.pan()
    const endTime = performance.now()
    viewportUpdateCount++
    console.log(`🖼️ [事件跟踪] 视口更新批次${Math.ceil(viewportUpdateCount/20)}: ${(endTime - startTime).toFixed(2)}ms, 缩放: ${zoom.toFixed(3)}, 平移: (${pan.x.toFixed(1)}, ${pan.y.toFixed(1)})`)
  }, 500) // 500ms节流，大幅减少日志
  
  cyInstance.on('viewport', throttledViewportTracking)

  // 🔥 定期输出性能总结
  let performanceSummaryInterval: NodeJS.Timeout
  
  const outputPerformanceSummary = () => {
    console.group('📊 [事件跟踪] 性能总结 (过去30秒)')
    console.log(`├── 拖动事件: ${dragEventCount} 帧`)
    console.log(`├── 缩放事件: ${zoomEventCount} 次`)
    console.log(`├── 平移事件: ${panEventCount} 次`)
    console.log(`├── 样式更新: ${styleUpdateCount} 次`)
    console.log(`├── 渲染事件: ${renderCount} 次`)
    console.log(`├── 视口更新: ${viewportUpdateCount} 次`) 
    console.log(`├── 长帧检测: ${longFrameCount || 0} 个`)
    console.log(`├── 当前缩放: ${cyInstance?.zoom().toFixed(3) || '未知'}`)
    console.log(`└── 邻域高亮: ${highlightActive ? '激活' : '未激活'}`)
    
    // 🔥 性能警告检测
    if (styleUpdateCount > 100) {
      console.warn(`⚠️ [性能警告] 样式更新过频繁: ${styleUpdateCount}次/30秒 (建议<50次)`)
    }
    if (renderCount > 100) {
      console.warn(`⚠️ [性能警告] 渲染过频繁: ${renderCount}次/30秒 (建议<60次)`)
    }
    if (viewportUpdateCount > 200) {
      console.warn(`⚠️ [性能警告] 视口更新过频繁: ${viewportUpdateCount}次/30秒 (建议<100次)`)
    }
    if ((longFrameCount || 0) > 5) {
      console.warn(`⚠️ [性能警告] 长帧过多: ${longFrameCount}个/30秒 (建议<3个)`)
    }
    
    console.groupEnd()
    
    // 重置计数器
    dragEventCount = 0
    zoomEventCount = 0
    panEventCount = 0
    styleUpdateCount = 0
    renderCount = 0
    viewportUpdateCount = 0
  }

  if (import.meta.env.DEV) {
    performanceSummaryInterval = setInterval(outputPerformanceSummary, 30000) // 每30秒输出一次总结
    ;(window as any).starChartPerformanceSummaryInterval = performanceSummaryInterval
    
    // 🔥 添加全局函数供用户手动调用
    ;(window as any).StarChart性能总结 = outputPerformanceSummary
    ;(window as any).StarChart性能总结.toString = () => '调用此函数查看StarChart性能总结'
  }

  console.log('✅ [事件跟踪] 事件监控系统已启动 (已优化日志频率)')
  console.log('📊 [事件跟踪] 每30秒自动输出性能总结')
  console.log('🔧 [事件跟踪] 手动查看性能总结: 在控制台输入 StarChart性能总结()')
  
  // 🔥 性能优化说明
  console.group('⚡ [性能优化] 重要更新')
  console.log('🚀 已应用极端性能优化配置:')
  console.log('  ├── 样式更新监控已节流 (100ms)')
  console.log('  ├── 渲染事件监控已节流 (200ms)')
  console.log('  ├── 视口更新监控已节流 (500ms)')
  console.log('  ├── Cytoscape渲染器优化')
  console.log('  └── 大数据集专用配置')
  console.log('')
  console.log('📊 现在的事件跟踪类型:')
  console.log('🟡 节点抓取 → 🔵 拖动帧 → 🟢 节点释放')
  console.log('💅 样式更新批次 (每10次统计)')
  console.log('🎨 渲染批次 (每5次统计)')
  console.log('🖼️ 视口更新批次 (每20次统计)')
  console.log('⭐ 邻域高亮 (详细步骤耗时)')
  console.log('🚀 性能拖动监控 (每10帧分析)')
  console.log('🐌 长帧检测 (>50ms)')
  console.log('⚠️ 性能警告 (自动检测异常)')
  console.log('')
  console.log('💡 提示: 如果控制台日志太多，请按 Ctrl+L 清空控制台')
  console.groupEnd()
}

// 🔥 LOD (Level of Detail) 渲染优化 - 已注释用于性能测试
// const updateLOD = (zoom: number) => {
//   if (!cyInstance) return
  
//   const newLodLevel = zoom < 0.3 ? 'low' : zoom < 1.0 ? 'medium' : 'high'
  
//   // 只在LOD级别真正改变时才更新
//   if (newLodLevel === lodLevel) return
  
//   // 🔥 DevTools Performance 标记：LOD更新开始
//   performance.mark(`starchart-lod-${newLodLevel}-start`)
  
//   lodLevel = newLodLevel
//   console.log('[StarChartViewport] LOD 级别变更:', lodLevel, 'zoom:', zoom.toFixed(2))
//   console.log(`🔥 [Performance] LOD更新开始: ${lodLevel} - 在DevTools中查找 "starchart-lod-${lodLevel}-start" 标记`)
  
//   cyInstance.batch(() => {
//     const nodes = cyInstance!.nodes()
//     const edges = cyInstance!.edges()
    
//     if (lodLevel === 'low') {
//       // 🔥 远视图：隐藏边，简化节点标签
//       edges.style('display', 'none')
//       nodes.style({
//         'content': '',  // 隐藏标签
//         'text-outline-width': '0px',
//         'font-size': '0px'
//       })
//     } else if (lodLevel === 'medium') {
//       // 🔥 中视图：显示主要边，部分标签
//       edges.style('display', 'element')
//       edges.filter('[weight < 0.3]').style('display', 'none')  // 隐藏弱边
      
//       // 🔥 分别处理重要节点和普通节点，避免动态函数
//       const importantNodes = nodes.filter((node: any) => (node.data('score') || 0) > 0.7)
//       const normalNodes = nodes.filter((node: any) => (node.data('score') || 0) <= 0.7)
      
//       importantNodes.style({
//         'content': 'data(name)',
//         'font-size': '10px',
//         'text-outline-width': '1px'
//       })
      
//       normalNodes.style({
//         'content': '',
//         'font-size': '0px',
//         'text-outline-width': '0px'
//       })
//     } else {
//       // 🔥 近视图：显示所有细节
//       edges.style('display', 'element')
//       nodes.style({
//         'content': 'data(name)',
//         'font-size': '12px',
//         'text-outline-width': '2px'
//       })
//     }
//   })
  
//   // 🔥 DevTools Performance 标记：LOD更新结束
//   performance.mark(`starchart-lod-${lodLevel}-end`)
//   performance.measure(`starchart-lod-${lodLevel}-duration`, `starchart-lod-${lodLevel}-start`, `starchart-lod-${lodLevel}-end`)
//   console.log(`🔥 [Performance] LOD更新完成: ${lodLevel} - 在DevTools中查找 "starchart-lod-${lodLevel}-duration" 测量`)
// }

// 🔥 优化后的邻域高亮功能（节流 + 批量更新）
const setupNeighborhoodHighlight = () => {
  if (!cyInstance) return

  // 🔥 节流优化的节点高亮（避免快速连续点击造成性能问题）
  const throttledNodeHighlight = throttle((selectedNode: any) => {
    const overallStartTime = performance.now()
    
    // 🔥 DevTools Performance 标记：高亮开始
    performance.mark('starchart-highlight-start')
    console.log(`⭐ [事件跟踪] 邻域高亮开始: ${selectedNode.data('name')}`)
    
    // 计算邻域
    const neighborhoodStartTime = performance.now()
    const firstDegree = selectedNode.neighborhood()
    const firstDegreeNodes = firstDegree.nodes()
    const secondDegree = firstDegreeNodes.neighborhood().difference(firstDegree)
    const neighborhoodEndTime = performance.now()
    console.log(`   └── 邻域计算: ${(neighborhoodEndTime - neighborhoodStartTime).toFixed(2)}ms, 一度邻居: ${firstDegreeNodes.length}, 二度邻居: ${secondDegree.nodes().length}`)
    
    // 批量样式更新
    const batchStartTime = performance.now()
    cyInstance!.batch(() => {
      // 所有元素变灰
      cyInstance!.elements().addClass('dimmed')
      
      // 高亮选中节点
      selectedNode.removeClass('dimmed').addClass('highlighted')
      
      // 高亮一度邻居
      firstDegree.removeClass('dimmed').addClass('first-degree')
      firstDegree.edges().addClass('highlighted')
      
      // 二度邻居半透明
      secondDegree.nodes().removeClass('dimmed').addClass('second-degree')
    })
    const batchEndTime = performance.now()
    console.log(`   └── 批量样式更新: ${(batchEndTime - batchStartTime).toFixed(2)}ms`)
    
    // 🔥 DevTools Performance 标记：高亮结束
    performance.mark('starchart-highlight-end')
    performance.measure('starchart-highlight-duration', 'starchart-highlight-start', 'starchart-highlight-end')
    
    const overallEndTime = performance.now()
    highlightActive = true
    console.log(`⭐ [事件跟踪] 邻域高亮完成: 总耗时 ${(overallEndTime - overallStartTime).toFixed(2)}ms`)
  }, 50) // 50ms节流，避免过度频繁的高亮更新

  // 点击节点时高亮邻域
  cyInstance.on('tap', 'node', (event) => {
    throttledNodeHighlight(event.target)
  })

  // 🔥 节流优化的背景点击恢复
  const throttledResetHighlight = throttle(() => {
    if (highlightActive && cyInstance) {
      const resetStartTime = performance.now()
      console.log(`🔄 [事件跟踪] 重置高亮开始`)
      
      cyInstance.batch(() => {
        cyInstance.elements()
          .removeClass('dimmed highlighted first-degree second-degree')
      })
      
      const resetEndTime = performance.now()
      highlightActive = false
      console.log(`🔄 [事件跟踪] 重置高亮完成: ${(resetEndTime - resetStartTime).toFixed(2)}ms`)
    }
  }, 100) // 100ms节流，避免误触

  // 点击背景恢复
  cyInstance.on('tap', (event) => {
    if (event.target === cyInstance) {
      throttledResetHighlight()
    }
  })
}

// 🔥 性能监控
const setupPerformanceMonitoring = () => {
  if (!cyInstance) return

  const config = configStore.config
  let dragStartTime = 0
  let frameCount = 0
  let lastFrameTime = performance.now()

  // 🔥 详细的拖动性能监控（与事件跟踪系统集成）
  cyInstance.on('drag', 'node', (event) => {
    if (dragStartTime === 0) {
      dragStartTime = performance.now()
      frameCount = 0
      configStore.performanceMark('starchart-drag-start')
      if (config.logging.enableEventTracking) {
        configStore.log(`🚀 [事件跟踪] 性能拖动监控开始 - 节点: ${event.target.data('name')}`)
      }
    }
    frameCount++
    
    // 🔥 每10帧详细分析一次
    if (config.logging.enableEventTracking && frameCount % 10 === 0) {
      const currentFrameTime = performance.now()
      const recentFrameAvg = (currentFrameTime - dragStartTime) / frameCount
      configStore.performanceMark(`starchart-drag-frame-${frameCount}`)
      configStore.log(`   └── 第${frameCount}帧: 平均帧时 ${recentFrameAvg.toFixed(2)}ms, 当前FPS约 ${Math.round(1000/recentFrameAvg)}`)
    }
  })

  cyInstance.on('free', 'node', (event) => {
    if (dragStartTime > 0) {
      const dragDuration = performance.now() - dragStartTime
      const avgFrameTime = dragDuration / frameCount
      const fps = Math.round(1000 / avgFrameTime)
      
      configStore.performanceMark('starchart-drag-end')
      configStore.performanceMeasure('starchart-drag-duration', 'starchart-drag-start', 'starchart-drag-end')
      
      if (config.logging.enableEventTracking) {
        configStore.log(`🚀 [事件跟踪] 性能拖动监控完成 - 节点: ${event.target.data('name')}`)
        configStore.log(`   ├── 拖动时长: ${dragDuration.toFixed(1)}ms`)
        configStore.log(`   ├── 总帧数: ${frameCount}`)
        configStore.log(`   ├── 平均帧时: ${avgFrameTime.toFixed(1)}ms`)
        configStore.log(`   ├── 估算FPS: ${fps}`)
        configStore.log(`   ├── 当前缩放: ${cyInstance!.zoom().toFixed(2)}`)
        configStore.log(`   └── DevTools标记: "starchart-drag-duration"`)
      }
      
      if (avgFrameTime > 33 && config.logging.enablePerformanceWarnings) {
        console.warn(`🚀 [事件跟踪] ⚠️ 性能警告: 帧时间过长 (${avgFrameTime.toFixed(1)}ms > 33ms)`)
        console.warn(`   └── 建议在DevTools Performance面板中分析 "starchart-drag-duration" 区间`)
      } else if (config.logging.enableEventTracking) {
        configStore.log(`🚀 [事件跟踪] ✅ 拖动性能良好 (${fps} FPS)`)
      }
      
      dragStartTime = 0
    }
  })

  // 🔥 监控渲染性能 - 修复longFrameCount作用域问题
  const performanceCheck = () => {
    const currentTime = performance.now()
    const deltaTime = currentTime - lastFrameTime
    lastFrameTime = currentTime

    if (deltaTime > config.performance.longFrameThreshold) {
      longFrameCount++ // 使用模块级别的longFrameCount
      if (config.logging.enablePerformanceWarnings) {
        console.warn(`🐌 [事件跟踪] 长帧检测${longFrameCount}: ${deltaTime.toFixed(1)}ms (目标<16.67ms)`)
      }
      
      // 每5个长帧输出一次总结
      if (longFrameCount % 5 === 0 && config.logging.enablePerformanceWarnings) {
        console.warn(`🐌 [事件跟踪] 性能警告: 已检测到${longFrameCount}个长帧，建议使用DevTools Performance面板分析`)
      }
    }

    requestAnimationFrame(performanceCheck)
  }

  if (config.performance.longFrameMonitoring) {
    if (config.logging.enableEventTracking) {
      configStore.log(`🔍 [事件跟踪] 启动长帧监控 (阈值: ${config.performance.longFrameThreshold}ms)`)
    }
    requestAnimationFrame(performanceCheck)
  }
}

// 运行布局
const runLayout = (shouldFit = false) => {
  if (!cyInstance) return

  // 🔥 使用 preset 布局（手动预设位置）
  const layout = cyInstance.layout({
    name: 'preset',  // 使用节点的预设 position
    fit: shouldFit,  // 只在初始化时自动缩放
    padding: 80,     // 视口边缘留白
    animate: false,  // 禁用动画（直接显示最终位置）
    ready: () => {
      console.log('[StarChartViewport] Preset 布局完成')
    }
  })

  layout.run()
}

// 🔥 优化后的 Cytoscape 样式（使用预计算属性，无动态函数调用）
const getCytoscapeStyle = () => [
  {
    selector: 'node',
    style: {
      // 🔥 使用预计算的节点大小（避免mapData动态计算）
      'width': 'data(nodeWidth)',
      'height': 'data(nodeHeight)',
      'content': 'data(name)',
      'font-size': '12px',
      'text-valign': 'center',
      'text-halign': 'center',
      'background-color': 'data(color)',
      'text-outline-color': '#555',
      'text-outline-width': '2px',
      'color': '#fff',
      // 🔥 性能优化：禁用所有过渡动画
      'transition-property': 'none',
      'transition-duration': '0ms'
    }
  },
  {
    selector: 'edge',
    style: {
      // 🔥 使用配置的边样式
      'curve-style': configStore.config.edgeStyle.curveStyle,
      'control-point-distances': configStore.config.edgeStyle.controlPointDistance,
      'control-point-weights': [configStore.config.edgeStyle.controlPointWeight],
      'opacity': configStore.config.edgeStyle.edgeOpacity,
      // 🔥 使用配置的颜色和宽度
      'line-color': 'data(edgeColor)',         // 可以被数据覆盖
      'width': 'data(edgeWidth)',              // 可以被数据覆盖
      'target-arrow-shape': configStore.config.edgeStyle.arrowShape,
      'target-arrow-color': 'data(targetArrowColor)',
      'arrow-scale': configStore.config.edgeStyle.arrowSize,
      // 🔥 性能优化：禁用所有过渡动画
      'transition-property': 'none',
      'transition-duration': '0ms'
    }
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': '4px',
      'border-color': '#4dabf7',
      'transition-property': 'none'  // 🔥 禁用选中动画
    }
  },
  // 🔥 邻域高亮样式（使用预计算颜色，无动态函数）
  {
    selector: 'node.dimmed',
    style: {
      'opacity': 0.15,
      'transition-property': 'none'  // 🔥 禁用变灰动画
    }
  },
  {
    selector: 'edge.dimmed',
    style: {
      'opacity': 0.05,
      'transition-property': 'none'  // 🔥 禁用变灰动画
    }
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-width': '6px',
      'border-color': 'data(highlightBorderColor)', // 🔥 使用预计算的高亮边框色
      'z-index': 9999,
      'transition-property': 'none'  // 🔥 禁用高亮动画
    }
  },
  {
    selector: 'node.first-degree',
    style: {
      'opacity': 1,
      'border-width': '3px',
      'border-color': 'data(borderColor)', // 🔥 使用预计算的边框色
      'transition-property': 'none'  // 🔥 禁用动画
    }
  },
  {
    selector: 'node.second-degree',
    style: {
      'opacity': 0.8,
      'transition-property': 'none'  // 🔥 禁用动画
    }
  },
  {
    selector: 'edge.highlighted',
    style: {
      'opacity': 0.9,
      'width': 'data(edgeWidth)',  // 🔥 保持原始宽度，避免重新计算
      'transition-property': 'none'  // 🔥 禁用动画
    }
  }
]

// 监听 elements 变化（浅层监听，只在数组引用改变时触发）
watch(() => props.elements, (newElements, oldElements) => {
  // 🔥 只在元素数量变化时才重新布局（避免拖动节点触发）
  if (!oldElements || newElements.length !== oldElements.length) {
    console.log('[StarChartViewport] Elements 数量变化:', newElements.length)
    if (cyInstance) {
      cyInstance.elements().remove()
      cyInstance.add(newElements)
      runLayout()
    } else if (newElements.length > 0) {
      // 如果 cyInstance 还不存在但有数据了，立即初始化
      console.log('[StarChartViewport] 延迟初始化 Cytoscape（因为数据后到）')
      initCytoscape()
    }
  }
})

// 监听 layout 名称变化
watch(() => props.layout.name, (newName, oldName) => {
  if (newName !== oldName) {
    console.log('[StarChartViewport] 布局类型变化:', newName)
    runLayout()
  }
})

// 监听滚轮灵敏度变化 - 🔥 优化：避免重新初始化
watch(() => props.wheelSensitivity, (newSensitivity) => {
  if (newSensitivity !== undefined && cyInstance) {
    const config = configStore.config
    
    if (config.layout.avoidWheelSensitivityReinit) {
      // 🔥 仅更新滚轮配置，不重新初始化
      if (config.logging.enableLayoutLogs) {
        configStore.log(`[StarChartViewport] 仅更新滚轮灵敏度: ${newSensitivity}`, 'verbose')
      }
      // 注意：Cytoscape.js可能不支持动态更新wheelSensitivity
      // 这里提供了配置选项，但实际实现可能需要查阅文档
      // 暂时保留重新初始化作为fallback
      if (config.logging.enableLayoutLogs) {
        configStore.log('[StarChartViewport] 警告: Cytoscape.js可能不支持动态更新wheelSensitivity，考虑重新初始化', 'verbose')
      }
      initCytoscape()
    } else {
      // 原有逻辑：重新初始化
      if (config.logging.enableLayoutLogs) {
        configStore.log(`[StarChartViewport] 滚轮灵敏度变化，重新初始化: ${newSensitivity}`)
      }
      initCytoscape()
    }
  }
})

// 🔥 监听边样式配置变化 - 实时更新样式
watch(() => configStore.config.edgeStyle, (newEdgeStyle) => {
  if (cyInstance) {
    const config = configStore.config
    
    if (config.logging.enableLayoutLogs) {
      configStore.log('[StarChartViewport] 边样式配置变化，更新样式', 'verbose')
    }
    
    // 🔥 更新边样式
    cyInstance.style()
      .selector('edge')
      .style({
        'curve-style': newEdgeStyle.curveStyle,
        'control-point-distances': newEdgeStyle.controlPointDistance,
        'control-point-weights': [newEdgeStyle.controlPointWeight],
        'opacity': newEdgeStyle.edgeOpacity,
        'target-arrow-shape': newEdgeStyle.arrowShape,
        'arrow-scale': newEdgeStyle.arrowSize
      })
      .update() // 应用样式更新
      
    if (config.logging.enableLayoutLogs) {
      configStore.log(`[StarChartViewport] 已应用边样式: ${newEdgeStyle.curveStyle}`, 'verbose')
    }
  }
}, { deep: true })

onMounted(() => {
  initCytoscape()
})

onBeforeUnmount(() => {
  if (cyInstance) {
    cyInstance.destroy()
    cyInstance = null
  }
  
  // 清理性能监控定时器
  if ((window as any).starChartPerformanceSummaryInterval) {
    clearInterval((window as any).starChartPerformanceSummaryInterval)
    delete (window as any).starChartPerformanceSummaryInterval
  }
  
  // 清理全局函数
  if ((window as any).StarChart性能总结) {
    delete (window as any).StarChart性能总结
  }
  
  const config = configStore.config
  if (config.logging.enableEventTracking) {
    configStore.log('🔍 [事件跟踪] 性能监控系统已清理')
  }
})
</script>

<style scoped lang="scss">
.starchart-viewport {
  flex: 1; /* 占满剩余空间 */
  min-height: 0; /* 关键：允许 flex 压缩 */
  width: 100%;
  height: 100%; /* 确保占满父容器 */
  background: var(--obsidian-background-primary);
  position: relative;
}
</style>

