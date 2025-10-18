/**
 * 基础布局插件类
 * 提供插件的通用实现，子类只需覆盖必要的方法
 */

import type {
  ILayoutPlugin,
  IDataAdapter,
  DataFormat,
  StyleRules,
  FinalStyleRules,
  UserStyleConfig,
  LayoutOptions,
  LayoutResult,
  ConfigSchema,
  PluginMixin,
  PluginConfig,
  G6GraphData,
  TreeNodeData,
  G6Node,
  G6Edge,
  NodeStyleData,
  EdgeStyleData
} from '../types'

// 为类型安全起见保留别名
type G6NodeData = G6Node
type G6EdgeData = G6Edge

export abstract class BaseLayoutPlugin implements ILayoutPlugin {
  // 基础信息（子类必须实现）
  abstract name: string
  abstract displayName: string
  abstract version: string
  description?: string
  
  // 支持的数据格式
  abstract supportedDataFormats: DataFormat[]
  
  // 混入列表
  mixins: PluginMixin[] = []
  
  // 配置存储
  protected config: PluginConfig = {}
  
  /**
   * 创建数据适配器（子类可选实现）
   */
  createDataAdapter(): IDataAdapter | IDataAdapter[] {
    return [] // 默认不使用适配器
  }
  
  /**
   * 获取默认样式（子类应该实现）
   */
  getDefaultStyles(): StyleRules {
    return {
      node: {
        size: 20,
        fill: '#5B8FF9',
        stroke: '#fff',
        lineWidth: 2
      },
      edge: {
        lineWidth: 2,
        opacity: 0.6,
        stroke: '#99a9bf'
      }
    }
  }
  
  /**
   * 合并样式（提供默认实现）
   */
  mergeStyles(
    dataStyles: G6GraphData,
    pluginStyles: StyleRules,
    userConfig?: UserStyleConfig
  ): FinalStyleRules {
    // 应用混入的样式修改
    let finalPluginStyles = pluginStyles
    for (const mixin of this.mixins) {
      if (mixin.modifyStyles) {
        finalPluginStyles = mixin.modifyStyles(finalPluginStyles, this)
      }
    }
    
    return {
      node: (node: G6NodeData): NodeStyleData => {
        // 1. 插件基础样式
        const baseStyle = typeof finalPluginStyles.node === 'function'
          ? finalPluginStyles.node(node)
          : finalPluginStyles.node || {}
        
        // 2. 数据源样式
        const dataStyle = node.style || node.data?.style || {}
        
        // 3. 用户自定义样式
        const userStyle = userConfig?.node?.(node) || {}
        
        // 智能合并
        return {
          ...baseStyle,
          ...dataStyle,
          ...userStyle
        } as NodeStyleData
      },
      
      edge: (edge: G6EdgeData): EdgeStyleData => {
        const baseStyle = typeof finalPluginStyles.edge === 'function'
          ? finalPluginStyles.edge(edge)
          : finalPluginStyles.edge || {}
        
        const dataStyle = edge.style || {}
        const userStyle = userConfig?.edge?.(edge) || {}
        
        return {
          ...baseStyle,
          ...dataStyle,
          ...userStyle
        } as EdgeStyleData
      }
    }
  }
  
  /**
   * 执行布局（子类必须实现）
   */
  abstract execute(
    data: G6GraphData | TreeNodeData | unknown, 
    options?: LayoutOptions
  ): Promise<LayoutResult>
  
  /**
   * 获取配置Schema（子类可选实现）
   */
  getConfigSchema(): ConfigSchema {
    return {}
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): PluginConfig {
    return { ...this.config }
  }
  
  /**
   * 更新配置
   */
  configure(config: PluginConfig): void {
    this.config = { ...this.config, ...config }
    
    // 应用混入的配置修改
    for (const mixin of this.mixins) {
      if (mixin.modifyConfig) {
        this.config = mixin.modifyConfig(this.config, this)
      }
    }
  }
  
  /**
   * 注册混入
   */
  use(mixin: PluginMixin): this {
    this.mixins.push(mixin)
    console.log(`[${this.name}] 注册混入: ${mixin.name}`)
    return this
  }
  
  /**
   * 前置钩子（可选）
   */
  async beforeLayout(
    data: G6GraphData | TreeNodeData | unknown
  ): Promise<G6GraphData | TreeNodeData | unknown> {
    return data
  }
  
  /**
   * 后置钩子（可选）
   */
  async afterLayout(result: LayoutResult): Promise<LayoutResult> {
    return result
  }
  
  /**
   * 执行完整的布局流程（包含钩子）
   */
  async executeWithHooks(
    data: G6GraphData | TreeNodeData | unknown, 
    options?: LayoutOptions
  ): Promise<LayoutResult> {
    // 1. 前置钩子 - 插件自己的
    let processedData = await this.beforeLayout(data)
    
    // 2. 前置钩子 - 混入的
    for (const mixin of this.mixins) {
      if (mixin.beforeLayout) {
        processedData = await mixin.beforeLayout(
          processedData as G6GraphData | TreeNodeData, 
          this
        )
      }
    }
    
    // 3. 执行布局
    let result = await this.execute(processedData, options)
    
    // 4. 后置钩子 - 插件自己的
    result = await this.afterLayout(result)
    
    // 5. 后置钩子 - 混入的
    for (const mixin of this.mixins) {
      if (mixin.afterLayout) {
        result = await mixin.afterLayout(result, this)
      }
    }
    
    return result
  }
}

