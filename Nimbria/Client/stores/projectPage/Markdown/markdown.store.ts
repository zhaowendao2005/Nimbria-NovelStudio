import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Notify } from 'quasar'
import { mockMarkdownFiles } from './markdown.mock'
import { AutoSaveController } from './markdown.autosave'
import type { MarkdownFile, MarkdownTab, AutoSaveConfig, SaveProgress, FileCreationState } from './types'

/**
 * Markdown Store
 * 管理Markdown文件树、标签页、导航历史等状态
 */
export const useMarkdownStore = defineStore('projectPage-markdown', () => {
  // ==================== 状态 ====================
  
  // 当前项目路径
  const projectPath = ref<string>('')
  
  // 文件树数据
  const fileTree = ref<MarkdownFile[]>([])
  
  // 打开的标签页
  const openTabs = ref<MarkdownTab[]>([])
  
  // 当前激活的标签页ID
  const activeTabId = ref<string | null>(null)
  
  // 历史记录（用于前进后退）
  const navigationHistory = ref<string[]>([])
  const currentHistoryIndex = ref(-1)
  
  // 自动保存配置
  const autoSaveConfig = ref<AutoSaveConfig>({
    enabled: true,
    delay: 2000,
    createBackup: false,
    maxRetries: 3,
    batchSaveOnClose: true
  })
  
  // 保存进度
  const saveProgress = ref<SaveProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: []
  })
  
  // 自动保存控制器实例
  const autoSaveController = new AutoSaveController()
  
  // 当前选中的节点
  const selectedNode = ref<MarkdownFile | null>(null)
  
  // 文件创建状态
  const creationState = ref<FileCreationState>({
    isCreating: false,
    type: null,
    parentNode: null,
    tempNodeId: null,
    inputValue: '',
    validationError: null
  })
  
  // ==================== 计算属性 ====================
  
  // 当前激活的标签页
  const activeTab = computed(() => {
    return openTabs.value.find(tab => tab.id === activeTabId.value) || null
  })
  
  // 是否可以后退
  const canGoBack = computed(() => currentHistoryIndex.value > 0)
  
  // 是否可以前进
  const canGoForward = computed(() => {
    return currentHistoryIndex.value < navigationHistory.value.length - 1
  })
  
  // 是否有未保存的标签页
  const hasDirtyTabs = computed(() => {
    return openTabs.value.some(tab => tab.isDirty)
  })
  
  // ==================== 方法 ====================
  
  /**
   * 设置项目路径
   */
  const setProjectPath = (path: string) => {
    projectPath.value = path
  }
  
  /**
   * 初始化文件树（从Electron API获取真实数据）
   */
  const initializeFileTree = async (path?: string) => {
    try {
      // 尝试从参数、store、或者当前项目窗口获取路径
      let targetPath = path || projectPath.value
      
      if (!targetPath) {
        // 从当前项目窗口获取项目路径
        targetPath = window.nimbria?.getCurrentProjectPath?.() || null
        if (targetPath) {
          projectPath.value = targetPath
          console.log('Auto-detected project path:', targetPath)
        }
      }
      
      if (!targetPath) {
        console.warn('Project path not set, using mock data')
        // 降级到Mock数据
        fileTree.value = mockMarkdownFiles
        return
      }
      
      // 调用 Electron API 扫描文件树
      const tree = await window.nimbria?.markdown?.scanTree({
        projectPath: targetPath,
        excludeDirs: ['node_modules', '.git', 'dist'],
        maxDepth: 10
      })
      
      fileTree.value = tree
      console.log('File tree loaded:', tree.length, 'items')
    } catch (error) {
      console.error('Failed to load file tree:', error)
      // 降级到Mock数据
      fileTree.value = mockMarkdownFiles
      
      Notify.create({
        type: 'warning',
        message: '加载文件树失败，使用Mock数据',
        timeout: 2000
      })
    }
  }
  
  /**
   * 打开文件（从Electron API读取真实内容）
   */
  const openFile = async (filePath: string) => {
    // 检查是否已经打开
    const existingTab = openTabs.value.find(tab => tab.filePath === filePath)
    
    if (existingTab) {
      // 切换到已存在的标签页
      activeTabId.value = existingTab.id
      addToHistory(filePath)
      return existingTab
    }
    
    // 查找文件（允许不在树中的文件，可能是刚创建的）
    const file = findFileByPath(fileTree.value, filePath)
    if (file && file.isFolder) {
      console.error('目标是文件夹，无法打开:', filePath)
      Notify.create({
        type: 'negative',
        message: '无法打开文件夹',
        timeout: 2000
      })
      return null
    }
    
    // 如果文件不在树中，尝试直接读取（可能是刚创建的文件）
    if (!file) {
      console.warn('文件未在树中找到，尝试直接读取:', filePath)
    }
    
    try {
      // 从 Electron API 读取文件内容
      const content = await window.nimbria?.markdown?.readFile(filePath)
      
      // 从文件路径提取文件名
      const fileName = file?.name || filePath.split(/[/\\]/).pop() || 'Untitled'
      
      // 创建新标签页
      const newTab: MarkdownTab = {
        id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        filePath: file?.path || filePath,
        fileName,
        content,
        mode: 'edit',
        isDirty: false,
        originalContent: content,
        lastSaved: new Date()
      }
      
      openTabs.value.push(newTab)
      activeTabId.value = newTab.id
      addToHistory(filePath)
      
      console.log('File opened:', filePath)
      
      return newTab
    } catch (error) {
      console.error('Failed to open file:', error)
      
      Notify.create({
        type: 'negative',
        message: `打开文件失败: ${error instanceof Error ? error.message : String(error)}`,
        timeout: 3000
      })
      
      return null
    }
  }
  
  // 关闭标签页
  const closeTab = (tabId: string) => {
    const index = openTabs.value.findIndex(tab => tab.id === tabId)
    if (index === -1) return
    
    const tab = openTabs.value[index]
    if (!tab) return
    
    // 如果有未保存的更改，这里可以添加确认逻辑
    if (tab.isDirty) {
      // TODO: 显示确认对话框
    }
    
    openTabs.value.splice(index, 1)
    
    // 如果关闭的是当前激活的标签页，切换到相邻标签页
    if (activeTabId.value === tabId) {
      if (openTabs.value.length > 0) {
        const newIndex = Math.min(index, openTabs.value.length - 1)
        const newTab = openTabs.value[newIndex]
        if (newTab) {
          activeTabId.value = newTab.id
        }
      } else {
        activeTabId.value = null
      }
    }
  }
  
  // 切换标签页
  const switchTab = (tabId: string) => {
    const tab = openTabs.value.find(t => t.id === tabId)
    if (tab) {
      activeTabId.value = tabId
      addToHistory(tab.filePath)
    }
  }
  
  /**
   * 更新标签页内容（触发自动保存）
   */
  const updateTabContent = (tabId: string, content: string) => {
    const tab = openTabs.value.find(t => t.id === tabId)
    if (!tab) return
    
    tab.content = content
    
    // 检查是否真的修改了（与原始内容对比）
    tab.isDirty = tab.originalContent !== content
    
    // 触发自动保存（如果启用）
    if (autoSaveConfig.value.enabled && tab.isDirty) {
      autoSaveController.scheduleAutoSave(
        tabId,
        () => saveTab(tabId),
        autoSaveConfig.value.delay
      )
    }
  }
  
  // 切换标签页模式
  const switchTabMode = (tabId: string, mode: 'edit' | 'view') => {
    const tab = openTabs.value.find(t => t.id === tabId)
    if (!tab) return
    
    tab.mode = mode
  }
  
  /**
   * 保存标签页（调用Electron API）
   */
  const saveTab = async (tabId: string) => {
    const tab = openTabs.value.find(t => t.id === tabId)
    if (!tab || !tab.isDirty) {
      return { success: true, skipped: true }
    }
    
    // 设置保存中状态
    tab.isSaving = true
    delete tab.saveError
    
    try {
      // 调用 Electron API 保存文件
      const result = await window.nimbria?.markdown?.writeFile(
        tab.filePath,
        tab.content,
        {
          createBackup: autoSaveConfig.value.createBackup
        }
      )
      
      if (result.success) {
        // 保存成功
        tab.isDirty = false
        tab.lastSaved = new Date()
        tab.originalContent = tab.content
        
        console.log('File saved:', tab.filePath)
        
        Notify.create({
          type: 'positive',
          message: `${tab.fileName} 已保存`,
          timeout: 1000
        })
        
        return { success: true }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      // 保存失败
      const errorMsg = String(error)
      tab.saveError = errorMsg
      
      console.error('Failed to save file:', tab.filePath, error)
      
      Notify.create({
        type: 'negative',
        message: `保存失败: ${errorMsg}`,
        timeout: 3000,
        actions: [
          {
            label: '重试',
            handler: () => {
              void saveTab(tabId)
            }
          }
        ]
      })
      
      return { success: false, error: errorMsg }
    } finally {
      tab.isSaving = false
    }
  }
  
  /**
   * 保存所有标签页
   */
  const saveAllTabs = async () => {
    const dirtyTabs = openTabs.value.filter(tab => tab.isDirty)
    
    if (dirtyTabs.length === 0) {
      return { success: true, savedCount: 0 }
    }
    
    console.log(`Saving ${dirtyTabs.length} files...`)
    
    // 并发保存所有标签页
    const results = await Promise.all(
      dirtyTabs.map(tab => saveTab(tab.id))
    )
    
    const successCount = results.filter(r => r.success).length
    const failedCount = results.length - successCount
    
    if (failedCount === 0) {
      Notify.create({
        type: 'positive',
        message: `已保存 ${successCount} 个文件`,
        timeout: 2000
      })
    } else {
      Notify.create({
        type: 'warning',
        message: `保存完成: ${successCount} 成功, ${failedCount} 失败`,
        timeout: 3000
      })
    }
    
    return {
      success: failedCount === 0,
      savedCount: successCount,
      failedCount
    }
  }
  
  /**
   * 切换自动保存
   */
  const toggleAutoSave = (enabled: boolean) => {
    autoSaveConfig.value.enabled = enabled
    
    // 保存到本地存储
    localStorage.setItem('markdown-autosave-enabled', String(enabled))
    
    Notify.create({
      type: 'info',
      message: enabled ? '自动保存已启用' : '自动保存已禁用',
      timeout: 1500
    })
  }
  
  // 后退
  const goBack = () => {
    if (!canGoBack.value) return
    
    currentHistoryIndex.value--
    const path = navigationHistory.value[currentHistoryIndex.value]
    if (path) {
      void openFile(path)
    }
  }
  
  // 前进
  const goForward = () => {
    if (!canGoForward.value) return
    
    currentHistoryIndex.value++
    const path = navigationHistory.value[currentHistoryIndex.value]
    if (path) {
      void openFile(path)
    }
  }
  
  // 添加到历史记录
  const addToHistory = (path: string) => {
    // 如果当前不在历史记录末尾，删除后面的记录
    if (currentHistoryIndex.value < navigationHistory.value.length - 1) {
      navigationHistory.value.splice(currentHistoryIndex.value + 1)
    }
    
    // 如果新路径与当前路径相同，不添加
    if (navigationHistory.value[currentHistoryIndex.value] === path) {
      return
    }
    
    navigationHistory.value.push(path)
    currentHistoryIndex.value = navigationHistory.value.length - 1
  }
  
  // 查找文件（递归）
  const findFileByPath = (
    files: MarkdownFile[],
    path: string
  ): MarkdownFile | null => {
    for (const file of files) {
      if (file.path === path) {
        return file
      }
      if (file.children) {
        const found = findFileByPath(file.children, path)
        if (found) return found
      }
    }
    return null
  }
  
  // ==================== 文件/目录创建功能 ====================
  
  /**
   * 选中节点
   */
  const selectNode = (node: MarkdownFile | null) => {
    selectedNode.value = node
  }
  
  /**
   * 获取当前选中节点的父目录路径
   */
  const getSelectedDirectory = (): string => {
    if (!selectedNode.value) {
      return projectPath.value
    }
    
    if (selectedNode.value.isFolder) {
      return selectedNode.value.path
    } else {
      const lastSlash = selectedNode.value.path.lastIndexOf('/')
      return lastSlash > 0 ? selectedNode.value.path.substring(0, lastSlash) : projectPath.value
    }
  }
  
  /**
   * 获取父节点（用于插入临时节点）
   */
  const getParentNodeForCreation = (): MarkdownFile | null => {
    if (!selectedNode.value) {
      return null
    }
    
    if (selectedNode.value.isFolder) {
      return selectedNode.value
    } else {
      return findParentNode(fileTree.value, selectedNode.value.path)
    }
  }
  
  /**
   * 递归查找父节点
   */
  const findParentNode = (nodes: MarkdownFile[], targetPath: string): MarkdownFile | null => {
    const lastSlash = targetPath.lastIndexOf('/')
    if (lastSlash <= 0) return null
    
    const parentPath = targetPath.substring(0, lastSlash)
    
    for (const node of nodes) {
      if (node.isFolder && node.path === parentPath) {
        return node
      }
      if (node.children) {
        const found = findParentNode(node.children, targetPath)
        if (found) return found
      }
    }
    return null
  }
  
  /**
   * 开始创建流程（插入临时节点）
   */
  const startCreation = (type: 'file' | 'folder') => {
    if (creationState.value.isCreating) {
      cancelCreation()
    }
    
    const parentNode = getParentNodeForCreation()
    const tempId = `temp-${type}-${Date.now()}`
    
    const tempNode: MarkdownFile = {
      id: tempId,
      name: '',
      path: '',
      isFolder: type === 'folder',
      isTemporary: true,
      tempType: type,
      parentId: parentNode?.id || null
    }
    
    if (parentNode) {
      if (!parentNode.children) {
        parentNode.children = []
      }
      parentNode.children.unshift(tempNode)
    } else {
      fileTree.value.unshift(tempNode)
    }
    
    creationState.value = {
      isCreating: true,
      type,
      parentNode,
      tempNodeId: tempId,
      inputValue: '',
      validationError: null
    }
  }
  
  /**
   * 更新输入值并验证
   */
  const updateCreationInput = (value: string) => {
    creationState.value.inputValue = value
    
    const validation = validateFileName(value)
    creationState.value.validationError = validation.error || null
    
    if (validation.valid) {
      const targetPath = getTargetPath(value)
      const exists = checkFileExists(targetPath)
      if (exists) {
        creationState.value.validationError = `${creationState.value.type === 'file' ? '文件' : '文件夹'}已存在`
      }
    }
  }
  
  /**
   * 获取目标路径
   */
  const getTargetPath = (fileName: string): string => {
    const dir = getSelectedDirectory()
    return `${dir}/${fileName}`.replace(/\/+/g, '/')
  }
  
  /**
   * 检查文件/目录是否已存在
   */
  const checkFileExists = (path: string): boolean => {
    const checkInTree = (nodes: MarkdownFile[]): boolean => {
      for (const node of nodes) {
        if (node.path === path && !node.isTemporary) return true
        if (node.children && checkInTree(node.children)) return true
      }
      return false
    }
    return checkInTree(fileTree.value)
  }
  
  /**
   * 确认创建
   */
  const confirmCreation = async () => {
    if (!creationState.value.isCreating) return
    if (creationState.value.validationError) {
      Notify.create({
        type: 'negative',
        message: creationState.value.validationError,
        position: 'top'
      })
      return
    }
    
    const { type, inputValue } = creationState.value
    const targetPath = getTargetPath(inputValue)
    
    try {
      if (type === 'file') {
        await createFileInternal(targetPath)
      } else {
        await createDirectoryInternal(targetPath)
      }
      
      cancelCreation()
      await initializeFileTree()
      
      if (type === 'file') {
        await openFile(targetPath)
      }
      
      Notify.create({
        type: 'positive',
        message: `${type === 'file' ? '文件' : '文件夹'}创建成功`,
        position: 'top'
      })
    } catch (error) {
      Notify.create({
        type: 'negative',
        message: `创建失败: ${error instanceof Error ? error.message : String(error)}`,
        position: 'top'
      })
    }
  }
  
  /**
   * 取消创建（移除临时节点）
   */
  const cancelCreation = () => {
    if (!creationState.value.isCreating) return
    
    const { tempNodeId, parentNode } = creationState.value
    
    const removeFromTree = (nodes: MarkdownFile[]): boolean => {
      const index = nodes.findIndex(n => n.id === tempNodeId)
      if (index !== -1) {
        nodes.splice(index, 1)
        return true
      }
      
      for (const node of nodes) {
        if (node.children && removeFromTree(node.children)) {
          return true
        }
      }
      return false
    }
    
    if (parentNode && parentNode.children) {
      removeFromTree(parentNode.children)
    } else {
      removeFromTree(fileTree.value)
    }
    
    creationState.value = {
      isCreating: false,
      type: null,
      parentNode: null,
      tempNodeId: null,
      inputValue: '',
      validationError: null
    }
  }
  
  /**
   * 内部方法：创建文件
   */
  const createFileInternal = async (filePath: string) => {
    const result = await window.nimbria?.file?.createFile(filePath, '')
    if (!result?.success) {
      throw new Error(result.error || 'Unknown error')
    }
  }
  
  /**
   * 内部方法：创建目录
   */
  const createDirectoryInternal = async (dirPath: string) => {
    const result = await window.nimbria?.file?.createDirectory(dirPath)
    if (!result?.success) {
      throw new Error(result.error || 'Unknown error')
    }
  }
  
  /**
   * 文件名验证
   */
  const validateFileName = (name: string): { valid: boolean; error?: string } => {
    if (!name || name.trim() === '') {
      return { valid: false, error: '名称不能为空' }
    }
    
    if (/[/\\:*?"<>|]/.test(name)) {
      return { valid: false, error: '名称不能包含特殊字符: / \\ : * ? " < > |' }
    }
    
    if (name === '.' || name === '..') {
      return { valid: false, error: '名称不能为 . 或 ..' }
    }
    
    if (name.length > 255) {
      return { valid: false, error: '名称过长（最多255字符）' }
    }
    
    return { valid: true }
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    projectPath,
    fileTree,
    openTabs,
    activeTabId,
    navigationHistory,
    currentHistoryIndex,
    autoSaveConfig,
    saveProgress,
    selectedNode: computed(() => selectedNode.value),
    creationState: computed(() => creationState.value),
    
    // 计算属性
    activeTab,
    canGoBack,
    canGoForward,
    hasDirtyTabs,
    
    // 方法
    setProjectPath,
    initializeFileTree,
    openFile,
    closeTab,
    switchTab,
    updateTabContent,
    switchTabMode,
    saveTab,
    saveAllTabs,
    toggleAutoSave,
    goBack,
    goForward,
    findFileByPath,
    
    // 文件/目录创建方法
    selectNode,
    startCreation,
    updateCreationInput,
    confirmCreation,
    cancelCreation
  }
})
