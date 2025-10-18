/**
 * 数据源基类
 * 所有数据源的抽象接口
 */
import type { G6GraphData, LoadOptions } from '../types'
import type { DataSourceMetadata } from './DataSourceTypes'

/**
 * 数据源接口
 */
export interface IDataSource {
  readonly metadata: DataSourceMetadata
  
  /**
   * 加载G6原生格式的图数据
   */
  loadGraphData(options?: LoadOptions): Promise<G6GraphData>
}

/**
 * 静态数据源基类
 */
export abstract class StaticDataSource implements IDataSource {
  abstract readonly metadata: DataSourceMetadata
  abstract loadGraphData(options?: LoadOptions): Promise<G6GraphData>
}

/**
 * 动态数据源基类
 */
export abstract class DynamicDataSource implements IDataSource {
  abstract readonly metadata: DataSourceMetadata
  abstract loadGraphData(options?: LoadOptions): Promise<G6GraphData>
  
  /**
   * 刷新数据
   */
  abstract refresh(): Promise<void>
}

export type { LoadOptions }
