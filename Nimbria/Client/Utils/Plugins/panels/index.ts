/**
 * 面板插件统一注册
 */

import { registerOutlinePanel } from './outline-panel.plugin'

/**
 * 注册所有面板插件
 */
export function registerAllPanelPlugins() {
  registerOutlinePanel()
  // ... 在此注册其他面板插件
}

