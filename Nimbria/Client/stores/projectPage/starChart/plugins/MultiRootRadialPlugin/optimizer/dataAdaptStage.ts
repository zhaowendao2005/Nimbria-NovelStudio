/**
 * 数据适配阶段处理
 * 
 * 负责将输入数据转换为布局算法可以处理的格式
 */

import type { G6GraphData, TreeNodeData } from '../../../types/g6.types'
import type { InitializationProgressMessage } from '@service/starChart/types/worker.types'
import { ProgressCalculator } from '../../types/initializer.types'

/**
 * 数据适配阶段执行器
 */
export class DataAdaptStage {
  private progressCalc: ProgressCalculator
  
  constructor() {
    this.progressCalc = new ProgressCalculator('data-adapt', [0, 20])
  }
  
  /**
   * 执行数据适配
   * @param data 输入数据
   * @param onProgress 进度回调
   * @returns 适配后的数据
   */
  execute(
    data: G6GraphData | TreeNodeData,
    onProgress: (progress: InitializationProgressMessage) => void
  ): G6GraphData {
    // 阶段开始
    onProgress(this.progressCalc.createProgressMessage(
      0,
      '正在验证输入数据...',
      {}
    ))
    
    // 判断数据类型
    const isGraphData = this.isGraphData(data)
    
    if (isGraphData) {
      // 已经是图数据，直接返回
      onProgress(this.progressCalc.createProgressMessage(
        0.5,
        '数据格式验证通过',
        {}
      ))
      
      const graphData = data as G6GraphData
      
      // 验证数据完整性
      this.validateGraphData(graphData)
      
      onProgress(this.progressCalc.createProgressMessage(
        1.0,
        '数据适配完成',
        { totalNodes: graphData.nodes?.length || 0 }
      ))
      
      return graphData
    } else {
      // 树数据，需要转换为图数据
      onProgress(this.progressCalc.createProgressMessage(
        0.3,
        '正在转换树形数据为图数据...',
        {}
      ))
      
      const treeData = data as TreeNodeData
      const graphData = this.convertTreeToGraph(treeData, onProgress)
      
      onProgress(this.progressCalc.createProgressMessage(
        1.0,
        '数据适配完成',
        { totalNodes: graphData.nodes?.length || 0 }
      ))
      
      return graphData
    }
  }
  
  /**
   * 判断是否为图数据
   */
  private isGraphData(data: G6GraphData | TreeNodeData): boolean {
    return 'nodes' in data && 'edges' in data
  }
  
  /**
   * 验证图数据完整性
   */
  private validateGraphData(data: G6GraphData): void {
    if (!data.nodes || !Array.isArray(data.nodes)) {
      throw new Error('[DataAdaptStage] 无效的图数据：缺少 nodes 数组')
    }
    
    if (!data.edges || !Array.isArray(data.edges)) {
      throw new Error('[DataAdaptStage] 无效的图数据：缺少 edges 数组')
    }
    
    // 验证节点 ID 唯一性
    const nodeIds = new Set<string>()
    for (const node of data.nodes) {
      if (!node.id) {
        throw new Error('[DataAdaptStage] 节点缺少 id 字段')
      }
      if (nodeIds.has(node.id)) {
        throw new Error(`[DataAdaptStage] 节点 ID 重复: ${node.id}`)
      }
      nodeIds.add(node.id)
    }
    
    console.log(`[DataAdaptStage] 数据验证通过: ${data.nodes.length} 节点, ${data.edges.length} 边`)
  }
  
  /**
   * 将树数据转换为图数据
   */
  private convertTreeToGraph(
    treeData: TreeNodeData,
    onProgress: (progress: InitializationProgressMessage) => void
  ): G6GraphData {
    const nodes: G6GraphData['nodes'] = []
    const edges: G6GraphData['edges'] = []
    
    // 递归遍历树
    const traverse = (node: TreeNodeData, parentId?: string) => {
      // 添加节点
      nodes.push({
        id: node.id,
        data: node.data || {}
      })
      
      // 如果有父节点，添加边
      if (parentId) {
        edges.push({
          source: parentId,
          target: node.id,
          data: {}
        })
      }
      
      // 递归处理子节点
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          traverse(child, node.id)
        }
      }
    }
    
    traverse(treeData)
    
    onProgress(this.progressCalc.createProgressMessage(
      0.8,
      `已转换 ${nodes.length} 个节点`,
      { totalNodes: nodes.length }
    ))
    
    // 构建图数据
    const graphData: G6GraphData = {
      nodes,
      edges,
      tree: treeData,
      rootIds: [treeData.id]
    }
    
    return graphData
  }
}

