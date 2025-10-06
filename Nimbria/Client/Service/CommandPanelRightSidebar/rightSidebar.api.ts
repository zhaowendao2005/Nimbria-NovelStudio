/**
 * 右侧栏API服务
 * 封装对右侧栏状态的所有操作
 */

import { useRightSidebarStore } from '@stores/projectPage/rightSidebar'
import type { RightSidebarPanel } from '@stores/projectPage/rightSidebar/types'

/**
 * 右侧栏API服务类
 * 提供面板注册、切换、显示控制等功能
 */
class RightSidebarApiService {
  /** 获取store实例 */
  private get store() {
    return useRightSidebarStore()
  }
  
  // ==================== 面板注册 ====================
  
  /** 注册面板 */
  register(panel: RightSidebarPanel): void {
    this.store.register(panel)
  }
  
  /** 注销面板 */
  unregister(panelId: string): void {
    this.store.unregister(panelId)
  }
  
  /** 清空所有面板 */
  clear(): void {
    this.store.clear()
  }
  
  // ==================== 面板切换 ====================
  
  /** 切换到指定面板 */
  switchTo(panelId: string): void {
    this.store.switchTo(panelId)
  }
  
  /** 切换到下一个面板 */
  switchToNext(): void {
    const panels = this.store.availablePanels
    const currentIndex = panels.findIndex(p => p.id === this.store.activeId)
    const nextIndex = (currentIndex + 1) % panels.length
    if (panels[nextIndex]) {
      this.store.switchTo(panels[nextIndex].id)
    }
  }
  
  /** 切换到上一个面板 */
  switchToPrev(): void {
    const panels = this.store.availablePanels
    const currentIndex = panels.findIndex(p => p.id === this.store.activeId)
    const prevIndex = (currentIndex - 1 + panels.length) % panels.length
    if (panels[prevIndex]) {
      this.store.switchTo(panels[prevIndex].id)
    }
  }
  
  // ==================== 显示控制 ====================
  
  /** 显示侧边栏 */
  show(): void {
    this.store.show()
  }
  
  /** 隐藏侧边栏 */
  hide(): void {
    this.store.hide()
  }
  
  /** 切换显示/隐藏 */
  toggle(): void {
    this.store.toggle()
  }
  
  /** 设置宽度 */
  setWidth(width: string): void {
    this.store.setWidth(width)
  }
  
  // ==================== 查询 ====================
  
  /** 获取所有可用面板 */
  getAvailablePanels(): RightSidebarPanel[] {
    return this.store.availablePanels
  }
  
  /** 获取当前激活的面板 */
  getActivePanel(): RightSidebarPanel | null {
    return this.store.activePanel
  }
  
  /** 查找面板 */
  findPanel(panelId: string): RightSidebarPanel | undefined {
    return this.store.panels.find(p => p.id === panelId)
  }
  
  /** 是否有面板 */
  hasPanels(): boolean {
    return this.store.hasPanels
  }
}

// 导出单例
export const rightSidebarApi = new RightSidebarApiService()

