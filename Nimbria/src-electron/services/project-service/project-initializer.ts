/**
 * Nimbria项目初始化器
 * 负责创建项目文件结构和配置文件
 */

import fs from 'fs-extra'
import * as path from 'path'
import { createDefaultConfig, replaceTemplateVariables, getTemplateById } from './project-config'
import type { 
  ProjectInitializationResult, 
  ProjectCreationOptions, 
  NimbriaProjectConfig,
  ProjectTemplate 
} from './types'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('ProjectInitializer')

export class ProjectInitializer {
  /**
   * 创建新项目
   */
  async createProject(options: ProjectCreationOptions): Promise<ProjectInitializationResult> {
    try {
      logger.info(`Creating project: ${options.projectName} at ${options.directoryPath}`)

      const result: ProjectInitializationResult = {
        success: false,
        createdFiles: [],
        createdDirectories: []
      }

      // 确保目录存在
      await fs.ensureDir(options.directoryPath)

      // 生成项目配置
      const configOptions = {
        projectName: options.projectName,
        novelTitle: options.novelTitle,
        author: options.author,
        genre: options.genre,
        timestamp: options.timestamp
      }
      if (options.description) {
        Object.assign(configOptions, { description: options.description })
      }
      const config = createDefaultConfig(configOptions)

      // 合并自定义配置
      if (options.customConfig) {
        Object.assign(config, options.customConfig)
      }

      // 使用默认模板初始化项目
      const template = getTemplateById('nimbria-novel')
      if (!template) {
        throw new Error('找不到项目模板')
      }

      const initResult = await this.initializeFromTemplate(
        options.directoryPath,
        template,
        config
      )

      if (!initResult.success) {
        return initResult
      }

      result.success = true
      result.projectPath = options.directoryPath
      result.configPath = path.join(options.directoryPath, 'nimbria.config.json')
      result.createdFiles = initResult.createdFiles || []
      result.createdDirectories = initResult.createdDirectories || []

      logger.info(`Project created successfully: ${options.projectName}`)
      return result

    } catch (error) {
      logger.error('Failed to create project:', error)
      return {
        success: false,
        error: `创建项目失败: ${error}`
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
    customConfig?: Partial<NimbriaProjectConfig>
  }): Promise<ProjectInitializationResult> {
    try {
      logger.info(`Initializing existing directory: ${options.directoryPath}`)

      // 检查目录是否已经是项目
      const configPath = path.join(options.directoryPath, 'nimbria.config.json')
      const hasConfig = await fs.pathExists(configPath)

      if (hasConfig) {
        return {
          success: false,
          error: '目录已经包含Nimbria项目配置'
        }
      }

      // 使用创建项目的逻辑，但跳过目录创建
      return await this.createProject(options)

    } catch (error) {
      logger.error('Failed to initialize existing directory:', error)
      return {
        success: false,
        error: `初始化目录失败: ${error}`
      }
    }
  }

  /**
   * 从模板初始化项目
   */
  private async initializeFromTemplate(
    projectPath: string,
    template: ProjectTemplate,
    config: NimbriaProjectConfig
  ): Promise<ProjectInitializationResult> {
    const result: ProjectInitializationResult = {
      success: false,
      createdFiles: [],
      createdDirectories: []
    }

    try {
      // 准备模板变量
      const templateVars = {
        projectName: config.projectName,
        novelTitle: config.novel.title,
        author: config.novel.author,
        createdAt: new Date(config.createdAt).toLocaleString('zh-CN'),
        description: config.novel.description,
        genre: config.novel.genre.join('、')
      }

      // 创建文件和目录
      for (const file of template.defaultFiles) {
        const filePath = path.join(projectPath, file.path)

        if (file.isDirectory) {
          // 创建目录
          await fs.ensureDir(filePath)
          result.createdDirectories?.push(file.path)
          logger.debug(`Created directory: ${file.path}`)
        } else {
          // 创建文件
          let content = file.content || ''
          
          // 特殊处理配置文件
          if (file.path === 'nimbria.config.json') {
            content = JSON.stringify(config, null, 2)
          } else {
            // 替换模板变量
            content = replaceTemplateVariables(content, templateVars)
          }

          // 确保父目录存在
          await fs.ensureDir(path.dirname(filePath))
          
          // 写入文件
          await fs.writeFile(filePath, content, 'utf8')
          result.createdFiles?.push(file.path)
          logger.debug(`Created file: ${file.path}`)
        }
      }

      // 验证必需目录是否都已创建
      for (const dirName of template.requiredDirectories) {
        const dirPath = path.join(projectPath, dirName)
        const exists = await fs.pathExists(dirPath)
        
        if (!exists) {
          await fs.ensureDir(dirPath)
          result.createdDirectories?.push(dirName)
          logger.debug(`Ensured directory: ${dirName}`)
        }
      }

      result.success = true
      return result

    } catch (error) {
      logger.error('Failed to initialize from template:', error)
      return {
        success: false,
        error: `模板初始化失败: ${error}`
      }
    }
  }

  /**
   * 修复项目结构（补充缺失的文件和目录）
   */
  async repairProject(projectPath: string): Promise<ProjectInitializationResult> {
    try {
      logger.info(`Repairing project structure: ${projectPath}`)

      const result: ProjectInitializationResult = {
        success: false,
        createdFiles: [],
        createdDirectories: []
      }

      // 读取现有配置
      const configPath = path.join(projectPath, 'nimbria.config.json')
      const hasConfig = await fs.pathExists(configPath)

      if (!hasConfig) {
        return {
          success: false,
          error: '项目缺少配置文件，无法修复'
        }
      }

      const configContent = await fs.readFile(configPath, 'utf8')
      const config = JSON.parse(configContent) as NimbriaProjectConfig

      // 获取模板
      const template = getTemplateById('nimbria-novel')
      if (!template) {
        throw new Error('找不到项目模板')
      }

      // 检查并创建缺失的目录
      for (const dirName of template.requiredDirectories) {
        const dirPath = path.join(projectPath, dirName)
        const exists = await fs.pathExists(dirPath)
        
        if (!exists) {
          await fs.ensureDir(dirPath)
          result.createdDirectories?.push(dirName)
          logger.debug(`Repaired directory: ${dirName}`)
        }
      }

      // 检查并创建缺失的关键文件（但不覆盖现有文件）
      const templateVars = {
        projectName: config.projectName,
        novelTitle: config.novel.title,
        author: config.novel.author,
        createdAt: new Date(config.createdAt).toLocaleString('zh-CN'),
        description: config.novel.description,
        genre: config.novel.genre.join('、')
      }

      for (const file of template.defaultFiles) {
        if (!file.isDirectory && file.path !== 'nimbria.config.json') {
          const filePath = path.join(projectPath, file.path)
          const exists = await fs.pathExists(filePath)
          
          if (!exists) {
            const content = replaceTemplateVariables(file.content || '', templateVars)
            await fs.ensureDir(path.dirname(filePath))
            await fs.writeFile(filePath, content, 'utf8')
            result.createdFiles?.push(file.path)
            logger.debug(`Repaired file: ${file.path}`)
          }
        }
      }

      result.success = true
      logger.info(`Project repair completed: ${projectPath}`)
      return result

    } catch (error) {
      logger.error('Failed to repair project:', error)
      return {
        success: false,
        error: `项目修复失败: ${error}`
      }
    }
  }
}
