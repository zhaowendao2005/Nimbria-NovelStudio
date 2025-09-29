/**
 * 项目管理服务层
 * 封装项目管理相关的业务逻辑和API调用
 */

import type {
  ProjectCreationOptions,
  ProjectValidationResult,
  ProjectQuickValidation,
  ProjectInitializationResult,
  CanInitializeResult,
  ProjectTemplate
} from '../../types/filesystem'

export class ProjectService {
  /**
   * 创建新项目
   */
  async createProject(options: ProjectCreationOptions): Promise<ProjectInitializationResult> {
    if (!window.nimbria?.project?.createProject) {
      throw new Error('项目创建API不可用')
    }

    try {
      const result = await window.nimbria.project.createProject(options)
      return result
    } catch (error) {
      console.error('创建项目失败:', error)
      throw error
    }
  }

  /**
   * 验证项目完整性
   */
  async validateProject(projectPath: string): Promise<ProjectValidationResult> {
    if (!window.nimbria?.project?.validateProject) {
      throw new Error('项目验证API不可用')
    }

    try {
      const result = await window.nimbria.project.validateProject(projectPath)
      return result
    } catch (error) {
      console.error('验证项目失败:', error)
      throw error
    }
  }

  /**
   * 快速验证项目（用于打开项目时的初步检查）
   */
  async quickValidateProject(projectPath: string): Promise<ProjectQuickValidation> {
    if (!window.nimbria?.project?.quickValidateProject) {
      throw new Error('快速验证API不可用')
    }

    try {
      const result = await window.nimbria.project.quickValidateProject(projectPath)
      return result
    } catch (error) {
      console.error('快速验证项目失败:', error)
      throw error
    }
  }

  /**
   * 检查目录是否可以初始化为项目
   */
  async canInitialize(directoryPath: string, templateId?: string): Promise<CanInitializeResult> {
    if (!window.nimbria?.project?.canInitialize) {
      throw new Error('初始化检查API不可用')
    }

    try {
      const result = await window.nimbria.project.canInitialize(directoryPath, templateId)
      return result
    } catch (error) {
      console.error('检查初始化能力失败:', error)
      throw error
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
    if (!window.nimbria?.project?.initializeExistingDirectory) {
      throw new Error('目录初始化API不可用')
    }

    try {
      const result = await window.nimbria.project.initializeExistingDirectory(options)
      return result
    } catch (error) {
      console.error('初始化目录失败:', error)
      throw error
    }
  }

  /**
   * 获取可用的项目模板
   */
  async getTemplates(): Promise<{ templates: ProjectTemplate[] }> {
    if (!window.nimbria?.project?.getTemplates) {
      throw new Error('模板获取API不可用')
    }

    try {
      const result = await window.nimbria.project.getTemplates()
      return result
    } catch (error) {
      console.error('获取模板失败:', error)
      throw error
    }
  }

  /**
   * 修复项目结构
   */
  async repairProject(projectPath: string): Promise<ProjectInitializationResult> {
    if (!window.nimbria?.project?.repairProject) {
      throw new Error('项目修复API不可用')
    }

    try {
      const result = await window.nimbria.project.repairProject(projectPath)
      return result
    } catch (error) {
      console.error('修复项目失败:', error)
      throw error
    }
  }

  /**
   * 获取项目统计信息
   */
  async getProjectStats(projectPath: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
    if (!window.nimbria?.project?.getProjectStats) {
      throw new Error('项目统计API不可用')
    }

    try {
      const result = await window.nimbria.project.getProjectStats(projectPath)
      return result
    } catch (error) {
      console.error('获取项目统计失败:', error)
      throw error
    }
  }

  /**
   * 选择目录对话框
   */
  async selectDirectory(title: string = '选择目录'): Promise<string | null> {
    if (!window.nimbria?.file?.openDialog) {
      throw new Error('文件对话框API不可用')
    }

    try {
      const result = await window.nimbria.file.openDialog({
        title,
        properties: ['openDirectory']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      return result.filePaths[0]
    } catch (error) {
      console.error('选择目录失败:', error)
      throw error
    }
  }

  /**
   * 验证项目创建选项
   */
  validateProjectCreationOptions(options: Partial<ProjectCreationOptions>): {
    isValid: boolean
    errors: Record<string, string>
  } {
    const errors: Record<string, string> = {}

    if (!options.directoryPath?.trim()) {
      errors.directoryPath = '项目目录路径不能为空'
    }

    if (!options.projectName?.trim()) {
      errors.projectName = '项目名称不能为空'
    } else if (!/^[\u4e00-\u9fa5a-zA-Z0-9_\-\s]+$/.test(options.projectName)) {
      errors.projectName = '项目名称只能包含中文、英文、数字、下划线、连字符和空格'
    }

    if (!options.novelTitle?.trim()) {
      errors.novelTitle = '小说标题不能为空'
    }

    if (!options.author?.trim()) {
      errors.author = '作者不能为空'
    }

    if (!options.genre || options.genre.length === 0) {
      errors.genre = '请至少选择一个小说类型'
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * 验证项目初始化选项
   */
  validateInitializationOptions(options: {
    projectName?: string
    novelTitle?: string
    author?: string
    genre?: string[]
  }): {
    isValid: boolean
    errors: Record<string, string>
  } {
    const errors: Record<string, string> = {}

    if (!options.projectName?.trim()) {
      errors.projectName = '项目名称不能为空'
    }

    if (!options.novelTitle?.trim()) {
      errors.novelTitle = '小说标题不能为空'
    }

    if (!options.author?.trim()) {
      errors.author = '作者不能为空'
    }

    if (!options.genre || options.genre.length === 0) {
      errors.genre = '请至少选择一个小说类型'
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * 格式化日期
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  /**
   * 格式化相对时间
   */
  formatRelativeTime(dateString: string): string {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInMs = now.getTime() - date.getTime()
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
      const diffInHours = Math.floor(diffInMinutes / 60)
      const diffInDays = Math.floor(diffInHours / 24)

      if (diffInMinutes < 1) {
        return '刚刚'
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}分钟前`
      } else if (diffInHours < 24) {
        return `${diffInHours}小时前`
      } else if (diffInDays === 1) {
        return '昨天'
      } else if (diffInDays < 7) {
        return `${diffInDays}天前`
      } else {
        return date.toLocaleDateString('zh-CN')
      }
    } catch {
      return dateString
    }
  }

  /**
   * 生成项目创建时间戳
   */
  generateTimestamp(): string {
    return new Date().toISOString()
  }

  /**
   * 提取目录名作为默认项目名
   */
  extractProjectNameFromPath(directoryPath: string): string {
    try {
      const pathParts = directoryPath.split(/[\\/]/)
      const folderName = pathParts[pathParts.length - 1]
      return folderName || ''
    } catch {
      return ''
    }
  }

  /**
   * 检查API可用性
   */
  checkAPIAvailability(): {
    isAvailable: boolean
    missingAPIs: string[]
  } {
    const missingAPIs: string[] = []
    
    if (!window.nimbria) {
      missingAPIs.push('window.nimbria')
      return { isAvailable: false, missingAPIs }
    }

    if (!window.nimbria.project) {
      missingAPIs.push('window.nimbria.project')
    } else {
      const projectAPIs = [
        'createProject',
        'validateProject', 
        'quickValidateProject',
        'canInitialize',
        'initializeExistingDirectory',
        'getTemplates',
        'repairProject',
        'getProjectStats'
      ]

      for (const api of projectAPIs) {
        if (!window.nimbria.project[api as keyof typeof window.nimbria.project]) {
          missingAPIs.push(`window.nimbria.project.${api}`)
        }
      }
    }

    if (!window.nimbria.file?.openDialog) {
      missingAPIs.push('window.nimbria.file.openDialog')
    }

    return {
      isAvailable: missingAPIs.length === 0,
      missingAPIs
    }
  }
}

// 创建单例实例
export const projectService = new ProjectService()
export default projectService
