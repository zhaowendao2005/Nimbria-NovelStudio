/**
 * 左侧栏状态管理
 * 管理左侧导航栏和内容区的显示状态、宽度等
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type LeftSidebarView = 'files' | 'chat' | 'search' | 'notebook' | 'docparser' | 'settings'

export const useLeftSidebarStore = defineStore('leftSidebar', () => {
  // ==================== 状态 ====================
  
  /** 当前激活的视图 */
  const currentView = ref<LeftSidebarView>('files')
  
  /** 内容区是否可见 */
  const isContentVisible = ref<boolean>(true)
  
  /** 上一个视图（用于恢复） */
  const previousView = ref<LeftSidebarView>('files')
  
  /** 自定义宽度（当用户拖拽时使用） */
  const customWidth = ref<number | null>(null)
  
  // ==================== 计算属性 ====================
  
  /** 左侧栏宽度（动态计算） */
  const width = computed(() => {
    if (!isContentVisible.value) {
      return '48px'  // 仅导航栏
    }
    // 如果有自定义宽度，使用自定义宽度
    if (customWidth.value !== null) {
      return `${customWidth.value}px`
    }
    return '365px'  // 默认：导航栏 + 内容区
  })
  
  /** 内容区宽度（不含导航栏） */
  const contentWidth = computed(() => {
    if (!isContentVisible.value) {
      return '0px'
    }
    return '317px'  // 365px - 48px
  })
  
  // ==================== 方法 ====================
  
  /**
   * 设置当前视图
   * @param view 视图类型
   */
  function setView(view: LeftSidebarView) {
    console.log('[LeftSidebarStore] setView:', view, 'current:', currentView.value)
    
    if (view === currentView.value) {
      // 点击当前视图，切换显示/隐藏
      isContentVisible.value = !isContentVisible.value
      console.log('[LeftSidebarStore] Toggle visibility:', isContentVisible.value)
    } else {
      // 切换到新视图
      previousView.value = currentView.value
      currentView.value = view
      isContentVisible.value = true
      console.log('[LeftSidebarStore] Switch view:', currentView.value)
    }
  }
  
  /**
   * 显示内容区
   */
  function showContent() {
    isContentVisible.value = true
  }
  
  /**
   * 隐藏内容区
   */
  function hideContent() {
    isContentVisible.value = false
  }
  
  /**
   * 切换内容区显示/隐藏
   */
  function toggleContent() {
    isContentVisible.value = !isContentVisible.value
  }
  
  /**
   * 设置自定义宽度（拖拽时使用）
   * @param newWidth 新宽度（数字，单位 px）
   */
  function setWidth(newWidth: number) {
    customWidth.value = newWidth
  }
  
  /**
   * 重置宽度为默认值
   */
  function resetWidth() {
    customWidth.value = null
  }
  
  /**
   * 重置为默认状态
   */
  function reset() {
    currentView.value = 'files'
    isContentVisible.value = true
    previousView.value = 'files'
    customWidth.value = null
  }
  
  return {
    // 状态
    currentView,
    isContentVisible,
    previousView,
    customWidth,
    
    // 计算属性
    width,
    contentWidth,
    
    // 方法
    setView,
    setWidth,
    resetWidth,
    showContent,
    hideContent,
    toggleContent,
    reset
  }
})

