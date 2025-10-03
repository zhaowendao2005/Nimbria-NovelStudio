<template>
  <div class="obsidian-app">
    <!-- 左侧窄导航栏 -->
    <div class="sidebar-left">
      <!-- 顶部汉堡菜单图标 -->
      <div class="menu-btn">
        <el-tooltip content="菜单" placement="right" :show-after="500">
          <button class="nav-icon-btn">
            <el-icon class="nav-icon"><Menu /></el-icon>
          </button>
        </el-tooltip>
      </div>
      
      <!-- 背景+边框容器 -->
      <div class="background-vertical-border">
        <!-- 主功能按钮组 -->
        <div class="button-group-top">
          <!-- 文件浏览器 -->
          <el-tooltip content="文件浏览器" placement="right" :show-after="500">
            <button 
              class="nav-icon-btn" 
              :class="{ active: activeTab === 'files' }"
              @click="activeTab = 'files'"
            >
              <el-icon class="nav-icon"><Folder /></el-icon>
            </button>
          </el-tooltip>
          
          <!-- 搜索 -->
          <el-tooltip content="搜索" placement="right" :show-after="500">
            <button 
              class="nav-icon-btn"
              :class="{ active: activeTab === 'search' }"
              @click="activeTab = 'search'"
            >
              <el-icon class="nav-icon"><Search /></el-icon>
            </button>
          </el-tooltip>
          
          <!-- 图形视图 -->
          <el-tooltip content="图形视图" placement="right" :show-after="500">
            <button 
              class="nav-icon-btn"
              :class="{ active: activeTab === 'graph' }"
              @click="activeTab = 'graph'"
            >
              <el-icon class="nav-icon"><Share /></el-icon>
            </button>
          </el-tooltip>
          
          <!-- 笔记本/日历 -->
          <el-tooltip content="笔记本" placement="right" :show-after="500">
            <button 
              class="nav-icon-btn"
              :class="{ active: activeTab === 'notebook' }"
              @click="activeTab = 'notebook'"
            >
              <el-icon class="nav-icon"><Calendar /></el-icon>
            </button>
          </el-tooltip>
          
          <!-- 标签 -->
          <el-tooltip content="标签" placement="right" :show-after="500">
            <button 
              class="nav-icon-btn"
              :class="{ active: activeTab === 'tags' }"
              @click="activeTab = 'tags'"
            >
              <el-icon class="nav-icon"><PriceTag /></el-icon>
            </button>
          </el-tooltip>
          
          <!-- 模板 -->
          <el-tooltip content="模板" placement="right" :show-after="500">
            <button 
              class="nav-icon-btn"
              :class="{ active: activeTab === 'templates' }"
              @click="activeTab = 'templates'"
            >
              <el-icon class="nav-icon"><Document /></el-icon>
            </button>
          </el-tooltip>
          
          <!-- 命令面板 -->
          <el-tooltip content="命令面板" placement="right" :show-after="500">
            <button 
              class="nav-icon-btn"
              :class="{ active: activeTab === 'command' }"
              @click="activeTab = 'command'"
            >
              <el-icon class="nav-icon"><Operation /></el-icon>
            </button>
          </el-tooltip>
        </div>
        
        <!-- 底部设置按钮 -->
        <div class="button-group-bottom">
          <el-tooltip content="设置" placement="right" :show-after="500">
            <button 
              class="nav-icon-btn" 
              @click="showSettings = !showSettings"
            >
              <el-icon class="nav-icon"><Setting /></el-icon>
            </button>
          </el-tooltip>
        </div>
      </div>
    </div>

    <!-- 主容器 -->
    <el-container class="main-container">
      <!-- 内容区域（移除了顶部栏，MarkdownTab内部已包含） -->
      <el-container class="content-container">
        <!-- 左侧面板（可折叠） -->
        <el-aside 
          v-show="showLeftPanel" 
          :width="leftPanelWidth + 'px'" 
          class="left-panel"
        >
          <!-- 顶部标题栏 -->
          <div class="sidebar-header">
            <span class="panel-title">文件浏览器</span>
            <el-button class="close-button" link @click="showLeftPanel = false">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          
          <!-- 工具栏 -->
          <div class="toolbox">
            <!-- 新建文本文件 -->
            <el-tooltip content="新建文本文件" placement="bottom" :show-after="500">
              <el-button class="toolbox-btn" link @click="createNewFile">
                <el-icon><DocumentAdd /></el-icon>
              </el-button>
            </el-tooltip>
            
            <!-- 新建文件夹 -->
            <el-tooltip content="新建文件夹" placement="bottom" :show-after="500">
              <el-button class="toolbox-btn" link @click="createNewFolder">
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
                  <el-dropdown-item command="name-desc">
                    文件名 (Z-A)
                    <el-icon v-if="sortType === 'name-desc'" class="check-icon"><Check /></el-icon>
                  </el-dropdown-item>
                  <el-dropdown-item command="modified-desc">
                    编辑时间（从新到旧）
                    <el-icon v-if="sortType === 'modified-desc'" class="check-icon"><Check /></el-icon>
                  </el-dropdown-item>
                  <el-dropdown-item command="modified-asc">
                    编辑时间（从旧到新）
                    <el-icon v-if="sortType === 'modified-asc'" class="check-icon"><Check /></el-icon>
                  </el-dropdown-item>
                  <el-dropdown-item command="created-desc">
                    创建时间（从新到旧）
                    <el-icon v-if="sortType === 'created-desc'" class="check-icon"><Check /></el-icon>
                  </el-dropdown-item>
                  <el-dropdown-item command="created-asc">
                    创建时间（从旧到新）
                    <el-icon v-if="sortType === 'created-asc'" class="check-icon"><Check /></el-icon>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            
            <!-- 自动展开/折叠 -->
            <el-tooltip 
              :content="isExpanded ? '折叠全部' : '展开全部'" 
              placement="bottom" 
              :show-after="500"
            >
              <el-button 
                class="toolbox-btn" 
                link 
                @click="toggleExpandAll"
              >
                <el-icon v-if="isExpanded"><FolderOpened /></el-icon>
                <el-icon v-else><Folder /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
          
          <!-- 文件树容器 -->
          <div class="tree-container">
            <el-tree
              ref="treeRef"
              :data="markdownStore.fileTree"
              :props="{ label: 'name', children: 'children' }"
              default-expand-all
              highlight-current
              class="file-tree"
              node-key="id"
              @node-click="handleNodeClick"
            >
              <template #default="{ node, data }">
                <span class="tree-node">
                  <el-icon v-if="data.isFolder" class="node-icon">
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

        <!-- 主编辑区：Markdown标签页 -->
        <el-main class="editor-main">
          <!-- 标签页系统 -->
          <el-tabs
            v-if="markdownStore.openTabs.length > 0"
            v-model="markdownStore.activeTabId"
            type="card"
            closable
            class="markdown-tabs"
            @tab-remove="handleTabRemove"
            @tab-click="handleTabClick"
          >
            <el-tab-pane
              v-for="tab in markdownStore.openTabs"
              :key="tab.id"
              :label="tab.fileName"
              :name="tab.id"
            >
              <MarkdownTab :tab-id="tab.id" />
            </el-tab-pane>
          </el-tabs>
          
          <!-- 无打开文件时的欢迎页 -->
          <div v-else class="welcome-container">
            <div class="welcome-content">
              <h1>欢迎使用 Markdown 编辑器</h1>
              <p>双击左侧文件树中的文件以打开</p>
              <div class="welcome-tips">
                <h3>快捷键提示：</h3>
                <ul>
                  <li><kbd>Ctrl/Cmd + S</kbd> - 保存当前文件</li>
                  <li><kbd>Ctrl/Cmd + W</kbd> - 关闭当前标签页</li>
                  <li><kbd>Ctrl/Cmd + E</kbd> - 切换编辑模式</li>
                </ul>
              </div>
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
import { ref, nextTick, onMounted } from 'vue'
import type { ElTree } from 'element-plus'
import { useMarkdownStore } from './stores'
import MarkdownTab from './components/MarkdownTab.vue'

// Markdown Store
const markdownStore = useMarkdownStore()

// 状态管理
const activeTab = ref('files')
const showSettings = ref(false)
const showLeftPanel = ref(true)
const showRightPanel = ref(true)
const leftPanelWidth = ref(280)
const rightPanelWidth = ref(280)

// 工具栏功能状态
const autoReveal = ref(false)
const sortType = ref('name-asc')
const isExpanded = ref(true) // 默认展开全部

// Tree 组件引用
const treeRef = ref<InstanceType<typeof ElTree>>()

// 初始化
onMounted(() => {
  // 初始化文件树（加载mock数据）
  markdownStore.initializeFileTree()
  
  // 可选：自动打开README
  setTimeout(() => {
    markdownStore.openFile('参考资料源/README.md')
  }, 100)
})

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

// 工具栏功能方法
const createNewFile = () => {
  console.log('创建新文件')
  // TODO: 实现创建新文件逻辑
}

const createNewFolder = () => {
  console.log('创建新文件夹')
  // TODO: 实现创建新文件夹逻辑
}

const toggleAutoReveal = () => {
  autoReveal.value = !autoReveal.value
  console.log('自动显示当前文件:', autoReveal.value)
  // TODO: 实现自动定位当前文件逻辑
}

const handleSortCommand = (command: string) => {
  sortType.value = command
  console.log('排序方式:', command)
  // TODO: 实现文件排序逻辑
}

const toggleExpandAll = () => {
  isExpanded.value = !isExpanded.value
  
  nextTick(() => {
    if (!treeRef.value) return
    
    // 获取所有节点
    const nodes = treeRef.value.store.nodesMap
    
    // 遍历所有节点，设置展开/折叠状态
    for (const key in nodes) {
      const node = nodes[key]
      // 只操作有子节点的节点（文件夹）
      if (node && node.childNodes && node.childNodes.length > 0) {
        node.expanded = isExpanded.value
      }
    }
    
    console.log('展开/折叠全部:', isExpanded.value)
  })
}

// ==================== 文件树事件处理 ====================

// 单击节点（选中并打开文件）
const handleNodeClick = (data: { name: string; isFolder: boolean; path: string }) => {
  console.log('节点点击:', data.name, 'isFolder:', data.isFolder, 'path:', data.path)
  
  // 只打开文件，不打开文件夹（文件夹只是展开/折叠）
  if (!data.isFolder) {
    console.log('打开文件:', data.path)
    markdownStore.openFile(data.path)
  }
}

// ==================== 标签页事件处理 ====================

// 关闭标签页
const handleTabRemove = (tabId: string) => {
  markdownStore.closeTab(tabId)
}

// 点击标签页
const handleTabClick = (tab: { paneName?: string }) => {
  if (tab.paneName) {
    markdownStore.switchTab(tab.paneName)
  }
}
</script>

