/**
 * 分屏布局类型定义
 */

/**
 * 分屏节点类型
 */
export type PaneNodeType = 'split' | 'leaf'

/**
 * 分隔方向
 */
export type SplitDirection = 'horizontal' | 'vertical'

/**
 * 分屏树节点（递归结构）
 */
export interface PaneNode {
  id: string                          // 唯一标识，如 'pane-1'
  type: PaneNodeType                  // 节点类型
  
  // === Split 节点专用字段 ===
  direction?: SplitDirection          // 分隔方向
  splitRatio?: number                 // 分隔比例 (0-100)
  children?: [PaneNode, PaneNode]     // 恰好两个子节点
  
  // === Leaf 节点专用字段 ===
  tabIds?: string[]                   // 该面板中打开的所有标签页 ID
  activeTabId?: string | null         // 当前激活的标签页 ID
  isFocused?: boolean                 // 是否是当前焦点面板
  
  // === 元数据 ===
  createdAt?: number                  // 创建时间戳
  lastActiveAt?: number               // 最后激活时间
}

/**
 * 分屏操作类型
 */
export type SplitAction = 
  | 'split-right-move'    // 向右拆分（转移）
  | 'split-right-copy'    // 向右拆分（复制）
  | 'split-down-move'     // 向下拆分（转移）
  | 'split-down-copy'     // 向下拆分（复制）

/**
 * 分屏上下文菜单项
 */
export interface PaneContextMenuItem {
  action: SplitAction
  label: string
  icon?: string
  divider?: boolean
}

/**
 * 分屏布局状态
 */
export interface PaneLayoutState {
  paneTree: PaneNode              // 分屏树根节点
  focusedPaneId: string | null    // 当前焦点面板 ID
  version: number                 // 状态版本号（用于持久化兼容性）
}

