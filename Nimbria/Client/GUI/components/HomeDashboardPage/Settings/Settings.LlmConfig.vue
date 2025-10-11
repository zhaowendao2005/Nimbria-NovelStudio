<template>
  <div class="llm-config">
    <h5 class="settings-title">LLM 配置</h5>
    <p class="settings-description">管理大语言模型提供商和活动模型</p>

    <!-- 顶部操作栏 -->
    <div class="llm-config__toolbar">
      <q-btn
        color="primary"
        icon="add"
        label="添加提供商"
        @click="showAddModal = true"
      />
      <q-btn
        color="primary"
        outline
        icon="refresh"
        label="刷新全部"
        :loading="llmStore.loading"
        @click="handleRefreshAll"
      />
      <q-btn
        color="primary"
        outline
        icon="download"
        label="导出配置"
        @click="handleExport"
      />
      <q-btn
        color="primary"
        outline
        icon="upload"
        label="导入配置"
        @click="handleImport"
      />
    </div>

    <!-- Tab切换：提供商列表 / 活动模型 -->
    <q-tabs
      v-model="activeTab"
      class="llm-config__tabs"
      active-color="primary"
      indicator-color="primary"
      align="left"
    >
      <q-tab name="providers" label="提供商列表" icon="business" />
      <q-tab name="active-models" label="活动模型" icon="star" />
    </q-tabs>

    <q-separator />

    <q-tab-panels v-model="activeTab" animated class="llm-config__panels">
      <!-- 提供商列表面板 -->
      <q-tab-panel name="providers">
        <SettingsLlmConfigProviderList
          :providers="llmStore.providers"
          :loading="llmStore.loading"
          @activate="handleActivate"
          @deactivate="handleDeactivate"
          @configure="handleConfigure"
          @remove="handleRemove"
          @refresh="handleRefreshProvider"
        />
      </q-tab-panel>

      <!-- 活动模型面板 -->
      <q-tab-panel name="active-models">
        <SettingsLlmConfigActiveModels
          :active-models="llmStore.activeModels"
          :providers="llmStore.providers"
          @set-active="handleSetActive"
          @clear-active="handleClearActive"
        />
      </q-tab-panel>
    </q-tab-panels>

    <!-- 各类弹窗组件 -->
    <SettingsLlmConfigAddProviderModal
      v-model="showAddModal"
      @provider-added="handleProviderAdded"
    />
    
    <SettingsLlmConfigConfigModal
      v-model="showConfigModal"
      :provider-id="currentProviderId"
      @config-updated="handleConfigUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsLlmStore } from '@stores/settings'
import { Notify, Dialog } from 'quasar'
import SettingsLlmConfigProviderList from './Settings.LlmConfig.ProviderList.vue'
import SettingsLlmConfigActiveModels from './Settings.LlmConfig.ActiveModels.vue'
import SettingsLlmConfigAddProviderModal from './Settings.LlmConfig.AddProviderModal.vue'
import SettingsLlmConfigConfigModal from './Settings.LlmConfig.ConfigModal.vue'

const llmStore = useSettingsLlmStore()
const activeTab = ref('providers')
const showAddModal = ref(false)
const showConfigModal = ref(false)
const currentProviderId = ref('')

// 初始化
onMounted(() => {
  llmStore.initialize()
})

// 激活提供商
async function handleActivate(providerId: string) {
  const success = await llmStore.activateProvider(providerId)
  if (success) {
    Notify.create({
      type: 'positive',
      message: '提供商已激活',
      position: 'top'
    })
  } else {
    Notify.create({
      type: 'negative',
      message: '激活提供商失败',
      position: 'top'
    })
  }
}

// 停用提供商
async function handleDeactivate(providerId: string) {
  const success = await llmStore.deactivateProvider(providerId)
  if (success) {
    Notify.create({
      type: 'positive',
      message: '提供商已停用',
      position: 'top'
    })
  } else {
    Notify.create({
      type: 'negative',
      message: '停用提供商失败',
      position: 'top'
    })
  }
}

// 配置提供商
function handleConfigure(providerId: string) {
  currentProviderId.value = providerId
  showConfigModal.value = true
}

// 删除提供商
function handleRemove(providerId: string) {
  Dialog.create({
    title: '确认删除',
    message: '确定要删除此提供商吗？此操作无法撤销。',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const success = await llmStore.removeProvider(providerId)
    if (success) {
      Notify.create({
        type: 'positive',
        message: '提供商已删除',
        position: 'top'
      })
    } else {
      Notify.create({
        type: 'negative',
        message: '删除提供商失败',
        position: 'top'
      })
    }
  })
}

// 刷新提供商模型
async function handleRefreshProvider(providerId: string) {
  const result = await llmStore.refreshProviderModels(providerId)
  if (result.success) {
    Notify.create({
      type: 'positive',
      message: `刷新成功，发现 ${result.modelsCount} 个模型`,
      position: 'top'
    })
  } else {
    Notify.create({
      type: 'negative',
      message: `刷新失败: ${result.error}`,
      position: 'top'
    })
  }
}

// 刷新全部
async function handleRefreshAll() {
  const result = await llmStore.refreshAllProviders()
  
  Notify.create({
    type: result.failed === 0 ? 'positive' : 'warning',
    message: `刷新完成：成功 ${result.successful} 个，失败 ${result.failed} 个`,
    position: 'top'
  })
}

// 设置活动模型
async function handleSetActive(payload: { modelType: string; providerId: string; modelName: string }) {
  const success = await llmStore.setActiveModel(
    payload.modelType,
    payload.providerId,
    payload.modelName
  )
  
  if (success) {
    Notify.create({
      type: 'positive',
      message: '活动模型已设置',
      position: 'top'
    })
  } else {
    Notify.create({
      type: 'negative',
      message: '设置活动模型失败',
      position: 'top'
    })
  }
}

// 清除活动模型
async function handleClearActive(modelType: string) {
  const success = await llmStore.clearActiveModel(modelType)
  
  if (success) {
    Notify.create({
      type: 'positive',
      message: '活动模型已清除',
      position: 'top'
    })
  } else {
    Notify.create({
      type: 'negative',
      message: '清除活动模型失败',
      position: 'top'
    })
  }
}

// 导出配置
async function handleExport() {
  const config = await llmStore.exportConfig()
  if (config) {
    // 创建下载
    const blob = new Blob([config], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `llm-config-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    Notify.create({
      type: 'positive',
      message: '配置已导出',
      position: 'top'
    })
  }
}

// 导入配置
function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    
    const content = await file.text()
    const result = await llmStore.importConfig(content)
    
    if (result.success) {
      Notify.create({
        type: 'positive',
        message: '配置已导入',
        position: 'top'
      })
    } else {
      Notify.create({
        type: 'negative',
        message: `导入失败: ${result.error}`,
        position: 'top'
      })
    }
  }
  input.click()
}

// 提供商添加成功回调
function handleProviderAdded() {
  Notify.create({
    type: 'positive',
    message: '提供商已添加',
    position: 'top'
  })
}

// 配置更新成功回调
function handleConfigUpdated() {
  Notify.create({
    type: 'positive',
    message: '配置已更新',
    position: 'top'
  })
}
</script>

<style lang="scss" scoped>
.llm-config {
  width: 100%;

  &__toolbar {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  &__tabs {
    margin-bottom: 0;
  }

  &__panels {
    background: transparent;
    
    :deep(.q-tab-panel) {
      padding: 24px 0;
    }
  }
}

.settings-title {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--q-dark);
}

.settings-description {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: var(--q-dark-50);
  line-height: 1.5;
}
</style>

