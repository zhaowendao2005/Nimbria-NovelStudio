/**
 * 树结构自维护管理器
 * 不依赖 G6 的 treeKey，完全自主管理父子关系和加载状态
 * 
 * 核心职责：
 * 1. 维护完整的父子关系映射
 * 2. 跟踪节点的加载/未加载状态
 * 3. 提供树遍历、查询、统计等工具方法
 * 
 * 优势：
 * - 不依赖 G6 内部树结构
 * - 支持高效的增量更新
 * - 完全类型安全
 */

/**
 * 树节点元数据
 */
interface TreeNode {
  id: string
  parentId: string | null
  children: string[]
  loaded: boolean  // 是否已加载（展开）
  level: number    // 层级（0 = 根节点）
}

/**
 * 树统计信息
 */
interface TreeStats {
  totalNodes: number      // 当前树中总节点数
  rootNodes: number       // 根节点数
  loadedNodes: number     // 已加载（展开）的节点数
  maxLevel: number        // 最大层级
}

/**
 * LazyTreeManager：自维护树管理器
 */
export class LazyTreeManager {
  private treeNodeMap: Map<string, TreeNode> = new Map()
  private rootIds: string[] = []
  
  /**
   * 初始化树（仅根节点，children 为空）
   * @param rootIds 根节点 ID 列表
   */
  initializeRoots(rootIds: string[]) {
    this.rootIds = rootIds
    
    rootIds.forEach(rootId => {
      this.treeNodeMap.set(rootId, {
        id: rootId,
        parentId: null,
        children: [],
        loaded: false,
        level: 0
      })
    })
    
    console.log(`[LazyTreeManager] 初始化完成：${rootIds.length} 个根节点`)
  }
  
  /**
   * 展开节点时：添加子节点到树
   * @param parentId 父节点 ID
   * @param childIds 子节点 ID 列表
   */
  expandNode(parentId: string, childIds: string[]) {
    const parent = this.treeNodeMap.get(parentId)
    if (!parent) {
      console.warn(`[LazyTreeManager] 父节点不存在: ${parentId}`)
      return
    }
    
    // 更新父节点
    parent.children = childIds
    parent.loaded = true
    
    // 添加子节点
    childIds.forEach(childId => {
      if (!this.treeNodeMap.has(childId)) {
        this.treeNodeMap.set(childId, {
          id: childId,
          parentId,
          children: [],
          loaded: false,
          level: parent.level + 1
        })
      }
    })
    
    console.log(`[LazyTreeManager] 展开节点 ${parentId}: ${childIds.length} 个子节点`)
  }
  
  /**
   * 收起节点时：递归删除所有后代节点
   * @param parentId 父节点 ID
   * @returns 被删除的节点 ID 列表
   */
  collapseNode(parentId: string): string[] {
    const parent = this.treeNodeMap.get(parentId)
    if (!parent) {
      console.warn(`[LazyTreeManager] 父节点不存在: ${parentId}`)
      return []
    }
    
    const nodesToRemove: string[] = []
    
    // 递归收集所有后代节点
    const collectDescendants = (nodeId: string) => {
      const node = this.treeNodeMap.get(nodeId)
      if (!node) return
      
      // 收集子节点
      node.children.forEach(childId => {
        nodesToRemove.push(childId)
        collectDescendants(childId)
      })
    }
    
    collectDescendants(parentId)
    
    // 从树中删除后代节点
    nodesToRemove.forEach(id => this.treeNodeMap.delete(id))
    
    // 清空父节点的 children，标记为未加载
    parent.children = []
    parent.loaded = false
    
    console.log(`[LazyTreeManager] 收起节点 ${parentId}: 删除 ${nodesToRemove.length} 个后代节点`)
    
    return nodesToRemove
  }
  
  /**
   * 判断节点是否已加载（展开过）
   * @param nodeId 节点 ID
   * @returns 是否已加载
   */
  isLoaded(nodeId: string): boolean {
    return this.treeNodeMap.get(nodeId)?.loaded ?? false
  }
  
  /**
   * 获取节点的层级
   * @param nodeId 节点 ID
   * @returns 层级（0 = 根节点）
   */
  getLevel(nodeId: string): number {
    return this.treeNodeMap.get(nodeId)?.level ?? 0
  }
  
  /**
   * 获取节点的父节点 ID
   * @param nodeId 节点 ID
   * @returns 父节点 ID，如果是根节点则返回 null
   */
  getParentId(nodeId: string): string | null {
    return this.treeNodeMap.get(nodeId)?.parentId ?? null
  }
  
  /**
   * 获取节点的子节点 ID 列表
   * @param nodeId 节点 ID
   * @returns 子节点 ID 列表
   */
  getChildren(nodeId: string): string[] {
    return this.treeNodeMap.get(nodeId)?.children ?? []
  }
  
  /**
   * 获取所有当前可见的节点 ID
   * @returns 可见节点 ID 列表
   */
  getVisibleNodeIds(): string[] {
    return Array.from(this.treeNodeMap.keys())
  }
  
  /**
   * 获取根节点 ID 列表
   * @returns 根节点 ID 列表
   */
  getRootIds(): string[] {
    return [...this.rootIds]
  }
  
  /**
   * 检查节点是否存在于树中
   * @param nodeId 节点 ID
   * @returns 是否存在
   */
  hasNode(nodeId: string): boolean {
    return this.treeNodeMap.has(nodeId)
  }
  
  /**
   * 获取节点的祖先链（从根到该节点的路径）
   * @param nodeId 节点 ID
   * @returns 祖先节点 ID 列表（从根到父节点）
   */
  getAncestorChain(nodeId: string): string[] {
    const chain: string[] = []
    let currentId: string | null = nodeId
    
    while (currentId !== null) {
      const node = this.treeNodeMap.get(currentId)
      if (!node || node.parentId === null) break
      
      chain.unshift(node.parentId)
      currentId = node.parentId
    }
    
    return chain
  }
  
  /**
   * 获取节点的所有后代节点 ID（递归）
   * @param nodeId 节点 ID
   * @returns 后代节点 ID 列表
   */
  getDescendantIds(nodeId: string): string[] {
    const descendants: string[] = []
    const queue = [nodeId]
    
    while (queue.length > 0) {
      const currentId = queue.shift()!
      const node = this.treeNodeMap.get(currentId)
      
      if (!node) continue
      
      descendants.push(...node.children)
      queue.push(...node.children)
    }
    
    return descendants
  }
  
  /**
   * 获取统计信息
   * @returns 树统计信息
   */
  getStats(): TreeStats {
    let maxLevel = 0
    let loadedCount = 0
    
    this.treeNodeMap.forEach(node => {
      if (node.level > maxLevel) {
        maxLevel = node.level
      }
      if (node.loaded) {
        loadedCount++
      }
    })
    
    return {
      totalNodes: this.treeNodeMap.size,
      rootNodes: this.rootIds.length,
      loadedNodes: loadedCount,
      maxLevel
    }
  }
  
  /**
   * 清空树
   */
  clear() {
    this.treeNodeMap.clear()
    this.rootIds = []
    console.log('[LazyTreeManager] 树已清空')
  }
  
  /**
   * 打印树结构（调试用）
   */
  printTree() {
    console.log('[LazyTreeManager] 当前树结构:')
    
    const printNode = (nodeId: string, indent: string = '') => {
      const node = this.treeNodeMap.get(nodeId)
      if (!node) return
      
      const status = node.loaded ? '📂' : '📁'
      console.log(`${indent}${status} ${nodeId} (level ${node.level}, ${node.children.length} children)`)
      
      node.children.forEach(childId => {
        printNode(childId, indent + '  ')
      })
    }
    
    this.rootIds.forEach(rootId => printNode(rootId))
    
    const stats = this.getStats()
    console.log(`总节点: ${stats.totalNodes}, 已加载: ${stats.loadedNodes}, 最大层级: ${stats.maxLevel}`)
  }
}

