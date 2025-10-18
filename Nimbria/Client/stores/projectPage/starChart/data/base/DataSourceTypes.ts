/**
 * 数据源元数据类型定义
 */

/**
 * 数据源元信息
 */
export interface DataSourceMetadata {
  id: string                      // 数据源唯一标识
  name: string                    // 显示名称
  category: 'static' | 'dynamic'  // 数据源类别
  description: string             // 描述
  estimatedNodeCount: number      // 预估节点数
  estimatedEdgeCount: number      // 预估边数
  recommendedLayouts: string[]    // 推荐布局
  requiresPreprocessing: boolean  // 是否需要预处理
}
