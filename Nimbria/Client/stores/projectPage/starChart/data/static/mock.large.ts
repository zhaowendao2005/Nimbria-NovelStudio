/**
 * 性能测试数据源 - 400节点 + 2500边
 * 静态Mock数据，用于性能测试
 */
import type { G6GraphData, G6Node, G6Edge } from '../types'
import type { DataSourceMetadata } from '../base/DataSourceTypes'
import { StaticDataSource, type LoadOptions } from '../base/DataSourceBase'

/**
 * 大规模性能测试数据源
 */
export class MockLargeDataSource extends StaticDataSource {
  readonly metadata: DataSourceMetadata = {
    id: 'mock-large',
    name: '性能测试数据（400节点）',
    category: 'static',
    description: '分组层级化的大规模测试数据，用于测试渲染性能',
    estimatedNodeCount: 400,
    estimatedEdgeCount: 2500,
    recommendedLayouts: ['concentric', 'force-directed'],
    requiresPreprocessing: false
  }
  
  // 缓存生成的数据
  private cachedData: G6GraphData | null = null
  
  /**
   * 加载图数据
   */
  async loadGraphData(options?: LoadOptions): Promise<G6GraphData> {
    if (!this.cachedData) {
      this.cachedData = this.generateData()
    }
    return this.cachedData
  }
  
  /**
   * 生成分组层级化的大规模测试数据（树形结构）
   */
  private generateData(): G6GraphData {
    const nodes: G6Node[] = []
    const edges: G6Edge[] = []
    
    const GROUP_COUNT = 20  // 组数（每组是独立的树）
    const NODES_PER_GROUP = 20  // 每组节点数（包含根）
    
    // 20种不同颜色（每组一个颜色）
    const groupColors = [
      '#ff6b6b', '#f06595', '#cc5de8', '#845ef7', '#5c7cfa',
      '#339af0', '#22b8cf', '#20c997', '#51cf66', '#94d82d',
      '#ffd43b', '#ffc078', '#ff922b', '#ff6b6b', '#f06595',
      '#e64980', '#be4bdb', '#7950f2', '#4c6ef5', '#228be6'
    ]
    
    const rootIds: string[] = []
    
    // 为每个组生成独立的树形结构
    for (let groupIdx = 0; groupIdx < GROUP_COUNT; groupIdx++) {
      const color = groupColors[groupIdx] || '#868e96'
      const groupRoot = `g${groupIdx}-root`
      
      // 每个组的根节点（第0层）
      nodes.push({
        id: groupRoot,
        label: `组${groupIdx}`,
        size: 35,
        color,
        hierarchy: 0,
        groupId: groupIdx,
        type: 'group-root'
      })
      
      // 记录根节点ID
      rootIds.push(groupRoot)
      
      // 生成组内的树形层级（1-3层）
      let nodeIndex = 0
      
      // 第1层：每组2个分支
      for (let b = 0; b < 2; b++) {
        const branchId = `g${groupIdx}-b${b}`
        nodes.push({
          id: branchId,
          label: `${groupIdx}-分支${b}`,
          size: 28,
          color,
          hierarchy: 1,
          groupId: groupIdx,
          type: 'branch'
        })
        edges.push({ source: groupRoot, target: branchId })
        
        // 第2层：每个分支3-5个子节点
        const childCount = 3 + Math.floor(Math.random() * 3)
        for (let c = 0; c < childCount; c++) {
          const childId = `g${groupIdx}-n${nodeIndex++}`
          nodes.push({
            id: childId,
            label: `${groupIdx}-节点${nodeIndex}`,
            size: 20 + Math.random() * 8,
            color,
            hierarchy: 2,
            groupId: groupIdx,
            type: 'node',
            score: 0.5 + Math.random() * 0.3
          })
          edges.push({ source: branchId, target: childId })
          
          // 第3层：部分节点有1-2个子节点
          if (Math.random() < 0.4 && nodeIndex < NODES_PER_GROUP - 3) {
            const leafCount = 1 + Math.floor(Math.random() * 2)
            for (let l = 0; l < leafCount; l++) {
              const leafId = `g${groupIdx}-n${nodeIndex++}`
              nodes.push({
                id: leafId,
                label: `${groupIdx}-叶${nodeIndex}`,
                size: 18,
                color,
                hierarchy: 3,
                groupId: groupIdx,
                type: 'leaf',
                score: 0.3 + Math.random() * 0.2
              })
              edges.push({ source: childId, target: leafId })
            }
          }
        }
      }
    }
    
    // 转换为多棵树的数据（用于G6的树布局和cubic-radial边）
    const treesData = this.graphToMultiTreeData(nodes, edges, rootIds)
    
    return {
      nodes,
      edges,
      // @ts-ignore 添加多树数据字段
      treesData,
      rootIds
    }
  }
  
  /**
   * 将图数据转换为多棵树的数据格式
   */
  private graphToMultiTreeData(nodes: G6Node[], edges: G6Edge[], rootIds: string[]): any[] {
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
        data: { ...node }
      }
      
      const children = childrenMap.get(nodeId)
      if (children && children.length > 0) {
        treeNode.children = children.map(childId => buildTree(childId)).filter(Boolean)
      }
      
      return treeNode
    }
    
    // 为每个根节点构建一棵树
    return rootIds.map(rootId => buildTree(rootId)).filter(Boolean)
  }
}

// 导出单例
export const mockLargeDataSource = new MockLargeDataSource()

