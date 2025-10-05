/**
 * Nimbria Electron API 类型声明
 * 在渲染进程中可以通过 window.nimbria 访问这些API
 */

import type { NimbriaWindowAPI } from './window'

declare global {
  interface Window {
    nimbria: NimbriaWindowAPI;
  }
}

export {};
