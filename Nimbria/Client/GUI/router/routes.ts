import type { RouteRecordRaw } from 'vue-router'

// 抽象路由定义
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('@pages/IndexPage.vue') }
    ]
  },
  // 抽象业务模块路由
  {
    path: '/module-a',
    component: () => import('@pages/ModuleAPage.vue')
  },
  // 404 错误页面
  {
    path: '/:catchAll(.*)*',
    component: () => import('@pages/ErrorNotFound.vue')
  }
]

export { routes }