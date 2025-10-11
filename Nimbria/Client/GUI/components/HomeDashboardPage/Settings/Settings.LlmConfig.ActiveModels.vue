<template>
  <div class="active-models-tab">
    <div class="hint">
      <q-icon name="info" color="primary" size="20px" />
      <span>为每种模型类型选择一个默认的活动模型。点击任意提供商中的模型chip即可设置为活动模型。</span>
    </div>

    <!-- 直接复用ProviderList组件 -->
    <SettingsLlmConfigProviderList
      :providers="providers"
      :loading="loading"
      @activate="emit('activate', $event)"
      @deactivate="emit('deactivate', $event)"
      @configure="emit('configure', $event)"
      @remove="emit('remove', $event)"
      @refresh="emit('refresh', $event)"
      @model-config="(providerId: string, modelName: string) => emit('modelConfig', providerId, modelName)"
      @add-model="(providerId: string, modelType: string) => emit('addModel', providerId, modelType)"
    />

    <!-- 说明：
         - 用户点击任意ProviderCard中的模型chip
         - 该模型被设为对应类型的活动模型
         - 同类型的其他模型自动取消选中
         - 这就是"为提供商选取默认模型"的交互
    -->
  </div>
</template>

<script setup lang="ts">
import type { ModelProvider } from '@stores/settings'
import SettingsLlmConfigProviderList from './Settings.LlmConfig.ProviderList.vue'

const props = defineProps<{
  providers: ModelProvider[]
  loading?: boolean
}>()

const emit = defineEmits<{
  activate: [providerId: string]
  deactivate: [providerId: string]
  configure: [providerId: string]
  remove: [providerId: string]
  refresh: [providerId: string]
  modelConfig: [providerId: string, modelName: string]
  addModel: [providerId: string, modelType: string]
}>()
</script>

<style lang="scss" scoped>
.active-models-tab {
  width: 100%;

  .hint {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: var(--q-primary-1);
    border-radius: 8px;
    margin-bottom: 24px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--q-dark-70);

    .q-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    span {
      flex: 1;
    }
  }
}
</style>
