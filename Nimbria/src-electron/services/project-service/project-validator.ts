/**
 * Nimbria项目验证器
 * 验证项目的完整性和有效性
 */

import fs from 'fs-extra'
import * as path from 'path'
import { validateProjectConfig, NIMBRIA_PROJECT_TEMPLATE } from './project-config'
import type { 
  ProjectValidationResult, 
  ProjectQuickValidation, 
  CanInitializeResult,
  NimbriaProjectConfig 
} from './types'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('ProjectValidator')

export class ProjectValidator {
  /**
   * 完整的项目验证
   */
  async validateProject(projectPath: string): Promise<ProjectValidationResult> {
    try {
      logger.info(`Validating project at: ${projectPath}`)

      const result: ProjectValidationResult = {
        isValid: false,
        isProject: false,
        missingFiles: [],
        missingDirectories: [],
        issues: [],
        canInitialize: false
      }

      // 检查目录是否存在
      if (!await fs.pathExists(projectPath)) {
        result.issues.push('项目目录不存在')
        return result
      }

      const stats = await fs.stat(projectPath)
      if (!stats.isDirectory()) {
        result.issues.push('指定路径不是目录')
        return result
      }

      // 检查配置文件
      const configPath = path.join(projectPath, 'nimbria.config.json')
      const hasConfig = await fs.pathExists(configPath)
      
      if (!hasConfig) {
        result.issues.push('缺少项目配置文件 nimbria.config.json')
        result.canInitialize = await this.checkCanInitialize(projectPath)
        return result
      }

      result.isProject = true

      // 读取和验证配置文件
      try {
        const configContent = await fs.readFile(configPath, 'utf8')
        const config = JSON.parse(configContent) as NimbriaProjectConfig
        
        const configValidation = validateProjectConfig(config)
        if (!configValidation.isValid) {
          result.issues.push(...configValidation.errors)
        } else {
          result.config = config
        }
      } catch (error) {
        result.issues.push(`配置文件格式错误: ${error}`)
      }

      // 检查必需的目录
      for (const dirName of NIMBRIA_PROJECT_TEMPLATE.requiredDirectories) {
        const dirPath = path.join(projectPath, dirName)
        const exists = await fs.pathExists(dirPath)
        
        if (!exists) {
          result.missingDirectories.push(dirName)
          result.issues.push(`缺少必需目录: ${dirName}`)
        } else {
          const dirStats = await fs.stat(dirPath)
          if (!dirStats.isDirectory()) {
            result.issues.push(`${dirName} 不是目录`)
          }
        }
      }

      // 检查关键文件
      const keyFiles = ['README.md']
      for (const fileName of keyFiles) {
        const filePath = path.join(projectPath, fileName)
        const exists = await fs.pathExists(filePath)
        
        if (!exists) {
          result.missingFiles.push(fileName)
          result.issues.push(`建议添加文件: ${fileName}`)
        }
      }

      // 判断整体有效性
      result.isValid = result.issues.length === 0
      result.canInitialize = !result.isValid && result.isProject

      logger.info(`Project validation completed. Valid: ${result.isValid}, Issues: ${result.issues.length}`)
      return result

    } catch (error) {
      logger.error('Project validation failed:', error)
      return {
        isValid: false,
        isProject: false,
        missingFiles: [],
        missingDirectories: [],
        issues: [`验证过程出错: ${error}`],
        canInitialize: false
      }
    }
  }

  /**
   * 快速验证项目（用于打开项目时的初步检查）
   */
  async quickValidate(projectPath: string): Promise<ProjectQuickValidation> {
    try {
      logger.debug(`Quick validating project at: ${projectPath}`)

      const result: ProjectQuickValidation = {
        isProject: false,
        isValid: false,
        majorIssues: []
      }

      // 检查目录存在性
      if (!await fs.pathExists(projectPath)) {
        result.majorIssues.push('项目目录不存在')
        return result
      }

      // 检查配置文件
      const configPath = path.join(projectPath, 'nimbria.config.json')
      const hasConfig = await fs.pathExists(configPath)
      
      if (!hasConfig) {
        result.majorIssues.push('不是有效的Nimbria项目（缺少配置文件）')
        return result
      }

      result.isProject = true

      // 快速验证配置文件
      try {
        const configContent = await fs.readFile(configPath, 'utf8')
        const config = JSON.parse(configContent) as NimbriaProjectConfig
        
        // 基本字段检查
        if (!config.projectName || !config.novel?.title || !config.novel?.author) {
          result.majorIssues.push('项目配置不完整')
        }

        if (config.type !== 'nimbria-novel-project') {
          result.majorIssues.push('项目类型不匹配')
        }

        if (result.majorIssues.length === 0) {
          result.config = config
          result.isValid = true
        }

      } catch (error) {
        result.majorIssues.push('配置文件格式错误')
      }

      logger.debug(`Quick validation completed. Valid: ${result.isValid}`)
      return result

    } catch (error) {
      logger.error('Quick validation failed:', error)
      return {
        isProject: false,
        isValid: false,
        majorIssues: [`验证失败: ${error}`]
      }
    }
  }

  /**
   * 检查目录是否可以初始化为项目
   */
  async canInitialize(directoryPath: string, templateId?: string): Promise<CanInitializeResult> {
    try {
      logger.debug(`Checking if can initialize: ${directoryPath}`)

      const result: CanInitializeResult = {
        canInitialize: false,
        directoryInfo: {
          exists: false,
          isEmpty: false,
          fileCount: 0,
          hasNimbriaConfig: false
        }
      }

      // 检查目录是否存在
      const exists = await fs.pathExists(directoryPath)
      result.directoryInfo.exists = exists

      if (!exists) {
        result.reason = '目录不存在'
        return result
      }

      const stats = await fs.stat(directoryPath)
      if (!stats.isDirectory()) {
        result.reason = '路径不是目录'
        return result
      }

      // 检查目录内容
      const files = await fs.readdir(directoryPath)
      result.directoryInfo.fileCount = files.length
      result.directoryInfo.isEmpty = files.length === 0

      // 检查是否已经是Nimbria项目
      const configPath = path.join(directoryPath, 'nimbria.config.json')
      const hasConfig = await fs.pathExists(configPath)
      result.directoryInfo.hasNimbriaConfig = hasConfig

      if (hasConfig) {
        result.hasExistingProject = true
        result.existingConfigPath = configPath
        result.reason = '目录已包含Nimbria项目'
        return result
      }

      // 检查文件数量（建议在空目录或少量文件的目录中创建）
      if (files.length > 10) {
        result.reason = '目录包含太多文件，建议选择空目录或文件较少的目录'
        return result
      }

      // 检查是否包含其他项目类型的标识文件
      const conflictFiles = [
        'package.json',
        'requirements.txt',
        'Cargo.toml',
        'pom.xml',
        '.git'
      ]

      const hasConflict = await Promise.all(
        conflictFiles.map(file => fs.pathExists(path.join(directoryPath, file)))
      )

      if (hasConflict.some(exists => exists)) {
        result.reason = '目录似乎包含其他类型的项目'
        return result
      }

      // 可以初始化
      result.canInitialize = true
      logger.debug(`Directory can be initialized: ${directoryPath}`)
      return result

    } catch (error) {
      logger.error('Cannot check initialize capability:', error)
      return {
        canInitialize: false,
        reason: `检查失败: ${error}`
      }
    }
  }

  /**
   * 私有方法：检查是否可以初始化（内部使用）
   */
  private async checkCanInitialize(projectPath: string): Promise<boolean> {
    try {
      const result = await this.canInitialize(projectPath)
      return result.canInitialize
    } catch {
      return false
    }
  }
}
