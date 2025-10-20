/**
 * LlmTranslate 类型系统统一导出
 * 
 * 架构说明：
 * - client/  前端类型（通过别名转发自 GUI 组件）
 * - backend/ 后端独有类型（事件、数据库结构等）
 */

// 导出前端类型（供后端使用）
export * from './client'

// 导出后端独有类型
export * from './backend'

