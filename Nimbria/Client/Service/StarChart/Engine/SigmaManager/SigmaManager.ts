/**
 * SigmaManager - Sigma 实例管理器
 * 
 * 职责：
 * - Sigma.js 实例生命周期管理
 * - Graphology Graph 实例管理
 * - Reducer 系统（动态样式）
 * - Camera 访问接口
 */

import Sigma from 'sigma'
import Graph from 'graphology'
import type { Settings } from 'sigma/settings'
import type { Camera } from 'sigma/types'
import type { 
  SigmaManagerAPI, 
  SigmaOptions,
  RefreshOptions,
  NodeReducer,
  EdgeReducer
} from 'Business/StarChart'

interface SigmaManagerState {
  instance: Sigma | null
  graph: Graph | null
  container: HTMLElement | null
  renderMode: 'webgl' | 'canvas'
  lastRefreshTime: number
  isInitialized: boolean
}

export class SigmaManager implements SigmaManagerAPI {
  private state: SigmaManagerState = {
    instance: null,
    graph: null,
    container: null,
    renderMode: 'webgl',
    lastRefreshTime: 0,
    isInitialized: false
  }

  private nodeReducer: NodeReducer | null = null
  private edgeReducer: EdgeReducer | null = null

  /**
   * 创建 Sigma 实例
   */
  async create(container: HTMLElement, options?: SigmaOptions): Promise<void> {
    try {
      if (this.state.isInitialized) {
        throw new Error('[SigmaManager] Sigma 已初始化，请先调用 destroy()')
      }

      // 验证容器
      if (!container || !(container instanceof HTMLElement)) {
        throw new Error('[SigmaManager] 无效的容器元素')
      }

      // 1. 创建 Graphology 图实例
      this.state.graph = new Graph()
      this.state.container = container
      this.state.renderMode = options?.renderMode || 'webgl'

      // 2. 准备 Sigma 配置
      const settings: Partial<Settings> = {
        // 渲染配置
        renderEdgeLabels: options?.renderEdgeLabels ?? false,
        enableEdgeEvents: options?.enableEdgeEvents ?? true,
        
        // Reducer（动态样式的核心机制）
        nodeReducer: (node, data) => {
          if (this.nodeReducer) {
            return this.nodeReducer(node, data)
          }
          return data
        },
        edgeReducer: (edge, data) => {
          if (this.edgeReducer) {
            return this.edgeReducer(edge, data)
          }
          return data
        },
        
        // 合并用户自定义配置
        ...options?.settings
      }

      // 3. 创建 Sigma 实例
      this.state.instance = new Sigma(this.state.graph, container, settings)
      this.state.isInitialized = true

      console.log('[SigmaManager] Sigma 实例创建成功', {
        renderMode: this.state.renderMode,
        container: container.id || 'unnamed'
      })
    } catch (error) {
      console.error('[SigmaManager] 创建 Sigma 实例失败:', error)
      throw error
    }
  }

  /**
   * 销毁 Sigma 实例
   */
  async destroy(): Promise<void> {
    try {
      if (!this.state.isInitialized) {
        console.warn('[SigmaManager] Sigma 未初始化')
        return
      }

      // 销毁 Sigma 实例
      if (this.state.instance) {
        this.state.instance.kill()
        this.state.instance = null
      }

      // 清空 Graph
      if (this.state.graph) {
        this.state.graph.clear()
        this.state.graph = null
      }

      this.state.container = null
      this.state.isInitialized = false
      this.nodeReducer = null
      this.edgeReducer = null

      console.log('[SigmaManager] Sigma 实例已销毁')
    } catch (error) {
      console.error('[SigmaManager] 销毁 Sigma 实例失败:', error)
      throw error
    }
  }

  /**
   * 获取 Sigma 实例（严格类型）
   */
  getInstance(): Sigma {
    if (!this.state.instance) {
      throw new Error('[SigmaManager] Sigma 实例未初始化')
    }
    return this.state.instance
  }

  /**
   * 获取 Graphology Graph 实例（严格类型）
   */
  getGraph(): Graph {
    if (!this.state.graph) {
      throw new Error('[SigmaManager] Graph 实例未初始化')
    }
    return this.state.graph
  }

  /**
   * 获取 Camera 实例
   */
  getCamera(): Camera {
    if (!this.state.instance) {
      throw new Error('[SigmaManager] Sigma 实例未初始化')
    }
    return this.state.instance.getCamera()
  }

  /**
   * 刷新渲染
   */
  refresh(options?: RefreshOptions): void {
    if (!this.state.instance) {
      throw new Error('[SigmaManager] Sigma 实例未初始化')
    }

    try {
      // 调用 Sigma.js 的 refresh 方法
      // skipIndexation: 仅更新颜色等视觉属性时可设为 true（性能优化）
      // schedule: 是否异步渲染（通过 requestAnimationFrame）
      this.state.instance.refresh({
        skipIndexation: options?.skipIndexation ?? false
      })
      
      this.state.lastRefreshTime = Date.now()
    } catch (error) {
      console.error('[SigmaManager] 刷新渲染失败:', error)
      throw error
    }
  }

  /**
   * 设置节点 Reducer（动态样式关键）
   */
  setNodeReducer(reducer: NodeReducer | null): void {
    this.nodeReducer = reducer

    if (this.state.instance) {
      this.state.instance.setSetting('nodeReducer', (node, data) => {
        return reducer ? reducer(node, data) : data
      })
      // 更新 Reducer 后需要刷新
      this.refresh()
    }
  }

  /**
   * 设置边 Reducer
   */
  setEdgeReducer(reducer: EdgeReducer | null): void {
    this.edgeReducer = reducer

    if (this.state.instance) {
      this.state.instance.setSetting('edgeReducer', (edge, data) => {
        return reducer ? reducer(edge, data) : data
      })
      // 更新 Reducer 后需要刷新
      this.refresh()
    }
  }

  /**
   * 获取当前状态（用于调试）
   */
  getState(): Readonly<SigmaManagerState> {
    return { ...this.state }
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.state.isInitialized && this.state.instance !== null
  }
}
