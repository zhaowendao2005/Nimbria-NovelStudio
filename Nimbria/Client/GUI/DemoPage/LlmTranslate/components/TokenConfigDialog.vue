<template>
  <el-dialog
    :model-value="modelValue"
    title="Token换算配置"
    width="600px"
    @close="handleClose"
  >
    <el-form :model="form" label-width="140px">
      <el-form-item label="配置名称" required>
        <el-input
          v-model="form.name"
          placeholder="例如：Gemini中文优化"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="中文字符:Token" required>
        <el-input-number
          v-model="form.chineseRatio"
          :min="0.1"
          :max="10"
          :step="0.1"
          :precision="1"
        />
        <span class="ml-2 text-gray-500">（例如 4.0 表示 4个中文字符 = 1个token）</span>
      </el-form-item>

      <el-form-item label="ASCII字符:Token" required>
        <el-input-number
          v-model="form.asciiRatio"
          :min="0.1"
          :max="10"
          :step="0.1"
          :precision="1"
        />
        <span class="ml-2 text-gray-500">（例如 1.0 表示 1个ASCII字符 = 1个token）</span>
      </el-form-item>

      <el-form-item label="描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          placeholder="配置说明（可选）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-divider>测试估算</el-divider>

      <el-form-item label="测试文本">
        <el-input
          v-model="testText"
          type="textarea"
          :rows="4"
          placeholder="输入测试文本，实时查看token估算结果"
        />
      </el-form-item>

      <el-form-item v-if="testText" label="估算结果">
        <div class="estimation-result">
          <el-tag type="success" size="large">{{ estimatedTokens }} tokens</el-tag>
          <span class="ml-3 text-gray-600">
            中文: {{ chineseCount }}字 / ASCII: {{ asciiCount }}字
          </span>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :disabled="!isValid" @click="handleConfirm">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Props
interface Props {
  modelValue: boolean
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [config: { name: string; chineseRatio: number; asciiRatio: number; description?: string }]
}>()

// 表单数据
const form = ref({
  name: '',
  chineseRatio: 2.5,
  asciiRatio: 1.0,
  description: ''
})

// 测试文本
const testText = ref('')

// 计算中文字符数
const chineseCount = computed(() => {
  if (!testText.value) return 0
  let count = 0
  for (const char of testText.value) {
    const code = char.charCodeAt(0)
    if (
      (code >= 0x4E00 && code <= 0x9FFF) ||
      (code >= 0x3400 && code <= 0x4DBF) ||
      (code >= 0x20000 && code <= 0x2A6DF) ||
      (code >= 0x2A700 && code <= 0x2B73F) ||
      (code >= 0x2B740 && code <= 0x2B81F) ||
      (code >= 0x2B820 && code <= 0x2CEAF)
    ) {
      count++
    }
  }
  return count
})

// 计算ASCII字符数
const asciiCount = computed(() => {
  if (!testText.value) return 0
  let count = 0
  for (const char of testText.value) {
    const code = char.charCodeAt(0)
    if (code < 128) {
      count++
    } else if (
      !(
        (code >= 0x4E00 && code <= 0x9FFF) ||
        (code >= 0x3400 && code <= 0x4DBF) ||
        (code >= 0x20000 && code <= 0x2A6DF) ||
        (code >= 0x2A700 && code <= 0x2B73F) ||
        (code >= 0x2B740 && code <= 0x2B81F) ||
        (code >= 0x2B820 && code <= 0x2CEAF)
      )
    ) {
      count++
    }
  }
  return count
})

// 估算token数
const estimatedTokens = computed(() => {
  if (!testText.value) return 0
  return Math.ceil(
    chineseCount.value / form.value.chineseRatio +
    asciiCount.value / form.value.asciiRatio
  )
})

// 验证表单
const isValid = computed(() => {
  return form.value.name.trim().length > 0 &&
         form.value.chineseRatio > 0 &&
         form.value.asciiRatio > 0
})

// 处理关闭
const handleClose = () => {
  emit('update:modelValue', false)
}

// 处理确认
const handleConfirm = () => {
  if (!isValid.value) return
  
  emit('confirm', {
    name: form.value.name.trim(),
    chineseRatio: form.value.chineseRatio,
    asciiRatio: form.value.asciiRatio,
    description: form.value.description.trim() || undefined
  })
  
  // 重置表单
  form.value = {
    name: '',
    chineseRatio: 2.5,
    asciiRatio: 1.0,
    description: ''
  }
  testText.value = ''
  
  handleClose()
}
</script>

<style scoped>
.estimation-result {
  display: flex;
  align-items: center;
}

.ml-2 {
  margin-left: 0.5rem;
}

.ml-3 {
  margin-left: 0.75rem;
}

.text-gray-500 {
  color: #6b7280;
  font-size: 0.875rem;
}

.text-gray-600 {
  color: #4b5563;
  font-size: 0.875rem;
}
</style>

