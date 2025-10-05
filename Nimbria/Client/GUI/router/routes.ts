import type { RouteRecordRaw } from 'vue-router'

/**
 * Nimbria路由配置
 * - /: 主窗口（HomeDashboard）
 * - /project: 项目页（Shell + MainPanel三栏布局）
 */
const routes: RouteRecordRaw[] = [
  // 主窗口路由
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@pages/HomeDashboardPage.vue')
      }
    ]
  },
  
  // ⭐ 新增：项目页路由（Shell设计 + 命名视图）
  {
    path: '/project',
    component: () => import('@index/ProjectPageSystem.vue'),
    children: [
      {
        path: '',
        component: () => import('@layouts/ProjectMainLayout.vue'),
        children: [
          {
            path: '',
            name: 'project-workspace',
            components: {
              // 左栏：Shell容器（type="left"）
              left: () => import('@pages/ProjectPage.Shell.vue'),
              // 中栏：主面板容器
              center: () => import('@pages/ProjectPage.MainPanel.vue'),
              // 右栏：Shell容器（type="right"）
              right: () => import('@pages/ProjectPage.Shell.vue')
            },
            props: {
              left: { type: 'left' },
              center: {},
              right: { type: 'right' }
            }
          }
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