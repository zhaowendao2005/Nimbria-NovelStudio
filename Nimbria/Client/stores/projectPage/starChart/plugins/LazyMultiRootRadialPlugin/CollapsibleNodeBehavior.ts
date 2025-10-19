/**
 * 折叠展开行为（重构版）
 * 处理节点的展开/收起交互
 * 
 * 重构亮点：
 * - 使用 LazyTreeManager 自维护树结构
 * - 移除对 G6 updateData 的依赖（避免树结构同步问题）
 * - 使用自定义边替代 cubic-radial
 * - 简化同步逻辑，只用 addData / removeData
 * 
 * 交互方式：双击节点展开/收起
 */

import type { Graph } from '@antv/g6'
import type { LazyDataManager } from './LazyDataManager'
import type { LazyTreeManager } from './LazyTreeManager'
import type { LazyLayoutEngine, LazyLayoutOptions } from './LazyLayoutEngine'
import type { LazyStyleService } from './styles'

export class CollapsibleNodeBehavior {
  private graph: Graph
  private dataManager: LazyDataManager
  private treeManager: LazyTreeManager
  private layoutEngine: LazyLayoutEngine
  private styleService: LazyStyleService
  private layoutOptions: LazyLayoutOptions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private eventHandler: ((evt: any) => void) | null = null
  
  constructor(
    graph: Graph,
    dataManager: LazyDataManager,
    treeManager: LazyTreeManager,
    layoutEngine: LazyLayoutEngine,
    styleService: LazyStyleService,
    layoutOptions: LazyLayoutOptions
  ) {
    this.graph = graph
    this.dataManager = dataManager
    this.treeManager = treeManager
    this.layoutEngine = layoutEngine
    this.styleService = styleService
    this.layoutOptions = layoutOptions
    this.bindEvents()
  }
  
  /**
   * 绑定事件
   */
  private bindEvents() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.eventHandler = (evt: any) => {
      console.log('[CollapsibleBehavior] 🔍 双击事件触发')
      
      // G6 5.x 的事件对象结构
      const nodeId = evt.itemId || evt.target?.id
      console.log('[CollapsibleBehavior] 🔍 nodeId:', nodeId)
      
      if (!nodeId) {
        console.warn('[CollapsibleBehavior] ⚠️ 未找到节点ID')
        return
      }
      
      // 获取节点数据
      const nodeData = this.graph.getNodeData(nodeId)
      console.log('[CollapsibleBehavior] 🔍 nodeData:', nodeData)
      
      if (!nodeData) {
        console.warn('[CollapsibleBehavior] ⚠️ 未找到节点数据')
        return
      }
      
      // 检查节点是否有子节点
      const hasChildren = nodeData.data?.hasChildren as boolean ?? false
      console.log('[CollapsibleBehavior] 🔍 hasChildren:', hasChildren)
      
      if (!hasChildren) {
        console.log('[CollapsibleBehavior] ℹ️ 节点无子节点，跳过')
        return
      }
      
      console.log('[CollapsibleBehavior] ✅ 节点有子节点，开始切换')
      void this.handleToggle(nodeId)
    }
    
    this.graph.on('node:dblclick', this.eventHandler)
    console.log('[CollapsibleBehavior] ✅ 事件绑定完成')
  }
  
  /**
   * 切换节点的展开/收起状态
   */
  private async handleToggle(nodeId: string) {
    try {
      const isLoaded = this.treeManager.isLoaded(nodeId)
      
      if (isLoaded) {
        console.log(`[CollapsibleBehavior] 🔼 收起节点: ${nodeId}`)
        await this.collapseNode(nodeId)
      } else {
        console.log(`[CollapsibleBehavior] 🔽 展开节点: ${nodeId}`)
        await this.expandNode(nodeId)
      }
    } catch (error) {
      console.error(`[CollapsibleBehavior] ❌ 切换失败:`, error)
    }
  }
  
  /**
   * 展开节点
   */
  private async expandNode(nodeId: string) {
    try {
      // 1. 获取父节点数据
      const parentNode = this.graph.getNodeData(nodeId)
      if (!parentNode) {
        console.error(`[CollapsibleBehavior] ❌ 父节点不存在: ${nodeId}`)
        return
      }
      
      // 2. 使用布局引擎计算子节点位置
      console.log(`[CollapsibleBehavior] 📐 计算布局: ${nodeId}`)
      const layoutResult = await this.layoutEngine.layoutChildren(
        nodeId,
        this.dataManager,
        parentNode as never,
        this.layoutOptions
      )
      
      console.log(`[CollapsibleBehavior] 📐 布局完成: ${layoutResult.nodes.length} 个子节点`)
      console.log(`[CollapsibleBehavior] 子树结构:`, layoutResult.subtree)
      
      // 检查是否有子节点
      if (layoutResult.nodes.length === 0) {
        console.log(`[CollapsibleBehavior] ℹ️ 节点 ${nodeId} 无子节点`)
        return
      }
      
      // 3. 应用样式
      const styledNodes = this.styleService.applyNodeStyles(layoutResult.nodes)
      const styledEdges = this.styleService.applyEdgeStyles(layoutResult.edges)
      
      console.log(`[CollapsibleBehavior] 🎨 样式应用完成`)
      console.log(`[CollapsibleBehavior] 📊 边类型检查:`, styledEdges.map(e => ({ 
        id: `${e.source}-${e.target}`, 
        type: e.type,
        isDirectLine: e.data?.isDirectLine 
      })))
      
      // 4. 添加数据到图（不再需要同步树结构到 G6）
      this.graph.addData({ 
        nodes: styledNodes, 
        edges: styledEdges 
      })
      
      console.log(`[CollapsibleBehavior] 📊 添加数据: ${styledNodes.length} 个节点, ${styledEdges.length} 条边`)
      
      // 5. 更新树管理器
      const childIds = styledNodes.map(n => n.id)
      this.treeManager.expandNode(nodeId, childIds)
      
      // 6. 更新父节点状态
      this.graph.updateData({ 
        nodes: [{ 
          id: nodeId, 
          data: { 
            ...parentNode.data, 
            collapsed: false,
            _lazyLoaded: true
          } 
        }] 
      })
      
      // 7. 强制刷新渲染
      void this.graph.render()
      
      console.log(`[CollapsibleBehavior] ✅ 节点 ${nodeId} 展开完成`)
      
    } catch (error) {
      console.error(`[CollapsibleBehavior] ❌ 展开节点失败:`, error)
    }
  }
  
  /**
   * 收起节点
   */
  private async collapseNode(nodeId: string) {
    try {
      // 1. 从树管理器获取要删除的后代节点
      const nodesToRemove = this.treeManager.collapseNode(nodeId)
      
      console.log(`[CollapsibleBehavior] 🗑️ 准备删除 ${nodesToRemove.length} 个后代节点`)
      
      if (nodesToRemove.length === 0) {
        console.log(`[CollapsibleBehavior] ℹ️ 节点 ${nodeId} 无后代节点`)
        return
      }
      
      // 2. 过滤出真实存在于图中的节点
      const idsInGraph = nodesToRemove.filter(id => {
        try {
          return !!this.graph.getNodeData(id)
        } catch {
          return false
        }
      })
      
      console.log(`[CollapsibleBehavior] 📊 实际删除: ${idsInGraph.length} 个节点（过滤后）`)
      
      // 3. 从图中删除节点（边会自动删除）
      if (idsInGraph.length > 0) {
        this.graph.removeData({ nodes: idsInGraph })
      }
      
      // 4. 更新父节点状态
      const parentNode = this.graph.getNodeData(nodeId)
      if (parentNode) {
        this.graph.updateData({ 
          nodes: [{ 
            id: nodeId, 
            data: { 
              ...parentNode.data, 
              collapsed: true,
              _lazyLoaded: false
            } 
          }] 
        })
      }
      
      // 5. 强制刷新渲染
      void this.graph.render()
      
      console.log(`[CollapsibleBehavior] ✅ 节点 ${nodeId} 收起完成`)
      
    } catch (error) {
      console.error(`[CollapsibleBehavior] ❌ 收起节点失败:`, error)
    }
  }
  
  /**
   * 清理事件监听
   */
  cleanup() {
    if (this.eventHandler) {
      this.graph.off('node:dblclick', this.eventHandler)
      this.eventHandler = null
      console.log('[CollapsibleBehavior] 🧹 事件清理完成')
    }
  }
}
