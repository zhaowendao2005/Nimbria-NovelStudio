import { boot } from 'quasar/wrappers'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

/**
 * Element Plus 启动配置
 * 用于ProjectPage系统，与Quasar和谐共存
 */
export default boot(({ app }) => {
  // 注册 Element Plus
  app.use(ElementPlus)
  
  // 注册所有 Element Plus 图标组件
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }
})
