/**
 * 复合适配器
 * 按顺序执行多个适配器
 */

import type { IDataAdapter } from '../types'

export class CompositeAdapter implements IDataAdapter {
  name = 'composite-adapter'
  
  constructor(private adapters: IDataAdapter[]) {}
  
  /**
   * 检查是否有任一适配器支持
   */
  supports(data: any): boolean {
    return this.adapters.some(adapter => 
      adapter.supports ? adapter.supports(data) : true
    )
  }
  
  /**
   * 按顺序执行所有适配器
   */
  async adapt(data: any): Promise<any> {
    let result = data
    
    for (const adapter of this.adapters) {
      // 如果适配器支持该数据，则执行
      if (!adapter.supports || adapter.supports(result)) {
        result = await adapter.adapt(result)
      }
    }
    
    return result
  }
}

