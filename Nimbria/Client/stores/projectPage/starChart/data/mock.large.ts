/**
 * 性能测试数据 - 400节点 + 2500边
 * 提取自原 data.mock.ts 的 generateLargeGraphData()
 * 但只生成纯数据，不计算位置
 */
import type { RawGraphData, RawNode, RawEdge, GroupInfo } from './types'

/**
 * 生成分组层级化的大规模测试数据
 * 20个组，每组20个节点，总计400节点 + 2500边
 * 注意：不包含位置信息，位置由布局引擎计算
 */
export function generateLargeMockData(): RawGraphData {
  const nodes: RawNode[] = []
  const edges: RawEdge[] = []
  
  const GROUP_COUNT = 20  // 组数
  const NODES_PER_GROUP = 20  // 每组节点数
  const TOTAL_EDGES = 2500  // 总边数
  
  // 20种不同颜色（每组一个颜色）
  const groupColors = [
    '#ff6b6b', '#f06595', '#cc5de8', '#845ef7', '#5c7cfa',
    '#339af0', '#22b8cf', '#20c997', '#51cf66', '#94d82d',
    '#ffd43b', '#ffc078', '#ff922b', '#ff6b6b', '#f06595',
    '#e64980', '#be4bdb', '#7950f2', '#4c6ef5', '#228be6'
  ]
  
  // 层级配置（用于score分配和hierarchy属性）
  const hierarchyLevels = [
    { level: 5, count: 1, scoreRange: [0.9, 1.0], edgeRange: [15, 20], name: '中心' },
    { level: 4, count: 2, scoreRange: [0.8, 0.9], edgeRange: [10, 15], name: '次中心' },
    { level: 3, count: 3, scoreRange: [0.7, 0.8], edgeRange: [6, 10], name: '次次中心' },
    { level: 2, count: 5, scoreRange: [0.6, 0.7], edgeRange: [3, 6], name: '次次次中心' },
    { level: 1, count: 9, scoreRange: [0.5, 0.6], edgeRange: [1, 3], name: '普通' }
  ]
  
  // 边类型
  const edgeTypes = [
    'love', 'conflict', 'mentor', 'friendship', 'alliance',
    'possession', 'participate', 'enemy', 'family', 'master'
  ]
  
  const groups: GroupInfo[] = []
  
  // 为每个组生成节点
  for (let groupIdx = 0; groupIdx < GROUP_COUNT; groupIdx++) {
    const color = groupColors[groupIdx] || '#868e96'
    const groupNodeIds: string[] = []
    
    let nodeIndexInGroup = 0
    
    // 为每个层级生成节点
    for (const hierarchy of hierarchyLevels) {
      for (let i = 0; i < hierarchy.count; i++) {
        const scoreMin = hierarchy.scoreRange[0] ?? 0.5
        const scoreMax = hierarchy.scoreRange[1] ?? 1.0
        const score = scoreMin + Math.random() * (scoreMax - scoreMin)
        
        const node: RawNode = {
          id: `g${groupIdx}-n${nodeIndexInGroup}`,
          name: `G${groupIdx}-${hierarchy.name}${i + 1}`,
          type: 'group-node',
          score,
          color,
          hierarchy: hierarchy.level,
          metadata: {
            groupId: groupIdx,  // 分组信息移到metadata
            groupName: `Group ${groupIdx}`,
            edgeTarget: [hierarchy.edgeRange[0] ?? 1, hierarchy.edgeRange[1] ?? 3]  // 用于生成边
          }
        }
        
        nodes.push(node)
        groupNodeIds.push(node.id)
        nodeIndexInGroup++
      }
    }
    
    groups.push({
      id: groupIdx,
      name: `Group ${groupIdx}`,
      nodeIds: groupNodeIds,
      color
    })
  }
  
  // 生成边（根据层级）
  const usedEdges = new Set<string>()
  
  // 1. 为每个节点生成符合其层级的边数
  for (const node of nodes) {
    const edgeTarget = node.metadata?.edgeTarget as [number, number] | undefined
    if (!edgeTarget) continue
    
    const targetEdgeCount = edgeTarget[0] + Math.floor(Math.random() * (edgeTarget[1] - edgeTarget[0]))
    
    for (let i = 0; i < targetEdgeCount; i++) {
      // 80%概率连接同组，20%概率连接其他组
      const sameGroup = Math.random() < 0.8
      let candidateNodes: RawNode[]
      
      if (sameGroup && node.metadata?.groupId !== undefined) {
        const groupId = node.metadata.groupId
        candidateNodes = nodes.filter(n => n.metadata?.groupId === groupId && n.id !== node.id)
      } else {
        candidateNodes = nodes.filter(n => n.metadata?.groupId !== node.metadata?.groupId && n.id !== node.id)
      }
      
      if (candidateNodes.length === 0) continue
      
      const target = candidateNodes[Math.floor(Math.random() * candidateNodes.length)]
      if (!target) continue
      
      const edgeKey = `${node.id}-${target.id}`
      const reverseKey = `${target.id}-${node.id}`
      
      if (!usedEdges.has(edgeKey) && !usedEdges.has(reverseKey)) {
        edges.push({
          id: `edge-${edges.length}`,
          source: node.id,
          target: target.id,
          type: edgeTypes[Math.floor(Math.random() * edgeTypes.length)] || 'default',
          weight: Math.random() * 0.5 + 0.5,
          label: ''
        })
        usedEdges.add(edgeKey)
      }
      
      if (edges.length >= TOTAL_EDGES) break
    }
    
    if (edges.length >= TOTAL_EDGES) break
  }
  
  // 2. 补充到目标边数（随机连接）
  let attempts = 0
  while (edges.length < TOTAL_EDGES && attempts < TOTAL_EDGES * 2) {
    const source = nodes[Math.floor(Math.random() * nodes.length)]
    const target = nodes[Math.floor(Math.random() * nodes.length)]
    
    if (source && target && source.id !== target.id) {
      const edgeKey = `${source.id}-${target.id}`
      const reverseKey = `${target.id}-${source.id}`
      
      if (!usedEdges.has(edgeKey) && !usedEdges.has(reverseKey)) {
        edges.push({
          id: `edge-${edges.length}`,
          source: source.id,
          target: target.id,
          type: edgeTypes[Math.floor(Math.random() * edgeTypes.length)] || 'default',
          weight: Math.random() * 0.5 + 0.5,
          label: ''
        })
        usedEdges.add(edgeKey)
      }
    }
    attempts++
  }
  
  console.log(`[Mock Large Data] 生成了 ${nodes.length} 个节点 (${GROUP_COUNT}组), ${edges.length} 条边`)
  
  return {
    nodes,
    edges,
    metadata: {
      groupCount: GROUP_COUNT,
      groups
    }
  }
}

// 缓存生成的数据（避免多次生成）
let cachedData: RawGraphData | null = null

export function getLargeMockData(): RawGraphData {
  if (!cachedData) {
    cachedData = generateLargeMockData()
  }
  return cachedData
}

