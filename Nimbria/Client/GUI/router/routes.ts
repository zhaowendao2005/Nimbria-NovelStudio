import type { RouteRecordRaw } from 'vue-router'

// 启动页路由定义
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue')
  },
  // 404 错误页面
  {
    path: '/:catchAll(.*)*',
    component: () => import('@pages/ErrorNotFound.vue')
  }
]

export { routes }