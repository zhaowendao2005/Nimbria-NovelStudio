/**
 * 系统提示词模板管理服务
 * 
 * 职责：
 * - 管理系统提示词模板的CRUD操作
 * - 提供模板查询和分类功能
 * - 持久化到数据库
 * 
 * @description
 * 支持分类管理（通用/技术/文学/学术/自定义）
 * 内置模板不可删除，用户可自定义扩展
 */

import type Database from 'better-sqlite3'
import { v4 as uuid } from 'uuid'

/**
 * 系统提示词模板接口（后端）
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

/**
 * 数据库查询结果类型（snake_case字段）
 */
interface SystemPromptTemplateRow {
  id: string
  name: string
  content: string
  category: string | null
  description: string | null
  is_builtin: number
  created_at: string
  updated_at: string
}

/**
 * 内置模板ID列表（用于判断是否可删除）
 */
const BUILTIN_TEMPLATE_IDS = [
  'default-general',
  'default-technical',
  'default-literary',
  'default-academic'
]

/**
 * 默认模板定义
 */
const DEFAULT_TEMPLATES = [
  {
    id: 'default-general',
    name: '通用翻译',
    content: '你是一位专业的翻译助手。请将用户输入的文本翻译成目标语言，保持原文的语气和风格。注意：\n- 保持专业术语的准确性\n- 尊重原文的格式和结构\n- 翻译要自然流畅，符合目标语言习惯',
    category: '通用',
    description: '适用于大多数翻译场景的通用模板',
    isBuiltin: true
  },
  {
    id: 'default-technical',
    name: '技术文档翻译',
    content: '你是一位精通技术文档翻译的专家。请将以下技术文档翻译成目标语言。要求：\n- 保持技术术语的准确性，必要时保留英文原文\n- 保留代码块、命令、API名称等技术元素不翻译\n- 确保逻辑清晰，专业严谨\n- 符合技术文档的表达习惯',
    category: '技术',
    description: '适用于API文档、技术手册、代码注释等',
    isBuiltin: true
  },
  {
    id: 'default-literary',
    name: '文学作品翻译',
    content: '你是一位资深的文学翻译家。请将以下文学作品翻译成目标语言。要求：\n- 保持原作的文学风格和意境\n- 注重语言的美感和韵律\n- 传达作者的情感和深层含义\n- 可以适当意译以符合目标语言的文学表达',
    category: '文学',
    description: '适用于小说、诗歌、散文等文学作品',
    isBuiltin: true
  },
  {
    id: 'default-academic',
    name: '学术论文翻译',
    content: '你是一位学术翻译专家。请将以下学术内容翻译成目标语言。要求：\n- 保持学术用语的准确性和专业性\n- 保留引用、参考文献格式\n- 确保逻辑严密，论证清晰\n- 符合学术写作规范',
    category: '学术',
    description: '适用于学术论文、研究报告等',
    isBuiltin: true
  }
]

export class SystemPromptTemplateService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
    this.initializeDefaultTemplates()
  }

  /**
   * 初始化默认模板（如果不存在）
   */
  private initializeDefaultTemplates(): void {
    try {
      const existingTemplates = this.getAllTemplates()
      const hasDefaults = existingTemplates.some(t => BUILTIN_TEMPLATE_IDS.includes(t.id))
      
      if (!hasDefaults) {
        console.log('🎨 [SystemPromptTemplateService] 初始化默认模板...')
        DEFAULT_TEMPLATES.forEach(template => {
          this.createTemplateWithId(template)
        })
        console.log(`✅ [SystemPromptTemplateService] 已初始化 ${DEFAULT_TEMPLATES.length} 个默认模板`)
      }
    } catch (error) {
      console.error('❌ [SystemPromptTemplateService] 初始化默认模板失败:', error)
    }
  }

  /**
   * 创建模板（带指定ID，内部使用）
   */
  private createTemplateWithId(template: Omit<SystemPromptTemplate, 'createdAt' | 'updatedAt'>): SystemPromptTemplate {
    const now = new Date().toISOString()
    
    const stmt = this.db.prepare(`
      INSERT INTO Llmtranslate_system_prompt_templates 
      (id, name, content, category, description, is_builtin, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      template.id,
      template.name,
      template.content,
      template.category ?? null,
      template.description ?? null,
      template.isBuiltin ? 1 : 0,
      now,
      now
    )

    console.log(`✅ [SystemPromptTemplateService] 创建模板: ${template.name}`)
    
    return {
      ...template,
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * 创建模板（用户自定义）
   */
  createTemplate(template: Omit<SystemPromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltin'>): SystemPromptTemplate {
    const id = uuid()
    return this.createTemplateWithId({
      id,
      ...template,
      isBuiltin: false
    })
  }

  /**
   * 获取单个模板
   */
  getTemplate(id: string): SystemPromptTemplate | null {
    const stmt = this.db.prepare(`
      SELECT * FROM Llmtranslate_system_prompt_templates WHERE id = ?
    `)

    const row = stmt.get(id) as SystemPromptTemplateRow | undefined

    if (!row) {
      return null
    }

    return this.rowToTemplate(row)
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): SystemPromptTemplate[] {
    const stmt = this.db.prepare(`
      SELECT * FROM Llmtranslate_system_prompt_templates 
      ORDER BY 
        is_builtin DESC,  -- 内置模板排前面
        category ASC,
        created_at ASC
    `)

    const rows = stmt.all() as SystemPromptTemplateRow[]
    return rows.map(row => this.rowToTemplate(row))
  }

  /**
   * 按分类获取模板
   */
  getTemplatesByCategory(category: string): SystemPromptTemplate[] {
    const stmt = this.db.prepare(`
      SELECT * FROM Llmtranslate_system_prompt_templates 
      WHERE category = ?
      ORDER BY is_builtin DESC, created_at ASC
    `)

    const rows = stmt.all(category) as SystemPromptTemplateRow[]
    return rows.map(row => this.rowToTemplate(row))
  }

  /**
   * 更新模板
   * 注意：内置模板不允许修改name和isBuiltin
   */
  updateTemplate(id: string, updates: Partial<Pick<SystemPromptTemplate, 'name' | 'content' | 'category' | 'description'>>): void {
    const existing = this.getTemplate(id)
    
    if (!existing) {
      throw new Error(`Template ${id} not found`)
    }

    if (existing.isBuiltin) {
      throw new Error(`Cannot modify builtin template: ${existing.name}`)
    }

    const now = new Date().toISOString()
    const fields: string[] = []
    const values: unknown[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.content !== undefined) {
      fields.push('content = ?')
      values.push(updates.content)
    }
    if (updates.category !== undefined) {
      fields.push('category = ?')
      values.push(updates.category)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description ?? null)
    }

    if (fields.length === 0) {
      return // 没有更新
    }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE Llmtranslate_system_prompt_templates 
      SET ${fields.join(', ')}
      WHERE id = ?
    `)

    stmt.run(...values)

    console.log(`✅ [SystemPromptTemplateService] 更新模板: ${id}`)
  }

  /**
   * 删除模板
   * 注意：内置模板不允许删除
   */
  deleteTemplate(id: string): void {
    const existing = this.getTemplate(id)
    
    if (!existing) {
      throw new Error(`Template ${id} not found`)
    }

    if (existing.isBuiltin) {
      throw new Error(`Cannot delete builtin template: ${existing.name}`)
    }

    const stmt = this.db.prepare(`
      DELETE FROM Llmtranslate_system_prompt_templates WHERE id = ?
    `)

    stmt.run(id)

    console.log(`✅ [SystemPromptTemplateService] 删除模板: ${id}`)
  }

  /**
   * 判断是否为内置模板
   */
  isBuiltinTemplate(id: string): boolean {
    return BUILTIN_TEMPLATE_IDS.includes(id)
  }

  /**
   * 获取所有分类
   */
  getCategories(): string[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT category 
      FROM Llmtranslate_system_prompt_templates 
      WHERE category IS NOT NULL
      ORDER BY category ASC
    `)

    const rows = stmt.all() as Array<{ category: string }>
    return rows.map(row => row.category)
  }

  /**
   * 将数据库行转换为模板对象
   */
  private rowToTemplate(row: SystemPromptTemplateRow): SystemPromptTemplate {
    return {
      id: row.id,
      name: row.name,
      content: row.content,
      ...(row.category !== null && { category: row.category }),
      ...(row.description !== null && { description: row.description }),
      isBuiltin: row.is_builtin === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}

