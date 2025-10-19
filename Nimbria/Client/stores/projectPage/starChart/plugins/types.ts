/**
 * StarChart 插件系统核心契约
 * 
 * 设计原则：
 * 1. 只定义插件与系统的接口，不包含具体实现细节
 * 2. 保持稳定，避免频繁修改
 * 3. 插件内部实现细节由各插件自行定义
 */

// 从统一的类型定义中导入
import type {
  G6NodeData,
  G6EdgeData,
  TreeNodeData,
  G6GraphData,
  NodeStyleData,
  EdgeStyleData,
  NodeStyleFunction,
  EdgeStyleFunction,
  StyleRules,
  UserStyleConfig,
  FinalStyleRules,
  LayoutOptions,
  LayoutResult,
  ConfigSchema,
  ConfigItem,
  ConfigGroup,
  ConfigValue
} from '../types/g6.types'

// ==================== 数据格式 ====================

/**
 * 支持的数据格式（供插件声明）
 */
export type DataFormat = 'graph' | 'tree' | 'multi-tree' | 'hierarchy'

// ==================== 重新导出核心类型 ====================

export type {
  // 数据结构 - 同时支持新旧命名
  G6NodeData,
  G6NodeData as G6Node,
  G6EdgeData,
  G6EdgeData as G6Edge,
  TreeNodeData,
  TreeNodeData as TreeNode,
  G6GraphData,
  
  // 样式
  NodeStyleData,
  EdgeStyleData,
  NodeStyleFunction,
  EdgeStyleFunction,
  StyleRules,
  UserStyleConfig,
  FinalStyleRules,
  
  // 布局
  LayoutOptions,
  LayoutResult,
  
  // 配置
  ConfigSchema,
  ConfigItem,
  ConfigGroup,
  ConfigValue
}

// ==================== 数据适配器 ====================

/**
 * 数据适配器接口（插件内部使用）
 */
export interface IDataAdapter {
  /**
   * 适配数据
   * @param data 输入数据（图数据或树数据）
   * @returns 适配后的G6图数据
   */
  adapt(data: G6GraphData | TreeNodeData): Promise<G6GraphData> | G6GraphData
}

// ==================== 插件核心接口 ====================

/**
 * 布局插件接口（所有插件必须实现）
 */
export interface ILayoutPlugin {
  // ===== 元信息 =====
  name: string                       // 唯一标识符
  displayName: string                // 显示名称
  version: string                    // 版本号
  description?: string               // 描述
  
  // ===== 能力声明 =====
  supportedDataFormats: DataFormat[] // 支持的数据格式
  requiresTreeStructure?: boolean    // 是否需要树结构支持（默认 false）
  
  // ===== 核心方法 =====
  
  /**
   * 执行布局计算
   * @param data 输入数据（图数据或树数据，插件内部负责适配）
   * @param options 布局选项
   * @returns 布局结果（必须包含完整的树结构信息）
   */
  execute(
    data: G6GraphData | TreeNodeData, 
    options?: LayoutOptions
  ): Promise<LayoutResult>
  
  /**
   * 获取默认样式规则
   */
  getDefaultStyles(): StyleRules
  
  /**
   * 合并样式
   * @param dataStyles 数据源样式（可能包含在data中）
   * @param pluginStyles 插件样式
   * @param userConfig 用户配置
   */
  mergeStyles(
    dataStyles: G6GraphData,
    pluginStyles: StyleRules,
    userConfig?: UserStyleConfig
  ): FinalStyleRules
  
  /**
   * 获取配置Schema
   */
  getConfigSchema(): ConfigSchema
  
  // ===== 生命周期钩子 =====
  
  /**
   * 插件需要的自定义边类型
   * 返回 { edgeType: EdgeClass } 的映射
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCustomEdges?(): Record<string, any>
  
  /**
   * 插件需要的自定义节点类型
   * 返回 { nodeType: NodeClass } 的映射
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCustomNodes?(): Record<string, any>
  
  /**
   * 获取插件特定的 Graph 配置
   * 这些配置会在创建 Graph 实例时合并
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getGraphConfig?(): Record<string, any>
  
  /**
   * Graph 实例创建后的钩子
   * 插件可以在这里注册事件、初始化交互行为等
   * @param graph G6 Graph 实例
   * @param container 容器 DOM 元素
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onGraphCreated?(graph: any, container: HTMLElement): void | Promise<void>
  
  /**
   * 插件销毁钩子
   * 插件应该在这里清理资源、解绑事件等
   */
  onDestroy?(): void | Promise<void>
}

// ==================== 混入系统 ====================

/**
 * 插件配置对象
 */
export type PluginConfig = Record<string, ConfigValue>

/**
 * 插件混入（可选扩展机制）
 */
export interface PluginMixin {
  name: string
  
  // 生命周期钩子
  beforeLayout?(
    data: G6GraphData | TreeNodeData, 
    plugin: ILayoutPlugin
  ): Promise<G6GraphData | TreeNodeData> | G6GraphData | TreeNodeData
  
  afterLayout?(
    result: LayoutResult, 
    plugin: ILayoutPlugin
  ): Promise<LayoutResult> | LayoutResult
  
  // 样式修改
  modifyStyles?(
    styles: StyleRules, 
    plugin: ILayoutPlugin
  ): StyleRules
  
  // 配置修改
  modifyConfig?(
    config: PluginConfig, 
    plugin: ILayoutPlugin
  ): PluginConfig
}

// ==================== 辅助类型 ====================

/**
 * 节点样式映射（用于样式管理）
 */
export type NodeStyleMap = Record<string, Partial<NodeStyleData>>

/**
 * 边样式映射（用于样式管理）
 */
export type EdgeStyleMap = Record<string, Partial<EdgeStyleData>>

/**
 * 适配后的数据（泛型）
 */
export type AdaptedData = G6GraphData

// ==================== 优化初始化相关类型 ====================

export type {
  IInitializationOptimizer,
  InitializationResult,
  PerformanceMetrics
} from './types/initializer.types'

export {
  ProgressCalculator,
  PerformanceTimer,
  ProcessingSpeedCalculator,
  supportsOptimizedInitialization
} from './types/initializer.types'
