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
    height: 360,
    mode: 'ir', // Instant Rendering模式，类似Obsidian
    placeholder: '开始编写...',
    theme: 'classic',
    
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



