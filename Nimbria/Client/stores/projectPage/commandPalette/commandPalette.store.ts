/**
 * 命令面板状态管理
 * 负责命令注册、管理和执行
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Command, CommandPaletteState } from './types'

export const useCommandPaletteStore = defineStore('commandPalette', () => {
  // ==================== 状态 ====================
  const commands = ref<Command[]>([])
  const isOpen = ref(false)
  
  // ==================== Getters ====================
  
  /** 获取所有可用命令（过滤掉条件不满足的） */
  const availableCommands = computed(() => {
    return commands.value
      .filter(cmd => !cmd.when || cmd.when())
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
  })
  
  /** 按分类分组的命令 */
  const commandsByCategory = computed(() => {
    const grouped = new Map<string, Command[]>()
    
    availableCommands.value.forEach(cmd => {
      const category = cmd.category || 'custom'
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(cmd)
    })
    
    return grouped
  })
  
  // ==================== Actions ====================
  
  /** 注册命令 */
  const register = (command: Command) => {
    // 检查是否已存在
    const existing = commands.value.findIndex(c => c.id === command.id)
    if (existing >= 0) {
      console.warn(`Command "${command.id}" already exists, replacing it.`)
      commands.value[existing] = command
    } else {
      commands.value.push(command)
    }
  }
  
  /** 批量注册 */
  const registerBatch = (cmds: Command[]) => {
    cmds.forEach(register)
  }
  
  /** 注销命令 */
  const unregister = (commandId: string) => {
    const index = commands.value.findIndex(c => c.id === commandId)
    if (index >= 0) {
      commands.value.splice(index, 1)
    }
  }
  
  /** 执行命令 */
  const executeCommand = async (commandId: string) => {
    const command = commands.value.find(c => c.id === commandId)
    if (!command) {
      console.warn(`Command "${commandId}" not found`)
      return false
    }
    
    try {
      await command.action()
      isOpen.value = false
      return true
    } catch (error) {
      console.error(`Failed to execute command "${commandId}":`, error)
      return false
    }
  }
  
  /** 打开面板 */
  const open = () => { isOpen.value = true }
  
  /** 关闭面板 */
  const close = () => { isOpen.value = false }
  
  /** 切换面板 */
  const toggle = () => { isOpen.value = !isOpen.value }
  
  /** 清空所有命令（用于重置） */
  const clear = () => {
    commands.value = []
  }
  
  return {
    // State
    commands,
    isOpen,
    
    // Getters
    availableCommands,
    commandsByCategory,
    
    // Actions
    register,
    registerBatch,
    unregister,
    executeCommand,
    open,
    close,
    toggle,
    clear
  }
})

