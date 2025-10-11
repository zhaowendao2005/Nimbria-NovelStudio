<template>
  <q-card flat bordered class="provider-card">
    <q-card-section>
      <!-- 头部：Logo + 名称 + 状态 -->
      <div class="provider-card__header">
        <div class="provider-card__info">
          <div class="provider-card__logo">{{ provider.logo || '🤖' }}</div>
          <div class="provider-card__identity">
            <div class="provider-card__name">{{ provider.displayName }}</div>
            <div class="provider-card__id">{{ provider.id }}</div>
          </div>
        </div>
        <q-badge
          :color="statusColor"
          :label="statusLabel"
          class="provider-card__badge"
        />
      </div>

      <!-- 描述 -->
      <div class="provider-card__description">{{ provider.description }}</div>

      <!-- 支持的模型类型标签 -->
      <div class="provider-card__model-types">
        <q-chip
          v-for="modelGroup in provider.supportedModels"
          :key="modelGroup.type"
          size="sm"
          color="primary"
          text-color="white"
          dense
        >
          {{ modelGroup.type }} ({{ modelGroup.models.length }})
        </q-chip>
      </div>

      <!-- 刷新状态 -->
      <div v-if="provider.lastRefreshed" class="provider-card__refresh-info">
        <q-icon
          :name="refreshIcon"
          :color="refreshIconColor"
          size="16px"
        />
        <span class="provider-card__refresh-time">
          最后刷新: {{ formatDate(provider.lastRefreshed) }}
        </span>
      </div>
    </q-card-section>

    <!-- 操作按钮 -->
    <q-card-actions align="right" class="provider-card__actions">
      <q-btn
        v-if="provider.status === 'active' || provider.status === 'available'"
        flat
        dense
        icon="refresh"
        color="primary"
        :loading="provider.refreshStatus === 'loading'"
        @click="$emit('refresh', provider.id)"
      >
        <q-tooltip>刷新模型列表</q-tooltip>
      </q-btn>
      
      <q-btn
        flat
        dense
        icon="settings"
        color="primary"
        @click="$emit('configure', provider.id)"
      >
        <q-tooltip>配置</q-tooltip>
      </q-btn>

      <q-btn
        v-if="provider.status !== 'active'"
        flat
        dense
        icon="check_circle"
        color="positive"
        @click="$emit('activate', provider.id)"
      >
        <q-tooltip>激活</q-tooltip>
      </q-btn>

      <q-btn
        v-if="provider.status === 'active'"
        flat
        dense
        icon="cancel"
        color="warning"
        @click="$emit('deactivate', provider.id)"
      >
        <q-tooltip>停用</q-tooltip>
      </q-btn>

      <q-btn
        flat
        dense
        icon="delete"
        color="negative"
        @click="$emit('remove', provider.id)"
      >
        <q-tooltip>删除</q-tooltip>
      </q-btn>
    </q-card-actions>

    <!-- 可展开的模型列表 -->
    <q-separator v-if="expanded" />
    <q-card-section v-if="expanded" class="provider-card__models">
      <div v-for="modelGroup in provider.supportedModels" :key="modelGroup.type">
        <div class="model-group-title">{{ modelGroup.type }}</div>
        <div class="model-list">
          <q-chip
            v-for="model in modelGroup.models"
            :key="model.name"
            :class="{
              'model-chip': true,
              'model-chip--active': isActiveModel(modelGroup.type, model.name)
            }"
            size="sm"
            outline
            color="grey-7"
            clickable
            @click="handleModelClick(model, modelGroup.type)"
            @contextmenu.prevent="handleModelContextMenu($event, model, modelGroup.type)"
          >
            {{ model.displayName || model.name }}
            <q-icon
              v-if="model.config"
              name="edit"
              size="xs"
              color="orange"
              class="q-ml-xs"
            />
          </q-chip>
          
          <!-- 添加模型按钮 -->
          <q-chip
            class="model-chip model-chip--add"
            size="sm"
            outline
            clickable
            @click="handleAddModel(modelGroup.type)"
          >
            <q-icon name="add" size="xs" />
            添加模型
          </q-chip>
        </div>
      </div>
    </q-card-section>

    <!-- 右键菜单 -->
    <q-menu
      v-model="showContextMenu"
      touch-position
      context-menu
      transition-show="jump-down"
      transition-hide="jump-up"
    >
      <q-list dense style="min-width: 150px">
        <q-item
          clickable
          v-close-popup
          @click="handleDeleteModel"
        >
          <q-item-section avatar>
            <q-icon name="delete" color="negative" />
          </q-item-section>
          <q-item-section>删除模型</q-item-section>
        </q-item>

        <q-item
          clickable
          v-close-popup
          @click="handleRenameModel"
        >
          <q-item-section avatar>
            <q-icon name="edit" color="primary" />
          </q-item-section>
          <q-item-section>重命名</q-item-section>
        </q-item>

        <q-separator />

        <q-item
          clickable
          v-close-popup
          @click="handleConfigModel"
        >
          <q-item-section avatar>
            <q-icon name="settings" color="orange" />
          </q-item-section>
          <q-item-section>配置参数</q-item-section>
        </q-item>
      </q-list>
    </q-menu>

    <!-- 重命名对话框 -->
    <q-dialog v-model="showRenameDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">重命名模型</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="renameValue"
            label="显示名称"
            dense
            autofocus
            @keyup.enter="confirmRename"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup />
          <q-btn
            flat
            label="确定"
            color="primary"
            @click="confirmRename"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 展开/折叠按钮 -->
    <q-separator />
    <q-card-actions>
      <q-btn
        flat
        dense
        :icon="expanded ? 'expand_less' : 'expand_more'"
        :label="expanded ? '收起' : '查看模型'"
        color="grey-7"
        @click="expanded = !expanded"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useSettingsLlmStore } from '@stores/settings'
import { parseModelId } from '@stores/settings/types'
import type { ModelProvider } from '@stores/settings'

const props = defineProps<{
  provider: ModelProvider
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

const $q = useQuasar()
const settingsStore = useSettingsLlmStore()

const expanded = ref(false)

// 右键菜单相关状态
const showContextMenu = ref(false)
const contextMenuModel = ref<any>(null)
const contextMenuModelType = ref<string>('')

// 重命名对话框相关
const showRenameDialog = ref(false)
const renameValue = ref('')

const statusColor = computed(() => {
  switch (props.provider.status) {
    case 'active':
      return 'positive'
    case 'inactive':
      return 'grey'
    case 'available':
      return 'info'
    default:
      return 'grey'
  }
})

const statusLabel = computed(() => {
  switch (props.provider.status) {
    case 'active':
      return '已激活'
    case 'inactive':
      return '未激活'
    case 'available':
      return '可用'
    default:
      return '未知'
  }
})

const refreshIcon = computed(() => {
  switch (props.provider.refreshStatus) {
    case 'loading':
      return 'sync'
    case 'success':
      return 'check_circle'
    case 'error':
      return 'error'
    default:
      return 'schedule'
  }
})

const refreshIconColor = computed(() => {
  switch (props.provider.refreshStatus) {
    case 'loading':
      return 'primary'
    case 'success':
      return 'positive'
    case 'error':
      return 'negative'
    default:
      return 'grey-6'
  }
})

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

// ==================== 模型交互逻辑 ====================

/**
 * 判断模型是否为活动模型
 */
function isActiveModel(modelType: string, modelName: string): boolean {
  const activeModelId = settingsStore.activeModels[modelType]
  if (!activeModelId) return false
  
  try {
    const { providerId, modelName: activeModelName } = parseModelId(activeModelId)
    return providerId === props.provider.id && activeModelName === modelName
  } catch {
    return false
  }
}

/**
 * 点击模型chip - 切换活动状态
 */
async function handleModelClick(model: any, modelType: string) {
  const isActive = isActiveModel(modelType, model.name)
  
  if (isActive) {
    // 取消活动
    const success = await settingsStore.clearActiveModel(modelType)
    if (success) {
      $q.notify({
        type: 'positive',
        message: `已取消 ${modelType} 的活动模型`,
        position: 'top'
      })
    }
  } else {
    // 设为活动
    const success = await settingsStore.setActiveModel(
      modelType,
      props.provider.id,
      model.name
    )
    if (success) {
      $q.notify({
        type: 'positive',
        message: `已将 ${model.displayName || model.name} 设为 ${modelType} 的活动模型`,
        position: 'top'
      })
    }
  }
}

/**
 * 右键模型chip - 显示上下文菜单
 */
function handleModelContextMenu(event: MouseEvent, model: any, modelType: string) {
  event.preventDefault()
  contextMenuModel.value = model
  contextMenuModelType.value = modelType
  showContextMenu.value = true
}

/**
 * 删除模型
 */
function handleDeleteModel() {
  if (!contextMenuModel.value) return
  
  $q.dialog({
    title: '确认删除',
    message: `确定要删除模型 "${contextMenuModel.value.displayName || contextMenuModel.value.name}" 吗？`,
    cancel: {
      label: '取消',
      flat: true
    },
    ok: {
      label: '删除',
      color: 'negative',
      flat: true
    },
    persistent: true
  }).onOk(async () => {
    const success = await settingsStore.removeModelFromProvider(
      props.provider.id,
      contextMenuModelType.value,
      contextMenuModel.value.name
    )
    
    if (success) {
      $q.notify({
        type: 'positive',
        message: '模型已删除',
        position: 'top'
      })
    } else {
      $q.notify({
        type: 'negative',
        message: '删除模型失败',
        position: 'top'
      })
    }
  })
}

/**
 * 重命名模型
 */
function handleRenameModel() {
  if (!contextMenuModel.value) return
  
  renameValue.value = contextMenuModel.value.displayName || contextMenuModel.value.name
  showRenameDialog.value = true
}

/**
 * 确认重命名
 */
async function confirmRename() {
  if (!contextMenuModel.value || !renameValue.value.trim()) return
  
  const success = await settingsStore.setModelDisplayName(
    props.provider.id,
    contextMenuModel.value.name,
    renameValue.value.trim()
  )
  
  if (success) {
    $q.notify({
      type: 'positive',
      message: '模型已重命名',
      position: 'top'
    })
    showRenameDialog.value = false
  } else {
    $q.notify({
      type: 'negative',
      message: '重命名失败',
      position: 'top'
    })
  }
}

/**
 * 配置模型参数
 */
function handleConfigModel() {
  if (!contextMenuModel.value) return
  
  emit('modelConfig', props.provider.id, contextMenuModel.value.name)
}

/**
 * 添加模型
 */
function handleAddModel(modelType: string) {
  emit('addModel', props.provider.id, modelType)
}
</script>

<style lang="scss" scoped>
.provider-card {
  margin-bottom: 16px;
  transition: box-shadow 0.3s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  &__info {
    display: flex;
    gap: 12px;
    align-items: center;
    flex: 1;
  }

  &__logo {
    font-size: 32px;
    line-height: 1;
  }

  &__identity {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__name {
    font-size: 16px;
    font-weight: 600;
    color: var(--q-dark);
  }

  &__id {
    font-size: 12px;
    color: var(--q-dark-50);
    font-family: monospace;
  }

  &__badge {
    flex-shrink: 0;
  }

  &__description {
    font-size: 14px;
    color: var(--q-dark-60);
    line-height: 1.5;
    margin-bottom: 12px;
  }

  &__model-types {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  &__refresh-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--q-dark-50);
  }

  &__refresh-time {
    line-height: 1;
  }

  &__actions {
    padding: 8px 16px;
  }

  &__models {
    padding-top: 8px;
  }
}

.model-group-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--q-primary);
  margin-bottom: 8px;
  margin-top: 12px;

  &:first-child {
    margin-top: 0;
  }
}

.model-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

// 模型chip交互样式（新增）
.model-chip {
  cursor: pointer;
  transition: all 0.2s ease;

  // 活动模型状态
  &--active {
    background: #e3f2fd !important;
    border: 2px solid #1976d2 !important;
    color: #1976d2 !important;
    font-weight: 500;
    box-shadow: 0 2px 4px rgba(25, 118, 210, 0.2);
  }

  // 添加按钮样式
  &--add {
    border: 1px dashed #1976d2 !important;
    background: transparent !important;
    color: #1976d2 !important;

    &:hover {
      background: #e3f2fd !important;
    }
  }

  // hover状态（未选中时）
  &:not(.model-chip--active):not(.model-chip--add):hover {
    border-color: #1976d2;
    background: #f5f5f5;
  }
}
</style>

