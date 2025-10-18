/**
 * StarChart 布局插件系统 - 类型定义
 * 
 * 核心设计理念：
 * 1. 插件自包含：每个插件包含算法、样式、配置
 * 2. 样式分层：数据源样式 → 层级样式 → 插件样式 → 用户样式
 * 3. 适配器解耦：数据适配器桥接数据源和插件
 * 4. 混入扩展：通过混入系统实现无限扩展
 */

// ==================== 数据格式 ====================

/**
 * 支持的数据格式
 */
export enum DataFormat {
  GRAPH = 'graph',           // 通用图数据 {nodes, edges}
  TREE = 'tree',             // 树形数据 {id, children}
  MULTI_TREE = 'multi-tree', // 多棵树
  HIERARCHY = 'hierarchy'    // 层级数据
}

// ==================== 样式系统 ====================

/**
 * 节点样式
 */
export interface NodeStyle {
  x?: number
  y?: number
  size?: number
  fill?: string
  stroke?: string
  lineWidth?: number
  opacity?: number
  [key: string]: any
}

/**
 * 边样式
 */
export interface EdgeStyle {
  lineWidth?: number
  stroke?: string
  opacity?: number
  [key: string]: any
}

/**
 * 样式规则（可以是静态对象或动态函数）
 */
export interface StyleRules {
  node?: Partial<NodeStyle> | ((node: any) => Partial<NodeStyle>)
  edge?: Partial<EdgeStyle> | ((edge: any) => Partial<EdgeStyle>)
  priority?: StylePriority
}

/**
 * 样式优先级策略
 */
export enum StylePriority {
  DATA_FIRST = 'data',      // 数据源样式优先
  PLUGIN_FIRST = 'plugin',  // 插件样式优先
  USER_FIRST = 'user',      // 用户配置优先
  MERGE = 'merge'           // 智能合并（默认）
}

/**
 * 用户样式配置
 */
export interface UserStyleConfig {
  node?: (node: any) => Partial<NodeStyle>
  edge?: (edge: any) => Partial<EdgeStyle>
}

/**
 * 最终样式规则（经过合并后的）
 */
export interface FinalStyleRules {
  node: (node: any) => Partial<NodeStyle>
  edge: (edge: any) => Partial<EdgeStyle>
}

// ==================== 数据适配器 ====================

/**
 * 数据适配器接口
 */
export interface IDataAdapter {
  name: string
  
  /**
   * 适配数据
   */
  adapt(data: any): Promise<any> | any
  
  /**
   * 是否支持该数据格式
   */
  supports?(data: any): boolean
}

// ==================== 布局系统 ====================

/**
 * 布局选项
 */
export interface LayoutOptions {
  width?: number
  height?: number
  [key: string]: any
}

/**
 * 布局结果
 */
export interface LayoutResult {
  nodes: any[]
  edges?: any[]
  [key: string]: any
}

// ==================== 配置系统 ====================

/**
 * 配置字段类型
 */
export type ConfigFieldType = 
  | 'slider' 
  | 'select' 
  | 'radio' 
  | 'switch' 
  | 'input' 
  | 'color-palette'
  | 'group'

/**
 * 配置字段定义
 */
export interface ConfigField {
  type: ConfigFieldType
  label: string
  description?: string
  default?: any
  visible?: (config: any) => boolean
  [key: string]: any
}

/**
 * 配置Schema（用于生成配置UI）
 */
export interface ConfigSchema {
  [key: string]: ConfigField | {
    type: 'group'
    label: string
    children: { [key: string]: ConfigField }
  }
}

// ==================== 插件混入 ====================

/**
 * 插件混入接口（扩展能力）
 */
export interface PluginMixin {
  name: string
  
  // 生命周期钩子
  beforeLayout?(data: any, plugin: ILayoutPlugin): Promise<any> | any
  afterLayout?(result: LayoutResult, plugin: ILayoutPlugin): Promise<LayoutResult> | LayoutResult
  
  // 样式钩子
  modifyStyles?(styles: StyleRules, plugin: ILayoutPlugin): StyleRules
  
  // 配置钩子
  modifyConfig?(config: any, plugin: ILayoutPlugin): any
}

// ==================== 核心插件接口 ====================

/**
 * 布局插件接口
 * 每个插件是完全自包含的单元
 */
export interface ILayoutPlugin {
  // ===== 基础信息 =====
  name: string
  displayName: string
  version: string
  description?: string
  
  // ===== 数据处理能力 =====
  /**
   * 插件支持的数据格式
   */
  supportedDataFormats: DataFormat[]
  
  /**
   * 创建数据适配器
   */
  createDataAdapter(): IDataAdapter | IDataAdapter[]
  
  // ===== 样式系统 =====
  /**
   * 获取默认样式规则
   */
  getDefaultStyles(): StyleRules
  
  /**
   * 合并样式（数据源 + 插件 + 用户）
   */
  mergeStyles(
    dataStyles: any,
    pluginStyles: StyleRules,
    userConfig?: UserStyleConfig
  ): FinalStyleRules
  
  // ===== 布局算法 =====
  /**
   * 执行布局计算
   */
  execute(data: any, options?: LayoutOptions): Promise<LayoutResult>
  
  // ===== 配置能力 =====
  /**
   * 获取配置Schema
   */
  getConfigSchema(): ConfigSchema
  
  /**
   * 获取当前配置
   */
  getConfig(): any
  
  /**
   * 更新配置
   */
  configure(config: any): void
  
  // ===== 混入系统 =====
  mixins: PluginMixin[]
  
  /**
   * 注册混入
   */
  use(mixin: PluginMixin): this
  
  // ===== 生命周期钩子 =====
  beforeLayout?(data: any): Promise<any> | any
  afterLayout?(result: LayoutResult): Promise<LayoutResult> | LayoutResult
}

// ==================== 插件元数据 ====================

/**
 * 插件元数据（用于注册表）
 */
export interface PluginMetadata {
  name: string
  displayName: string
  version: string
  description?: string
  author?: string
  supportedDataFormats: DataFormat[]
}

