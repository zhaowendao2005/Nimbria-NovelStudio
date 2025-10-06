<template>
  <div class="autosave-indicator">
    <!-- 自动保存开关 -->
    <q-toggle
      :model-value="markdownStore.autoSaveConfig.enabled"
      @update:model-value="markdownStore.toggleAutoSave"
      label="自动保存"
      dense
      color="primary"
      size="sm"
    />

    <!-- 保存状态显示 -->
    <div class="save-status">
      <template v-if="isSaving">
        <q-spinner size="16px" color="primary" />
        <span class="status-text">正在保存...</span>
      </template>

      <template v-else-if="hasUnsaved">
        <q-icon name="circle" color="warning" size="12px" />
        <span class="status-text">有未保存修改</span>
      </template>

      <template v-else>
        <q-icon name="check_circle" color="positive" size="16px" />
        <span class="status-text">已保存</span>
      </template>
    </div>

    <!-- 批量保存按钮 -->
    <q-btn
      v-if="hasUnsaved"
      icon="save_all"
      label="全部保存"
      size="sm"
      color="primary"
      flat
      dense
      @click="handleSaveAll"
      :loading="isBatchSaving"
    />

    <!-- 保存配置弹窗 -->
    <q-btn
      icon="settings"
      size="sm"
      flat
      dense
      round
    >
      <q-menu>
        <q-list style="min-width: 200px">
          <q-item>
            <q-item-section>
              <q-item-label caption>自动保存延迟</q-item-label>
              <q-slider
                :model-value="markdownStore.autoSaveConfig.delay"
                @update:model-value="updateDelay"
                :min="1000"
                :max="5000"
                :step="500"
                label
                :label-value="markdownStore.autoSaveConfig.delay + 'ms'"
              />
            </q-item-section>
          </q-item>

          <q-item tag="label">
            <q-item-section>
              <q-item-label>创建备份</q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-toggle
                v-model="markdownStore.autoSaveConfig.createBackup"
                dense
              />
            </q-item-section>
          </q-item>

          <q-item tag="label">
            <q-item-section>
              <q-item-label>关闭时保存</q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-toggle
                v-model="markdownStore.autoSaveConfig.batchSaveOnClose"
                dense
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMarkdownStore } from '@stores/projectPage'

const markdownStore = useMarkdownStore()
const isBatchSaving = ref(false)

// 计算属性
const isSaving = computed(() => {
  return markdownStore.openTabs.some(tab => tab.isSaving)
})

const hasUnsaved = computed(() => {
  return markdownStore.hasDirtyTabs
})

// 方法
const handleSaveAll = async () => {
  isBatchSaving.value = true
  try {
    await markdownStore.saveAllTabs()
  } finally {
    isBatchSaving.value = false
  }
}

const updateDelay = (value: number) => {
  markdownStore.autoSaveConfig.delay = value
}
</script>

<style scoped>
.autosave-indicator {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background-color: var(--obsidian-bg-secondary, #f5f6f8);
  border-bottom: 1px solid var(--obsidian-border, #e3e5e8);
}

.save-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--obsidian-text-secondary, #6a6d74);
  font-size: 13px;
  min-width: 120px;
}

.status-text {
  font-weight: 500;
}
</style>

