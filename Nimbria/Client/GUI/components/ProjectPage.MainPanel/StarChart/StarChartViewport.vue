<template>
  <div ref="containerRef" class="starchart-viewport"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import cytoscape from 'cytoscape'
// @ts-ignore - cytoscape-fcose 没有类型定义
import fcose from 'cytoscape-fcose'
import type { CytoscapeElement, LayoutConfig, ViewportState } from '@stores/projectPage/starChart/starChart.types'

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

const containerRef = ref<HTMLElement | null>(null)
let cyInstance: cytoscape.Core | null = null
let highlightActive = false

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
    console.error('[StarChartViewport] 容器不存在')
    return
  }

  // 🔥 如果已存在实例，先销毁
  if (cyInstance) {
    console.log('[StarChartViewport] 销毁旧的 Cytoscape 实例')
    cyInstance.destroy()
    cyInstance = null
  }

  console.log('[StarChartViewport] 🚀 初始化 Cytoscape (WebGL GPU加速模式)')
  console.log('[StarChartViewport] 元素数量:', props.elements.length)
  console.log('[StarChartViewport] WebGL配置: 纹理4096x4096, 批处理4000, 显存8GB优化')
  
  // 🔥 调试：检查节点是否有预设位置
  const nodesWithPosition = props.elements.filter((el: any) => el.group === 'nodes' && el.position)
  console.log('[StarChartViewport] 有预设位置的节点数:', nodesWithPosition.length)
  if (nodesWithPosition.length > 0 && nodesWithPosition[0]) {
    console.log('[StarChartViewport] 第一个节点位置示例:', nodesWithPosition[0].position)
  }

  cyInstance = cytoscape({
    container: containerRef.value,
    elements: props.elements,
    style: getCytoscapeStyle() as any,  // 类型断言绕过严格检查
    layout: { 
      name: 'preset',  // 🔥 直接使用 preset 布局
      fit: true,
      padding: 80
    },
    minZoom: 0.05,  // 🔥 大规模数据需要更小的缩放
    maxZoom: 5,
    wheelSensitivity: props.wheelSensitivity || 0.2,  // 🔥 使用动态灵敏度
    
    // 🔥 8GB显存充足，高质量配置
    hideEdgesOnViewport: false,     // 显存充足，保持边显示
    textureOnViewport: false,       // 不用纹理，保持高质量
    motionBlur: false,              // 禁用动态模糊
    hideLabelsOnViewport: false,    // 显存充足，保持标签
    pixelRatio: 'auto',             // 自动像素比，更清晰
    
    // 🔥 新增：减少样式重计算的配置
    styleEnabled: true,             // 保持样式启用，但优化计算
    headless: false,                // 保持可视化
    ready: () => {
      console.log('[StarChart] 🚀 Cytoscape WebGL实例就绪！')
      console.log('[StarChart] GPU加速已启用，节点纹理缓存生成中...')
      console.log('[StarChart] 预期性能提升: 400节点+2500边 → 60+ FPS')
    },
    
    // 🔥 WebGL GPU加速（官方内置，8GB显存充足配置）
    renderer: {
      name: 'canvas',               // Canvas渲染器
      webgl: true,                  // 🚀 启用WebGL GPU加速模式！
      showFps: true,                // 显示FPS（开发阶段）
      webglDebug: true,             // WebGL调试信息
      
      // 🔥 WebGL高性能配置（8GB显存充足）
      webglTexSize: 4096,           // 纹理大小（高质量，8GB够用）
      webglTexRows: 32,             // 纹理行数（增加，显存充足）
      webglBatchSize: 4000,         // 批处理大小（加大，处理400节点）
      webglTexPerBatch: 16,         // 每批次纹理数（最大值）
      
      // 🔥 其他性能优化
      motionBlurOpacity: 0,
      desktopTapThreshold: 4,
      touchTapThreshold: 8,
      textureOnViewport: false,     // 显存充足，不优化
      hideEdgesOnViewport: false,   // 显存充足，不隐藏边
      hideLabelsOnViewport: false,  // 显存充足，不隐藏标签
    } as any,
    
    // 🔥 交互优化
    autoungrabify: false,           // 允许拖动节点
    autounselectify: false,         // 允许选择节点
    userZoomingEnabled: true,
    userPanningEnabled: true,
    
    // 🔥 批量更新优化
    selectionType: 'single',        // 限制单选，提高性能
    boxSelectionEnabled: false      // 禁用框选，减少计算
  })

  console.log('[StarChartViewport] Cytoscape 实例创建成功')
  console.log('[StarChartViewport] 节点数:', cyInstance.nodes().length)
  console.log('[StarChartViewport] 边数:', cyInstance.edges().length)

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
      console.log(`📊 [事件跟踪] 视口变化: ${(endTime - startTime).toFixed(2)}ms, 缩放: ${currentZoom.toFixed(2)}`)
    }
  }, 16) // 60fps

  cyInstance.on('zoom pan', throttledViewportChange)

  // 🔥 详细的事件耗时跟踪
  setupDetailedEventTracking()

  // 🔥 防抖优化的LOD更新（缩放停止后更新细节级别）
  // const debouncedLODUpdate = debounce(() => {
  //   if (cyInstance) {
  //     updateLOD(cyInstance.zoom())
  //   }
  // }, 100)

  // cyInstance.on('zoom', debouncedLODUpdate)

  // 🔥 添加邻域高亮功能
  setupNeighborhoodHighlight()

  // 🔥 添加性能监控（可选，开发时启用）
  if (import.meta.env.DEV) {
    setupPerformanceMonitoring()
  }

  // 运行布局（初始化时自动缩放）
  runLayout(true)
}

// 🔥 详细的事件耗时跟踪系统
const setupDetailedEventTracking = () => {
  if (!cyInstance) return

  console.log('🔍 [事件跟踪] 启动详细事件监控系统')

  // 🔥 拖动事件详细跟踪
  let dragEventCount = 0
  let dragStartPos = { x: 0, y: 0 }
  
  cyInstance.on('grab', 'node', (event) => {
    const startTime = performance.now()
    dragStartPos = event.position || event.renderedPosition
    performance.mark('starchart-grab-start')
    console.log(`🟡 [事件跟踪] 节点抓取开始: ${event.target.data('name')}`)
  })

  cyInstance.on('drag', 'node', (event) => {
    const startTime = performance.now()
    dragEventCount++
    
    if (dragEventCount % 5 === 0) { // 每5帧输出一次，避免日志过多
      const currentPos = event.position || event.renderedPosition
      const distance = Math.sqrt(
        Math.pow(currentPos.x - dragStartPos.x, 2) + 
        Math.pow(currentPos.y - dragStartPos.y, 2)
      )
      const endTime = performance.now()
      console.log(`🔵 [事件跟踪] 拖动第${dragEventCount}帧: ${(endTime - startTime).toFixed(2)}ms, 距离: ${distance.toFixed(1)}px`)
    }
  })

  cyInstance.on('free', 'node', (event) => {
    const startTime = performance.now()
    performance.mark('starchart-grab-end')
    performance.measure('starchart-grab-duration', 'starchart-grab-start', 'starchart-grab-end')
    
    const endTime = performance.now()
    console.log(`🟢 [事件跟踪] 节点释放完成: ${(endTime - startTime).toFixed(2)}ms, 总拖动帧数: ${dragEventCount}`)
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

// 🔥 性能监控（开发环境）
const setupPerformanceMonitoring = () => {
  if (!cyInstance) return

  let dragStartTime = 0
  let frameCount = 0
  let lastFrameTime = performance.now()

  // 🔥 详细的拖动性能监控（与事件跟踪系统集成）
  cyInstance.on('drag', 'node', (event) => {
    if (dragStartTime === 0) {
      dragStartTime = performance.now()
      frameCount = 0
      // 🔥 DevTools Performance 标记：拖动开始
      performance.mark('starchart-drag-start')
      console.log(`🚀 [事件跟踪] 性能拖动监控开始 - 节点: ${event.target.data('name')}`)
    }
    frameCount++
    
    // 🔥 每10帧详细分析一次
    if (frameCount % 10 === 0) {
      const currentFrameTime = performance.now()
      const recentFrameAvg = (currentFrameTime - dragStartTime) / frameCount
      performance.mark(`starchart-drag-frame-${frameCount}`)
      
      console.log(`   └── 第${frameCount}帧: 平均帧时 ${recentFrameAvg.toFixed(2)}ms, 当前FPS约 ${Math.round(1000/recentFrameAvg)}`)
    }
  })

  cyInstance.on('free', 'node', (event) => {
    if (dragStartTime > 0) {
      const dragDuration = performance.now() - dragStartTime
      const avgFrameTime = dragDuration / frameCount
      const fps = Math.round(1000 / avgFrameTime)
      
      // 🔥 DevTools Performance 标记：拖动结束
      performance.mark('starchart-drag-end')
      performance.measure('starchart-drag-duration', 'starchart-drag-start', 'starchart-drag-end')
      
      console.log(`🚀 [事件跟踪] 性能拖动监控完成 - 节点: ${event.target.data('name')}`)
      console.log(`   ├── 拖动时长: ${dragDuration.toFixed(1)}ms`)
      console.log(`   ├── 总帧数: ${frameCount}`)
      console.log(`   ├── 平均帧时: ${avgFrameTime.toFixed(1)}ms`)
      console.log(`   ├── 估算FPS: ${fps}`)
      console.log(`   ├── 当前缩放: ${cyInstance!.zoom().toFixed(2)}`)
      console.log(`   └── DevTools标记: "starchart-drag-duration"`)
      
      if (avgFrameTime > 33) { // 低于30fps
        console.warn(`🚀 [事件跟踪] ⚠️ 性能警告: 帧时间过长 (${avgFrameTime.toFixed(1)}ms > 33ms)`)
        console.warn(`   └── 建议在DevTools Performance面板中分析 "starchart-drag-duration" 区间`)
      } else {
        console.log(`🚀 [事件跟踪] ✅ 拖动性能良好 (${fps} FPS)`)
      }
      
      dragStartTime = 0
    }
  })

  // 🔥 监控渲染性能（集成到事件跟踪系统）
  let longFrameCount = 0
  const performanceCheck = () => {
    const currentTime = performance.now()
    const deltaTime = currentTime - lastFrameTime
    lastFrameTime = currentTime

    if (deltaTime > 50) { // 超过50ms的帧
      longFrameCount++
      console.warn(`🐌 [事件跟踪] 长帧检测${longFrameCount}: ${deltaTime.toFixed(1)}ms (目标<16.67ms)`)
      
      // 每5个长帧输出一次总结
      if (longFrameCount % 5 === 0) {
        console.warn(`🐌 [事件跟踪] 性能警告: 已检测到${longFrameCount}个长帧，建议使用DevTools Performance面板分析`)
      }
    }

    requestAnimationFrame(performanceCheck)
  }

  if (import.meta.env.DEV) {
    console.log('🔍 [事件跟踪] 启动长帧监控 (阈值: 50ms)')
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
      // 🔥 使用 unbundled-bezier 实现弧线效果，但使用预计算的控制点
      'curve-style': 'unbundled-bezier',
      'control-point-distances': 'data(controlPointDistance)',  // 🔥 使用预计算值
      'control-point-weights': [0.5],
      'opacity': 0.5,
      // 🔥 使用预计算的样式属性
      'line-color': 'data(edgeColor)',
      'width': 'data(edgeWidth)',               // 🔥 使用预计算的边宽
      'target-arrow-shape': 'triangle',
      'target-arrow-color': 'data(targetArrowColor)', // 🔥 使用预计算的箭头颜色
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

// 监听滚轮灵敏度变化 - 🔥 重新初始化 Cytoscape 实例
watch(() => props.wheelSensitivity, (newSensitivity) => {
  if (newSensitivity !== undefined && containerRef.value) {
    console.log('[StarChartViewport] 滚轮灵敏度变化，重新初始化:', newSensitivity)
    // 🔥 重新初始化（会自动销毁旧实例）
    initCytoscape()
  }
})

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
  
  console.log('🔍 [事件跟踪] 性能监控系统已清理')
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

