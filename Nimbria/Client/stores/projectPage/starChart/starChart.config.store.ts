/**
 * StarChart 配置状态管理
 * G6原生版本 - 简化配置
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StarChartConfig, ConfigPreset, DataSourceType, LayoutType } from './starChart.config.types'

// 布局配置类型（通用）
interface LayoutConfig {
  name: string
  [key: string]: unknown
}

const STORAGE_KEY = 'nimbria:starChart:config'

// 默认配置
const DEFAULT_CONFIG: StarChartConfig = {
  interaction: {
    wheelSensitivity: 0.2,
    enableClickActivate: true,
    activateDegree: 1
  },
  edgeStyle: {
    defaultEdgeWidth: 1,
    edgeOpacity: 0.6,
    arrowShape: 'triangle'
  },
  layout: {
    enableNodeSpacingCorrection: true,
    minNodeDistanceMultiplier: 2.5,
    spacingCorrectionStrength: 0.7
  },
  nodeStyle: {
    defaultSize: 28,
    sizeMultiplier: 1.0,
    randomSVGSelection: true,
    selectedSVGIndex: 0,
    fillMode: 'transparent',
    fillOpacity: 0.08,
    strokeWidth: 1.5,
    textPosition: 'bottom',
    fontSize: 11
  },
  g6: {
    renderer: 'canvas',  // 默认使用 Canvas
    pixelRatio: 2,
    fitView: true,
    // Canvas 优化配置（默认全部启用以获得最佳性能）
    canvasOptimization: {
      enableOffscreen: true,           // 启用离屏渲染（双缓存）
      enableFrustumCulling: true,      // 启用视锥剔除
      enableGroupByTypes: true,        // 按类型分组渲染
      enableCSSTransform: true,        // CSS 变换加速
      pixelRatioMode: 'auto',          // 自动选择像素比
      paintSelector: 'all'             // 绘制所有状态
    }
  }
}

// 配置预设
const CONFIG_PRESETS: Record<ConfigPreset, Partial<StarChartConfig>> = {
  performance: {
    g6: { 
      renderer: 'canvas',
      pixelRatio: 2,
      fitView: true,
      canvasOptimization: {
        enableOffscreen: true,
        enableFrustumCulling: true,
        enableGroupByTypes: true,
        enableCSSTransform: true,
        pixelRatioMode: 'performance',  // 性能优先
        paintSelector: 'none'            // 禁用选中效果以提升性能
      }
    },
    nodeStyle: { 
      defaultSize: 24, 
      fontSize: 10,
      sizeMultiplier: 1.0,
      randomSVGSelection: true,
      selectedSVGIndex: 0,
      fillMode: 'transparent' as const,
      fillOpacity: 0.08,
      strokeWidth: 1.5,
      textPosition: 'bottom' as const
    }
  },
  development: {
    g6: { 
      renderer: 'canvas',
      pixelRatio: 2,
      fitView: true,
      canvasOptimization: {
        enableOffscreen: true,
        enableFrustumCulling: false,     // 开发时可能需要看到所有节点
        enableGroupByTypes: true,
        enableCSSTransform: true,
        pixelRatioMode: 'quality',       // 开发时优先清晰度
        paintSelector: 'all'
      }
    },
    nodeStyle: { 
      defaultSize: 32, 
      fontSize: 12,
      sizeMultiplier: 1.0,
      randomSVGSelection: true,
      selectedSVGIndex: 0,
      fillMode: 'transparent' as const,
      fillOpacity: 0.08,
      strokeWidth: 1.5,
      textPosition: 'bottom' as const
    }
  },
  production: {
    g6: { 
      renderer: 'canvas',
      pixelRatio: 2,
      fitView: true,
      canvasOptimization: {
        enableOffscreen: true,
        enableFrustumCulling: true,
        enableGroupByTypes: true,
        enableCSSTransform: true,
        pixelRatioMode: 'auto',          // 生产环境自动选择
        paintSelector: 'all'
      }
    },
    nodeStyle: { 
      defaultSize: 28, 
      fontSize: 11,
      sizeMultiplier: 1.0,
      randomSVGSelection: true,
      selectedSVGIndex: 0,
      fillMode: 'transparent' as const,
      fillOpacity: 0.08,
      strokeWidth: 1.5,
      textPosition: 'bottom' as const
    }
  },
  minimal: {
    g6: { 
      renderer: 'canvas',
      pixelRatio: 2,
      fitView: true,
      canvasOptimization: {
        enableOffscreen: false,          // 最小配置，禁用离屏渲染
        enableFrustumCulling: false,
        enableGroupByTypes: false,
        enableCSSTransform: false,
        pixelRatioMode: 'auto',
        paintSelector: 'all'
      }
    },
    edgeStyle: { 
      defaultEdgeWidth: 0.5, 
      edgeOpacity: 0.3,
      arrowShape: 'triangle' as const
    },
    nodeStyle: { 
      defaultSize: 20, 
      fontSize: 9,
      sizeMultiplier: 1.0,
      randomSVGSelection: true,
      selectedSVGIndex: 0,
      fillMode: 'transparent' as const,
      fillOpacity: 0.08,
      strokeWidth: 1.5,
      textPosition: 'bottom' as const
    }
  }
}

export const useStarChartConfigStore = defineStore('projectPage-starChart-config', () => {
  // ==================== 状态 ====================
  
  const config = ref<StarChartConfig>(structuredClone(DEFAULT_CONFIG))
  const activePreset = ref<ConfigPreset | 'custom'>('production')
  const dataSource = ref<DataSourceType>('mock-normal')
  const currentLayoutType = ref<LayoutType>('multi-root-radial')
  const layoutConfig = ref<LayoutConfig>({
    name: 'multi-root-radial',  // 默认使用标准多根径向树
    radial: true,
    direction: 'radial'
  })
  
  // ==================== 计算属性 ====================
  
  /**
   * 是否显示节点间距修正配置（已废弃，保留用于兼容性）
   */
  const showNodeSpacingCorrection = computed(() => {
    return false  // 多根径向树布局不需要节点间距修正
  })
  
  // ==================== 方法 ====================
  
  /**
   * 更新配置
   */
  const updateConfig = (path: string, value: unknown) => {
    setNestedProperty(config.value, path, value)
    activePreset.value = 'custom'
    saveConfig() // 立即保存配置
  }
  
  /**
   * 更新布局配置
   */
  const updateLayoutConfig = (path: string, value: unknown) => {
    setNestedProperty(layoutConfig.value, path, value)
  }
  
  /**
   * 应用预设
   */
  const applyPreset = (preset: ConfigPreset) => {
    const presetConfig = CONFIG_PRESETS[preset]
    config.value = merge(structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>, presetConfig as Record<string, unknown>) as unknown as StarChartConfig
    activePreset.value = preset
    saveConfig()
  }
  
  /**
   * 设置数据源
   */
  const setDataSource = (source: DataSourceType) => {
    dataSource.value = source
    saveConfig()
  }
  
  /**
   * 设置布局类型
   */
  const setLayoutType = (layoutType: LayoutType) => {
    currentLayoutType.value = layoutType
    
    // 将布局类型映射到 layoutConfig.name
    // 这样 StarChartViewport 可以正确找到对应的插件
    layoutConfig.value = {
      name: layoutType,  // 使用实际的布局类型名称
      radial: true,
      direction: 'radial'
    } as LayoutConfig
    
    saveConfig()
  }
  
  /**
   * 保存配置
   */
  const saveConfig = () => {
    try {
      const state = {
        config: config.value,
        activePreset: activePreset.value,
        dataSource: dataSource.value,
        currentLayoutType: currentLayoutType.value,
        layoutConfig: layoutConfig.value
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      console.log('[StarChart Config] 配置已保存')
    } catch (error) {
      console.error('[StarChart Config] 保存配置失败:', error)
    }
  }
  
  /**
   * 加载配置
   */
  const loadConfig = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const state = JSON.parse(stored)
        config.value = merge(structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>, state.config || {}) as unknown as StarChartConfig
        activePreset.value = state.activePreset || 'production'
        dataSource.value = state.dataSource || 'mock-normal'
        currentLayoutType.value = state.currentLayoutType || 'multi-root-radial'
        layoutConfig.value = state.layoutConfig || {
          name: state.currentLayoutType || 'multi-root-radial',  // 使用保存的布局类型或默认值
          radial: true,
          direction: 'radial'
        } as LayoutConfig
        console.log('[StarChart Config] 配置已加载')
      }
    } catch (error) {
      console.error('[StarChart Config] 加载配置失败:', error)
    }
  }
  
  /**
   * 重置为默认配置
   */
  const resetToDefault = () => {
    config.value = structuredClone(DEFAULT_CONFIG)
    activePreset.value = 'production'
    dataSource.value = 'mock-normal'
    currentLayoutType.value = 'multi-root-radial'
    layoutConfig.value = {
      name: 'multi-root-radial',  // 使用标准多根径向树
      radial: true,
      direction: 'radial'
    } as LayoutConfig
    saveConfig()
  }
  
  // ==================== 工具函数 ====================
  
  /**
   * 设置嵌套属性
   */
  function setNestedProperty(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.')
    let current: Record<string, unknown> = obj
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (key && !(key in current)) {
        current[key] = {}
      }
      if (key && key in current) {
        current = current[key] as Record<string, unknown>
      }
    }
    
    const lastKey = keys[keys.length - 1]
    if (lastKey) {
      current[lastKey] = value
    }
  }
  
  /**
   * 深度合并对象
   */
  function merge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const result = { ...target }
    
    for (const key in source) {
      const sourceValue = source[key]
      if (sourceValue !== null && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        result[key] = merge(
          (result[key] || {}) as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>]
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>]
      }
    }
    
    return result
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    config,
    activePreset,
    dataSource,
    currentLayoutType,
    layoutConfig,
    
    // 计算属性
    showNodeSpacingCorrection,
    
    // 方法
    updateConfig,
    updateLayoutConfig,
    applyPreset,
    setDataSource,
    setLayoutType,
    saveConfig,
    loadConfig,
    resetToDefault
  }
})
