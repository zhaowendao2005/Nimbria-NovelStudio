/**
 * MC配方静态数据源
 * 解析 McRecipe/recipes.json 并转换为图数据
 * 支持3.4万配方的大规模数据处理
 */
import type { RawGraphData, RawNode, RawEdge, ZoneInfo } from '../types'
import type { DataSourceMetadata } from '../base/DataSourceTypes'
import { StaticDataSource, type LoadOptions } from '../base/DataSourceBase'

/**
 * MC配方JSON格式
 */
interface MCRecipeJSON {
  metadata: {
    totalRecipes: number
    shapedRecipes: number
    shapelessRecipes: number
    invalidRecipes: number
    exportTime: string
  }
  recipes: MCRecipe[]
}

interface MCRecipe {
  type: 'shaped' | 'shapeless'
  name: string
  output: MCItem
  input: (MCItem | null)[][]
  rawLine: string
}

interface MCItem {
  modid: string
  item: string
  meta: string
  count: number
  fullName: string
}

/**
 * MC配方数据源
 */
export class MCRecipeStaticDataSource extends StaticDataSource {
  readonly metadata: DataSourceMetadata = {
    id: 'mcrecipe-static',
    name: 'Minecraft 配方图谱',
    category: 'static',
    description: '基于 MC 模组配方的大规模依赖关系图（3.4万配方）',
    estimatedNodeCount: 40000,
    estimatedEdgeCount: 100000,
    recommendedLayouts: ['hierarchical-lod'],
    requiredLayouts: ['hierarchical-lod'],
    requiresPreprocessing: true
  }
  
  // 预处理后的数据缓存
  private preprocessedData: RawGraphData | null = null
  private rawRecipes: MCRecipeJSON | null = null
  
  /**
   * 加载图数据
   */
  async loadGraphData(options?: LoadOptions): Promise<RawGraphData> {
    console.log('[MCRecipe DataSource] 开始加载MC配方数据')
    
    // 如果已经预处理过，直接返回
    if (this.preprocessedData) {
      console.log('[MCRecipe DataSource] 使用缓存数据')
      return this.applyOptions(this.preprocessedData, options)
    }
    
    try {
      // 加载原始JSON
      this.rawRecipes = await this.loadRawRecipes()
      
      // 预处理转换为图数据
      this.preprocessedData = await this.preprocess(this.rawRecipes)
      
      console.log(`[MCRecipe DataSource] 加载完成: ${this.preprocessedData.nodes.length} 节点, ${this.preprocessedData.edges.length} 边`)
      
      return this.applyOptions(this.preprocessedData, options)
    } catch (error) {
      console.error('[MCRecipe DataSource] 加载失败:', error)
      throw error
    }
  }
  
  /**
   * 加载原始JSON文件
   */
  private async loadRawRecipes(): Promise<MCRecipeJSON> {
    try {
      // 从 public 目录加载（Vite 会将 public 目录映射到根路径）
      console.log('[MCRecipe DataSource] 开始加载MC配方JSON...')
      const response = await fetch('/recipes.json')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      console.log('[MCRecipe DataSource] JSON下载完成，开始解析（这可能需要一些时间...）')
      const data = await response.json()
      console.log(`[MCRecipe DataSource] JSON解析完成，共 ${data.metadata.totalRecipes} 个配方`)
      
      return data
    } catch (error) {
      console.error('[MCRecipe DataSource] JSON加载失败:', error)
      throw new Error(`无法加载MC配方数据: ${error}`)
    }
  }
  
  /**
   * 预处理：将配方JSON转换为图数据
   */
  async preprocess(rawData: MCRecipeJSON): Promise<RawGraphData> {
    console.log('[MCRecipe DataSource] 开始预处理...')
    const startTime = Date.now()
    
    const nodes: RawNode[] = []
    const edges: RawEdge[] = []
    const nodeMap = new Map<string, RawNode>()
    
    // 统计信息
    let processedRecipes = 0
    const totalRecipes = rawData.recipes.length
    
    // 1. 构建物品节点和配方节点
    for (const recipe of rawData.recipes) {
      processedRecipes++
      
      // 每1000个配方打印一次进度
      if (processedRecipes % 1000 === 0) {
        console.log(`[MCRecipe DataSource] 处理进度: ${processedRecipes}/${totalRecipes} (${Math.round(processedRecipes/totalRecipes*100)}%)`)
      }
      
      // 配方节点
      const recipeNodeId = `recipe:${recipe.name}`
      if (!nodeMap.has(recipeNodeId)) {
        const recipeNode: RawNode = {
          id: recipeNodeId,
          name: recipe.output.item,
          type: 'recipe',
          score: 0.5,
          color: this.getModColor(recipe.output.modid),
          hierarchy: Math.floor(Math.random() * 5) + 1,  // 暂时随机
          metadata: {
            recipeType: recipe.type,
            modid: recipe.output.modid,
            recipeName: recipe.name,
            canExpand: true,
            zoneId: recipe.output.modid
          }
        }
        nodes.push(recipeNode)
        nodeMap.set(recipeNodeId, recipeNode)
      }
      
      // 产物节点
      const outputId = `item:${recipe.output.fullName}`
      if (!nodeMap.has(outputId)) {
        const outputNode: RawNode = {
          id: outputId,
          name: recipe.output.item,
          type: 'item',
          score: 0.3,
          color: this.getModColor(recipe.output.modid),
          hierarchy: Math.floor(Math.random() * 5) + 1,
          metadata: {
            modid: recipe.output.modid,
            meta: recipe.output.meta,
            fullName: recipe.output.fullName,
            zoneId: recipe.output.modid
          }
        }
        nodes.push(outputNode)
        nodeMap.set(outputId, outputNode)
      }
      
      // 配方 → 产物 边
      edges.push({
        id: `edge:${recipeNodeId}-${outputId}`,
        source: recipeNodeId,
        target: outputId,
        type: 'produces',
        weight: 0.8,
        label: `×${recipe.output.count}`
      })
      
      // 输入节点和边
      if (Array.isArray(recipe.input)) {
        for (const inputSlot of recipe.input) {
          // 确保 inputSlot 是数组
          if (!Array.isArray(inputSlot)) continue
          
          for (const inputItem of inputSlot) {
            if (!inputItem) continue  // 跳过null
            
            const inputId = `item:${inputItem.fullName}`
            
            // 创建输入物品节点（如果不存在）
            if (!nodeMap.has(inputId)) {
              const inputNode: RawNode = {
                id: inputId,
                name: inputItem.item,
                type: 'item',
                score: 0.3,
                color: this.getModColor(inputItem.modid),
                hierarchy: Math.floor(Math.random() * 5) + 1,
                metadata: {
                  modid: inputItem.modid,
                  meta: inputItem.meta,
                  fullName: inputItem.fullName,
                  zoneId: inputItem.modid
                }
              }
              nodes.push(inputNode)
              nodeMap.set(inputId, inputNode)
            }
            
            // 输入 → 配方 边
            edges.push({
              id: `edge:${inputId}-${recipeNodeId}-${inputItem.count}`,
              source: inputId,
              target: recipeNodeId,
              type: 'requires',
              weight: 0.5,
              label: inputItem.count > 1 ? `×${inputItem.count}` : undefined
            })
          }
        }
      }
    }
    
    console.log('[MCRecipe DataSource] 节点和边构建完成，开始检测分区...')
    
    // 2. 检测模组大区
    const zones = this.detectModZones(nodes)
    console.log(`[MCRecipe DataSource] 检测到 ${zones.length} 个模组大区`)
    
    // 3. 标记边缘节点
    this.markBoundaryNodes(nodes, edges, zones)
    console.log('[MCRecipe DataSource] 边缘节点标记完成')
    
    const elapsed = Date.now() - startTime
    console.log(`[MCRecipe DataSource] 预处理完成: ${nodes.length} 节点, ${edges.length} 边, ${zones.length} 大区，耗时 ${elapsed}ms`)
    
    return {
      nodes,
      edges,
      metadata: {
        zones,
        totalRecipes: rawData.metadata.totalRecipes,
        source: 'mcrecipe',
        preprocessTime: elapsed
      }
    }
  }
  
  /**
   * 检测模组大区
   */
  private detectModZones(nodes: RawNode[]): ZoneInfo[] {
    const modGroups = new Map<string, RawNode[]>()
    
    // 按modid分组
    for (const node of nodes) {
      const modid = node.metadata?.modid || node.metadata?.zoneId || 'unknown'
      if (!modGroups.has(modid)) {
        modGroups.set(modid, [])
      }
      modGroups.get(modid)!.push(node)
    }
    
    // 转换为大区信息
    const zones: ZoneInfo[] = []
    
    for (const [modid, zoneNodes] of modGroups.entries()) {
      if (zoneNodes.length < 5) continue  // 忽略太小的模组
      
      const recipeCount = zoneNodes.filter(n => n.type === 'recipe').length
      const itemCount = zoneNodes.filter(n => n.type === 'item').length
      
      zones.push({
        id: modid,
        name: this.getModName(modid),
        color: this.getModColor(modid),
        nodeIds: zoneNodes.map(n => n.id),
        level: 0,
        recipeCount,
        itemCount
      })
    }
    
    // 按配方数量排序（大模组在前）
    zones.sort((a, b) => (b.recipeCount || 0) - (a.recipeCount || 0))
    
    console.log('[MCRecipe DataSource] 前10大模组:')
    zones.slice(0, 10).forEach((zone, index) => {
      console.log(`  ${index + 1}. ${zone.name} (${zone.recipeCount} 配方, ${zone.itemCount} 物品)`)
    })
    
    return zones
  }
  
  /**
   * 标记边缘节点（与其他大区有连接的节点）
   */
  private markBoundaryNodes(
    nodes: RawNode[],
    edges: RawEdge[],
    zones: ZoneInfo[]
  ): void {
    const nodeZoneMap = new Map<string, string>()
    
    // 构建节点→大区映射
    for (const zone of zones) {
      for (const nodeId of zone.nodeIds) {
        nodeZoneMap.set(nodeId, zone.id)
      }
    }
    
    // 检查每条边，标记跨大区的节点
    let boundaryNodeCount = 0
    for (const edge of edges) {
      const sourceZone = nodeZoneMap.get(edge.source)
      const targetZone = nodeZoneMap.get(edge.target)
      
      if (sourceZone && targetZone && sourceZone !== targetZone) {
        // 跨大区连接，标记为边缘节点
        const sourceNode = nodes.find(n => n.id === edge.source)
        const targetNode = nodes.find(n => n.id === edge.target)
        
        if (sourceNode && !sourceNode.metadata?.isBoundaryNode) {
          sourceNode.metadata = {
            ...sourceNode.metadata,
            isBoundaryNode: true
          }
          boundaryNodeCount++
        }
        if (targetNode && !targetNode.metadata?.isBoundaryNode) {
          targetNode.metadata = {
            ...targetNode.metadata,
            isBoundaryNode: true
          }
          boundaryNodeCount++
        }
      }
    }
    
    console.log(`[MCRecipe DataSource] 标记了 ${boundaryNodeCount} 个边缘节点`)
  }
  
  /**
   * 应用加载选项（分页、过滤等）
   */
  private applyOptions(
    data: RawGraphData,
    options?: LoadOptions
  ): RawGraphData {
    if (!options) return data
    
    let nodes = data.nodes
    let edges = data.edges
    
    // 应用过滤
    if (options.filter) {
      const modFilter = options.filter.modid
      if (modFilter) {
        console.log(`[MCRecipe DataSource] 应用模组过滤: ${modFilter}`)
        nodes = nodes.filter(n => n.metadata?.modid === modFilter)
        const nodeIds = new Set(nodes.map(n => n.id))
        edges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      }
    }
    
    // 应用分页
    if (options.offset !== undefined && options.limit !== undefined) {
      console.log(`[MCRecipe DataSource] 应用分页: offset=${options.offset}, limit=${options.limit}`)
      nodes = nodes.slice(options.offset, options.offset + options.limit)
      const nodeIds = new Set(nodes.map(n => n.id))
      edges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    }
    
    return { nodes, edges, metadata: data.metadata }
  }
  
  /**
   * 获取模组颜色
   */
  private getModColor(modid: string | undefined): string {
    // 处理 undefined 或空值
    if (!modid) return '#868e96'  // 默认灰色
    
    const colorMap: Record<string, string> = {
      'gregtech': '#4a90e2',
      'appliedenergistics2': '#2ecc71',
      'minecraft': '#8b4513',
      'thermalexpansion': '#e74c3c',
      'enderio': '#9b59b6',
      'thaumcraft': '#e67e22',
      'botania': '#16a085',
      'twilightforest': '#2c3e50',
      'tinkersconstruct': '#d35400',
      'buildcraft': '#c0392b',
      'forestry': '#27ae60',
      'industrialcraft': '#34495e',
      'railcraft': '#7f8c8d',
      'ic2': '#95a5a6',
      'mekanism': '#3498db',
      'galacticraft': '#1abc9c',
      'bigreactors': '#f39c12',
      'extrautils2': '#8e44ad',
      'actuallyadditions': '#e74c3c',
      'rftools': '#3498db'
    }
    return colorMap[modid] || this.hashColor(modid)
  }
  
  /**
   * 获取模组名称
   */
  private getModName(modid: string | undefined): string {
    // 处理 undefined 或空值
    if (!modid) return '未知模组'
    
    const nameMap: Record<string, string> = {
      'gregtech': '格雷科技',
      'appliedenergistics2': '应用能源2',
      'minecraft': '原版',
      'thermalexpansion': '热力膨胀',
      'enderio': '末影接口',
      'thaumcraft': '神秘时代',
      'botania': '植物魔法',
      'twilightforest': '暮色森林',
      'tinkersconstruct': '匠魂',
      'buildcraft': '建筑',
      'forestry': '林业',
      'industrialcraft': '工业',
      'railcraft': '铁路',
      'ic2': '工业2',
      'mekanism': '通用机械',
      'galacticraft': '星系',
      'bigreactors': '大型反应堆',
      'extrautils2': '更多实用设备2',
      'actuallyadditions': '实用拓展',
      'rftools': 'RF工具',
      'ore': '矿物词典',
      'cfm': '家具'
    }
    return nameMap[modid] || modid
  }
  
  /**
   * 基于字符串哈希生成颜色
   */
  private hashColor(str: string): string {
    // 处理空字符串
    if (!str || str.length === 0) return '#868e96'  // 默认灰色
    
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash) % 360
    return `hsl(${hue}, 60%, 50%)`
  }
}

// 导出单例
export const mcrecipeDataSource = new MCRecipeStaticDataSource()

