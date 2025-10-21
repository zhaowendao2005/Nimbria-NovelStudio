/**
 * BaseGraph - 图抽象基类
 * 
 * 职责：
 * - 定义图的生命周期接口
 * - 提供 Engine 访问
 * - 定义数据加载、布局、交互的抽象方法
 * 
 * 设计理念：
 * - 每个 Graph 是一个独立的业务实现
 * - Graph 包含所有场景特定的逻辑和定制
 * - Engine 提供通用能力，Graph 调用 Engine API
 */

import type { StarChartEngineAPI, GraphData } from 'Business/StarChart'
import type Graph from 'graphology'

export interface GraphConfig {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly maxNodes?: number
  readonly enableProgressiveLoading?: boolean
}

export abstract class BaseGraph {
  protected engine: StarChartEngineAPI
  protected graph: Graph
  protected config: GraphConfig

  constructor(engine: StarChartEngineAPI, config: GraphConfig) {
    this.engine = engine
    this.graph = engine.sigmaManager.getGraph()
    this.config = config
  }

  // ==================== 生命周期钩子 ====================

  /**
   * 初始化图（设置 Reducer、绑定事件等）
   */
  abstract initialize(): Promise<void>

  /**
   * 加载图数据
   */
  abstract load(): Promise<void>

  /**
   * 销毁图
   */
  abstract destroy(): Promise<void>

  // ==================== 数据加载（由子类实现）====================

  /**
   * 加载数据块（具体数据源由子类实现）
   */
  protected abstract loadChunkData(chunkId: string): Promise<{ nodes: any[]; edges: any[] }>

  /**
   * 获取分块描述（定义如何分块）
   */
  protected abstract getChunkDescriptors(): Promise<any[]>

  // ==================== 布局计算（由子类实现）====================

  /**
   * 计算布局
   */
  protected abstract computeLayout(nodes: any[], edges: any[]): Promise<any>

  /**
   * 更新布局（增量）
   */
  protected abstract updateLayout(changedNodeIds: string[]): Promise<void>

  // ==================== 交互逻辑（由子类实现）====================

  /**
   * 处理节点点击
   */
  protected abstract handleNodeClick(nodeId: string): void

  /**
   * 处理节点双击（通常是展开/收起）
   */
  protected abstract handleNodeDoubleClick(nodeId: string): Promise<void>

  /**
   * 处理节点悬浮
   */
  protected abstract handleNodeHover(nodeId: string): void

  // ==================== 通用辅助方法 ====================

  /**
   * 获取图配置
   */
  getConfig(): Readonly<GraphConfig> {
    return { ...this.config }
  }

  /**
   * 获取图统计信息
   */
  getStats() {
    return {
      id: this.config.id,
      name: this.config.name,
      nodeCount: this.graph.order,
      edgeCount: this.graph.size,
      memoryStats: this.engine.dataManager.getMemoryStats()
    }
  }

  /**
   * 导出图数据
   */
  async exportData(format: 'json' | 'graphml'): Promise<string> {
    const data: GraphData = {
      nodes: [],
      edges: []
    }

    this.graph.forEachNode((node, attributes) => {
      data.nodes.push({
        id: node,
        x: attributes.x as number,
        y: attributes.y as number,
        size: attributes.size as number,
        color: attributes.color as string,
        label: attributes.label as string,
        type: attributes.type as string
      })
    })

    this.graph.forEachEdge((edge, attributes, source, target) => {
      data.edges.push({
        id: edge,
        source,
        target,
        size: attributes.size as number,
        color: attributes.color as string,
        label: attributes.label as string,
        type: attributes.type as string
      })
    })

    if (format === 'json') {
      return JSON.stringify(data, null, 2)
    }

    // TODO: 实现 GraphML 导出
    throw new Error('GraphML format not implemented yet')
  }
}

