/**
 * 布局管理器
 * 负责注册、管理和切换布局引擎
 */
import type { ILayoutEngine, LayoutType } from './types'
import { ConcentricLayout } from './ConcentricLayout'
import { ForceDirectedLayout } from './ForceDirectedLayout'

export class LayoutManager {
  private layouts = new Map<LayoutType, ILayoutEngine>()
  
  constructor() {
    // 注册内置布局
    this.register(new ConcentricLayout())
    this.register(new ForceDirectedLayout())
    
    console.log('[LayoutManager] 布局引擎已注册：concentric, force-directed')
  }
  
  /**
   * 注册布局引擎
   */
  register(layout: ILayoutEngine): void {
    this.layouts.set(layout.name, layout)
    console.log(`[LayoutManager] 注册布局引擎: ${layout.name}`)
  }
  
  /**
   * 获取布局引擎
   */
  getLayout(name: LayoutType): ILayoutEngine {
    const layout = this.layouts.get(name)
    if (!layout) {
      throw new Error(`布局引擎 "${name}" 未注册`)
    }
    return layout
  }
  
  /**
   * 获取所有布局引擎
   */
  getAllLayouts(): ILayoutEngine[] {
    return Array.from(this.layouts.values())
  }
  
  /**
   * 获取所有布局类型
   */
  getLayoutTypes(): LayoutType[] {
    return Array.from(this.layouts.keys())
  }
}

// 单例导出
export const layoutManager = new LayoutManager()

