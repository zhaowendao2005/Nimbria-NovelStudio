/**
 * StarChart 配置状态管理
 * G6原生版本 - 简化配置
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StarChartConfig, ConfigPreset, DataSourceType, LayoutType } from './starChart.config.types'
import type { LayoutConfig } from './layouts/types'
import { DEFAULT_CONCENTRIC_LAYOUT } from './config/layout.presets'

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
    renderer: 'auto',
    pixelRatio: 2,
    fitView: true
  }
}

// 配置预设
const CONFIG_PRESETS: Record<ConfigPreset, Partial<StarChartConfig>> = {
  performance: {
    g6: { renderer: 'webgl' },
    nodeStyle: { defaultSize: 24, fontSize: 10 }
  },
  development: {
    g6: { renderer: 'canvas' },
    nodeStyle: { defaultSize: 32, fontSize: 12 }
  },
  production: {
    g6: { renderer: 'auto' },
    nodeStyle: { defaultSize: 28, fontSize: 11 }
  },
  minimal: {
    g6: { renderer: 'canvas' },
    edgeStyle: { defaultEdgeWidth: 0.5, edgeOpacity: 0.3 },
    nodeStyle: { defaultSize: 20, fontSize: 9 }
  }
}

export const useStarChartConfigStore = defineStore('projectPage-starChart-config', () => {
  // ==================== 状态 ====================
  
  const config = ref<StarChartConfig>(structuredClone(DEFAULT_CONFIG))
  const activePreset = ref<ConfigPreset | 'custom'>('production')
  const dataSource = ref<DataSourceType>('mock-normal')
  const currentLayoutType = ref<LayoutType>('concentric')
  const layoutConfig = ref<LayoutConfig>(structuredClone(DEFAULT_CONCENTRIC_LAYOUT))
  
  // ==================== 计算属性 ====================
  
  /**
   * 是否显示节点间距修正配置（仅同心圆布局）
   */
  const showNodeSpacingCorrection = computed(() => {
    return currentLayoutType.value === 'concentric'
  })
  
  // ==================== 方法 ====================
  
  /**
   * 更新配置
   */
  const updateConfig = (path: string, value: unknown) => {
    setNestedProperty(config.value, path, value)
    activePreset.value = 'custom'
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
    
    // 根据布局类型自动调整布局配置
    if (layoutType === 'concentric') {
      layoutConfig.value = structuredClone(DEFAULT_CONCENTRIC_LAYOUT)
    } else if (layoutType === 'compact-box') {
      layoutConfig.value = {
        name: 'compact-box',
        radial: true,
        direction: 'radial'
      } as LayoutConfig
    }
    
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
        currentLayoutType.value = state.currentLayoutType || 'concentric'
        layoutConfig.value = state.layoutConfig || structuredClone(DEFAULT_CONCENTRIC_LAYOUT)
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
    currentLayoutType.value = 'concentric'
    layoutConfig.value = structuredClone(DEFAULT_CONCENTRIC_LAYOUT)
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
      if (!(keys[i] in current)) {
        current[keys[i]] = {}
      }
      current = current[keys[i]] as Record<string, unknown>
    }
    
    current[keys[keys.length - 1]] = value
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
