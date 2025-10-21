/**
 * SigmaManager - Sigma 实例管理器
 * 
 * 职责：
 * - Sigma 实例生命周期管理
 * - 渲染器（WebGL/Canvas）选择和切换
 * - Graph 实例管理
 * - 基础的 refresh 操作
 */

import type { SigmaManagerState, SigmaOptions } from 'Business/StarChart'

export class SigmaManager {
  private state: SigmaManagerState = {
    instance: null,
    graph: null,
    container: null,
    renderMode: 'webgl',
    lastRefreshTime: 0,
    isInitialized: false
  }

  /**
   * 创建 Sigma 实例
   */
  async create(container: HTMLElement, options?: SigmaOptions): Promise<void> {
    try {
      if (this.state.isInitialized) {
        console.warn('[SigmaManager] Sigma 已初始化，请先调用 destroy()')
        return
      }

      // 验证容器
      if (!container || !(container instanceof HTMLElement)) {
        throw new Error('无效的容器元素')
      }

      this.state.container = container
      this.state.renderMode = options?.renderMode || 'webgl'

      // TODO: 实际创建 Sigma 实例
      // 这里需要动态导入 Sigma.js 并初始化
      
      this.state.isInitialized = true
      console.log('[SigmaManager] Sigma 实例创建成功')
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

      // TODO: 清理 Sigma 实例和 Graph
      
      this.state.instance = null
      this.state.graph = null
      this.state.container = null
      this.state.isInitialized = false
      
      console.log('[SigmaManager] Sigma 实例已销毁')
    } catch (error) {
      console.error('[SigmaManager] 销毁 Sigma 实例失败:', error)
      throw error
    }
  }

  /**
   * 获取 Sigma 实例
   */
  getInstance(): any | null {
    return this.state.instance
  }

  /**
   * 获取 Graphology Graph 实例
   */
  getGraph(): any | null {
    return this.state.graph
  }

  /**
   * 刷新渲染
   */
  refresh(): void {
    if (!this.state.isInitialized) {
      console.warn('[SigmaManager] Sigma 未初始化')
      return
    }

    try {
      // TODO: 调用 Sigma 的 refresh 方法
      this.state.lastRefreshTime = Date.now()
    } catch (error) {
      console.error('[SigmaManager] 刷新渲染失败:', error)
    }
  }

  /**
   * 获取当前状态（用于调试）
   */
  getState(): SigmaManagerState {
    return { ...this.state }
  }
}
