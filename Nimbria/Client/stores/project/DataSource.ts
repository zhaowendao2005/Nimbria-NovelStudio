/**
 * Project DataSource
 * 封装所有与 window.nimbria.project 和 window.nimbria.file 相关的 API 调用
 */

import type { RecentProject } from '../../types/domain/project'

export class ProjectDataSource {
  /**
   * 获取最近打开的项目列表
   */
  static async getRecentProjects(): Promise<RecentProject[]> {
    if (!window.nimbria?.project?.getRecent) {
      throw new Error('项目API不可用')
    }
    return await window.nimbria.project.getRecent()
  }

  /**
   * 更新最近项目列表
   */
  static async updateRecentProject(projectPath: string, projectName?: string): Promise<{ success: boolean }> {
    if (!window.nimbria?.project?.updateRecent) {
      throw new Error('项目API不可用')
    }
    return await window.nimbria.project.updateRecent({ projectPath, projectName })
  }

  /**
   * 创建项目窗口
   */
  static async createProjectWindow(projectPath: string) {
    if (!window.nimbria?.project?.createWindow) {
      throw new Error('项目窗口API不可用')
    }
    return await window.nimbria.project.createWindow(projectPath)
  }

  /**
   * 打开目录选择对话框
   */
  static async selectDirectory(title: string): Promise<string | null> {
    if (!window.nimbria?.file?.openDialog) {
      throw new Error('文件对话框API不可用')
    }

    const result = await window.nimbria.file.openDialog({
      title,
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  }

  /**
   * 检查API可用性
   */
  static checkAPIAvailability(): {
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
    }

    if (!window.nimbria.file) {
      missingAPIs.push('window.nimbria.file')
    }

    return {
      isAvailable: missingAPIs.length === 0,
      missingAPIs
    }
  }
}
