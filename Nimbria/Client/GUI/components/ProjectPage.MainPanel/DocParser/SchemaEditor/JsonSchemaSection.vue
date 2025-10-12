<template>
  <div class="json-schema-section">
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button
          :icon="Edit"
          type="primary"
          :disabled="disabled"
          @click="showSchemaEditor = true"
        >
          编辑 Schema
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-tag v-if="disabled" type="info" size="small">只读模式</el-tag>
      </div>
    </div>

    <div class="preview-area">
      <JsonSchemaPreviewPane 
        :schema="modelValue" 
        @add-root-field="handleAddRootField"
      />
    </div>

    <SchemaEditorDialog
      v-if="showSchemaEditor"
      :visible="showSchemaEditor"
      :initial-schema="modelValue"
      @update:visible="showSchemaEditor = $event"
      @cancel="showSchemaEditor = false"
      @confirm="handleSchemaUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Edit } from '@element-plus/icons-vue'
import JsonSchemaPreviewPane from './JsonSchemaPreviewPane.vue'
import SchemaEditorDialog from './SchemaEditorDialog.vue'
import type { JsonSchema } from '@stores/projectPage/docParser/docParser.types'

interface Props {
  modelValue: JsonSchema;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: JsonSchema]
}>()

const showSchemaEditor = ref(false)

const handleSchemaUpdate = (newSchema: JsonSchema) => {
  emit('update:modelValue', newSchema)
  showSchemaEditor.value = false
}

const handleAddRootField = () => {
  if (props.disabled) return
  
  // 打开Schema编辑器来添加字段，而不是直接添加
  showSchemaEditor.value = true
}
</script>

<style scoped>
.json-schema-section {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.toolbar-left, .toolbar-right {
  display: flex;
  gap: 8px;
}

.preview-area {
  flex-grow: 1;
  min-height: 0;
}
</style>
