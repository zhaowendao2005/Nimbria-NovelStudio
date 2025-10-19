/**
 * 插件系统统一导出
 * 自动注册所有插件
 */

// 核心导出
export { PluginRegistry } from './registry'
export { BaseLayoutPlugin } from './base/BaseLayoutPlugin'
export * from './types'

// 插件导出
export { MultiRootRadialPlugin } from './MultiRootRadialPlugin'
export { LazyMultiRootRadialPlugin } from './LazyMultiRootRadialPlugin'

// 自动注册插件
import { PluginRegistry } from './registry'
import { MultiRootRadialPlugin } from './MultiRootRadialPlugin'
import { LazyMultiRootRadialPlugin } from './LazyMultiRootRadialPlugin'

// 注册多根径向树插件
PluginRegistry.register(new MultiRootRadialPlugin())

// 注册懒加载多根径向树插件
PluginRegistry.register(new LazyMultiRootRadialPlugin())

console.log('[StarChart Plugins] 插件系统初始化完成')

