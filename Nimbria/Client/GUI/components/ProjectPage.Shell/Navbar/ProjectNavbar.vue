<template>
  <div class="project-navbar">
    <!-- 文件浏览器图标 -->
    <el-tooltip content="文件浏览器" placement="right" :show-after="500">
      <button 
        class="nav-icon-btn active"
        @click="handleClick('files')"
      >
        <el-icon class="nav-icon"><Folder /></el-icon>
      </button>
    </el-tooltip>
    
    <!-- 搜索图标 -->
    <el-tooltip content="搜索" placement="right" :show-after="500">
      <button 
        class="nav-icon-btn"
        @click="handleClick('search')"
      >
        <el-icon class="nav-icon"><Search /></el-icon>
      </button>
    </el-tooltip>
    
    <!-- 笔记本图标 -->
    <el-tooltip content="笔记本" placement="right" :show-after="500">
      <button 
        class="nav-icon-btn"
        @click="handleClick('notebook')"
      >
        <el-icon class="nav-icon"><Calendar /></el-icon>
      </button>
    </el-tooltip>
    
    <!-- 底部设置按钮 -->
    <div class="navbar-bottom">
      <el-tooltip content="设置" placement="right" :show-after="500">
        <button 
          class="nav-icon-btn"
          @click="handleClick('settings')"
        >
          <el-icon class="nav-icon"><Setting /></el-icon>
        </button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Folder, Search, Calendar, Setting } from '@element-plus/icons-vue'

/**
 * ProjectNavbar
 * 左侧窄导航栏（48px）
 * TODO: 扩展功能 - 添加活动状态切换、更多导航项
 */

const handleClick = (type: string) => {
  console.log('Navbar clicked:', type)
  // TODO: 实现导航逻辑
}
</script>

<style scoped>
.project-navbar {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 8px;
}

.nav-icon-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--obsidian-text-secondary);
}

.nav-icon-btn:hover {
  background: var(--obsidian-hover-bg);
  color: var(--obsidian-text-primary);
}

.nav-icon-btn.active {
  background: var(--obsidian-accent);
  color: #ffffff;
}

.nav-icon {
  font-size: 18px;
}

.navbar-bottom {
  margin-top: auto;
}
</style>
