/**
 * 文件系统 API 类型声明
 * 
 * 扩展 window.nimbria 对象，添加文件系统相关功能
 * 基于 fs-extra, chokidar, fast-glob 提供高性能文件操作
 */

export interface FileSystemItem {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  mtime?: Date
  extension?: string
  mimeType?: string
}

export interface GlobOptions {
  cwd?: string
  dot?: boolean
  absolute?: boolean
  onlyFiles?: boolean
  onlyDirectories?: boolean
  ignore?: string[]
  deep?: number
}

export interface WatchOptions {
  ignored?: string | string[]
  persistent?: boolean
  ignoreInitial?: boolean
  followSymlinks?: boolean
  depth?: number
  awaitWriteFinish?: boolean | {
    stabilityThreshold?: number
    pollInterval?: number
  }
  atomic?: boolean | number
}

export interface FileWatcher {
  id: string
  path: string
  options: WatchOptions
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
  path: string
  stats?: {
    size: number
    mtime: Date
  }
  projectId?: string
}

/**
 * 文件系统 API 接口
 */
export interface FileSystemAPI {
  /**
   * 基础文件操作
   * 
   * 提供读写、复制、移动、删除等基本文件操作功能
   * 所有操作都限制在项目目录范围内，确保安全性
   * 
   * 使用示例:
   * ```typescript
   * // 读取文件内容
   * const content = await window.nimbria.fs.readFile('src/main.ts')
   * 
   * // 写入文件
   * await window.nimbria.fs.writeFile('output.txt', 'Hello World')
   * 
   * // 复制文件
   * await window.nimbria.fs.copy('source.txt', 'backup.txt')
   * ```
   */
  
  /** 
   * 读取文件内容
   * @param path 文件路径（相对于项目根目录）
   * @param encoding 文件编码，默认 'utf8'
   * @returns 文件内容
   */
  readFile(path: string, encoding?: BufferEncoding): Promise<string>
  
  /** 
   * 写入文件内容
   * @param path 文件路径（相对于项目根目录）
   * @param content 文件内容
   * @param encoding 文件编码，默认 'utf8'
   */
  writeFile(path: string, content: string, encoding?: BufferEncoding): Promise<void>
  
  /** 
   * 读取目录内容
   * @param path 目录路径（相对于项目根目录）
   * @returns 目录下的文件和子目录列表
   */
  readDir(path: string): Promise<FileSystemItem[]>
  
  /** 
   * 创建目录
   * @param path 目录路径（相对于项目根目录）
   */
  createDir(path: string): Promise<void>
  
  /** 
   * 删除文件或目录
   * @param path 文件或目录路径（相对于项目根目录）
   * @param recursive 是否递归删除目录，默认 false
   */
  delete(path: string, recursive?: boolean): Promise<void>
  
  /** 
   * 复制文件或目录
   * @param source 源路径（相对于项目根目录）
   * @param dest 目标路径（相对于项目根目录）
   */
  copy(source: string, dest: string): Promise<void>
  
  /** 
   * 移动文件或目录
   * @param source 源路径（相对于项目根目录）
   * @param dest 目标路径（相对于项目根目录）
   */
  move(source: string, dest: string): Promise<void>

  /**
   * 高性能文件搜索
   * 
   * 基于 fast-glob 提供强大的文件模式匹配功能
   * 支持通配符、否定模式、多种过滤选项
   * 
   * 使用示例:
   * ```typescript
   * // 搜索所有 TypeScript 文件
   * const tsFiles = await window.nimbria.fs.glob('**\/*.ts')
   * 
   * // 搜索特定目录下的文件，排除 node_modules
   * const files = await window.nimbria.fs.glob('src/**\/*', {
   *   ignore: ['**/node_modules/**']
   * })
   * 
   * // 只搜索文件，不包括目录
   * const onlyFiles = await window.nimbria.fs.glob('**\/*', {
   *   onlyFiles: true
   * })
   * ```
   */
  
  /** 
   * 使用 glob 模式搜索文件
   * @param pattern glob 模式字符串
   * @param options 搜索选项
   * @returns 匹配的文件路径列表
   */
  glob(pattern: string, options?: GlobOptions): Promise<string[]>

  /**
   * 文件监听功能
   * 
   * 基于 chokidar 提供跨平台文件系统监听
   * 支持文件和目录的增删改事件监听
   * 
   * 使用示例:
   * ```typescript
   * // 监听整个项目目录
   * const watcher = await window.nimbria.fs.watchStart('.', {
   *   ignored: /node_modules/,
   *   ignoreInitial: true
   * })
   * 
   * // 监听特定文件类型
   * const jsWatcher = await window.nimbria.fs.watchStart('**\/*.js', {
   *   awaitWriteFinish: true
   * })
   * 
   * // 停止监听
   * await window.nimbria.fs.watchStop(watcher.id)
   * ```
   */
  
  /** 
   * 开始监听文件/目录变化
   * @param path 要监听的路径（相对于项目根目录）
   * @param options 监听选项
   * @returns 监听器信息
   */
  watchStart(path: string, options?: WatchOptions): Promise<FileWatcher>
  
  /** 
   * 停止文件监听
   * @param watcherId 监听器ID
   */
  watchStop(watcherId: string): Promise<void>

  /**
   * 项目上下文管理
   * 
   * 管理项目级的文件系统上下文
   * 确保文件操作限制在项目范围内
   */
  
  /** 
   * 初始化项目文件系统上下文
   * @param projectPath 项目根目录路径
   */
  initProject(projectPath: string): Promise<void>
  
  /** 
   * 获取当前项目根目录
   * @returns 项目根目录路径
   */
  getProjectRoot(): Promise<string | null>

  /**
   * 事件监听
   * 
   * 监听文件系统变化事件
   */
  
  /** 
   * 监听文件变化事件
   * @param callback 事件处理回调
   */
  onFileChange(callback: (event: FileChangeEvent) => void): void
  
  /** 
   * 移除文件变化事件监听
   * @param callback 要移除的回调函数
   */
  offFileChange(callback: (event: FileChangeEvent) => void): void
}

declare global {
  interface Window {
    nimbria: {
      // ... 现有的 API ...
      
      /**
       * 文件系统 API
       * 
       * 提供完整的文件系统操作功能，包括：
       * - 基础文件操作（读写、复制、移动、删除）
       * - 高性能文件搜索（基于 fast-glob）
       * - 跨平台文件监听（基于 chokidar）
       * - 项目级上下文管理
       * 
       * 所有操作都在项目目录范围内进行，确保安全性
       * 每个项目窗口拥有独立的文件系统上下文
       */
      fs: FileSystemAPI
    }
  }
}

export {}
