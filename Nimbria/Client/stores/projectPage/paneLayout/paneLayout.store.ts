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
const STATE_VERSION = 2  // 🔥 升级版本，清理旧格式缓存（tabId -> tabIds）

export const usePaneLayoutStore = defineStore('projectPage-paneLayout', () => {
  
  // ==================== 状态 ====================
  
  /**
   * 分屏树根节点
   * 🔥 可以为 null（表示欢迎页状态）
   * 初始状态：单个空面板
   */
  const paneTree = ref<PaneNode | null>({
    id: nanoid(),
    type: 'leaf',
    tabIds: [],         // 初始为空数组
    activeTabId: null,  // 无激活标签
    isFocused: true,
    createdAt: Date.now(),
    lastActiveAt: Date.now()
  })
  
  /**
   * 当前焦点面板 ID
   * 🔥 可以为 null（表示欢迎页状态）
   */
  const focusedPaneId = ref<string | null>(paneTree.value?.id || null)
  
  // ==================== 计算属性 ====================
  
  /**
   * 获取所有叶子节点（扁平化）
   * 🔥 当 paneTree 为 null 时返回空数组
   */
  const allLeafPanes = computed(() => {
    if (!paneTree.value) return []
    
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
  
  /**
   * 🔥 是否有面板（paneTree 不为 null）
   */
  const hasPanes = computed(() => paneTree.value !== null)
  
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
          lastActiveAt: node.id === paneId ? Date.now() : (node.lastActiveAt || Date.now())
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
    
    if (paneTree.value) {
      paneTree.value = updateFocus(paneTree.value)
    }
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
      paneTree.value!, 
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
  
  // 🔥 closePane 移至后面重新实现（支持欢迎页逻辑）
  
  /**
   * 在指定面板中打开标签页
   */
  const openTabInPane = (paneId: string, tabId: string) => {
    if (!paneTree.value) {
      console.warn('[PaneLayout] Cannot open tab: no pane tree')
      return
    }
    
    console.log('[PaneLayout] Opening tab in pane:', { paneId, tabId })
    
    const updateLeaf = (node: PaneNode): PaneNode => {
      if (node.type === 'leaf' && node.id === paneId) {
        const currentTabIds = node.tabIds || []
        
        // 如果标签已存在，只切换激活状态
        if (currentTabIds.includes(tabId)) {
          return {
            ...node,
            activeTabId: tabId,
            lastActiveAt: Date.now()
          }
        }
        
        // 否则添加新标签
        return {
          ...node,
          tabIds: [...currentTabIds, tabId],
          activeTabId: tabId,
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
    
    if (paneTree.value) {
      paneTree.value = updateLeaf(paneTree.value)
    }
    setFocusedPane(paneId)
  }
  
  /**
   * 关闭面板中的某个标签页
   * 🔥 如果是最后一个标签页，自动删除整个面板节点
   */
  const closeTabInPane = (paneId: string, tabId: string) => {
    console.log('[PaneLayout] Closing tab in pane:', { paneId, tabId })
    
    // 1. 先获取当前面板的标签列表
    const currentPane = allLeafPanes.value.find(p => p.id === paneId)
    if (!currentPane) {
      console.warn('[PaneLayout] Pane not found:', paneId)
      return
    }
    
    const currentTabIds = currentPane.tabIds || []
    
    // 2. 检查是否是最后一个标签页
    if (currentTabIds.length === 1 && currentTabIds[0] === tabId) {
      console.log('[PaneLayout] Closing last tab, will delete pane:', paneId)
      // 🔥 关闭整个面板节点
      closePane(paneId)
      return
    }
    
    // 3. 否则只关闭标签页
    const updateLeaf = (node: PaneNode): PaneNode => {
      if (node.type === 'leaf' && node.id === paneId) {
        const newTabIds = currentTabIds.filter(id => id !== tabId)
        
        // 如果删除的是激活标签，切换到第一个标签
        let newActiveTabId: string | null = node.activeTabId || null
        if (node.activeTabId === tabId) {
          newActiveTabId = newTabIds.length > 0 ? (newTabIds[0] || null) : null
        }
        
        return {
          ...node,
          tabIds: newTabIds,
          activeTabId: newActiveTabId,
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
    
    if (paneTree.value) {
      paneTree.value = updateLeaf(paneTree.value)
    }
  }
  
  /**
   * 切换面板中的激活标签页
   */
  const switchTabInPane = (paneId: string, tabId: string) => {
    console.log('[PaneLayout] Switching tab in pane:', { paneId, tabId })
    
    const updateLeaf = (node: PaneNode): PaneNode => {
      if (node.type === 'leaf' && node.id === paneId) {
        return {
          ...node,
          activeTabId: tabId,
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
    
    if (paneTree.value) {
      paneTree.value = updateLeaf(paneTree.value)
    }
  }
  
  /**
   * 获取面板的标签页列表
   */
  const getTabIdsByPane = (paneId: string): string[] => {
    const pane = allLeafPanes.value.find(p => p.id === paneId)
    return pane?.tabIds || []
  }
  
  /**
   * 获取面板的激活标签页 ID
   */
  const getActiveTabIdByPane = (paneId: string): string | null => {
    const pane = allLeafPanes.value.find(p => p.id === paneId)
    return pane?.activeTabId || null
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
    
    if (paneTree.value) {
      paneTree.value = updateRatio(paneTree.value)
    }
  }
  
  /**
   * 重置为单面板布局
   */
  const resetLayout = () => {
    console.log('[PaneLayout] Resetting layout')
    
    paneTree.value = {
      id: nanoid(),
      type: 'leaf',
      tabIds: [],
      activeTabId: null,
      isFocused: true,
      createdAt: Date.now(),
      lastActiveAt: Date.now()
    }
    
    focusedPaneId.value = paneTree.value.id
  }
  
  /**
   * 在不同面板间移动标签页
   * @param fromPaneId 源面板ID
   * @param toPaneId 目标面板ID
   * @param tabId 标签页ID
   * @param toIndex 目标位置索引
   */
  const moveTabBetweenPanes = (
    fromPaneId: string,
    toPaneId: string,
    tabId: string,
    toIndex: number
  ) => {
    console.log('[PaneLayout] Moving tab between panes:', {
      fromPaneId,
      toPaneId,
      tabId,
      toIndex
    })
    
    const updateTree = (node: PaneNode): PaneNode => {
      if (node.type === 'leaf') {
        // 从源面板移除
        if (node.id === fromPaneId) {
          const newTabIds = (node.tabIds || []).filter(id => id !== tabId)
          const newActiveTabId = node.activeTabId === tabId
            ? (newTabIds[0] ?? null)
            : node.activeTabId
          
          return {
            ...node,
            tabIds: newTabIds,
            activeTabId: newActiveTabId ?? null
          }
        }
        
        // 添加到目标面板
        if (node.id === toPaneId) {
          const currentTabIds = node.tabIds || []
          const newTabIds = [...currentTabIds]
          
          // 在指定位置插入
          newTabIds.splice(toIndex, 0, tabId)
          
          return {
            ...node,
            tabIds: newTabIds,
            activeTabId: tabId,  // 激活新添加的标签
            lastActiveAt: Date.now()
          }
        }
      } else if (node.children) {
        return {
          ...node,
          children: [
            updateTree(node.children[0]),
            updateTree(node.children[1])
          ] as [PaneNode, PaneNode]
        }
      }
      
      return node
    }
    
    if (paneTree.value) {
      paneTree.value = updateTree(paneTree.value)
    }
    
    // 设置焦点到目标面板
    setFocusedPane(toPaneId)
  }
  
  /**
   * 重新排序面板内的标签页
   * @param paneId 面板ID
   * @param newTabIds 新的标签页顺序
   */
  const reorderTabsInPane = (paneId: string, newTabIds: string[]) => {
    console.log('[PaneLayout] Reordering tabs in pane:', { paneId, newTabIds })
    
    const updateTree = (node: PaneNode): PaneNode => {
      if (node.type === 'leaf' && node.id === paneId) {
        return {
          ...node,
          tabIds: newTabIds
        }
      } else if (node.children) {
        return {
          ...node,
          children: [
            updateTree(node.children[0]),
            updateTree(node.children[1])
          ] as [PaneNode, PaneNode]
        }
      }
      
      return node
    }
    
    if (paneTree.value) {
      paneTree.value = updateTree(paneTree.value)
    }
  }
  
  /**
   * 🔥 重置为默认单面板布局
   * 用于从欢迎页恢复面板系统
   */
  const resetToDefaultLayout = () => {
    const defaultPane: PaneNode = {
      id: nanoid(),
      type: 'leaf',
      tabIds: [],
      activeTabId: null,
      isFocused: true,
      createdAt: Date.now(),
      lastActiveAt: Date.now()
    }
    
    paneTree.value = defaultPane
    focusedPaneId.value = defaultPane.id
    
    console.log('[PaneLayout] Reset to default single pane layout:', defaultPane.id)
  }
  
  /**
   * 🔥 关闭指定面板
   * 如果是最后一个面板，清空 paneTree（显示欢迎页）
   * 如果是多面板，删除该面板并用兄弟节点替换父容器
   */
  const closePane = (paneId: string) => {
    console.log('🗑️ [PaneLayout] closePane called:', {
      paneId,
      currentPaneCount: paneCount.value,
      allPanes: allLeafPanes.value.map(p => ({ id: p.id, tabCount: p.tabIds?.length || 0 }))
    })
    
    // 1. 如果这是最后一个面板，清空 paneTree（显示欢迎页）
    if (paneCount.value === 1) {
      paneTree.value = null
      focusedPaneId.value = null
      console.log('✅ [PaneLayout] Last pane closed, showing welcome page')
      return
    }
    
    // 2. 多面板时的关闭逻辑：删除该面板并用兄弟节点替换父容器
    if (!paneTree.value) {
      console.error('[PaneLayout] Cannot close pane: no pane tree')
      return
    }
    
    const result = removePaneFromTree(paneTree.value, paneId)
    
    if (result) {
      paneTree.value = result.newRoot
      
      // 如果删除的是焦点面板，切换焦点到第一个可用面板
      if (focusedPaneId.value === paneId) {
        const firstPane = allLeafPanes.value[0]
        if (firstPane) {
          setFocusedPane(firstPane.id)
          console.log('✅ [PaneLayout] Switched focus to pane:', firstPane.id)
        }
      }
      
      console.log('✅ [PaneLayout] Pane closed and tree merged')
    } else {
      console.error('❌ [PaneLayout] Failed to close pane:', paneId)
    }
  }
  
  // ==================== 持久化 ====================
  
  /**
   * 持久化状态
   * 🔥 支持保存 null（欢迎页状态）
   */
  const persistState = () => {
    try {
      const state: PaneLayoutState = {
        paneTree: paneTree.value,  // 可能为 null
        focusedPaneId: focusedPaneId.value,  // 可能为 null
        version: STATE_VERSION
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      console.log('[PaneLayout] State persisted', paneTree.value ? `(${paneCount.value} panes)` : '(welcome page)')
    } catch (error) {
      console.error('[PaneLayout] Failed to persist state:', error)
    }
  }
  
  /**
   * 恢复状态
   * 🔥 增强版：支持恢复 null（欢迎页状态）
   */
  const restoreState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) {
        console.log('[PaneLayout] No saved state, using default')
        return
      }
      
      const state = JSON.parse(saved) as PaneLayoutState
      
      // 检查版本兼容性
      if (state.version !== STATE_VERSION) {
        console.warn('[PaneLayout] Incompatible state version:', {
          saved: state.version,
          current: STATE_VERSION
        })
        // 🔥 清理旧缓存
        localStorage.removeItem(STORAGE_KEY)
        console.log('[PaneLayout] Old cache cleared, using default state')
        return
      }
      
      // 🔥 恢复状态（包括 null）
      if (state.paneTree !== undefined) {
        paneTree.value = state.paneTree
        focusedPaneId.value = state.focusedPaneId
        
        if (state.paneTree === null) {
          console.log('[PaneLayout] Restored empty state (welcome page)')
        } else {
          console.log('[PaneLayout] State restored successfully')
        }
      }
    } catch (error) {
      console.error('[PaneLayout] Failed to restore state:', error)
      // 🔥 恢复失败时清理缓存
      localStorage.removeItem(STORAGE_KEY)
      console.log('[PaneLayout] Corrupted cache cleared')
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
    hasPanes,  // 🔥 新增
    
    // Actions
    setFocusedPane,
    executeSplitAction,
    closePane,  // 🔥 已有，新增逻辑
    openTabInPane,
    closeTabInPane,
    switchTabInPane,
    getTabIdsByPane,
    getActiveTabIdByPane,
    updateSplitRatio,
    resetLayout,
    resetToDefaultLayout,  // 🔥 新增
    moveTabBetweenPanes,
    reorderTabsInPane,
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
      tabIds: [tabId],      // 新面板只包含一个标签
      activeTabId: tabId,
      isFocused: false,
      createdAt: Date.now(),
      lastActiveAt: Date.now()
    }
    
    // 更新原节点
    const currentTabIds = node.tabIds || []
    const newTabIds = shouldMove ? currentTabIds.filter(id => id !== tabId) : currentTabIds
    const newActiveTabId: string | null = shouldMove && node.activeTabId === tabId
      ? (newTabIds[0] || null)
      : (node.activeTabId || null)
    
    const originalLeaf: PaneNode = {
      ...node,
      tabIds: newTabIds,
      activeTabId: newActiveTabId,
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
 * 🔥 从树中删除指定面板节点
 * @param node 当前节点
 * @param targetId 要删除的面板ID
 * @returns 新的根节点，如果删除失败则返回 null
 */
function removePaneFromTree(
  node: PaneNode,
  targetId: string
): { newRoot: PaneNode } | null {
  // 如果当前节点是 split 容器
  if (node.type === 'split' && node.children) {
    const [leftChild, rightChild] = node.children
    
    // 🔥 情况1：左子节点是目标叶子节点 → 用右子节点替换整个容器
    if (leftChild.type === 'leaf' && leftChild.id === targetId) {
      console.log('[removePaneFromTree] Found target in left child, replacing with right child')
      return { newRoot: rightChild }
    }
    
    // 🔥 情况2：右子节点是目标叶子节点 → 用左子节点替换整个容器
    if (rightChild.type === 'leaf' && rightChild.id === targetId) {
      console.log('[removePaneFromTree] Found target in right child, replacing with left child')
      return { newRoot: leftChild }
    }
    
    // 🔥 情况3：递归查找左子树
    const leftResult = removePaneFromTree(leftChild, targetId)
    if (leftResult) {
      console.log('[removePaneFromTree] Target found in left subtree, updating left child')
      return {
        newRoot: {
          ...node,
          children: [leftResult.newRoot, rightChild]
        }
      }
    }
    
    // 🔥 情况4：递归查找右子树
    const rightResult = removePaneFromTree(rightChild, targetId)
    if (rightResult) {
      console.log('[removePaneFromTree] Target found in right subtree, updating right child')
      return {
        newRoot: {
          ...node,
          children: [leftChild, rightResult.newRoot]
        }
      }
    }
  }
  
  // 未找到目标节点
  return null
}

