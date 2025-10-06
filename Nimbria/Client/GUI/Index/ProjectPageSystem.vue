<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { registerAllCommandPlugins } from '@utils/Plugins/commands'
import { registerAllPanelPlugins } from '@utils/Plugins/panels'

/**
 * ProjectPageSystem
 * 项目页系统入口
 * 职责：作为项目页的顶层容器，将渲染权交给router-view，并注册所有插件
 */

// 注册所有插件（命令和面板）
onMounted(() => {
  console.log('[ProjectPageSystem] Registering all plugins...')
  
  // 注册面板插件
  registerAllPanelPlugins()
  
  // 注册命令插件
  registerAllCommandPlugins()
  
  console.log('[ProjectPageSystem] All plugins registered successfully')
})
</script>

<style scoped>
/* 极简入口，无需额外样式 */
</style>
