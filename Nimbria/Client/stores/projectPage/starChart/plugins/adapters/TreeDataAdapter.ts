/**
 * 树数据适配器
 * 将树形数据转换为图数据
 */

import { treeToGraphData } from '@antv/g6'
import type { IDataAdapter } from '../types'

export class TreeDataAdapter implements IDataAdapter {
  name = 'tree-data-adapter'
  
  /**
   * 检查是否是树数据
   */
  supports(data: any): boolean {
    return data.treesData !== undefined || (data.id && data.children !== undefined)
  }
  
  /**
   * 将树数据转换为图数据
   */
  adapt(data: any): any {
    // 如果是多棵树
    if (data.treesData && Array.isArray(data.treesData)) {
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
        nodes: allNodes,
        edges: allEdges,
        rootIds: data.rootIds || [],
        // 保留原始树结构，供 cubic-radial 使用
        treesData: data.treesData
      }
    }
    
    // 如果是单棵树
    if (data.id && data.children) {
      const converted = treeToGraphData(data)
      return {
        ...converted,
        // 兼容单树场景，提供 tree 字段
        tree: data
      }
    }
    
    // 已经是图数据，直接返回
    return data
  }
}

