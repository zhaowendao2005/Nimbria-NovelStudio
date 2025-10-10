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
              // 左栏：Shell容器（导航 + 文件树）
              left: () => import('@pages/ProjectPage.Shell.vue'),
              // 中栏：主面板容器（包含右侧栏）
              center: () => import('@pages/ProjectPage.MainPanel.vue')
              // 右栏已移除，由RightSidebar插件式系统接管
            }
          }
        ]
      }
    ]
  },

  // 🔥 新增：Vite 测试路由（完整的项目页面布局）
  {
    path: '/vite-test',
    component: () => import('@layouts/ProjectMainLayout.vue'),
    children: [
      {
        path: '',
        name: 'ViteTest',
        components: {
          // 左栏：Shell容器（导航 + 文件树）
          left: () => import('@pages/ProjectPage.Shell.vue'),
          // 中栏：主面板容器（包含右侧栏）
          center: () => import('@pages/ProjectPage.MainPanel.vue')
        },
        meta: {
          title: 'Vite 测试环境',
          requiresAuth: false
        }
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