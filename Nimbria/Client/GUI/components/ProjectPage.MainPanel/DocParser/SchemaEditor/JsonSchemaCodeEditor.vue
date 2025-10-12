<template>
  <div class="json-schema-code-editor">
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
  mount: [editor: any]
}>()

// 响应式数据
const editorInstance = ref<any>(null)

// 本地值（用于v-model双向绑定）
const localValue = computed({
  get: () => props.modelValue || '{}',
  set: (value: string) => {
    emit('update:modelValue', value)
  }
})

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
const handleEditorMount = (editor: any) => {
  editorInstance.value = editor
  emit('mount', editor)
  
  // 格式化初始内容
  setTimeout(() => {
    formatDocument()
  }, 100)
}

const handleChange = (value: string) => {
  emit('change', value)
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

.editor-container {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
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