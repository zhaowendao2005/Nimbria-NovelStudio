/**
 * 样式混入示例
 * 为特定数据源定制样式
 */

import type { PluginMixin, ILayoutPlugin, StyleRules } from '../types'

/**
 * 自定义数据源样式混入
 * 允许为特定数据源应用自定义样式
 */
export class CustomDataSourceStyleMixin implements PluginMixin {
  name = 'custom-data-source-style'
  
  constructor(
    private dataSourceId: string,
    private customStyles: Record<string, any>
  ) {}
  
  modifyStyles(styles: StyleRules, plugin: ILayoutPlugin): StyleRules {
    // 这里可以检查当前数据源ID（需要从全局state获取）
    // 为简化实现，直接应用样式
    
    return {
      ...styles,
      node: (node: any) => {
        const baseStyle = typeof styles.node === 'function'
          ? styles.node(node)
          : styles.node || {}
        
        // 根据节点类型应用自定义样式
        const nodeType = node.type || node.data?.type
        const customStyle = nodeType ? this.customStyles[nodeType] : {}
        
        return {
          ...baseStyle,
          ...customStyle
        }
      }
    }
  }
}

/**
 * 层级颜色方案混入
 * 为层级数据应用特定的颜色方案
 */
export class HierarchyColorSchemeMixin implements PluginMixin {
  name = 'hierarchy-color-scheme'
  
  constructor(private colorScheme: string[]) {}
  
  modifyStyles(styles: StyleRules, plugin: ILayoutPlugin): StyleRules {
    return {
      ...styles,
      node: (node: any) => {
        const baseStyle = typeof styles.node === 'function'
          ? styles.node(node)
          : styles.node || {}
        
        const hierarchy = node.hierarchy || node.data?.hierarchy
        if (hierarchy !== undefined && hierarchy < this.colorScheme.length) {
          return {
            ...baseStyle,
            fill: this.colorScheme[hierarchy]
          }
        }
        
        return baseStyle
      }
    }
  }
}

