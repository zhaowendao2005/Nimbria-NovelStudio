// src-electron/services/star-chart-service/types/index.ts

export interface StarChartInitEvent {
  initId: string
  success?: boolean
}

export interface StarChartProjectCreatedEvent {
  operationId: string
  projectPath: string
  starChartPath: string
}

export interface StarChartErrorEvent {
  operationId?: string
  projectPath?: string
  error: string
}

// 测试数据结构
export interface StarChartMetadata {
  created_at: number
  project_name?: string
  version?: string
}

