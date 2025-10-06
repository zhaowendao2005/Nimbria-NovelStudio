/**
 * 命令API服务
 * 封装对命令面板状态的所有操作
 */

import { useCommandPaletteStore } from '@/stores/projectPage/commandPalette'
import type { Command } from '@/stores/projectPage/commandPalette/types'

/**
 * 命令API服务类
 * 提供命令注册、执行、查询等功能
 */
class CommandApiService {
  /** 获取store实例（确保在Vue上下文中调用） */
  private get store() {
    return useCommandPaletteStore()
  }
  
  // ==================== 命令注册 ====================
  
  /** 注册单个命令 */
  register(command: Command): void {
    this.store.register(command)
  }
  
  /** 批量注册命令 */
  registerBatch(commands: Command[]): void {
    this.store.registerBatch(commands)
  }
  
  /** 注销命令 */
  unregister(commandId: string): void {
    this.store.unregister(commandId)
  }
  
  /** 清空所有命令 */
  clear(): void {
    this.store.clear()
  }
  
  // ==================== 命令执行 ====================
  
  /** 执行命令（返回是否成功） */
  async execute(commandId: string): Promise<boolean> {
    return await this.store.executeCommand(commandId)
  }
  
  // ==================== 面板控制 ====================
  
  /** 打开命令面板 */
  open(): void {
    this.store.open()
  }
  
  /** 关闭命令面板 */
  close(): void {
    this.store.close()
  }
  
  /** 切换命令面板 */
  toggle(): void {
    this.store.toggle()
  }
  
  // ==================== 查询 ====================
  
  /** 获取所有可用命令 */
  getAvailableCommands(): Command[] {
    return this.store.availableCommands
  }
  
  /** 按分类获取命令 */
  getCommandsByCategory(): Map<string, Command[]> {
    return this.store.commandsByCategory
  }
  
  /** 查找命令 */
  findCommand(commandId: string): Command | undefined {
    return this.store.commands.find(c => c.id === commandId)
  }
}

// 导出单例
export const commandApi = new CommandApiService()

