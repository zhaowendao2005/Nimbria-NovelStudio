<template>
  <span v-if="tab" class="save-status-badge">
    <!-- 未保存标记 -->
    <q-icon
      v-if="tab.isDirty && !tab.isSaving"
      name="circle"
      color="warning"
      size="10px"
      class="dirty-indicator"
    >
      <q-tooltip>有未保存的修改</q-tooltip>
    </q-icon>

    <!-- 保存中标记 -->
    <q-spinner
      v-else-if="tab.isSaving"
      size="10px"
      color="primary"
      class="saving-indicator"
    >
      <q-tooltip>正在保存...</q-tooltip>
    </q-spinner>

    <!-- 已保存标记 -->
    <q-icon
      v-else-if="tab.lastSaved"
      name="check_circle"
      color="positive"
      size="10px"
      class="saved-indicator"
    >
      <q-tooltip>
        已保存于 {{ formatTime(tab.lastSaved) }}
      </q-tooltip>
    </q-icon>

    <!-- 保存错误标记 -->
    <q-icon
      v-if="tab.saveError"
      name="error"
      color="negative"
      size="10px"
      class="error-indicator"
    >
      <q-tooltip>
        保存失败: {{ tab.saveError }}
      </q-tooltip>
    </q-icon>
  </span>
</template>

<script setup lang="ts">
import type { MarkdownTab } from '@stores/projectPage/Markdown/types'

interface Props {
  tab: MarkdownTab | null  // 🔥 允许 null
}

defineProps<Props>()

// 格式化时间
const formatTime = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`
  } else {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}
</script>

<style scoped>
.save-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
}

.dirty-indicator {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.saving-indicator {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.saved-indicator {
  opacity: 0.6;
}

.error-indicator {
  animation: shake 0.5s;
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}
</style>

