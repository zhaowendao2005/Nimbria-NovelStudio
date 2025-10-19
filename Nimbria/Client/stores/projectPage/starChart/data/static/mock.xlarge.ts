/**
 * 超大规模多根径向树数据源
 * 专门为 MultiRootRadialPlugin 设计的数据源
 * 
 * 特点：
 * - 多棵独立的树（每组是一棵树）
 * - 严格的层级结构（便于径向扩散）
 * - 完整的树结构信息（tree, treesData, rootIds）
 * - 10000+ 节点，适合 WebGL 性能测试
 */

import type { G6GraphData, G6Node, G6Edge, TreeNodeData } from '../types'
import type { DataSourceMetadata } from '../base/DataSourceTypes'
import { StaticDataSource, type LoadOptions } from '../base/DataSourceBase'

/**
 * 超大规模性能测试数据源（10000节点，100棵树）
 */
export class MockXLargeDataSource extends StaticDataSource {
  readonly metadata: DataSourceMetadata = {
    id: 'mock-xlarge',
    name: '多根径向树（10000节点）',
    category: 'static',
    description: '100棵独立树形结构，专为 WebGL 大规模性能测试设计',
    estimatedNodeCount: 10000,
    estimatedEdgeCount: 9900,
    recommendedLayouts: ['compact-box'],
    requiresPreprocessing: false
  }
  
  private cachedData: G6GraphData | null = null
  
  /**
   * 加载图数据
   */
  async loadGraphData(options?: LoadOptions): Promise<G6GraphData> {
    if (!this.cachedData) {
      console.log('[MockXLargeDataSource] 开始生成 10000 节点数据...')
      const startTime = performance.now()
      this.cachedData = this.generateMultiTreeData()
      const endTime = performance.now()
      console.log(`[MockXLargeDataSource] 数据生成完成，耗时: ${(endTime - startTime).toFixed(2)}ms`)
    }
    return this.cachedData
  }
  
  /**
   * 生成多棵树的数据
   * 
   * 结构设计：
   * - 100棵树（每棵树约100个节点）
   * - 每棵树的层级：根节点 → 3-5个分支 → 每分支5-8个子节点 → 部分有孙节点 → 部分有曾孙节点
   * - 每棵树有独立的颜色和groupId
   * - 总节点数约 10000 个
   */
  private generateMultiTreeData(): G6GraphData {
    const TREE_COUNT = 100
    const nodes: G6Node[] = []
    const edges: G6Edge[] = []
    const rootIds: string[] = []
    
    // 生成颜色调色板（HSL 色彩空间均匀分布）
    const treeColors = this.generateColorPalette(TREE_COUNT)
    
    // 为每棵树生成数据
    for (let treeIdx = 0; treeIdx < TREE_COUNT; treeIdx++) {
      const color = treeColors[treeIdx]
      const rootId = `tree${treeIdx}-root`
      
      // 根节点
      nodes.push({
        id: rootId,
        data: {
          label: `根${treeIdx}`,
          hierarchy: 0,
          groupId: treeIdx,
          type: 'root',
          color,
          size: 32 // 根节点较大
        }
      })
      rootIds.push(rootId)
      
      // 第1层：3-5个主分支
      const branchCount = 3 + Math.floor(Math.random() * 3)
      for (let branchIdx = 0; branchIdx < branchCount; branchIdx++) {
        const branchId = `tree${treeIdx}-branch${branchIdx}`
        
        nodes.push({
          id: branchId,
          data: {
            label: `分支${branchIdx}`,
            hierarchy: 1,
            groupId: treeIdx,
            type: 'branch',
            color,
            size: 24 // 分支节点中等大小
          }
        })
        
        edges.push({
          source: rootId,
          target: branchId,
          data: {
            isDirectLine: true,  // 标记为根到第一层的边
            sourceHierarchy: 0,
            targetHierarchy: 1
          }
        })
        
        // 第2层：每个分支5-8个子节点
        const childCount = 5 + Math.floor(Math.random() * 4)
        for (let childIdx = 0; childIdx < childCount; childIdx++) {
          const childId = `tree${treeIdx}-branch${branchIdx}-child${childIdx}`
          
          nodes.push({
            id: childId,
            data: {
              label: `节点${childIdx}`,
              hierarchy: 2,
              groupId: treeIdx,
              type: 'node',
              color,
              size: 20 // 普通节点
            }
          })
          
          edges.push({
            source: branchId,
            target: childId,
            data: {
              sourceHierarchy: 1,
              targetHierarchy: 2
            }
          })
          
          // 第3层：60%概率有2-4个孙节点
          if (Math.random() < 0.6) {
            const grandChildCount = 2 + Math.floor(Math.random() * 3)
            for (let gcIdx = 0; gcIdx < grandChildCount; gcIdx++) {
              const grandChildId = `tree${treeIdx}-branch${branchIdx}-child${childIdx}-gc${gcIdx}`
              
              nodes.push({
                id: grandChildId,
                data: {
                  label: `叶${gcIdx}`,
                  hierarchy: 3,
                  groupId: treeIdx,
                  type: 'leaf',
                  color,
                  size: 16 // 叶节点较小
                }
              })
              
              edges.push({
                source: childId,
                target: grandChildId,
                data: {
                  sourceHierarchy: 2,
                  targetHierarchy: 3
                }
              })
              
              // 第4层：30%概率有1-2个曾孙节点（增加深度）
              if (Math.random() < 0.3) {
                const greatGrandChildCount = 1 + Math.floor(Math.random() * 2)
                for (let ggcIdx = 0; ggcIdx < greatGrandChildCount; ggcIdx++) {
                  const greatGrandChildId = `tree${treeIdx}-branch${branchIdx}-child${childIdx}-gc${gcIdx}-ggc${ggcIdx}`
                  
                  nodes.push({
                    id: greatGrandChildId,
                    data: {
                      label: `末${ggcIdx}`,
                      hierarchy: 4,
                      groupId: treeIdx,
                      type: 'terminal',
                      color,
                      size: 12 // 最小节点
                    }
                  })
                  
                  edges.push({
                    source: grandChildId,
                    target: greatGrandChildId,
                    data: {
                      sourceHierarchy: 3,
                      targetHierarchy: 4
                    }
                  })
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`[MockXLargeDataSource] 生成完成: ${nodes.length} 节点, ${edges.length} 边`)
    
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
   * 生成均匀分布的颜色调色板
   * 使用 HSL 色彩空间确保颜色差异明显
   */
  private generateColorPalette(count: number): string[] {
    const colors: string[] = []
    const hueStep = 360 / count
    
    for (let i = 0; i < count; i++) {
      const hue = (i * hueStep) % 360
      // 使用不同的饱和度和亮度创建变化
      const saturation = 60 + (i % 3) * 15  // 60%, 75%, 90%
      const lightness = 45 + (i % 4) * 10   // 45%, 55%, 65%, 75%
      
      colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`)
    }
    
    return colors
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
  ): TreeNodeData[] {
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
    const buildTree = (nodeId: string): TreeNodeData | null => {
      const node = nodeMap.get(nodeId)
      if (!node) return null
      
      const treeNode: TreeNodeData = {
        id: node.id,
        data: node.data || {}
      }
      
      const children = childrenMap.get(nodeId)
      if (children && children.length > 0) {
        const childNodes = children
          .map(childId => buildTree(childId))
          .filter((n): n is TreeNodeData => n !== null)
        if (childNodes.length > 0) {
          treeNode.children = childNodes
        }
      }
      
      return treeNode
    }
    
    // 为每个根节点构建一棵树
    return rootIds
      .map(rootId => buildTree(rootId))
      .filter((n): n is TreeNodeData => n !== null)
  }
}

// 导出单例
export const mockXLargeDataSource = new MockXLargeDataSource()
