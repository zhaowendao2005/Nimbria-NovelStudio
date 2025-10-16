/**
 * TestPage 导出模块
 * 统一导出TestPage相关的组件、状态和工具函数
 */

export { default as TestPage } from './TestPage.vue'
export { useTestPageStore } from './store'
export { 
  useTestPageState,
  useTestForm,
  useThemeToggle,
  useAnimations,
  usePerformanceMonitor
} from './composables'

// 页面元信息
export const TestPageMeta = {
  name: 'TestPage',
  title: 'UI/UX 测试页面', 
  description: '用于测试各种UI组件和交互效果的演示页面',
  category: 'demo',
  icon: 'TestTube',
  path: '/demo/test-page'
}
