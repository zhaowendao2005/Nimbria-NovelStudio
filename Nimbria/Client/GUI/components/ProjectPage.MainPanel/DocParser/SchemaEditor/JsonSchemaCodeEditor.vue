<template>
  <div class="json-schema-code-editor">
    <div class="editor-header">
      <div class="editor-status">
        <el-icon v-if="isDirty" :size="14" color="#409EFF" class="dirty-indicator">
          <Loading />
        </el-icon>
        <span v-if="hasError" class="error-badge">
          <el-icon :size="14"><WarningFilled /></el-icon>
          JSON 格式错误
        </span>
        <span v-else-if="isDirty" class="save-hint">未保存</span>
        <span v-else class="save-hint saved">已保存</span>
      </div>
      
      <div class="editor-actions">
        <el-button 
          size="small" 
          text 
          :icon="Refresh"
          @click="formatDocument"
        >
          格式化
        </el-button>
        <el-button 
          v-if="isDirty"
          size="small" 
          type="primary"
          :icon="DocumentChecked"
          :loading="saving"
          @click="handleManualSave"
        >
          保存
        </el-button>
      </div>
    </div>
    
    <div class="editor-container">
      <vue-monaco-editor
        v-model:value="localValue"
        :options="editorOptions"
        :language="'json'"
        class="json-editor"
        @mount="handleEditorMount"
        @change="handleChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import { Loading, WarningFilled, DocumentChecked, Refresh } from '@element-plus/icons-vue'
import { useDocParserStore } from '@stores/projectPage/docParser/docParser.store'

// Monaco Editor 类型
interface MonacoEditor {
  getAction: (id: string) => { run: () => void } | undefined
}

// Props
interface Props {
  modelValue?: string
  readOnly?: boolean
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '{}',
  readOnly: false,
  placeholder: '请输入JSON Schema...'
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
  mount: [editor: MonacoEditor]
  error: [error: string | null]
}>()

// Store
const docParserStore = useDocParserStore()

// 响应式数据
const editorInstance = ref<MonacoEditor | null>(null)
const hasError = ref(false)
const saving = ref(false)

// 本地值（用于v-model双向绑定）
const localValue = computed({
  get: () => props.modelValue || '{}',
  set: (value: string) => {
    emit('update:modelValue', value)
  }
})

// 获取 Store 中的 isDirty 状态
const isDirty = computed(() => docParserStore.isDirty)

// 编辑器配置
const editorOptions = computed(() => ({
  readOnly: props.readOnly,
  minimap: {
    enabled: false
  },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  wordWrap: 'on' as const,
  fontSize: 13,
  lineNumbers: 'on' as const,
  glyphMargin: false,
  folding: true,
  lineDecorationsWidth: 10,
  lineNumbersMinChars: 3,
  scrollbar: {
    vertical: 'auto' as const,
    horizontal: 'auto' as const,
    useShadows: false,
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8
  },
  theme: 'vs',
  tabSize: 2,
  insertSpaces: true,
  detectIndentation: false,
  trimAutoWhitespace: true,
  formatOnPaste: true,
  formatOnType: true,
  renderWhitespace: 'none' as const,
  bracketPairColorization: {
    enabled: true
  },
  guides: {
    indentation: true,
    bracketPairs: true
  }
}))

// 方法
const handleEditorMount = (editor: MonacoEditor) => {
  editorInstance.value = editor
  emit('mount', editor)
  
  // 格式化初始内容
  setTimeout(() => {
    formatDocument()
  }, 100)
}

const handleChange = (value: string) => {
  // 实时验证 JSON 格式
  try {
    if (value.trim()) {
      JSON.parse(value)
      hasError.value = false
      emit('error', null)
      
      // 触发自动保存（通过 Store）
      docParserStore.updateSchemaContent(value)
    }
  } catch (error) {
    hasError.value = true
    const errorMsg = error instanceof Error ? error.message : 'JSON 格式错误'
    emit('error', errorMsg)
  }
  
  emit('change', value)
}

const handleManualSave = async () => {
  if (!isDirty.value || hasError.value) return
  
  try {
    saving.value = true
    await docParserStore.saveSchema()
  } catch (error) {
    console.error('手动保存失败:', error)
  } finally {
    saving.value = false
  }
}

const formatDocument = () => {
  if (editorInstance.value) {
    editorInstance.value.getAction('editor.action.formatDocument')?.run()
  }
}

// 监听modelValue变化，格式化JSON
watch(() => props.modelValue, (newValue) => {
  if (newValue && editorInstance.value) {
    setTimeout(() => {
      formatDocument()
    }, 100)
  }
}, { immediate: true })

// 暴露方法给父组件
defineExpose({
  formatDocument,
  getEditor: () => editorInstance.value
})
</script>

<style scoped>
.json-schema-code-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color-light);
  border-bottom: none;
  border-radius: var(--el-border-radius-base) var(--el-border-radius-base) 0 0;
}

.editor-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.dirty-indicator {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.save-hint {
  color: var(--el-text-color-secondary);
  
  &.saved {
    color: var(--el-color-success);
  }
}

.error-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-color-danger);
  font-weight: 500;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.editor-container {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--el-border-color-light);
  border-radius: 0 0 var(--el-border-radius-base) var(--el-border-radius-base);
  overflow: hidden;
}

.json-editor {
  height: 100%;
  width: 100%;
}

.json-editor :deep(.monaco-editor) {
  border: none;
}

.json-editor :deep(.monaco-editor .margin) {
  background: var(--el-bg-color-page);
}

.json-editor :deep(.monaco-editor .monaco-editor-background) {
  background: var(--el-bg-color);
}

.json-editor :deep(.monaco-editor .current-line) {
  border: none;
}

.json-editor :deep(.monaco-editor .line-numbers) {
  color: var(--el-text-color-placeholder);
}
</style>