/**
 * Nimbria项目管理器
 * 统一管理项目的创建、验证、初始化等操作
 */

import * as path from 'path'
import fs from 'fs-extra'
import { ProjectValidator } from './project-validator'
import { ProjectInitializer } from './project-initializer'
import { getAvailableTemplates } from './project-config'
import type { 
  ProjectCreationOptions,
  ProjectValidationResult,
  ProjectQuickValidation,
  CanInitializeResult,
  ProjectInitializationResult,
  ProjectTemplate,
  ProjectOperationResult
} from './types'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('ProjectManager')

export class ProjectManager {
  private validator: ProjectValidator
  private initializer: ProjectInitializer

  constructor() {
    this.validator = new ProjectValidator()
    this.initializer = new ProjectInitializer()
    logger.info('ProjectManager initialized')
  }

  /**
   * 创建新项目
   */
  async createProject(options: ProjectCreationOptions): Promise<ProjectInitializationResult> {
    try {
      // 构建完整项目路径：父目录 + 项目名
      const fullProjectPath = path.join(options.parentDirectory, options.projectName)
      
      logger.info(`Creating project: ${options.projectName} at ${fullProjectPath}`)
      
      // 验证创建选项
      const validationError = this.validateCreationOptions(options)
      if (validationError) {
        return {
          success: false,
          error: validationError
        }
      }

      // 检查父目录是否存在和可写
      const parentCanInit = await this.validator.canInitialize(options.parentDirectory)
      if (!parentCanInit.canInitialize) {
        return {
          success: false,
          error: `父目录问题: ${parentCanInit.reason || '无法在此目录创建项目'}`
        }
      }

      // 检查项目子目录是否已存在
      if (await fs.pathExists(fullProjectPath)) {
        return {
          success: false,
          error: `项目目录已存在: ${fullProjectPath}`
        }
      }

      // 创建项目
      const result = await this.initializer.createProject(options)
      
      if (result.success) {
        logger.info(`Project created successfully: ${options.projectName} at ${result.projectPath}`)
      } else {
        logger.error(`Failed to create project: ${result.error}`)
      }

      return result

    } catch (error) {
      logger.error('Project creation error:', error)
      return {
        success: false,
        error: `创建项目时发生错误: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * 验证现有项目
   */
  async validateProject(projectPath: string): Promise<ProjectValidationResult> {
    try {
      logger.info(`Validating project: ${projectPath}`)
      return await this.validator.validateProject(projectPath)
    } catch (error) {
      logger.error('Project validation error:', error)
      return {
        isValid: false,
        isProject: false,
        missingFiles: [],
        missingDirectories: [],
        issues: [`验证项目时发生错误: ${error instanceof Error ? error.message : String(error)}`],
        canInitialize: false
      }
    }
  }

  /**
   * 快速验证项目（用于打开项目时）
   */
  async quickValidateProject(projectPath: string): Promise<ProjectQuickValidation> {
    try {
      logger.debug(`Quick validating project: ${projectPath}`)
      return await this.validator.quickValidate(projectPath)
    } catch (error) {
      logger.error('Quick validation error:', error)
      return {
        isProject: false,
        isValid: false,
        majorIssues: [`快速验证时发生错误: ${error instanceof Error ? error.message : String(error)}`]
      }
    }
  }

  /**
   * 检查目录是否可以初始化
   */
  async canInitialize(directoryPath: string, templateId?: string): Promise<CanInitializeResult> {
    try {
      logger.debug(`Checking initialization capability: ${directoryPath}`)
      return await this.validator.canInitialize(directoryPath, templateId)
    } catch (error) {
      logger.error('Can initialize check error:', error)
      return {
        canInitialize: false,
        reason: `检查初始化能力时发生错误: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * 初始化现有目录为项目
   */
  async initializeExistingDirectory(options: {
    directoryPath: string
    projectName: string
    novelTitle: string
    author: string
    genre: string[]
    description?: string
    timestamp: string
    customConfig?: Record<string, unknown>
  }): Promise<ProjectInitializationResult> {
    try {
      logger.info(`Initializing existing directory: ${options.directoryPath}`)
      
      // 验证选项
      if (!options.projectName?.trim()) {
        return { success: false, error: '项目名称不能为空' }
      }
      if (!options.novelTitle?.trim()) {
        return { success: false, error: '小说标题不能为空' }
      }
      if (!options.author?.trim()) {
        return { success: false, error: '作者不能为空' }
      }

      // 检查是否可以初始化
      const canInit = await this.validator.canInitialize(options.directoryPath)
      if (!canInit.canInitialize) {
        return {
          success: false,
          error: canInit.reason || '无法初始化此目录'
        }
      }

      // 执行初始化
      const result = await this.initializer.initializeExistingDirectory(options)
      
      if (result.success) {
        logger.info(`Directory initialized successfully: ${options.directoryPath}`)
      } else {
        logger.error(`Failed to initialize directory: ${result.error}`)
      }

      return result

    } catch (error) {
      logger.error('Directory initialization error:', error)
      return {
        success: false,
        error: `初始化目录时发生错误: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * 获取可用的项目模板
   */
  async getTemplates(): Promise<{ templates: ProjectTemplate[] }> {
    try {
      logger.debug('Getting available templates')
      const templates = await Promise.resolve(getAvailableTemplates())
      return { templates }
    } catch (error) {
      logger.error('Get templates error:', error)
      return { templates: [] }
    }
  }

  /**
   * 修复项目结构
   */
  async repairProject(projectPath: string): Promise<ProjectInitializationResult> {
    try {
      logger.info(`Repairing project: ${projectPath}`)
      
      // 先验证项目
      const validation = await this.validator.validateProject(projectPath)
      if (!validation.isProject) {
        return {
          success: false,
          error: '不是有效的Nimbria项目，无法修复'
        }
      }

      // 执行修复
      const result = await this.initializer.repairProject(projectPath)
      
      if (result.success) {
        logger.info(`Project repaired successfully: ${projectPath}`)
      } else {
        logger.error(`Failed to repair project: ${result.error}`)
      }

      return result

    } catch (error) {
      logger.error('Project repair error:', error)
      return {
        success: false,
        error: `修复项目时发生错误: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * 获取项目统计信息
   */
  async getProjectStats(projectPath: string): Promise<ProjectOperationResult> {
    try {
      logger.debug(`Getting project stats: ${projectPath}`)
      
      const validation = await this.validator.quickValidate(projectPath)
      if (!validation.isProject) {
        return {
          success: false,
          error: '不是有效的Nimbria项目'
        }
      }

      // 这里可以扩展更多统计信息
      const stats = {
        isValid: validation.isValid,
        config: validation.config,
        lastValidated: new Date().toISOString(),
        issues: validation.majorIssues
      }

      return {
        success: true,
        data: stats
      }

    } catch (error) {
      logger.error('Get project stats error:', error)
      return {
        success: false,
        error: `获取项目统计信息时发生错误: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * 私有方法：验证创建选项
   */
  private validateCreationOptions(options: ProjectCreationOptions): string | null {
    if (!options.parentDirectory?.trim()) {
      return '项目存放位置不能为空'
    }

    if (!options.projectName?.trim()) {
      return '项目名称不能为空'
    }

    if (!options.novelTitle?.trim()) {
      return '小说标题不能为空'
    }

    if (!options.author?.trim()) {
      return '作者不能为空'
    }

    if (!options.timestamp) {
      return '创建时间戳不能为空'
    }

    if (!Array.isArray(options.genre)) {
      return '小说类型必须是数组'
    }

    // 验证项目名称格式
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_\-\s]+$/.test(options.projectName)) {
      return '项目名称只能包含中文、英文、数字、下划线、连字符和空格'
    }

    // 检查是否包含Windows文件名禁用字符
    const invalidChars = /[<>:"|?*]/
    if (invalidChars.test(options.projectName.trim())) {
      return '项目名称不能包含特殊字符 < > : " | ? *'
    }

    // 验证小说标题格式
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_\-\s\u3000-\u303f\uff00-\uffef]+$/.test(options.novelTitle)) {
      return '小说标题包含不支持的字符'
    }

    return null
  }
}
