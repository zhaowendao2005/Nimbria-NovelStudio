/**
 * 力导向布局引擎
 * 使用 cytoscape-fcose 算法
 */
import type { RawGraphData, LayoutedNode } from '../data/types'
import type { ILayoutEngine, ForceDirectedLayoutConfig, LayoutConfig } from './types'

export class ForceDirectedLayout implements ILayoutEngine {
  readonly name = 'force-directed' as const
  
  needsCytoscapeCompute(): boolean {
    return true  // 力导向布局需要Cytoscape计算
  }
  
  /**
   * 力导向布局不在这里计算，返回无位置的节点
   * 实际布局由 Cytoscape 的 fcose 算法计算
   */
  compute(data: RawGraphData, config: LayoutConfig): LayoutedNode[] {
    console.log('[ForceDirectedLayout] 准备力导向布局（由Cytoscape计算）')
    
    // 返回带占位位置的节点，实际位置由Cytoscape计算
    return data.nodes.map(node => ({
      ...node,
      position: { x: 0, y: 0 }  // 占位，实际位置由Cytoscape计算
    }))
  }
  
  /**
   * 获取 Cytoscape fcose 布局配置
   */
  getCytoscapeLayoutConfig(config: LayoutConfig) {
    if (config.name !== 'force-directed') {
      throw new Error('配置类型错误：期望 force-directed 布局配置')
    }
    
    const forceConfig = config as ForceDirectedLayoutConfig
    
    return {
      name: 'fcose',
      quality: forceConfig.quality,
      nodeSeparation: forceConfig.nodeSeparation,
      idealEdgeLength: forceConfig.idealEdgeLength,
      nodeRepulsion: forceConfig.nodeRepulsion,
      gravity: forceConfig.gravity,
      gravityRange: forceConfig.gravityRange,
      animate: forceConfig.animate ?? true,
      randomize: forceConfig.randomize ?? false,
      fit: true,
      padding: 50,
      // 性能优化
      numIter: 2500,
      tile: true,
      tilingPaddingVertical: 10,
      tilingPaddingHorizontal: 10
    }
  }
}

