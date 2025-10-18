/**
 * 层级样式管理器（插件内部使用）
 */

import type { HierarchyStyle } from './types'

/**
 * 层级样式助手
 * 根据节点的层级（hierarchy）提供不同的视觉样式
 */
export class HierarchyStyleHelper {
  private hierarchyStyles: Map<number, HierarchyStyle> = new Map([
    [0, { size: 35, fill: '#ff6b6b', opacity: 1 }],     // 根节点：大、红色、完全不透明
    [1, { size: 28, fill: '#4c6ef5', opacity: 0.9 }],   // 第一层：蓝色
    [2, { size: 22, fill: '#20c997', opacity: 0.8 }],   // 第二层：绿色
    [3, { size: 18, fill: '#fcc419', opacity: 0.7 }],   // 第三层：黄色
  ])

  /**
   * 获取指定层级的样式
   */
  getStyle(hierarchy: number): Partial<HierarchyStyle> {
    // 如果有对应层级的样式，返回；否则使用第3层的样式作为 fallback
    return this.hierarchyStyles.get(hierarchy) || this.hierarchyStyles.get(3)!
  }

  /**
   * 设置自定义层级样式
   */
  setStyle(hierarchy: number, style: HierarchyStyle): void {
    this.hierarchyStyles.set(hierarchy, style)
  }
}

