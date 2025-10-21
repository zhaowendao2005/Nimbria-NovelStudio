/**
 * RecipeGraph - MC 配方图实现
 * 
 * 职责：
 * - 实现配方数据的渐进式加载
 * - 节点展开/收起逻辑
 * - 六边形分区渲染
 * - 弧形布局算法
 */

import { BaseGraph, type GraphConfig } from '../BaseGraph'
import type { StarChartEngineAPI, NodeData, EdgeData } from 'Business/StarChart'

interface RecipeNode extends NodeData {
  modId?: string
  hasChildren?: boolean
  children?: string[]
  expanded?: boolean
  nodeType?: 'top' | 'bottom' | 'loop' | 'regular'
}

interface RecipeEdge extends EdgeData {
  platform?: string
  weight?: number
}

interface RecipeGraphConfig extends GraphConfig {
  readonly enableHexagonBoundaries?: boolean
  readonly enableAutoExpand?: boolean
}

export class RecipeGraph extends BaseGraph {
  private expandedNodes: Set<string> = new Set()
  private activatedRegions: Set<string> = new Set()
  private expansionHistory: Map<string, Set<string>> = new Map()

  constructor(engine: StarChartEngineAPI, config: RecipeGraphConfig) {
    super(engine, config)
  }

  /**
   * 初始化图
   */
  async initialize(): Promise<void> {
    console.log('[RecipeGraph] 开始初始化...')

    // 1. 设置 nodeReducer（动态样式）
    this.engine.sigmaManager.setNodeReducer((node, data) => {
      // 展开的节点放大并高亮
      if (this.expandedNodes.has(node)) {
        return {
          ...data,
          size: data.size * 1.2,
          borderColor: '#FF0000',
          borderSize: 2
        }
      }
      return data
    })

    // 2. 绑定交互事件
    this.engine.eventBus.on('node:doubleClick', (event: any) => {
      this.handleNodeDoubleClick(event.node)
    })

    this.engine.eventBus.on('node:click', (event: any) => {
      this.handleNodeClick(event.node)
    })

    this.engine.eventBus.on('node:hover', (event: any) => {
      this.handleNodeHover(event.node)
    })

    console.log('[RecipeGraph] 初始化完成')
  }

  /**
   * 加载图数据
   */
  async load(): Promise<void> {
    console.log('[RecipeGraph] 开始加载数据...')

    // 加载初始数据（顶层节点 + 循环节点）
    await this.loadInitialData()

    console.log('[RecipeGraph] 数据加载完成')
  }

  /**
   * 销毁图
   */
  async destroy(): Promise<void> {
    this.expandedNodes.clear()
    this.activatedRegions.clear()
    this.expansionHistory.clear()
    
    // 清空所有数据
    this.engine.dataManager.clearAll()

    console.log('[RecipeGraph] 已销毁')
  }

  // ==================== 数据加载实现 ====================

  protected async loadChunkData(chunkId: string): Promise<{ nodes: RecipeNode[]; edges: RecipeEdge[] }> {
    // TODO: 从数据库或 API 加载配方数据
    // 这里是占位实现
    console.log(`[RecipeGraph] 加载 Chunk: ${chunkId}`)
    
    return {
      nodes: [],
      edges: []
    }
  }

  protected async getChunkDescriptors(): Promise<any[]> {
    // TODO: 返回所有 Chunk 的描述（六边形分区）
    return []
  }

  private async loadInitialData(): Promise<void> {
    // 加载顶层节点
    const topNodes: RecipeNode[] = [
      {
        id: 'top-1',
        x: 0,
        y: 0,
        size: 15,
        color: '#4A90E2',
        label: '顶层物品 1',
        nodeType: 'top',
        hasChildren: true,
        expanded: false
      }
    ]

    // 添加到 DataManager
    this.engine.dataManager.addNodes(topNodes)

    // 刷新渲染
    this.engine.sigmaManager.refresh()
  }

  // ==================== 布局计算实现 ====================

  protected async computeLayout(nodes: any[], edges: any[]): Promise<any> {
    // 调用 AsyncTaskManager 进行后台布局计算
    const result = await this.engine.asyncTask.computeLayout(
      nodes,
      edges,
      'force-directed',
      {
        iterations: 100,
        nodeSpacing: 50,
        repulsion: 1000,
        attraction: 30
      }
    )

    // 将结果写回 Graphology
    for (const [nodeId, position] of Object.entries(result.positions)) {
      if (this.graph.hasNode(nodeId)) {
        this.graph.setNodeAttribute(nodeId, 'x', (position as any).x)
        this.graph.setNodeAttribute(nodeId, 'y', (position as any).y)
      }
    }

    return result
  }

  protected async updateLayout(changedNodeIds: string[]): Promise<void> {
    // 增量布局更新
    console.log('[RecipeGraph] 更新布局:', changedNodeIds)
  }

  // ==================== 交互逻辑实现 ====================

  protected handleNodeClick(nodeId: string): void {
    console.log('[RecipeGraph] 节点点击:', nodeId)
    
    // 发送选中事件
    this.engine.eventBus.emit('graph:nodeSelected', { nodeId })
  }

  protected async handleNodeDoubleClick(nodeId: string): Promise<void> {
    console.log('[RecipeGraph] 节点双击:', nodeId)

    if (this.expandedNodes.has(nodeId)) {
      await this.collapseNode(nodeId)
    } else {
      await this.expandNode(nodeId)
    }
  }

  protected handleNodeHover(nodeId: string): void {
    // 悬浮高亮
    this.engine.renderScheduler.scheduleNodeUpdate(nodeId, {
      highlighted: true
    })
  }

  // ==================== 展开/收起逻辑 ====================

  private async expandNode(nodeId: string): Promise<void> {
    // 1. 检查节点是否有子节点
    const hasChildren = this.graph.getNodeAttribute(nodeId, 'hasChildren')
    if (!hasChildren) {
      console.log('[RecipeGraph] 节点无子节点')
      return
    }

    // 2. 加载子节点数据（从数据源）
    const children = await this.loadChildren(nodeId)
    if (children.length === 0) return

    // 3. 计算子节点布局（弧形分布）
    const positions = await this.computeChildrenLayout(nodeId, children)

    // 4. 添加子节点到 Graph
    for (const child of children) {
      const position = positions.get(child.id)
      if (!position) continue

      if (!this.graph.hasNode(child.id)) {
        this.graph.addNode(child.id, {
          x: position.x,
          y: position.y,
          size: 10,
          color: '#66BB6A',
          label: child.label,
          type: 'recipe-node'
        })

        // 添加边
        this.graph.addEdge(nodeId, child.id, {
          size: 2,
          color: '#999',
          type: 'crafting-edge'
        })
      } else {
        // 节点已存在，只添加边
        if (!this.graph.hasEdge(nodeId, child.id)) {
          this.graph.addEdge(nodeId, child.id, {
            size: 2,
            color: '#999',
            type: 'crafting-edge'
          })
        }
      }

      // 记录展开历史
      if (!this.expansionHistory.has(child.id)) {
        this.expansionHistory.set(child.id, new Set())
      }
      this.expansionHistory.get(child.id)!.add(nodeId)
    }

    this.expandedNodes.add(nodeId)

    // 5. 刷新渲染（Sigma.js 自动监听）
    this.engine.sigmaManager.refresh()

    console.log(`[RecipeGraph] 节点 ${nodeId} 已展开，添加 ${children.length} 个子节点`)
  }

  private async collapseNode(nodeId: string): Promise<void> {
    const children = this.graph.outNeighbors(nodeId)

    for (const childId of children) {
      const expandedBy = this.expansionHistory.get(childId)
      if (!expandedBy) continue

      // 移除当前父节点的展开记录
      expandedBy.delete(nodeId)

      // 如果子节点不再被任何父节点展开，移除它
      if (expandedBy.size === 0) {
        if (this.graph.hasNode(childId)) {
          this.graph.dropNode(childId)
        }
        this.expansionHistory.delete(childId)
      } else {
        // 只删除这条边
        if (this.graph.hasEdge(nodeId, childId)) {
          this.graph.dropEdge(nodeId, childId)
        }
      }
    }

    this.expandedNodes.delete(nodeId)

    // 刷新渲染
    this.engine.sigmaManager.refresh()

    console.log(`[RecipeGraph] 节点 ${nodeId} 已收起`)
  }

  private async loadChildren(nodeId: string): Promise<RecipeNode[]> {
    // TODO: 从数据源加载子节点
    // 这里是模拟数据
    return [
      {
        id: `${nodeId}-child-1`,
        x: 0,
        y: 0,
        size: 10,
        color: '#66BB6A',
        label: `Child 1 of ${nodeId}`
      },
      {
        id: `${nodeId}-child-2`,
        x: 0,
        y: 0,
        size: 10,
        color: '#66BB6A',
        label: `Child 2 of ${nodeId}`
      }
    ]
  }

  private async computeChildrenLayout(
    parentId: string,
    children: RecipeNode[]
  ): Promise<Map<string, { x: number; y: number }>> {
    const positions = new Map<string, { x: number; y: number }>()
    
    // 获取父节点位置
    const parentX = this.graph.getNodeAttribute(parentId, 'x') as number
    const parentY = this.graph.getNodeAttribute(parentId, 'y') as number

    // 弧形分布
    const radius = 150
    const arcAngle = Math.PI * 0.8 // 144 度
    const childCount = children.length

    children.forEach((child, i) => {
      const angleOffset = (arcAngle / (childCount - 1 || 1)) * i - arcAngle / 2
      const angle = angleOffset

      positions.set(child.id, {
        x: parentX + Math.cos(angle) * radius,
        y: parentY + Math.sin(angle) * radius
      })
    })

    return positions
  }
}

