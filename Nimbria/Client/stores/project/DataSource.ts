/**
 * Project DataSource
 * 封装所有与 window.nimbria.project 和 window.nimbria.file 相关的 API 调用
 */

import { Environment } from '@utils/environment'
import { MockProjectAPI } from '@stores/MockData.vite'
import type { RecentProject } from '../../types/domain/project'

export class ProjectDataSource {
  /**
   * 获取最近打开的项目列表
   */
  static async getRecentProjects(): Promise<RecentProject[]> {
    if (Environment.shouldUseMock()) {
      const mockProjects = await MockProjectAPI.getRecentProjects();
      // 转换 Mock 数据格式为 RecentProject 格式
      return mockProjects.map(p => ({
        id: p.id,
        name: p.name,
        path: p.path,
        lastOpened: p.updatedAt.toISOString(),
        ...(p.cover && { thumbnail: p.cover })
      }));
    }
    
    // 注意：window.nimbria.project 的真实API可能不同
    // 这里保留原有的调用方式，需要根据实际API进行调整
    if (!(window.nimbria?.project as any)?.getRecent) {
      throw new Error('项目API不可用')
    }
    return await (window.nimbria.project as any).getRecent()
  }

  /**
   * 更新最近项目列表
   */
  static async updateRecentProject(projectPath: string, projectName?: string): Promise<{ success: boolean }> {
    if (Environment.shouldUseMock()) {
      console.log('[Mock] 更新最近项目:', projectPath, projectName);
      return { success: true };
    }
    
    if (!(window.nimbria?.project as any)?.updateRecent) {
      throw new Error('项目API不可用')
    }
    return await (window.nimbria.project as any).updateRecent({ projectPath, projectName })
  }

  /**
   * 创建项目窗口
   */
  static async createProjectWindow(projectPath: string) {
    if (Environment.shouldUseMock()) {
      console.log('[Mock] 创建项目窗口:', projectPath);
      return { success: true };
    }
    
    if (!(window.nimbria?.project as any)?.createWindow) {
      throw new Error('项目窗口API不可用')
    }
    return await (window.nimbria.project as any).createWindow(projectPath)
  }

  /**
   * 打开目录选择对话框
   */
  static async selectDirectory(title: string): Promise<string | null> {
    if (Environment.shouldUseMock()) {
      console.log('[Mock] 打开目录选择对话框:', title);
      return '/mock/selected/directory';
    }
    
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

    return result.filePaths[0] ?? null
  }

  /**
   * 检查API可用性
   */
  static checkAPIAvailability(): {
    isAvailable: boolean
    missingAPIs: string[]
  } {
    // Mock 环境下始终返回可用
    if (Environment.shouldUseMock()) {
      return {
        isAvailable: true,
        missingAPIs: []
      }
    }

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
