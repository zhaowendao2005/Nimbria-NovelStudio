<template>
  <div ref="editorContainer" class="markdown-editor"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'

interface Props {
  modelValue?: string
  readonly?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  readonly: false
})

const emit = defineEmits<Emits>()

const editorContainer = ref<HTMLElement>()
let vditor: Vditor | null = null

onMounted(() => {
  if (!editorContainer.value) return

  vditor = new Vditor(editorContainer.value, {
    height: window.innerHeight - 200, // 使用具体像素高度，减去顶部栏等高度
    mode: 'ir', // Instant Rendering模式，类似Obsidian
    placeholder: '开始编写...',
    theme: 'classic',
    resize: {
      enable: false // 禁用resize，使用容器控制高度
    },
    
    // 工具栏配置 - 精简版
    toolbar: [
      'emoji',
      'headings',
      'bold',
      'italic',
      'strike',
      '|',
      'line',
      'quote',
      'list',
      'ordered-list',
      'check',
      '|',
      'code',
      'inline-code',
      'link',
      'table',
      '|',
      'undo',
      'redo'
    ],
    
    // 预览配置
    preview: {
      markdown: {
        toc: true,
        mark: true,
        footnotes: true,
        autoSpace: true
      },
      math: {
        engine: 'KaTeX'
      },
      hljs: {
        style: 'github',
        lineNumber: false
      }
    },
    
    // 输入回调
    input: (value) => {
      emit('update:modelValue', value)
      emit('change', value)
    },
    
    after: () => {
      // 初始化完成后设置内容
      if (vditor && props.modelValue) {
        vditor.setValue(props.modelValue)
      }
      
      // 设置只读状态
      if (props.readonly) {
        vditor?.disabled()
      }
    }
  })
})

// 监听readonly属性变化
watch(() => props.readonly, (newVal) => {
  if (vditor) {
    if (newVal) {
      vditor.disabled()
    } else {
      vditor.enable()
    }
  }
})

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  if (vditor && newVal !== vditor.getValue()) {
    vditor.setValue(newVal || '')
  }
})

onBeforeUnmount(() => {
  vditor?.destroy()
  vditor = null
})

// 暴露方法给父组件
defineExpose({
  getValue: () => vditor?.getValue() || '',
  setValue: (value: string) => vditor?.setValue(value),
  focus: () => vditor?.focus(),
  blur: () => vditor?.blur()
})
</script>

<style scoped>
.markdown-editor {
  width: 100%;
  height: 100%;
}

/* 覆盖Vditor默认样式，使其更符合Obsidian风格 */
:deep(.vditor) {
  border: none;
}

:deep(.vditor-toolbar) {
  background-color: var(--obsidian-bg-secondary, #f5f6f8);
  border-bottom: 1px solid var(--obsidian-border, #e3e5e8);
  padding: 4px 8px;
}

:deep(.vditor-ir) {
  background-color: var(--obsidian-bg-primary, #ffffff);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
  font-size: 14px;
  line-height: 1.6;
  padding: 20px;
}

:deep(.vditor-ir pre.vditor-reset) {
  background-color: transparent;
}
</style>

