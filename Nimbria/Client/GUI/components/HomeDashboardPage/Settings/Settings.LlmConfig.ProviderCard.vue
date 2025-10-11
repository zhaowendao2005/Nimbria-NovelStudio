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
            size="sm"
            outline
            color="grey-7"
          >
            {{ model.name }}
          </q-chip>
        </div>
      </div>
    </q-card-section>

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
import type { ModelProvider } from '@stores/settings'

const props = defineProps<{
  provider: ModelProvider
}>()

defineEmits<{
  activate: [providerId: string]
  deactivate: [providerId: string]
  configure: [providerId: string]
  remove: [providerId: string]
  refresh: [providerId: string]
}>()

const expanded = ref(false)

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
</style>

