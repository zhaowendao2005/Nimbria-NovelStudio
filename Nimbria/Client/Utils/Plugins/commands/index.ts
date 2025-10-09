/**
 * 命令插件统一注册
 */

import { registerViewCommands } from './view-commands.plugin'
import { registerMarkdownOutlineCommands } from './markdown-outline-commands.plugin'

/**
 * 注册所有命令插件
 */
export function registerAllCommandPlugins() {
  // 通用视图命令
  registerViewCommands()
  
  // Markdown 大纲命令
  registerMarkdownOutlineCommands()
  
  // ... 在此注册其他命令插件
}

