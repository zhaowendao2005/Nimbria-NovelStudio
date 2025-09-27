import type { RouteRecordRaw } from 'vue-router'

// 抽象路由定义
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@index/HomeSystem.vue'),
    children: [
      {
        path: '',
        component: () => import('layouts/MainLayout.vue'),
        children: [
          { path: '', component: () => import('@pages/HomeDashboardPage.vue') },
          { path: 'module-a', component: () => import('@pages/ModuleAPage.vue') }
        ]
      }
    ]
  },
  // 404 错误页面
  {
    path: '/:catchAll(.*)*',
    component: () => import('@pages/ErrorNotFound.vue')
  }
]

export { routes }