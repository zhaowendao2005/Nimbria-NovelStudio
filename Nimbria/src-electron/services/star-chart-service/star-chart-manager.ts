// src-electron/services/star-chart-service/star-chart-manager.ts
import Gun from 'gun'
import path from 'path'
import fs from 'fs-extra'

export class StarChartManager {
  private projectGuns: Map<string, any> = new Map()
  private isInitialized = false

  /**
   * 初始化 StarChart 服务
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('StarChart manager already initialized')
      return
    }
    
    // Gun.js 本身不需要全局初始化，但我们可以做一些准备工作
    console.log('StarChart manager initialized')
    this.isInitialized = true
  }

  /**
   * 为项目创建 StarChart 数据库
   * 参考 SQLite 的路径结构：{projectPath}/.Database/StarChart
   */
  async createProjectStarChart(projectPath: string): Promise<string> {
    // 1. 确保 .Database 目录存在（复用 SQLite 的路径逻辑）
    const databaseDir = path.join(projectPath, '.Database')
    await fs.ensureDir(databaseDir)
    
    // 2. StarChart 数据存储路径
    const starChartDir = path.join(databaseDir, 'StarChart')
    await fs.ensureDir(starChartDir)
    
    // 3. 初始化 Gun.js 实例
    const gun = Gun({
      file: path.join(starChartDir, 'starchart.json'),
      localStorage: false,
      radisk: true, // 启用持久化
      multicast: false // 单机模式
    })
    
    // 4. 存储实例
    this.projectGuns.set(projectPath, gun)
    
    console.log(`StarChart created for project: ${projectPath}`)
    return starChartDir
  }

  /**
   * 获取项目的 Gun 实例
   */
  getProjectGun(projectPath: string) {
    return this.projectGuns.get(projectPath)
  }

  /**
   * 关闭项目的 StarChart
   */
  async closeProjectStarChart(projectPath: string): Promise<void> {
    const gun = this.projectGuns.get(projectPath)
    if (gun) {
      // Gun.js 没有显式的 close 方法，但我们可以清理引用
      this.projectGuns.delete(projectPath)
      console.log(`StarChart closed for project: ${projectPath}`)
    }
  }

  /**
   * 清理所有资源
   */
  async cleanup(): Promise<void> {
    this.projectGuns.clear()
    this.isInitialized = false
    console.log('StarChart manager cleaned up')
  }
}

