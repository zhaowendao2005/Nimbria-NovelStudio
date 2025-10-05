import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mockMarkdownFiles } from './markdown.mock'
import type { MarkdownFile, MarkdownTab } from './types'

/**
 * Markdown Store
 * 管理Markdown文件树、标签页、导航历史等状态
 */
export const useMarkdownStore = defineStore('projectPage-markdown', () => {
  // ==================== 状态 ====================
  
  // 文件树数据
  const fileTree = ref<MarkdownFile[]>([])
  
  // 打开的标签页
  const openTabs = ref<MarkdownTab[]>([])
  
  // 当前激活的标签页ID
  const activeTabId = ref<string | null>(null)
  
  // 历史记录（用于前进后退）
  const navigationHistory = ref<string[]>([])
  const currentHistoryIndex = ref(-1)
  
  // ==================== 计算属性 ====================
  
  // 当前激活的标签页
  const activeTab = computed(() => {
    return openTabs.value.find(tab => tab.id === activeTabId.value) || null
  })
  
  // 是否可以后退
  const canGoBack = computed(() => currentHistoryIndex.value > 0)
  
  // 是否可以前进
  const canGoForward = computed(() => {
    return currentHistoryIndex.value < navigationHistory.value.length - 1
  })
  
  // 是否有未保存的标签页
  const hasDirtyTabs = computed(() => {
    return openTabs.value.some(tab => tab.isDirty)
  })
  
  // ==================== 方法 ====================
  
  // 初始化文件树（从mock数据）
  const initializeFileTree = () => {
    fileTree.value = mockMarkdownFiles
  }
  
  // 打开文件
  const openFile = (filePath: string) => {
    // 检查是否已经打开
    const existingTab = openTabs.value.find(tab => tab.filePath === filePath)
    
    if (existingTab) {
      // 切换到已存在的标签页
      activeTabId.value = existingTab.id
      addToHistory(filePath)
      return existingTab
    }
    
    // 查找文件
    const file = findFileByPath(fileTree.value, filePath)
    if (!file || file.isFolder) {
      console.error('文件未找到或是文件夹:', filePath)
      return null
    }
    
    // 创建新标签页
    const newTab: MarkdownTab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filePath: file.path,
      fileName: file.name,
      content: file.content,
      mode: 'view',
      isDirty: false
    }
    
    openTabs.value.push(newTab)
    activeTabId.value = newTab.id
    addToHistory(filePath)
    
    return newTab
  }
  
  // 关闭标签页
  const closeTab = (tabId: string) => {
    const index = openTabs.value.findIndex(tab => tab.id === tabId)
    if (index === -1) return
    
    const tab = openTabs.value[index]
    if (!tab) return
    
    // 如果有未保存的更改，这里可以添加确认逻辑
    if (tab.isDirty) {
      // TODO: 显示确认对话框
    }
    
    openTabs.value.splice(index, 1)
    
    // 如果关闭的是当前激活的标签页，切换到相邻标签页
    if (activeTabId.value === tabId) {
      if (openTabs.value.length > 0) {
        const newIndex = Math.min(index, openTabs.value.length - 1)
        const newTab = openTabs.value[newIndex]
        if (newTab) {
          activeTabId.value = newTab.id
        }
      } else {
        activeTabId.value = null
      }
    }
  }
  
  // 切换标签页
  const switchTab = (tabId: string) => {
    const tab = openTabs.value.find(t => t.id === tabId)
    if (tab) {
      activeTabId.value = tabId
      addToHistory(tab.filePath)
    }
  }
  
  // 更新标签页内容
  const updateTabContent = (tabId: string, content: string) => {
    const tab = openTabs.value.find(t => t.id === tabId)
    if (!tab) return
    
    tab.content = content
    tab.isDirty = true
  }
  
  // 切换标签页模式
  const switchTabMode = (tabId: string, mode: 'edit' | 'view') => {
    const tab = openTabs.value.find(t => t.id === tabId)
    if (!tab) return
    
    tab.mode = mode
  }
  
  // 保存标签页
  const saveTab = (tabId: string) => {
    const tab = openTabs.value.find(t => t.id === tabId)
    if (!tab) return
    
    // TODO: 实际保存逻辑（调用Electron IPC）
    const file = findFileByPath(fileTree.value, tab.filePath)
    if (file) {
      file.content = tab.content
      file.lastModified = new Date()
    }
    
    tab.isDirty = false
    console.log('保存文件:', tab.filePath)
  }
  
  // 保存所有标签页
  const saveAllTabs = () => {
    openTabs.value.forEach(tab => {
      if (tab.isDirty) {
        saveTab(tab.id)
      }
    })
  }
  
  // 后退
  const goBack = () => {
    if (!canGoBack.value) return
    
    currentHistoryIndex.value--
    const path = navigationHistory.value[currentHistoryIndex.value]
    if (path) {
      openFile(path)
    }
  }
  
  // 前进
  const goForward = () => {
    if (!canGoForward.value) return
    
    currentHistoryIndex.value++
    const path = navigationHistory.value[currentHistoryIndex.value]
    if (path) {
      openFile(path)
    }
  }
  
  // 添加到历史记录
  const addToHistory = (path: string) => {
    // 如果当前不在历史记录末尾，删除后面的记录
    if (currentHistoryIndex.value < navigationHistory.value.length - 1) {
      navigationHistory.value.splice(currentHistoryIndex.value + 1)
    }
    
    // 如果新路径与当前路径相同，不添加
    if (navigationHistory.value[currentHistoryIndex.value] === path) {
      return
    }
    
    navigationHistory.value.push(path)
    currentHistoryIndex.value = navigationHistory.value.length - 1
  }
  
  // 查找文件（递归）
  const findFileByPath = (
    files: MarkdownFile[],
    path: string
  ): MarkdownFile | null => {
    for (const file of files) {
      if (file.path === path) {
        return file
      }
      if (file.children) {
        const found = findFileByPath(file.children, path)
        if (found) return found
      }
    }
    return null
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    fileTree,
    openTabs,
    activeTabId,
    navigationHistory,
    currentHistoryIndex,
    
    // 计算属性
    activeTab,
    canGoBack,
    canGoForward,
    hasDirtyTabs,
    
    // 方法
    initializeFileTree,
    openFile,
    closeTab,
    switchTab,
    updateTabContent,
    switchTabMode,
    saveTab,
    saveAllTabs,
    goBack,
    goForward,
    findFileByPath
  }
})
