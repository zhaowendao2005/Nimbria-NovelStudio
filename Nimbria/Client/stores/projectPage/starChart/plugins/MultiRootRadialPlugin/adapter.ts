/**
 * 树数据适配器（插件内部使用）
 * 负责将各种格式的数据转换为插件可处理的格式
 */

import { treeToGraphData } from '@antv/g6'
import type { 
  G6GraphData, 
  TreeNodeData, 
  G6NodeData, 
  G6EdgeData 
} from '../types'

export class TreeDataAdapter {
  /**
   * 适配数据
   * 确保输出包含完整的树结构信息（tree, treesData, rootIds）
   */
  async adapt(data: G6GraphData | TreeNodeData | unknown): Promise<G6GraphData> {
    // 类型守卫：检查是否为图数据
    const isGraphData = (d: unknown): d is G6GraphData => {
      return typeof d === 'object' && 
             d !== null && 
             'nodes' in d && 
             'edges' in d &&
             Array.isArray((d as Record<string, unknown>).nodes)
    }
    
    // 类型守卫：检查是否为树数据
    const isTreeData = (d: unknown): d is TreeNodeData => {
      return typeof d === 'object' && 
             d !== null && 
             'id' in d &&
             typeof (d as Record<string, unknown>).id === 'string'
    }
    
    // 情况1：多树数据（treesData 格式）
    if (isGraphData(data) && data.treesData && Array.isArray(data.treesData) && data.treesData.length > 0) {
      const allNodes: G6NodeData[] = []
      const allEdges: G6EdgeData[] = []

      data.treesData.forEach((tree: TreeNodeData) => {
        const converted = treeToGraphData(tree as Record<string, unknown>)
        allNodes.push(...(converted.nodes as G6NodeData[]))
        if (converted.edges) {
          allEdges.push(...(converted.edges as G6EdgeData[]))
        }
      })

      return {
        ...data,
        nodes: allNodes,
        edges: allEdges,
        rootIds: data.rootIds || [],
        treesData: data.treesData,
        tree: data.treesData[0] // 取第一个作为默认 tree
      }
    }

    // 情况2：单树数据（tree 格式）
    if (isTreeData(data) && 'children' in data) {
      const converted = treeToGraphData(data as Record<string, unknown>)
      return {
        nodes: converted.nodes as G6NodeData[],
        edges: (converted.edges || []) as G6EdgeData[],
        rootIds: [data.id],
        tree: data,
        treesData: [data]
      }
    }

    // 情况3：已经是图数据格式
    if (isGraphData(data)) {
      return {
        ...data,
        nodes: data.nodes || [],
        edges: data.edges || [],
        treesData: data.treesData || [],
        tree: data.tree || (data.treesData && data.treesData.length > 0 ? data.treesData[0] : undefined),
        rootIds: data.rootIds || []
      }
    }

    // 默认情况：返回空数据
    console.warn('[TreeDataAdapter] 无法识别数据格式，返回空图数据')
    return {
      nodes: [],
      edges: [],
      treesData: [],
      rootIds: []
    }
  }
}

