import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import type { RecentProject } from '../Types/project'

export const useProjectSelectionStore = defineStore('projectSelection', () => {
  const $q = useQuasar()
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
    if (!window.nimbria?.project?.getRecent) {
      console.warn('项目API不可用')
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const projects = await window.nimbria.project.getRecent()
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
    if (!window.nimbria?.file?.openDialog) {
      throw new Error('文件对话框API不可用')
    }

    const result = await window.nimbria.file.openDialog({
      title: dialogTitle,
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  }

  async function updateRecentProject(projectPath: string) {
    await window.nimbria.project.updateRecent({ projectPath })
    await refreshRecentProjects()
  }

  async function openProjectWindow(projectPath: string) {
    if (!window.nimbria?.project?.createWindow) {
      throw new Error('项目窗口API不可用')
    }

    const result = await window.nimbria.project.createWindow(projectPath)

    if (!result.success) {
      throw new Error(result.message || '创建项目窗口失败')
    }

    await updateRecentProject(projectPath)
  }

  async function createNewProject() {
    clearError()

    try {
      const projectPath = await selectDirectory('选择项目创建位置')
      if (!projectPath) {
        return
      }

      await openProjectWindow(projectPath)
      $q.notify({ type: 'positive', message: '项目创建成功', position: 'top' })
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建项目失败'
      error.value = message
      console.error('创建项目失败:', err)
      $q.notify({ type: 'negative', message, position: 'top' })
      throw err
    }
  }

  async function openExistingProject() {
    clearError()

    try {
      const projectPath = await selectDirectory('选择项目文件夹')
      if (!projectPath) {
        return
      }

      await openProjectWindow(projectPath)
      $q.notify({ type: 'positive', message: '项目打开成功', position: 'top' })
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
      await openProjectWindow(project.path)
      $q.notify({ type: 'positive', message: `项目 "${project.name}" 打开成功`, position: 'top' })
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
