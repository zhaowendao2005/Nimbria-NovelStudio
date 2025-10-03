import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve } from 'path'
import fg from 'fast-glob'

// 获取要构建的页面（通过环境变量）
const buildPage = process.env.BUILD_PAGE // 例如: 'example1' 或 'all'

// 动态查找所有页面入口
function getPageEntries() {
  const pages = fg.sync('src/pages/*/index.html', { cwd: __dirname })
  const entries: Record<string, string> = {}

  pages.forEach((page) => {
    const pageName = page.split('/')[2] // 提取页面名称

    // 如果指定了特定页面，只构建该页面
    if (buildPage && buildPage !== 'all' && pageName !== buildPage) {
      return
    }

    entries[pageName] = resolve(__dirname, page)
  })

  return entries
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    viteSingleFile({
      removeViteModuleLoader: true, // 移除Vite模块加载器
      useRecommendedBuildConfig: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: getPageEntries(),
      output: {
        // 确保每个页面独立打包
        manualChunks: undefined,
      },
    },
    cssCodeSplit: false, // 不分割CSS
    assetsInlineLimit: 100000000, // 内联所有资源（设置大限制）
    chunkSizeWarningLimit: 100000000, // 提高警告限制
    outDir: 'dist',
  },
})
