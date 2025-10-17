/**
 * ControlPanel 页面注册模块
 * 将中央控制台注册到 CustomPageManager
 */

// 页面注册Promise（用于等待注册完成）
let registrationPromise: Promise<void> | null = null

// 页面注册函数（延迟加载，避免循环依赖）
export function registerControlPanelPages(): Promise<void> {
  if (registrationPromise) {
    return registrationPromise
  }
  
  registrationPromise = import('../../../../Service/CustomPageManager')
    .then(({ CustomPageAPI }) => {
      console.log('[ControlPanel] Starting to register pages...')
      
      CustomPageAPI.registerAll([
        {
          id: 'control-panel',
          name: '中央控制台',
          title: '中央控制台',
          description: '项目中央控制台，统一管理和控制核心功能',
          category: 'tool',
          icon: 'Setting',
          tabType: 'control-panel',
          component: () => import('./ControlPanelPage.vue'),
          showInDrawer: false,
          showInNavbar: false,
          showInMenu: false,
          singleton: false,  // ✅ 允许多实例，支持拆分和独立窗口
          tags: ['control', 'panel', 'dashboard', 'management']
        }
      ])
      
      console.log('[ControlPanel] Pages registered successfully')
    })
    .catch(err => {
      console.error('[ControlPanel] Failed to register pages:', err)
      registrationPromise = null // 失败后允许重试
      throw err
    })
  
  return registrationPromise
}

// 确保页面注册完成（返回Promise）
export function ensureControlPanelRegistration(): Promise<void> {
  return registerControlPanelPages()
}

// 立即开始注册
void ensureControlPanelRegistration()

