/**
 * StarChart 插件系统核心契约
 * 
 * 设计原则：
 * 1. 只定义插件与系统的接口，不包含具体实现细节
 * 2. 保持稳定，避免频繁修改
 * 3. 插件内部实现细节由各插件自行定义
 */

// ==================== 数据格式 ====================

/**
 * 支持的数据格式（供插件声明）
 */
export type DataFormat = 'graph' | 'tree' | 'multi-tree' | 'hierarchy'

// ==================== 核心数据结构 ====================

/**
 * G6 节点
 */
export interface G6Node {
  id: string
  data?: any
  style?: any
  [key: string]: any
}

/**
 * G6 边
 */
export interface G6Edge {
  source: string
  target: string
  type?: string
  style?: any
  [key: string]: any
}

/**
 * 树节点
 */
export interface TreeNode {
  id: string
  data?: any
  children?: TreeNode[]
  [key: string]: any
}

/**
 * G6 图数据（扩展支持树结构）
 */
export interface G6GraphData {
  nodes: G6Node[]
  edges: G6Edge[]
  
  // 树布局相关元数据（cubic-radial等树布局必需）
  tree?: TreeNode
  treesData?: TreeNode[]
  rootIds?: string[]
  
  [key: string]: any
}

// ==================== 样式系统 ====================

/**
 * 样式规则（可以是静态对象或动态函数）
 */
export interface StyleRules {
  node?: any | ((node: any) => any)
  edge?: any | ((edge: any) => any)
}

/**
 * 用户样式配置
 */
export interface UserStyleConfig {
  node?: (node: any) => any
  edge?: (edge: any) => any
}

/**
 * 最终样式规则（经过合并后的函数）
 */
export interface FinalStyleRules {
  node: (node: any) => any
  edge: (edge: any) => any
}

// ==================== 数据适配器 ====================

/**
 * 数据适配器接口（插件内部使用）
 */
export interface IDataAdapter {
  /**
   * 适配数据
   */
  adapt(data: any): Promise<any> | any
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
 * 布局结果（必须包含完整的图数据和树结构信息）
 */
export interface LayoutResult extends G6GraphData {
  // 继承 G6GraphData 的所有字段
  // 布局计算后应保留所有原始字段
}

/**
 * 配置项定义
 */
export interface ConfigItem {
  type: 'slider' | 'select' | 'switch' | 'input'
  label: string
  default?: any
  description?: string
  min?: number
  max?: number
  options?: Array<{ label: string; value: any }>
}

/**
 * 配置组
 */
export interface ConfigGroup {
  type: 'group'
  label: string
  children: Record<string, ConfigItem>
}

/**
 * 配置Schema
 */
export interface ConfigSchema {
  [key: string]: ConfigItem | ConfigGroup
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
  
  // ===== 核心方法 =====
  
  /**
   * 执行布局计算
   * @param data 输入数据（可能是任何格式，插件内部负责适配）
   * @param options 布局选项
   * @returns 布局结果（必须包含完整的树结构信息）
   */
  execute(data: any, options?: LayoutOptions): Promise<LayoutResult>
  
  /**
   * 获取默认样式规则
   */
  getDefaultStyles(): StyleRules
  
  /**
   * 合并样式
   * @param dataStyles 数据源样式
   * @param pluginStyles 插件样式
   * @param userConfig 用户配置
   */
  mergeStyles(
    dataStyles: any,
    pluginStyles: StyleRules,
    userConfig?: UserStyleConfig
  ): FinalStyleRules
  
  /**
   * 获取配置Schema
   */
  getConfigSchema(): ConfigSchema
}

// ==================== 混入系统 ====================

/**
 * 插件混入（可选扩展机制）
 */
export interface PluginMixin {
  name: string
  
  // 生命周期钩子
  beforeLayout?(data: any, plugin: ILayoutPlugin): Promise<any> | any
  afterLayout?(result: LayoutResult, plugin: ILayoutPlugin): Promise<LayoutResult> | LayoutResult
  
  // 样式修改
  modifyStyles?(styles: StyleRules, plugin: ILayoutPlugin): StyleRules
  
  // 配置修改
  modifyConfig?(config: any, plugin: ILayoutPlugin): any
}

// ==================== 辅助类型 ====================

/**
 * 节点样式映射（用于样式管理）
 */
export type NodeStyleMap = Record<string, Partial<any>>

/**
 * 边样式映射（用于样式管理）
 */
export type EdgeStyleMap = Record<string, Partial<any>>

/**
 * 适配后的数据（泛型）
 */
export interface AdaptedData extends G6GraphData {
  // 继承 G6GraphData，确保包含树结构信息
}
