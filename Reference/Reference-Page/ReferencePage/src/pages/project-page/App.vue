<template>
  <div class="obsidian-app">
    <!-- 左侧窄导航栏 -->
    <div class="sidebar-left">
      <div class="sidebar-actions">
        <el-tooltip content="文件浏览器" placement="right" :show-after="500">
          <el-button 
            class="sidebar-icon-btn" 
            :class="{ active: activeTab === 'files' }"
            @click="activeTab = 'files'"
          >
            <el-icon><Folder /></el-icon>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="搜索" placement="right" :show-after="500">
          <el-button 
            class="sidebar-icon-btn"
            :class="{ active: activeTab === 'search' }"
            @click="activeTab = 'search'"
          >
            <el-icon><Search /></el-icon>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="图形视图" placement="right" :show-after="500">
          <el-button 
            class="sidebar-icon-btn"
            :class="{ active: activeTab === 'graph' }"
            @click="activeTab = 'graph'"
          >
            <el-icon><Share /></el-icon>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="日历" placement="right" :show-after="500">
          <el-button 
            class="sidebar-icon-btn"
            :class="{ active: activeTab === 'calendar' }"
            @click="activeTab = 'calendar'"
          >
            <el-icon><Calendar /></el-icon>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="标签" placement="right" :show-after="500">
          <el-button 
            class="sidebar-icon-btn"
            :class="{ active: activeTab === 'tags' }"
            @click="activeTab = 'tags'"
          >
            <el-icon><PriceTag /></el-icon>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="模板" placement="right" :show-after="500">
          <el-button 
            class="sidebar-icon-btn"
            :class="{ active: activeTab === 'templates' }"
            @click="activeTab = 'templates'"
          >
            <el-icon><Document /></el-icon>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="命令面板" placement="right" :show-after="500">
          <el-button 
            class="sidebar-icon-btn"
            :class="{ active: activeTab === 'command' }"
            @click="activeTab = 'command'"
          >
            <el-icon><Operation /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
      
      <div class="sidebar-bottom">
        <el-tooltip content="帮助" placement="right" :show-after="500">
          <el-button class="sidebar-icon-btn">
            <el-icon><QuestionFilled /></el-icon>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="设置" placement="right" :show-after="500">
          <el-button class="sidebar-icon-btn" @click="showSettings = !showSettings">
            <el-icon><Setting /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 主容器 -->
    <el-container class="main-container">
      <!-- 顶部栏 -->
      <el-header class="top-header">
        <div class="header-left">
          <el-button class="header-btn" link>
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <el-button class="header-btn" link>
            <el-icon><ArrowRight /></el-icon>
          </el-button>
          
          <div class="file-path">
            <el-icon class="path-icon"><Folder /></el-icon>
            <span class="path-text">参考资料源</span>
          </div>
        </div>
        
        <div class="header-center">
          <el-button class="header-btn" link>
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button class="header-btn" link>
            <el-icon><View /></el-icon>
          </el-button>
          <el-button class="header-btn" link>
            <el-icon><Sort /></el-icon>
          </el-button>
          <el-button class="header-btn" link>
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
        
        <div class="header-right">
          <el-button class="header-btn" link>
            <el-icon><More /></el-icon>
          </el-button>
        </div>
      </el-header>

      <!-- 内容区域 -->
      <el-container class="content-container">
        <!-- 左侧面板（可折叠） -->
        <el-aside 
          v-show="showLeftPanel" 
          :width="leftPanelWidth + 'px'" 
          class="left-panel"
        >
          <div class="panel-header">
            <span class="panel-title">文件浏览器</span>
            <el-button class="panel-close-btn" link @click="showLeftPanel = false">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          
          <div class="panel-content">
            <el-tree
              :data="fileTreeData"
              :props="{ label: 'name', children: 'children' }"
              default-expand-all
              highlight-current
              class="file-tree"
            >
              <template #default="{ node, data }">
                <span class="tree-node">
                  <el-icon v-if="data.type === 'folder'" class="node-icon">
                    <Folder />
                  </el-icon>
                  <el-icon v-else class="node-icon">
                    <Document />
                  </el-icon>
                  <span class="node-label">{{ node.label }}</span>
                </span>
              </template>
            </el-tree>
          </div>
        </el-aside>

        <!-- 分隔器 -->
        <div 
          v-show="showLeftPanel"
          class="resizer" 
          @mousedown="startResize"
        />

        <!-- 主编辑区 -->
        <el-main class="editor-main">
          <div class="editor-container">
            <div class="editor-title">
              <h1>新标签页</h1>
            </div>
            <div class="editor-content">
              <p class="welcome-text">欢迎使用 Obsidian 风格编辑器</p>
            </div>
          </div>
        </el-main>

        <!-- 右侧面板（大纲/反向链接） -->
        <div 
          v-show="showRightPanel"
          class="resizer-right" 
          @mousedown="startResizeRight"
        />
        
        <el-aside 
          v-show="showRightPanel" 
          :width="rightPanelWidth + 'px'" 
          class="right-panel"
        >
          <div class="panel-header">
            <span class="panel-title">大纲</span>
            <el-button class="panel-close-btn" link @click="showRightPanel = false">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          
          <div class="panel-content">
            <div class="outline-empty">
              <p>当前文档没有标题</p>
            </div>
          </div>
        </el-aside>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 状态管理
const activeTab = ref('files')
const showSettings = ref(false)
const showLeftPanel = ref(true)
const showRightPanel = ref(true)
const leftPanelWidth = ref(280)
const rightPanelWidth = ref(280)

// 文件树数据
const fileTreeData = ref([
  {
    name: '参考资料源',
    type: 'folder',
    children: [
      { name: '笔记1.md', type: 'file' },
      { name: '笔记2.md', type: 'file' },
      {
        name: '文件夹1',
        type: 'folder',
        children: [
          { name: '子笔记1.md', type: 'file' },
          { name: '子笔记2.md', type: 'file' },
        ],
      },
    ],
  },
])

// 左侧面板拖拽调整大小
let isResizing = false
const startResize = (e: MouseEvent) => {
  isResizing = true
  document.addEventListener('mousemove', resize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

const resize = (e: MouseEvent) => {
  if (!isResizing) return
  const newWidth = e.clientX - 48 // 减去左侧导航栏宽度
  if (newWidth >= 200 && newWidth <= 500) {
    leftPanelWidth.value = newWidth
  }
}

const stopResize = () => {
  isResizing = false
  document.removeEventListener('mousemove', resize)
  document.removeEventListener('mouseup', stopResize)
}

// 右侧面板拖拽调整大小
let isResizingRight = false
const startResizeRight = (e: MouseEvent) => {
  isResizingRight = true
  document.addEventListener('mousemove', resizeRight)
  document.addEventListener('mouseup', stopResizeRight)
  e.preventDefault()
}

const resizeRight = (e: MouseEvent) => {
  if (!isResizingRight) return
  const newWidth = window.innerWidth - e.clientX
  if (newWidth >= 200 && newWidth <= 500) {
    rightPanelWidth.value = newWidth
  }
}

const stopResizeRight = () => {
  isResizingRight = false
  document.removeEventListener('mousemove', resizeRight)
  document.removeEventListener('mouseup', stopResizeRight)
}
</script>

