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
  (e: 'save'): void
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
    height: '100%',
    mode: 'ir', // Instant Rendering模式，类似Obsidian
    placeholder: '开始编写...',
    theme: 'classic',
    cdn: 'https://cdn.jsdelivr.net/npm/vditor@3.10.7',  // 指定CDN版本
    
    // 使用默认工具栏并固定
    toolbarConfig: {
      pin: true,
    },
    
    // 关闭缓存，避免干扰测试滚动/布局
    cache: {
      enable: false,
    },
    
    // 输入回调
    input: (value) => {
      emit('update:modelValue', value)
      emit('change', value)
    },
    
    // Ctrl+S 保存快捷键
    ctrlEnter: () => {
      // 可以用于其他快捷键，这里不用
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
      
      // 监听Ctrl+S保存快捷键
      if (vditor && vditor.vditor && vditor.vditor.element) {
        vditor.vditor.element.addEventListener('keydown', handleKeyDown)
      }
    }
  })
})

// 处理键盘事件
const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    emit('save')
  }
}

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
  if (vditor) {
    // 移除事件监听器
    if (vditor.vditor && vditor.vditor.element) {
      vditor.vditor.element.removeEventListener('keydown', handleKeyDown)
    }
    vditor.destroy()
    vditor = null
  }
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
  overflow: hidden;
}

/* Vditor样式调整 */
:deep(.vditor) {
  border: none;
  background-color: transparent;
}

:deep(.vditor-toolbar) {
  background-color: var(--obsidian-bg-secondary, #f5f6f8);
  border-bottom: 1px solid var(--obsidian-border, #e3e5e8);
}

:deep(.vditor-content) {
  background-color: var(--obsidian-bg-primary, #ffffff);
}
</style>
