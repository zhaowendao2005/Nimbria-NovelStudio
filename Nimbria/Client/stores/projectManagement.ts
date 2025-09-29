import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { projectService } from '../Service/ProjectManagement/ProjectService'
import type {
  ProjectCreationOptions,
  ProjectValidationResult,
  ProjectQuickValidation,
  ProjectInitializationResult,
  ProjectTemplate,
  NimbriaProjectConfig
} from '../types/filesystem'

export const useProjectManagementStore = defineStore('projectManagement', () => {
  const $q = useQuasar()

  // 状态管理
  const isCreatingProject = ref(false)
  const isValidatingProject = ref(false)
  const isInitializingProject = ref(false)
  const isRepairingProject = ref(false)
  const error = ref<string | null>(null)
  
  // 项目模板
  const templates = ref<ProjectTemplate[]>([])
  const isLoadingTemplates = ref(false)
  
  // 当前验证的项目信息
  const currentValidationResult = ref<ProjectValidationResult | null>(null)
  const currentProjectPath = ref<string>('')

  // 计算属性
  const hasTemplates = computed(() => templates.value.length > 0)
  const isProcessing = computed(() => 
    isCreatingProject.value || 
    isValidatingProject.value || 
    isInitializingProject.value || 
    isRepairingProject.value
  )

  // Actions

  /**
   * 清除错误信息
   */
  function clearError() {
    error.value = null
  }

  /**
   * 设置错误信息
   */
  function setError(message: string) {
    error.value = message
    console.error('ProjectManagement Error:', message)
  }

  /**
   * 显示通知
   */
  function showNotification(type: 'positive' | 'negative' | 'warning', message: string) {
    $q.notify({
      type,
      message,
      position: 'top',
      timeout: type === 'positive' ? 3000 : 5000
    })
  }

  /**
   * 加载项目模板
   */
  async function loadTemplates() {
    if (isLoadingTemplates.value) return

    isLoadingTemplates.value = true
    clearError()

    try {
      const result = await projectService.getTemplates()
      templates.value = result.templates
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载项目模板失败'
      setError(message)
      showNotification('negative', message)
    } finally {
      isLoadingTemplates.value = false
    }
  }

  /**
   * 选择项目目录
   */
  async function selectProjectDirectory(title: string = '选择项目目录'): Promise<string | null> {
    clearError()

    try {
      const directoryPath = await projectService.selectDirectory(title)
      return directoryPath
    } catch (err) {
      const message = err instanceof Error ? err.message : '选择目录失败'
      setError(message)
      showNotification('negative', message)
      return null
    }
  }

  /**
   * 创建新项目
   */
  async function createProject(options: ProjectCreationOptions): Promise<ProjectInitializationResult | null> {
    if (isCreatingProject.value) return null

    isCreatingProject.value = true
    clearError()

    try {
      // 验证选项
      const validation = projectService.validateProjectCreationOptions(options)
      if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0]
        throw new Error(firstError)
      }

      // 创建项目
      const result = await projectService.createProject(options)

      if (result.success) {
        showNotification('positive', '项目创建成功！')
        return result
      } else {
        throw new Error(result.error || '项目创建失败')
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : '创建项目失败'
      setError(message)
      showNotification('negative', message)
      return null
    } finally {
      isCreatingProject.value = false
    }
  }

  /**
   * 验证项目
   */
  async function validateProject(projectPath: string): Promise<ProjectValidationResult | null> {
    if (isValidatingProject.value) return null

    isValidatingProject.value = true
    clearError()
    currentProjectPath.value = projectPath

    try {
      const result = await projectService.validateProject(projectPath)
      currentValidationResult.value = result
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '验证项目失败'
      setError(message)
      showNotification('negative', message)
      return null
    } finally {
      isValidatingProject.value = false
    }
  }

  /**
   * 快速验证项目
   */
  async function quickValidateProject(projectPath: string): Promise<ProjectQuickValidation | null> {
    clearError()

    try {
      const result = await projectService.quickValidateProject(projectPath)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '快速验证项目失败'
      setError(message)
      return null
    }
  }

  /**
   * 检查目录是否可以初始化
   */
  async function checkCanInitialize(directoryPath: string, templateId?: string) {
    clearError()

    try {
      const result = await projectService.canInitialize(directoryPath, templateId)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '检查初始化能力失败'
      setError(message)
      return null
    }
  }

  /**
   * 初始化现有目录为项目
   */
  async function initializeExistingDirectory(options: {
    directoryPath: string
    projectName: string
    novelTitle: string
    author: string
    genre: string[]
    description?: string
    customConfig?: Record<string, unknown>
  }): Promise<ProjectInitializationResult | null> {
    if (isInitializingProject.value) return null

    isInitializingProject.value = true
    clearError()

    try {
      // 验证选项
      const validation = projectService.validateInitializationOptions(options)
      if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0]
        throw new Error(firstError)
      }

      // 初始化项目
      const result = await projectService.initializeExistingDirectory({
        ...options,
        timestamp: projectService.generateTimestamp()
      })

      if (result.success) {
        showNotification('positive', '项目初始化成功！')
        return result
      } else {
        throw new Error(result.error || '项目初始化失败')
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : '初始化项目失败'
      setError(message)
      showNotification('negative', message)
      return null
    } finally {
      isInitializingProject.value = false
    }
  }

  /**
   * 修复项目
   */
  async function repairProject(projectPath: string): Promise<ProjectInitializationResult | null> {
    if (isRepairingProject.value) return null

    isRepairingProject.value = true
    clearError()

    try {
      const result = await projectService.repairProject(projectPath)

      if (result.success) {
        showNotification('positive', '项目修复成功！')
        
        // 重新验证项目
        await validateProject(projectPath)
        
        return result
      } else {
        throw new Error(result.error || '项目修复失败')
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : '修复项目失败'
      setError(message)
      showNotification('negative', message)
      return null
    } finally {
      isRepairingProject.value = false
    }
  }

  /**
   * 获取项目统计信息
   */
  async function getProjectStats(projectPath: string) {
    clearError()

    try {
      const result = await projectService.getProjectStats(projectPath)
      
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error || '获取项目统计失败')
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : '获取项目统计失败'
      setError(message)
      showNotification('negative', message)
      return null
    }
  }

  /**
   * 生成项目创建选项
   */
  function generateProjectCreationOptions(formData: {
    directoryPath: string
    projectName: string
    novelTitle: string
    author: string
    genre: string[]
    description?: string
  }): ProjectCreationOptions {
    return {
      directoryPath: formData.directoryPath,
      projectName: formData.projectName,
      novelTitle: formData.novelTitle,
      author: formData.author,
      genre: formData.genre,
      description: formData.description,
      timestamp: projectService.generateTimestamp()
    }
  }

  /**
   * 从路径提取项目名称
   */
  function extractProjectNameFromPath(directoryPath: string): string {
    return projectService.extractProjectNameFromPath(directoryPath)
  }

  /**
   * 格式化日期
   */
  function formatDate(dateString: string): string {
    return projectService.formatDate(dateString)
  }

  /**
   * 格式化相对时间
   */
  function formatRelativeTime(dateString: string): string {
    return projectService.formatRelativeTime(dateString)
  }

  /**
   * 检查API可用性
   */
  function checkAPIAvailability() {
    const availability = projectService.checkAPIAvailability()
    
    if (!availability.isAvailable) {
      const message = `项目管理API不可用，缺少: ${availability.missingAPIs.join(', ')}`
      setError(message)
      console.warn('ProjectManagement API Availability:', availability)
    }
    
    return availability
  }

  /**
   * 重置当前验证结果
   */
  function resetValidationResult() {
    currentValidationResult.value = null
    currentProjectPath.value = ''
  }

  /**
   * 获取小说类型选项
   */
  function getGenreOptions(): string[] {
    return [
      '玄幻', '仙侠', '都市', '历史', '军事', '游戏',
      '科幻', '灵异', '同人', '轻小说', '现实',
      '武侠', '奇幻', '悬疑', '言情', '古言',
      '现言', '校园', '职场', '豪门', '重生',
      '穿越', '系统', '末世', '星际', '机甲',
      '修真', '洪荒', '网游', '竞技', '二次元'
    ]
  }

  /**
   * 验证项目配置
   */
  function validateProjectConfig(config: Partial<NimbriaProjectConfig>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!config.projectName?.trim()) {
      errors.push('项目名称不能为空')
    }

    if (!config.novel?.title?.trim()) {
      errors.push('小说标题不能为空')
    }

    if (!config.novel?.author?.trim()) {
      errors.push('作者不能为空')
    }

    if (!config.novel?.genre || config.novel.genre.length === 0) {
      errors.push('请至少选择一个小说类型')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // 初始化时检查API可用性
  checkAPIAvailability()

  return {
    // 状态
    isCreatingProject,
    isValidatingProject,
    isInitializingProject,
    isRepairingProject,
    isLoadingTemplates,
    isProcessing,
    error,
    
    // 数据
    templates,
    hasTemplates,
    currentValidationResult,
    currentProjectPath,
    
    // Actions
    clearError,
    loadTemplates,
    selectProjectDirectory,
    createProject,
    validateProject,
    quickValidateProject,
    checkCanInitialize,
    initializeExistingDirectory,
    repairProject,
    getProjectStats,
    generateProjectCreationOptions,
    extractProjectNameFromPath,
    formatDate,
    formatRelativeTime,
    checkAPIAvailability,
    resetValidationResult,
    getGenreOptions,
    validateProjectConfig
  }
})
