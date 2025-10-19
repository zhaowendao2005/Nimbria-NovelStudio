/**
 * 样式生成阶段处理
 * 
 * 负责生成节点和边的最终样式配置
 */

import type { LayoutResult, FinalStyleRules, StyleRules } from '../../types'
import type { InitializationProgressMessage } from '@service/starChart/types/worker.types'
import { ProgressCalculator } from '../../types/initializer.types'
import { HierarchyStyleHelper } from '../styles'

/**
 * 样式生成阶段执行器
 */
export class StyleGenStage {
  private progressCalc: ProgressCalculator
  
  constructor() {
    this.progressCalc = new ProgressCalculator('style-gen', [50, 70])
  }
  
  /**
   * 执行样式生成并应用到布局结果
   * @param layoutResult 布局结果
   * @param onProgress 进度回调
   * @returns 应用了样式的布局结果
   */
  async execute(
    layoutResult: LayoutResult,
    onProgress: (progress: InitializationProgressMessage) => void
  ): Promise<LayoutResult> {
    // 阶段开始
    onProgress(this.progressCalc.createProgressMessage(
      0,
      '正在生成样式配置...',
      {}
    ))
    
    // 1. 获取默认样式规则
    onProgress(this.progressCalc.createProgressMessage(
      0.2,
      '正在加载默认样式规则...',
      {}
    ))
    
    const defaultStyles = this.getDefaultStyles()
    
    // 2. 生成层级样式
    onProgress(this.progressCalc.createProgressMessage(
      0.4,
      '正在生成层级样式...',
      {}
    ))
    
    const hierarchyHelper = new HierarchyStyleHelper()
    const hierarchicalStyles = this.buildHierarchicalStylesMap(hierarchyHelper)
    
    // 3. 合并样式
    onProgress(this.progressCalc.createProgressMessage(
      0.6,
      '正在合并样式规则...',
      {}
    ))
    
    const finalStyles = this.mergeStyles(
      defaultStyles,
      hierarchicalStyles,
      layoutResult
    )
    
    // 4. 应用样式到节点和边
    onProgress(this.progressCalc.createProgressMessage(
      0.8,
      '正在应用样式到数据...',
      {}
    ))
    
    const styledLayoutResult = this.applyStylesToData(layoutResult, finalStyles)
    
    // 完成
    onProgress(this.progressCalc.createProgressMessage(
      1.0,
      '样式生成完成',
      {}
    ))
    
    return styledLayoutResult
  }
  
  /**
   * 获取默认样式
   */
  private getDefaultStyles(): StyleRules {
    return {
      node: (nodeData) => {
        const data = nodeData.data || {}
        return {
          fill: (data.color as string) || '#5B8FF9',
          stroke: (data.color as string) || '#5B8FF9',
          lineWidth: 2,
          size: 30,
          opacity: 1,
          labelText: (data.label as string) || (data.id as string) || '',
          labelFontSize: 12,
          labelFill: '#000',
          labelPosition: 'bottom' as const,
          labelOffsetY: 10
        }
      },
      edge: () => {
        return {
          stroke: '#e2e2e2',
          lineWidth: 1,
          opacity: 0.6
        }
      }
    }
  }
  
  /**
   * 构建层级样式映射
   */
  private buildHierarchicalStylesMap(helper: HierarchyStyleHelper): Record<number, ReturnType<HierarchyStyleHelper['getStyle']>> {
    const styles: Record<number, ReturnType<HierarchyStyleHelper['getStyle']>> = {}
    // 预生成0-10层的样式
    for (let i = 0; i <= 10; i++) {
      styles[i] = helper.getStyle(i)
    }
    return styles
  }
  
  /**
   * 合并样式规则
   */
  private mergeStyles(
    defaultStyles: StyleRules,
    hierarchicalStyles: Record<number, ReturnType<HierarchyStyleHelper['getStyle']>>,
    layoutResult: LayoutResult
  ): FinalStyleRules {
    const finalStyles: FinalStyleRules = {
      node: (nodeData) => {
        // 应用默认样式
        const baseStyle = typeof defaultStyles.node === 'function'
          ? defaultStyles.node(nodeData)
          : defaultStyles.node
        
        // 根据层级应用样式
        const hierarchy = nodeData.data?.hierarchy || 0
        const hierarchyStyle = hierarchicalStyles[hierarchy] || {}
        
        // 合并样式
        return {
          ...baseStyle,
          ...hierarchyStyle,
          // 保留数据中的自定义样式
          ...(nodeData.data?.style || {})
        }
      },
      edge: (edgeData) => {
        // 应用默认样式
        const baseStyle = typeof defaultStyles.edge === 'function'
          ? defaultStyles.edge(edgeData)
          : defaultStyles.edge
        
        // 根据边类型应用不同样式
        const isDirectLine = edgeData.data?.isDirectLine === true
        const edgeStyle = isDirectLine
          ? { lineWidth: 1.5, opacity: 0.8 }
          : { opacity: 0.6 }
        
        return {
          ...baseStyle,
          ...edgeStyle,
          // 保留数据中的自定义样式
          ...(edgeData.data?.style || {})
        }
      }
    }
    
    return finalStyles
  }
  
  /**
   * 将样式函数应用到实际数据上
   * 返回包含内联样式的布局结果
   */
  private applyStylesToData(
    layoutResult: LayoutResult,
    finalStyles: FinalStyleRules
  ): LayoutResult {
    // 深拷贝布局结果
    const styledResult = JSON.parse(JSON.stringify(layoutResult)) as LayoutResult
    
    // 应用节点样式
    if (styledResult.nodes && Array.isArray(styledResult.nodes)) {
      styledResult.nodes = styledResult.nodes.map((node) => {
        const nodeStyle = typeof finalStyles.node === 'function'
          ? finalStyles.node(node)
          : finalStyles.node
        
        return {
          ...node,
          data: {
            ...node.data,
            // 将计算后的样式存储到 data 中
            _computedStyle: nodeStyle
          }
        }
      })
    }
    
    // 应用边样式
    if (styledResult.edges && Array.isArray(styledResult.edges)) {
      styledResult.edges = styledResult.edges.map((edge) => {
        const edgeStyle = typeof finalStyles.edge === 'function'
          ? finalStyles.edge(edge)
          : finalStyles.edge
        
        return {
          ...edge,
          data: {
            ...edge.data,
            // 将计算后的样式存储到 data 中
            _computedStyle: edgeStyle
          }
        }
      })
    }
    
    console.log('[StyleGenStage] 样式已应用到数据')
    return styledResult
  }
}

