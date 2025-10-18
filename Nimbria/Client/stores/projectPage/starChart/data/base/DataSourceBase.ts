/**
 * 数据源基类和接口定义
 */
import type { RawGraphData } from '../types'
import type { 
  DataSourceMetadata, 
  DataSourceConfig, 
  LoadOptions, 
  ValidationResult 
} from './DataSourceTypes'
import type { LayoutDataRequirement } from '../../layouts/types'

/**
 * 数据源接口
 * 所有数据源（静态/动态）都必须实现此接口
 */
export interface IDataSource {
  // 元信息
  readonly metadata: DataSourceMetadata
  readonly config: DataSourceConfig
  
  /**
   * 加载图数据
   */
  loadGraphData(options?: LoadOptions): Promise<RawGraphData>
  
  /**
   * 验证数据是否满足布局要求
   */
  validateForLayout(requirement: LayoutDataRequirement): ValidationResult
  
  /**
   * 转换数据以满足布局要求
   */
  transformForLayout(
    data: RawGraphData, 
    requirement: LayoutDataRequirement
  ): Promise<RawGraphData>
  
  /**
   * 增量加载（可选）
   */
  loadIncremental?(offset: number, limit: number): Promise<RawGraphData>
  
  /**
   * 预处理数据（可选）
   */
  preprocess?(rawData: any): Promise<RawGraphData>
}

/**
 * 静态数据源基类
 * 用于本地数据、Mock数据等不变的数据源
 */
export abstract class StaticDataSource implements IDataSource {
  abstract readonly metadata: DataSourceMetadata
  private _config?: DataSourceConfig
  
  get config(): DataSourceConfig {
    if (!this._config) {
      this._config = {
        type: this.metadata.id,
        staticConfig: {
          cacheEnabled: true
        }
      }
    }
    return this._config
  }
  
  constructor(config?: Partial<DataSourceConfig>) {
    // 延迟初始化，等待子类的 metadata 设置完成
    if (config) {
      // 如果有自定义配置，在 getter 中会被合并
      this._config = {
        type: this.metadata?.id || 'unknown',
        ...config,
        staticConfig: {
          cacheEnabled: true,
          ...config.staticConfig
        }
      }
    }
  }
  
  /**
   * 加载图数据（子类必须实现）
   */
  abstract loadGraphData(options?: LoadOptions): Promise<RawGraphData>
  
  /**
   * 默认验证实现（子类可重写）
   */
  validateForLayout(requirement: LayoutDataRequirement): ValidationResult {
    // 基础验证：检查必需字段
    const warnings: string[] = []
    
    if (requirement.metadataRequirements?.zones) {
      warnings.push('此数据源可能不包含分区信息')
    }
    
    return { 
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }
  
  /**
   * 默认转换实现（不转换，子类可重写）
   */
  async transformForLayout(
    data: RawGraphData,
    requirement: LayoutDataRequirement
  ): Promise<RawGraphData> {
    return data
  }
}

/**
 * 动态数据源基类
 * 用于API、数据库等需要连接的动态数据源
 */
export abstract class DynamicDataSource implements IDataSource {
  abstract readonly metadata: DataSourceMetadata
  private _config?: DataSourceConfig
  
  protected connected: boolean = false
  protected lastUpdate: number = 0
  
  get config(): DataSourceConfig {
    if (!this._config) {
      this._config = {
        type: this.metadata.id,
        dynamicConfig: {
          maxRetries: 3
        }
      }
    }
    return this._config
  }
  
  constructor(config?: Partial<DataSourceConfig>) {
    // 延迟初始化，等待子类的 metadata 设置完成
    if (config) {
      this._config = {
        type: this.metadata?.id || 'unknown',
        ...config,
        dynamicConfig: {
          maxRetries: 3,
          ...config.dynamicConfig
        }
      }
    }
  }
  
  /**
   * 连接到数据源
   */
  abstract connect(): Promise<void>
  
  /**
   * 断开连接
   */
  abstract disconnect(): Promise<void>
  
  /**
   * 加载图数据
   */
  abstract loadGraphData(options?: LoadOptions): Promise<RawGraphData>
  
  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.connected
  }
  
  /**
   * 默认验证实现
   */
  validateForLayout(requirement: LayoutDataRequirement): ValidationResult {
    return { valid: true }
  }
  
  /**
   * 默认转换实现
   */
  async transformForLayout(
    data: RawGraphData,
    requirement: LayoutDataRequirement
  ): Promise<RawGraphData> {
    return data
  }
}

