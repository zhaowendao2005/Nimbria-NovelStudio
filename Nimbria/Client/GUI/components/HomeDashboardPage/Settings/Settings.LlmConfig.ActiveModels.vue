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
              v-if="getPreferredModelId(modelType)"
              color="positive"
              label="已设置"
            />
          </div>

          <!-- 当前首选模型 -->
          <div v-if="getPreferredModelId(modelType)" class="model-type-card__current">
            <div class="current-model">
              <div class="current-model__info">
                <div class="current-model__name">{{ getModelDisplayName(getPreferredModelId(modelType)!) }}</div>
                <div class="current-model__provider">{{ getProviderDisplayName(getPreferredModelId(modelType)!) }}</div>
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
                <q-tooltip>清除首选模型</q-tooltip>
              </q-btn>
            </div>
          </div>

          <!-- 选择器（从已选中的模型中选择首选） -->
          <div class="model-type-card__selector">
            <q-select
              :model-value="getPreferredModelId(modelType)"
              :options="getAvailableModels(modelType)"
              label="选择首选模型"
              outlined
              dense
              emit-value
              map-options
              option-value="value"
              option-label="label"
              @update:model-value="(value: string) => handleSelectModel(modelType, value)"
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
                    <q-icon :name="scope.opt.logo" size="24px" color="primary" />
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
import { useQuasar } from 'quasar'
import { useSettingsLlmStore } from '@stores/settings'
import type { ModelProvider } from '@stores/settings'

const $q = useQuasar()
const settingsStore = useSettingsLlmStore()

// 获取所有有选中模型的类型
const modelTypes = computed(() => {
  const types = new Set<string>()
  
  settingsStore.providers.forEach((provider: ModelProvider) => {
    if (provider.activeModels) {
      Object.keys(provider.activeModels).forEach(type => {
        const typeState = provider.activeModels![type]
        if (typeState && typeState.selectedModels.length > 0) {
          types.add(type)
        }
      })
    }
  })
  
  return Array.from(types).sort()
})

// 获取该类型下所有已选中的模型（从所有提供商）
function getAvailableModels(modelType: string) {
  const options: Array<{
    value: string
    label: string
    provider: string
    logo: string
  }> = []

  settingsStore.providers.forEach((provider: ModelProvider) => {
    if (provider.activeModels && provider.activeModels[modelType]) {
      const typeState = provider.activeModels[modelType]
      
      // 只显示selectedModels中的模型
      typeState.selectedModels.forEach((modelName: string) => {
        const modelGroup = provider.supportedModels.find((g: any) => g.type === modelType)
        const model = modelGroup?.models.find((m: any) => m.name === modelName)
        
        if (model) {
          options.push({
            value: `${provider.id}::${modelName}`,
            label: (model as any).displayName || model.name,
            provider: provider.displayName,
            logo: 'dns' // Quasar icon name
          })
        }
      })
    }
  })

  return options
}

// 获取当前首选模型的ID (providerId::modelName)
function getPreferredModelId(modelType: string): string | null {
  for (const provider of settingsStore.providers) {
    if (provider.activeModels && provider.activeModels[modelType]) {
      const typeState = provider.activeModels[modelType]
      if (typeState.preferredModel) {
        return `${provider.id}::${typeState.preferredModel}`
      }
    }
  }
  return null
}

// 获取模型显示名称
function getModelDisplayName(modelId: string | null): string {
  if (!modelId) return ''
  const [providerId, modelName] = modelId.split('::')
  const provider = settingsStore.providers.find((p: ModelProvider) => p.id === providerId)
  
  if (provider) {
    for (const modelGroup of provider.supportedModels) {
      const model = modelGroup.models.find((m: any) => m.name === modelName)
      if (model) {
        return (model as any).displayName || model.name
      }
    }
  }
  return modelName || ''
}

// 获取提供商显示名称
function getProviderDisplayName(modelId: string | null): string {
  if (!modelId) return ''
  const [providerId] = modelId.split('::')
  const provider = settingsStore.providers.find((p: ModelProvider) => p.id === providerId)
  return provider?.displayName || providerId || ''
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

// 选择首选模型
function handleSelectModel(modelType: string, modelId: string | null) {
  if (!modelId) return
  
  const [providerId, modelName] = modelId.split('::')
  const success = settingsStore.setPreferredModel(providerId, modelType, modelName)
  
  const displayName = getModelDisplayName(modelId)
  
  if (success) {
    $q.notify({
      type: 'positive',
      message: `已设置 ${modelType} 的首选模型为: ${displayName}`,
      position: 'top'
    })
  } else {
    $q.notify({
      type: 'negative',
      message: '设置首选模型失败',
      position: 'top'
    })
  }
}

// 清除首选模型
function handleClearModel(modelType: string) {
  // 找到该类型的首选模型所在的provider
  for (const provider of settingsStore.providers) {
    if (provider.activeModels && provider.activeModels[modelType]) {
      const typeState = provider.activeModels[modelType]
      if (typeState.preferredModel) {
        delete typeState.preferredModel
        
        $q.notify({
          type: 'positive',
          message: `已清除 ${modelType} 的首选模型`,
          position: 'top'
        })
        return
      }
    }
  }
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
