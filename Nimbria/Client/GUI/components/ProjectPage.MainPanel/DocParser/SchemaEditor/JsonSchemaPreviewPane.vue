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
    if (schema && schema.properties) {
      treeData.value = treeConverter.jsonSchemaToTreeData(schema);
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
}

.preview-row, .tree-col, .code-col {
  height: 100%;
}

/* 样式由全局 style.scss 中的 .json-schema-section 提供 */

:deep(.el-tree-node__content) {
  padding: 0 !important;
  height: auto !important;
  min-height: 32px;
}
</style>
