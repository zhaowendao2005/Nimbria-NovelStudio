/**
 * 折叠展开行为
 * 处理节点的展开/收起交互
 * 
 * 交互方式：双击节点展开/收起
 */

import type { Graph } from '@antv/g6'
import type { LazyDataManager } from './LazyDataManager'
import type { LazyLayoutEngine, LazyLayoutOptions } from './LazyLayoutEngine'
import type { LazyStyleService } from './styles'

export class CollapsibleNodeBehavior {
  private graph: Graph
  private dataManager: LazyDataManager
  private layoutEngine: LazyLayoutEngine
  private styleService: LazyStyleService
  private layoutOptions: LazyLayoutOptions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private eventHandler: ((evt: any) => void) | null = null
  
  constructor(
    graph: Graph,
    dataManager: LazyDataManager,
    layoutEngine: LazyLayoutEngine,
    styleService: LazyStyleService,
    layoutOptions: LazyLayoutOptions
  ) {
    this.graph = graph
    this.dataManager = dataManager
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
      console.log('[CollapsibleNodeBehavior] 🔍 双击事件触发:', evt)
      
      // G6 5.x 的事件对象结构：evt.target.id 或 evt.itemId
      const nodeId = evt.itemId || evt.target?.id
      console.log('[CollapsibleNodeBehavior] 🔍 nodeId:', nodeId)
      
      if (!nodeId) {
        console.log('[CollapsibleNodeBehavior] ⚠️ 无法获取节点ID')
        return
      }
      
      // 直接从图中获取节点数据
      const nodeData = this.graph.getNodeData(nodeId)
      console.log('[CollapsibleNodeBehavior] 🔍 nodeData:', nodeData)
      
      // 只处理有子节点的节点
      if (nodeData?.data?.hasChildren) {
        console.log('[CollapsibleNodeBehavior] ✅ 节点有子节点，开始切换')
        void this.handleToggle(nodeId, nodeData)
      } else {
        console.log('[CollapsibleNodeBehavior] ⚠️ 节点无子节点或 hasChildren=false')
      }
    }
    
    this.graph.on('node:dblclick', this.eventHandler)
    console.log('[CollapsibleNodeBehavior] 双击事件已绑定')
  }
  
  /**
   * 处理展开/收起
   */
  private async handleToggle(nodeId: string, nodeData: unknown) {
    const data = nodeData as Record<string, unknown>
    const collapsed = (data?.data as Record<string, unknown>)?.collapsed ?? true
    
    if (collapsed) {
      await this.expandNode(nodeId, nodeData)
    } else {
      this.collapseNode(nodeId, nodeData)
    }
  }
  
  /**
   * 展开节点
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async expandNode(nodeId: string, nodeData: unknown) {
    console.log(`[CollapsibleNodeBehavior] 🔽 展开节点: ${nodeId}`)
    
    // 1. 检查是否已加载
    if (this.dataManager.isNodeLoaded(nodeId)) {
      console.log(`[CollapsibleNodeBehavior] ⚠️ 节点 ${nodeId} 已展开，跳过`)
      return
    }
    
    // 2. 获取父节点完整数据（用于传递给布局引擎）
    const parentNode = this.graph.getNodeData(nodeId)
    if (!parentNode) {
      console.error(`[CollapsibleNodeBehavior] 无法获取父节点: ${nodeId}`)
      return
    }
    
    try {
      // 3. 使用布局引擎计算子节点位置
      const layoutResult = await this.layoutEngine.layoutChildren(
        nodeId,
        this.dataManager,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parentNode as any,
        this.layoutOptions
      )
      
      if (layoutResult.nodes.length === 0) {
        console.warn(`[CollapsibleNodeBehavior] 节点 ${nodeId} 没有子节点`)
        return
      }
      
      console.log(`[CollapsibleNodeBehavior] 布局完成: ${layoutResult.nodes.length} 个子节点`)
      
      // 4. 应用样式
      const styledNodes = this.styleService.applyNodeStyles(layoutResult.nodes)
      const styledEdges = this.styleService.applyEdgeStyles(layoutResult.edges)
      
      // 5. 添加到图中
      this.graph.addData({ nodes: styledNodes, edges: styledEdges })
      
      // 6. 更新父节点状态为展开
      this.graph.updateData({ 
        nodes: [{ 
          id: nodeId, 
          data: { 
            ...parentNode.data, 
            collapsed: false 
          } 
        }] 
      })
      
      // 7. 标记为已加载
      this.dataManager.markAsLoaded(nodeId)
      
      // 8. 强制刷新渲染（关键！）
      void this.graph.render()
      
      console.log(`[CollapsibleNodeBehavior] ✅ 节点 ${nodeId} 展开完成`)
    } catch (error) {
      console.error(`[CollapsibleNodeBehavior] ❌ 展开节点失败:`, error)
    }
  }
  
  /**
   * 收起节点
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private collapseNode(nodeId: string, nodeData: unknown) {
    console.log(`[CollapsibleNodeBehavior] 🔼 收起节点: ${nodeId}`)
    
    try {
      // 1. 获取所有后代节点ID
      const descendantIds = this.dataManager.getDescendantIds(nodeId)
      
      console.log(`[CollapsibleNodeBehavior] 将移除 ${descendantIds.length} 个后代节点:`, descendantIds)
      
      // 2. 过滤出真实存在于图中的节点
      const idsInGraph = descendantIds.filter(id => {
        try {
          return this.graph.getNodeData(id) !== undefined
        } catch {
          return false
        }
      })
      
      console.log(`[CollapsibleNodeBehavior] 图中实际存在 ${idsInGraph.length} 个节点`)
      
      // 3. 删除节点（G6 5.x 使用纯字符串数组）
      if (idsInGraph.length > 0) {
        this.graph.removeData({ nodes: idsInGraph })
        console.log(`[CollapsibleNodeBehavior] ✅ 成功删除 ${idsInGraph.length} 个后代节点`)
      }
      
      // 4. 更新父节点状态为折叠
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
      
      // 5. 标记为未加载
      this.dataManager.markAsUnloaded(nodeId)
      
      // 6. 强制刷新渲染
      void this.graph.render()
      
      console.log(`[CollapsibleNodeBehavior] ✅ 节点 ${nodeId} 收起完成`)
    } catch (error) {
      console.error(`[CollapsibleNodeBehavior] ❌ 收起节点失败:`, error)
    }
  }
  
  /**
   * 销毁
   */
  destroy() {
    if (this.eventHandler) {
      this.graph.off('node:dblclick', this.eventHandler)
      this.eventHandler = null
    }
    console.log('[CollapsibleNodeBehavior] 已销毁')
  }
}
