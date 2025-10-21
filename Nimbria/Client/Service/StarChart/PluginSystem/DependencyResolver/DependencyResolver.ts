/**
 * DependencyResolver - 依赖解析器
 * 
 * 职责：
 * - 依赖图构建
 * - 循环依赖检测
 * - 自动安装依赖
 * - 依赖排序
 */

import type { StarChartPlugin, PluginDependency } from 'Business/StarChart'
import { PluginRegistry } from '../PluginRegistry/PluginRegistry'

interface DependencyNode {
  pluginId: string
  dependencies: string[]
  dependents: string[]
  resolved: boolean
}

interface ResolutionResult {
  success: boolean
  order: string[]
  circular?: string[]
  missing?: string[]
}

export class DependencyResolver {
  private registry: PluginRegistry
  private dependencyGraph: Map<string, DependencyNode> = new Map()

  constructor(registry: PluginRegistry) {
    this.registry = registry
  }

  /**
   * 构建依赖图
   */
  buildGraph(plugins: StarChartPlugin[]): void {
    this.dependencyGraph.clear()

    // 第一遍：创建所有节点
    for (const plugin of plugins) {
      this.dependencyGraph.set(plugin.id, {
        pluginId: plugin.id,
        dependencies: [],
        dependents: [],
        resolved: false
      })
    }

    // 第二遍：建立依赖关系
    for (const plugin of plugins) {
      const node = this.dependencyGraph.get(plugin.id)!

      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          const depNode = this.dependencyGraph.get(dep.pluginId)

          if (depNode) {
            node.dependencies.push(dep.pluginId)
            depNode.dependents.push(plugin.id)
          }
        }
      }
    }
  }

  /**
   * 检测循环依赖
   */
  detectCircularDependencies(): string[][] {
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    for (const pluginId of this.dependencyGraph.keys()) {
      if (!visited.has(pluginId)) {
        this.dfsDetectCycle(pluginId, visited, recursionStack, cycles)
      }
    }

    return cycles
  }

  /**
   * 解析依赖顺序
   */
  resolveOrder(): ResolutionResult {
    // 检测循环依赖
    const cycles = this.detectCircularDependencies()
    if (cycles.length > 0) {
      return {
        success: false,
        order: [],
        circular: cycles.flat()
      }
    }

    // 拓扑排序
    const order: string[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    for (const pluginId of this.dependencyGraph.keys()) {
      if (!visited.has(pluginId)) {
        if (!this.topologicalSort(pluginId, visited, visiting, order)) {
          return {
            success: false,
            order: [],
            missing: Array.from(visiting)
          }
        }
      }
    }

    return {
      success: true,
      order
    }
  }

  /**
   * 获取依赖链
   */
  getDependencyChain(pluginId: string): string[] {
    const chain: string[] = []
    const visited = new Set<string>()

    this.collectDependencies(pluginId, chain, visited)

    return chain
  }

  /**
   * 获取反向依赖（依赖该插件的其他插件）
   */
  getReverseDependencies(pluginId: string): string[] {
    const node = this.dependencyGraph.get(pluginId)
    return node?.dependents ?? []
  }

  /**
   * 检查插件是否可以卸载
   */
  canUnload(pluginId: string): boolean {
    const node = this.dependencyGraph.get(pluginId)
    if (!node) return false

    // 如果有其他插件依赖这个插件，则不能卸载
    return node.dependents.length === 0
  }

  /**
   * 获取必需的插件集合（用于卸载时验证）
   */
  getRequiredPlugins(pluginId: string): string[] {
    const required = new Set<string>()
    this.collectAllDependencies(pluginId, required)
    return Array.from(required)
  }

  /**
   * 获取受影响的插件（卸载某个插件时会影响哪些插件）
   */
  getAffectedPlugins(pluginId: string): string[] {
    const affected = new Set<string>()
    this.collectAllDependents(pluginId, affected)
    return Array.from(affected)
  }

  /**
   * 获取依赖图信息
   */
  getGraphStats(): {
    totalPlugins: number
    totalDependencies: number
    cycleCount: number
    orphanedPlugins: string[]
  } {
    let totalDependencies = 0
    const orphaned: string[] = []

    this.dependencyGraph.forEach(node => {
      totalDependencies += node.dependencies.length

      if (node.dependencies.length === 0 && node.dependents.length === 0) {
        orphaned.push(node.pluginId)
      }
    })

    const cycles = this.detectCircularDependencies()

    return {
      totalPlugins: this.dependencyGraph.size,
      totalDependencies,
      cycleCount: cycles.length,
      orphanedPlugins: orphaned
    }
  }

  /**
   * 清除图表
   */
  clear(): void {
    this.dependencyGraph.clear()
  }

  // ============ 私有方法 ============

  /**
   * DFS 循环依赖检测
   */
  private dfsDetectCycle(
    node: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    cycles: string[][]
  ): void {
    visited.add(node)
    recursionStack.add(node)

    const graphNode = this.dependencyGraph.get(node)
    if (graphNode) {
      for (const dep of graphNode.dependencies) {
        if (!visited.has(dep)) {
          this.dfsDetectCycle(dep, visited, recursionStack, cycles)
        } else if (recursionStack.has(dep)) {
          // 找到循环
          cycles.push([node, dep])
        }
      }
    }

    recursionStack.delete(node)
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(
    node: string,
    visited: Set<string>,
    visiting: Set<string>,
    order: string[]
  ): boolean {
    visited.add(node)
    visiting.add(node)

    const graphNode = this.dependencyGraph.get(node)
    if (graphNode) {
      for (const dep of graphNode.dependencies) {
        if (!visited.has(dep)) {
          if (!this.topologicalSort(dep, visited, visiting, order)) {
            return false
          }
        } else if (visiting.has(dep)) {
          // 循环依赖
          return false
        }
      }
    }

    visiting.delete(node)
    order.unshift(node)

    return true
  }

  /**
   * 收集所有直接依赖
   */
  private collectDependencies(
    pluginId: string,
    chain: string[],
    visited: Set<string>
  ): void {
    if (visited.has(pluginId)) return

    visited.add(pluginId)
    chain.push(pluginId)

    const node = this.dependencyGraph.get(pluginId)
    if (node) {
      for (const dep of node.dependencies) {
        this.collectDependencies(dep, chain, visited)
      }
    }
  }

  /**
   * 收集所有依赖（包括间接依赖）
   */
  private collectAllDependencies(pluginId: string, result: Set<string>): void {
    const node = this.dependencyGraph.get(pluginId)
    if (!node) return

    for (const dep of node.dependencies) {
      if (!result.has(dep)) {
        result.add(dep)
        this.collectAllDependencies(dep, result)
      }
    }
  }

  /**
   * 收集所有依赖者（包括间接依赖者）
   */
  private collectAllDependents(pluginId: string, result: Set<string>): void {
    const node = this.dependencyGraph.get(pluginId)
    if (!node) return

    for (const dependent of node.dependents) {
      if (!result.has(dependent)) {
        result.add(dependent)
        this.collectAllDependents(dependent, result)
      }
    }
  }
}
