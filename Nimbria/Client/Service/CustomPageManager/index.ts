/**
 * CustomPageManager 通用页面管理系统
 * 统一导出模块
 */

import { CustomPageAPI } from './CustomPageAPI'
import { pageRegistry } from './PageRegistry'
import { customPageManager } from './CustomPageManager'

export { CustomPageAPI, pageRegistry, customPageManager }
export type * from './types'

export default CustomPageAPI
