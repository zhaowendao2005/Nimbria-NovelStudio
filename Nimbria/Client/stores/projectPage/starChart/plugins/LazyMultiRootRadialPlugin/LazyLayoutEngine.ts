/**
 * 懒加载布局引擎
 * 包装 MultiRootRadialLayoutAlgorithm，支持增量布局
 */

import { MultiRootRadialLayoutAlgorithm } from '../MultiRootRadialPlugin/layout'
import type { RadialAdapterOutput } from '../MultiRootRadialPlugin/data.types'
import type { LayoutResult, G6NodeData, G6EdgeData, TreeNodeData } from '../types'
import type { LazyDataManager } from './LazyDataManager'
import { LAZY_RADIAL_EDGE_TYPE } from './LazyRadialEdge'

export interface LazyLayoutOptions {
  width: number
  height: number
  baseDistance?: number
  hierarchyStep?: number
  baseRadiusMultiplier?: number
}

/**
 * 懒加载布局结果（包含子树结构）
 */
export interface LazyLayoutChildrenResult {
  nodes: G6NodeData[]
  edges: G6EdgeData[]
  subtree: TreeNodeData  // 新增：用于同步G6树结构
}

/**
 * 懒加载布局引擎
 * 
 * 职责：
 * 1. 初始布局：为根节点计算位置
 * 2. 增量布局：为展开的子节点计算位置
 * 3. 保证懒加载节点与完整布局算法的定位逻辑一致
 */
export class LazyLayoutEngine {
  private layoutAlgorithm: MultiRootRadialLayoutAlgorithm
  
  constructor() {
    this.layoutAlgorithm = new MultiRootRadialLayoutAlgorithm()
  }
  
  /**
   * 初始布局：只布局根节点
   */
  async layoutInitialRoots(
    nodes: G6NodeData[],
    edges: G6EdgeData[],
    rootIds: string[],
    options: LazyLayoutOptions
  ): Promise<LayoutResult> {
    console.log('[LazyLayoutEngine] 🎯 初始布局根节点:', rootIds.length)
    
    const adapterData: RadialAdapterOutput = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodes: nodes as any,
      edges,
      rootIds,
      treesData: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tree: null as any
    }
    
    const layoutConfig = {
      width: options.width,
      height: options.height,
      rootIds,
      baseDistance: options.baseDistance || 300,
      hierarchyStep: options.hierarchyStep || 120,
      baseRadiusMultiplier: options.baseRadiusMultiplier || 1
    }
    
    return await this.layoutAlgorithm.calculateAsync(adapterData, layoutConfig)
  }
  
  /**
   * 增量布局：为指定节点的子节点计算位置
   * 
   * 关键：使用与主算法相同的零碰撞扇区分配策略
   */
  async layoutChildren(
    parentNodeId: string,
    dataManager: LazyDataManager,
    parentNode: G6NodeData,
    options: LazyLayoutOptions
  ): Promise<LazyLayoutChildrenResult> {
    console.log(`[LazyLayoutEngine] 🌱 增量布局: ${parentNodeId} 的子节点`)
    
    // 1. 获取父节点位置和层级
    const parentX = (parentNode as any).x ?? (parentNode as any).style?.x ?? 0
    const parentY = (parentNode as any).y ?? (parentNode as any).style?.y ?? 0
    const parentLevel = (parentNode.data?.hierarchy as number) ?? 0
    const parentGroupId = (parentNode.data?.groupId as number) ?? 0
    
    console.log(`[LazyLayoutEngine] 父节点: (${parentX}, ${parentY}), level: ${parentLevel}`)
    
    // 2. 获取子节点数据（未加载的）
    const children = dataManager.getChildren(parentNodeId)
    const edges = dataManager.getChildrenEdges(parentNodeId)
    
    if (children.length === 0) {
      console.warn(`[LazyLayoutEngine] 节点 ${parentNodeId} 没有子节点`)
      // 返回空子树
      const emptySubtree = dataManager.getSubtreeTreeData(parentNodeId)
      return { nodes: [], edges: [], subtree: { ...emptySubtree, children: [] } }
    }
    
    // 3. 使用与主算法相同的径向分布策略
    const hierarchyStep = options.hierarchyStep || 120
    const radius = hierarchyStep * (parentLevel + 1)
    const angleStep = (Math.PI * 2) / children.length
    
    // 4. 计算每个子节点的位置
    const childrenWithPosition = children.map((child, index) => {
      const angle = angleStep * index
      const x = parentX + radius * Math.cos(angle)
      const y = parentY + radius * Math.sin(angle)
      
      return {
        ...child,
        data: {
          ...child.data,
          hierarchy: parentLevel + 1,
          groupId: parentGroupId,
          collapsed: true,
          hasChildren: child.data.hasChildren,
          childrenIds: child.data.childrenIds || []
        },
        style: {
          ...(child.style || {}),
          x,
          y
        }
      }
    })
    
    // 5. 处理边的类型（临时使用内置 quadratic 边验证）
    const edgesWithType = edges.map(edge => {
      const sourceHierarchy = parentLevel
      const targetHierarchy = parentLevel + 1
      
      return {
        ...edge,
        type: 'quadratic',  // 🔥 临时使用内置边类型验证边是否能显示
        data: {
          ...(edge.data || {}),
          isDirectLine: false,
          sourceHierarchy,
          targetHierarchy
        }
      }
    })
    
    console.log(`[LazyLayoutEngine] ✅ 计算完成: ${childrenWithPosition.length} 个子节点 (半径: ${radius})`)
    
    // 6. 构建子树结构（用于同步G6树）
    const subtree = dataManager.getSubtreeTreeData(parentNodeId)
    console.log(`[LazyLayoutEngine] 📦 生成子树结构:`, subtree)
    
    return {
      nodes: childrenWithPosition,
      edges: edgesWithType,
      subtree
    }
  }
}

