<template>
  <div class="file-tree-content">
    <el-tree
      ref="treeRef"
      :data="fileTree"
      :props="treeProps"
      node-key="id"
      :expand-on-click-node="false"
      default-expand-all
      @node-click="handleNodeClick"
    >
      <template #default="{ node, data }">
        <span class="tree-node">
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
import { Folder, FolderOpened, Document } from '@element-plus/icons-vue'
import { useMarkdownStore } from '@stores/projectPage'

/**
 * FileTreeContent
 * 文件树内容区域
 * 显示文件夹和文件的树形结构
 */

const markdownStore = useMarkdownStore()

// el-tree实例引用
const treeRef = ref<InstanceType<typeof ElTree>>()

// 文件树数据
const fileTree = computed(() => markdownStore.fileTree)

// 树形控件配置
const treeProps = {
  children: 'children',
  label: 'name'
}

// 处理节点点击
const handleNodeClick = (data: any) => {
  if (!data.isFolder) {
    // 打开文件
    markdownStore.openFile(data.path)
  }
}

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
  overflow-y: auto;  /* ✅ 文件树可滚动 */
  overflow-x: hidden;
  padding: 8px;
  min-height: 0; /* 🔑 关键！ */
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--obsidian-text-primary);
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

:deep(.el-tree-node:focus > .el-tree-node__content) {
  background: var(--obsidian-hover-bg);
}
</style>
