/**
 * 树数据适配器（插件内部使用）
 * 负责将各种格式的数据转换为插件可处理的格式
 */

import { treeToGraphData } from '@antv/g6'
import type { G6GraphData, TreeNodeData } from '../types'
import type { 
  RadialPluginInput,
  RadialAdapterOutput,
  RadialGraphDataInput,
  RadialTreeInput
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
  async adapt(data: RadialPluginInput): Promise<RadialAdapterOutput> {
    
    // ===== 情况1：完整的图数据（含 treesData） =====
    if (isRadialGraphData(data) && data.treesData && data.treesData.length > 0) {
      console.log('[TreeDataAdapter] 检测到多树图数据格式')
      
      const allNodes: RadialAdapterOutput['nodes'] = []
      const allEdges: RadialAdapterOutput['edges'] = []

      data.treesData.forEach((tree: TreeNodeData) => {
        const converted = treeToGraphData(tree as Record<string, unknown>)
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
      
      const converted = treeToGraphData(data as Record<string, unknown>)
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
}

