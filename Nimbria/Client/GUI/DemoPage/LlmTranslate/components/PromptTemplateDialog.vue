<template>
  <el-dialog
    :model-value="modelValue"
    :title="mode === 'create' ? '创建系统提示词模板' : '编辑系统提示词模板'"
    width="700px"
    @close="handleClose"
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="模板名称" required>
        <el-input
          v-model="form.name"
          placeholder="例如：技术文档翻译"
          maxlength="50"
          show-word-limit
          :disabled="isBuiltin"
        />
      </el-form-item>

      <el-form-item label="分类">
        <el-select
          v-model="form.category"
          placeholder="选择或输入分类"
          allow-create
          filterable
          clearable
          :disabled="isBuiltin"
          style="width: 100%"
        >
          <el-option label="通用" value="通用" />
          <el-option label="技术" value="技术" />
          <el-option label="文学" value="文学" />
          <el-option label="学术" value="学术" />
        </el-select>
      </el-form-item>

      <el-form-item label="提示词内容" required>
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="12"
          placeholder="输入系统提示词内容...&#10;&#10;例如：&#10;你是一位专业的翻译助手。请将用户输入的文本翻译成目标语言，保持原文的语气和风格。注意：&#10;- 保持专业术语的准确性&#10;- 尊重原文的格式和结构&#10;- 翻译要自然流畅，符合目标语言习惯"
          maxlength="2000"
          show-word-limit
          :disabled="isBuiltin"
        />
      </el-form-item>

      <el-form-item label="描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          placeholder="模板说明（可选）"
          maxlength="200"
          show-word-limit
          :disabled="isBuiltin"
        />
      </el-form-item>

      <el-alert
        v-if="isBuiltin"
        title="内置模板不可编辑"
        type="info"
        :closable="false"
        show-icon
        style="margin-top: 12px"
      />
    </el-form>

    <template #footer>
      <el-button @click="handleClose">{{ isBuiltin ? '关闭' : '取消' }}</el-button>
      <el-button
        v-if="!isBuiltin"
        type="primary"
        :disabled="!isValid"
        :loading="loading"
        @click="handleConfirm"
      >
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { SystemPromptTemplate } from '../types/system-prompt'

// Props
interface Props {
  modelValue: boolean
  mode: 'create' | 'edit'
  template?: SystemPromptTemplate | null
}

const props = withDefaults(defineProps<Props>(), {
  template: null
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: { name: string; content: string; category?: string; description?: string }]
}>()

// 表单数据
const form = ref({
  name: '',
  content: '',
  category: '',
  description: ''
})

const loading = ref(false)

// 是否为内置模板
const isBuiltin = computed(() => {
  return props.mode === 'edit' && props.template?.isBuiltin
})

// 表单验证
const isValid = computed(() => {
  return form.value.name.trim() !== '' && form.value.content.trim() !== ''
})

// 监听模板变化，更新表单
watch(
  () => props.template,
  (newTemplate) => {
    if (newTemplate && props.mode === 'edit') {
      form.value = {
        name: newTemplate.name,
        content: newTemplate.content,
        category: newTemplate.category || '',
        description: newTemplate.description || ''
      }
    } else {
      // 创建模式，重置表单
      form.value = {
        name: '',
        content: '',
        category: '',
        description: ''
      }
    }
  },
  { immediate: true }
)

// 监听对话框打开/关闭
watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) {
      // 对话框关闭时重置表单
      form.value = {
        name: '',
        content: '',
        category: '',
        description: ''
      }
    }
  }
)

// 关闭对话框
const handleClose = () => {
  emit('update:modelValue', false)
}

// 确认保存
const handleConfirm = () => {
  if (!isValid.value || isBuiltin.value) {
    return
  }

  const data: { name: string; content: string; category?: string; description?: string } = {
    name: form.value.name.trim(),
    content: form.value.content.trim()
  }

  const category = form.value.category.trim()
  if (category) {
    data.category = category
  }

  const description = form.value.description.trim()
  if (description) {
    data.description = description
  }

  emit('confirm', data)
}
</script>

<style scoped lang="scss">
:deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>

