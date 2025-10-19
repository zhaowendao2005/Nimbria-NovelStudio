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
    fitView: true
    // ✅ webglOptimization 已清理
  }
}

// 配置预设
const CONFIG_PRESETS: Record<ConfigPreset, Partial<StarChartConfig>> = {
  performance: {
    g6: { 
      renderer: 'webgl',
      pixelRatio: 2,
      fitView: true
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
      fitView: true
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
      fitView: true
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
      fitView: true
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
    name: 'compact-box',
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
    config.value = merge(structuredClone(DEFAULT_CONFIG), presetConfig)
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
    
    // 目前只有一个布局：multi-root-radial
    // 使用默认的布局配置
    layoutConfig.value = {
      name: 'compact-box',  // 插件内部映射到 multi-root-radial
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
        config.value = merge(structuredClone(DEFAULT_CONFIG), state.config || {})
        activePreset.value = state.activePreset || 'production'
        dataSource.value = state.dataSource || 'mock-normal'
        currentLayoutType.value = state.currentLayoutType || 'multi-root-radial'
        layoutConfig.value = state.layoutConfig || {
          name: 'compact-box',
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
      name: 'compact-box',
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
