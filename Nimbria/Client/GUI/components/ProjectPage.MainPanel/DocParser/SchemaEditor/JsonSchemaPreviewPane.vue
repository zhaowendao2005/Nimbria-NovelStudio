<template>
  <div class="json-schema-preview-pane">
    <el-row :gutter="16" class="preview-row">
      <el-col :span="12" class="tree-col">
        <div class="preview-container">
          <div class="preview-header">
            <span>可视化预览</span>
            <div class="header-actions">
              <el-button size="small" :icon="Plus" @click="addRootField">添加字段</el-button>
              <el-button size="small" @click="expandAll">展开全部</el-button>
              <el-button size="small" @click="collapseAll">收起全部</el-button>
            </div>
          </div>
          <el-tree
            ref="treeRef"
            :data="treeData"
            node-key="id"
            default-expand-all
            :expand-on-click-node="false"
            :indent="40"
            class="preview-tree"
          >
            <template #default="{ data }">
              <TreeSchemaNode :node="data" :data="data" />
            </template>
          </el-tree>
        </div>
      </el-col>
      <el-col :span="12" class="code-col">
        <div class="preview-container">
          <div class="preview-header">
            <span>JSON Schema</span>
          </div>
          <JsonSchemaCodePreview :schema="schema" class="code-preview" />
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElTree } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import TreeSchemaNode from './TreeSchemaNode.vue';
import JsonSchemaCodePreview from './JsonSchemaCodePreview.vue';
import { treeConverter } from '@stores/projectPage/docParser/docParser.schemaUtils';
import type { JsonSchema } from '@stores/projectPage/docParser/docParser.types';
import type { TreeNodeData } from '@stores/projectPage/docParser/docParser.schemaUtils';

interface Props {
  schema: JsonSchema;
}

const props = defineProps<Props>();
const emit = defineEmits(['add-root-field']);

const treeRef = ref();
const treeData = ref<TreeNodeData[]>([]);

const convertSchemaToTree = (schema: JsonSchema) => {
  try {
    // 🔍 调试日志：查看原始 Schema
    console.log('[JsonSchemaPreviewPane] 转换 Schema:', JSON.stringify(schema, null, 2));
    
    if (schema && schema.properties) {
      treeData.value = treeConverter.jsonSchemaToTreeData(schema);
      
      // 🔍 调试日志：查看转换后的树数据
      console.log('[JsonSchemaPreviewPane] 转换后的树数据:', treeData.value);
    } else {
      treeData.value = [];
    }
  } catch (error) {
    console.error("Failed to convert schema to tree:", error);
    treeData.value = [];
  }
};

watch(() => props.schema, (newSchema) => {
  convertSchemaToTree(newSchema);
}, { immediate: true, deep: true });

const expandAll = () => {
  if (treeRef.value) {
    treeData.value.forEach(node => {
      treeRef.value.setExpanded(node.id, true);
    });
  }
};

const collapseAll = () => {
  if (treeRef.value) {
    treeData.value.forEach(node => {
      treeRef.value.setExpanded(node.id, false);
    });
  }
};

const addRootField = () => {
  emit('add-root-field');
};

</script>

<style scoped>
.json-schema-preview-pane {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preview-row {
  height: 100%;
  flex: 1;
  display: flex;
}

.tree-col, .code-col {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0; /* 🔑 关键：允许 flex item 收缩 */
}

.preview-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0; /* 🔑 关键：允许容器收缩 */
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.preview-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color);
  font-size: 14px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.preview-tree {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  min-height: 0;
  width: 100%; /* 跟随父容器宽度 */
}

.code-preview {
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow-x: auto;
  overflow-y: auto;
}

:deep(.el-tree-node__content) {
  height: auto !important;
  min-height: 36px;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  padding-right: 0 !important;
  /* 保留 padding-left 让 Element Plus 的 indent 生效 */
  width: max-content !important; /* 🔑 让内容决定宽度 */
  min-width: 100% !important; /* 至少占满容器 */
}

/* 🔑 关键：el-tree-node__children 也需要能够超出容器 */
:deep(.el-tree-node__children) {
  width: max-content !important;
  min-width: 100% !important;
}

/* 🔑 el-tree-node 本身也需要处理 */
:deep(.el-tree-node) {
  width: max-content !important;
  min-width: 100% !important;
}
</style>
