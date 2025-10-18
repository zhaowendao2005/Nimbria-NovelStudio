/**
 * 测试数据A - 30个节点的小说设定关系网
 * 纯数据，无布局逻辑
 * 从原 data.mock.ts 迁移
 */
import type { RawGraphData, RawNode, RawEdge } from './types'

// 随机分配层级（1-5）
const randomHierarchy = () => Math.floor(Math.random() * 5) + 1

// Mock 节点数据 (30个 - 小说设定关系网络)
const mockNodes: RawNode[] = [
  // 主要角色 (6个)
  { id: 'char-1', name: '凌云', type: 'protagonist', score: 0.95, color: '#ff6b6b', hierarchy: randomHierarchy() },
  { id: 'char-2', name: '烟雨', type: 'heroine', score: 0.9, color: '#f06595', hierarchy: randomHierarchy() },
  { id: 'char-3', name: '魔尊', type: 'antagonist', score: 0.88, color: '#5c7cfa', hierarchy: randomHierarchy() },
  { id: 'char-4', name: '清风上人', type: 'mentor', score: 0.78, color: '#51cf66', hierarchy: randomHierarchy() },
  { id: 'char-5', name: '剑痴', type: 'supporting', score: 0.65, color: '#868e96', hierarchy: randomHierarchy() },
  { id: 'char-6', name: '月琴仙子', type: 'supporting', score: 0.62, color: '#a78bfa', hierarchy: randomHierarchy() },
  
  // 次要角色 (8个)
  { id: 'char-7', name: '张三', type: 'supporting', score: 0.45, color: '#868e96', hierarchy: randomHierarchy() },
  { id: 'char-8', name: '李四', type: 'supporting', score: 0.42, color: '#868e96', hierarchy: randomHierarchy() },
  { id: 'char-9', name: '王五', type: 'supporting', score: 0.48, color: '#868e96', hierarchy: randomHierarchy() },
  { id: 'char-10', name: '赵六', type: 'antagonist_minor', score: 0.55, color: '#94d82d', hierarchy: randomHierarchy() },
  { id: 'char-11', name: '孙七', type: 'supporting', score: 0.38, color: '#868e96', hierarchy: randomHierarchy() },
  { id: 'char-12', name: '周八', type: 'supporting', score: 0.40, color: '#868e96', hierarchy: randomHierarchy() },
  { id: 'char-13', name: '吴九', type: 'supporting', score: 0.52, color: '#868e96', hierarchy: randomHierarchy() },
  { id: 'char-14', name: '郑十', type: 'mentor', score: 0.58, color: '#51cf66', hierarchy: randomHierarchy() },
  
  // 地点 (7个)
  { id: 'place-1', name: '凌霄宗', type: 'location', score: 0.75, color: '#ffd43b', hierarchy: randomHierarchy() },
  { id: 'place-2', name: '魔渊地狱', type: 'location', score: 0.72, color: '#fa5252', hierarchy: randomHierarchy() },
  { id: 'place-3', name: '清风山庄', type: 'location', score: 0.65, color: '#ffd43b', hierarchy: randomHierarchy() },
  { id: 'place-4', name: '仙界秘境', type: 'location', score: 0.68, color: '#ffd43b', hierarchy: randomHierarchy() },
  { id: 'place-5', name: '禁地遗迹', type: 'location', score: 0.70, color: '#ff922b', hierarchy: randomHierarchy() },
  { id: 'place-6', name: '落日城', type: 'location', score: 0.55, color: '#ffd43b', hierarchy: randomHierarchy() },
  { id: 'place-7', name: '妖兽森林', type: 'location', score: 0.58, color: '#ffd43b', hierarchy: randomHierarchy() },
  
  // 事件 (5个)
  { id: 'event-1', name: '秘境开启', type: 'event', score: 0.85, color: '#ff8787', hierarchy: randomHierarchy() },
  { id: 'event-2', name: '大战决战', type: 'event', score: 0.82, color: '#ff8787', hierarchy: randomHierarchy() },
  { id: 'event-3', name: '宗门历练', type: 'event', score: 0.60, color: '#ff8787', hierarchy: randomHierarchy() },
  { id: 'event-4', name: '魔族入侵', type: 'event', score: 0.80, color: '#ff8787', hierarchy: randomHierarchy() },
  { id: 'event-5', name: '渡劫成仙', type: 'event', score: 0.75, color: '#ff8787', hierarchy: randomHierarchy() },
  
  // 物品/功法 (4个)
  { id: 'item-1', name: '诛仙剑', type: 'item', score: 0.70, color: '#74c0fc', hierarchy: randomHierarchy() },
  { id: 'item-2', name: '混元功', type: 'technique', score: 0.68, color: '#74c0fc', hierarchy: randomHierarchy() },
  { id: 'item-3', name: '仙经秘籍', type: 'item', score: 0.55, color: '#74c0fc', hierarchy: randomHierarchy() },
  { id: 'item-4', name: '破魔珠', type: 'item', score: 0.62, color: '#74c0fc', hierarchy: randomHierarchy() }
]

// Mock 边数据 (关系网络 - 每个节点平均3-5条)
const mockEdges: RawEdge[] = [
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
export const mockNormalData: RawGraphData = {
  nodes: mockNodes,
  edges: mockEdges
}

console.log('[Mock Normal Data] 已加载 30 节点测试数据')

