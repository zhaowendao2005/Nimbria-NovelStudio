<template>
  <div class="json-schema-code-preview">
    <JsonSchemaCodeEditor
      :model-value="formattedSchema"
      :read-only="true"
      :options="{
        lineNumbers: 'off',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
        minimap: { enabled: false }
      }"
      class="code-preview-editor"
    />
    <el-button
      :icon="CopyDocument"
      size="small"
      class="copy-button"
      @click="handleCopy"
    >
      复制
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import { CopyDocument } from '@element-plus/icons-vue';
import JsonSchemaCodeEditor from './JsonSchemaCodeEditor.vue';
import type { JsonSchema } from '@stores/projectPage/docParser/docParser.types';

interface Props {
  schema: JsonSchema;
}

const props = defineProps<Props>();

const formattedSchema = computed(() => {
  try {
    return JSON.stringify(props.schema, null, 2);
  } catch (error) {
    console.error("Failed to format schema:", error);
    return "{}";
  }
});

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(formattedSchema.value);
    console.log('Schema已复制到剪贴板');
  } catch (err) {
    console.log('复制失败');
    console.error('Failed to copy text: ', err);
  }
};
</script>

<style scoped>
.json-schema-code-preview {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.code-preview-editor {
  height: 100%;
}

.copy-button {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}
</style>
