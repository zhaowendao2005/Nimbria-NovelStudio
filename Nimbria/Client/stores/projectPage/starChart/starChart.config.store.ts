/**
 * StarChart 配置状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { StarChartConfig, ConfigPreset } from './starChart.config.types'

const STORAGE_KEY = 'nimbria:starChart:config'

// 默认配置
const DEFAULT_CONFIG: StarChartConfig = {
  webgl: {
    enabled: true,
    showFps: true,
    debug: true,
    texSize: 4096,
    texRows: 32,
    batchSize: 4000,
    texPerBatch: 16
  },
  performance: {
    enabled: true,
    detailedEventTracking: true,
    longFrameMonitoring: true,
    summaryInterval: 30000,
    longFrameThreshold: 50,
    enablePerformanceSummary: true
  },
  logging: {
    level: 'verbose',
    enableConsoleLog: true,
    enableEventTracking: true,
    enablePerformanceWarnings: true,
    enableDevToolsMarks: true,
    enableInitializationLogs: true,
    enableLayoutLogs: true,
    enableHighlightLogs: true
  },
  interaction: {
    wheelSensitivity: 0.2,
    minZoom: 0.05,
    maxZoom: 5,
    autoungrabify: false,
    autounselectify: false,
    boxSelectionEnabled: false,
    selectionType: 'single'
  },
  rendering: {
    hideEdgesOnViewport: false,
    textureOnViewport: false,
    motionBlur: false,
    hideLabelsOnViewport: false,
    pixelRatio: 'auto',
    motionBlurOpacity: 0,
    styleEnabled: true,
    headless: false
  },
  layout: {
    autoLayout: false,
    manualOnly: true,
    firstTimeAutoFit: true,
    animate: false,
    randomize: false,
    avoidWheelSensitivityReinit: true,
    
    // 节点间距修正配置
    enableNodeSpacingCorrection: true,   // 默认启用
    minNodeDistanceMultiplier: 2.5,      // 节点间距至少为直径的2.5倍
    spacingCorrectionStrength: 0.7       // 修正强度70%
  },
  throttle: {
    viewportChange: 16,
    renderTracking: 200,
    styleUpdate: 100,
    viewportTracking: 500,
    highlightUpdate: 50,
    resetHighlight: 100
  },
  edgeStyle: {
    curveStyle: 'unbundled-bezier',
    controlPointDistance: 60,
    controlPointWeight: 0.5,
    edgeOpacity: 0.6,              // 平时边透明度
    highlightEdgeOpacity: 0.9,     // 高亮时边透明度
    defaultEdgeWidth: 1,           // 可在配置面板调节
    highlightEdgeWidth: 2,         // 高亮时边宽度
    arrowShape: 'triangle',
    arrowSize: 1.0,
    edgeColor: '#666666',
    selectedEdgeColor: '#4dabf7'
  },
  nodeStyle: {
    // 基础设置
    defaultSize: 28,
    sizeMultiplier: 1.0,         // 节点大小倍数
    randomSVGSelection: true,
    selectedSVGIndex: 0,
    
    // 不同级别节点大小倍数
    selectedNodeSize: 1.2,       // 选中节点
    firstDegreeNodeSize: 1.1,    // 一级邻居
    secondDegreeNodeSize: 1.0,   // 二级邻居
    fadedNodeSize: 0.8,          // 淡化节点
    
    // 填充样式 - 默认极淡透明填充
    fillMode: 'transparent',
    fillOpacity: 0.08,
    fillColor: '#3498db',
    
    // 边框样式
    strokeWidth: 1.5,
    strokeOpacity: 0.8,
    strokeColor: '#666666',
    
    // 文字设置
    textPosition: 'bottom',
    textMargin: 8,
    fontSize: 11,
    textColor: '#2c3e50',
    
    // 高级设置
    enableSVGCache: true,
    nodeTypeMapping: false
  }
}

// 配置预设
const CONFIG_PRESETS: Record<ConfigPreset, Partial<StarChartConfig>> = {
  // 🚀 性能优先模式
  performance: {
    webgl: { enabled: true, showFps: false, debug: false },
    performance: { enabled: false, detailedEventTracking: false },
    logging: { level: 'minimal', enableEventTracking: false, enableConsoleLog: false },
    rendering: { 
      hideEdgesOnViewport: true, 
      textureOnViewport: true, 
      hideLabelsOnViewport: true 
    },
    edgeStyle: {
      curveStyle: 'haystack',  // 性能最佳的边样式
      edgeOpacity: 0.4,
      highlightEdgeOpacity: 0.8,
      defaultEdgeWidth: 1,
      highlightEdgeWidth: 1.5,
      arrowShape: 'none'       // 去掉箭头提升性能
    },
    nodeStyle: {
      randomSVGSelection: false,  // 固定样式提升性能
      selectedSVGIndex: 0,       // 使用最简单的圆形
      fillMode: 'none',          // 无填充，性能最佳
      strokeWidth: 1,            // 细线条
      enableSVGCache: true,      // 启用缓存
      nodeTypeMapping: false     // 关闭类型映射
    }
  },
  
  // 🔧 开发调试模式
  development: {
    webgl: { enabled: true, showFps: true, debug: true },
    performance: { enabled: true, detailedEventTracking: true },
    logging: { level: 'verbose', enableEventTracking: true, enableConsoleLog: true },
    rendering: { 
      hideEdgesOnViewport: false, 
      textureOnViewport: false 
    },
    edgeStyle: {
      curveStyle: 'unbundled-bezier',  // 美观的贝塞尔曲线
      controlPointDistance: 80,       // 更大的弯曲度
      controlPointWeight: 0.6,
      edgeOpacity: 0.7,
      highlightEdgeOpacity: 0.95,
      defaultEdgeWidth: 1,
      highlightEdgeWidth: 2.5,
      arrowShape: 'triangle',
      arrowSize: 1.0
    },
    nodeStyle: {
      randomSVGSelection: true,       // 启用随机选择
      fillMode: 'transparent',        // 半透明填充
      fillOpacity: 0.1,              // 稍高的填充透明度
      strokeWidth: 2,                // 较粗的描边
      strokeOpacity: 0.9,            // 高描边透明度
      defaultSize: 32,               // 稍大的节点
      enableSVGCache: true,
      nodeTypeMapping: true          // 启用类型映射
    }
  },
  
  // 🏭 生产环境模式
  production: {
    webgl: { enabled: true, showFps: false, debug: false },
    performance: { enabled: false, detailedEventTracking: false },
    logging: { level: 'minimal', enableConsoleLog: false },
    rendering: { hideEdgesOnViewport: false },
    edgeStyle: {
      curveStyle: 'bezier',           // 标准贝塞尔曲线
      controlPointDistance: 50,
      edgeOpacity: 0.5,
      highlightEdgeOpacity: 0.85,
      defaultEdgeWidth: 1,
      highlightEdgeWidth: 2,
      arrowShape: 'triangle'
    },
    nodeStyle: {
      randomSVGSelection: false,      // 生产环境固定样式
      selectedSVGIndex: 8,           // 使用简单圆形
      fillMode: 'transparent',       // 半透明填充
      fillOpacity: 0.06,            // 极淡填充
      strokeWidth: 1.5,
      strokeOpacity: 0.7,
      enableSVGCache: true,
      nodeTypeMapping: false
    }
  },
  
  // 📱 极简模式
  minimal: {
    webgl: { enabled: false },
    performance: { enabled: false },
    logging: { level: 'silent' },
    rendering: { 
      hideEdgesOnViewport: true, 
      textureOnViewport: true,
      hideLabelsOnViewport: true 
    },
    edgeStyle: {
      curveStyle: 'straight',        // 最简单的直线
      edgeOpacity: 0.3,
      highlightEdgeOpacity: 0.7,
      defaultEdgeWidth: 1,
      highlightEdgeWidth: 1.5,
      arrowShape: 'none'
    },
    nodeStyle: {
      randomSVGSelection: false,     // 极简模式固定样式
      selectedSVGIndex: 8,          // 简单圆形
      fillMode: 'none',             // 无填充
      strokeWidth: 1,               // 最细描边
      strokeOpacity: 0.5,           // 低透明度
      defaultSize: 20,              // 小节点
      enableSVGCache: true,
      nodeTypeMapping: false
    }
  }
}

export const useStarChartConfigStore = defineStore('starChart-config', () => {
  // ==================== 状态 ====================
  
  const config = ref<StarChartConfig>(structuredClone(DEFAULT_CONFIG))
  const activePreset = ref<ConfigPreset | 'custom'>('development')
  const isDirty = ref(false)
  
  // ==================== 计算属性 ====================
  
  // Cytoscape 渲染器配置
  const cytoscapeRendererConfig = computed(() => ({
    name: 'canvas',
    webgl: config.value.webgl.enabled,
    showFps: config.value.webgl.showFps,
    webglDebug: config.value.webgl.debug,
    webglTexSize: config.value.webgl.texSize,
    webglTexRows: config.value.webgl.texRows,
    webglBatchSize: config.value.webgl.batchSize,
    webglTexPerBatch: config.value.webgl.texPerBatch,
    motionBlurOpacity: config.value.rendering.motionBlurOpacity,
    desktopTapThreshold: 4,
    touchTapThreshold: 8,
    textureOnViewport: config.value.rendering.textureOnViewport,
    hideEdgesOnViewport: config.value.rendering.hideEdgesOnViewport,
    hideLabelsOnViewport: config.value.rendering.hideLabelsOnViewport
  }))
  
  // Cytoscape 实例配置
  const cytoscapeInstanceConfig = computed(() => ({
    minZoom: config.value.interaction.minZoom,
    maxZoom: config.value.interaction.maxZoom,
    wheelSensitivity: config.value.interaction.wheelSensitivity,
    autoungrabify: config.value.interaction.autoungrabify,
    autounselectify: config.value.interaction.autounselectify,
    boxSelectionEnabled: config.value.interaction.boxSelectionEnabled,
    pixelRatio: config.value.rendering.pixelRatio,
    motionBlur: config.value.rendering.motionBlur,
    styleEnabled: config.value.rendering.styleEnabled,
    headless: config.value.rendering.headless,
    selectionType: config.value.interaction.selectionType
  }))
  
  // ==================== 日志控制方法 ====================
  
  /** 条件日志输出 */
  const log = (message: string, level: 'minimal' | 'normal' | 'verbose' = 'normal') => {
    if (!config.value.logging.enableConsoleLog) return
    if (config.value.logging.level === 'silent') return
    
    const levels = { minimal: 1, normal: 2, verbose: 3 }
    const currentLevel = levels[config.value.logging.level] || 2
    const messageLevel = levels[level] || 2
    
    if (messageLevel <= currentLevel) {
      console.log(message)
    }
  }
  
  /** 条件性能标记 */
  const performanceMark = (name: string) => {
    if (config.value.logging.enableDevToolsMarks) {
      performance.mark(name)
    }
  }
  
  /** 条件性能测量 */
  const performanceMeasure = (name: string, startMark: string, endMark: string) => {
    if (config.value.logging.enableDevToolsMarks) {
      performance.measure(name, startMark, endMark)
    }
  }
  
  // ==================== 方法 ====================
  
  /** 应用配置预设 */
  const applyPreset = (preset: ConfigPreset) => {
    const presetConfig = CONFIG_PRESETS[preset]
    config.value = deepMerge(structuredClone(DEFAULT_CONFIG), presetConfig)
    activePreset.value = preset
    isDirty.value = false
    log(`[StarChart配置] 已应用预设: ${preset}`)
  }
  
  /** 更新配置 */
  const updateConfig = (path: string, value: any) => {
    setNestedProperty(config.value, path, value)
    activePreset.value = 'custom'
    isDirty.value = true
    log(`[StarChart配置] 更新配置: ${path} = ${value}`)
  }
  
  /** 重置为默认配置 */
  const resetToDefault = () => {
    config.value = structuredClone(DEFAULT_CONFIG)
    activePreset.value = 'development'
    isDirty.value = false
    log('[StarChart配置] 已重置为默认配置')
  }
  
  /** 保存配置 */
  const saveConfig = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        config: config.value,
        activePreset: activePreset.value,
        timestamp: Date.now()
      }))
      isDirty.value = false
      log('[StarChart配置] 配置已保存')
    } catch (error) {
      console.error('[StarChart配置] 保存失败:', error)
    }
  }
  
  /** 加载配置 */
  const loadConfig = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        config.value = deepMerge(structuredClone(DEFAULT_CONFIG), data.config)
        activePreset.value = data.activePreset || 'custom'
        log('[StarChart配置] 已加载保存的配置')
      }
    } catch (error) {
      console.error('[StarChart配置] 加载失败，使用默认配置:', error)
      resetToDefault()
    }
  }
  
  /** 导出配置 */
  const exportConfig = () => {
    return JSON.stringify({
      config: config.value,
      activePreset: activePreset.value,
      timestamp: Date.now(),
      version: '1.0.0'
    }, null, 2)
  }
  
  /** 导入配置 */
  const importConfig = (configJson: string) => {
    try {
      const data = JSON.parse(configJson)
      config.value = deepMerge(structuredClone(DEFAULT_CONFIG), data.config)
      activePreset.value = data.activePreset || 'custom'
      isDirty.value = true
      log('[StarChart配置] 配置导入成功')
      return true
    } catch (error) {
      console.error('[StarChart配置] 导入失败:', error)
      return false
    }
  }
  
  // ==================== 工具函数 ====================
  
  /** 深度合并对象 */
  function deepMerge(target: any, source: any): any {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {}
        deepMerge(target[key], source[key])
      } else {
        target[key] = source[key]
      }
    }
    return target
  }
  
  /** 设置嵌套属性 */
  function setNestedProperty(obj: any, path: string, value: any) {
    const keys = path.split('.')
    let current = obj
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {}
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value
  }
  
  // ==================== 自动保存 ====================
  
  // 监听配置变化，自动保存
  watch(config, () => {
    if (isDirty.value) {
      saveConfig()
    }
  }, { deep: true })
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    config,
    activePreset,
    isDirty,
    
    // 计算属性
    cytoscapeRendererConfig,
    cytoscapeInstanceConfig,
    
    // 日志方法
    log,
    performanceMark,
    performanceMeasure,
    
    // 方法
    applyPreset,
    updateConfig,
    resetToDefault,
    saveConfig,
    loadConfig,
    exportConfig,
    importConfig,
    
    // 常量
    DEFAULT_CONFIG,
    CONFIG_PRESETS
  }
})
