<template>
  <q-dialog v-model="isVisible" persistent>
    <q-card style="min-width: 500px">
      <q-card-section>
        <div class="text-h6">手动添加模型</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-form @submit="handleSubmit" class="q-gutter-md">
          <!-- 模型名称 -->
          <q-input
            v-model="formData.name"
            label="模型名称 *"
            hint="例如: gpt-4-turbo"
            dense
            :rules="[val => !!val || '模型名称不能为空']"
          />

          <!-- 显示名称 -->
          <q-input
            v-model="formData.displayName"
            label="显示名称"
            hint="留空则使用模型名称"
            dense
          />

          <!-- 模型类型 -->
          <q-select
            v-model="formData.modelType"
            :options="modelTypeOptions"
            label="模型类型 *"
            dense
            readonly
            hint="由添加按钮所在组自动填充"
          />

          <q-separator />

          <div class="text-subtitle2">初始配置（可选）</div>

          <!-- 上下文长度 -->
          <q-input
            v-model.number="formData.contextLength"
            label="上下文长度"
            type="number"
            dense
            hint="例如: 4096"
          />

          <!-- 最大Token -->
          <q-input
            v-model.number="formData.maxTokens"
            label="最大Token"
            type="number"
            dense
            hint="例如: 4096"
          />

          <!-- 完成模式 -->
          <q-select
            v-model="formData.completionMode"
            :options="completionModeOptions"
            label="完成模式"
            dense
            emit-value
            map-options
          />

          <!-- 请求超时 -->
          <q-input
            v-model.number="formData.timeout"
            label="请求超时 (ms)"
            type="number"
            dense
            hint="默认: 60000"
          />

          <!-- 最大重试次数 -->
          <q-input
            v-model.number="formData.maxRetries"
            label="最大重试次数"
            type="number"
            dense
            hint="默认: 3"
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="取消" @click="handleCancel" />
        <q-btn
          flat
          label="添加"
          color="primary"
          :loading="loading"
          @click="handleSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useSettingsLlmStore } from '@stores/settings'

interface Props {
  modelValue: boolean
  providerId: string
  modelType: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  providerId: '',
  modelType: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'added': []
}>()

const $q = useQuasar()
const settingsStore = useSettingsLlmStore()

const isVisible = ref(props.modelValue)
const loading = ref(false)

// 表单数据
const formData = ref({
  name: '',
  displayName: '',
  modelType: props.modelType,
  contextLength: 4096,
  maxTokens: 4096,
  completionMode: 'chat',
  timeout: 60000,
  maxRetries: 3
})

// 模型类型选项
const modelTypeOptions = ref([
  'LLM',
  'TEXT_EMBEDDING',
  'IMAGE_GENERATION',
  'SPEECH_TO_TEXT',
  'TEXT_TO_SPEECH',
  'RERANK'
])

// 完成模式选项
const completionModeOptions = [
  { label: '对话', value: 'chat' },
  { label: '补全', value: 'completion' }
]

// 监听外部变化
watch(() => props.modelValue, (val) => {
  isVisible.value = val
  if (val) {
    // 打开时重置表单
    resetForm()
  }
})

watch(isVisible, (val) => {
  emit('update:modelValue', val)
})

watch(() => props.modelType, (val) => {
  formData.value.modelType = val
})

function resetForm() {
  formData.value = {
    name: '',
    displayName: '',
    modelType: props.modelType,
    contextLength: 4096,
    maxTokens: 4096,
    completionMode: 'chat',
    timeout: 60000,
    maxRetries: 3
  }
}

async function handleSubmit() {
  if (!formData.value.name.trim()) {
    $q.notify({
      type: 'negative',
      message: '请填写模型名称',
      position: 'top'
    })
    return
  }

  loading.value = true

  try {
    // 构建模型详情
    const modelDetail = {
      name: formData.value.name.trim(),
      displayName: formData.value.displayName.trim() || formData.value.name.trim(),
      description: `手动添加的 ${formData.value.modelType} 模型`,
      config: {
        contextLength: formData.value.contextLength,
        maxTokens: formData.value.maxTokens,
        completionMode: formData.value.completionMode,
        timeout: formData.value.timeout,
        maxRetries: formData.value.maxRetries
      }
    }

    const success = await settingsStore.addModelToProvider(
      props.providerId,
      formData.value.modelType,
      modelDetail
    )

    if (success) {
      $q.notify({
        type: 'positive',
        message: '模型添加成功',
        position: 'top'
      })
      emit('added')
      isVisible.value = false
    } else {
      $q.notify({
        type: 'negative',
        message: '添加模型失败',
        position: 'top'
      })
    }
  } catch (error) {
    console.error('添加模型失败:', error)
    $q.notify({
      type: 'negative',
      message: '添加模型时发生错误',
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  isVisible.value = false
}
</script>

<style lang="scss" scoped>
.text-subtitle2 {
  color: var(--q-primary);
  font-weight: 600;
}
</style>

