/**
 * StarChart DataSource
 * 负责决定使用 Mock 数据还是真实 StarChart 数据库
 */

import { Environment } from '@utils/environment'
import type { StarChartGraphData, StarChartNode } from './starChart.types'
import { mockGraphData } from './data.mock'

export class StarChartDataSource {
  /**
   * 加载图数据
   */
  async loadGraphData(): Promise<StarChartGraphData> {
    // 检查是否在 Mock 环境
    if (Environment.shouldUseMock()) {
      console.log('[StarChart DataSource] 使用 Mock 数据')
      console.log('[StarChart DataSource] Mock 数据节点数:', mockGraphData.nodes.length)
      console.log('[StarChart DataSource] Mock 数据边数:', mockGraphData.edges.length)
      return Promise.resolve(mockGraphData)
    }

    // Electron 环境：检查 API 是否可用
    // @ts-expect-error StarChart API 尚未实现
    if (typeof window.nimbria?.starChart?.getGraphData !== 'function') {
      console.log('[StarChart DataSource] StarChart API 未实现，使用 Mock 数据')
      console.log('[StarChart DataSource] Mock 数据节点数:', mockGraphData.nodes.length)
      console.log('[StarChart DataSource] Mock 数据边数:', mockGraphData.edges.length)
      return Promise.resolve(mockGraphData)
    }

    // Electron 环境：调用 StarChart 数据库
    try {
      // @ts-expect-error StarChart API 尚未实现，临时使用 Mock
      const result = await window.nimbria.starChart.getGraphData()
      if (result?.success && result.data) {
        return result.data as StarChartGraphData
      }
      throw new Error(result?.error || '加载失败')
    } catch (error) {
      console.error('[StarChart DataSource] 加载失败，回退到 Mock:', error)
      return mockGraphData
    }
  }

  /**
   * 保存图数据
   */
  async saveGraphData(data: StarChartGraphData): Promise<boolean> {
    if (Environment.shouldUseMock()) {
      console.log('[StarChart DataSource] Mock 保存:', data)
      return Promise.resolve(true)
    }

    // Electron 环境：保存到 StarChart 数据库
    try {
      // @ts-expect-error StarChart API 尚未实现，临时使用 Mock
      const result = await window.nimbria.starChart?.saveGraphData(data)
      return result?.success || false
    } catch (error) {
      console.error('[StarChart DataSource] 保存失败:', error)
      return false
    }
  }

  /**
   * 添加节点
   */
  async addNode(node: StarChartNode): Promise<boolean> {
    if (Environment.shouldUseMock()) {
      console.log('[StarChart DataSource] Mock 添加节点:', node)
      mockGraphData.nodes.push(node)
      return Promise.resolve(true)
    }

    // Electron 环境
    try {
      // @ts-expect-error StarChart API 尚未实现，临时使用 Mock
      const result = await window.nimbria.starChart?.addNode(node)
      return result?.success || false
    } catch (error) {
      console.error('[StarChart DataSource] 添加节点失败:', error)
      return false
    }
  }
}

// 单例导出
export const starChartDataSource = new StarChartDataSource()

