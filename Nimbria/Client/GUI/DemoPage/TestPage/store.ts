/**
 * TestPage 专用状态管理
 * 使用Pinia创建独立的store
 */

import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'

// 测试数据接口定义
export interface TestItem {
  id: string
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  createdAt: Date
  updatedAt: Date
}

// 过滤选项
export interface FilterOptions {
  status: string
  sortBy: 'title' | 'createdAt' | 'updatedAt'
  sortOrder: 'asc' | 'desc'
  searchQuery: string
}

export const useTestPageStore = defineStore('testPage', () => {
  // ==================== 状态 ====================
  
  /** 测试项列表 */
  const testItems = ref<TestItem[]>([])
  
  /** 加载状态 */
  const loading = ref(false)
  
  /** 错误信息 */
  const error = ref<string | null>(null)
  
  /** 过滤选项 */
  const filterOptions = reactive<FilterOptions>({
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    searchQuery: ''
  })
  
  /** 选中的项目ID列表 */
  const selectedIds = ref<string[]>([])
  
  // ==================== 计算属性 ====================
  
  /** 过滤后的测试项 */
  const filteredItems = computed(() => {
    let items = [...testItems.value]
    
    // 状态过滤
    if (filterOptions.status !== 'all') {
      items = items.filter(item => item.status === filterOptions.status)
    }
    
    // 搜索过滤
    if (filterOptions.searchQuery) {
      const query = filterOptions.searchQuery.toLowerCase()
      items = items.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      )
    }
    
    // 排序
    items.sort((a, b) => {
      const aValue = a[filterOptions.sortBy]
      const bValue = b[filterOptions.sortBy]
      
      let comparison = 0
      if (aValue < bValue) comparison = -1
      if (aValue > bValue) comparison = 1
      
      return filterOptions.sortOrder === 'asc' ? comparison : -comparison
    })
    
    return items
  })
  
  /** 统计信息 */
  const statistics = computed(() => {
    const total = testItems.value.length
    const pending = testItems.value.filter(item => item.status === 'pending').length
    const running = testItems.value.filter(item => item.status === 'running').length
    const completed = testItems.value.filter(item => item.status === 'completed').length
    const failed = testItems.value.filter(item => item.status === 'failed').length
    
    return {
      total,
      pending,
      running,
      completed,
      failed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    }
    })
  
  /** 是否有选中项 */
  const hasSelectedItems = computed(() => selectedIds.value.length > 0)
  
  // ==================== 方法 ====================
  
  /**
   * 创建测试项
   */
  function createTestItem(title: string, description: string): TestItem {
    const now = new Date()
    const item: TestItem = {
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      status: 'pending',
      progress: 0,
      createdAt: now,
      updatedAt: now
    }
    
    testItems.value.unshift(item)
    return item
  }
  
  /**
   * 更新测试项
   */
  function updateTestItem(id: string, updates: Partial<TestItem>) {
    const index = testItems.value.findIndex(item => item.id === id)
    if (index !== -1) {
      testItems.value[index] = {
        ...testItems.value[index],
        ...updates,
        updatedAt: new Date()
      }
    }
  }
  
  /**
   * 删除测试项
   */
  function deleteTestItem(id: string) {
    const index = testItems.value.findIndex(item => item.id === id)
    if (index !== -1) {
      testItems.value.splice(index, 1)
      // 同时从选中列表中移除
      const selectedIndex = selectedIds.value.indexOf(id)
      if (selectedIndex !== -1) {
        selectedIds.value.splice(selectedIndex, 1)
      }
    }
  }
  
  /**
   * 批量删除选中项
   */
  function deleteSelectedItems() {
    selectedIds.value.forEach(id => {
      const index = testItems.value.findIndex(item => item.id === id)
      if (index !== -1) {
        testItems.value.splice(index, 1)
      }
    })
    selectedIds.value = []
  }
  
  /**
   * 运行测试项
   */
  async function runTestItem(id: string) {
    updateTestItem(id, { status: 'running', progress: 0 })
    
    // 模拟测试运行过程
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      updateTestItem(id, { progress })
    }
    
    // 模拟随机成功/失败
    const success = Math.random() > 0.3
    updateTestItem(id, { 
      status: success ? 'completed' : 'failed',
      progress: success ? 100 : 0
    })
  }
  
  /**
   * 重置测试项状态
   */
  function resetTestItem(id: string) {
    updateTestItem(id, { status: 'pending', progress: 0 })
  }
  
  /**
   * 切换项目选中状态
   */
  function toggleItemSelection(id: string) {
    const index = selectedIds.value.indexOf(id)
    if (index === -1) {
      selectedIds.value.push(id)
    } else {
      selectedIds.value.splice(index, 1)
    }
  }
  
  /**
   * 全选/取消全选
   */
  function toggleSelectAll() {
    if (selectedIds.value.length === filteredItems.value.length) {
      selectedIds.value = []
    } else {
      selectedIds.value = filteredItems.value.map(item => item.id)
    }
  }
  
  /**
   * 设置过滤选项
   */
  function setFilter(key: keyof FilterOptions, value: any) {
    (filterOptions as any)[key] = value
  }
  
  /**
   * 重置过滤选项
   */
  function resetFilters() {
    filterOptions.status = 'all'
    filterOptions.sortBy = 'createdAt'
    filterOptions.sortOrder = 'desc'
    filterOptions.searchQuery = ''
  }
  
  /**
   * 初始化示例数据
   */
  function initializeSampleData() {
    const sampleItems = [
      { title: 'UI组件测试', description: '测试所有基础UI组件的渲染和交互' },
      { title: '响应式布局测试', description: '验证在不同设备尺寸下的布局表现' },
      { title: '动画效果测试', description: '检查页面动画的流畅性和性能' },
      { title: '表单验证测试', description: '测试表单验证逻辑和错误提示' },
      { title: '主题切换测试', description: '验证深色/浅色主题切换功能' }
    ]
    
    sampleItems.forEach(item => {
      createTestItem(item.title, item.description)
    })
  }
  
  return {
    // 状态
    testItems,
    loading,
    error,
    filterOptions,
    selectedIds,
    
    // 计算属性
    filteredItems,
    statistics,
    hasSelectedItems,
    
    // 方法
    createTestItem,
    updateTestItem,
    deleteTestItem,
    deleteSelectedItems,
    runTestItem,
    resetTestItem,
    toggleItemSelection,
    toggleSelectAll,
    setFilter,
    resetFilters,
    initializeSampleData
  }
})
