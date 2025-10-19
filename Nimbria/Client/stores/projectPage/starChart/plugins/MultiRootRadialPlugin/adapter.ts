/**
 * 树数据适配器（插件内部使用）
 * 负责将各种格式的数据转换为插件可处理的格式
 */

import { treeToGraphData } from '@antv/g6'
import type { TreeNodeData } from '../types'
import type { 
  RadialPluginInput,
  RadialAdapterOutput,
  RadialGraphDataInput
} from './data.types'
import { 
  isRadialGraphData, 
  isTreeData 
} from './data.types'

export class TreeDataAdapter {
  /**
   * 适配数据
   * 
   * 输入：RadialPluginInput（多种格式）
   * 输出：RadialAdapterOutput（标准化格式）
   * 
   * 确保输出包含完整的树结构信息（tree, treesData, rootIds）
   */
  adapt(data: RadialPluginInput): RadialAdapterOutput {
    
    // ===== 情况1：完整的图数据（含 treesData） =====
    if (isRadialGraphData(data) && data.treesData && data.treesData.length > 0) {
      console.log('[TreeDataAdapter] 检测到多树图数据格式')
      
      const allNodes: RadialAdapterOutput['nodes'] = []
      const allEdges: RadialAdapterOutput['edges'] = []

      data.treesData.forEach((tree: TreeNodeData) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const converted = treeToGraphData(tree as any)
        allNodes.push(...(converted.nodes as RadialAdapterOutput['nodes']))
        if (converted.edges) {
          allEdges.push(...(converted.edges as RadialAdapterOutput['edges']))
        }
      })

      return {
        ...data,
        nodes: allNodes,
        edges: allEdges,
        rootIds: data.rootIds,
        treesData: data.treesData,
        tree: data.treesData[0] // 取第一个作为默认 tree
      } as RadialAdapterOutput
    }

    // ===== 情况2：单树数据（tree 格式） =====
    if (isTreeData(data) && 'children' in data) {
      console.log('[TreeDataAdapter] 检测到单树格式，转换为图数据')
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const converted = treeToGraphData(data as any)
      return {
        nodes: converted.nodes as RadialAdapterOutput['nodes'],
        edges: (converted.edges || []) as RadialAdapterOutput['edges'],
        rootIds: [data.id],
        tree: data,
        treesData: [data]
      }
    }

    // ===== 情况3：图数据格式（但可能缺少 treesData） =====
    if (isRadialGraphData(data)) {
      console.log('[TreeDataAdapter] 检测到基础图数据格式')
      
      // 如果缺少树结构，自动构建
      if (!data.treesData || data.treesData.length === 0 || !data.tree) {
        console.log('[TreeDataAdapter] 缺少树结构，自动从图数据构建...')
        const builtTrees = this.buildTreeStructure(data)
        
        return {
          nodes: data.nodes,
          edges: data.edges,
          rootIds: data.rootIds,
          treesData: builtTrees,
          tree: builtTrees.length > 0 ? builtTrees[0] : undefined
        } as RadialAdapterOutput
      }
      
      return {
        nodes: data.nodes,
        edges: data.edges,
        rootIds: data.rootIds,
        treesData: data.treesData || [],
        tree: data.tree || (data.treesData && data.treesData.length > 0 ? data.treesData[0] : undefined)
      } as RadialAdapterOutput
    }

    // ===== 默认情况：无法识别格式 =====
    console.error('[TreeDataAdapter] 无法识别数据格式，返回空数据')
    console.error('[TreeDataAdapter] 接收到的数据:', data)
    
    return {
      nodes: [],
      edges: [],
      treesData: [],
      rootIds: []
    }
  }

  /**
   * 从图数据构建树结构
   * 
   * 根据 nodes/edges 构建 TreeNodeData 结构，用于支持 cubic-radial 边渲染
   */
  private buildTreeStructure(data: RadialGraphDataInput): TreeNodeData[] {
    const { nodes, edges, rootIds } = data
    
    // 构建邻接表：parent -> children
    const childrenMap = new Map<string, Set<string>>()
    edges.forEach(edge => {
      const children = childrenMap.get(edge.source) || new Set()
      children.add(edge.target)
      childrenMap.set(edge.source, children)
    })
    
    // 为每个根节点构建树
    const trees: TreeNodeData[] = []
    
    rootIds.forEach(rootId => {
      const rootNode = nodes.find(n => n.id === rootId)
      if (!rootNode) {
        console.warn(`[TreeDataAdapter] 未找到根节点: ${rootId}`)
        return
      }
      
      // 递归构建树
      const buildNode = (nodeId: string): TreeNodeData | null => {
        const node = nodes.find(n => n.id === nodeId)
        if (!node) return null
        
        const treeNode: TreeNodeData = {
          id: node.id,
          data: node.data || {},
          children: []
        }
        
        // 递归添加子节点
        const childIds = childrenMap.get(nodeId)
        if (childIds && childIds.size > 0) {
          treeNode.children = Array.from(childIds)
            .map(childId => buildNode(childId))
            .filter((child): child is TreeNodeData => child !== null)
        }
        
        return treeNode
      }
      
      const tree = buildNode(rootId)
      if (tree) {
        trees.push(tree)
      }
    })
    
    console.log(`[TreeDataAdapter] 构建了 ${trees.length} 棵树`)
    return trees
  }
}

