/**
 * SpatialIndex - 空间索引（四叉树实现）
 * 
 * 职责：
 * - 使用四叉树维护节点的空间位置
 * - 高效的范围查询
 * - 碰撞检测
 * - 邻近节点查找
 */

import type { NodeData } from 'Business/StarChart'

interface QuadTreeNode {
  x: number
  y: number
  width: number
  height: number
  capacity: number
  points: Array<{ nodeId: string; x: number; y: number }>
  divided: boolean
  northeast?: QuadTreeNode
  northwest?: QuadTreeNode
  southeast?: QuadTreeNode
  southwest?: QuadTreeNode
}

interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

export class SpatialIndex {
  private root: QuadTreeNode
  private readonly capacity: number = 16

  constructor(bounds: Rectangle) {
    this.root = this.createNode(bounds.x, bounds.y, bounds.width, bounds.height)
  }

  /**
   * 插入节点
   */
  insert(nodeId: string, x: number, y: number): boolean {
    return this.insertNode(this.root, nodeId, x, y)
  }

  /**
   * 查询矩形范围内的节点
   */
  query(range: Rectangle): string[] {
    const result: string[] = []
    this.queryRange(this.root, range, result)
    return result
  }

  /**
   * 查询圆形范围内的节点
   */
  queryCircle(cx: number, cy: number, radius: number): string[] {
    const result: string[] = []
    this.queryCircleRange(this.root, cx, cy, radius, result)
    return result
  }

  /**
   * 查找最近的 K 个节点
   */
  findNearestK(x: number, y: number, k: number): Array<{ nodeId: string; distance: number }> {
    const allPoints: Array<{ nodeId: string; distance: number }> = []
    this.collectAllPoints(this.root, allPoints, x, y)

    return allPoints
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k)
  }

  /**
   * 获取索引统计信息
   */
  getStats(): { totalNodes: number; depth: number; coverage: Rectangle } {
    return {
      totalNodes: this.countNodes(this.root),
      depth: this.getTreeDepth(this.root),
      coverage: {
        x: this.root.x,
        y: this.root.y,
        width: this.root.width,
        height: this.root.height
      }
    }
  }

  /**
   * 清空索引
   */
  clear(): void {
    this.root = this.createNode(
      this.root.x,
      this.root.y,
      this.root.width,
      this.root.height
    )
  }

  /**
   * 重建索引
   */
  rebuild(nodes: Array<{ id: string; x: number; y: number }>): void {
    this.clear()
    for (const node of nodes) {
      this.insert(node.id, node.x, node.y)
    }
  }

  // ============ 私有方法 ============

  private insertNode(
    node: QuadTreeNode,
    nodeId: string,
    x: number,
    y: number
  ): boolean {
    // 检查点是否在边界内
    if (!this.contains(node, x, y)) {
      return false
    }

    // 如果还有空间，直接插入
    if (node.points.length < node.capacity) {
      node.points.push({ nodeId, x, y })
      return true
    }

    // 如果尚未分割，进行分割
    if (!node.divided) {
      this.subdivide(node)
      node.divided = true
    }

    // 插入到相应的象限
    return (
      this.insertNode(node.northeast!, nodeId, x, y) ||
      this.insertNode(node.northwest!, nodeId, x, y) ||
      this.insertNode(node.southeast!, nodeId, x, y) ||
      this.insertNode(node.southwest!, nodeId, x, y)
    )
  }

  private queryRange(node: QuadTreeNode, range: Rectangle, result: string[]): void {
    // 检查边界是否相交
    if (!this.intersects(node, range)) {
      return
    }

    // 检查该节点中的点
    for (const point of node.points) {
      if (
        point.x >= range.x &&
        point.x < range.x + range.width &&
        point.y >= range.y &&
        point.y < range.y + range.height
      ) {
        result.push(point.nodeId)
      }
    }

    // 递归查询子节点
    if (node.divided) {
      this.queryRange(node.northeast!, range, result)
      this.queryRange(node.northwest!, range, result)
      this.queryRange(node.southeast!, range, result)
      this.queryRange(node.southwest!, range, result)
    }
  }

  private queryCircleRange(
    node: QuadTreeNode,
    cx: number,
    cy: number,
    radius: number,
    result: string[]
  ): void {
    // 检查圆与矩形是否相交
    const dx = Math.max(Math.abs(cx - (node.x + node.width / 2)) - node.width / 2, 0)
    const dy = Math.max(Math.abs(cy - (node.y + node.height / 2)) - node.height / 2, 0)

    if (dx * dx + dy * dy > radius * radius) {
      return
    }

    // 检查该节点中的点
    for (const point of node.points) {
      const dist = (point.x - cx) * (point.x - cx) + (point.y - cy) * (point.y - cy)
      if (dist <= radius * radius) {
        result.push(point.nodeId)
      }
    }

    // 递归查询子节点
    if (node.divided) {
      this.queryCircleRange(node.northeast!, cx, cy, radius, result)
      this.queryCircleRange(node.northwest!, cx, cy, radius, result)
      this.queryCircleRange(node.southeast!, cx, cy, radius, result)
      this.queryCircleRange(node.southwest!, cx, cy, radius, result)
    }
  }

  private collectAllPoints(
    node: QuadTreeNode,
    result: Array<{ nodeId: string; distance: number }>,
    x: number,
    y: number
  ): void {
    for (const point of node.points) {
      const dx = point.x - x
      const dy = point.y - y
      const distance = Math.sqrt(dx * dx + dy * dy)
      result.push({ nodeId: point.nodeId, distance })
    }

    if (node.divided) {
      this.collectAllPoints(node.northeast!, result, x, y)
      this.collectAllPoints(node.northwest!, result, x, y)
      this.collectAllPoints(node.southeast!, result, x, y)
      this.collectAllPoints(node.southwest!, result, x, y)
    }
  }

  private subdivide(node: QuadTreeNode): void {
    const x = node.x
    const y = node.y
    const w = node.width / 2
    const h = node.height / 2

    node.northeast = this.createNode(x + w, y, w, h)
    node.northwest = this.createNode(x, y, w, h)
    node.southeast = this.createNode(x + w, y + h, w, h)
    node.southwest = this.createNode(x, y + h, w, h)
  }

  private createNode(x: number, y: number, width: number, height: number): QuadTreeNode {
    return {
      x,
      y,
      width,
      height,
      capacity: this.capacity,
      points: [],
      divided: false
    }
  }

  private contains(node: QuadTreeNode, x: number, y: number): boolean {
    return (
      x >= node.x &&
      x < node.x + node.width &&
      y >= node.y &&
      y < node.y + node.height
    )
  }

  private intersects(node: QuadTreeNode, range: Rectangle): boolean {
    return !(
      range.x + range.width < node.x ||
      range.x > node.x + node.width ||
      range.y + range.height < node.y ||
      range.y > node.y + node.height
    )
  }

  private countNodes(node: QuadTreeNode): number {
    let count = node.points.length

    if (node.divided) {
      count += this.countNodes(node.northeast!)
      count += this.countNodes(node.northwest!)
      count += this.countNodes(node.southeast!)
      count += this.countNodes(node.southwest!)
    }

    return count
  }

  private getTreeDepth(node: QuadTreeNode, currentDepth: number = 0): number {
    if (!node.divided) {
      return currentDepth
    }

    const depths = [
      this.getTreeDepth(node.northeast!, currentDepth + 1),
      this.getTreeDepth(node.northwest!, currentDepth + 1),
      this.getTreeDepth(node.southeast!, currentDepth + 1),
      this.getTreeDepth(node.southwest!, currentDepth + 1)
    ]

    return Math.max(...depths)
  }
}
