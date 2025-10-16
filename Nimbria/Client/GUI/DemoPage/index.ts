/**
 * DemoPage 模块导出
 * 统一管理所有Demo页面的导出
 */

// TestPage 导出
export * from './TestPage'

// Demo页面列表配置
export const DemoPages = [
  {
    name: 'TestPage',
    title: 'UI/UX 测试页面',
    description: '综合测试各种UI组件和交互效果',
    category: 'ui-test',
    icon: 'TestTube',
    path: '/demo/test-page',
    component: () => import('./TestPage/TestPage.vue')
  }
  // 未来可以在这里添加更多Demo页面
] as const

// Demo页面类型定义
export interface DemoPageConfig {
  name: string
  title: string
  description: string
  category: string
  icon: string
  path: string
  component: () => Promise<any>
}

// 获取所有Demo页面
export function getAllDemoPages(): DemoPageConfig[] {
  return [...DemoPages]
}

// 根据名称获取Demo页面
export function getDemoPageByName(name: string): DemoPageConfig | undefined {
  return DemoPages.find(page => page.name === name)
}

// 根据分类获取Demo页面
export function getDemoPagesByCategory(category: string): DemoPageConfig[] {
  return DemoPages.filter(page => page.category === category)
}
