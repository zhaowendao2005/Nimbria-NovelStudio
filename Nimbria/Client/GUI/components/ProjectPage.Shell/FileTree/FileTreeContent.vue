<template>
  <div class="file-tree-content">
    <el-tree
      :data="fileTree"
      :props="treeProps"
      node-key="id"
      :expand-on-click-node="false"
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
import { computed } from 'vue'
import { Folder, FolderOpened, Document } from '@element-plus/icons-vue'
import { useMarkdownStore } from '@stores/projectPage'

/**
 * FileTreeContent
 * 文件树内容区域
 * 显示文件夹和文件的树形结构
 */

const markdownStore = useMarkdownStore()

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
