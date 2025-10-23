<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">添加提供商</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <!-- 添加模式切换 -->
        <q-tabs
          v-model="addMode"
          dense
          class="text-grey"
          active-color="primary"
          indicator-color="primary"
          align="justify"
        >
          <q-tab name="quick" label="快捷添加" />
          <q-tab name="custom" label="自定义添加" />
          <q-tab name="wizard" label="向导添加" />
        </q-tabs>

        <q-separator class="q-my-md" />

        <q-tab-panels v-model="addMode" animated>
          <!-- 快捷添加面板 -->
          <q-tab-panel name="quick">
            <div class="quick-add-panel">
              <p class="text-caption text-grey-7">选择常用的提供商快速配置</p>
              
              <q-btn
                outline
                color="primary"
                class="full-width q-mb-sm"
                @click="handleQuickAdd('openai')"
              >
                <div class="quick-btn-content">
                  <q-icon name="dns" size="24px" class="quick-btn-icon" />
                  <span>OpenAI</span>
                </div>
              </q-btn>

              <q-btn
                outline
                color="primary"
                class="full-width q-mb-sm"
                @click="handleQuickAdd('anthropic')"
              >
                <div class="quick-btn-content">
                  <q-icon name="psychology" size="24px" class="quick-btn-icon" />
                  <span>Anthropic</span>
                </div>
              </q-btn>

              <q-btn
                outline
                color="primary"
                class="full-width q-mb-sm"
                @click="handleQuickAdd('azure')"
              >
                <div class="quick-btn-content">
                  <q-icon name="cloud" size="24px" class="quick-btn-icon" />
                  <span>Azure OpenAI</span>
                </div>
              </q-btn>

              <q-btn
                outline
                color="primary"
                class="full-width"
                @click="handleQuickAdd('ollama')"
              >
                <div class="quick-btn-content">
                  <q-icon name="computer" size="24px" class="quick-btn-icon" />
                  <span>Ollama (本地)</span>
                </div>
              </q-btn>
            </div>
          </q-tab-panel>

          <!-- 自定义添加面板 -->
          <q-tab-panel name="custom">
            <q-form @submit="handleSubmit" class="custom-form">
              <q-input
                v-model="form.displayName"
                label="显示名称 *"
                outlined
                dense
                :rules="[val => !!val || '请输入显示名称']"
              />

              <q-input
                v-model="form.id"
                label="Provider ID *"
                outlined
                dense
                hint="唯一标识符，小写字母和连字符"
                :rules="[
                  val => !!val || '请输入Provider ID',
                  val => /^[a-z0-9-]+$/.test(val) || 'ID只能包含小写字母、数字和连字符'
                ]"
              />

              <q-input
                v-model="form.baseUrl"
                label="Base URL *"
                outlined
                dense
                placeholder="https://api.example.com/v1"
                :rules="[
                  val => !!val || '请输入Base URL',
                  val => val.startsWith('http') || 'URL必须以http://或https://开头'
                ]"
              />

              <q-input
                v-model="form.apiKey"
                label="API Key"
                type="password"
                outlined
                dense
                hint="本地服务（如Ollama）可留空"
              />

              <q-input
                v-model="form.description"
                label="描述"
                type="textarea"
                outlined
                dense
                rows="3"
              />

              <div class="form-actions">
                <q-btn
                  label="取消"
                  flat
                  v-close-popup
                />
                <q-btn
                  label="添加"
                  type="submit"
                  color="primary"
                  :loading="loading"
                />
              </div>
            </q-form>
          </q-tab-panel>

          <!-- 向导添加面板 -->
          <q-tab-panel name="wizard">
            <q-stepper
              v-model="wizardStep"
              vertical
              color="primary"
              animated
              class="wizard-stepper"
            >
              <!-- Step 1: 基础信息 -->
              <q-step
                :name="1"
                title="基础信息"
                icon="info"
                :done="wizardStep > 1"
              >
                <div class="text-body2 text-grey-7 q-mb-md">
                  输入提供商的基本信息以建立连接
                </div>

                <q-input
                  v-model="wizardForm.name"
                  label="名称 *"
                  outlined
                  dense
                  hint="用于内部标识的名称"
                  class="q-mb-md"
                />

                <q-input
                  v-model="wizardForm.displayName"
                  label="显示名称 *"
                  outlined
                  dense
                  hint="在界面上显示的名称"
                  class="q-mb-md"
                />

                <q-input
                  v-model="wizardForm.apiKey"
                  label="API Key"
                  type="password"
                  outlined
                  dense
                  hint="本地服务（如Ollama）可留空"
                  class="q-mb-md"
                />

                <q-input
                  v-model="wizardForm.baseUrl"
                  label="Base URL *"
                  outlined
                  dense
                  placeholder="https://api.example.com/v1"
                  class="q-mb-md"
                />

                <q-stepper-navigation>
                  <q-btn
                    @click="handleWizardNext"
                    color="primary"
                    label="下一步"
                    :disable="!isStep1Valid"
                  />
                </q-stepper-navigation>
              </q-step>

              <!-- Step 2: 测试连接 -->
              <q-step
                :name="2"
                title="测试连接"
                icon="link"
                :done="wizardStep > 2"
              >
                <div v-if="testStatus === 'idle'" class="test-idle">
                  <q-icon name="wifi_tethering" size="64px" color="grey-5" />
                  <div class="text-h6 q-mt-md">准备测试连接</div>
                  <div class="text-body2 text-grey-7 q-mt-sm">
                    点击下方按钮测试与提供商的连接并发现可用模型
                  </div>
                </div>

                <div v-else-if="testStatus === 'testing'" class="test-loading">
                  <q-spinner color="primary" size="64px" />
                  <div class="text-h6 q-mt-md">正在测试连接...</div>
                  <div class="text-body2 text-grey-7 q-mt-sm">
                    验证 API Key 并检测可用模型
                  </div>
                </div>

                <div v-else-if="testStatus === 'success'" class="test-success">
                  <q-icon name="check_circle" size="64px" color="positive" />
                  <div class="text-h6 q-mt-md">连接成功！</div>
                  <div class="text-body2 text-grey-7 q-mt-sm q-mb-md">
                    发现 {{ discoveredModelsCount }} 个可用模型
                  </div>

                  <div class="discovered-models-summary">
                    <div
                      v-for="group in discoveredModels"
                      :key="group.type"
                      class="model-type-summary"
                    >
                      <q-chip color="primary" text-color="white" dense>
                        {{ group.type }}
                      </q-chip>
                      <span class="model-count">{{ group.models.length }} 个</span>
                    </div>
                  </div>
                </div>

                <div v-else-if="testStatus === 'failed'" class="test-failed">
                  <q-icon name="error" size="64px" color="negative" />
                  <div class="text-h6 q-mt-md">连接失败</div>
                  <div class="text-body2 text-negative q-mt-sm">
                    {{ testError }}
                  </div>
                </div>

                <q-stepper-navigation>
                  <q-btn
                    v-if="testStatus === 'idle' || testStatus === 'failed'"
                    @click="handleTestConnection"
                    color="primary"
                    label="测试连接"
                    icon="link"
                    :loading="testStatus === 'testing'"
                  />
                  <q-btn
                    v-if="testStatus === 'testing'"
                    flat
                    color="grey"
                    label="正在测试..."
                    disable
                  />
                  <q-btn
                    v-if="testStatus === 'success'"
                    @click="wizardStep = 3"
                    color="primary"
                    label="下一步"
                  />
                  <q-btn
                    @click="wizardStep = 1"
                    flat
                    color="primary"
                    label="上一步"
                    class="q-ml-sm"
                  />
                </q-stepper-navigation>
              </q-step>

              <!-- Step 3: 选择模型 -->
              <q-step
                :name="3"
                title="选择模型"
                icon="checklist"
                :done="wizardStep > 3"
              >
                <div class="text-body2 text-grey-7 q-mb-md">
                  选择要启用的模型（已选 {{ selectedModelsCount }} 个）
                </div>

                <div
                  v-for="group in discoveredModels"
                  :key="group.type"
                  class="model-group q-mb-md"
                >
                  <div class="model-group-header">
                    <span class="model-group-title">{{ group.type }}</span>
                    <q-space />
                    <q-btn
                      flat
                      dense
                      size="sm"
                      label="全选"
                      @click="selectAllModels(group.type)"
                    />
                    <q-btn
                      flat
                      dense
                      size="sm"
                      label="清空"
                      @click="clearModels(group.type)"
                    />
                  </div>

                  <div class="model-list">
                    <q-checkbox
                      v-for="model in group.models"
                      :key="model.name"
                      v-model="selectedModels[group.type]"
                      :val="model.name"
                      :label="model.name"
                      dense
                      class="model-checkbox"
                    />
                  </div>
                </div>

                <q-stepper-navigation>
                  <q-btn
                    @click="wizardStep = 4"
                    color="primary"
                    label="下一步"
                    :disable="selectedModelsCount === 0"
                  />
                  <q-btn
                    @click="wizardStep = 2"
                    flat
                    color="primary"
                    label="上一步"
                    class="q-ml-sm"
                  />
                </q-stepper-navigation>
              </q-step>

              <!-- Step 4: 高级配置（可选） -->
              <q-step
                :name="4"
                title="高级配置"
                icon="tune"
              >
                <div class="text-body2 text-grey-7 q-mb-md">
                  配置提供商的默认设置（可跳过）
                </div>

                <q-input
                  v-model.number="wizardForm.contextLength"
                  label="上下文长度 (tokens)"
                  type="number"
                  outlined
                  dense
                  class="q-mb-md"
                />

                <q-input
                  v-model.number="wizardForm.maxTokens"
                  label="最大输出 (tokens)"
                  type="number"
                  outlined
                  dense
                  class="q-mb-md"
                />

                <q-select
                  v-model="wizardForm.completionMode"
                  :options="completionModeOptions"
                  label="完成模式"
                  outlined
                  dense
                  emit-value
                  map-options
                  class="q-mb-md"
                />

                <q-stepper-navigation>
                  <q-btn
                    @click="handleWizardComplete"
                    color="primary"
                    label="完成"
                    :loading="loading"
                  />
                  <q-btn
                    @click="handleWizardComplete"
                    flat
                    color="primary"
                    label="跳过并完成"
                    class="q-ml-sm"
                  />
                  <q-btn
                    @click="wizardStep = 3"
                    flat
                    color="grey"
                    label="上一步"
                    class="q-ml-sm"
                  />
                </q-stepper-navigation>
              </q-step>
            </q-stepper>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useSettingsLlmStore } from '@stores/settings'
import { DEFAULT_MODEL_CONFIG } from '@stores/settings'
import { Notify } from 'quasar'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'provider-added': []
}>()

const llmStore = useSettingsLlmStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const addMode = ref<'quick' | 'custom' | 'wizard'>('quick')
const loading = ref(false)

// 快捷/自定义添加的表单
const form = ref({
  id: '',
  displayName: '',
  baseUrl: '',
  apiKey: '',
  description: ''
})

// 向导模式状态
const wizardStep = ref(1)
const testStatus = ref<'idle' | 'testing' | 'success' | 'failed'>('idle')
const testError = ref('')
const discoveredModels = ref<Array<{ type: string; models: Array<{ name: string; isAvailable: boolean }> }>>([])
const selectedModels = ref<Record<string, string[]>>({})

// 向导表单
const wizardForm = ref({
  name: '',
  displayName: '',
  apiKey: '',
  baseUrl: '',
  contextLength: 4096,
  maxTokens: 4096,
  completionMode: '对话' as '对话' | '补全',
  agentThought: '不支持' as '支持' | '不支持',
  functionCalling: '不支持' as '支持' | '不支持',
  structuredOutput: '不支持' as '支持' | '不支持'
})

const completionModeOptions = [
  { label: '对话', value: '对话' },
  { label: '补全', value: '补全' }
]

// 向导Step1验证
const isStep1Valid = computed(() => {
  return !!(
    wizardForm.value.name &&
    wizardForm.value.displayName &&
    wizardForm.value.baseUrl
  )
})

// 发现的模型总数
const discoveredModelsCount = computed(() => {
  return discoveredModels.value.reduce((count, group) => count + group.models.length, 0)
})

// 已选模型总数
const selectedModelsCount = computed(() => {
  return Object.values(selectedModels.value).reduce(
    (count, models) => count + models.length,
    0
  )
})

// 重置表单
function resetForm() {
  form.value = {
    id: '',
    displayName: '',
    baseUrl: '',
    apiKey: '',
    description: ''
  }
  addMode.value = 'quick'
  resetWizard()
}

// 监听对话框关闭，重置表单
watch(isOpen, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})

// 快捷添加
function handleQuickAdd(type: string) {
  // 重置向导状态
  resetWizard()
  
  switch (type) {
    case 'openai':
      wizardForm.value.name = 'openai'
      wizardForm.value.displayName = 'OpenAI'
      wizardForm.value.baseUrl = 'https://api.openai.com/v1'
      wizardForm.value.apiKey = ''
      break
    case 'anthropic':
      wizardForm.value.name = 'anthropic'
      wizardForm.value.displayName = 'Anthropic'
      wizardForm.value.baseUrl = 'https://api.anthropic.com/v1'
      wizardForm.value.apiKey = ''
      break
    case 'azure':
      wizardForm.value.name = 'azure-openai'
      wizardForm.value.displayName = 'Azure OpenAI'
      wizardForm.value.baseUrl = 'https://YOUR_RESOURCE.openai.azure.com'
      wizardForm.value.apiKey = ''
      break
    case 'ollama':
      wizardForm.value.name = 'ollama'
      wizardForm.value.displayName = 'Ollama'
      wizardForm.value.baseUrl = 'http://localhost:11434/v1'
      wizardForm.value.apiKey = 'ollama'
      break
  }
  
  addMode.value = 'wizard'
}

// 提交表单
async function handleSubmit() {
  loading.value = true
  
  try {
    const newProvider = await llmStore.addProvider({
      id: form.value.id,
      name: form.value.id,
      displayName: form.value.displayName,
      description: form.value.description,
      status: 'available',
      apiKey: form.value.apiKey,
      baseUrl: form.value.baseUrl,
      defaultConfig: { ...DEFAULT_MODEL_CONFIG },
      supportedModels: []
    })

    if (newProvider) {
      emit('provider-added')
      isOpen.value = false
    } else {
      Notify.create({
        type: 'negative',
        message: '添加提供商失败',
        position: 'top'
      })
    }
  } catch (error) {
    console.error('Add provider error:', error)
    Notify.create({
      type: 'negative',
      message: `添加失败: ${error instanceof Error ? error.message : '未知错误'}`,
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

// ==================== 向导模式方法 ====================

// 向导Step1 - 下一步
function handleWizardNext() {
  wizardStep.value = 2
}

// 向导Step2 - 测试连接
async function handleTestConnection() {
  testStatus.value = 'testing'
  testError.value = ''
  
  try {
    const result = await llmStore.testNewProviderConnection({
      baseUrl: wizardForm.value.baseUrl,
      apiKey: wizardForm.value.apiKey
    })
    
    if (result.success && result.discoveredModels) {
      testStatus.value = 'success'
      discoveredModels.value = result.discoveredModels
      
      // 初始化selectedModels
      selectedModels.value = {}
      result.discoveredModels.forEach(group => {
        selectedModels.value[group.type] = []
      })
    } else {
      testStatus.value = 'failed'
      testError.value = result.error || '连接测试失败'
    }
  } catch (error) {
    testStatus.value = 'failed'
    testError.value = error instanceof Error ? error.message : '连接测试失败'
  }
}

// 向导Step3 - 全选模型
function selectAllModels(modelType: string) {
  const group = discoveredModels.value.find(g => g.type === modelType)
  if (group) {
    selectedModels.value[modelType] = group.models.map(m => m.name)
  }
}

// 向导Step3 - 清空模型
function clearModels(modelType: string) {
  selectedModels.value[modelType] = []
}

// 向导Step4 - 完成添加
async function handleWizardComplete() {
  loading.value = true
  
  try {
    // 生成唯一ID
    const providerId = `provider_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    // 构建supportedModels
    const supportedModels: Array<{ type: string; models: Array<{ name: string }> }> = []
    Object.keys(selectedModels.value).forEach(modelType => {
      const modelNames = selectedModels.value[modelType]
      if (modelNames.length > 0) {
        supportedModels.push({
          type: modelType,
          models: modelNames.map(name => ({ name }))
        })
      }
    })

    // 添加提供商
    const newProvider = await llmStore.addProvider({
      id: providerId,
      name: wizardForm.value.name,
      displayName: wizardForm.value.displayName,
      description: `通过向导添加的提供商`,
      status: 'active',
      apiKey: wizardForm.value.apiKey,
      baseUrl: wizardForm.value.baseUrl,
      defaultConfig: {
        timeout: 30000,
        maxRetries: 3,
        contextLength: wizardForm.value.contextLength,
        maxTokens: wizardForm.value.maxTokens,
        completionMode: wizardForm.value.completionMode,
        agentThought: wizardForm.value.agentThought,
        functionCalling: wizardForm.value.functionCalling,
        structuredOutput: wizardForm.value.structuredOutput,
        systemPromptSeparator: '\n\n'
      },
      supportedModels: supportedModels as any
    })

    if (newProvider) {
      Notify.create({
        type: 'positive',
        message: `成功添加提供商: ${wizardForm.value.displayName}`,
        caption: `已启用 ${selectedModelsCount.value} 个模型`,
        position: 'top'
      })
      emit('provider-added')
      isOpen.value = false
      
      // 重置向导
      resetWizard()
    } else {
      Notify.create({
        type: 'negative',
        message: '添加提供商失败',
        position: 'top'
      })
    }
  } catch (error) {
    console.error('Wizard add provider error:', error)
    Notify.create({
      type: 'negative',
      message: `添加失败: ${error instanceof Error ? error.message : '未知错误'}`,
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

// 重置向导
function resetWizard() {
  wizardStep.value = 1
  testStatus.value = 'idle'
  testError.value = ''
  discoveredModels.value = []
  selectedModels.value = {}
  wizardForm.value = {
    name: '',
    displayName: '',
    apiKey: '',
    baseUrl: '',
    contextLength: 4096,
    maxTokens: 4096,
    completionMode: '对话',
    agentThought: '不支持',
    functionCalling: '不支持',
    structuredOutput: '不支持'
  }
}
</script>

<style lang="scss" scoped>
.quick-add-panel {
  padding: 8px 0;
}

.quick-btn-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  justify-content: center;
  padding: 8px 0;
}

.quick-btn-logo {
  font-size: 24px;
  line-height: 1;
}

.custom-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

// ==================== 向导模式样式 ====================

.wizard-stepper {
  box-shadow: none;
  
  :deep(.q-stepper__step-inner) {
    padding: 20px;
  }
}

.test-idle,
.test-loading,
.test-success,
.test-failed {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  text-align: center;
  padding: 24px;
}

.discovered-models-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  padding: 16px;
  background: var(--q-dark-5);
  border-radius: 8px;
}

.model-type-summary {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-count {
  font-size: 14px;
  color: var(--q-dark-60);
  font-weight: 500;
}

.model-group {
  border: 1px solid var(--q-dark-10);
  border-radius: 8px;
  padding: 12px;
  background: var(--q-dark-3);
}

.model-group-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--q-dark-10);
}

.model-group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--q-primary);
}

.model-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}

.model-checkbox {
  :deep(.q-checkbox__label) {
    font-size: 13px;
    color: var(--q-dark);
  }
}
</style>

