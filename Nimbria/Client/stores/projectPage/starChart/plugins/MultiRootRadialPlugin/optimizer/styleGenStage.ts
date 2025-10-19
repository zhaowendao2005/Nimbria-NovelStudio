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
   * 执行样式生成
   * @param layoutResult 布局结果
   * @param onProgress 进度回调
   * @returns 最终样式规则
   */
  async execute(
    layoutResult: LayoutResult,
    onProgress: (progress: InitializationProgressMessage) => void
  ): Promise<FinalStyleRules> {
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
    
    // 4. 应用边类型
    onProgress(this.progressCalc.createProgressMessage(
      0.8,
      '正在配置边样式...',
      {}
    ))
    
    this.applyEdgeStyles(finalStyles, layoutResult)
    
    // 完成
    onProgress(this.progressCalc.createProgressMessage(
      1.0,
      '样式生成完成',
      {}
    ))
    
    return finalStyles
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
   * 应用边样式（根据边类型）
   */
  private applyEdgeStyles(_styles: FinalStyleRules, _layoutResult: LayoutResult): void {
    // 边的样式已经在 mergeStyles 中处理
    // 这里可以添加额外的边样式逻辑
    
    console.log('[StyleGenStage] 边样式配置完成')
  }
}

