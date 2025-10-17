/**
 * LlmChat 页面注册模块
 * 将 LLM 对话注册到 CustomPageManager
 */

let registrationPromise: Promise<void> | null = null

export function registerLlmChatPages(): Promise<void> {
  if (registrationPromise) {
    return registrationPromise
  }
  
  registrationPromise = import('../../../../Service/CustomPageManager')
    .then(({ CustomPageAPI }) => {
      console.log('[LlmChat] Starting to register pages...')
      
      CustomPageAPI.registerAll([
        {
          id: 'llmchat-conversation',
          name: 'LLM 对话',
          title: 'AI 对话',
          description: 'LLM 智能对话界面',
          category: 'tool',
          icon: 'ChatDotRound',
          tabType: 'llmchat',  // 🔥 关键：定义类型
          component: () => import('./LlmChatPage.vue'),
          showInDrawer: true,   // 在抽屉中显示
          showInNavbar: true,   // 在导航栏显示
          showInMenu: true,     // 在菜单中显示
          singleton: false,     // 🔥 允许多实例（支持拆分）
          closable: true,       // 允许关闭
          tags: ['llm', 'chat', 'ai', 'conversation']
        }
      ])
      
      console.log('[LlmChat] Pages registered successfully')
    })
    .catch(err => {
      console.error('[LlmChat] Failed to register pages:', err)
      registrationPromise = null
      throw err
    })
  
  return registrationPromise
}

export function ensureLlmChatRegistration(): Promise<void> {
  return registerLlmChatPages()
}

// 立即开始注册
ensureLlmChatRegistration()

