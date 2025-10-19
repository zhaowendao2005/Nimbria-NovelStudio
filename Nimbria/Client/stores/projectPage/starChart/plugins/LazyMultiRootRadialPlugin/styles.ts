/**
 * 懒加载样式服务
 * 统一管理节点和边的样式
 */

import type { G6NodeData, G6EdgeData, NodeStyleData, EdgeStyleData } from '../types'
import { LAZY_RADIAL_EDGE_TYPE } from './LazyRadialEdge'

/**
 * 懒加载样式服务
 * 
 * 职责：
 * 1. 根据节点状态（collapsed/hasChildren/hierarchy）计算样式
 * 2. 保证样式逻辑与主插件一致
 * 3. 支持批量应用样式
 */
export class LazyStyleService {
  /**
   * 为节点应用样式
   */
  applyNodeStyle(node: G6NodeData): G6NodeData {
    const hierarchy = (node.data?.hierarchy as number) ?? 0
    const collapsed = node.data?.collapsed as boolean ?? false
    const hasChildren = node.data?.hasChildren as boolean ?? false
    
    // 基础尺寸（根据层级递减）
    const baseSize = Math.max(30 - hierarchy * 3, 16)
    
    // 颜色（折叠时用蓝色，展开时用层级色）
    let fillColor: string
    if (hasChildren && collapsed) {
      fillColor = '#1890ff'  // 折叠状态用蓝色
    } else {
      // 层级渐变色
      const hue = 200 + hierarchy * 40
      fillColor = `hsl(${hue}, 70%, 60%)`
    }
    
    const style: NodeStyleData = {
      ...(node.style || {}),
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
    
    return {
      ...node,
      style
    }
  }
  
  /**
   * 为边应用样式（临时使用内置边验证）
   */
  applyEdgeStyle(edge: G6EdgeData): G6EdgeData {
    const style: EdgeStyleData = {
      ...(edge.style || {}),
      stroke: '#e0e0e0',
      lineWidth: 1.5,
      opacity: 0.6
    }
    
    return {
      ...edge,
      type: 'quadratic',  // 🔥 临时使用内置 quadratic 边验证
      style
    }
  }
  
  /**
   * 批量应用节点样式
   */
  applyNodeStyles(nodes: G6NodeData[]): G6NodeData[] {
    return nodes.map(node => this.applyNodeStyle(node))
  }
  
  /**
   * 批量应用边样式
   */
  applyEdgeStyles(edges: G6EdgeData[]): G6EdgeData[] {
    return edges.map(edge => this.applyEdgeStyle(edge))
  }
}

