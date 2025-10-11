<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 600px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">配置提供商</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section v-if="provider">
        <q-form @submit="handleSubmit" class="config-form">
          <!-- 提供商信息 -->
          <div class="provider-info">
            <div class="provider-info__logo">{{ provider.logo || '🤖' }}</div>
            <div class="provider-info__details">
              <div class="provider-info__name">{{ provider.displayName }}</div>
              <div class="provider-info__id">{{ provider.id }}</div>
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- 配置表单 -->
          <q-input
            v-model="form.apiKey"
            label="API Key *"
            type="password"
            outlined
            dense
            :rules="[val => !!val || '请输入API Key']"
          >
            <template v-slot:append>
              <q-icon
                :name="showApiKey ? 'visibility' : 'visibility_off'"
                class="cursor-pointer"
                @click="showApiKey = !showApiKey"
              />
            </template>
          </q-input>

          <q-input
            v-model="form.baseUrl"
            label="Base URL *"
            outlined
            dense
            :rules="[
              val => !!val || '请输入Base URL',
              val => val.startsWith('http') || 'URL必须以http://或https://开头'
            ]"
          />

          <q-input
            v-model.number="form.timeout"
            label="超时时间 (毫秒)"
            type="number"
            outlined
            dense
            hint="请求超时时间，默认30000ms"
          />

          <q-input
            v-model.number="form.maxRetries"
            label="最大重试次数"
            type="number"
            outlined
            dense
            hint="失败后最大重试次数，默认3次"
          />

          <!-- 测试连接按钮 -->
          <q-btn
            outline
            color="primary"
            icon="link"
            label="测试连接"
            :loading="testing"
            @click="handleTestConnection"
            class="full-width"
          />

          <div class="form-actions">
            <q-btn
              label="取消"
              flat
              v-close-popup
            />
            <q-btn
              label="保存"
              type="submit"
              color="primary"
              :loading="loading"
            />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section v-else>
        <div class="text-center text-grey-6">
          提供商不存在
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useSettingsLlmStore } from '@stores/settings'
import { Notify } from 'quasar'

const props = defineProps<{
  modelValue: boolean
  providerId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'config-updated': []
}>()

const llmStore = useSettingsLlmStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const loading = ref(false)
const testing = ref(false)
const showApiKey = ref(false)

const provider = computed(() =>
  llmStore.providers.find(p => p.id === props.providerId)
)

const form = ref({
  apiKey: '',
  baseUrl: '',
  timeout: 30000,
  maxRetries: 3
})

// 监听提供商变化，加载配置
watch(() => props.providerId, (newId) => {
  if (newId) {
    loadProviderConfig()
  }
}, { immediate: true })

// 加载提供商配置
function loadProviderConfig() {
  if (!provider.value) return

  form.value = {
    apiKey: provider.value.apiKey,
    baseUrl: provider.value.baseUrl,
    timeout: provider.value.defaultConfig.timeout,
    maxRetries: provider.value.defaultConfig.maxRetries
  }
}

// 测试连接
async function handleTestConnection() {
  testing.value = true
  
  try {
    const success = await llmStore.testProviderConnection(props.providerId)
    
    if (success) {
      Notify.create({
        type: 'positive',
        message: '连接测试成功！',
        position: 'top'
      })
    } else {
      Notify.create({
        type: 'negative',
        message: '连接测试失败',
        position: 'top'
      })
    }
  } catch (error) {
    console.error('Test connection error:', error)
    Notify.create({
      type: 'negative',
      message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
      position: 'top'
    })
  } finally {
    testing.value = false
  }
}

// 提交表单
async function handleSubmit() {
  loading.value = true
  
  try {
    const success = await llmStore.updateProviderConfig(props.providerId, {
      apiKey: form.value.apiKey,
      baseUrl: form.value.baseUrl,
      timeout: form.value.timeout,
      maxRetries: form.value.maxRetries
    })

    if (success) {
      emit('config-updated')
      isOpen.value = false
    } else {
      Notify.create({
        type: 'negative',
        message: '更新配置失败',
        position: 'top'
      })
    }
  } catch (error) {
    console.error('Update config error:', error)
    Notify.create({
      type: 'negative',
      message: `更新失败: ${error instanceof Error ? error.message : '未知错误'}`,
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.config-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--q-dark-5);
  border-radius: 8px;

  &__logo {
    font-size: 48px;
    line-height: 1;
  }

  &__details {
    flex: 1;
  }

  &__name {
    font-size: 18px;
    font-weight: 600;
    color: var(--q-dark);
    margin-bottom: 4px;
  }

  &__id {
    font-size: 13px;
    color: var(--q-dark-50);
    font-family: monospace;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>

