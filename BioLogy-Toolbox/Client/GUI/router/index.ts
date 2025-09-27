import { route } from 'quasar/wrappers'
import type { Router } from 'vue-router'
import { routes } from './routes'

// 对外路由配置入口
export default route<Router>(() => {
  // TODO: 实现路由配置
  return {
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes
  }
})