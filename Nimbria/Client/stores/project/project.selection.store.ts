import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useProjectManagementStore } from './project.management.store'
import { ProjectDataSource } from './DataSource'
import type { RecentProject } from '../../types/domain/project'

export const useProjectSelectionStore = defineStore('projectSelection', () => {
  const $q = useQuasar()
  const projectMgmt = useProjectManagementStore()
  const recentProjects = ref<RecentProject[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const hasRecentProjects = computed(() => recentProjects.value.length > 0)
  const sortedRecentProjects = computed(() =>
    [...recentProjects.value].sort((a, b) =>
      new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime()
    )
  )

  async function loadRecentProjects() {
    isLoading.value = true
    error.value = null

    try {
      const projects = await ProjectDataSource.getRecentProjects()
      recentProjects.value = projects
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载最近项目失败'
      console.error('加载最近项目失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function refreshRecentProjects() {
    await loadRecentProjects()
  }

  function clearError() {
    error.value = null
  }

  async function selectDirectory(dialogTitle: string): Promise<string | null> {
    return await ProjectDataSource.selectDirectory(dialogTitle)
  }

  async function updateRecentProject(projectPath: string) {
    await ProjectDataSource.updateRecentProject(projectPath)
    await refreshRecentProjects()
  }

  async function openProjectWindow(projectPath: string) {
    const result = await ProjectDataSource.createProjectWindow(projectPath)

    if (!result.success) {
      throw new Error(result.message || '创建项目窗口失败')
    }

    await updateRecentProject(projectPath)
  }

  async function createNewProject() {
    clearError()
    
    // 使用新的项目管理功能，这里只是触发创建流程
    // 实际的创建逻辑将在对话框中处理
    return 'show-creation-dialog'
  }

  async function openExistingProject() {
    clearError()

    try {
      const projectPath = await selectDirectory('选择项目文件夹')
      if (!projectPath) {
        return null
      }

      // 先快速验证项目
      const validationResult = await projectMgmt.quickValidateProject(projectPath)
      if (!validationResult) {
        throw new Error('验证项目失败')
      }

      if (validationResult.isValid) {
        // 项目有效，直接打开
        await openProjectWindow(projectPath)
        $q.notify({ type: 'positive', message: '项目打开成功', position: 'top' })
        return 'opened'
      } else {
        // 项目无效或需要验证，返回路径以便显示验证对话框
        return { action: 'show-validation-dialog', projectPath }
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : '打开项目失败'
      error.value = message
      console.error('打开项目失败:', err)
      $q.notify({ type: 'negative', message, position: 'top' })
      throw err
    }
  }

  async function openRecentProject(project: RecentProject) {
    clearError()

    try {
      // 先快速验证最近项目
      const validationResult = await projectMgmt.quickValidateProject(project.path)
      if (!validationResult) {
        throw new Error('验证项目失败')
      }

      if (validationResult.isValid) {
        // 项目有效，直接打开
        await openProjectWindow(project.path)
        $q.notify({ type: 'positive', message: `项目 "${project.name}" 打开成功`, position: 'top' })
        return 'opened'
      } else {
        // 项目无效或需要验证
        $q.notify({ 
          type: 'warning', 
          message: `项目 "${project.name}" 需要验证`, 
          position: 'top' 
        })
        return { action: 'show-validation-dialog', projectPath: project.path }
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : '打开项目失败'
      error.value = message
      console.error('打开最近项目失败:', err)
      $q.notify({ type: 'negative', message, position: 'top' })
      throw err
    }
  }

  return {
    recentProjects: sortedRecentProjects,
    isLoading,
    error,
    hasRecentProjects,
    loadRecentProjects,
    refreshRecentProjects,
    createNewProject,
    openExistingProject,
    openRecentProject,
    clearError
  }
})
