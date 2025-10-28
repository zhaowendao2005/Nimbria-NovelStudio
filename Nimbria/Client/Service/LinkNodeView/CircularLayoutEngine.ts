/**
 * 圆形布局引擎
 * 
 * 功能：
 * - 主节点在中心
 * - 附节点环绕主节点呈圆形排列
 */

import type { LayoutConfig, NodePosition } from '@types/LinkNodeView'

export class CircularLayoutEngine {
  /**
   * 计算圆形布局
   * 主节点在中心，附节点环绕
   */
  computeLayout(config: LayoutConfig): Map<string, NodePosition> {
    const positions = new Map<string, NodePosition>()
    const centerX = config.canvasWidth / 2
    const centerY = config.canvasHeight / 2

    // 1. 放置主节点在中心
    if (config.mainNodeId) {
      positions.set(config.mainNodeId, { x: centerX, y: centerY })
    }

    // 2. 计算附节点的圆形排列
    const attachedNodes = config.nodes.filter(n => !n.isMain)
    const radius = Math.min(config.canvasWidth, config.canvasHeight) * 0.35 // 半径为画布的35%
    const angleStep = (2 * Math.PI) / attachedNodes.length

    attachedNodes.forEach((node, index) => {
      const angle = index * angleStep
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      positions.set(node.id, { x, y })
    })

    return positions
  }
}

