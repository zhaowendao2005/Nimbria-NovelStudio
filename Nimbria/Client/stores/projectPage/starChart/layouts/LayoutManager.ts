/**
 * 布局管理器
 * 管理自定义布局引擎
 */
import type { ILayoutEngine, LayoutType } from './types'
import { ConcentricLayout } from './ConcentricLayout'

export class LayoutManager {
  private layouts = new Map<LayoutType, ILayoutEngine>()
  
  constructor() {
    // 注册自定义布局引擎
    this.register(new ConcentricLayout())
  }
  
  /**
   * 注册布局引擎
   */
  register(layout: ILayoutEngine): void {
    this.layouts.set(layout.name, layout)
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
  
  /**
   * 检查是否有对应的布局引擎
   */
  hasLayout(name: LayoutType): boolean {
    return this.layouts.has(name)
  }
}

// 单例导出
export const layoutManager = new LayoutManager()
