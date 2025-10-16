/**
 * StarChart Mock 数据
 * 包含 30 个节点，每个节点平均 3-5 条关系
 * 节点类型：角色、地点、事件、物品等
 */

import type { StarChartNode, StarChartEdge, StarChartGraphData } from './starChart.types'

/**
 * 生成分组层级化的大规模测试数据
 * 20个组，每组20个节点，总计400节点 + 2500边
 * 布局策略：
 * - 8个组随机分布在内圈（半径800内）
 * - 12个组环绕在外圈（半径1200的圆上）
 * - 组间最小距离：3倍组半径（450）
 * - 每组内节点形成层级化小圆簇
 */
export function generateLargeGraphData(): StarChartGraphData {
  const nodes: StarChartNode[] = []
  const edges: StarChartEdge[] = []
  
  const GROUP_COUNT = 20  // 组数
  const TOTAL_EDGES = 2500  // 总边数
  
  // 🔥 布局参数
  const OUTER_RADIUS = 3000      // 外圈12个组的大圆半径
  const INNER_RADIUS = 2000       // 内圈8个组的随机分布半径
  const CLUSTER_RADIUS = 150     // 每组内节点的半径
  const MIN_GROUP_DISTANCE = CLUSTER_RADIUS * 3  // 组间最小距离（3倍组半径）
  const INNER_GROUP_COUNT = 8    // 内圈随机分布的组数
  const OUTER_GROUP_COUNT = 12   // 外圈环绕的组数
  
  // 20种不同颜色（每组一个颜色）
  const groupColors = [
    '#ff6b6b', '#f06595', '#cc5de8', '#845ef7', '#5c7cfa',
    '#339af0', '#22b8cf', '#20c997', '#51cf66', '#94d82d',
    '#ffd43b', '#ffc078', '#ff922b', '#ff6b6b', '#f06595',
    '#e64980', '#be4bdb', '#7950f2', '#4c6ef5', '#228be6'
  ]
  
  // 层级配置
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
  
  // 为每个组生成节点
  interface GroupInfo {
    id: number
    color: string
    nodes: StarChartNode[]
  }
  
  const groups: GroupInfo[] = []
  
  for (let groupIdx = 0; groupIdx < GROUP_COUNT; groupIdx++) {
    const color = groupColors[groupIdx]
    
    const groupNodes: StarChartNode[] = []
    let nodeIndexInGroup = 0
    
    // 为每个层级生成节点
    for (const hierarchy of hierarchyLevels) {
      for (let i = 0; i < hierarchy.count; i++) {
      const scoreMin = hierarchy.scoreRange[0] ?? 0.5
      const scoreMax = hierarchy.scoreRange[1] ?? 1.0
      const score = scoreMin + Math.random() * (scoreMax - scoreMin)
      
      const node: StarChartNode & {
          groupId?: number
          hierarchy?: number
          edgeTarget?: [number, number]
          scatteredTo?: number
        } = {
          id: `g${groupIdx}-n${nodeIndexInGroup}`,
          name: `G${groupIdx}-${hierarchy.name}${i + 1}`,
          type: 'group-node',
          score,
          color: color || '#868e96',
          // 扩展属性（用于布局和连线）
          groupId: groupIdx,
          hierarchy: hierarchy.level,
          edgeTarget: [hierarchy.edgeRange[0] ?? 1, hierarchy.edgeRange[1] ?? 3]
          // 🔥 不预设位置，让 fcose 自己计算
        }
        
        groupNodes.push(node)
        nodeIndexInGroup++
      }
    }
    
    groups.push({
      id: groupIdx,
      color: color || '#868e96',
      nodes: groupNodes
    })
    
    nodes.push(...groupNodes)
  }
  
  // 🔥 计算每个节点的预设位置
  // 为内圈8个组生成随机但不重叠的位置
  interface GroupCenter {
    x: number
    y: number
  }
  const groupCenters: GroupCenter[] = []
  
  // 生成内圈8个组的随机位置（确保不重叠）
  for (let i = 0; i < INNER_GROUP_COUNT; i++) {
    let attempts = 0
    let validPosition = false
    let centerX = 0
    let centerY = 0
    
    while (!validPosition && attempts < 100) {
      // 在内圈半径范围内随机生成位置
      const angle = Math.random() * 2 * Math.PI
      const distance = Math.random() * INNER_RADIUS
      centerX = Math.cos(angle) * distance
      centerY = Math.sin(angle) * distance
      
      // 检查与已有组中心的距离
      validPosition = true
      for (const existing of groupCenters) {
        const dist = Math.sqrt((centerX - existing.x) ** 2 + (centerY - existing.y) ** 2)
        if (dist < MIN_GROUP_DISTANCE) {
          validPosition = false
          break
        }
      }
      attempts++
    }
    
    groupCenters.push({ x: centerX, y: centerY })
  }
  
  // 生成外圈12个组的位置（环绕分布）
  for (let i = 0; i < OUTER_GROUP_COUNT; i++) {
    const groupAngle = (i / OUTER_GROUP_COUNT) * 2 * Math.PI
    const centerX = Math.cos(groupAngle) * OUTER_RADIUS
    const centerY = Math.sin(groupAngle) * OUTER_RADIUS
    groupCenters.push({ x: centerX, y: centerY })
  }
  
  // 为每个组内的节点分配位置
  for (let groupIdx = 0; groupIdx < GROUP_COUNT; groupIdx++) {
    const groupCenter = groupCenters[groupIdx]
    if (!groupCenter) continue
    
    const group = groups[groupIdx]
    if (!group) continue
    
    const groupNodes = group.nodes
    const nodeCount = groupNodes.length
    
    groupNodes.forEach((node: any, nodeIdx) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const hierarchy = node.hierarchy || 1
      
      // 层级越高越靠近组中心（中心节点在最内圈）
      // hierarchy: 5(中心) -> 距离系数 0.2
      // hierarchy: 1(普通) -> 距离系数 1.0
      const distanceFactor = 1.2 - (hierarchy * 0.2)
      
      // 节点在组内小圆上的角度
      const nodeAngle = (nodeIdx / nodeCount) * 2 * Math.PI + Math.random() * 0.3
      
      // 计算节点位置
      const radius = CLUSTER_RADIUS * distanceFactor
      node.position = {
        x: groupCenter.x + Math.cos(nodeAngle) * radius,
        y: groupCenter.y + Math.sin(nodeAngle) * radius
      }
    })
  }
  
  // 10%节点重新分配到其他组附近（跨组连接）
  const scatterCount = Math.floor(nodes.length * 0.1)
  const scatteredNodes = new Set<string>()
  
  for (let i = 0; i < scatterCount; i++) {
    const nodeToScatter: any = nodes[Math.floor(Math.random() * nodes.length)] // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!nodeToScatter || scatteredNodes.has(nodeToScatter.id)) continue
    
    // 选择另一个组
    const targetGroupIdx = Math.floor(Math.random() * GROUP_COUNT)
    if (targetGroupIdx === nodeToScatter.groupId) continue
    
    const targetGroupCenter = groupCenters[targetGroupIdx]
    if (!targetGroupCenter) continue
    
    // 🔥 重新定位到目标组附近
    const scatterAngle = Math.random() * 2 * Math.PI
    const scatterDistance = CLUSTER_RADIUS * (0.6 + Math.random() * 0.6)
    
    nodeToScatter.position = {
      x: targetGroupCenter.x + Math.cos(scatterAngle) * scatterDistance,
      y: targetGroupCenter.y + Math.sin(scatterAngle) * scatterDistance
    }
    
    // 标记节点被分散到其他组（用于连线逻辑）
    nodeToScatter.scatteredTo = targetGroupIdx
    scatteredNodes.add(nodeToScatter.id)
  }
  
  // 生成边（根据层级）
  const usedEdges = new Set<string>()
  
  // 1. 为每个节点生成符合其层级的边数
  for (const node of nodes) {
    const nodeAny: any = node // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!nodeAny.edgeTarget) continue
    
    const targetEdgeCount = nodeAny.edgeTarget[0] + Math.floor(Math.random() * (nodeAny.edgeTarget[1] - nodeAny.edgeTarget[0]))
    
    for (let i = 0; i < targetEdgeCount; i++) {
      // 80%概率连接同组，20%概率连接其他组
      const sameGroup = Math.random() < 0.8
      let candidateNodes: StarChartNode[]
      
      if (sameGroup && nodeAny.groupId !== undefined) {
        const group = groups[nodeAny.groupId]
        candidateNodes = group ? group.nodes.filter(n => n.id !== node.id) : []
      } else {
        candidateNodes = nodes.filter((n: any) => n.id !== node.id && n.groupId !== nodeAny.groupId) // eslint-disable-line @typescript-eslint/no-explicit-any
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
  
  console.log(`[Mock] 生成了 ${nodes.length} 个节点 (${GROUP_COUNT}组), ${edges.length} 条边`)
  console.log(`[Mock] 布局策略: ${INNER_GROUP_COUNT}组随机内圈 + ${OUTER_GROUP_COUNT}组环绕外圈`)
  console.log(`[Mock] 内圈半径: ${INNER_RADIUS}, 外圈半径: ${OUTER_RADIUS}, 组间最小距离: ${MIN_GROUP_DISTANCE}`)
  console.log(`[Mock] 分散节点: ${scatteredNodes.size} 个`)
  
  // 🔥 调试：检查位置是否正确计算
  const nodesWithPos = nodes.filter(n => n.position)
  console.log(`[Mock] 有位置信息的节点: ${nodesWithPos.length} / ${nodes.length}`)
  if (nodesWithPos.length > 0) {
    const firstNode = nodesWithPos[0]
    const lastNode = nodesWithPos[nodesWithPos.length - 1]
    if (firstNode) console.log(`[Mock] 第一个节点位置:`, firstNode.position)
    if (lastNode) console.log(`[Mock] 最后一个节点位置:`, lastNode.position)
  }

  return { nodes, edges }
}

// Mock 节点数据 (30个 - 小说设定关系网络)
export const mockNodes: StarChartNode[] = [
  // 主要角色 (6个)
  { id: 'char-1', name: '凌云', type: 'protagonist', score: 0.95, color: '#ff6b6b' },
  { id: 'char-2', name: '烟雨', type: 'heroine', score: 0.9, color: '#f06595' },
  { id: 'char-3', name: '魔尊', type: 'antagonist', score: 0.88, color: '#5c7cfa' },
  { id: 'char-4', name: '清风上人', type: 'mentor', score: 0.78, color: '#51cf66' },
  { id: 'char-5', name: '剑痴', type: 'supporting', score: 0.65, color: '#868e96' },
  { id: 'char-6', name: '月琴仙子', type: 'supporting', score: 0.62, color: '#a78bfa' },
  
  // 次要角色 (8个)
  { id: 'char-7', name: '张三', type: 'supporting', score: 0.45, color: '#868e96' },
  { id: 'char-8', name: '李四', type: 'supporting', score: 0.42, color: '#868e96' },
  { id: 'char-9', name: '王五', type: 'supporting', score: 0.48, color: '#868e96' },
  { id: 'char-10', name: '赵六', type: 'antagonist_minor', score: 0.55, color: '#94d82d' },
  { id: 'char-11', name: '孙七', type: 'supporting', score: 0.38, color: '#868e96' },
  { id: 'char-12', name: '周八', type: 'supporting', score: 0.40, color: '#868e96' },
  { id: 'char-13', name: '吴九', type: 'supporting', score: 0.52, color: '#868e96' },
  { id: 'char-14', name: '郑十', type: 'mentor', score: 0.58, color: '#51cf66' },
  
  // 地点 (7个)
  { id: 'place-1', name: '凌霄宗', type: 'location', score: 0.75, color: '#ffd43b' },
  { id: 'place-2', name: '魔渊地狱', type: 'location', score: 0.72, color: '#fa5252' },
  { id: 'place-3', name: '清风山庄', type: 'location', score: 0.65, color: '#ffd43b' },
  { id: 'place-4', name: '仙界秘境', type: 'location', score: 0.68, color: '#ffd43b' },
  { id: 'place-5', name: '禁地遗迹', type: 'location', score: 0.70, color: '#ff922b' },
  { id: 'place-6', name: '落日城', type: 'location', score: 0.55, color: '#ffd43b' },
  { id: 'place-7', name: '妖兽森林', type: 'location', score: 0.58, color: '#ffd43b' },
  
  // 事件 (5个)
  { id: 'event-1', name: '秘境开启', type: 'event', score: 0.85, color: '#ff8787' },
  { id: 'event-2', name: '大战决战', type: 'event', score: 0.82, color: '#ff8787' },
  { id: 'event-3', name: '宗门历练', type: 'event', score: 0.60, color: '#ff8787' },
  { id: 'event-4', name: '魔族入侵', type: 'event', score: 0.80, color: '#ff8787' },
  { id: 'event-5', name: '渡劫成仙', type: 'event', score: 0.75, color: '#ff8787' },
  
  // 物品/功法 (4个)
  { id: 'item-1', name: '诛仙剑', type: 'item', score: 0.70, color: '#74c0fc' },
  { id: 'item-2', name: '混元功', type: 'technique', score: 0.68, color: '#74c0fc' },
  { id: 'item-3', name: '仙经秘籍', type: 'item', score: 0.55, color: '#74c0fc' },
  { id: 'item-4', name: '破魔珠', type: 'item', score: 0.62, color: '#74c0fc' }
]

// Mock 边数据 (关系网络 - 每个节点平均3-5条)
export const mockEdges: StarChartEdge[] = [
  // 凌云关系 (5条)
  { id: 'e1', source: 'char-1', target: 'char-2', weight: 0.95, type: 'love', label: '爱情' },
  { id: 'e2', source: 'char-1', target: 'char-3', weight: 0.90, type: 'conflict', label: '宿敌' },
  { id: 'e3', source: 'char-1', target: 'char-4', weight: 0.80, type: 'mentor', label: '师徒' },
  { id: 'e4', source: 'char-1', target: 'place-1', weight: 0.75, type: 'location', label: '宗主' },
  { id: 'e5', source: 'char-1', target: 'item-1', weight: 0.70, type: 'possession', label: '持有' },
  
  // 烟雨关系 (4条)
  { id: 'e6', source: 'char-2', target: 'char-5', weight: 0.68, type: 'friendship', label: '朋友' },
  { id: 'e7', source: 'char-2', target: 'char-14', weight: 0.65, type: 'mentor', label: '师长' },
  { id: 'e8', source: 'char-2', target: 'place-3', weight: 0.60, type: 'location', label: '出身' },
  { id: 'e9', source: 'char-2', target: 'item-2', weight: 0.62, type: 'learn', label: '修炼' },
  
  // 魔尊关系 (5条)
  { id: 'e10', source: 'char-3', target: 'char-10', weight: 0.75, type: 'alliance', label: '手下' },
  { id: 'e11', source: 'char-3', target: 'place-2', weight: 0.85, type: 'location', label: '统治' },
  { id: 'e12', source: 'char-3', target: 'event-4', weight: 0.80, type: 'participate', label: '发起' },
  { id: 'e13', source: 'char-3', target: 'event-1', weight: 0.70, type: 'conflict', label: '对抗' },
  { id: 'e14', source: 'char-3', target: 'item-4', weight: 0.65, type: 'possession', label: '持有' },
  
  // 清风上人关系 (4条)
  { id: 'e15', source: 'char-4', target: 'place-1', weight: 0.80, type: 'location', label: '宗内' },
  { id: 'e16', source: 'char-4', target: 'char-5', weight: 0.72, type: 'mentor', label: '教导' },
  { id: 'e17', source: 'char-4', target: 'item-2', weight: 0.70, type: 'teach', label: '传授' },
  { id: 'e18', source: 'char-4', target: 'event-1', weight: 0.68, type: 'participate', label: '参与' },
  
  // 剑痴关系 (3条)
  { id: 'e19', source: 'char-5', target: 'item-1', weight: 0.75, type: 'obsession', label: '痴迷' },
  { id: 'e20', source: 'char-5', target: 'event-2', weight: 0.72, type: 'participate', label: '参战' },
  { id: 'e21', source: 'char-5', target: 'char-13', weight: 0.55, type: 'friendship', label: '旧识' },
  
  // 月琴仙子关系 (4条)
  { id: 'e22', source: 'char-6', target: 'place-4', weight: 0.70, type: 'location', label: '驻地' },
  { id: 'e23', source: 'char-6', target: 'event-2', weight: 0.68, type: 'participate', label: '助战' },
  { id: 'e24', source: 'char-6', target: 'char-2', weight: 0.62, type: 'friendship', label: '知己' },
  { id: 'e25', source: 'char-6', target: 'item-3', weight: 0.58, type: 'possession', label: '收藏' },
  
  // 赵六关系 (3条)
  { id: 'e26', source: 'char-10', target: 'place-2', weight: 0.72, type: 'location', label: '驻扎' },
  { id: 'e27', source: 'char-10', target: 'event-4', weight: 0.70, type: 'participate', label: '参与' },
  { id: 'e28', source: 'char-10', target: 'char-11', weight: 0.60, type: 'alliance', label: '同党' },
  
  // 郑十关系 (3条)
  { id: 'e29', source: 'char-14', target: 'place-3', weight: 0.75, type: 'location', label: '创建' },
  { id: 'e30', source: 'char-14', target: 'event-3', weight: 0.65, type: 'participate', label: '主持' },
  { id: 'e31', source: 'char-14', target: 'char-6', weight: 0.68, type: 'friendship', label: '至友' },
  
  // 地点间关系 (3条)
  { id: 'e32', source: 'place-1', target: 'place-3', weight: 0.55, type: 'neighbor', label: '邻近' },
  { id: 'e33', source: 'place-2', target: 'place-5', weight: 0.65, type: 'connection', label: '相连' },
  { id: 'e34', source: 'place-5', target: 'place-7', weight: 0.50, type: 'neighbor', label: '接壤' },
  
  // 事件间关系 (3条)
  { id: 'e35', source: 'event-1', target: 'event-4', weight: 0.70, type: 'causality', label: '引发' },
  { id: 'e36', source: 'event-4', target: 'event-2', weight: 0.75, type: 'sequence', label: '导致' },
  { id: 'e37', source: 'event-2', target: 'event-5', weight: 0.68, type: 'consequence', label: '成就' },
  
  // 物品使用关系 (3条)
  { id: 'e38', source: 'item-1', target: 'item-4', weight: 0.60, type: 'combination', label: '可结合' },
  { id: 'e39', source: 'item-2', target: 'event-1', weight: 0.65, type: 'requirement', label: '需要' },
  { id: 'e40', source: 'item-3', target: 'item-2', weight: 0.55, type: 'contain', label: '记载' }
]

// Mock 完整图数据
export const mockGraphData: StarChartGraphData = {
  nodes: mockNodes,
  edges: mockEdges
}

// 转换为 Cytoscape 格式
export function convertToCytoscapeFormat(graphData: StarChartGraphData) {
  // 🔥 创建节点ID到颜色的映射（性能优化）
  const nodeColorMap = new Map<string, string>()

  const nodes = graphData.nodes.map(node => {
    const nodeColor = node.color || '#999'
    nodeColorMap.set(node.id, nodeColor)

    // 🔥 预计算节点的边框颜色（用于高亮状态）
    const borderColor = nodeColor
    const highlightBorderColor = nodeColor

    const element: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
      data: {
        id: node.id,
        name: node.name,
        score: node.score || 0.5,
        type: node.type,
        color: nodeColor,
        // 🔥 预计算的样式属性
        borderColor: borderColor,
        highlightBorderColor: highlightBorderColor,
        // 🔥 预计算节点大小（避免mapData函数调用）
        nodeWidth: Math.max(20, Math.min(60, 20 + (node.score || 0.5) * 40)),
        nodeHeight: Math.max(20, Math.min(60, 20 + (node.score || 0.5) * 40))
      },
      group: 'nodes' as const
    }
    // 🔥 传递预设位置（用于 preset 布局）
    if (node.position) {
      element.position = node.position
    }
    return element
  })

  // 🔥 预先计算边的所有样式属性（避免拖动时动态计算导致卡顿）
  const edges = graphData.edges.map((edge, index) => {
    const sourceColor = nodeColorMap.get(edge.source) || '#999'
    const targetColor = nodeColorMap.get(edge.target) || '#999'
    // 同色用该色，异色用源节点色
    const edgeColor = sourceColor === targetColor ? sourceColor : sourceColor

    // 🔥 预计算弧线控制点距离（基于边的索引，避免字符串解析）
    const controlPointDistance = ((index % 100) - 50) * 0.8 // 降低弧度变化范围
    
    // 🔥 预计算边宽度
    const edgeWidth = Math.max(1, Math.min(4, 1 + (edge.weight || 0.5) * 3))

    return {
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        weight: edge.weight || 0.5,
        type: edge.type,
        label: edge.label,
        // 🔥 预计算的样式属性
        edgeColor: edgeColor,
        edgeWidth: edgeWidth,
        controlPointDistance: controlPointDistance,
        targetArrowColor: edgeColor
      },
      group: 'edges' as const
    }
  })

  return [...nodes, ...edges]
}

// 🔥 生成大规模测试数据（400节点 + 2500边，20个分组）
export const largeMockGraphData = generateLargeGraphData()

// 默认导出
export default {
  mockGraphData,
  largeMockGraphData,
  convertToCytoscapeFormat
}

