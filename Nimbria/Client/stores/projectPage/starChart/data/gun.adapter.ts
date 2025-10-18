/**
 * Gun数据库适配器（待实现）
 */
import type { RawGraphData } from './types'

export class GunDataAdapter {
  async loadGraphData(): Promise<RawGraphData> {
    throw new Error('Gun数据库适配器尚未实现，请在项目后续阶段开发')
  }
  
  async saveGraphData(data: RawGraphData): Promise<void> {
    throw new Error('Gun数据库适配器尚未实现，请在项目后续阶段开发')
  }
  
  async addNode(node: RawGraphData['nodes'][0]): Promise<void> {
    throw new Error('Gun数据库适配器尚未实现，请在项目后续阶段开发')
  }
  
  async addEdge(edge: RawGraphData['edges'][0]): Promise<void> {
    throw new Error('Gun数据库适配器尚未实现，请在项目后续阶段开发')
  }
}

