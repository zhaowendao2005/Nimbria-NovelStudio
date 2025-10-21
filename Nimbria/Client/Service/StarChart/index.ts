/**
 * StarChart Service 层统一导出
 * 
 * 包含：
 * - Core: 核心服务（SigmaManager、AsyncTaskManager 等）
 * - PluginSystem: 插件系统（PluginRegistry、PluginLoader 等）
 * - Plugins: 具体插件实现
 * - Workers: Web Worker 任务处理
 */

// 核心服务
export * from './Core'

// 插件系统
export * from './PluginSystem'

// 具体插件
export * from './Plugins'

// Workers
export * from './Workers'

// 服务层类型
export type { StarChartServiceConfig } from './types'

// 可视化服务
export { VisualizationService } from './visualizationService'

