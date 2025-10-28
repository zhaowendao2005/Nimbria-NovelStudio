/**
 * LinkNodeView 客户端类型转发
 * 
 * 通过别名导入前端类型，为后端提供统一的类型入口
 * 这些类型来自前端定义，后端只是转发使用
 */

// ✅ 数据模型
export type {
  LinkItem,
  SimilarityResult,
  LayoutNode,
  LayoutConfig,
  NodePosition
} from 'Client/types/LinkNodeView/models'

// ✅ API 类型
export type {
  OpenLinkNodeViewWindowRequest,
  OpenLinkNodeViewWindowResponse,
  DeleteLinksRequest,
  SyncDeleteEventData
} from 'Client/types/LinkNodeView/api'

