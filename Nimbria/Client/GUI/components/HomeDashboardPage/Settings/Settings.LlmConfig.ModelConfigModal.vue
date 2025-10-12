<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 650px; max-width: 800px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">配置模型</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section v-if="provider && modelData">
        <!-- 模型信息卡片 -->
        <div class="model-info">
          <div class="model-info__icon">
            <q-icon name="psychology" size="32px" color="primary" />
          </div>
          <div class="model-info__details">
            <div class="model-info__name">{{ modelDisplayName }}</div>
            <div class="model-info__id">{{ modelName }}</div>
            <div class="model-info__provider">
              <q-icon name="dns" size="14px" class="q-mr-xs" />
              {{ provider.displayName }}
            </div>
          </div>
          <q-badge color="primary" :label="modelType" />
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
          <q-tab name="basic" label="基本信息" icon="info" />
          <q-tab name="advanced" label="高级配置" icon="tune" />
          <q-tab name="inheritance" label="继承设置" icon="account_tree" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="activeTab" animated class="config-panels">
          <!-- 基本信息面板 -->
          <q-tab-panel name="basic">
            <q-form class="config-form">
              <div class="text-body2 text-grey-7 q-mb-md">
                <q-icon name="info" color="primary" class="q-mr-xs" />
                设置模型的显示名称和基本信息
              </div>

              <q-input
                v-model="form.displayName"
                label="显示名称"
                outlined
                dense
                hint="自定义模型的显示名称，留空则使用模型ID"
                clearable
              />

              <q-separator class="q-my-md" />

              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">模型标识:</span>
                  <span class="info-value">{{ modelName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">提供商:</span>
                  <span class="info-value">{{ provider.displayName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">类型:</span>
                  <span class="info-value">{{ modelType }}</span>
                </div>
              </div>
            </q-form>
          </q-tab-panel>

          <!-- 高级配置面板 -->
          <q-tab-panel name="advanced">
            <q-form class="config-form">
              <div class="use-provider-toggle">
                <q-toggle
                  v-model="useProviderDefaults"
                  label="使用提供商默认配置"
                  color="primary"
                  @update:model-value="handleUseDefaultsToggle"
                />
                <q-icon name="help_outline" size="18px" color="grey-6" class="q-ml-xs">
                  <q-tooltip>
                    开启后，此模型将使用提供商的默认配置，无法单独修改
                  </q-tooltip>
                </q-icon>
              </div>

              <q-separator class="q-my-md" />

              <div class="text-subtitle2 q-mb-md">模型能力设置</div>

              <div class="config-field">
                <q-input
                  v-model.number="form.contextLength"
                  label="上下文长度 (tokens)"
                  type="number"
                  outlined
                  dense
                  :readonly="useProviderDefaults"
                  hint="模型支持的最大上下文长度"
                >
                  <template v-slot:append>
                    <q-icon
                      :name="getInheritIcon('contextLength')"
                      :color="getInheritColor('contextLength')"
                      size="18px"
                    >
                      <q-tooltip>{{ getInheritTooltip('contextLength') }}</q-tooltip>
                    </q-icon>
                  </template>
                </q-input>
              </div>

              <div class="config-field">
                <q-input
                  v-model.number="form.maxTokens"
                  label="最大输出 (tokens)"
                  type="number"
                  outlined
                  dense
                  :readonly="useProviderDefaults"
                  hint="模型单次生成的最大token数"
                >
                  <template v-slot:append>
                    <q-icon
                      :name="getInheritIcon('maxTokens')"
                      :color="getInheritColor('maxTokens')"
                      size="18px"
                    >
                      <q-tooltip>{{ getInheritTooltip('maxTokens') }}</q-tooltip>
                    </q-icon>
                  </template>
                </q-input>
              </div>

              <div class="config-field">
                <q-select
                  v-model="form.completionMode"
                  :options="completionModeOptions"
                  label="完成模式"
                  outlined
                  dense
                  emit-value
                  map-options
                  :readonly="useProviderDefaults"
                >
                  <template v-slot:append>
                    <q-icon
                      :name="getInheritIcon('completionMode')"
                      :color="getInheritColor('completionMode')"
                      size="18px"
                    >
                      <q-tooltip>{{ getInheritTooltip('completionMode') }}</q-tooltip>
                    </q-icon>
                  </template>
                </q-select>
              </div>

              <q-separator class="q-my-md" />

              <div class="text-subtitle2 q-mb-md">高级能力支持</div>

              <div class="config-field">
                <q-select
                  v-model="form.agentThought"
                  :options="supportOptions"
                  label="Agent思维"
                  outlined
                  dense
                  emit-value
                  map-options
                  :readonly="useProviderDefaults"
                >
                  <template v-slot:append>
                    <q-icon
                      :name="getInheritIcon('agentThought')"
                      :color="getInheritColor('agentThought')"
                      size="18px"
                    >
                      <q-tooltip>{{ getInheritTooltip('agentThought') }}</q-tooltip>
                    </q-icon>
                  </template>
                </q-select>
              </div>

              <div class="config-field">
                <q-select
                  v-model="form.functionCalling"
                  :options="supportOptions"
                  label="函数调用"
                  outlined
                  dense
                  emit-value
                  map-options
                  :readonly="useProviderDefaults"
                >
                  <template v-slot:append>
                    <q-icon
                      :name="getInheritIcon('functionCalling')"
                      :color="getInheritColor('functionCalling')"
                      size="18px"
                    >
                      <q-tooltip>{{ getInheritTooltip('functionCalling') }}</q-tooltip>
                    </q-icon>
                  </template>
                </q-select>
              </div>

              <div class="config-field">
                <q-select
                  v-model="form.structuredOutput"
                  :options="supportOptions"
                  label="结构化输出"
                  outlined
                  dense
                  emit-value
                  map-options
                  :readonly="useProviderDefaults"
                >
                  <template v-slot:append>
                    <q-icon
                      :name="getInheritIcon('structuredOutput')"
                      :color="getInheritColor('structuredOutput')"
                      size="18px"
                    >
                      <q-tooltip>{{ getInheritTooltip('structuredOutput') }}</q-tooltip>
                    </q-icon>
                  </template>
                </q-select>
              </div>
            </q-form>
          </q-tab-panel>

          <!-- 继承设置面板 -->
          <q-tab-panel name="inheritance">
            <div class="text-body2 text-grey-7 q-mb-md">
              <q-icon name="info" color="primary" class="q-mr-xs" />
              查看模型配置的继承状态，绿色表示继承自提供商，蓝色表示自定义配置
            </div>

            <q-table
              :rows="inheritanceRows"
              :columns="inheritanceColumns"
              row-key="field"
              flat
              bordered
              :pagination="{ rowsPerPage: 0 }"
              hide-pagination
              class="inheritance-table"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge
                    :color="getInheritColor(props.row.fieldKey)"
                    :icon="getInheritIcon(props.row.fieldKey)"
                  >
                    <template v-if="getFieldState(props.row.fieldKey) === 'modified'">
                      待保存
                    </template>
                    <template v-else-if="getFieldState(props.row.fieldKey) === 'customized'">
                      自定义
                    </template>
                    <template v-else>
                      继承
                    </template>
                  </q-badge>
                  <q-tooltip>{{ getInheritTooltip(props.row.fieldKey) }}</q-tooltip>
                </q-td>
              </template>

              <template v-slot:body-cell-providerValue="props">
                <q-td :props="props">
                  <span class="text-grey-7">{{ props.row.providerValue }}</span>
                </q-td>
              </template>

              <template v-slot:body-cell-modelValue="props">
                <q-td :props="props">
                  <span :class="props.row.isInherited ? 'text-grey-5' : 'text-weight-bold'">
                    {{ props.row.modelValue }}
                  </span>
                </q-td>
              </template>

              <template v-slot:body-cell-effectiveValue="props">
                <q-td :props="props">
                  <span class="text-weight-medium">{{ props.row.effectiveValue }}</span>
                </q-td>
              </template>
            </q-table>

            <q-banner class="bg-blue-1 text-blue-9 q-mt-md" rounded dense>
              <template v-slot:avatar>
                <q-icon name="tips_and_updates" color="blue" />
              </template>
              <div class="text-body2">
                提示：实际使用的配置值显示在"有效值"列。未自定义的配置项将自动继承提供商的默认配置。
              </div>
            </q-banner>
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
          模型或提供商不存在
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useSettingsLlmStore } from '@stores/settings'
import { Notify } from 'quasar'
import type { ModelConfig } from '@stores/settings/types'

const props = defineProps<{
  modelValue: boolean
  providerId: string
  modelType: string
  modelName: string
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
const activeTab = ref('basic')
const useProviderDefaults = ref(true)

const provider = computed(() =>
  llmStore.providers.find(p => p.id === props.providerId)
)

const modelData = computed(() => {
  if (!provider.value) return null
  const modelGroup = provider.value.supportedModels.find((g: any) => g.type === props.modelType)
  return modelGroup?.models.find((m: any) => m.name === props.modelName)
})

const modelDisplayName = computed(() => {
  return (modelData.value as any)?.displayName || props.modelName
})

const form = ref({
  displayName: '',
  contextLength: 4096,
  maxTokens: 4096,
  completionMode: '对话' as '对话' | '补全',
  agentThought: '不支持' as '支持' | '不支持',
  functionCalling: '不支持' as '支持' | '不支持',
  structuredOutput: '不支持' as '支持' | '不支持',
  systemPromptSeparator: '\n\n'
})

// 🆕 保存原始配置，用于检测是否修改
const originalConfig = ref<typeof form.value | null>(null)

// 🆕 配置字段列表（用于遍历检查）
const configFields = [
  'contextLength',
  'maxTokens',
  'completionMode',
  'agentThought',
  'functionCalling',
  'structuredOutput',
  'systemPromptSeparator'
] as const

const completionModeOptions = [
  { label: '对话', value: '对话' },
  { label: '补全', value: '补全' }
]

const supportOptions = [
  { label: '支持', value: '支持' },
  { label: '不支持', value: '不支持' }
]

const inheritanceColumns = [
  { name: 'field', label: '配置项', field: 'field', align: 'left' as const },
  { name: 'status', label: '状态', field: 'status', align: 'center' as const },
  { name: 'providerValue', label: '提供商默认值', field: 'providerValue', align: 'center' as const },
  { name: 'modelValue', label: '模型自定义值', field: 'modelValue', align: 'center' as const },
  { name: 'effectiveValue', label: '有效值', field: 'effectiveValue', align: 'center' as const }
]

const inheritanceRows = computed(() => {
  if (!provider.value || !modelData.value) return []
  
  const providerConfig = provider.value.defaultConfig
  const modelConfig = (modelData.value as any).config || {}
  
  const fieldLabels: Record<string, string> = {
    contextLength: '上下文长度',
    maxTokens: '最大输出',
    completionMode: '完成模式',
    agentThought: 'Agent思维',
    functionCalling: '函数调用',
    structuredOutput: '结构化输出'
  }

  return Object.keys(fieldLabels).map(field => {
    const isInherited = !(field in modelConfig)
    const isModified = isFieldModified(field) // 🆕 检查是否被修改
    const providerValue = (providerConfig as any)[field]
    const modelValue = (modelConfig as any)[field] || '-'
    const effectiveValue = isInherited ? providerValue : modelValue

    return {
      field: fieldLabels[field],
      fieldKey: field, // 🆕 保存字段key，用于获取状态
      isInherited,
      isModified, // 🆕 添加修改状态
      providerValue: String(providerValue),
      modelValue: String(modelValue),
      effectiveValue: String(effectiveValue)
    }
  })
})

// 监听props变化，加载配置
watch(() => [props.providerId, props.modelType, props.modelName], () => {
  loadModelConfig()
}, { immediate: true })

// 加载模型配置
function loadModelConfig() {
  if (!provider.value || !modelData.value) return

  const effectiveConfig = llmStore.getEffectiveModelConfig(
    props.providerId,
    props.modelType,
    props.modelName
  )

  form.value = {
    displayName: (modelData.value as any).displayName || '',
    contextLength: effectiveConfig.contextLength,
    maxTokens: effectiveConfig.maxTokens,
    completionMode: effectiveConfig.completionMode,
    agentThought: effectiveConfig.agentThought,
    functionCalling: effectiveConfig.functionCalling,
    structuredOutput: effectiveConfig.structuredOutput,
    systemPromptSeparator: effectiveConfig.systemPromptSeparator
  }

  // 🆕 保存原始配置的深拷贝
  originalConfig.value = { ...form.value }

  // 检查是否有自定义配置
  const hasCustomConfig = modelData.value && (modelData.value as any).config
  useProviderDefaults.value = !hasCustomConfig
}

// 切换使用默认配置
function handleUseDefaultsToggle(value: boolean) {
  if (value) {
    // 切换到使用提供商默认，重新加载配置
    loadModelConfig()
  }
}

// 🆕 判断字段是否被修改（相对于原始值）
function isFieldModified(field: string): boolean {
  if (!originalConfig.value) return false
  return (form.value as any)[field] !== (originalConfig.value as any)[field]
}

// 🆕 获取字段状态：inherited（继承）| customized（已自定义）| modified（已修改未保存）
function getFieldState(field: string): 'inherited' | 'customized' | 'modified' {
  // 如果开启了"使用提供商默认"，所有字段都是继承状态
  if (useProviderDefaults.value) return 'inherited'
  
  // 检查是否被修改（相对于加载时的值）
  if (isFieldModified(field)) return 'modified'
  
  // 检查是否有保存的自定义配置，且值与提供商默认值不同
  const modelConfig = (modelData.value as any)?.config || {}
  const providerConfig = provider.value?.defaultConfig
  
  if (!providerConfig) return 'inherited'
  
  // 如果模型配置中没有这个字段，肯定是继承
  if (!(field in modelConfig)) return 'inherited'
  
  // 如果模型配置中有这个字段，但值和提供商默认值一样，也算继承
  const modelValue = (modelConfig as any)[field]
  const providerValue = (providerConfig as any)[field]
  
  return modelValue === providerValue ? 'inherited' : 'customized'
}

// 获取继承状态图标
function getInheritIcon(field: string): string {
  const state = getFieldState(field)
  const iconMap = {
    inherited: 'settings',      // ⚙️ 继承
    customized: 'save',          // 💾 已保存的自定义
    modified: 'edit_note'        // 📝 已修改未保存
  }
  return iconMap[state]
}

// 获取继承状态颜色
function getInheritColor(field: string): string {
  const state = getFieldState(field)
  const colorMap = {
    inherited: 'positive',  // 绿色 - 继承中
    customized: 'primary',  // 蓝色 - 已自定义
    modified: 'warning'     // 橙色 - 待保存
  }
  return colorMap[state]
}

// 获取继承状态提示
function getInheritTooltip(field: string): string {
  const state = getFieldState(field)
  const tooltipMap = {
    inherited: '继承自提供商（未修改）',
    customized: '模型自定义配置（已保存）',
    modified: '已修改，保存后生效'
  }
  return tooltipMap[state]
}

// 提交表单
async function handleSubmit() {
  loading.value = true
  
  try {
    // 1. 更新显示名称
    if (form.value.displayName.trim()) {
      await llmStore.setModelDisplayName(
        props.providerId,
        props.modelName,
        form.value.displayName.trim()
      )
    }

    // 2. 更新配置
    if (useProviderDefaults.value) {
      // 清空模型自定义配置（使用提供商默认）
      await llmStore.updateModelConfig(
        props.providerId,
        props.modelType,
        props.modelName,
        {}
      )
    } else {
      // 保存模型自定义配置
      await llmStore.updateModelConfig(
        props.providerId,
        props.modelType,
        props.modelName,
        {
          contextLength: form.value.contextLength,
          maxTokens: form.value.maxTokens,
          completionMode: form.value.completionMode,
          agentThought: form.value.agentThought,
          functionCalling: form.value.functionCalling,
          structuredOutput: form.value.structuredOutput,
          systemPromptSeparator: form.value.systemPromptSeparator,
          timeout: provider.value!.defaultConfig.timeout,
          maxRetries: provider.value!.defaultConfig.maxRetries
        }
      )
    }

    // 🆕 保存成功后，更新原始配置为当前值（清除"已修改"状态）
    originalConfig.value = { ...form.value }

    emit('config-updated')
    isOpen.value = false
    Notify.create({
      type: 'positive',
      message: '模型配置已更新',
      position: 'top'
    })
  } catch (error) {
    console.error('Update model config error:', error)
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
.model-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--q-dark-5);
  border-radius: 8px;

  &__icon {
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
    font-size: 12px;
    color: var(--q-dark-50);
    font-family: monospace;
    margin-bottom: 6px;
  }

  &__provider {
    display: flex;
    align-items: center;
    font-size: 13px;
    color: var(--q-dark-60);
  }
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-panels {
  background: transparent;
  min-height: 450px;
  
  :deep(.q-tab-panel) {
    padding: 16px;
  }
}

.text-subtitle2 {
  color: var(--q-primary);
  font-weight: 600;
  font-size: 14px;
}

.use-provider-toggle {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--q-warning-1);
  border-radius: 8px;
  border: 1px solid var(--q-warning-3);
}

.config-field {
  position: relative;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 16px;
  background: var(--q-dark-5);
  border-radius: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .info-label {
    font-size: 12px;
    color: var(--q-dark-50);
    font-weight: 500;
  }

  .info-value {
    font-size: 14px;
    color: var(--q-dark);
    font-family: monospace;
  }
}

.inheritance-table {
  :deep(.q-table__top),
  :deep(.q-table__bottom) {
    padding: 0;
  }

  :deep(thead tr th) {
    font-weight: 600;
    background: var(--q-dark-5);
  }

  :deep(tbody tr:nth-child(even)) {
    background: var(--q-dark-3);
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  margin: 0;
}
</style>

