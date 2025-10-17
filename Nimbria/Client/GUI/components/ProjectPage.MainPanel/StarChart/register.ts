/**
 * StarChart 页面注册模块
 * 将 StarChart 可视化视图注册到 CustomPageManager
 */

// 页面注册Promise（用于等待注册完成）
let registrationPromise: Promise<void> | null = null

// 页面注册函数（延迟加载，避免循环依赖）
export function registerStarChartPages(): Promise<void> {
  if (registrationPromise) {
    return registrationPromise
  }
  
  registrationPromise = import('../../../../Service/CustomPageManager')
    .then(({ CustomPageAPI }) => {
      console.log('[StarChart] Starting to register pages...')
      
      CustomPageAPI.registerAll([
        {
          id: 'starchart-view',
          name: 'StarChart 可视化视图',
          title: 'StarChart 视图',
          description: '基于 Cytoscape.js 的小说设定关系图可视化',
          category: 'tool',
          icon: 'Share',
          tabType: 'starchart',
          component: () => import('./StarChartPage.vue'),
          showInDrawer: false,
          showInNavbar: false,
          showInMenu: false,
          singleton: false,  // ✅ 允许多实例，支持拆分和独立窗口
          tags: ['starchart', 'graph', 'visualization', 'novel']
        }
      ])
      
      console.log('[StarChart] Pages registered successfully')
    })
    .catch(err => {
      console.error('[StarChart] Failed to register pages:', err)
      registrationPromise = null // 失败后允许重试
      throw err
    })
  
  return registrationPromise
}

// 确保页面注册完成（返回Promise）
export function ensureStarChartRegistration(): Promise<void> {
  return registerStarChartPages()
}

// 立即开始注册
ensureStarChartRegistration()

