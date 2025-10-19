/**
 * 懒加载数据管理器
 * 核心职责：管理节点的按需加载
 */

import type { G6GraphData, G6Edge, TreeNodeData } from '../types'
import type { LazyNodeData, LazyGraphData } from './types'

export class LazyDataManager {
  private fullNodesMap: Map<string, LazyNodeData> = new Map()
  private childrenMap: Map<string, string[]> = new Map()
  private parentMap: Map<string, string> = new Map()  // 新增：子节点 -> 父节点映射
  private rootIds: string[] = []
  private loadedNodeIds: Set<string> = new Set()  // 跟踪已加载的节点
  
  constructor(graphData: G6GraphData) {
    this.initializeFromGraphData(graphData)
  }
  
  /**
   * 从原始图数据初始化
   */
  private initializeFromGraphData(data: G6GraphData) {
    // 1. 存储所有节点
    data.nodes.forEach(node => {
      this.fullNodesMap.set(node.id, {
        ...node,
        data: {
          ...node.data,
          collapsed: true,
          hasChildren: false,
          childrenIds: [],
          _lazyLoaded: false
        }
      })
    })
    
    // 2. 构建父子关系和父映射
    data.edges.forEach(edge => {
      const parentId = edge.source
      const childId = edge.target
      
      // 父 -> 子列表
      if (!this.childrenMap.has(parentId)) {
        this.childrenMap.set(parentId, [])
      }
      this.childrenMap.get(parentId)!.push(childId)
      
      // 子 -> 父映射
      this.parentMap.set(childId, parentId)
    })
    
    // 3. 更新节点的子节点信息
    this.childrenMap.forEach((childIds, parentId) => {
      const node = this.fullNodesMap.get(parentId)
      if (node) {
        node.data.hasChildren = true
        node.data.childrenIds = childIds
      }
    })
    
    // 4. 识别根节点
    this.rootIds = data.rootIds || this.findRootNodes()
    
    console.log(`[LazyDataManager] 初始化完成：${this.fullNodesMap.size} 个节点，${this.rootIds.length} 个根节点`)
  }
  
  /**
   * 自动识别根节点（没有父节点的节点）
   */
  private findRootNodes(): string[] {
    const allNodeIds = new Set(this.fullNodesMap.keys())
    const childNodeIds = new Set<string>()
    
    this.childrenMap.forEach(children => {
      children.forEach(childId => childNodeIds.add(childId))
    })
    
    return Array.from(allNodeIds).filter(id => !childNodeIds.has(id))
  }
  
  /**
   * 获取初始数据（仅根节点）
   */
  getInitialData(): LazyGraphData {
    const rootNodes = this.rootIds
      .map(id => this.fullNodesMap.get(id))
      .filter((node): node is LazyNodeData => !!node)
    
    console.log(`[LazyDataManager] 获取初始数据：${rootNodes.length} 个根节点`)
    
    return {
      nodes: rootNodes,
      edges: [],  // 初始无边
      rootIds: this.rootIds,
      fullNodesMap: this.fullNodesMap,
      childrenMap: this.childrenMap
    }
  }
  
  /**
   * 获取指定节点的子节点
   */
  getChildren(nodeId: string): LazyNodeData[] {
    const childIds = this.childrenMap.get(nodeId) || []
    return childIds
      .map(id => this.fullNodesMap.get(id))
      .filter((node): node is LazyNodeData => !!node)
      .map(node => ({
        ...node,
        data: {
          ...node.data,
          collapsed: true,
          _lazyLoaded: false
        }
      }))
  }
  
  /**
   * 获取指定节点到其子节点的边
   */
  getChildrenEdges(nodeId: string): G6Edge[] {
    const childIds = this.childrenMap.get(nodeId) || []
    return childIds.map(childId => ({
      source: nodeId,
      target: childId,
      data: {
        sourceHierarchy: this.fullNodesMap.get(nodeId)?.data?.hierarchy || 0,
        targetHierarchy: this.fullNodesMap.get(childId)?.data?.hierarchy || 1,
        isDirectLine: this.fullNodesMap.get(nodeId)?.data?.hierarchy === 0  // 根节点到第一层使用直线
      }
    }))
  }
  
  /**
   * 递归获取所有后代节点ID
   */
  getDescendantIds(nodeId: string): string[] {
    const result: string[] = []
    const queue = [nodeId]
    
    while (queue.length > 0) {
      const currentId = queue.shift()!
      const childIds = this.childrenMap.get(currentId) || []
      result.push(...childIds)
      queue.push(...childIds)
    }
    
    return result
  }
  
  /**
   * 标记节点为已加载
   */
  markAsLoaded(nodeId: string) {
    const node = this.fullNodesMap.get(nodeId)
    if (node && node.data) {
      node.data._lazyLoaded = true
      node.data.collapsed = false  // 展开状态
      this.loadedNodeIds.add(nodeId)
    }
  }
  
  /**
   * 标记节点为未加载（收起时调用）
   */
  markAsUnloaded(nodeId: string) {
    const node = this.fullNodesMap.get(nodeId)
    if (node && node.data) {
      node.data._lazyLoaded = false
      node.data.collapsed = true  // 折叠状态
      this.loadedNodeIds.delete(nodeId)
    }
    
    // 递归标记所有后代为未加载
    const descendants = this.getDescendantIds(nodeId)
    descendants.forEach(id => {
      const descendant = this.fullNodesMap.get(id)
      if (descendant && descendant.data) {
        descendant.data._lazyLoaded = false
        descendant.data.collapsed = true
        this.loadedNodeIds.delete(id)
      }
    })
  }
  
  /**
   * 检查节点是否已加载
   */
  isNodeLoaded(nodeId: string): boolean {
    return this.loadedNodeIds.has(nodeId)
  }
  
  /**
   * 获取已加载的节点ID列表
   */
  getLoadedNodeIds(): string[] {
    return Array.from(this.loadedNodeIds)
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalNodes: this.fullNodesMap.size,
      rootNodes: this.rootIds.length,
      loadedNodes: this.loadedNodeIds.size,
      avgChildrenPerNode: Array.from(this.childrenMap.values())
        .reduce((sum, children) => sum + children.length, 0) / this.childrenMap.size
    }
  }
  
  // ==================== 树结构工具方法 ====================
  
  /**
   * 获取节点的完整数据
   */
  getTreeNode(nodeId: string): LazyNodeData | undefined {
    return this.fullNodesMap.get(nodeId)
  }
  
  /**
   * 获取节点的父节点ID
   */
  getParentId(nodeId: string): string | null {
    return this.parentMap.get(nodeId) || null
  }
  
  /**
   * 递归构建子树的TreeNodeData结构
   * 用于同步给G6的树结构
   */
  getSubtreeTreeData(nodeId: string): TreeNodeData {
    const node = this.fullNodesMap.get(nodeId)
    if (!node) {
      throw new Error(`[LazyDataManager] 节点不存在: ${nodeId}`)
    }
    
    const childIds = this.childrenMap.get(nodeId) || []
    const children: TreeNodeData[] = childIds.map(childId => 
      this.getSubtreeTreeData(childId)
    )
    
    const result: TreeNodeData = {
      id: node.id,
      data: node.data,
      children  // 始终包含children字段，即使为空数组，确保树结构完整
    }
    
    return result
  }
  
  /**
   * 获取节点的祖先链（从根到该节点的所有父节点ID）
   */
  getAncestorChain(nodeId: string): string[] {
    const chain: string[] = []
    let currentId: string | null = nodeId
    
    while (currentId !== null) {
      const parentId = this.parentMap.get(currentId)
      if (parentId) {
        chain.unshift(parentId)  // 插入到前面，保持根 -> 子的顺序
        currentId = parentId
      } else {
        break  // 到达根节点
      }
    }
    
    return chain
  }
  
  /**
   * 检查节点的整个子树是否都已加载
   */
  isSubtreeLoaded(nodeId: string): boolean {
    const descendantIds = this.getDescendantIds(nodeId)
    return descendantIds.every(id => this.loadedNodeIds.has(id))
  }
  
  // ==================== 实时树结构构建（用于G6同步） ====================
  
  /**
   * 获取当前已加载（可见）部分的树结构
   * 用于同步给G6的treesData，保证只包含已展开的节点
   */
  getLoadedTrees(): TreeNodeData[] {
    return this.rootIds.map(rootId => this.buildLoadedTreeNode(rootId))
  }
  
  /**
   * 根据loadedNodeIds构建树节点
   * 只有已展开的节点才会包含children，未展开的节点children为空
   */
  private buildLoadedTreeNode(nodeId: string): TreeNodeData {
    const node = this.fullNodesMap.get(nodeId)
    if (!node) {
      throw new Error(`[LazyDataManager] 节点不存在: ${nodeId}`)
    }
    
    // 只有已加载（展开）的节点才包含children，否则children为空数组
    let children: TreeNodeData[] = []
    if (this.loadedNodeIds.has(nodeId)) {
      const childIds = this.childrenMap.get(nodeId) || []
      children = childIds
        .map(childId => this.buildLoadedTreeNode(childId))
        .filter(child => child !== null)
    }
    
    const result: TreeNodeData = {
      id: node.id,
      data: node.data,
      children  // 始终包含children字段，保证树结构完整性
    }
    
    return result
  }
}

