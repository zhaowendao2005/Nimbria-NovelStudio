/**
 * 懒加载多根径向树插件
 * 支持按需加载、折叠展开，专为大规模数据优化
 */

import { BaseLayoutPlugin } from '../base/BaseLayoutPlugin'
import { LazyLayoutEngine } from './LazyLayoutEngine'
import { LazyStyleService } from './styles'
import { LazyDataManager } from './LazyDataManager'
import { CollapsibleNodeBehavior } from './CollapsibleNodeBehavior'
import type {
  DataFormat,
  StyleRules,
  LayoutOptions,
  LayoutResult,
  G6GraphData,
  G6Node,
  G6Edge,
  NodeStyleData,
  EdgeStyleData
} from '../types'
import type { LazyPluginConfig } from './types'

// 扩展 LayoutResult 以传递数据管理器
export interface LazyLayoutResult extends LayoutResult {
  _lazyDataManager?: LazyDataManager
  _layoutEngine?: LazyLayoutEngine
  _styleService?: LazyStyleService
  _layoutOptions?: LayoutOptions
}

export class LazyMultiRootRadialPlugin extends BaseLayoutPlugin {
  override name = 'lazy-multi-root-radial'
  override displayName = '懒加载多根径向树'
  override version = '1.0.0'
  override description = '按需加载的多根径向树布局，初始仅加载根节点，支持节点折叠展开'
  
  override supportedDataFormats: DataFormat[] = ['graph' as DataFormat, 'multi-tree' as DataFormat]
  
  // 内部组件
  private layoutEngine: LazyLayoutEngine
  private styleService: LazyStyleService
  private dataManager: LazyDataManager | null = null
  private behavior: CollapsibleNodeBehavior | null = null
  
  // 插件配置
  private pluginConfig: LazyPluginConfig = {
    initialLoadRootsOnly: true,
    autoCollapse: true,
    maxInitialDepth: 0
  }
  
  constructor() {
    super()
    this.layoutEngine = new LazyLayoutEngine()
    this.styleService = new LazyStyleService()
  }
  
  /**
   * 获取默认样式（兜底用）
   */
  override getDefaultStyles(): StyleRules {
    return {
      node: (node: G6Node): NodeStyleData => {
        const hierarchy = (node.data?.hierarchy as number) || 0
        const collapsed = node.data?.collapsed as boolean ?? false
        const hasChildren = node.data?.hasChildren as boolean ?? false
        
        const baseSize = Math.max(30 - hierarchy * 3, 16)
        
        let fillColor: string
        if (hasChildren && collapsed) {
          fillColor = '#1890ff'
        } else {
          const hue = 200 + hierarchy * 40
          fillColor = `hsl(${hue}, 70%, 60%)`
        }
        
        return {
          size: baseSize,
          fill: fillColor,
          stroke: '#fff',
          lineWidth: 2,
          opacity: 1,
          labelText: (node.data?.label as string) || node.id,
          labelFontSize: Math.max(12 - hierarchy, 10),
          labelFill: '#333',
          labelPosition: 'bottom',
          labelOffsetY: 8
        }
      },
      
      edge: (edge: G6Edge): EdgeStyleData => {
        const isDirectLine = edge.data?.isDirectLine as boolean ?? false
        return {
          stroke: '#e0e0e0',
          lineWidth: 1.5,
          opacity: 0.6,
          type: isDirectLine ? 'line' : 'cubic-radial'
        }
      }
    }
  }
  
  /**
   * 执行布局（核心方法）
   */
  override async execute(
    data: G6GraphData,
    options?: LayoutOptions
  ): Promise<LazyLayoutResult> {
    console.log('[LazyPlugin] 🚀 开始执行懒加载布局...')
    console.log(`[LazyPlugin] 原始数据：${data.nodes.length} 个节点，${data.edges?.length || 0} 条边`)
    
    // 1. 创建数据管理器
    this.dataManager = new LazyDataManager(data)
    const stats = this.dataManager.getStats()
    console.log('[LazyPlugin] 📊 数据统计：', stats)
    
    // 2. 获取初始数据（仅根节点）
    const lazyData = this.dataManager.getInitialData()
    console.log(`[LazyPlugin] 🌱 初始加载：${lazyData.nodes.length} 个根节点（优化率：${(100 - lazyData.nodes.length / data.nodes.length * 100).toFixed(1)}%）`)
    
    // 3. 执行布局算法（仅对根节点布局）
    const layoutOptions = {
      width: options?.width ?? 800,
      height: options?.height ?? 600,
      baseDistance: (options?.baseDistance as number | undefined) ?? 300,
      hierarchyStep: (options?.hierarchyStep as number | undefined) ?? 120,
      baseRadiusMultiplier: (options?.baseRadiusMultiplier as number | undefined) ?? 1
    }
    
    const layoutResult = await this.layoutEngine.layoutInitialRoots(
      lazyData.nodes,
      lazyData.edges,
      lazyData.rootIds,
      layoutOptions
    )
    
    console.log('[LazyPlugin] ✅ 布局计算完成')
    
    // 4. 应用样式
    const styledNodes = this.styleService.applyNodeStyles(layoutResult.nodes)
    const styledEdges = this.styleService.applyEdgeStyles(layoutResult.edges || [])
    
    // 5. 返回结果，附带必要的引用（用于后续懒加载）
    return {
      ...layoutResult,
      nodes: styledNodes,
      edges: styledEdges,
      _lazyDataManager: this.dataManager,
      _layoutEngine: this.layoutEngine,
      _styleService: this.styleService,
      _layoutOptions: layoutOptions
    } as LazyLayoutResult
  }
  
  /**
   * 初始化行为（由根组件调用）
   */
  initializeBehavior(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph: any, 
    dataManager: LazyDataManager,
    layoutEngine: LazyLayoutEngine,
    styleService: LazyStyleService,
    layoutOptions: LayoutOptions
  ) {
    if (this.behavior) {
      this.behavior.destroy()
    }
    this.behavior = new CollapsibleNodeBehavior(
      graph,
      dataManager,
      layoutEngine,
      styleService,
      {
        width: layoutOptions.width ?? 800,
        height: layoutOptions.height ?? 600,
        baseDistance: (layoutOptions.baseDistance as number | undefined) ?? 300,
        hierarchyStep: (layoutOptions.hierarchyStep as number | undefined) ?? 120,
        baseRadiusMultiplier: (layoutOptions.baseRadiusMultiplier as number | undefined) ?? 1
      }
    )
    console.log('[LazyPlugin] ✅ 折叠展开行为已初始化（双击节点展开/收起）')
  }
  
  /**
   * 销毁
   */
  cleanup() {
    this.behavior?.destroy()
    this.behavior = null
    this.dataManager = null
    console.log('[LazyPlugin] 已销毁')
  }
}

// 导出插件实例
export const lazyMultiRootRadialPlugin = new LazyMultiRootRadialPlugin()
