/**
 * 多根径向树布局插件
 * 将现有的 MultiRootRadialLayout 改造为完整的插件
 */

import { BaseLayoutPlugin } from '../base/BaseLayoutPlugin'
import { TreeDataAdapter } from '../adapters/TreeDataAdapter'
import { StyleManager, HierarchyStyleHelper } from '../styles/StyleManager'
import { MultiRootRadialLayoutAlgorithm } from './layout'
import type {
  DataFormat,
  IDataAdapter,
  StyleRules,
  LayoutOptions,
  LayoutResult,
  ConfigSchema
} from '../types'

export class MultiRootRadialPlugin extends BaseLayoutPlugin {
  name = 'multi-root-radial'
  displayName = '多根径向树'
  version = '1.0.0'
  description = '根节点环形分布，子节点径向扩散的树形布局'
  
  supportedDataFormats: DataFormat[] = ['graph' as DataFormat, 'multi-tree' as DataFormat]
  
  private algorithm = new MultiRootRadialLayoutAlgorithm()
  private hierarchyStyleHelper = new HierarchyStyleHelper()
  
  /**
   * 创建数据适配器
   */
  createDataAdapter(): IDataAdapter {
    return new TreeDataAdapter()
  }
  
  /**
   * 获取默认样式
   */
  getDefaultStyles(): StyleRules {
    return {
      node: (node: any) => {
        const baseStyle = {
          size: 20,
          fill: '#5B8FF9',
          stroke: '#fff',
          lineWidth: 2
        }
        
        // 如果有层级信息，应用层级样式
        const hierarchy = node.hierarchy || node.data?.hierarchy
        if (hierarchy !== undefined) {
          return {
            ...baseStyle,
            ...this.hierarchyStyleHelper.getStyle(hierarchy)
          }
        }
        
        return baseStyle
      },
      
      edge: (edge: any) => {
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
   * 执行布局
   */
  async execute(data: any, options?: LayoutOptions): Promise<LayoutResult> {
    return this.algorithm.calculate(data, {
      width: options?.width || 1000,
      height: options?.height || 1000,
      rootIds: data.rootIds || options?.rootIds || [],
      ...this.config
    })
  }
  
  /**
   * 获取配置Schema
   */
  getConfigSchema(): ConfigSchema {
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
}

