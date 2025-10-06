/**
 * 命令面板类型定义
 */

/** 命令分类 */
export type CommandCategory = 
  | 'view'      // 视图操作
  | 'file'      // 文件操作
  | 'edit'      // 编辑操作
  | 'navigate'  // 导航操作
  | 'tools'     // 工具
  | 'custom'    // 自定义

/** 命令定义 */
export interface Command {
  id: string                           // 唯一标识（格式: category.action，如 'view.toggleSidebar'）
  label: string                        // 显示文本
  category: CommandCategory            // 分类
  action: () => void | Promise<void>   // 执行函数（由外部提供）
  icon?: string                        // 可选图标（Element Plus icon name）
  keywords?: string[]                  // 搜索关键词（支持中英文）
  shortcut?: string                    // 快捷键显示文本（如 'Ctrl+S'，仅用于展示）
  priority?: number                    // 优先级（数值越大越靠前，默认0）
  when?: () => boolean                 // 显示条件（返回false则不显示）
}

/** Store状态 */
export interface CommandPaletteState {
  commands: Command[]       // 注册的命令列表
  isOpen: boolean          // 面板是否打开
  searchQuery: string      // 当前搜索关键词（可选，用于持久化）
}

