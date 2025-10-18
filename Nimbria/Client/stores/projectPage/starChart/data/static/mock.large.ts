/**
 * 大规模多根径向树数据源
 * 专门为 MultiRootRadialPlugin 设计的数据源
 * 
 * 特点：
 * - 多棵独立的树（每组是一棵树）
 * - 严格的层级结构（便于径向扩散）
 * - 完整的树结构信息（tree, treesData, rootIds）
 */

import type { G6GraphData, G6Node, G6Edge } from '../types'
import type { DataSourceMetadata } from '../base/DataSourceTypes'
import { StaticDataSource, type LoadOptions } from '../base/DataSourceBase'

/**
 * 大规模性能测试数据源（400节点，20棵树）
 */
export class MockLargeDataSource extends StaticDataSource {
  readonly metadata: DataSourceMetadata = {
    id: 'mock-large',
    name: '多根径向树（400节点）',
    category: 'static',
    description: '20棵独立树形结构，专为多根径向布局设计',
    estimatedNodeCount: 400,
    estimatedEdgeCount: 380,
    recommendedLayouts: ['compact-box'],
    requiresPreprocessing: false
  }
  
  private cachedData: G6GraphData | null = null
  
  /**
   * 加载图数据
   */
  async loadGraphData(options?: LoadOptions): Promise<G6GraphData> {
    if (!this.cachedData) {
      this.cachedData = this.generateMultiTreeData()
    }
    return this.cachedData
  }
  
  /**
   * 生成多棵树的数据
   * 
   * 结构设计：
   * - 20棵树（每棵树约20个节点）
   * - 每棵树的层级：根节点 → 2个分支 → 每分支3-5个子节点 → 部分有孙节点
   * - 每棵树有独立的颜色和groupId
   */
  private generateMultiTreeData(): G6GraphData {
    const TREE_COUNT = 20
    const nodes: G6Node[] = []
    const edges: G6Edge[] = []
    const rootIds: string[] = []
    
    // 20种颜色（每棵树一种颜色）
    const treeColors = [
      '#ff6b6b', '#f06595', '#cc5de8', '#845ef7', '#5c7cfa',
      '#339af0', '#22b8cf', '#20c997', '#51cf66', '#94d82d',
      '#ffd43b', '#ffc078', '#ff922b', '#fd7e14', '#f06595',
      '#e64980', '#be4bdb', '#7950f2', '#4c6ef5', '#228be6'
    ]
    
    // 为每棵树生成数据
    for (let treeIdx = 0; treeIdx < TREE_COUNT; treeIdx++) {
      const color = treeColors[treeIdx]
      const rootId = `tree${treeIdx}-root`
      
      // 根节点
      nodes.push({
        id: rootId,
        data: {
          label: `树${treeIdx}`,
          hierarchy: 0,
          groupId: treeIdx,
          type: 'root',
          color
        }
      })
      rootIds.push(rootId)
      
      // 第1层：2个主分支
      for (let branchIdx = 0; branchIdx < 2; branchIdx++) {
        const branchId = `tree${treeIdx}-branch${branchIdx}`
        
        nodes.push({
          id: branchId,
          data: {
            label: `树${treeIdx}-分支${branchIdx}`,
            hierarchy: 1,
            groupId: treeIdx,
            type: 'branch',
            color
          }
        })
        
        edges.push({
          source: rootId,
          target: branchId,
          data: {
            isDirectLine: true  // 标记为根到第一层的边
          }
        })
        
        // 第2层：每个分支3-5个子节点
        const childCount = 3 + Math.floor(Math.random() * 3)
        for (let childIdx = 0; childIdx < childCount; childIdx++) {
          const childId = `tree${treeIdx}-branch${branchIdx}-child${childIdx}`
          
          nodes.push({
            id: childId,
            data: {
              label: `节点${childIdx}`,
              hierarchy: 2,
              groupId: treeIdx,
              type: 'node',
              color
            }
          })
          
          edges.push({
            source: branchId,
            target: childId
          })
          
          // 第3层：40%概率有1-2个孙节点
          if (Math.random() < 0.4) {
            const grandChildCount = 1 + Math.floor(Math.random() * 2)
            for (let gcIdx = 0; gcIdx < grandChildCount; gcIdx++) {
              const grandChildId = `tree${treeIdx}-branch${branchIdx}-child${childIdx}-gc${gcIdx}`
              
              nodes.push({
                id: grandChildId,
                data: {
                  label: `叶${gcIdx}`,
                  hierarchy: 3,
                  groupId: treeIdx,
                  type: 'leaf',
                  color
                }
              })
              
              edges.push({
                source: childId,
                target: grandChildId
              })
            }
          }
        }
      }
    }
    
    // 转换为多树格式
    const treesData = this.graphToMultiTreeData(nodes, edges, rootIds)
    
    return {
      nodes,
      edges,
      treesData,
      rootIds,
      tree: treesData[0]  // 第一棵树作为默认 tree
    } as G6GraphData
  }
  
  /**
   * 将图数据转换为多树格式
   * 
   * @param nodes 节点数组
   * @param edges 边数组
   * @param rootIds 根节点ID数组
   * @returns 多树数组，每个元素是一棵树
   */
  private graphToMultiTreeData(
    nodes: G6Node[],
    edges: G6Edge[],
    rootIds: string[]
  ): any[] {
    // 构建节点映射
    const nodeMap = new Map<string, G6Node>()
    nodes.forEach(n => nodeMap.set(n.id, n))
    
    // 构建子节点映射
    const childrenMap = new Map<string, string[]>()
    edges.forEach(edge => {
      const source = edge.source
      if (!childrenMap.has(source)) {
        childrenMap.set(source, [])
      }
      childrenMap.get(source)!.push(edge.target)
    })
    
    // 递归构建单棵树
    const buildTree = (nodeId: string): any => {
      const node = nodeMap.get(nodeId)
      if (!node) return null
      
      const treeNode: any = {
        id: node.id,
        data: node.data || {}
      }
      
      const children = childrenMap.get(nodeId)
      if (children && children.length > 0) {
        treeNode.children = children
          .map(childId => buildTree(childId))
          .filter(Boolean)
      }
      
      return treeNode
    }
    
    // 为每个根节点构建一棵树
    return rootIds
      .map(rootId => buildTree(rootId))
      .filter(Boolean)
  }
}

// 导出单例
export const mockLargeDataSource = new MockLargeDataSource()
