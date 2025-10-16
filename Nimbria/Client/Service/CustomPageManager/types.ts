/**
 * CustomPageManager 通用页面管理系统类型定义
 */

export interface CustomPageConfig {
  // 基础信息
  id: string                    // 唯一标识
  name: string                  // 显示名称
  title: string                 // 标签页标题
  description?: string          // 描述信息
  category: string              // 分类（demo, tool, util, etc.）
  icon: string                  // 图标名称
  
  // 组件配置
  component: () => Promise<any> // 懒加载组件
  tabType: string              // 标签页类型（用于PaneContent渲染）
  
  // 显示配置
  showInNavbar?: boolean       // 是否在导航栏显示
  showInDrawer?: boolean       // 是否在抽屉中显示
  showInMenu?: boolean         // 是否在菜单中显示
  tags?: string[]              // 搜索标签
  version?: string             // 版本号
  
  // 行为配置
  singleton?: boolean          // 是否单例（默认true）
  closable?: boolean          // 是否可关闭（默认true）
  draggable?: boolean         // 是否可拖拽（默认true）
  
  // 权限配置
  permissions?: string[]       // 需要的权限
  devOnly?: boolean           // 仅开发模式显示
}

export interface PageOpenOptions {
  paneId?: string             // 指定打开的面板ID
  forceNew?: boolean          // 强制创建新标签页
  focus?: boolean             // 是否自动聚焦（默认true）
  params?: Record<string, any> // 传递给页面的参数
}

export interface CustomPageInstance {
  id: string                  // 实例ID
  config: CustomPageConfig    // 配置信息
  tabId: string              // 标签页ID
  paneId: string             // 所在面板ID
  params?: Record<string, any> // 页面参数
  createdAt: Date            // 创建时间
  lastActiveAt: Date         // 最后活跃时间
}

export type PageCategory = 'demo' | 'tool' | 'utility' | 'debug' | 'admin' | 'custom'

export interface PageFilter {
  category?: PageCategory | string
  showInDrawer?: boolean
  showInNavbar?: boolean
  showInMenu?: boolean
  tags?: string[]
  devOnly?: boolean
}
