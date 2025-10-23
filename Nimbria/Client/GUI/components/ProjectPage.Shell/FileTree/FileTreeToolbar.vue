<template>
  <div class="file-tree-header">
    <!-- 顶部标题栏 -->
    <div class="sidebar-header">
      <span class="panel-title">文件浏览器</span>
      <el-button class="close-button" link @click="handleClose">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>
    
    <!-- 工具栏 -->
    <div class="toolbox">
      <!-- 新建文本文件 -->
      <el-tooltip content="新建文本文件" placement="bottom" :show-after="500">
        <el-button class="toolbox-btn" link @click="handleNewFile">
          <el-icon><DocumentAdd /></el-icon>
        </el-button>
      </el-tooltip>
      
      <!-- 新建文件夹 -->
      <el-tooltip content="新建文件夹" placement="bottom" :show-after="500">
        <el-button class="toolbox-btn" link @click="handleNewFolder">
          <el-icon><FolderAdd /></el-icon>
        </el-button>
      </el-tooltip>
      
      <!-- 自动显示当前文件 -->
      <el-tooltip content="自动显示当前文件" placement="bottom" :show-after="500">
        <el-button 
          class="toolbox-btn" 
          :class="{ active: autoReveal }"
          link 
          @click="toggleAutoReveal"
        >
          <el-icon><Aim /></el-icon>
        </el-button>
      </el-tooltip>
      
      <!-- 排序菜单 -->
      <el-dropdown trigger="click" @command="handleSortCommand">
        <el-button class="toolbox-btn" link>
          <el-icon><Sort /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="name-asc" :class="{ active: sortType === 'name-asc' }">
              文件名 (A-Z)
              <el-icon v-if="sortType === 'name-asc'" class="check-icon"><Check /></el-icon>
            </el-dropdown-item>
            <el-dropdown-item command="name-desc" :class="{ active: sortType === 'name-desc' }">
              文件名 (Z-A)
              <el-icon v-if="sortType === 'name-desc'" class="check-icon"><Check /></el-icon>
            </el-dropdown-item>
            <el-dropdown-item command="modified-desc" :class="{ active: sortType === 'modified-desc' }">
              编辑时间（从新到旧）
              <el-icon v-if="sortType === 'modified-desc'" class="check-icon"><Check /></el-icon>
            </el-dropdown-item>
            <el-dropdown-item command="modified-asc" :class="{ active: sortType === 'modified-asc' }">
              编辑时间（从旧到新）
              <el-icon v-if="sortType === 'modified-asc'" class="check-icon"><Check /></el-icon>
            </el-dropdown-item>
            <el-dropdown-item command="created-desc" :class="{ active: sortType === 'created-desc' }">
              创建时间（从新到旧）
              <el-icon v-if="sortType === 'created-desc'" class="check-icon"><Check /></el-icon>
            </el-dropdown-item>
            <el-dropdown-item command="created-asc" :class="{ active: sortType === 'created-asc' }">
              创建时间（从旧到新）
              <el-icon v-if="sortType === 'created-asc'" class="check-icon"><Check /></el-icon>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      
      <!-- 展开/折叠全部 -->
      <el-tooltip 
        :content="isExpanded ? '折叠全部' : '展开全部'" 
        placement="bottom" 
        :show-after="500"
      >
        <el-button class="toolbox-btn" link @click="toggleExpandAll">
          <el-icon v-if="isExpanded"><FolderOpened /></el-icon>
          <el-icon v-else><Folder /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import { 
  DocumentAdd, 
  FolderAdd, 
  Close,
  Aim,
  Sort,
  Check,
  FolderOpened,
  Folder
} from '@element-plus/icons-vue'
import { useMarkdownStore } from '@stores/projectPage'
import { useLeftSidebarStore } from '@stores/projectPage/leftSidebar'

/**
 * FileTreeToolbar
 * 文件树工具栏（完整版）
 * 包含：标题栏、关闭按钮、5个工具按钮
 */

const markdownStore = useMarkdownStore()
const leftSidebarStore = useLeftSidebarStore()

// ==================== 工具栏状态 ====================
const autoReveal = ref(false)
const sortType = ref('name-asc')

// 注入父组件提供的展开状态
const expandAllState = inject<{ value: boolean }>('expandAllState', { value: true })
const isExpanded = computed(() => expandAllState.value)

// ==================== 关闭面板 ====================
const handleClose = () => {
  console.log('关闭左侧面板')
  leftSidebarStore.hideContent()
}

// ==================== 新建文件/文件夹 ====================
const handleNewFile = () => {
  markdownStore.startCreation('file')
}

const handleNewFolder = () => {
  markdownStore.startCreation('folder')
}

// ==================== 自动显示当前文件 ====================
const toggleAutoReveal = () => {
  autoReveal.value = !autoReveal.value
  console.log('自动显示当前文件:', autoReveal.value)
  // TODO: 实现自动定位当前文件逻辑
}

// ==================== 排序 ====================
const handleSortCommand = (command: string) => {
  sortType.value = command
  console.log('排序方式:', command)
  // TODO: 实现文件排序逻辑
}

// ==================== 展开/折叠全部 ====================
const toggleExpandAll = () => {
  // 切换展开状态（修改注入的响应式对象）
  expandAllState.value = !expandAllState.value
  console.log('展开/折叠全部:', expandAllState.value)
}
</script>

<style scoped>
/* ==================== 容器 ==================== */
.file-tree-header {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  background: var(--obsidian-bg-secondary);
}

/* ==================== 标题栏 ==================== */
.sidebar-header {
  align-self: stretch;
  position: relative;
  border-bottom: 1px solid var(--obsidian-border);
  box-sizing: border-box;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  
  .panel-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--obsidian-text-primary);
    font-family: 'Segoe UI', sans-serif;
  }
  
  .close-button {
    width: 22px !important;
    height: 22px !important;
    min-width: 22px !important;
    padding: 0 !important;
    border-radius: 4px !important;
    color: var(--obsidian-text-secondary) !important;
    
    .el-icon {
      font-size: 14px;
    }
    
    &:hover {
      background-color: var(--obsidian-hover-bg) !important;
      color: var(--obsidian-text-primary) !important;
    }
  }
}

/* ==================== 工具栏 ==================== */
.toolbox {
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 0;
  flex-shrink: 0;
  
  .toolbox-btn {
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
    padding: 0 !important;
    border-radius: 4px !important;
    background-color: transparent !important;
    color: var(--obsidian-text-secondary) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: all 0.15s ease;
    
    .el-icon {
      font-size: 16px;
    }
    
    &:hover {
      background-color: var(--obsidian-hover-bg) !important;
      color: var(--obsidian-text-primary) !important;
    }
    
    /* 激活状态（用于自动显示当前文件按钮） */
    &.active {
      background-color: var(--obsidian-hover-bg) !important;
      color: var(--obsidian-accent) !important;
    }
  }
}

/* ==================== 排序下拉菜单 ==================== */
:deep(.el-dropdown-menu) {
  .el-dropdown-menu__item {
    position: relative;
    padding: 8px 32px 8px 16px;
    font-size: 13px;
    color: var(--obsidian-text-primary);
    
    &:hover {
      background-color: var(--obsidian-hover-bg);
    }
    
    &.active {
      color: var(--obsidian-accent);
    }
    
    .check-icon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14px;
      color: var(--obsidian-accent);
    }
  }
}
</style>
