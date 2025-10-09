import type { BroadcastMessage, ProjectData, ProjectResult, RecentProject, SaveResult } from './project'

/**
 * Nimbria 多窗口系统 API 接口定义
 * 
 * 这个接口定义了渲染进程中可用的所有 Electron 主进程交互方法。
 * 通过 contextBridge 安全地暴露给前端，确保类型安全的跨进程通信。
 */
export interface NimbriaWindowAPI {
  /**
   * 获取当前项目窗口的项目路径
   * 
   * @returns 当前项目路径，如果不在项目窗口中则返回null
   * 
   * @example
   * const projectPath = window.nimbria.getCurrentProjectPath()
   * console.log('Current project:', projectPath)
   */
  getCurrentProjectPath(): string | null

  /**
   * 窗口控制 API
   * 
   * 提供当前窗口的基本操作能力，包括最小化、关闭、最大化等。
   * 每个方法都是异步的，返回 Promise 以处理可能的错误。
   * 
   * 调用示例:
   * ```typescript
   * // 最小化当前窗口
   * await window.nimbria.window.minimize()
   * 
   * // 检查窗口是否最大化
   * const isMax = await window.nimbria.window.isMaximized()
   * if (isMax) {
   *   await window.nimbria.window.unmaximize()
   * } else {
   *   await window.nimbria.window.maximize()
   * }
   * ```
   */
  window: {
    /** 最小化当前窗口 */
    minimize(): Promise<void>
    /** 关闭当前窗口 */
    close(): Promise<void>
    /** 最大化当前窗口 */
    maximize(): Promise<void>
    /** 取消最大化当前窗口 */
    unmaximize(): Promise<void>
    /** 检查当前窗口是否已最大化 */
    isMaximized(): Promise<boolean>
    /** 将焦点设置到当前窗口 */
    focus(): Promise<void>
  }

  /**
   * 项目窗口管理 API
   * 
   * 负责项目窗口的创建、管理和数据操作。每个项目运行在独立的渲染进程中，
   * 实现真正的进程级隔离。支持同时打开多个项目，彼此不相互影响。
   * 
   * 调用示例:
   * ```typescript
   * // 创建新项目窗口
   * const result = await window.nimbria.project.createWindow('/path/to/project')
   * if (result.success) {
   *   console.log('项目窗口已创建，进程ID:', result.processId)
   * }
   * 
   * // 获取最近打开的项目列表
   * const recentProjects = await window.nimbria.project.getRecent()
   * recentProjects.forEach(project => {
   *   console.log(`${project.name}: ${project.path}`)
   * })
   * 
   * // 向所有项目窗口广播消息
   * window.nimbria.project.broadcastToProjects({
   *   type: 'theme-changed',
   *   payload: { theme: 'dark' }
   * })
   * ```
   */
  project: {
    /** 
     * 创建新的项目窗口
     * @param projectPath 项目文件夹路径
     * @returns 创建结果，包含成功状态和进程ID
     */
    createWindow(projectPath: string): Promise<ProjectResult>
    
    /** 
     * 关闭指定项目的窗口
     * @param projectPath 项目文件夹路径
     * @returns 操作结果
     */
    closeWindow(projectPath: string): Promise<ProjectResult>
    
    /** 
     * 保存项目数据
     * @param projectData 要保存的项目数据
     * @returns 保存结果
     */
    save(projectData: ProjectData): Promise<SaveResult>
    
    /** 
     * 获取最近打开的项目列表
     * @returns 最近项目列表，按最后打开时间排序
     */
    getRecent(): Promise<RecentProject[]>
    
    /** 
     * 更新最近打开的项目列表
     * @param payload 项目路径和可选的项目名称
     * @returns 更新结果
     */
    updateRecent(payload: { projectPath: string; projectName?: string }): Promise<{ success: boolean }>
    
    /** 
     * 清空所有缓存（包括最近项目列表）
     * @returns 操作结果
     */
    clearCache(): Promise<{ success: boolean }>
    
    /** 
     * 向所有项目窗口广播消息
     * @param message 要广播的消息
     */
    broadcastToProjects(message: BroadcastMessage): void

    // 新增项目管理API
    /** 创建项目 */
    createProject(options: ProjectCreationOptions): Promise<ProjectOperationResult>
    /** 初始化现有目录为项目 */
    initializeExistingDirectory(options: ProjectInitOptions): Promise<ProjectOperationResult>
    /** 验证项目 */
    validateProject(projectPath: string): Promise<ProjectValidationResult>
    /** 快速验证项目 */
    quickValidateProject(projectPath: string): Promise<ProjectQuickValidation>
    /** 检查是否可以初始化 */
    canInitialize(directoryPath: string): Promise<CanInitializeResult>
    /** 获取项目模板 */
    getTemplates(): Promise<ProjectTemplate[]>
    /** 修复项目 */
    repairProject(projectPath: string): Promise<ProjectOperationResult>
    /** 获取项目统计 */
    getProjectStats(projectPath: string): Promise<ProjectStats>
  }

  /**
   * 进程间通信 API
   * 
   * 提供渲染进程与主进程、以及渲染进程之间的通信能力。
   * 使用 MessagePort 实现高效、类型安全的消息传递。
   * 
   * 调用示例:
   * ```typescript
   * // 向主进程发送消息
   * window.nimbria.process.sendToMain({
   *   type: 'status-update',
   *   payload: { progress: 50 }
   * })
   * 
   * // 监听来自其他进程的广播消息
   * window.nimbria.process.onBroadcast((message) => {
   *   if (message.type === 'project-saved') {
   *     console.log('项目已保存:', message.payload)
   *   }
   * })
   * 
   * // 创建 Worker 线程处理耗时任务
   * const worker = window.nimbria.process.createWorker('./background-task.js')
   * worker.postMessage({ task: 'heavy-computation' })
   * ```
   */
  process: {
    /** 
     * 向主进程发送消息
     * @param message 要发送的消息数据
     */
    sendToMain(message: unknown): void
    
    /** 
     * 监听来自其他进程的广播消息
     * @param callback 消息处理回调函数
     */
    onBroadcast(callback: (message: BroadcastMessage) => void): void
    
    /** 
     * 创建 Worker 线程
     * @param scriptPath Worker 脚本路径
     * @returns Worker 实例
     */
    createWorker(scriptPath: string): Worker
  }

  /**
   * 文件系统对话框 API
   * 
   * 提供原生文件系统对话框，支持文件选择、目录选择和保存对话框。
   * 所有操作都通过主进程安全执行，避免渲染进程直接访问文件系统。
   * 
   * 调用示例:
   * ```typescript
   * // 选择项目目录
   * const result = await window.nimbria.file.openDialog({
   *   title: '选择项目文件夹',
   *   properties: ['openDirectory'],
   *   defaultPath: 'D:\\Projects'
   * })
   * 
   * if (!result.canceled && result.filePaths.length > 0) {
   *   const selectedPath = result.filePaths[0]
   *   console.log('选择的目录:', selectedPath)
   * }
   * 
   * // 选择多个文件
   * const files = await window.nimbria.file.openDialog({
   *   title: '选择文档文件',
   *   properties: ['openFile', 'multiSelections'],
   *   filters: [
   *     { name: '文档文件', extensions: ['txt', 'md', 'doc'] },
   *     { name: '所有文件', extensions: ['*'] }
   *   ]
   * })
   * 
   * // 保存文件对话框
   * const saveResult = await window.nimbria.file.saveDialog({
   *   title: '保存项目',
   *   defaultPath: 'my-project.json',
   *   filters: [{ name: 'JSON 文件', extensions: ['json'] }]
   * })
   * ```
   */
  file: {
    /** 
     * 打开文件/目录选择对话框
     * @param options 对话框配置选项
     * @returns 选择结果，包含是否取消和选中的文件路径
     */
    openDialog(options: {
      /** 对话框标题 */
      title?: string
      /** 默认路径 */
      defaultPath?: string
      /** 选择属性：'openFile'(选择文件) | 'openDirectory'(选择目录) | 'multiSelections'(多选) */
      properties: Array<'openFile' | 'openDirectory' | 'multiSelections'>
      /** 文件类型过滤器 */
      filters?: Array<{ name: string; extensions: string[] }>
    }): Promise<{
      /** 用户是否取消了选择 */
      canceled: boolean
      /** 选中的文件/目录路径列表 */
      filePaths: string[]
    }>
    
    /** 
     * 打开保存文件对话框
     * @param options 对话框配置选项
     * @returns 保存结果，包含是否取消和保存路径
     */
    saveDialog(options: {
      /** 对话框标题 */
      title?: string
      /** 默认文件名/路径 */
      defaultPath?: string
      /** 文件类型过滤器 */
      filters?: Array<{ name: string; extensions: string[] }>
    }): Promise<{
      /** 用户是否取消了保存 */
      canceled: boolean
      /** 选择的保存路径（如果未取消） */
      filePath?: string
    }>
    
    /**
     * 创建新文件（UTF-8编码）
     * @param filePath 完整文件路径
     * @param initialContent 初始内容（默认空字符串）
     * @returns 操作结果
     */
    createFile(filePath: string, initialContent?: string): Promise<{ success: boolean; error?: string }>
    
    /**
     * 创建目录（自动创建父目录）
     * @param dirPath 完整目录路径
     * @returns 操作结果
     */
    createDirectory(dirPath: string): Promise<{ success: boolean; error?: string }>
  }

  /**
   * 文件系统 API
   */
  fs: {
    /** 检查路径是否存在 */
    pathExists(path: string): Promise<boolean>
    // 其他fs方法可以后续补充
  }

  /**
   * Markdown 文件管理 API
   * 
   * 提供 Markdown 文件的读取、写入、自动保存和备份管理功能。
   * 支持文件树扫描、批量操作和原子性写入，确保数据安全。
   * 
   * 调用示例:
   * ```typescript
   * // 扫描项目中的 Markdown 文件树
   * const fileTree = await window.nimbria.markdown.scanTree({
   *   projectPath: 'D:\\MyProject',
   *   excludeDirs: ['node_modules', '.git'],
   *   maxDepth: 10
   * })
   * 
   * // 读取 Markdown 文件内容
   * const content = await window.nimbria.markdown.readFile('D:\\MyProject\\README.md')
   * 
   * // 保存 Markdown 文件
   * const result = await window.nimbria.markdown.writeFile(
   *   'D:\\MyProject\\README.md',
   *   '# 新内容'
   * )
   * 
   * // 批量保存多个文件
   * await window.nimbria.markdown.batchWriteFiles([
   *   { path: 'file1.md', content: '内容1' },
   *   { path: 'file2.md', content: '内容2' }
   * ])
   * ```
   */
  markdown: {
    /**
     * 扫描项目中的 Markdown 文件树
     * @param options 扫描选项
     * @returns Markdown 文件树结构
     */
    scanTree(options: {
      projectPath: string
      excludeDirs?: string[]
      maxDepth?: number
    }): Promise<Array<{
      id: string
      name: string
      path: string
      isFolder: boolean
      children?: MarkdownFile[]
      metadata?: {
        size: number
        mtime: Date
        tags?: string[]
      }
    }>>

    /**
     * 读取 Markdown 文件内容
     * @param filePath 文件绝对路径
     * @returns 文件内容（UTF-8）
     */
    readFile(filePath: string): Promise<string>

    /**
     * 写入 Markdown 文件（原子性操作）
     * @param filePath 文件绝对路径
     * @param content 文件内容
     * @param options 写入选项
     * @returns 操作结果
     */
    writeFile(
      filePath: string, 
      content: string,
      options?: {
        createBackup?: boolean
        encoding?: string
      }
    ): Promise<{ success: boolean; error?: string }>

    /**
     * 批量写入多个 Markdown 文件
     * @param files 文件列表
     * @returns 批量操作结果
     */
    batchWriteFiles(files: Array<{
      path: string
      content: string
    }>): Promise<{
      success: boolean
      totalCount: number
      successCount: number
      failedCount: number
      errors?: Array<{ filePath: string; error: string }>
    }>

    /**
     * 创建文件备份
     * @param filePath 文件绝对路径
     * @returns 备份文件路径
     */
    createBackup(filePath: string): Promise<string>

    /**
     * 列出文件的所有备份
     * @param filePath 文件绝对路径
     * @returns 备份信息列表
     */
    listBackups(filePath: string): Promise<Array<{
      path: string
      originalPath: string
      timestamp: number
      size: number
    }>>

    /**
     * 恢复文件备份
     * @param backupPath 备份文件路径
     * @returns 操作结果
     */
    restoreBackup(backupPath: string): Promise<{ success: boolean; error?: string }>
  }
}

declare global {
  interface Window {
    nimbria: NimbriaWindowAPI
  }
}

export {}

