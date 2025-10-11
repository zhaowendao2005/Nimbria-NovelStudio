<template>
  <div class="provider-list">
    <!-- Loading状态 -->
    <div v-if="loading" class="provider-list__loading">
      <q-spinner color="primary" size="40px" />
      <div class="loading-text">加载中...</div>
    </div>

    <!-- 提供商列表 -->
    <div v-else-if="providers.length > 0" class="provider-list__content">
      <!-- 已激活的提供商 -->
      <div v-if="activeProviders.length > 0" class="provider-group">
        <div class="provider-group__title">
          <q-icon name="check_circle" color="positive" size="20px" />
          <span>已激活 ({{ activeProviders.length }})</span>
        </div>
        <SettingsLlmConfigProviderCard
          v-for="provider in activeProviders"
          :key="provider.id"
          :provider="provider"
          @activate="$emit('activate', $event)"
          @deactivate="$emit('deactivate', $event)"
          @configure="$emit('configure', $event)"
          @remove="$emit('remove', $event)"
          @refresh="$emit('refresh', $event)"
          @model-config="(providerId, modelName) => $emit('modelConfig', providerId, modelName)"
          @add-model="(providerId, modelType) => $emit('addModel', providerId, modelType)"
        />
      </div>

      <!-- 未激活的提供商 -->
      <div v-if="inactiveProviders.length > 0" class="provider-group">
        <div class="provider-group__title">
          <q-icon name="cancel" color="grey" size="20px" />
          <span>未激活 ({{ inactiveProviders.length }})</span>
        </div>
        <SettingsLlmConfigProviderCard
          v-for="provider in inactiveProviders"
          :key="provider.id"
          :provider="provider"
          @activate="$emit('activate', $event)"
          @deactivate="$emit('deactivate', $event)"
          @configure="$emit('configure', $event)"
          @remove="$emit('remove', $event)"
          @refresh="$emit('refresh', $event)"
          @model-config="(providerId, modelName) => $emit('modelConfig', providerId, modelName)"
          @add-model="(providerId, modelType) => $emit('addModel', providerId, modelType)"
        />
      </div>

      <!-- 可用的提供商 -->
      <div v-if="availableProviders.length > 0" class="provider-group">
        <div class="provider-group__title">
          <q-icon name="inventory_2" color="info" size="20px" />
          <span>可用 ({{ availableProviders.length }})</span>
        </div>
        <SettingsLlmConfigProviderCard
          v-for="provider in availableProviders"
          :key="provider.id"
          :provider="provider"
          @activate="$emit('activate', $event)"
          @deactivate="$emit('deactivate', $event)"
          @configure="$emit('configure', $event)"
          @remove="$emit('remove', $event)"
          @refresh="$emit('refresh', $event)"
          @model-config="(providerId, modelName) => $emit('modelConfig', providerId, modelName)"
          @add-model="(providerId, modelType) => $emit('addModel', providerId, modelType)"
        />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="provider-list__empty">
      <q-icon name="inventory_2" size="64px" color="grey-4" />
      <div class="empty-text">暂无提供商</div>
      <div class="empty-hint">点击"添加提供商"按钮开始配置</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ModelProvider } from '@stores/settings'
import SettingsLlmConfigProviderCard from './Settings.LlmConfig.ProviderCard.vue'

const props = defineProps<{
  providers: ModelProvider[]
  loading: boolean
}>()

defineEmits<{
  activate: [providerId: string]
  deactivate: [providerId: string]
  configure: [providerId: string]
  remove: [providerId: string]
  refresh: [providerId: string]
  modelConfig: [providerId: string, modelName: string]
  addModel: [providerId: string, modelType: string]
}>()

const activeProviders = computed(() =>
  props.providers.filter(p => p.status === 'active')
)

const inactiveProviders = computed(() =>
  props.providers.filter(p => p.status === 'inactive')
)

const availableProviders = computed(() =>
  props.providers.filter(p => p.status === 'available')
)
</script>

<style lang="scss" scoped>
.provider-list {
  width: 100%;
  min-height: 400px;

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    gap: 16px;

    .loading-text {
      font-size: 14px;
      color: var(--q-dark-50);
    }
  }

  &__content {
    width: 100%;
  }

  &__empty {
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

.provider-group {
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: var(--q-dark);
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--q-dark-10);
  }
}
</style>

