/**
 * 数据源管理器
 * 统一管理不同数据源的加载和保存
 */
import type { RawGraphData, DataSourceType } from './types'
import { mockNormalData } from './mock.normal'
import { getLargeMockData } from './mock.large'
import { GunDataAdapter } from './gun.adapter'

export class DataSourceManager {
  private gunAdapter = new GunDataAdapter()
  
  /**
   * 加载图数据
   */
  async loadData(sourceType: DataSourceType): Promise<RawGraphData> {
    switch (sourceType) {
      case 'mock-normal':
        console.log('[DataSource] 📊 加载测试数据A（30节点）')
        return Promise.resolve(mockNormalData)
      
      case 'mock-large':
        console.log('[DataSource] 📊 加载性能测试数据（400节点）')
        return Promise.resolve(getLargeMockData())
      
      case 'gun':
        console.log('[DataSource] 📊 加载Gun数据库数据')
        return this.gunAdapter.loadGraphData()
      
      default:
        throw new Error(`未知数据源类型: ${sourceType}`)
    }
  }
  
  /**
   * 保存图数据
   */
  async saveData(sourceType: DataSourceType, data: RawGraphData): Promise<void> {
    if (sourceType === 'gun') {
      return this.gunAdapter.saveGraphData(data)
    }
    console.log('[DataSource] Mock数据不支持保存')
  }
  
  /**
   * 添加节点
   */
  async addNode(sourceType: DataSourceType, node: RawGraphData['nodes'][0]): Promise<void> {
    if (sourceType === 'gun') {
      return this.gunAdapter.addNode(node)
    }
    console.log('[DataSource] Mock数据不支持添加节点')
  }
  
  /**
   * 添加边
   */
  async addEdge(sourceType: DataSourceType, edge: RawGraphData['edges'][0]): Promise<void> {
    if (sourceType === 'gun') {
      return this.gunAdapter.addEdge(edge)
    }
    console.log('[DataSource] Mock数据不支持添加边')
  }
}

// 单例导出
export const dataSourceManager = new DataSourceManager()

