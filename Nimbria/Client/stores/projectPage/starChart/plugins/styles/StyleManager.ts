/**
 * 样式管理器
 * 处理数据源样式、插件样式、用户样式的智能合并
 */

import type { NodeStyle, EdgeStyle, StyleRules, FinalStyleRules, UserStyleConfig, StylePriority } from '../types'

export class StyleManager {
  /**
   * 合并节点样式
   */
  static mergeNodeStyle(
    baseStyle: Partial<NodeStyle>,
    dataStyle: Partial<NodeStyle>,
    userStyle: Partial<NodeStyle>,
    priority: StylePriority = 'merge' as StylePriority
  ): Partial<NodeStyle> {
    switch (priority) {
      case 'data' as StylePriority:
        return { ...baseStyle, ...userStyle, ...dataStyle }
      case 'plugin' as StylePriority:
        return { ...dataStyle, ...userStyle, ...baseStyle }
      case 'user' as StylePriority:
        return { ...baseStyle, ...dataStyle, ...userStyle }
      case 'merge' as StylePriority:
      default:
        // 智能合并：基础 → 数据 → 用户
        return { ...baseStyle, ...dataStyle, ...userStyle }
    }
  }
  
  /**
   * 合并边样式
   */
  static mergeEdgeStyle(
    baseStyle: Partial<EdgeStyle>,
    dataStyle: Partial<EdgeStyle>,
    userStyle: Partial<EdgeStyle>,
    priority: StylePriority = 'merge' as StylePriority
  ): Partial<EdgeStyle> {
    switch (priority) {
      case 'data' as StylePriority:
        return { ...baseStyle, ...userStyle, ...dataStyle }
      case 'plugin' as StylePriority:
        return { ...dataStyle, ...userStyle, ...baseStyle }
      case 'user' as StylePriority:
        return { ...baseStyle, ...dataStyle, ...userStyle }
      case 'merge' as StylePriority:
      default:
        return { ...baseStyle, ...dataStyle, ...userStyle }
    }
  }
  
  /**
   * 提取层级样式
   * 根据节点的层级信息生成样式
   */
  static extractHierarchyStyle(node: any, colorScheme?: string[]): Partial<NodeStyle> {
    const hierarchy = node.hierarchy || node.data?.hierarchy
    if (hierarchy === undefined) return {}
    
    const defaultColors = ['#ff4d4f', '#1890ff', '#52c41a', '#faad14', '#722ed1']
    const colors = colorScheme || defaultColors
    
    return {
      size: Math.max(15, 30 - hierarchy * 3),  // 层级越深，节点越小
      fill: colors[hierarchy] || colors[colors.length - 1],
      opacity: Math.max(0.6, 1 - hierarchy * 0.08)
    }
  }
  
  /**
   * 提取分组样式
   * 根据节点的分组信息生成样式
   */
  static extractGroupStyle(node: any, groupColors?: Record<string, string>): Partial<NodeStyle> {
    const groupId = node.groupId || node.data?.groupId
    if (groupId === undefined) return {}
    
    if (groupColors && groupColors[groupId]) {
      return { fill: groupColors[groupId] }
    }
    
    return {}
  }
}

/**
 * 层级样式辅助类
 */
export class HierarchyStyleHelper {
  constructor(
    private colorScheme: string[] = ['#ff4d4f', '#1890ff', '#52c41a', '#faad14', '#722ed1'],
    private sizeRange: [number, number] = [15, 35]
  ) {}
  
  /**
   * 获取层级颜色
   */
  getColor(hierarchy: number): string {
    return this.colorScheme[hierarchy] || this.colorScheme[this.colorScheme.length - 1]
  }
  
  /**
   * 获取层级大小
   */
  getSize(hierarchy: number): number {
    const [min, max] = this.sizeRange
    const size = max - hierarchy * ((max - min) / this.colorScheme.length)
    return Math.max(min, size)
  }
  
  /**
   * 获取层级透明度
   */
  getOpacity(hierarchy: number): number {
    return Math.max(0.5, 1 - hierarchy * 0.1)
  }
  
  /**
   * 获取完整的层级样式
   */
  getStyle(hierarchy: number): Partial<NodeStyle> {
    return {
      size: this.getSize(hierarchy),
      fill: this.getColor(hierarchy),
      opacity: this.getOpacity(hierarchy)
    }
  }
}

