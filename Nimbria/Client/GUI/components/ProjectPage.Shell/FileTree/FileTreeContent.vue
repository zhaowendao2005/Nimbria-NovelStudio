<template>
  <div class="file-tree-content">
    <el-tree
      ref="treeRef"
      :data="fileTree"
      :props="treeProps"
      node-key="id"
      :expand-on-click-node="false"
      default-expand-all
      highlight-current
      @node-click="handleNodeClick"
      @current-change="handleCurrentChange"
    >
      <template #default="{ node, data }">
        <!-- 临时节点：渲染输入框 -->
        <div v-if="data.isTemporary" class="tree-node temp-node">
          <el-icon class="node-icon">
            <FolderAdd v-if="data.tempType === 'folder'" />
            <DocumentAdd v-else />
          </el-icon>
          <el-input
            ref="tempInputRef"
            v-model="tempInputValue"
            class="temp-input"
            size="small"
            :placeholder="`新建${data.tempType === 'folder' ? '文件夹' : '文件'}`"
            @keydown.enter.prevent="handleConfirmCreation"
            @keydown.esc.prevent="handleCancelCreation"
            @blur="handleInputBlur"
          />
          <el-icon 
            v-if="validationError" 
            class="error-icon" 
            :title="validationError"
          >
            <WarningFilled />
          </el-icon>
        </div>
        
        <!-- 普通节点：显示图标+名称 -->
        <span v-else class="tree-node">
          <el-icon v-if="data.isFolder" class="node-icon">
            <Folder v-if="!node.expanded" />
            <FolderOpened v-else />
          </el-icon>
          <el-icon v-else class="node-icon"><Document /></el-icon>
          <span class="node-label">{{ data.name }}</span>
        </span>
      </template>
    </el-tree>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch, nextTick } from 'vue'
import type { ElTree } from 'element-plus'
import { 
  Folder, 
  FolderOpened, 
  Document, 
  FolderAdd, 
  DocumentAdd,
  WarningFilled 
} from '@element-plus/icons-vue'
import { useMarkdownStore } from '@stores/projectPage'

/**
 * FileTreeContent
 * 文件树内容区域
 * 显示文件夹和文件的树形结构
 */

const markdownStore = useMarkdownStore()

// el-tree实例引用
const treeRef = ref<InstanceType<typeof ElTree>>()

// 临时输入框引用
const tempInputRef = ref<any>(null)

// 文件树数据
const fileTree = computed(() => markdownStore.fileTree)

// 创建状态
const creationState = computed(() => markdownStore.creationState)
const tempInputValue = computed({
  get: () => creationState.value.inputValue,
  set: (val) => markdownStore.updateCreationInput(val)
})
const validationError = computed(() => creationState.value.validationError)

// 树形控件配置
const treeProps = {
  children: 'children',
  label: 'name'
}

// 处理节点点击
const handleNodeClick = (data: any) => {
  // 如果点击的是临时节点，不处理
  if (data.isTemporary) return
  
  // 更新选中状态
  markdownStore.selectNode(data)
  
  // 如果是文件，打开它
  if (!data.isFolder) {
    markdownStore.openFile(data.path)
  }
}

// 处理选中状态变化
const handleCurrentChange = (data: any) => {
  if (!data?.isTemporary) {
    markdownStore.selectNode(data)
  }
}

// 确认创建
const handleConfirmCreation = () => {
  markdownStore.confirmCreation()
}

// 取消创建
const handleCancelCreation = () => {
  markdownStore.cancelCreation()
}

// 输入框失焦（延迟取消，避免与 Enter 冲突）
const handleInputBlur = () => {
  setTimeout(() => {
    if (creationState.value.isCreating) {
      markdownStore.cancelCreation()
    }
  }, 200)
}

// ==================== 监听创建状态，自动聚焦输入框 ====================
watch(() => creationState.value.isCreating, (isCreating) => {
  if (isCreating) {
    nextTick(() => {
      // 展开父节点
      if (creationState.value.parentNode) {
        const parentNodeKey = creationState.value.parentNode.id
        treeRef.value?.store.nodesMap[parentNodeKey]?.expand()
      }
      
      // 聚焦输入框
      if (tempInputRef.value) {
        const inputElement = Array.isArray(tempInputRef.value) 
          ? tempInputRef.value[0] 
          : tempInputRef.value
        inputElement?.focus()
      }
    })
  }
})

// ==================== 展开/折叠功能 ====================
// 注入工具栏提供的展开状态
const expandAllState = inject<{ value: boolean }>('expandAllState', { value: true })

// 监听展开状态变化
watch(() => expandAllState.value, (shouldExpand) => {
  nextTick(() => {
    if (!treeRef.value) return
    
    // 获取所有节点
    const nodes = treeRef.value.store.nodesMap
    
    // 遍历所有节点，设置展开/折叠状态
    for (const key in nodes) {
      const node = nodes[key]
      // 只操作有子节点的节点（文件夹）
      if (node && node.childNodes && node.childNodes.length > 0) {
        node.expanded = shouldExpand
      }
    }
  })
}, { immediate: false })
</script>

<style scoped>
.file-tree-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  min-height: 0;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--obsidian-text-primary);
  width: 100%;
}

/* 临时节点样式 */
.temp-node {
  padding: 2px 0;
}

.temp-input {
  flex: 1;
  font-size: 13px;
}

.temp-input :deep(.el-input__inner) {
  height: 24px;
  line-height: 24px;
  padding: 0 8px;
  font-size: 13px;
  background: var(--obsidian-bg-primary);
  color: var(--obsidian-text-primary);
  border: 1px solid var(--obsidian-accent);
  border-radius: 3px;
}

.temp-input :deep(.el-input__inner:focus) {
  border-color: var(--obsidian-accent);
  box-shadow: 0 0 0 2px rgba(109, 133, 255, 0.2);
}

.error-icon {
  font-size: 16px;
  color: #f56c6c;
  flex-shrink: 0;
  cursor: help;
}

.node-icon {
  font-size: 16px;
  color: var(--obsidian-text-secondary);
  flex-shrink: 0;
}

.node-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Element Plus Tree样式覆盖 */
:deep(.el-tree) {
  background: transparent;
  color: var(--obsidian-text-primary);
}

:deep(.el-tree-node__content) {
  height: 32px;
  border-radius: 4px;
  padding: 0 8px;
}

:deep(.el-tree-node__content:hover) {
  background: var(--obsidian-hover-bg);
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--obsidian-hover-bg);
}

/* 临时节点不显示hover效果 */
:deep(.el-tree-node__content:has(.temp-node):hover) {
  background: transparent;
}
</style>
