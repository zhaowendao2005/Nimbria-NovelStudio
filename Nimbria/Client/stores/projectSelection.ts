import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RecentProject, BroadcastMessage } from '../Types/project'

export const useProjectSelectionStore = defineStore('projectSelection', () => {
  // 状态
  const recentProjects = ref<RecentProject[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const hasRecentProjects = computed(() => recentProjects.value.length > 0)
  const sortedRecentProjects = computed(() => 
    [...recentProjects.value].sort((a, b) => 
      new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime()
    )
  )

  // Actions
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

  function addRecentProject(project: RecentProject) {
    // 检查是否已存在
    const existingIndex = recentProjects.value.findIndex(p => p.path === project.path)
    
    if (existingIndex >= 0) {
      // 更新现有项目的最后打开时间
      recentProjects.value[existingIndex] = {
        ...recentProjects.value[existingIndex],
        lastOpened: project.lastOpened
      }
    } else {
      // 添加新项目到开头
      recentProjects.value.unshift(project)
    }

    // 保持最近项目列表不超过10个
    if (recentProjects.value.length > 10) {
      recentProjects.value = recentProjects.value.slice(0, 10)
    }
  }

  function removeRecentProject(projectId: string) {
    const index = recentProjects.value.findIndex(p => p.id === projectId)
    if (index >= 0) {
      recentProjects.value.splice(index, 1)
    }
  }

  function updateProjectLastOpened(projectPath: string) {
    const project = recentProjects.value.find(p => p.path === projectPath)
    if (project) {
      project.lastOpened = new Date().toISOString()
      // 重新排序
      recentProjects.value.sort((a, b) => 
        new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime()
      )
    }
  }

  // 项目操作
  async function showCreateProjectDialog(): Promise<string | null> {
    if (!window.nimbria?.file?.openDialog) {
      throw new Error('文件对话框API不可用')
    }

    try {
      const result = await window.nimbria.file.openDialog({
        title: '选择项目创建位置',
        properties: ['openDirectory'],
        defaultPath: undefined
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      return result.filePaths[0]
    } catch (err) {
      error.value = err instanceof Error ? err.message : '打开文件对话框失败'
      throw err
    }
  }

  async function showOpenProjectDialog(): Promise<string | null> {
    if (!window.nimbria?.file?.openDialog) {
      throw new Error('文件对话框API不可用')
    }

    try {
      const result = await window.nimbria.file.openDialog({
        title: '选择项目文件夹',
        properties: ['openDirectory'],
        defaultPath: undefined
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      return result.filePaths[0]
    } catch (err) {
      error.value = err instanceof Error ? err.message : '打开文件对话框失败'
      throw err
    }
  }

  async function openProjectWindow(projectPath: string): Promise<void> {
    if (!window.nimbria?.project?.createWindow) {
      throw new Error('项目窗口API不可用')
    }

    isLoading.value = true
    error.value = null

    try {
      const result = await window.nimbria.project.createWindow(projectPath)
      
      if (!result.success) {
        throw new Error(result.message || '创建项目窗口失败')
      }

      // 更新最近项目列表
      updateProjectLastOpened(projectPath)

      // 广播项目打开事件
      const message: BroadcastMessage = {
        type: 'project-opened',
        data: { projectPath, processId: result.processId },
        timestamp: new Date().toISOString(),
        fromProcess: 'main'
      }
      
      if (window.nimbria?.project?.broadcastToProjects) {
        window.nimbria.project.broadcastToProjects(message)
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : '打开项目窗口失败'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createNewProject(): Promise<void> {
    try {
      const projectPath = await showCreateProjectDialog()
      if (!projectPath) {
        return // 用户取消了操作
      }

      // TODO: 这里应该调用项目创建逻辑
      // 暂时直接创建项目窗口
      await openProjectWindow(projectPath)

      // 添加到最近项目
      const newProject: RecentProject = {
        id: `project-${Date.now()}`,
        name: projectPath.split(/[/\\]/).pop() || '未命名项目',
        path: projectPath,
        lastOpened: new Date().toISOString()
      }
      
      addRecentProject(newProject)

    } catch (err) {
      console.error('创建项目失败:', err)
      throw err
    }
  }

  async function openExistingProject(): Promise<void> {
    try {
      const projectPath = await showOpenProjectDialog()
      if (!projectPath) {
        return // 用户取消了操作
      }

      await openProjectWindow(projectPath)

      // 添加到最近项目
      const existingProject: RecentProject = {
        id: `project-${Date.now()}`,
        name: projectPath.split(/[/\\]/).pop() || '未命名项目',
        path: projectPath,
        lastOpened: new Date().toISOString()
      }
      
      addRecentProject(existingProject)

    } catch (err) {
      console.error('打开项目失败:', err)
      throw err
    }
  }

  // 清除错误状态
  function clearError() {
    error.value = null
  }

  return {
    // 状态
    recentProjects: sortedRecentProjects,
    isLoading,
    error,
    
    // 计算属性
    hasRecentProjects,
    
    // Actions
    loadRecentProjects,
    addRecentProject,
    removeRecentProject,
    updateProjectLastOpened,
    showCreateProjectDialog,
    showOpenProjectDialog,
    openProjectWindow,
    createNewProject,
    openExistingProject,
    clearError
  }
})
