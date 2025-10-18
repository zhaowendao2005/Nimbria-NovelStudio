/**
 * 测试数据A - 30个节点的小说设定关系网
 * 直接生成G6原生格式，无需转换
 */
import type { G6GraphData, G6Node, G6Edge } from '../types'
import type { DataSourceMetadata } from '../base/DataSourceTypes'
import { StaticDataSource, type LoadOptions } from '../base/DataSourceBase'
import { 
  getSVGIcon, 
  getRandomSVGIcon, 
  generateNodeSVGDataURL 
} from '../../node.svg.library'

/**
 * 正常规模测试数据源（G6原生格式）
 */
export class MockNormalDataSource extends StaticDataSource {
  readonly metadata: DataSourceMetadata = {
    id: 'mock-normal',
    name: '测试数据A（30节点）',
    category: 'static',
    description: '小说设定关系网，包含角色、地点、事件和物品',
    estimatedNodeCount: 30,
    estimatedEdgeCount: 40,
    recommendedLayouts: ['concentric', 'compact-box'],
    requiresPreprocessing: false
  }
  
  /**
   * 加载G6原生格式图数据（多根树形结构）
   */
  async loadGraphData(options?: LoadOptions): Promise<G6GraphData> {
    const nodes: G6Node[] = []
    const edges: G6Edge[] = []
    
    // 不再有总根节点，每个组都是独立的根节点
    const groups = [
      { id: 'group-0', name: '正道势力', color: '#51cf66', groupId: 0 },
      { id: 'group-1', name: '魔道势力', color: '#5c7cfa', groupId: 1 },
      { id: 'group-2', name: '重要地点', color: '#ffd43b', groupId: 2 },
      { id: 'group-3', name: '关键事件', color: '#ff8787', groupId: 3 }
    ]
    
    // 每个组作为根节点（level 0）
    groups.forEach((group) => {
      nodes.push(this.createNode(group.id, group.name, 'group-root', 0.9, group.color, 0, group.groupId))
    })
    
    // 组0：正道势力树
    this.addTreeBranch(nodes, edges, 'group-0', [
      { id: 'char-1', name: '凌云', type: 'protagonist', score: 0.95, color: '#ff6b6b', groupId: 0, children: [
        { id: 'char-2', name: '烟雨', type: 'heroine', score: 0.9, color: '#f06595', groupId: 0 },
        { id: 'char-5', name: '剑痴', type: 'supporting', score: 0.65, color: '#868e96', groupId: 0 }
      ]},
      { id: 'char-4', name: '清风上人', type: 'mentor', score: 0.78, color: '#51cf66', groupId: 0, children: [
        { id: 'char-7', name: '张三', type: 'supporting', score: 0.45, color: '#868e96', groupId: 0 },
        { id: 'char-8', name: '李四', type: 'supporting', score: 0.42, color: '#868e96', groupId: 0 }
      ]}
    ], 2)
    
    // 组1：魔道势力树
    this.addTreeBranch(nodes, edges, 'group-1', [
      { id: 'char-3', name: '魔尊', type: 'antagonist', score: 0.88, color: '#5c7cfa', groupId: 1, children: [
        { id: 'char-10', name: '赵六', type: 'antagonist_minor', score: 0.55, color: '#94d82d', groupId: 1 },
        { id: 'char-11', name: '孙七', type: 'supporting', score: 0.38, color: '#868e96', groupId: 1 }
      ]},
      { id: 'char-14', name: '郑十', type: 'mentor', score: 0.58, color: '#51cf66', groupId: 1, children: [
        { id: 'char-12', name: '周八', type: 'supporting', score: 0.40, color: '#868e96', groupId: 1 },
        { id: 'char-13', name: '吴九', type: 'supporting', score: 0.52, color: '#868e96', groupId: 1 }
      ]}
    ], 2)
    
    // 组2：地点树
    this.addTreeBranch(nodes, edges, 'group-2', [
      { id: 'place-1', name: '凌霄宗', type: 'location', score: 0.75, color: '#ffd43b', groupId: 2, children: [
        { id: 'place-3', name: '清风山庄', type: 'location', score: 0.65, color: '#ffd43b', groupId: 2 },
        { id: 'place-6', name: '落日城', type: 'location', score: 0.55, color: '#ffd43b', groupId: 2 }
      ]},
      { id: 'place-2', name: '魔渊地狱', type: 'location', score: 0.72, color: '#fa5252', groupId: 2, children: [
        { id: 'place-5', name: '禁地遗迹', type: 'location', score: 0.70, color: '#ff922b', groupId: 2 }
      ]},
      { id: 'place-4', name: '仙界秘境', type: 'location', score: 0.68, color: '#ffd43b', groupId: 2, children: [
        { id: 'place-7', name: '妖兽森林', type: 'location', score: 0.58, color: '#ffd43b', groupId: 2 }
      ]}
    ], 2)
    
    // 组3：事件树
    this.addTreeBranch(nodes, edges, 'group-3', [
      { id: 'event-1', name: '秘境开启', type: 'event', score: 0.85, color: '#ff8787', groupId: 3, children: [
        { id: 'event-3', name: '宗门历练', type: 'event', score: 0.60, color: '#ff8787', groupId: 3 }
      ]},
      { id: 'event-2', name: '大战决战', type: 'event', score: 0.82, color: '#ff8787', groupId: 3, children: [
        { id: 'event-5', name: '渡劫成仙', type: 'event', score: 0.75, color: '#ff8787', groupId: 3 }
      ]},
      { id: 'event-4', name: '魔族入侵', type: 'event', score: 0.80, color: '#ff8787', groupId: 3 }
    ], 2)
    
    // 转换为多棵树的数据（用于G6的树布局和cubic-radial边）
    const rootIds = groups.map(g => g.id)
    const treesData = this.graphToMultiTreeData(nodes, edges, rootIds)
    
    return { 
      nodes, 
      edges,
      // @ts-ignore 添加多树数据字段
      treesData,
      rootIds
    }
  }
  
  /**
   * 将图数据转换为多棵树的数据格式
   */
  private graphToMultiTreeData(nodes: G6Node[], edges: G6Edge[], rootIds: string[]): any[] {
    const nodeMap = new Map<string, G6Node>()
    nodes.forEach(n => nodeMap.set(n.id, n))
    
    // 构建子节点映射
    const childrenMap = new Map<string, string[]>()
    edges.forEach(edge => {
      const source = edge.source
      if (!childrenMap.has(source)) {
        childrenMap.set(source, [])
      }
      childrenMap.get(source)!.push(edge.target)
    })
    
    // 递归构建单棵树
    const buildTree = (nodeId: string): any => {
      const node = nodeMap.get(nodeId)
      if (!node) return null
      
      const treeNode: any = {
        id: node.id,
        data: { ...node }
      }
      
      const children = childrenMap.get(nodeId)
      if (children && children.length > 0) {
        treeNode.children = children.map(childId => buildTree(childId)).filter(Boolean)
      }
      
      return treeNode
    }
    
    // 为每个根节点构建一棵树
    return rootIds.map(rootId => buildTree(rootId)).filter(Boolean)
  }
  
  /**
   * 添加树形分支
   */
  private addTreeBranch(
    nodes: G6Node[], 
    edges: G6Edge[], 
    parentId: string,
    branches: any[],
    startLevel: number
  ): void {
    branches.forEach(branch => {
      nodes.push(this.createNode(
        branch.id, 
        branch.name, 
        branch.type, 
        branch.score, 
        branch.color, 
        startLevel,
        branch.groupId
      ))
      edges.push({ source: parentId, target: branch.id })
      
      // 递归添加子节点
      if (branch.children) {
        branch.children.forEach((child: any) => {
          nodes.push(this.createNode(
            child.id, 
            child.name, 
            child.type, 
            child.score, 
            child.color, 
            startLevel + 1,
            child.groupId
          ))
          edges.push({ source: branch.id, target: child.id })
        })
      }
    })
  }
  
  /**
   * 创建G6节点
   */
  private createNode(
    id: string, 
    label: string, 
    type: string, 
    score: number, 
    color: string,
    hierarchy: number,
    groupId: number
  ): G6Node {
    // 获取随机SVG图标
    const icon = getRandomSVGIcon()
    const img = generateNodeSVGDataURL(icon, color, 0.8, 'transparent', 0.1)
    
    // 计算节点大小
    const size = Math.max(20, Math.min(40, 24 + score * 16))
    
    return {
      id,
      label,
      size,
      color,
      img,
      type,
      score,
      hierarchy,
      groupId
    }
  }
}

// 单例导出
export const mockNormalDataSource = new MockNormalDataSource()
