import { boot } from 'quasar/wrappers'

// 框架初始化启动文件
export default boot(async () => {
  console.log('[Framework] Starting initialization...')
  
  // 🔥 预注册所有自定义页面（确保在任何组件使用前完成）
  try {
    // 注册 DemoPage
    const { ensureRegistration } = await import('../GUI/DemoPage')
    await ensureRegistration()
    console.log('[Framework] ✅ DemoPage registered successfully')
    
    // 注册 StarChart 页面
    const { ensureStarChartRegistration } = await import('../GUI/components/ProjectPage.MainPanel/StarChart')
    await ensureStarChartRegistration()
    console.log('[Framework] ✅ StarChart pages registered successfully')
    
    // 注册 ControlPanel 页面
    const { ensureControlPanelRegistration } = await import('../GUI/components/ProjectPage.MainPanel/Writing.ControlPanel')
    await ensureControlPanelRegistration()
    console.log('[Framework] ✅ ControlPanel pages registered successfully')
  } catch (error) {
    console.error('[Framework] ❌ Failed to register custom pages:', error)
  }
  
  console.log('[Framework] Initialization complete')
})