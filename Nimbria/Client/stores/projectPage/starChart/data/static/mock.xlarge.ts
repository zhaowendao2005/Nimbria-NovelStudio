/**
 * 超大规模多根径向树数据源
 * 专门为 MultiRootRadialPlugin 设计的数据源
 * 
 * 特点：
 * - 多棵独立的树（每组是一棵树）
 * - 严格的层级结构（便于径向扩散）
 * - 完整的树结构信息（tree, treesData, rootIds）
 * - 可配置节点数，适合性能测试
 */

// ========== 📊 数据规模配置（可修改） ==========
/**
 * 目标节点总数
 * 修改这个值来控制生成的节点数量
 * 推荐值：
 * - 2000-5000: 中等规模测试
 * - 5000-10000: 大规模测试
 * - 10000+: 极限性能测试
 */
const TARGET_NODE_COUNT = 7000

/**
 * 树的数量
 * 自动计算：目标节点数 / 每棵树的平均节点数（约210个）
 */
const TREE_COUNT = Math.max(1, Math.round(TARGET_NODE_COUNT / 210))

/**
 * 每棵树的平均节点数（根据目标自动计算）
 */
const AVG_NODES_PER_TREE = Math.round(TARGET_NODE_COUNT / TREE_COUNT)

// 树结构参数（根据目标节点数动态调整）
const BRANCH_MIN = 8  // 第1层最少分支数
const BRANCH_MAX = 6  // 第1层最多分支数
const CHILD_MIN = 6   // 第2层每分支最少子节点
const CHILD_MAX = 10  // 第2层每分支最多子节点
const GRANDCHILD_PROB = 0.7   // 第3层生成概率（70%）
const GRANDCHILD_MIN = 2      // 第3层最少节点数
const GRANDCHILD_MAX = 4      // 第3层最多节点数
const GREATGRANDCHILD_PROB = 0.4  // 第4层生成概率（40%）
const GREATGRANDCHILD_MIN = 2     // 第4层最少节点数
const GREATGRANDCHILD_MAX = 3     // 第4层最多节点数
// ================================================

import type { G6GraphData, G6Node, G6Edge, TreeNodeData } from '../types'
import type { DataSourceMetadata } from '../base/DataSourceTypes'
import { StaticDataSource, type LoadOptions } from '../base/DataSourceBase'

/**
 * 可配置规模的性能测试数据源
 * 当前配置：${TARGET_NODE_COUNT} 节点，${TREE_COUNT} 棵树
 */
export class MockXLargeDataSource extends StaticDataSource {
  readonly metadata: DataSourceMetadata = {
    id: 'mock-xlarge',
    name: `多根径向树（${TARGET_NODE_COUNT}节点）`,
    category: 'static',
    description: `${TREE_COUNT}棵独立树形结构，专为性能测试设计`,
    estimatedNodeCount: TARGET_NODE_COUNT,
    estimatedEdgeCount: TARGET_NODE_COUNT - TREE_COUNT,  // 边数 = 节点数 - 树的数量
    recommendedLayouts: ['compact-box'],
    requiresPreprocessing: false
  }
  
  private cachedData: G6GraphData | null = null
  
  /**
   * 加载图数据
   */
  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
  async loadGraphData(_options?: LoadOptions): Promise<G6GraphData> {
    if (!this.cachedData) {
      console.log(`[MockXLargeDataSource] 开始生成 ${TARGET_NODE_COUNT} 节点数据（${TREE_COUNT} 棵树，每棵约${AVG_NODES_PER_TREE}节点）...`)
      const startTime = performance.now()
      this.cachedData = this.generateMultiTreeData()
      const endTime = performance.now()
      console.log(`[MockXLargeDataSource] 数据生成完成：${this.cachedData.nodes.length} 节点，耗时: ${(endTime - startTime).toFixed(2)}ms`)
    }
    return this.cachedData
  }
  
  /**
   * 生成多棵树的数据
   * 
   * 结构设计：
   * - 树的数量：${TREE_COUNT} 棵（每棵约 ${AVG_NODES_PER_TREE} 个节点）
   * - 层级结构：
   *   * 第0层：根节点（1个）
   *   * 第1层：${BRANCH_MIN}-${BRANCH_MAX}个主分支
   *   * 第2层：每分支${CHILD_MIN}-${CHILD_MAX}个子节点
   *   * 第3层：${(GRANDCHILD_PROB * 100).toFixed(0)}%概率生成${GRANDCHILD_MIN}-${GRANDCHILD_MAX}个孙节点
   *   * 第4层：${(GREATGRANDCHILD_PROB * 100).toFixed(0)}%概率生成${GREATGRANDCHILD_MIN}-${GREATGRANDCHILD_MAX}个曾孙节点
   * - 每棵树有独立的颜色和groupId
   * - 目标总节点数：约 ${TARGET_NODE_COUNT} 个
   * - 预计总边数：约 ${TARGET_NODE_COUNT - TREE_COUNT} 条（节点数 - 树数量）
   */
  private generateMultiTreeData(): G6GraphData {
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
      
      // 第1层：主分支（使用配置参数）
      const branchCount = BRANCH_MIN + Math.floor(Math.random() * (BRANCH_MAX - BRANCH_MIN + 1))
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
        
        // 第2层：每个分支的子节点（使用配置参数）
        const childCount = CHILD_MIN + Math.floor(Math.random() * (CHILD_MAX - CHILD_MIN + 1))
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
          
          // 第3层：孙节点（使用配置参数）
          if (Math.random() < GRANDCHILD_PROB) {
            const grandChildCount = GRANDCHILD_MIN + Math.floor(Math.random() * (GRANDCHILD_MAX - GRANDCHILD_MIN + 1))
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
              
              // 第4层：曾孙节点（使用配置参数）
              if (Math.random() < GREATGRANDCHILD_PROB) {
                const greatGrandChildCount = GREATGRANDCHILD_MIN + Math.floor(Math.random() * (GREATGRANDCHILD_MAX - GREATGRANDCHILD_MIN + 1))
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
