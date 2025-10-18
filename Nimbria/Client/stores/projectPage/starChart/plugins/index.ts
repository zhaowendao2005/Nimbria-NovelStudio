/**
 * 插件系统统一导出
 * 自动注册所有插件
 */

// 核心导出
export { PluginRegistry } from './registry'
export { BaseLayoutPlugin } from './base/BaseLayoutPlugin'
export * from './types'

// 样式系统
export { StyleManager, HierarchyStyleHelper } from './styles/StyleManager'

// 适配器
export { TreeDataAdapter } from './adapters/TreeDataAdapter'
export { CompositeAdapter } from './adapters/CompositeAdapter'

// 混入
export { CustomDataSourceStyleMixin, HierarchyColorSchemeMixin } from './mixins/StyleMixin'

// 插件
export { MultiRootRadialPlugin } from './MultiRootRadialPlugin'

// 自动注册插件
import { PluginRegistry } from './registry'
import { MultiRootRadialPlugin } from './MultiRootRadialPlugin'

// 注册多根径向树插件
PluginRegistry.register(new MultiRootRadialPlugin())

console.log('[StarChart Plugins] 插件系统初始化完成')

