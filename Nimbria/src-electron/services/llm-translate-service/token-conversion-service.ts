/**
 * Token换算配置管理服务
 * 
 * 职责：
 * - 管理换算配置的CRUD操作
 * - 提供token估算功能
 * - 持久化到数据库
 * 
 * @description
 * 支持自定义中文和ASCII字符的token换算比例
 * 用于进度条预估和成本计算
 */

import type Database from 'better-sqlite3'
import { v4 as uuid } from 'uuid'

/**
 * Token换算配置接口（后端）
 */
export interface TokenConversionConfig {
  id: string
  name: string
  chineseRatio: number
  asciiRatio: number
  description?: string
  createdAt: string
  updatedAt: string
}

/**
 * 数据库查询结果类型（snake_case字段）
 */
interface TokenConversionRow {
  id: string
  name: string
  chinese_ratio: number
  ascii_ratio: number
  description: string | null
  created_at: string
  updated_at: string
}

/**
 * 默认Token换算配置（用于初始化）
 */
const DEFAULT_TOKEN_CONVERSIONS = [
  { id: 'default-balanced', name: '通用配置（平衡）', chineseRatio: 2.5, asciiRatio: 1.0, description: '适用于大多数模型的平衡配置' },
  { id: 'gemini-chinese', name: 'Gemini中文优化', chineseRatio: 4.0, asciiRatio: 1.0, description: 'Gemini模型对中文的token换算' },
  { id: 'claude-optimized', name: 'Claude优化', chineseRatio: 2.0, asciiRatio: 0.8, description: 'Claude模型的token换算' }
]

export class TokenConversionService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
    this.initializeDefaultConfigs()
  }

  /**
   * 初始化默认配置（如果不存在）
   */
  private initializeDefaultConfigs(): void {
    const existingConfigs = this.getAllConfigs()
    
    // 检查是否已有默认配置
    const hasDefaults = existingConfigs.some(config => config.id.startsWith('default-'))
    
    if (!hasDefaults) {
      console.log('🔧 [TokenConversionService] 初始化默认Token换算配置')
      DEFAULT_TOKEN_CONVERSIONS.forEach(defaultConfig => {
        this.createConfigWithId({
          id: defaultConfig.id,
          name: defaultConfig.name,
          chineseRatio: defaultConfig.chineseRatio,
          asciiRatio: defaultConfig.asciiRatio,
          description: defaultConfig.description
        })
      })
    }
  }

  /**
   * 创建配置（带指定ID，用于默认配置）
   */
  private createConfigWithId(config: Omit<TokenConversionConfig, 'createdAt' | 'updatedAt'>): TokenConversionConfig {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO Llmtranslate_token_conversion_configs 
      (id, name, chinese_ratio, ascii_ratio, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      config.id,
      config.name,
      config.chineseRatio,
      config.asciiRatio,
      config.description ?? null,
      now,
      now
    )

    console.log(`✅ [TokenConversionService] 创建配置: ${config.name}`)
    
    return {
      ...config,
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * 创建配置
   */
  createConfig(config: Omit<TokenConversionConfig, 'id' | 'createdAt' | 'updatedAt'>): TokenConversionConfig {
    const id = uuid()
    return this.createConfigWithId({
      id,
      ...config
    })
  }

  /**
   * 获取配置
   */
  getConfig(id: string): TokenConversionConfig | null {
    const stmt = this.db.prepare(`
      SELECT * FROM Llmtranslate_token_conversion_configs WHERE id = ?
    `)

    const row = stmt.get(id) as TokenConversionRow | undefined

    if (!row) {
      return null
    }

    return {
      id: row.id,
      name: row.name,
      chineseRatio: row.chinese_ratio,
      asciiRatio: row.ascii_ratio,
      ...(row.description !== null && { description: row.description }),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  /**
   * 获取所有配置
   */
  getAllConfigs(): TokenConversionConfig[] {
    const stmt = this.db.prepare(`
      SELECT * FROM Llmtranslate_token_conversion_configs ORDER BY created_at ASC
    `)

    const rows = stmt.all() as TokenConversionRow[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      chineseRatio: row.chinese_ratio,
      asciiRatio: row.ascii_ratio,
      ...(row.description !== null && { description: row.description }),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  /**
   * 更新配置
   */
  updateConfig(id: string, updates: Partial<Omit<TokenConversionConfig, 'id' | 'createdAt' | 'updatedAt'>>): void {
    const now = new Date().toISOString()

    const fields: string[] = []
    const values: (string | number)[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.chineseRatio !== undefined) {
      fields.push('chinese_ratio = ?')
      values.push(updates.chineseRatio)
    }
    if (updates.asciiRatio !== undefined) {
      fields.push('ascii_ratio = ?')
      values.push(updates.asciiRatio)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description ?? null)
    }

    if (fields.length === 0) {
      return
    }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE Llmtranslate_token_conversion_configs 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `)

    stmt.run(...values)

    console.log(`✅ [TokenConversionService] 更新配置: ${id}`)
  }

  /**
   * 删除配置
   */
  deleteConfig(id: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM Llmtranslate_token_conversion_configs WHERE id = ?
    `)

    stmt.run(id)

    console.log(`✅ [TokenConversionService] 删除配置: ${id}`)
  }

  /**
   * 估算token数
   * 
   * @param text 要估算的文本
   * @param configId Token换算配置ID
   * @returns 估算的token数量
   */
  estimate(text: string, configId: string): number {
    const config = this.getConfig(configId)
    
    if (!config) {
      throw new Error(`Token conversion config ${configId} not found`)
    }

    return this.estimateWithConfig(text, config)
  }

  /**
   * 使用指定配置估算token数
   * 
   * @param text 要估算的文本
   * @param config Token换算配置
   * @returns 估算的token数量
   */
  estimateWithConfig(text: string, config: TokenConversionConfig): number {
    // 🔴 验证比例值（防止除零错误）
    if (config.chineseRatio <= 0 || config.asciiRatio <= 0) {
      throw new Error(`Token比例必须大于0: chineseRatio=${config.chineseRatio}, asciiRatio=${config.asciiRatio}`)
    }

    let chineseCount = 0
    let asciiCount = 0

    for (const char of text) {
      const code = char.charCodeAt(0)
      
      // 中文字符范围（CJK统一汉字）
      if (
        (code >= 0x4E00 && code <= 0x9FFF) ||   // CJK Unified Ideographs
        (code >= 0x3400 && code <= 0x4DBF) ||   // CJK Unified Ideographs Extension A
        (code >= 0x20000 && code <= 0x2A6DF) || // CJK Unified Ideographs Extension B
        (code >= 0x2A700 && code <= 0x2B73F) || // CJK Unified Ideographs Extension C
        (code >= 0x2B740 && code <= 0x2B81F) || // CJK Unified Ideographs Extension D
        (code >= 0x2B820 && code <= 0x2CEAF)    // CJK Unified Ideographs Extension E
      ) {
        chineseCount++
      } else if (code < 128) {
        // ASCII字符
        asciiCount++
      } else {
        // 其他Unicode字符按ASCII计
        asciiCount++
      }
    }

    const tokens = Math.ceil(
      chineseCount / config.chineseRatio +
      asciiCount / config.asciiRatio
    )

    console.log(`📊 [TokenConversion] 估算 (${config.name}): 中文=${chineseCount}, ASCII=${asciiCount}, tokens=${tokens}`)

    return tokens
  }
}

