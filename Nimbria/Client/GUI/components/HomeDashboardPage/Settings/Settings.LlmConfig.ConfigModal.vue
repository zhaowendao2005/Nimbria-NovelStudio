<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 600px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">配置提供商</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section v-if="provider">
        <!-- 提供商信息 -->
        <div class="provider-info">
          <div class="provider-info__logo">
            <q-icon name="dns" size="32px" color="primary" />
          </div>
          <div class="provider-info__details">
            <div class="provider-info__name">{{ provider.displayName }}</div>
            <div class="provider-info__id">{{ provider.id }}</div>
          </div>
        </div>

        <q-separator class="q-my-md" />

        <!-- Tab 切换 -->
        <q-tabs
          v-model="activeTab"
          dense
          class="text-grey"
          active-color="primary"
          indicator-color="primary"
          align="justify"
        >
          <q-tab name="basic" label="基础配置" icon="settings" />
          <q-tab name="advanced" label="高级配置" icon="tune" />
          <q-tab name="defaults" label="默认模型配置" icon="dashboard_customize" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="activeTab" animated class="config-panels">
          <!-- 基础配置面板 -->
          <q-tab-panel name="basic">
            <q-form @submit="handleSubmit" class="config-form">
              <q-input
                v-model="form.apiKey"
                label="API Key *"
                :type="showApiKey ? 'text' : 'password'"
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
            </q-form>
          </q-tab-panel>

          <!-- 高级配置面板 -->
          <q-tab-panel name="advanced">
            <q-form class="config-form">
              <div class="text-subtitle2 q-mb-md">模型能力设置</div>

              <q-input
                v-model.number="form.contextLength"
                label="上下文长度 (tokens)"
                type="number"
                outlined
                dense
                hint="模型支持的最大上下文长度"
              />

              <q-input
                v-model.number="form.maxTokens"
                label="最大输出 (tokens)"
                type="number"
                outlined
                dense
                hint="模型单次生成的最大token数"
              />

              <q-select
                v-model="form.completionMode"
                :options="completionModeOptions"
                label="完成模式"
                outlined
                dense
                emit-value
                map-options
              />

              <q-separator class="q-my-md" />

              <div class="text-subtitle2 q-mb-md">高级能力支持</div>

              <q-select
                v-model="form.agentThought"
                :options="supportOptions"
                label="Agent思维"
                outlined
                dense
                emit-value
                map-options
              />

              <q-select
                v-model="form.functionCalling"
                :options="supportOptions"
                label="函数调用"
                outlined
                dense
                emit-value
                map-options
              />

              <q-select
                v-model="form.structuredOutput"
                :options="supportOptions"
                label="结构化输出"
                outlined
                dense
                emit-value
                map-options
              />

              <q-input
                v-model="form.systemPromptSeparator"
                label="系统提示分隔符"
                type="textarea"
                outlined
                dense
                rows="2"
                hint="系统提示与用户消息之间的分隔符"
              />
            </q-form>
          </q-tab-panel>

          <!-- 默认模型配置面板 -->
          <q-tab-panel name="defaults">
            <div class="text-body2 text-grey-7 q-mb-md">
              <q-icon name="info" color="primary" class="q-mr-xs" />
              这些配置将作为该提供商下所有模型的默认值，您可以稍后为单个模型自定义配置。
            </div>

            <q-form class="config-form">
              <div class="config-summary">
                <div class="summary-item">
                  <span class="summary-label">上下文长度:</span>
                  <span class="summary-value">{{ form.contextLength }} tokens</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">最大输出:</span>
                  <span class="summary-value">{{ form.maxTokens }} tokens</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">完成模式:</span>
                  <span class="summary-value">{{ form.completionMode }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Agent思维:</span>
                  <span class="summary-value">{{ form.agentThought }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">函数调用:</span>
                  <span class="summary-value">{{ form.functionCalling }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">结构化输出:</span>
                  <span class="summary-value">{{ form.structuredOutput }}</span>
                </div>
              </div>

              <q-banner class="bg-orange-1 text-orange-9 q-mt-md" rounded dense>
                <template v-slot:avatar>
                  <q-icon name="tips_and_updates" color="orange" />
                </template>
                <div class="text-body2">
                  提示：单个模型可以覆盖这些默认配置。在"提供商列表"中右键模型，选择"配置参数"进行自定义。
                </div>
              </q-banner>
            </q-form>
          </q-tab-panel>
        </q-tab-panels>

        <!-- 底部操作按钮 -->
        <q-separator />
        <div class="form-actions">
          <q-btn
            label="取消"
            flat
            v-close-popup
          />
          <q-btn
            label="保存配置"
            color="primary"
            :loading="loading"
            @click="handleSubmit"
          />
        </div>
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
const activeTab = ref('basic')

const provider = computed(() =>
  llmStore.providers.find(p => p.id === props.providerId)
)

const form = ref({
  apiKey: '',
  baseUrl: '',
  timeout: 30000,
  maxRetries: 3,
  contextLength: 4096,
  maxTokens: 4096,
  completionMode: '对话' as '对话' | '补全',
  agentThought: '不支持' as '支持' | '不支持',
  functionCalling: '不支持' as '支持' | '不支持',
  structuredOutput: '不支持' as '支持' | '不支持',
  systemPromptSeparator: '\n\n'
})

const completionModeOptions = [
  { label: '对话', value: '对话' },
  { label: '补全', value: '补全' }
]

const supportOptions = [
  { label: '支持', value: '支持' },
  { label: '不支持', value: '不支持' }
]

// 监听提供商变化，加载配置
watch(() => props.providerId, (newId) => {
  if (newId) {
    loadProviderConfig()
  }
}, { immediate: true })

// 加载提供商配置
function loadProviderConfig() {
  if (!provider.value) return

  const config = provider.value.defaultConfig

  form.value = {
    apiKey: provider.value.apiKey,
    baseUrl: provider.value.baseUrl,
    timeout: config.timeout,
    maxRetries: config.maxRetries,
    contextLength: config.contextLength,
    maxTokens: config.maxTokens,
    completionMode: config.completionMode,
    agentThought: config.agentThought,
    functionCalling: config.functionCalling,
    structuredOutput: config.structuredOutput,
    systemPromptSeparator: config.systemPromptSeparator
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
      maxRetries: form.value.maxRetries,
      contextLength: form.value.contextLength,
      maxTokens: form.value.maxTokens,
      completionMode: form.value.completionMode,
      agentThought: form.value.agentThought,
      functionCalling: form.value.functionCalling,
      structuredOutput: form.value.structuredOutput,
      systemPromptSeparator: form.value.systemPromptSeparator
    })

    if (success) {
      emit('config-updated')
      isOpen.value = false
      Notify.create({
        type: 'positive',
        message: '配置已更新',
        position: 'top'
      })
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
  padding: 16px;
  margin: 0;
}

.config-panels {
  background: transparent;
  min-height: 400px;
  
  :deep(.q-tab-panel) {
    padding: 16px;
  }
}

.text-subtitle2 {
  color: var(--q-primary);
  font-weight: 600;
  font-size: 14px;
}

.config-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--q-dark-5);
  border-radius: 8px;

  .summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--q-dark-10);

    &:last-child {
      border-bottom: none;
    }
  }

  .summary-label {
    font-size: 14px;
    color: var(--q-dark-60);
  }

  .summary-value {
    font-size: 14px;
    font-weight: 500;
    color: var(--q-dark);
  }
}
</style>

