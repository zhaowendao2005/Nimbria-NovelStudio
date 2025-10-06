/**
 * 命令插件统一注册
 */

import { registerViewCommands } from './view-commands.plugin'

/**
 * 注册所有命令插件
 */
export function registerAllCommandPlugins() {
  registerViewCommands()
  // ... 在此注册其他命令插件
}

