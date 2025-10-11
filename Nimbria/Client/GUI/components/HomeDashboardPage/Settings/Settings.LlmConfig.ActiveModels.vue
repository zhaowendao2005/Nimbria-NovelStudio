<template>
  <div class="active-models">
    <div class="active-models__description">
      <q-icon name="info" size="20px" color="primary" />
      <span>为每种模型类型选择一个默认的活动模型。你可以在此处通过下拉框选择，或在"提供商列表"Tab中点击模型chip来设置。</span>
    </div>

    <!-- 模型类型列表 -->
    <div class="active-models__list">
      <q-card
        v-for="modelType in modelTypes"
        :key="modelType"
        flat
        bordered
        class="model-type-card"
      >
        <q-card-section>
          <div class="model-type-card__header">
            <div class="model-type-card__title">
              <q-icon :name="getModelTypeIcon(modelType)" size="24px" color="primary" />
              <span>{{ modelType }}</span>
            </div>
            <q-badge
              v-if="activeModels[modelType]"
              color="positive"
              label="已设置"
            />
          </div>

          <!-- 当前选中的模型 -->
          <div v-if="activeModels[modelType]" class="model-type-card__current">
            <div class="current-model">
              <div class="current-model__info">
                <div class="current-model__name">{{ getModelDisplayName(activeModels[modelType]) }}</div>
                <div class="current-model__provider">{{ getProviderDisplayName(activeModels[modelType]) }}</div>
              </div>
              <q-btn
                flat
                dense
                round
                icon="close"
                size="sm"
                color="grey-7"
                @click="handleClearModel(modelType)"
              >
                <q-tooltip>清除</q-tooltip>
              </q-btn>
            </div>
          </div>

          <!-- 选择器 -->
          <div class="model-type-card__selector">
            <q-select
              :model-value="activeModels[modelType] || null"
              :options="getAvailableModels(modelType)"
              label="选择模型"
              outlined
              dense
              emit-value
              map-options
              option-value="value"
              option-label="label"
              @update:model-value="(value) => handleSelectModel(modelType, value)"
            >
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">
                    暂无可用模型
                  </q-item-section>
                </q-item>
              </template>

              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar>
                    <div class="option-logo">{{ scope.opt.logo }}</div>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                    <q-item-label caption>{{ scope.opt.provider }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>
        </q-card-section>
      </q-card>

      <!-- 空状态 -->
      <div v-if="modelTypes.length === 0" class="active-models__empty">
        <q-icon name="block" size="64px" color="grey-4" />
        <div class="empty-text">暂无可用的模型类型</div>
        <div class="empty-hint">请先添加并激活提供商</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ModelProvider, ActiveModelConfig } from '@stores/settings'
import { parseModelId } from '@stores/settings'

const props = defineProps<{
  activeModels: ActiveModelConfig
  providers: ModelProvider[]
}>()

const emit = defineEmits<{
  'set-active': [payload: { modelType: string; providerId: string; modelName: string }]
  'clear-active': [modelType: string]
}>()

// 获取所有可用的模型类型
const modelTypes = computed(() => {
  const types = new Set<string>()
  
  props.providers
    .filter(p => p.status === 'active')
    .forEach(provider => {
      provider.supportedModels.forEach(modelGroup => {
        types.add(modelGroup.type)
      })
    })
  
  return Array.from(types).sort()
})

// 获取特定模型类型的可用模型选项
function getAvailableModels(modelType: string) {
  const options: Array<{
    value: string
    label: string
    provider: string
    logo: string
  }> = []

  props.providers
    .filter(p => p.status === 'active')
    .forEach(provider => {
      const modelGroup = provider.supportedModels.find(g => g.type === modelType)
      if (modelGroup) {
        modelGroup.models.forEach(model => {
          options.push({
            value: `${provider.id}::${model.name}`, // 使用::分隔符
            label: (model as any).displayName || model.name,
            provider: provider.displayName,
            logo: provider.logo || '🤖'
          })
        })
      }
    })

  return options
}

// 获取模型显示名称
function getModelDisplayName(modelId: string): string {
  try {
    const { providerId, modelName } = parseModelId(modelId)
    const provider = props.providers.find(p => p.id === providerId)
    if (provider) {
      for (const modelGroup of provider.supportedModels) {
        const model = modelGroup.models.find(m => m.name === modelName)
        if (model) {
          return (model as any).displayName || model.name
        }
      }
    }
    return modelName
  } catch {
    return modelId
  }
}

// 获取提供商显示名称
function getProviderDisplayName(modelId: string): string {
  try {
    const { providerId } = parseModelId(modelId)
    const provider = props.providers.find(p => p.id === providerId)
    return provider?.displayName || providerId
  } catch {
    return '未知'
  }
}

// 获取模型类型图标
function getModelTypeIcon(modelType: string): string {
  const iconMap: Record<string, string> = {
    'LLM': 'psychology',
    'TEXT_EMBEDDING': 'text_fields',
    'IMAGE_GENERATION': 'image',
    'SPEECH_TO_TEXT': 'mic',
    'TEXT_TO_SPEECH': 'volume_up',
    'RERANK': 'sort',
    'SPEECH2TEXT': 'mic',
    'TTS': 'volume_up'
  }
  return iconMap[modelType] || 'memory'
}

// 选择模型
function handleSelectModel(modelType: string, modelId: string | null) {
  if (!modelId) return
  
  try {
    const { providerId, modelName } = parseModelId(modelId)
    emit('set-active', { modelType, providerId, modelName })
  } catch (error) {
    console.error('Invalid model ID:', modelId, error)
  }
}

// 清除模型
function handleClearModel(modelType: string) {
  emit('clear-active', modelType)
}
</script>

<style lang="scss" scoped>
.active-models {
  width: 100%;

  &__description {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--q-primary-1);
    border-radius: 8px;
    margin-bottom: 24px;
    font-size: 14px;
    color: var(--q-dark-70);
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 16px;
  }

  &__empty {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    gap: 12px;

    .empty-text {
      font-size: 16px;
      font-weight: 500;
      color: var(--q-dark-50);
    }

    .empty-hint {
      font-size: 14px;
      color: var(--q-dark-40);
    }
  }
}

.model-type-card {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: var(--q-dark);
  }

  &__current {
    margin-bottom: 16px;
    padding: 12px;
    background: var(--q-positive-1);
    border-radius: 8px;
    border: 1px solid var(--q-positive-3);
  }

  &__selector {
    width: 100%;
  }
}

.current-model {
  display: flex;
  justify-content: space-between;
  align-items: center;

  &__info {
    flex: 1;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--q-dark);
    margin-bottom: 4px;
  }

  &__provider {
    font-size: 12px;
    color: var(--q-dark-50);
  }
}

.option-logo {
  font-size: 24px;
  line-height: 1;
}
</style>
