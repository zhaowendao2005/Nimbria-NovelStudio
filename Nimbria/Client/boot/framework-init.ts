import { boot } from 'quasar/wrappers'

// 框架初始化启动文件
export default boot(async () => {
  console.log('[Framework] Starting initialization...')
  
  // 🔥 预注册所有自定义页面（确保在任何组件使用前完成）
  try {
    const { ensureRegistration } = await import('../GUI/DemoPage')
    await ensureRegistration()
    console.log('[Framework] ✅ Custom pages registered successfully')
  } catch (error) {
    console.error('[Framework] ❌ Failed to register custom pages:', error)
  }
  
  console.log('[Framework] Initialization complete')
})