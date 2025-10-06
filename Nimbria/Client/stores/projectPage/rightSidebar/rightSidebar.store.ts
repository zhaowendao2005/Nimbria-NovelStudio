/**
 * 右侧栏状态管理
 * 负责面板注册、管理和显示控制
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { RightSidebarPanel } from './types'

const DEFAULT_WIDTH = '280px'
const STORAGE_KEY = 'nimbria:rightSidebar:state'

export const useRightSidebarStore = defineStore('rightSidebar', () => {
  // ==================== 状态 ====================
  const panels = ref<RightSidebarPanel[]>([])
  const activeId = ref<string | null>(null)
  const visible = ref(true)
  const width = ref(DEFAULT_WIDTH)
  
  // ==================== Getters ====================
  
  /** 获取所有可用面板（过滤掉条件不满足的） */
  const availablePanels = computed(() => {
    return panels.value
      .filter(panel => !panel.when || panel.when())
      .sort((a, b) => (a.order || 999) - (b.order || 999))
  })
  
  /** 当前激活的面板 */
  const activePanel = computed(() => {
    return availablePanels.value.find(p => p.id === activeId.value) || null
  })
  
  /** 是否有面板 */
  const hasPanels = computed(() => availablePanels.value.length > 0)
  
  // ==================== Actions ====================
  
  /** 注册面板 */
  const register = (panel: RightSidebarPanel) => {
    const existing = panels.value.findIndex(p => p.id === panel.id)
    if (existing >= 0) {
      console.warn(`Panel "${panel.id}" already exists, replacing it.`)
      panels.value[existing] = panel
    } else {
      panels.value.push(panel)
    }
    
    // 如果没有激活面板，自动激活第一个
    if (!activeId.value && availablePanels.value.length > 0) {
      activeId.value = availablePanels.value[0].id
    }
  }
  
  /** 注销面板 */
  const unregister = (panelId: string) => {
    const index = panels.value.findIndex(p => p.id === panelId)
    if (index >= 0) {
      panels.value.splice(index, 1)
      
      // 如果删除的是当前面板，切换到下一个
      if (activeId.value === panelId) {
        const nextPanel = availablePanels.value[0]
        activeId.value = nextPanel?.id || null
        
        // 如果没有面板了，隐藏侧边栏
        if (!nextPanel) {
          visible.value = false
        }
      }
    }
  }
  
  /** 切换到指定面板 */
  const switchTo = (panelId: string) => {
    const panel = availablePanels.value.find(p => p.id === panelId)
    if (panel) {
      activeId.value = panelId
      visible.value = true
    } else {
      console.warn(`Panel "${panelId}" not found or not available`)
    }
  }
  
  /** 显示侧边栏 */
  const show = () => { 
    if (hasPanels.value) {
      visible.value = true 
    }
  }
  
  /** 隐藏侧边栏 */
  const hide = () => { visible.value = false }
  
  /** 切换显示/隐藏 */
  const toggle = () => { 
    if (hasPanels.value) {
      visible.value = !visible.value 
    }
  }
  
  /** 设置宽度 */
  const setWidth = (newWidth: string) => {
    width.value = newWidth
    persistState()
  }
  
  /** 清空所有面板（用于重置） */
  const clear = () => {
    panels.value = []
    activeId.value = null
  }
  
  // ==================== 持久化 ====================
  
  /** 保存状态到 localStorage */
  const persistState = () => {
    const state = {
      activeId: activeId.value,
      visible: visible.value,
      width: width.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
  
  /** 从 localStorage 恢复状态 */
  const restoreState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const state = JSON.parse(saved)
        activeId.value = state.activeId ?? null
        visible.value = state.visible ?? true
        width.value = state.width ?? DEFAULT_WIDTH
      }
    } catch (error) {
      console.error('Failed to restore rightSidebar state:', error)
    }
  }
  
  // 监听状态变化，自动持久化
  watch([activeId, visible, width], persistState, { deep: true })
  
  // 初始化时恢复状态
  restoreState()
  
  return {
    // State
    panels,
    activeId,
    visible,
    width,
    
    // Getters
    availablePanels,
    activePanel,
    hasPanels,
    
    // Actions
    register,
    unregister,
    switchTo,
    show,
    hide,
    toggle,
    setWidth,
    clear
  }
})

