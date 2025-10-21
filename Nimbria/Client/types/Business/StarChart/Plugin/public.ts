/**
 * StarChart 插件对外接口类型
 * 定义所有插件必须实现的接口
 */

import type { StarChartCoreAPI, NodeData, EdgeData, GraphData } from '../Core'

// ==================== 插件基础接口 ====================

export type PluginType = 'data' | 'layout' | 'renderer' | 'interaction' | 'lod' | 'utility'

export interface PluginDependency {
  pluginId: string
  minVersion: string
}

export interface PluginConfig {
  [key: string]: any
}

export interface StarChartPlugin {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly type: PluginType
  readonly description?: string
  readonly dependencies?: PluginDependency[]
  readonly config?: PluginConfig

  /**
   * 插件安装钩子
   */
  install(context: PluginContext): Promise<void> | void

  /**
   * 插件卸载钩子
   */
  uninstall?(): Promise<void> | void
}

// ==================== 插件上下文 ====================

export interface PluginContext {
  /**
   * Core API 统一入口
   */
  readonly core: StarChartCoreAPI

  /**
   * StarChart 配置
   */
  readonly config: StarChartConfig

  /**
   * 插件工具函数
   */
  readonly utils: PluginUtils
}

export interface StarChartConfig {
  layoutType: 'force' | 'tree' | 'circle' | 'grid'
  showLabels: boolean
  nodeSize: number
  edgeWidth: number
  enableZoom: boolean
  enableDrag: boolean
  [key: string]: any
}

export interface PluginUtils {
  /**
   * 生成唯一 ID
   */
  generateId(): string

  /**
   * 日志输出
   */
  log(message: string, level?: 'info' | 'warn' | 'error'): void

  /**
   * 深拷贝
   */
  deepClone<T>(obj: T): T
}

// ==================== 数据适配插件接口 ====================

export interface DataAdapterPlugin extends StarChartPlugin {
  readonly type: 'data'

  /**
   * 适配数据
   */
  adapt(rawData: unknown): Promise<GraphData>

  /**
   * 验证数据
   */
  validate?(data: GraphData): boolean
}

// ==================== 布局插件接口 ====================

export interface LayoutPlugin extends StarChartPlugin {
  readonly type: 'layout'

  /**
   * 计算布局
   */
  computeLayout(
    nodes: NodeData[],
    edges: EdgeData[],
    context: PluginContext
  ): Promise<Map<string, Position>>

  /**
   * 增量更新布局
   */
  updateLayout?(changedNodeIds: string[], context: PluginContext): Promise<Map<string, Position>>
}

export interface Position {
  x: number
  y: number
}

// ==================== LOD 插件接口 ====================

export interface LODPlugin extends StarChartPlugin {
  readonly type: 'lod'

  /**
   * 决定哪些节点应该渲染
   */
  filterVisibleNodes(allNodes: NodeData[], viewport: ViewportInfo, context: PluginContext): Promise<string[]>

  /**
   * LOD 级别变化回调
   */
  onLODChanged?(level: number, context: PluginContext): void
}

export interface ViewportInfo {
  scale: number
  offsetX: number
  offsetY: number
  width: number
  height: number
}

// ==================== 交互插件接口 ====================

export interface InteractionPlugin extends StarChartPlugin {
  readonly type: 'interaction'

  /**
   * 处理事件
   * @returns true 表示事件已处理，阻止冒泡
   */
  handleEvent(event: StarChartEvent, context: PluginContext): Promise<boolean> | boolean
}

export interface StarChartEvent {
  type: 'click' | 'dblclick' | 'mousemove' | 'mousedown' | 'mouseup' | 'wheel' | string
  nodeId?: string
  edgeId?: string
  clientX?: number
  clientY?: number
  worldX?: number
  worldY?: number
  [key: string]: any
}

// ==================== 渲染插件接口 ====================

export interface RendererPlugin extends StarChartPlugin {
  readonly type: 'renderer'

  /**
   * 初始化渲染
   */
  initialize(context: PluginContext): Promise<void>

  /**
   * 渲染节点
   */
  renderNode?(nodeId: string, context: PluginContext): void

  /**
   * 渲染边
   */
  renderEdge?(edgeId: string, context: PluginContext): void

  /**
   * 清理资源
   */
  cleanup?(): void
}

// ==================== 工具插件接口 ====================

export interface UtilityPlugin extends StarChartPlugin {
  readonly type: 'utility'

  /**
   * 执行工具逻辑
   */
  execute(context: PluginContext): Promise<any>
}
