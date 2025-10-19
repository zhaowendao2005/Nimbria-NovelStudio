/**
 * 数据源管理器（G6原生版）
 * 统一管理不同数据源的加载，直接返回G6格式数据
 */
import type { G6GraphData, DataSourceType } from './types'
import type { IDataSource, LoadOptions } from './base/DataSourceBase'
import type { DataSourceMetadata } from './base/DataSourceTypes'

// 导入所有数据源
import { mockNormalDataSource } from './static/mock.normal'
import { mockLargeDataSource } from './static/mock.large'
import { mockXLargeDataSource } from './static/mock.xlarge'
// import { mcrecipeDataSource } from './static/mcrecipe.static'
// import { gunDataSource } from './dynamic/gun.adapter'

/**
 * 数据源管理器
 */
export class DataSourceManager {
  private dataSources = new Map<DataSourceType, IDataSource>()
  
  constructor() {
    // 注册所有数据源
    this.register(mockNormalDataSource)
    this.register(mockLargeDataSource)
    this.register(mockXLargeDataSource)
    // this.register(mcrecipeDataSource)
    // this.register(gunDataSource)
  }
  
  /**
   * 注册数据源
   */
  register(dataSource: IDataSource): void {
    const type = dataSource.metadata.id
    if (this.dataSources.has(type)) {
      console.warn(`[DataSourceManager] 数据源 ${type} 已存在，将被覆盖`)
    }
    this.dataSources.set(type, dataSource)
  }
  
  /**
   * 获取数据源
   */
  getDataSource(sourceType: DataSourceType): IDataSource | undefined {
    return this.dataSources.get(sourceType)
  }
  
  /**
   * 获取所有数据源元信息
   */
  getAllMetadata(): DataSourceMetadata[] {
    return Array.from(this.dataSources.values()).map(ds => ds.metadata)
  }
  
  /**
   * 加载G6原生格式图数据
   */
  async loadData(sourceType: DataSourceType, options?: LoadOptions): Promise<G6GraphData> {
    const dataSource = this.dataSources.get(sourceType)
    
    if (!dataSource) {
      throw new Error(`未知数据源类型: ${sourceType}`)
    }
    
    try {
      const data = await dataSource.loadGraphData(options)
      return data
    } catch (error) {
      console.error(`[DataSourceManager] ❌ 加载失败:`, error)
      throw error
    }
  }
  
  /**
   * 检查数据源是否可用
   */
  isAvailable(sourceType: DataSourceType): boolean {
    return this.dataSources.has(sourceType)
  }
  
  /**
   * 获取推荐的布局类型
   */
  getRecommendedLayouts(sourceType: DataSourceType): string[] {
    const dataSource = this.dataSources.get(sourceType)
    return dataSource?.metadata.recommendedLayouts || []
  }
}

// 单例导出
export const dataSourceManager = new DataSourceManager()

