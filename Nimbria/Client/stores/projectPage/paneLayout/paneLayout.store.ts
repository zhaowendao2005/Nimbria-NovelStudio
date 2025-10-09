/**
 * 分屏布局状态管理
 * 负责管理主面板的分屏树结构和焦点控制
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { nanoid } from 'nanoid'
import type { 
  PaneNode, 
  SplitAction, 
  SplitDirection,
  PaneLayoutState 
} from './types'

const STORAGE_KEY = 'nimbria:paneLayout:state'
const STATE_VERSION = 1

export const usePaneLayoutStore = defineStore('projectPage-paneLayout', () => {
  
  // ==================== 状态 ====================
  
  /**
   * 分屏树根节点
   * 初始状态：单个空面板
   */
  const paneTree = ref<PaneNode>({
    id: nanoid(),
    type: 'leaf',
    tabId: null,        // 初始为空
    isFocused: true,
    createdAt: Date.now(),
    lastActiveAt: Date.now()
  })
  
  /**
   * 当前焦点面板 ID
   */
  const focusedPaneId = ref<string>(paneTree.value.id)
  
  // ==================== 计算属性 ====================
  
  /**
   * 获取所有叶子节点（扁平化）
   */
  const allLeafPanes = computed(() => {
    const leaves: PaneNode[] = []
    
    const traverse = (node: PaneNode) => {
      if (node.type === 'leaf') {
        leaves.push(node)
      } else if (node.children) {
        node.children.forEach(traverse)
      }
    }
    
    traverse(paneTree.value)
    return leaves
  })
  
  /**
   * 当前焦点面板节点
   */
  const focusedPane = computed(() => {
    return allLeafPanes.value.find(p => p.id === focusedPaneId.value) || null
  })
  
  /**
   * 面板总数
   */
  const paneCount = computed(() => allLeafPanes.value.length)
  
  /**
   * 是否有多个面板
   */
  const hasMultiplePanes = computed(() => paneCount.value > 1)
  
  // ==================== Actions ====================
  
  /**
   * 设置焦点面板
   */
  const setFocusedPane = (paneId: string) => {
    console.log('[PaneLayout] Setting focus to pane:', paneId)
    
    // 1. 更新焦点 ID
    focusedPaneId.value = paneId
    
    // 2. 更新树中的 isFocused 标记
    const updateFocus = (node: PaneNode): PaneNode => {
      if (node.type === 'leaf') {
        return {
          ...node,
          isFocused: node.id === paneId,
          lastActiveAt: node.id === paneId ? Date.now() : node.lastActiveAt
        }
      } else if (node.children) {
        return {
          ...node,
          children: [
            updateFocus(node.children[0]),
            updateFocus(node.children[1])
          ] as [PaneNode, PaneNode]
        }
      }
      return node
    }
    
    paneTree.value = updateFocus(paneTree.value)
  }
  
  /**
   * 执行分屏操作
   * @param paneId 要分屏的面板 ID
   * @param action 分屏操作类型
   * @param tabId 关联的标签页 ID
   * @returns 新创建的面板 ID，失败返回 null
   */
  const executeSplitAction = (
    paneId: string, 
    action: SplitAction, 
    tabId: string
  ): string | null => {
    console.log('[PaneLayout] Executing split action:', { paneId, action, tabId })
    
    // 解析操作
    const [, directionStr, actionType] = action.split('-')
    const direction: SplitDirection = directionStr === 'right' ? 'horizontal' : 'vertical'
    const shouldMove = actionType === 'move'
    
    // 创建新面板 ID
    const newPaneId = nanoid()
    
    // 在树中查找目标节点并执行分屏
    const result = findAndSplit(
      paneTree.value, 
      paneId, 
      direction, 
      newPaneId, 
      tabId, 
      shouldMove
    )
    
    if (result) {
      // 更新根节点
      paneTree.value = result.newRoot
      
      // 设置焦点到新面板
      setFocusedPane(newPaneId)
      
      console.log('[PaneLayout] Split successful, new pane:', newPaneId)
      return newPaneId
    }
    
    console.warn('[PaneLayout] Split failed')
    return null
  }
  
  /**
   * 关闭面板
   * @param paneId 要关闭的面板 ID
   */
  const closePane = (paneId: string) => {
    console.log('[PaneLayout] Closing pane:', paneId)
    
    // 如果只有一个面板，清空内容而不关闭
    if (paneCount.value === 1) {
      const updateLeaf = (node: PaneNode): PaneNode => {
        if (node.type === 'leaf' && node.id === paneId) {
          return {
            ...node,
            tabId: null
          }
        } else if (node.children) {
          return {
            ...node,
            children: [
              updateLeaf(node.children[0]),
              updateLeaf(node.children[1])
            ] as [PaneNode, PaneNode]
          }
        }
        return node
      }
      
      paneTree.value = updateLeaf(paneTree.value)
      console.log('[PaneLayout] Cleared last pane content')
      return
    }
    
    // 多个面板时，删除并合并
    const result = findAndRemove(paneTree.value, paneId)
    
    if (result) {
      paneTree.value = result.newRoot
      
      // 如果删除的是焦点面板，切换到第一个可用面板
      if (focusedPaneId.value === paneId) {
        const firstPane = allLeafPanes.value[0]
        if (firstPane) {
          setFocusedPane(firstPane.id)
        }
      }
      
      console.log('[PaneLayout] Pane closed and merged')
    } else {
      console.warn('[PaneLayout] Failed to close pane')
    }
  }
  
  /**
   * 在指定面板中打开标签页
   */
  const openTabInPane = (paneId: string, tabId: string) => {
    console.log('[PaneLayout] Opening tab in pane:', { paneId, tabId })
    
    const updateLeaf = (node: PaneNode): PaneNode => {
      if (node.type === 'leaf' && node.id === paneId) {
        return {
          ...node,
          tabId,
          lastActiveAt: Date.now()
        }
      } else if (node.children) {
        return {
          ...node,
          children: [
            updateLeaf(node.children[0]),
            updateLeaf(node.children[1])
          ] as [PaneNode, PaneNode]
        }
      }
      return node
    }
    
    paneTree.value = updateLeaf(paneTree.value)
    setFocusedPane(paneId)
  }
  
  /**
   * 获取面板对应的标签页 ID
   */
  const getTabIdByPane = (paneId: string): string | null => {
    const pane = allLeafPanes.value.find(p => p.id === paneId)
    return pane?.tabId || null
  }
  
  /**
   * 更新分隔比例
   */
  const updateSplitRatio = (nodeId: string, newRatio: number) => {
    const updateRatio = (node: PaneNode): PaneNode => {
      if (node.id === nodeId && node.type === 'split') {
        return {
          ...node,
          splitRatio: newRatio
        }
      } else if (node.children) {
        return {
          ...node,
          children: [
            updateRatio(node.children[0]),
            updateRatio(node.children[1])
          ] as [PaneNode, PaneNode]
        }
      }
      return node
    }
    
    paneTree.value = updateRatio(paneTree.value)
  }
  
  /**
   * 重置为单面板布局
   */
  const resetLayout = () => {
    console.log('[PaneLayout] Resetting layout')
    
    paneTree.value = {
      id: nanoid(),
      type: 'leaf',
      tabId: null,
      isFocused: true,
      createdAt: Date.now(),
      lastActiveAt: Date.now()
    }
    
    focusedPaneId.value = paneTree.value.id
  }
  
  // ==================== 持久化 ====================
  
  /**
   * 持久化状态
   */
  const persistState = () => {
    try {
      const state: PaneLayoutState = {
        paneTree: paneTree.value,
        focusedPaneId: focusedPaneId.value,
        version: STATE_VERSION
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      console.log('[PaneLayout] State persisted')
    } catch (error) {
      console.error('[PaneLayout] Failed to persist state:', error)
    }
  }
  
  /**
   * 恢复状态
   */
  const restoreState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const state = JSON.parse(saved) as PaneLayoutState
        
        // 检查版本兼容性
        if (state.version === STATE_VERSION && state.paneTree) {
          paneTree.value = state.paneTree
          focusedPaneId.value = state.focusedPaneId || paneTree.value.id
          console.log('[PaneLayout] State restored')
        } else {
          console.warn('[PaneLayout] Incompatible state version, using default')
        }
      }
    } catch (error) {
      console.error('[PaneLayout] Failed to restore state:', error)
    }
  }
  
  // 初始化时恢复状态
  restoreState()
  
  // 监听变化自动持久化（防抖）
  let persistTimer: NodeJS.Timeout | null = null
  watch([paneTree, focusedPaneId], () => {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(persistState, 500)
  }, { deep: true })
  
  return {
    // State
    paneTree,
    focusedPaneId,
    
    // Getters
    allLeafPanes,
    focusedPane,
    paneCount,
    hasMultiplePanes,
    
    // Actions
    setFocusedPane,
    executeSplitAction,
    closePane,
    openTabInPane,
    getTabIdByPane,
    updateSplitRatio,
    resetLayout,
    persistState,
    restoreState
  }
})

// ==================== 辅助函数 ====================

/**
 * 在树中查找节点并执行分屏
 */
function findAndSplit(
  node: PaneNode,
  targetId: string,
  direction: SplitDirection,
  newPaneId: string,
  tabId: string,
  shouldMove: boolean
): { newRoot: PaneNode } | null {
  // 找到目标节点
  if (node.type === 'leaf' && node.id === targetId) {
    // 创建新的叶子节点
    const newLeaf: PaneNode = {
      id: newPaneId,
      type: 'leaf',
      tabId: tabId,
      isFocused: false,
      createdAt: Date.now(),
      lastActiveAt: Date.now()
    }
    
    // 更新原节点
    const originalLeaf: PaneNode = {
      ...node,
      tabId: shouldMove ? null : node.tabId,  // 转移模式下清空原面板
      isFocused: false
    }
    
    // 创建新的 split 节点
    const newSplitNode: PaneNode = {
      id: nanoid(),
      type: 'split',
      direction,
      splitRatio: 50,
      children: [originalLeaf, newLeaf],
      createdAt: Date.now()
    }
    
    return { newRoot: newSplitNode }
  }
  
  // 递归查找
  if (node.type === 'split' && node.children) {
    // 尝试在左子树中查找
    const leftResult = findAndSplit(
      node.children[0], 
      targetId, 
      direction, 
      newPaneId, 
      tabId, 
      shouldMove
    )
    
    if (leftResult) {
      return {
        newRoot: {
          ...node,
          children: [leftResult.newRoot, node.children[1]]
        }
      }
    }
    
    // 尝试在右子树中查找
    const rightResult = findAndSplit(
      node.children[1], 
      targetId, 
      direction, 
      newPaneId, 
      tabId, 
      shouldMove
    )
    
    if (rightResult) {
      return {
        newRoot: {
          ...node,
          children: [node.children[0], rightResult.newRoot]
        }
      }
    }
  }
  
  return null
}

/**
 * 在树中查找并删除节点
 */
function findAndRemove(
  node: PaneNode,
  targetId: string
): { newRoot: PaneNode } | null {
  // 如果当前节点是 split，检查子节点
  if (node.type === 'split' && node.children) {
    // 如果左子节点是目标叶子节点，返回右子节点
    if (node.children[0].type === 'leaf' && node.children[0].id === targetId) {
      return { newRoot: node.children[1] }
    }
    
    // 如果右子节点是目标叶子节点，返回左子节点
    if (node.children[1].type === 'leaf' && node.children[1].id === targetId) {
      return { newRoot: node.children[0] }
    }
    
    // 递归查找左子树
    const leftResult = findAndRemove(node.children[0], targetId)
    if (leftResult) {
      return {
        newRoot: {
          ...node,
          children: [leftResult.newRoot, node.children[1]]
        }
      }
    }
    
    // 递归查找右子树
    const rightResult = findAndRemove(node.children[1], targetId)
    if (rightResult) {
      return {
        newRoot: {
          ...node,
          children: [node.children[0], rightResult.newRoot]
        }
      }
    }
  }
  
  return null
}

