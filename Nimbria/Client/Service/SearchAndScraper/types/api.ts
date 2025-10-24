/**
 * SearchAndScraper IPC API 类型
 */

import type { CookieData } from './session'

// IPC API 响应类型
export interface SearchScraperInitResponse {
  success: boolean
}

export interface SearchScraperCookiesResponse {
  cookies: CookieData[]
}

