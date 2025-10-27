/**
 * DemoPage 模块导出
 * 基于CustomPageManager的统一页面管理
 */

// TestPage 导出
export * from './TestPage'

// LlmTranslate 导出
export * from './LlmTranslate'

// VueFlowTest 导出
export * from './VueFlowTest'

// 页面注册Promise（用于等待注册完成）
let registrationPromise: Promise<void> | null = null

// 页面注册函数（延迟加载，避免循环依赖）
export function registerDemoPages(): Promise<void> {
  if (registrationPromise) {
    return registrationPromise
  }
  
  registrationPromise = import('../../Service/CustomPageManager')
    .then(({ CustomPageAPI }) => {
      console.log('[DemoPage] Starting to register pages...')
      
      CustomPageAPI.registerAll([
        {
          id: 'ui-test-page',
          name: 'UI/UX测试页面',
          title: 'UI/UX Test Page',
          description: '综合测试各种UI组件和交互效果',
          category: 'demo',
          icon: 'TestTube',
          tabType: 'testpage',
          component: () => import('./TestPage/TestPage.vue'),
          showInDrawer: true,
          tags: ['ui', 'test', 'component', 'demo']
        },
        {
          id: 'llm-translate-page',
          name: 'LLM批量翻译',
          title: 'LLM Batch Translation',
          description: '基于LLM的批量翻译工具，支持流式进度监控和批次管理',
          category: 'demo',
          icon: 'Promotion',
          tabType: 'llmtranslate',
          component: () => import('./LlmTranslate/LlmTranslatePage.vue'),
          showInDrawer: true,
          tags: ['llm', 'translate', 'batch', 'demo']
        },
        {
          id: 'vueflow-test-page',
          name: 'VueFlow 依赖测试',
          title: 'VueFlow Dependency Test',
          description: '阶段0测试：验证VueFlow依赖是否正确安装和工作',
          category: 'demo',
          icon: 'Connection',
          tabType: 'vueflowtest',
          component: () => import('./VueFlowTest/VueFlowTestPage.vue'),
          showInDrawer: true,
          tags: ['vueflow', 'workflow', 'test', 'stage0']
        }
        // 未来可以在这里添加更多Demo页面
      ])
      
      console.log('[DemoPage] Pages registered successfully')
      console.log('[DemoPage] Registered pages:', CustomPageAPI.getDrawerPages().map(p => p.id))
    })
    .catch(err => {
      console.error('[DemoPage] Failed to register pages:', err)
      registrationPromise = null // 失败后允许重试
      throw err
    })
  
  return registrationPromise
}

// 确保页面注册完成（返回Promise）
export function ensureRegistration(): Promise<void> {
  return registerDemoPages()
}

// 立即开始注册
ensureRegistration()

// 兼容性函数（保持旧API可用）
export async function getAllDemoPages() {
  const { CustomPageAPI } = await import('../../Service/CustomPageManager')
  return CustomPageAPI.getPagesByCategory('demo')
}

export async function getDemoPageByName(name: string) {
  const { CustomPageAPI } = await import('../../Service/CustomPageManager')
  return CustomPageAPI.getAvailablePages().find(page => page.name === name)
}

export async function getDemoPagesByCategory(category: string) {
  const { CustomPageAPI } = await import('../../Service/CustomPageManager')
  return CustomPageAPI.getPagesByCategory(category)
}
