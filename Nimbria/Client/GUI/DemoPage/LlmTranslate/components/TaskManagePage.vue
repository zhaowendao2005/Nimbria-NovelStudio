<template>
  <div class="task-manage-page">
    <h2>任务管理页</h2>
    <p>批次列表与任务监控 - 开发中</p>

    <el-card class="task-stats">
      <template #header>
        <span>当前批次统计</span>
      </template>
      <div v-if="store.batchStats">
        <p>总任务: {{ store.batchStats.totalTasks }}</p>
        <p>已完成: {{ store.batchStats.completedTasks }}</p>
        <p>失败: {{ store.batchStats.failedTasks }}</p>
        <p>成功率: {{ store.batchStats.successRate }}%</p>
      </div>
      <div v-else>
        <el-empty description="暂无批次数据" />
      </div>
    </el-card>

    <el-card class="task-list">
      <template #header>
        <span>任务列表</span>
      </template>
      
      <div class="task-item" v-for="task in store.filteredTaskList" :key="task.id">
        <el-card :class="['task-card', `status-${task.status}`]">
          <div class="task-header">
            <span class="task-id">{{ task.id }}</span>
            <el-tag :type="getStatusType(task.status)">{{ getStatusText(task.status) }}</el-tag>
          </div>
          
          <div class="task-content">
            <p>{{ task.content }}</p>
          </div>

          <div v-if="task.status === 'waiting'" class="task-progress">
            <el-progress :percentage="task.progress" />
            <span>{{ task.replyTokens }} / {{ task.predictedTokens }} tokens</span>
          </div>

          <div class="task-actions">
            <el-button size="small" @click="openDetail(task.id)">详情</el-button>
            <el-button v-if="task.status === 'error' || task.status === 'throttled'" 
                       size="small" type="warning">
              重试
            </el-button>
          </div>
        </el-card>
      </div>
    </el-card>

    <!-- 线程详情抽屉 -->
    <el-drawer
      v-model="store.threadDrawer.isOpen"
      title="线程详情"
      direction="rtl"
      size="500px"
    >
      <div v-if="currentTask">
        <h3>任务 {{ currentTask.id }}</h3>
        <p><strong>状态:</strong> {{ getStatusText(currentTask.status) }}</p>
        <p><strong>原文:</strong> {{ currentTask.content }}</p>
        <p><strong>翻译:</strong> {{ currentTask.translation || '未完成' }}</p>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLlmTranslateStore } from '../stores/LlmTranslate.store'
import { useTaskManagement } from '../composables/useTaskManagement'

const store = useLlmTranslateStore()
const { loadTasks } = useTaskManagement()

const currentTask = computed(() => {
  if (!store.threadDrawer.currentTaskId) return null
  return store.taskList.find(t => t.id === store.threadDrawer.currentTaskId)
})

const openDetail = (taskId: string) => {
  store.openThreadDrawer(taskId)
}

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    completed: 'success',
    waiting: 'info',
    throttled: 'danger',
    error: 'warning',
    unsent: ''
  }
  return map[status] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    completed: '已完成',
    waiting: '等待中',
    throttled: '限流',
    error: '错误',
    unsent: '未发送'
  }
  return map[status] || status
}
</script>

<style scoped lang="scss">
.task-manage-page {
  h2 {
    color: var(--obsidian-text-primary);
    margin-bottom: 16px;
  }

  .task-stats, .task-list {
    margin-top: 16px;
  }

  .task-item {
    margin-bottom: 12px;

    .task-card {
      &.status-throttled {
        border-left: 4px solid #F56C6C;
        background: #FFF1F0;
      }

      &.status-waiting {
        border-left: 4px solid #409EFF;
        background: #E6F7FF;
      }

      &.status-completed {
        border-left: 4px solid #67C23A;
        background: #F6FFED;
      }

      &.status-error {
        border-left: 4px solid #E6A23C;
        background: #FFF7E6;
      }

      &.status-unsent {
        border-left: 4px solid #909399;
        background: #FAFAFA;
      }
    }
  }

  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .task-id {
      font-weight: 600;
    }
  }

  .task-content {
    margin-bottom: 12px;
    color: var(--obsidian-text-secondary);
    font-size: 0.9rem;
  }

  .task-progress {
    margin-bottom: 12px;

    span {
      display: block;
      margin-top: 4px;
      font-size: 0.85rem;
      color: var(--obsidian-text-secondary);
    }
  }

  .task-actions {
    display: flex;
    gap: 8px;
  }
}
</style>

