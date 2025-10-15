/**
 * Chat Tab Manager
 * 管理 LLM Chat 标签页
 * 分离对话管理和标签页显示
 */

import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'

/**
 * 标签页接口
 */
export interface ChatTab {
  id: string                    // 标签页 ID（不等于对话 ID）
  conversationId: string        // 关联的对话 ID
  title: string                 // 显示标题
  isActive: boolean            // 是否激活
  isDirty: boolean             // 是否有未保存内容
}

/**
 * 最大显示标签页数量
 */
const MAX_VISIBLE_TABS = 10

export const useChatTabManager = defineStore('chatTabManager', {
  state: () => ({
    tabs: [] as ChatTab[],
    activeTabId: null as string | null
  }),

  getters: {
    /**
     * 获取可见的标签页（限制数量）
     */
    visibleTabs(): ChatTab[] {
      // 确保活动标签页总是可见
      if (this.activeTab) {
        const activeIndex = this.tabs.findIndex(tab => tab.id === this.activeTabId)
        if (activeIndex >= MAX_VISIBLE_TABS) {
          // 如果活动标签页超出可见范围，调整可见窗口
          const start = Math.max(0, activeIndex - MAX_VISIBLE_TABS + 1)
          return this.tabs.slice(start, start + MAX_VISIBLE_TABS)
        }
      }
      
      // 默认显示前10个标签页
      return this.tabs.slice(0, MAX_VISIBLE_TABS)
    },

    /**
     * 获取活动标签页
     */
    activeTab(): ChatTab | null {
      if (!this.activeTabId) return null
      return this.tabs.find(tab => tab.id === this.activeTabId) || null
    },

    /**
     * 获取活动对话 ID
     */
    activeConversationId(): string | null {
      return this.activeTab?.conversationId || null
    },

    /**
     * 检查对话是否已打开
     */
    isConversationOpen(): (conversationId: string) => boolean {
      return (conversationId: string) => {
        return this.tabs.some(tab => tab.conversationId === conversationId)
      }
    },

    /**
     * 获取总标签页数量
     */
    totalTabsCount(): number {
      return this.tabs.length
    },

    /**
     * 是否有更多标签页未显示
     */
    hasMoreTabs(): boolean {
      return this.tabs.length > MAX_VISIBLE_TABS
    },

    /**
     * 根据对话 ID 获取标签页
     */
    getTabByConversationId(): (conversationId: string) => ChatTab | null {
      return (conversationId: string) => {
        return this.tabs.find(tab => tab.conversationId === conversationId) || null
      }
    }
  },

  actions: {
    /**
     * 打开对话（创建新标签页或激活已有标签页）
     */
    openConversation(conversationId: string, title: string = '新对话', activate: boolean = true): void {
      console.log('📂 [ChatTabManager] 打开对话:', conversationId, '激活:', activate)

      const existingTab = this.tabs.find(tab => tab.conversationId === conversationId)
      
      if (existingTab) {
        // 激活已有标签页（如果需要）
        if (activate) {
          console.log('✅ [ChatTabManager] 激活已有标签页:', existingTab.id)
          this.setActiveTab(existingTab.id)
        }
      } else {
        // 创建新标签页
        const newTab: ChatTab = {
          id: nanoid(),
          conversationId,
          title,
          isActive: activate,
          isDirty: false
        }
        
        console.log('🆕 [ChatTabManager] 创建新标签页:', newTab.id)
        
        if (activate) {
          // 将所有现有标签页设为非激活
          this.tabs.forEach(tab => { tab.isActive = false })
          this.activeTabId = newTab.id
        }
        
        this.tabs.push(newTab)
      }
    },

    /**
     * 设置活动标签页
     */
    setActiveTab(tabId: string): void {
      const tab = this.tabs.find(t => t.id === tabId)
      if (!tab) {
        console.warn('⚠️ [ChatTabManager] 标签页不存在:', tabId)
        return
      }

      console.log('🎯 [ChatTabManager] 设置活动标签页:', tabId)

      // 将所有标签页设为非激活
      this.tabs.forEach(t => { t.isActive = false })
      
      // 激活目标标签页
      tab.isActive = true
      this.activeTabId = tabId
    },

    /**
     * 关闭标签页（不删除对话）
     */
    closeTab(tabId: string): boolean {
      const tabIndex = this.tabs.findIndex(tab => tab.id === tabId)
      if (tabIndex === -1) {
        console.warn('⚠️ [ChatTabManager] 标签页不存在:', tabId)
        return false
      }

      const tab = this.tabs[tabIndex]
      
      console.log('🗑️ [ChatTabManager] 关闭标签页:', tabId)

      // 如果有未保存内容，需要确认（返回 false 表示需要确认）
      if (tab.isDirty) {
        console.log('⚠️ [ChatTabManager] 标签页有未保存内容，需要确认')
        return false
      }

      // 移除标签页
      this.tabs.splice(tabIndex, 1)

      // 如果关闭的是活动标签页，激活其他标签页
      if (tab.isActive && this.tabs.length > 0) {
        const newActiveIndex = Math.min(tabIndex, this.tabs.length - 1)
        this.setActiveTab(this.tabs[newActiveIndex].id)
      } else if (this.tabs.length === 0) {
        this.activeTabId = null
      }

      return true
    },

    /**
     * 强制关闭标签页（忽略未保存内容）
     */
    forceCloseTab(tabId: string): void {
      const tabIndex = this.tabs.findIndex(tab => tab.id === tabId)
      if (tabIndex === -1) return

      const tab = this.tabs[tabIndex]
      
      console.log('🗑️ [ChatTabManager] 强制关闭标签页:', tabId)

      this.tabs.splice(tabIndex, 1)

      if (tab.isActive && this.tabs.length > 0) {
        const newActiveIndex = Math.min(tabIndex, this.tabs.length - 1)
        this.setActiveTab(this.tabs[newActiveIndex].id)
      } else if (this.tabs.length === 0) {
        this.activeTabId = null
      }
    },

    /**
     * 关闭所有相关标签页（当对话被删除时）
     */
    closeTabsByConversationId(conversationId: string): void {
      console.log('🗑️ [ChatTabManager] 关闭对话相关的所有标签页:', conversationId)
      
      const relatedTabs = this.tabs.filter(tab => tab.conversationId === conversationId)
      relatedTabs.forEach(tab => this.forceCloseTab(tab.id))
    },

    /**
     * 更新标签页标题
     */
    updateTabTitle(tabId: string, title: string): void {
      const tab = this.tabs.find(t => t.id === tabId)
      if (tab) {
        console.log('✏️ [ChatTabManager] 更新标签页标题:', tabId, '->', title)
        tab.title = title
      }
    },

    /**
     * 根据对话 ID 更新标签页标题
     */
    updateTabTitleByConversationId(conversationId: string, title: string): void {
      const tab = this.tabs.find(t => t.conversationId === conversationId)
      if (tab) {
        this.updateTabTitle(tab.id, title)
      }
    },

    /**
     * 设置标签页脏状态
     */
    setTabDirty(tabId: string, isDirty: boolean): void {
      const tab = this.tabs.find(t => t.id === tabId)
      if (tab) {
        tab.isDirty = isDirty
      }
    },

    /**
     * 关闭所有标签页
     */
    closeAllTabs(): void {
      console.log('🗑️ [ChatTabManager] 关闭所有标签页')
      this.tabs = []
      this.activeTabId = null
    },

    /**
     * 关闭其他标签页
     */
    closeOtherTabs(tabId: string): void {
      const tab = this.tabs.find(t => t.id === tabId)
      if (!tab) return

      console.log('🗑️ [ChatTabManager] 关闭其他标签页')
      
      this.tabs = [tab]
      this.setActiveTab(tab.id)
    }
  }
})

