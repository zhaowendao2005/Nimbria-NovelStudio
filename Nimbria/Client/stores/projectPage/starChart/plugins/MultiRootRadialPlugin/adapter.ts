/**
 * 树数据适配器（插件内部使用）
 * 负责将各种格式的数据转换为插件可处理的格式
 */

import { treeToGraphData } from '@antv/g6'
import type { G6GraphData } from '../types'

export class TreeDataAdapter {
  /**
   * 适配数据
   * 确保输出包含完整的树结构信息（tree, treesData, rootIds）
   */
  async adapt(data: any): Promise<G6GraphData> {
    // 情况1：多树数据（treesData 格式）
    if (data.treesData && Array.isArray(data.treesData) && data.treesData.length > 0) {
      const allNodes: any[] = []
      const allEdges: any[] = []

      data.treesData.forEach((tree: any) => {
        const converted = treeToGraphData(tree)
        allNodes.push(...converted.nodes)
        if (converted.edges) {
          allEdges.push(...converted.edges)
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
    if (data.id && data.children) {
      const converted = treeToGraphData(data)
      return {
        ...data,
        nodes: converted.nodes,
        edges: converted.edges,
        rootIds: [data.id],
        tree: data,
        treesData: [data]
      }
    }

    // 情况3：已经是图数据格式
    return {
      ...data,
      treesData: data.treesData || [],
      tree: data.tree || (data.treesData && data.treesData.length > 0 ? data.treesData[0] : undefined),
      rootIds: data.rootIds || []
    }
  }
}

