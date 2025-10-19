/**
 * 懒加载树形图自定义边类型
 * 替代 cubic-radial，支持树形布局中的径向弧形边
 * 
 * 核心优势：
 * 1. 不依赖 G6 的 tree 结构（避免 Tree structure not found 错误）
 * 2. 支持直线和弧形两种模式
 * 3. 完全类型安全
 */

import type { G6EdgeData } from '../../types/g6.types'

/**
 * 自定义边配置
 */
export interface LazyRadialEdgeConfig extends G6EdgeData {
  startPoint?: { x: number; y: number }
  endPoint?: { x: number; y: number }
  curveOffset?: number  // 弧形偏移量（控制弧度）
  data?: {
    isDirectLine?: boolean      // true 表示直线，false 表示弧形
    sourceHierarchy?: number
    targetHierarchy?: number
  }
}

/**
 * LazyRadialEdge：自定义径向弧形边
 * 
 * 渲染策略：
 * - 根节点到第一层：直线（isDirectLine = true）
 * - 其他层级：二次贝塞尔弧形（isDirectLine = false）
 */
export class LazyRadialEdge {
  /**
   * 绘制边的主方法
   * @param cfg 边配置
   * @param group G6 Group 对象
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  draw(cfg: LazyRadialEdgeConfig, group: any) {
    const startPoint = cfg.startPoint!
    const endPoint = cfg.endPoint!
    const isDirectLine = cfg.data?.isDirectLine ?? false
    const curveOffset = cfg.curveOffset ?? 50
    
    // 路径计算
    const path = isDirectLine
      ? this.getLinePath(startPoint, endPoint)
      : this.getCurvePath(startPoint, endPoint, curveOffset)
    
    // 绘制边
    const shape = group.addShape('path', {
      attrs: {
        path,
        stroke: cfg.style?.stroke || '#e0e0e0',
        lineWidth: cfg.style?.lineWidth || 1.5,
        opacity: cfg.style?.opacity || 0.6,
        lineDash: cfg.style?.lineDash,
        endArrow: cfg.style?.endArrow
      },
      name: 'edge-shape'
    })
    
    return shape
  }
  
  /**
   * 更新边的状态
   * @param cfg 新的边配置
   * @param item 边实例
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(cfg: LazyRadialEdgeConfig | null, item: any) {
    if (!cfg) return
    
    const group = item.getContainer()
    const shape = group.get('children')[0]
    
    if (shape) {
      shape.attr({
        stroke: cfg.style?.stroke || '#e0e0e0',
        lineWidth: cfg.style?.lineWidth || 1.5,
        opacity: cfg.style?.opacity || 0.6
      })
    }
  }
  
  /**
   * 状态设置（选中、高亮等）
   * @param name 状态名称
   * @param value 状态值
   * @param item 边实例
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setState(name: string, value: string | boolean, item: any) {
    const group = item.getContainer()
    const shape = group.get('children')[0]
    
    if (!shape) return
    
    switch (name) {
      case 'selected':
        shape.attr({
          lineWidth: value ? 3 : 1.5,
          stroke: value ? '#1890ff' : '#e0e0e0'
        })
        break
      case 'highlight':
        shape.attr({
          stroke: value ? '#ff4d4f' : '#e0e0e0',
          opacity: value ? 1 : 0.6
        })
        break
      case 'inactive':
        shape.attr({
          opacity: value ? 0.3 : 0.6
        })
        break
    }
  }
  
  /**
   * 直线路径（根节点到第一层）
   */
  private getLinePath(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): Array<Array<string | number>> {
    return [
      ['M', start.x, start.y],
      ['L', end.x, end.y]
    ]
  }
  
  /**
   * 弧形路径（二次贝塞尔曲线）
   * 控制点算法：中点偏移，产生自然弧度
   */
  private getCurvePath(
    start: { x: number; y: number },
    end: { x: number; y: number },
    offset: number
  ): Array<Array<string | number>> {
    // 计算中点
    const midX = (start.x + end.x) / 2
    const midY = (start.y + end.y) / 2
    
    // 计算垂直向量（用于控制点偏移）
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.sqrt(dx * dx + dy * dy)
    
    if (length === 0) {
      // 起点终点重合，直接返回直线
      return this.getLinePath(start, end)
    }
    
    // 归一化并旋转90度得到垂直方向
    const perpX = -dy / length
    const perpY = dx / length
    
    // 控制点：中点 + 垂直偏移
    const controlX = midX + perpX * offset
    const controlY = midY + perpY * offset
    
    return [
      ['M', start.x, start.y],
      ['Q', controlX, controlY, end.x, end.y]  // 二次贝塞尔
    ]
  }
}

/**
 * 导出边类型名称
 */
export const LAZY_RADIAL_EDGE_TYPE = 'lazy-radial' as const

