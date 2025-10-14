<template>
  <div class="virtual-file-tree">
    <!-- 工具栏 -->
    <div class="tree-toolbar">
      <el-button-group size="small">
        <el-button @click="toggleExpandAll" :icon="expandAllState ? FolderOpened : Folder" />
        <el-button @click="refreshTree" :icon="Refresh" />
      </el-button-group>
      
      <!-- 搜索框 -->
      <el-input
        v-model="searchQuery"
        placeholder="搜索文件..."
        size="small"
        :prefix-icon="Search"
        clearable
        class="search-input"
        @input="handleSearch"
      />
    </div>

    <!-- 虚拟滚动列表 -->
    <div class="tree-content" ref="treeContainer">
      <RecycleScroller
        class="scroller"
        :items="visibleItems"
        :item-size="32"
        key-field="id"
        v-slot="{ item, index }"
      >
        <div
          :class="[
            'tree-item',
            {
              'is-selected': selectedNodeId === item.id,
              'is-folder': item.isFolder,
              'is-temp': item.isTemporary
            }
          ]"
          :style="{ paddingLeft: `${item.level * 20 + 8}px` }"
          @click="handleItemClick(item)"
          @contextmenu="handleContextMenu(item, $event)"
        >
          <!-- 展开/折叠按钮 -->
          <div
            v-if="item.isFolder"
            class="expand-button"
            @click.stop="toggleExpand(item)"
          >
            <el-icon :class="{ 'is-expanded': item.expanded }">
              <ArrowRight />
            </el-icon>
          </div>
          <div v-else class="expand-placeholder"></div>

          <!-- 文件/文件夹图标 -->
          <el-icon class="item-icon">
            <Folder v-if="item.isFolder && !item.expanded" />
            <FolderOpened v-else-if="item.isFolder && item.expanded" />
            <Document v-else />
          </el-icon>

          <!-- 文件名 -->
          <span class="item-name">{{ item.name }}</span>

          <!-- 大文件标识 -->
          <el-tag v-if="item.isLargeFile" size="small" type="warning" class="large-file-tag">
            大文件
          </el-tag>

          <!-- 临时节点输入框 -->
          <el-input
            v-if="item.isTemporary"
            ref="tempInputRef"
            v-model="tempInputValue"
            size="small"
            class="temp-input"
            @keydown.enter.prevent="confirmCreation"
            @keydown.esc.prevent="cancelCreation"
            @blur="handleInputBlur"
          />
        </div>
      </RecycleScroller>
    </div>

    <!-- 右键菜单 -->
    <el-dropdown
      ref="contextMenuRef"
      trigger="contextmenu"
      :teleported="false"
      @command="handleContextCommand"
    >
      <div></div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="newFile" :icon="DocumentAdd">
            新建文件
          </el-dropdown-item>
          <el-dropdown-item command="newFolder" :icon="FolderAdd">
            新建文件夹
          </el-dropdown-item>
          <el-dropdown-item divided command="refresh" :icon="Refresh">
            刷新
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import {
  Folder,
  FolderOpened,
  Document,
  ArrowRight,
  Search,
  Refresh,
  DocumentAdd,
  FolderAdd
} from '@element-plus/icons-vue'
import { useMarkdownStore } from '@stores/projectPage'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'
import type { MarkdownFile } from '@stores/projectPage/Markdown/types'

/**
 * VirtualFileTree
 * 虚拟化文件树组件，支持大量文件的高性能渲染
 */

const markdownStore = useMarkdownStore()
const paneLayoutStore = usePaneLayoutStore()

// 组件引用
const treeContainer = ref<HTMLElement>()
const contextMenuRef = ref()
const tempInputRef = ref()

// 状态
const expandAllState = ref(true)
const searchQuery = ref('')
const selectedNodeId = ref<string | null>(null)
const expandedNodes = ref(new Set<string>())

// 临时节点状态
const tempInputValue = ref('')
const creatingNodeType = ref<'file' | 'folder' | null>(null)
const creatingParentId = ref<string | null>(null)

// 扁平化的树节点列表（用于虚拟滚动）
interface FlatTreeItem extends MarkdownFile {
  level: number
  expanded?: boolean
  isLargeFile?: boolean
  visible?: boolean
}

/**
 * 🔥 将树形结构扁平化为列表
 */
const flattenTree = (nodes: MarkdownFile[], level = 0, parentExpanded = true): FlatTreeItem[] => {
  const result: FlatTreeItem[] = []
  
  for (const node of nodes) {
    const isExpanded = expandedNodes.value.has(node.id)
    const isVisible = parentExpanded && (
      !searchQuery.value || 
      node.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    
    const flatItem: FlatTreeItem = {
      ...node,
      level,
      expanded: isExpanded,
      visible: isVisible,
      isLargeFile: node.metadata && node.metadata.size > 1024 * 1024 // 1MB
    }
    
    if (isVisible) {
      result.push(flatItem)
    }
    
    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      const childItems = flattenTree(
        node.children, 
        level + 1, 
        isVisible && isExpanded
      )
      result.push(...childItems)
    }
  }
  
  return result
}

/**
 * 可见的树节点列表
 */
const visibleItems = computed(() => {
  const flattened = flattenTree(markdownStore.fileTree)
  return flattened.filter(item => item.visible !== false)
})

/**
 * 处理项目点击
 */
const handleItemClick = async (item: FlatTreeItem) => {
  selectedNodeId.value = item.id
  markdownStore.selectNode(item)
  
  if (item.isFolder) {
    toggleExpand(item)
  } else {
    // 打开文件
    try {
      const tab = await markdownStore.openFile(item.path)
      
      if (!paneLayoutStore.focusedPane) {
        paneLayoutStore.resetToDefaultLayout()
      }
      
      if (tab && paneLayoutStore.focusedPane) {
        paneLayoutStore.openTabInPane(paneLayoutStore.focusedPane.id, tab.id)
      }
    } catch (error) {
      console.error('[VirtualFileTree] Failed to open file:', error)
    }
  }
}

/**
 * 切换节点展开/折叠
 */
const toggleExpand = (item: FlatTreeItem) => {
  if (!item.isFolder) return
  
  if (expandedNodes.value.has(item.id)) {
    expandedNodes.value.delete(item.id)
  } else {
    expandedNodes.value.add(item.id)
  }
}

/**
 * 全部展开/折叠
 */
const toggleExpandAll = () => {
  expandAllState.value = !expandAllState.value
  
  if (expandAllState.value) {
    // 展开所有文件夹
    const expandAll = (nodes: MarkdownFile[]) => {
      nodes.forEach(node => {
        if (node.isFolder) {
          expandedNodes.value.add(node.id)
          if (node.children) {
            expandAll(node.children)
          }
        }
      })
    }
    expandAll(markdownStore.fileTree)
  } else {
    // 折叠所有文件夹
    expandedNodes.value.clear()
  }
}

/**
 * 刷新文件树
 */
const refreshTree = async () => {
  await markdownStore.initializeFileTree()
}

/**
 * 处理搜索
 */
const handleSearch = (query: string) => {
  // 搜索时自动展开匹配的节点路径
  if (query) {
    const expandMatchingPaths = (nodes: MarkdownFile[]) => {
      nodes.forEach(node => {
        if (node.name.toLowerCase().includes(query.toLowerCase())) {
          // 展开到此节点的路径
          let current = node
          while (current) {
            if (current.isFolder) {
              expandedNodes.value.add(current.id)
            }
            // 这里需要找到父节点，简化实现
            break
          }
        }
        if (node.children) {
          expandMatchingPaths(node.children)
        }
      })
    }
    expandMatchingPaths(markdownStore.fileTree)
  }
}

/**
 * 处理右键菜单
 */
const handleContextMenu = (item: FlatTreeItem, event: MouseEvent) => {
  event.preventDefault()
  selectedNodeId.value = item.id
  markdownStore.selectNode(item)
  
  // 显示右键菜单
  nextTick(() => {
    contextMenuRef.value?.handleOpen()
  })
}

/**
 * 处理右键菜单命令
 */
const handleContextCommand = (command: string) => {
  switch (command) {
    case 'newFile':
      startCreation('file')
      break
    case 'newFolder':
      startCreation('folder')
      break
    case 'refresh':
      refreshTree()
      break
  }
}

/**
 * 开始创建文件/文件夹
 */
const startCreation = (type: 'file' | 'folder') => {
  creatingNodeType.value = type
  creatingParentId.value = selectedNodeId.value
  markdownStore.startCreation(type)
}

/**
 * 确认创建
 */
const confirmCreation = () => {
  markdownStore.confirmCreation()
  resetCreationState()
}

/**
 * 取消创建
 */
const cancelCreation = () => {
  markdownStore.cancelCreation()
  resetCreationState()
}

/**
 * 重置创建状态
 */
const resetCreationState = () => {
  creatingNodeType.value = null
  creatingParentId.value = null
  tempInputValue.value = ''
}

/**
 * 处理输入框失焦
 */
const handleInputBlur = () => {
  setTimeout(() => {
    if (creatingNodeType.value) {
      cancelCreation()
    }
  }, 200)
}

/**
 * 监听文件树变化，自动展开根节点
 */
watch(() => markdownStore.fileTree, (newTree) => {
  if (newTree.length > 0 && expandAllState.value) {
    newTree.forEach(node => {
      if (node.isFolder) {
        expandedNodes.value.add(node.id)
      }
    })
  }
}, { immediate: true })

/**
 * 🔥 监听文件变更事件
 */
onMounted(() => {
  // 监听 Electron 的文件变更事件
  if (window.nimbria?.fileWatcher?.onFileChange) {
    window.nimbria.fileWatcher.onFileChange((event: any) => {
      console.log('[VirtualFileTree] File change detected:', event)
      // 延迟刷新，避免频繁更新
      setTimeout(() => {
        refreshTree()
      }, 500)
    })
  }
})

onUnmounted(() => {
  // 清理监听器
  if (window.nimbria?.fileWatcher?.removeFileChangeListener) {
    window.nimbria.fileWatcher.removeFileChangeListener()
  }
})
</script>

<style scoped>
.virtual-file-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--obsidian-bg-primary);
}

.tree-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid var(--obsidian-border);
}

.search-input {
  flex: 1;
  max-width: 200px;
}

.tree-content {
  flex: 1;
  overflow: hidden;
}

.scroller {
  height: 100%;
}

.tree-item {
  display: flex;
  align-items: center;
  height: 32px;
  padding-right: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.tree-item:hover {
  background: var(--obsidian-hover-bg);
}

.tree-item.is-selected {
  background: var(--obsidian-accent-bg);
  color: var(--obsidian-accent-text);
}

.expand-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 4px;
  cursor: pointer;
  border-radius: 2px;
}

.expand-button:hover {
  background: var(--obsidian-hover-bg);
}

.expand-button .el-icon {
  font-size: 12px;
  transition: transform 0.2s;
}

.expand-button .el-icon.is-expanded {
  transform: rotate(90deg);
}

.expand-placeholder {
  width: 20px;
  height: 16px;
}

.item-icon {
  font-size: 16px;
  margin-right: 6px;
  color: var(--obsidian-text-secondary);
  flex-shrink: 0;
}

.item-name {
  flex: 1;
  font-size: 13px;
  color: var(--obsidian-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.large-file-tag {
  margin-left: 8px;
  font-size: 10px;
  height: 18px;
  line-height: 16px;
}

.temp-input {
  flex: 1;
  margin-left: 8px;
}

.temp-input :deep(.el-input__inner) {
  height: 24px;
  font-size: 13px;
  background: var(--obsidian-bg-primary);
  border: 1px solid var(--obsidian-accent);
}

/* 虚拟滚动样式 */
:deep(.vue-recycle-scroller__item-wrapper) {
  overflow: visible;
}

:deep(.vue-recycle-scroller__item-view) {
  overflow: visible;
}
</style>
