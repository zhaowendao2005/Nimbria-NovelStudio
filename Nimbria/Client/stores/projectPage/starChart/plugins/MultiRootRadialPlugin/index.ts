/**
 * 多根径向树布局插件
 * 自包含的插件实现，所有依赖都在插件内部
 */

import { BaseLayoutPlugin } from '../base/BaseLayoutPlugin'
import { TreeDataAdapter } from './adapter'
import { HierarchyStyleHelper } from './styles'
import { MultiRootRadialLayoutAlgorithm } from './layout'
import type {
  DataFormat,
  StyleRules,
  LayoutOptions,
  LayoutResult,
  ConfigSchema,
  G6GraphData,
  TreeNodeData,
  G6Node,
  G6Edge,
  NodeStyleData,
  EdgeStyleData
} from '../types'
import type {
  RadialPluginInput,
  RadialAdapterOutput
} from './data.types'
import type { 
  IInitializationOptimizer,
  InitializationResult
} from '../types/initializer.types'
import type { InitializationProgressMessage } from '@service/starChart/types/worker.types'

// 导出初始化优化器
export { MultiRootRadialInitializationOptimizer, multiRootRadialOptimizer } from './InitializationOptimizer'
export type { IInitializationOptimizer } from '../types/initializer.types'

// 为类型安全起见保留别名
type G6NodeData = G6Node
type G6EdgeData = G6Edge

export class MultiRootRadialPlugin extends BaseLayoutPlugin implements IInitializationOptimizer {
  override name = 'multi-root-radial'
  override displayName = '多根径向树'
  override version = '1.0.0'
  override description = '根节点环形分布，子节点径向扩散的树形布局'
  
  override supportedDataFormats: DataFormat[] = ['graph' as DataFormat, 'multi-tree' as DataFormat]
  
  // 🔥 插件需要 G6 内置树结构（使用 cubic-radial 边）
  requiresTreeStructure = true
  
  // 内部依赖（自包含）
  private algorithm = new MultiRootRadialLayoutAlgorithm()
  private adapter = new TreeDataAdapter()
  private hierarchyStyleHelper = new HierarchyStyleHelper()
  
  // ===== 生命周期钩子实现 =====
  
  /**
   * 返回插件特定的 Graph 配置
   */
  getGraphConfig() {
    return {
      animation: false,  // 大数据量优化：关闭动画
      // 其他插件特定配置可在此添加
    }
  }
  
  /**
   * Graph 实例创建后的钩子
   */
  async onGraphCreated(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph: any,
    container: HTMLElement
  ): Promise<void> {
    console.log('[MultiRootRadialPlugin] 🎯 Graph 实例已创建')
    // 此插件不需要特殊的初始化逻辑
  }
  
  /**
   * 插件销毁钩子
   */
  async onDestroy(): Promise<void> {
    console.log('[MultiRootRadialPlugin] 🧹 清理插件资源')
    // 此插件没有需要清理的资源
  }
  
  /**
   * 获取默认样式
   */
  override getDefaultStyles(): StyleRules {
    return {
      node: (node: G6NodeData): NodeStyleData => {
        const baseStyle: NodeStyleData = {
          size: 20,
          fill: '#5B8FF9',
          stroke: '#fff',
          lineWidth: 2
        }
        
        // 如果有层级信息，应用层级样式
        const hierarchy = (node as Record<string, unknown>).hierarchy || node.data?.hierarchy
        if (hierarchy !== undefined) {
          return {
            ...baseStyle,
            ...this.hierarchyStyleHelper.getStyle(hierarchy as number)
          }
        }
        
        return baseStyle
      },
      
      edge: (edge: G6EdgeData): EdgeStyleData => {
        // 样式只返回公共部分，type由插件的execute后置处理决定
        return {
          lineWidth: 2,
          opacity: 0.6,
          stroke: '#99a9bf'
        }
      }
    }
  }
  
  /**
   * 执行布局（包含数据适配）
   * 
   * @param data 输入数据（支持多种格式，见 RadialPluginInput）
   * @param options 布局选项
   * @returns 布局结果
   */
  override async execute(
    data: RadialPluginInput, 
    options?: LayoutOptions
  ): Promise<LayoutResult> {
    // 1. 数据适配（转换为标准格式）
    const adaptedData: RadialAdapterOutput = this.adapter.adapt(data)
    
    // 2. 验证必需字段
    if (!adaptedData.rootIds || adaptedData.rootIds.length === 0) {
      console.error('[MultiRootRadialPlugin] 缺少 rootIds，无法计算布局')
      return {
        nodes: adaptedData.nodes,
        edges: adaptedData.edges,
        rootIds: [],
        treesData: adaptedData.treesData,
        tree: adaptedData.tree
      } as LayoutResult
    }
    
    // 3. 布局计算
    return this.algorithm.calculate(adaptedData, {
      width: options?.width || 1000,
      height: options?.height || 1000,
      rootIds: adaptedData.rootIds,
      ...this.config
    })
  }
  
  /**
   * 获取配置Schema
   */
  override getConfigSchema(): ConfigSchema {
    return {
      layout: {
        type: 'group',
        label: '布局参数',
        children: {
          baseRadiusMultiplier: {
            type: 'slider',
            label: '根节点环形半径系数',
            min: 5,
            max: 15,
            default: 5,
            description: '控制根节点的分散程度'
          },
          minArcLengthMultiplier: {
            type: 'slider',
            label: '最小弧长系数',
            min: 2,
            max: 6,
            default: 3
          },
          maxArcLengthMultiplier: {
            type: 'slider',
            label: '最大弧长系数',
            min: 3,
            max: 8,
            default: 5
          },
          baseDistance: {
            type: 'slider',
            label: '第一层起始距离',
            min: 40,
            max: 400,
            default: 300
          },
          hierarchyStep: {
            type: 'slider',
            label: '层级步进距离',
            min: 30,
            max: 150,
            default: 100
          },
          angleSpread: {
            type: 'select',
            label: '子节点扇形角度',
            options: [
              { label: '30度（紧凑）', value: Math.PI / 6 },
              { label: '60度（标准）', value: Math.PI / 3 },
              { label: '90度（宽松）', value: Math.PI / 2 },
              { label: '180度（半圆）', value: Math.PI }
            ],
            default: Math.PI / 3
          }
        }
      }
    }
  }
  
  /**
   * 实现 IInitializationOptimizer 接口
   * 将调用委托给专门的优化器
   */
  async initializeOptimized(
    data: G6GraphData | TreeNodeData,
    options: LayoutOptions,
    onProgress: (progress: InitializationProgressMessage) => void
  ): Promise<InitializationResult> {
    // 动态导入优化器以避免循环依赖
    const { multiRootRadialOptimizer } = await import('./InitializationOptimizer')
    return multiRootRadialOptimizer.initializeOptimized(data, options, onProgress)
  }
}

