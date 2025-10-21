/**
 * DataManager - 数据管理器
 * 
 * 职责：
 * - 渐进式数据加载（Chunk-based）
 * - 内存数据管理（Hot/Warm/Cold）
 * - 视口裁剪数据加载
 * - 数据卸载和释放
 */

import type Graph from 'graphology'
import type { 
  DataManagerAPI,
  ChunkDescriptor,
  ViewportBounds,
  NodeData,
  EdgeData
} from 'Business/StarChart'
import type { EventBus } from '../EventBus/EventBus'

interface DataChunk {
  id: string
  nodes: NodeData[]
  edges: EdgeData[]
  bounds: ViewportBounds
  loadedAt: number
}

export type ChunkLoaderFunction = (chunkId: string) => Promise<{ nodes: NodeData[]; edges: EdgeData[] }>

export class DataManager implements DataManagerAPI {
  private loadedChunks: Map<string, DataChunk> = new Map()
  private hotData: Set<string> = new Set() // 当前可见的节点
  private loadingChunks: Set<string> = new Set() // 正在加载的 chunk

  constructor(
    private graph: Graph,
    private eventBus: EventBus,
    private chunkLoader: ChunkLoaderFunction
  ) {}

  /**
   * 加载数据块
   */
  async loadChunk(chunk: ChunkDescriptor): Promise<void> {
    if (this.loadedChunks.has(chunk.id)) {
      console.log(`[DataManager] Chunk ${chunk.id} 已加载`)
      return
    }

    if (this.loadingChunks.has(chunk.id)) {
      console.log(`[DataManager] Chunk ${chunk.id} 正在加载中`)
      return
    }

    try {
      this.loadingChunks.add(chunk.id)
      this.eventBus.emit('data:loadingStarted', { 
        type: 'chunk', 
        targetId: chunk.id 
      })

      // 从数据源加载（由外部提供）
      const { nodes, edges } = await this.chunkLoader(chunk.id)

      // 添加到 Graphology
      for (const node of nodes) {
        if (!this.graph.hasNode(node.id)) {
          this.graph.addNode(node.id, {
            x: node.x,
            y: node.y,
            size: node.size,
            color: node.color,
            label: node.label,
            type: node.type,
            hidden: node.hidden ?? false,
            forceLabel: node.forceLabel ?? false,
            zIndex: node.zIndex ?? 0,
            highlighted: node.highlighted ?? false,
            ...node.properties
          })
          this.hotData.add(node.id)
        }
      }

      for (const edge of edges) {
        if (!this.graph.hasEdge(edge.id)) {
          this.graph.addEdge(edge.source, edge.target, {
            id: edge.id,
            size: edge.size ?? 1,
            color: edge.color ?? '#ccc',
            label: edge.label,
            type: edge.type,
            hidden: edge.hidden ?? false,
            forceLabel: edge.forceLabel ?? false,
            zIndex: edge.zIndex ?? 0,
            ...edge.properties
          })
        }
      }

      // 记录 Chunk 信息
      this.loadedChunks.set(chunk.id, {
        id: chunk.id,
        nodes,
        edges,
        bounds: chunk.bounds,
        loadedAt: Date.now()
      })

      this.loadingChunks.delete(chunk.id)
      
      this.eventBus.emit('data:chunkLoaded', {
        chunkId: chunk.id,
        nodeCount: nodes.length,
        edgeCount: edges.length
      })

      console.log(`[DataManager] Chunk ${chunk.id} 加载完成`, {
        nodes: nodes.length,
        edges: edges.length
      })
    } catch (error) {
      this.loadingChunks.delete(chunk.id)
      console.error(`[DataManager] 加载 Chunk ${chunk.id} 失败:`, error)
      throw error
    }
  }

  /**
   * 卸载数据块
   */
  async unloadChunk(chunkId: string): Promise<void> {
    const chunk = this.loadedChunks.get(chunkId)
    if (!chunk) {
      console.warn(`[DataManager] Chunk ${chunkId} 未加载`)
      return
    }

    // 从 Graphology 移除节点和边
    for (const node of chunk.nodes) {
      if (this.graph.hasNode(node.id)) {
        this.graph.dropNode(node.id)
        this.hotData.delete(node.id)
      }
    }

    this.loadedChunks.delete(chunkId)
    
    this.eventBus.emit('data:chunkUnloaded', {
      chunkId,
      nodeCount: chunk.nodes.length
    })

    console.log(`[DataManager] Chunk ${chunkId} 已卸载`)
  }

  /**
   * 加载视口内可见数据
   */
  async loadVisibleData(viewportBounds: ViewportBounds): Promise<void> {
    // 这里需要根据视口边界确定需要加载的 Chunks
    // 具体实现由 Graph 层提供（不同图有不同的分块策略）
    console.log('[DataManager] 加载视口数据:', viewportBounds)
  }

  /**
   * 获取已加载的数据块
   */
  getLoadedChunks(): ReadonlySet<string> {
    return new Set(this.loadedChunks.keys())
  }

  /**
   * 清空所有数据
   */
  clearAll(): void {
    // 清空 Graph
    this.graph.clear()
    
    // 清空记录
    this.loadedChunks.clear()
    this.hotData.clear()
    this.loadingChunks.clear()

    console.log('[DataManager] 所有数据已清空')
  }

  /**
   * 获取内存统计
   */
  getMemoryStats() {
    return {
      loadedChunks: this.loadedChunks.size,
      hotNodes: this.hotData.size,
      loadingChunks: this.loadingChunks.size,
      totalNodes: this.graph.order,
      totalEdges: this.graph.size
    }
  }

  /**
   * 检查节点是否在内存中
   */
  isNodeLoaded(nodeId: string): boolean {
    return this.hotData.has(nodeId)
  }

  /**
   * 批量添加节点（优化性能）
   */
  addNodes(nodes: NodeData[]): void {
    for (const node of nodes) {
      if (!this.graph.hasNode(node.id)) {
        this.graph.addNode(node.id, {
          x: node.x,
          y: node.y,
          size: node.size,
          color: node.color,
          label: node.label,
          type: node.type,
          hidden: node.hidden ?? false,
          forceLabel: node.forceLabel ?? false,
          zIndex: node.zIndex ?? 0,
          highlighted: node.highlighted ?? false,
          ...node.properties
        })
        this.hotData.add(node.id)
      }
    }
  }

  /**
   * 批量移除节点
   */
  removeNodes(nodeIds: string[]): void {
    for (const nodeId of nodeIds) {
      if (this.graph.hasNode(nodeId)) {
        this.graph.dropNode(nodeId)
        this.hotData.delete(nodeId)
      }
    }
  }
}

