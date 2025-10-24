import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Notify } from 'quasar'
import { AutoSaveController } from './markdown.autosave'
import { Environment } from '@utils/environment'
import ProjectPageDataSource from '@stores/projectPage/DataSource'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'
import type { MarkdownFile, MarkdownTab, AutoSaveConfig, SaveProgress, FileCreationState, OutlineScrollTarget } from './types'

// 定义扩展的 Nimbria API 接口
interface ExtendedMarkdownAPI {
  scanTree?: (params: {
    projectPath: string
    excludeDirs?: string[]
    maxDepth?: number
  }) => Promise<MarkdownFile[]>
  createDirectory?: (dirPath: string) => Promise<{ success: boolean; error?: string }>
}

interface ExtendedNimbriaAPI {
  getCurrentProjectPath?: () => string | null
  markdown?: ExtendedMarkdownAPI
  file?: {
    createDirectory?: (dirPath: string) => Promise<{ success: boolean; error?: string }>
  }
}

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
  
  // 🔥 大纲跳转目标（用于大纲点击跳转）
  const outlineScrollTarget = ref<OutlineScrollTarget | null>(null)
  
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
   * 初始化文件树（自动适配 Mock/Electron 环境）
   */
  const initializeFileTree = async (path?: string) => {
    try {
      // 在 Mock 环境下，不需要项目路径，直接加载 Mock 数据
      if (Environment.shouldUseMock()) {
        console.log('[Mock] Loading file tree from Mock data...')
        const tree = await ProjectPageDataSource.getFileTree()
        fileTree.value = tree
        console.log('[Mock] File tree loaded:', tree.length, 'items')
        return
      }
      
      // Electron 环境：需要项目路径
      let targetPath = path || projectPath.value
      
      if (!targetPath) {
      // 从当前项目窗口获取项目路径
      const nimbriaAPI = window.nimbria as ExtendedNimbriaAPI | undefined
      const detectedPath = nimbriaAPI?.getCurrentProjectPath?.() || null
      if (detectedPath) {
        targetPath = detectedPath
        projectPath.value = detectedPath
        console.log('Auto-detected project path:', detectedPath)
      }
      }
      
      if (!targetPath) {
        console.error('Project path not set, cannot load file tree')
        
        Notify.create({
          type: 'negative',
          message: '项目路径未设置，无法加载文件树',
          timeout: 3000
        })
        return
      }
      
      // 调用 Electron API 扫描文件树
      const nimbriaAPI = window.nimbria as ExtendedNimbriaAPI | undefined
      const tree = await nimbriaAPI?.markdown?.scanTree({
        projectPath: targetPath,
        excludeDirs: ['node_modules', '.git', 'dist'],
        maxDepth: 10
      })
      
      if (tree) {
        fileTree.value = tree
        console.log('File tree loaded:', tree.length, 'items')
      }
      
      // 🔥 启动文件监听（仅在 Electron 环境下）
      await startFileWatcher(targetPath)
    } catch (error) {
      console.error('Failed to load file tree:', error)
      
      Notify.create({
        type: 'negative',
        message: `加载文件树失败: ${error instanceof Error ? error.message : String(error)}`,
        timeout: 3000
      })
    }
  }

  /**
   * 🔥 启动文件监听
   */
  const startFileWatcher = async (watchPath: string) => {
    try {
      if (Environment.shouldUseMock()) return
      
      const nimbriaAPI = window.nimbria as any
      if (!nimbriaAPI?.fileWatcher?.startWatch) {
        console.warn('[FileWatcher] API not available')
        return
      }
      
      // 启动文件监听
      const result = await nimbriaAPI.fileWatcher.startWatch(watchPath, {
        ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
        ignoreInitial: true
      })
      
      if (result.success) {
        console.log('[FileWatcher] Started watching:', watchPath)
        
        // 监听文件变更事件
        nimbriaAPI.fileWatcher.onFileChange?.((event: any) => {
          handleFileChange(event)
        })
      } else {
        console.error('[FileWatcher] Failed to start:', result.error)
      }
    } catch (error) {
      console.error('[FileWatcher] Error:', error)
    }
  }

  /**
   * 🔥 处理文件变更事件
   */
  const handleFileChange = (event: any) => {
    console.log('[FileWatcher] File change detected:', event)
    
    const { type, path } = event
    
    // 只处理 Markdown 文件和目录变更
    if (!path.endsWith('.md') && !path.endsWith('.markdown') && type !== 'addDir' && type !== 'unlinkDir') {
      return
    }
    
    // 防抖处理，避免频繁刷新
    if (fileWatcherDebounceTimer.value) {
      clearTimeout(fileWatcherDebounceTimer.value)
    }
    fileWatcherDebounceTimer.value = setTimeout(() => {
      refreshFileTree()
    }, 500)
  }

  // 文件监听防抖计时器
  const fileWatcherDebounceTimer = ref<NodeJS.Timeout | null>(null)

  /**
   * 🔥 刷新文件树（保持展开状态）
   */
  const refreshFileTree = async () => {
    try {
      console.log('[FileTree] Refreshing file tree...')
      
      // 保存当前展开状态
      const expandedPaths = new Set<string>()
      const saveExpandedState = (nodes: MarkdownFile[]) => {
        nodes.forEach(node => {
          if (node.isFolder && node.children) {
            // 这里需要根据实际的展开状态判断逻辑
            expandedPaths.add(node.path)
            saveExpandedState(node.children)
          }
        })
      }
      saveExpandedState(fileTree.value)
      
      // 重新加载文件树（不传递路径，使用当前项目路径）
      await initializeFileTree()
      
      // 恢复展开状态（需要在下一个 tick 执行）
      setTimeout(() => {
        restoreExpandedState(expandedPaths)
      }, 100)
      
      console.log('[FileTree] File tree refreshed')
    } catch (error) {
      console.error('[FileTree] Failed to refresh:', error)
    }
  }

  /**
   * 🔥 恢复展开状态
   */
  const restoreExpandedState = (expandedPaths: Set<string>) => {
    // 这个方法需要与文件树组件配合实现
    // 暂时先打印日志，具体实现需要在组件中处理
    console.log('[FileTree] Restoring expanded state for:', Array.from(expandedPaths))
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
      // 使用 DataSource 读取文件内容（自动适配 Mock/Electron）
      const content = await ProjectPageDataSource.getFileContent(filePath)
      
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
  
  // 打开DocParser标签页
  const openDocParser = () => {
    // 检查是否已经打开了DocParser标签页
    const existingTab = openTabs.value.find(tab => tab.type === 'docparser')
    if (existingTab) {
      // 如果已存在，直接切换到该标签页
      activeTabId.value = existingTab.id
      console.log('[Markdown] DocParser tab already exists, switching to it')
      return existingTab
    }
    
    // 创建新的DocParser标签页
    const newTab: MarkdownTab = {
      id: `docparser-${Date.now()}`,
      type: 'docparser',
      filePath: '', // DocParser不需要文件路径
      fileName: '文档解析器',
      content: '',
      mode: 'edit', // DocParser不使用mode，但保持兼容
      isDirty: false
    }
    
    openTabs.value.push(newTab)
    activeTabId.value = newTab.id
    
    console.log('[Markdown] DocParser tab created:', newTab.id)
    return newTab
  }
  
  // 打开StarChart标签页
  const openStarChart = () => {
    // 检查是否已经打开了StarChart标签页
    const existingTab = openTabs.value.find(tab => tab.type === 'starchart')
    if (existingTab) {
      // 如果已存在，直接切换到该标签页
      activeTabId.value = existingTab.id
      console.log('[Markdown] StarChart tab already exists, switching to it')
      return existingTab
    }
    
    // 创建新的StarChart标签页
    const newTab: MarkdownTab = {
      id: `starchart-${Date.now()}`,
      type: 'starchart',
      filePath: '', // StarChart不需要文件路径
      fileName: 'StarChart - 图数据可视化',
      content: '',
      mode: 'edit', // StarChart不使用mode，但保持兼容
      isDirty: false
    }
    
    openTabs.value.push(newTab)
    activeTabId.value = newTab.id
    
    console.log('[Markdown] StarChart tab created:', newTab.id)
    return newTab
  }
  
  // 打开SearchAndScraper标签页（支持多实例）
  const openSearchAndScraper = (): MarkdownTab => {
    // 🔥 每次都创建新的标签页（支持多个搜索实例）
    const newTab: MarkdownTab = {
      id: `search-and-scraper-${Date.now()}`,
      type: 'search-and-scraper',
      filePath: '',
      fileName: `搜索 #${openTabs.value.filter(t => t.type === 'search-and-scraper').length + 1}`,
      content: '',
      mode: 'edit',
      isDirty: false
    }
    
    openTabs.value.push(newTab)
    activeTabId.value = newTab.id
    
    console.log('[Markdown] SearchAndScraper tab created:', newTab.id)
    return newTab
  }
  
  // 关闭标签页
  const closeTab = (tabId: string) => {
    const index = openTabs.value.findIndex(tab => tab.id === tabId)
    if (index === -1) return
    
    const tab = openTabs.value[index]
    if (!tab) return
    
    // 🔥 检查是否还有其他面板在使用这个标签页（引用计数）
    const paneLayoutStore = usePaneLayoutStore()
    const allPanes = paneLayoutStore.allLeafPanes
    
    const refCount = allPanes.filter(pane => 
      pane.tabIds?.includes(tabId)
    ).length
    
    console.log(`[Markdown] closeTab: tabId=${tabId}, fileName=${tab.fileName}, refCount=${refCount}`)
    
    // 🔥 如果还有其他面板在使用，不删除标签对象，只打印日志
    if (refCount > 0) {
      console.log(`[Markdown] Tab still in use by ${refCount} pane(s), keeping tab object`)
      // 注意：不更新 activeTabId，因为其他面板可能还在用
      return
    }
    
    // 🔥 引用计数为 0，可以安全删除标签对象
    console.log(`[Markdown] No pane references, deleting tab object`)
    
    // 如果有未保存的更改，这里可以添加确认逻辑
    if (tab.isDirty) {
      // TODO: 显示确认对话框
    }
    
    // 🔥 如果是 SearchAndScraper 标签页，销毁其 BrowserView
    if (tab.type === 'search-and-scraper') {
      // 动态导入以避免循环依赖
      import('@stores/projectPage/searchAndScraper').then(({ useSearchAndScraperStore }) => {
        const searchAndScraperStore = useSearchAndScraperStore()
        searchAndScraperStore.removeInstance(tabId)
      }).catch(error => {
        console.error('[Markdown] Failed to cleanup SearchAndScraper:', error)
      })
      
      // 销毁 BrowserView
      import('@service/SearchAndScraper').then(({ SearchAndScraperService }) => {
        SearchAndScraperService.destroyView(tabId).then(() => {
          console.log(`[Markdown] BrowserView destroyed for tab: ${tabId}`)
        }).catch(error => {
          console.error('[Markdown] Failed to destroy BrowserView:', error)
        })
      }).catch(error => {
        console.error('[Markdown] Failed to import SearchAndScraperService:', error)
      })
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
      // 使用 DataSource 保存文件（自动适配 Mock/Electron）
      const success = await ProjectPageDataSource.saveFile(tab.filePath, tab.content)
      
      if (success) {
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
        throw new Error('Save failed')
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
    // 使用 DataSource 创建文件（自动适配 Mock/Electron）
    const dir = filePath.substring(0, filePath.lastIndexOf('/'))
    const name = filePath.substring(filePath.lastIndexOf('/') + 1)
    await ProjectPageDataSource.createFile(dir, name)
  }
  
  /**
   * 内部方法：创建目录
   */
  const createDirectoryInternal = async (dirPath: string) => {
    // 在 Mock 环境下，目录创建不需要实际操作
    if (Environment.shouldUseMock()) {
      console.log('[Mock] Create directory:', dirPath)
      return
    }
    
    // Electron 环境：调用文件系统 API
    const nimbriaAPI = window.nimbria as ExtendedNimbriaAPI | undefined
    const result = await nimbriaAPI?.file?.createDirectory(dirPath)
    if (!result?.success) {
      throw new Error(result?.error || 'Unknown error')
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
  
  /**
   * 🔥 大纲跳转：滚动到指定标题位置
   * @param lineNumber 目标行号
   * @param slug 标题的 slug（用于预览模式）
   */
  const scrollToOutline = (lineNumber: number, slug: string) => {
    console.log('[MarkdownStore] Scroll to outline:', { lineNumber, slug })
    
    // 设置跳转目标（编辑器和查看器会监听这个状态）
    outlineScrollTarget.value = {
      lineNumber,
      slug,
      timestamp: Date.now() // 时间戳用于触发重复跳转
    }
  }
  
  /**
   * 🔥 清除大纲跳转目标
   */
  const clearScrollTarget = () => {
    outlineScrollTarget.value = null
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
    outlineScrollTarget: computed(() => outlineScrollTarget.value), // 🔥 大纲跳转目标
    
    // 计算属性
    activeTab,
    canGoBack,
    canGoForward,
    hasDirtyTabs,
    
    // 方法
    setProjectPath,
    initializeFileTree,
    openFile,
    openDocParser,
    openStarChart,
    openSearchAndScraper,
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
    cancelCreation,
    
    // 🔥 大纲跳转方法
    scrollToOutline,
    clearScrollTarget
  }
})
