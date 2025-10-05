/**
 * Node.js 环境变量类型声明
 */
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
  }
}

/**
 * Nimbria Window API 类型声明
 * 
 * 注意：完整的 API 类型定义在 types/core/window.d.ts 中
 * 这里只是为了确保全局类型可用
 */
/// <reference types="./types/core/window" />
/// <reference types="./types/core/nimbria" />