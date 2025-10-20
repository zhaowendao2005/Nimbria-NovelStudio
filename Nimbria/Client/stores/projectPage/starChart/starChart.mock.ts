/**
 * StarChart Mock数据
 * 用于开发阶段的模拟数据
 */

import type { GraphData, StarChartConfig } from './starChart.types'

/**
 * 默认图数据
 */
export const starChartMockData: GraphData = {
  nodes: [
    {
      id: 'node1',
      label: '节点1',
      type: 'entity',
      properties: { category: 'A' }
    },
    {
      id: 'node2',
      label: '节点2',
      type: 'entity',
      properties: { category: 'B' }
    },
    {
      id: 'node3',
      label: '节点3',
      type: 'entity',
      properties: { category: 'A' }
    }
  ],
  edges: [
    {
      id: 'edge1',
      source: 'node1',
      target: 'node2',
      label: '关联',
      type: 'relation'
    },
    {
      id: 'edge2',
      source: 'node2',
      target: 'node3',
      label: '引用',
      type: 'reference'
    }
  ]
}

/**
 * 默认配置
 */
export const defaultStarChartConfig: StarChartConfig = {
  layoutType: 'force',
  showLabels: true,
  nodeSize: 30,
  edgeWidth: 2,
  enableZoom: true,
  enableDrag: true
}

/**
 * 重置Mock数据
 */
export function resetMock() {
  console.log('[StarChart Mock] 数据已重置')
  return starChartMockData
}

