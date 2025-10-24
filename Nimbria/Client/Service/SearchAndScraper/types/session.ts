/**
 * SearchAndScraper Session 和 Cookie 类型
 */

// Cookie 数据
export interface CookieData {
  name: string
  value: string
  domain: string | undefined
  path: string | undefined
  expirationDate: number | undefined
}

