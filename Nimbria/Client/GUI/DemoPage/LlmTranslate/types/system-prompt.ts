/**
 * 系统提示词模板类型定义（前端）
 */

export interface SystemPromptTemplate {
  id: string
  name: string
  content: string
  category?: string
  description?: string
  isBuiltin: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSystemPromptTemplateRequest {
  name: string
  content: string
  category?: string
  description?: string
}

export interface UpdateSystemPromptTemplateRequest {
  name?: string
  content?: string
  category?: string
  description?: string
}

