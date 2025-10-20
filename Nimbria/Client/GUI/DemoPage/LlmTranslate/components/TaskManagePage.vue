<template>
  <div class="task-manage-page">
    <!-- 左侧：批次列表 -->
    <div class="sidebar">
      <div class="sidebar-header">📚 批次列表</div>
      <div class="batch-list">
        <div
          v-for="batch in store.batchList"
          :key="batch.id"
          class="batch-item"
          :class="{ active: store.currentBatch?.id === batch.id }"
          @click="handleBatchSelect(batch.id)"
        >
          <div class="batch-id">{{ batch.id }}</div>
          <div class="batch-status" :class="`status-${batch.status}`">
            {{ getBatchStatusText(batch.status) }}
          </div>
          <div class="batch-stats">
            {{ batch.totalTasks }} 任务 | ✅ {{ batch.completedTasks }}
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：主内容区 -->
    <div class="main-content">
      <!-- 统计条 -->
      <div v-if="store.currentBatch" class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">批次:</span>
          <span class="stat-value">{{ store.currentBatch.id }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">总任务:</span>
          <span class="stat-value">{{ store.batchStats?.totalTasks }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">✅ 已完成:</span>
          <span class="stat-value" style="color: #67c23a">{{ store.batchStats?.completedTasks }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">⏳ 进行中:</span>
          <span class="stat-value" style="color: #409eff">{{ store.currentBatch.totalTasks - store.batchStats!.completedTasks - store.batchStats!.failedTasks }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">❌ 失败:</span>
          <span class="stat-value" style="color: #f56c6c">{{ store.batchStats?.failedTasks }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">成功率:</span>
          <span class="stat-value">{{ store.batchStats?.successRate.toFixed(1) }}%</span>
        </div>
      </div>

      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button size="small" @click="loadTasks" :icon="Refresh">刷新</el-button>
          <el-button size="small" @click="retryFailedTasks" type="warning">🔄 重试失败</el-button>
          <el-button size="small" @click="pauseBatch(store.currentBatch!.id)" type="info">⏸️ 暂停</el-button>
          <el-button size="small" @click="resumeBatch(store.currentBatch!.id)" type="success">▶️ 恢复</el-button>
        </div>

        <div class="toolbar-right">
          <el-input
            v-model="store.taskFilters.searchText"
            placeholder="搜索任务 ID 或内容..."
            :prefix-icon="Search"
            class="search-input"
            clearable
          />
        </div>
      </div>

      <!-- 任务列表 -->
      <div class="task-list-area">
        <div v-if="store.filteredTaskList.length === 0" class="empty-state">
          <el-empty description="暂无任务"></el-empty>
        </div>

        <div
          v-for="task in store.filteredTaskList"
          :key="task.id"
          class="task-card"
          :class="`status-${task.status}`"
        >
          <!-- 卡片头部 -->
          <div class="card-header">
            <div class="status-info">
              <span class="status-dot" :class="`dot-${task.status}`"></span>
              <span class="task-id">{{ task.id }}</span>
              <el-tag :type="getStatusTagType(task.status)" size="small">
                {{ getStatusText(task.status) }}
              </el-tag>
            </div>
          </div>

          <!-- 卡片内容 -->
          <div class="card-content">
            <div class="content-preview">{{ task.content.substring(0, 80) }}...</div>
            <div class="content-meta">
              <span v-if="task.sentTime">⏱️ {{ task.sentTime }}</span>
              <span v-if="task.status === 'completed'">✅ 已完成</span>
            </div>
          </div>

          <!-- 进度条（仅在等待中显示） -->
          <div v-if="task.status === 'waiting'" class="progress-bar-wrapper">
            <el-progress
              :percentage="task.progress"
              :stroke-width="4"
              :color="getProgressBarColor(task.status)"
            ></el-progress>
            <span class="progress-text">{{ task.progress.toFixed(0) }}% ({{ task.replyTokens }}/{{ task.predictedTokens }})</span>
          </div>

          <!-- 卡片操作 -->
          <div class="card-actions">
            <el-button size="small" @click="openThreadDrawer(task.id)">📋 详情</el-button>
            <el-button
              v-if="task.status === 'error' || task.status === 'throttled'"
              size="small"
              type="warning"
            >
              🔄 重试
            </el-button>
            <el-button v-if="task.status === 'unsent'" size="small" type="primary">📤 发送</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧抽屉：线程详情 -->
    <el-drawer
      v-model="store.threadDrawer.isOpen"
      title="线程详情"
      direction="rtl"
      size="45%"
      destroy-on-close
    >
      <ThreadDrawer v-if="currentTask" :task="currentTask" />
      <el-empty v-else description="未找到任务详情"></el-empty>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import { useLlmTranslateStore } from '../stores/LlmTranslate.store'
import { useTaskManagement } from '../composables/useTaskManagement'
import { useBatchManagement } from '../composables/useBatchManagement'
import ThreadDrawer from './ThreadDrawer.vue'
import type { TaskStatus } from '../types/task'

const store = useLlmTranslateStore()
const { loadTasks, retryFailedTasks } = useTaskManagement()
const { switchToBatch, pauseBatch, resumeBatch } = useBatchManagement()

const currentTask = computed(() => {
  if (!store.threadDrawer.currentTaskId) return null
  return store.taskList.find(task => task.id === store.threadDrawer.currentTaskId)
})

// 获取批次状态文本
const getBatchStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'running': '⏳ 进行中',
    'paused': '⏸️ 已暂停',
    'completed': '✅ 已完成',
    'failed': '❌ 失败'
  }
  return statusMap[status] || status
}

// 获取任务状态文本
const getStatusText = (status: TaskStatus): string => {
  switch (status) {
    case 'unsent': return '未发送'
    case 'waiting': return '等待中'
    case 'throttled': return '限流'
    case 'error': return '错误'
    case 'completed': return '已完成'
    default: return '未知'
  }
}

// 获取标签类型
const getStatusTagType = (status: TaskStatus) => {
  switch (status) {
    case 'completed': return 'success'
    case 'waiting': return 'primary'
    case 'throttled': return 'danger'
    case 'error': return 'warning'
    case 'unsent': return 'info'
    default: return ''
  }
}

// 获取进度条颜色
const getProgressBarColor = (status: TaskStatus) => {
  switch (status) {
    case 'completed': return '#67C23A'
    case 'waiting': return '#409EFF'
    case 'throttled': return '#F56C6C'
    case 'error': return '#E6A23C'
    default: return '#909399'
  }
}

// 处理批次选择
const handleBatchSelect = (batchId: string) => {
  switchToBatch(batchId)
}

// 打开线程详情抽屉
const openThreadDrawer = (taskId: string) => {
  store.threadDrawer.currentTaskId = taskId
  store.threadDrawer.isOpen = true
}

// 页面加载
onMounted(() => {
  if (!store.currentBatch && store.batchList.length > 0) {
    switchToBatch(store.batchList[0].id)
  }
  if (store.currentBatch) {
    loadTasks(store.currentBatch.id)
  }
})
</script>

<style scoped lang="scss">
.task-manage-page {
  display: flex;
  height: 100%;
  overflow: hidden;
  background-color: #f5f7fa;
}

// ========== 左侧栏 ==========
.sidebar {
  flex: 0 0 260px;
  background-color: white;
  border-right: 1px solid #e4e7eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .sidebar-header {
    font-size: 14px;
    font-weight: bold;
    color: #333;
    padding: 16px;
    background-color: #f5f7fa;
    border-bottom: 1px solid #e4e7eb;
  }

  .batch-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;

    .batch-item {
      padding: 12px;
      margin-bottom: 8px;
      background-color: #f9fafc;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 1px solid transparent;

      &:hover {
        background-color: #f0f2f5;
        border-color: #d9d9d9;
      }

      &.active {
        background-color: #e6f7ff;
        border-color: #409eff;
      }

      .batch-id {
        font-weight: bold;
        color: #333;
        margin-bottom: 4px;
      }

      .batch-status {
        font-size: 12px;
        margin-bottom: 4px;

        &.status-running { color: #409eff; }
        &.status-paused { color: #e6a23c; }
        &.status-completed { color: #67c23a; }
        &.status-failed { color: #f56c6c; }
      }

      .batch-stats {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}

// ========== 右侧主内容区 ==========
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .stats-bar {
    flex: 0 0 auto;
    background-color: white;
    border-bottom: 1px solid #e4e7eb;
    padding: 12px 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    align-items: center;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;

      .stat-label {
        color: #909399;
      }

      .stat-value {
        font-weight: bold;
        color: #333;
      }
    }
  }

  .toolbar {
    flex: 0 0 auto;
    background-color: white;
    border-bottom: 1px solid #e4e7eb;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;

    .toolbar-left {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .toolbar-right {
      flex: 0 0 auto;
    }

    .search-input {
      width: 300px;
    }
  }

  .task-list-area {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    .empty-state {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    }

    .task-card {
      background-color: white;
      border-radius: 6px;
      border-left: 4px solid;
      padding: 16px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;

      &:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        transform: translateY(-2px);
      }

      &.status-unsent { border-left-color: #909399; }
      &.status-waiting { border-left-color: #409eff; }
      &.status-throttled { border-left-color: #f56c6c; }
      &.status-error { border-left-color: #e6a23c; }
      &.status-completed { border-left-color: #67c23a; }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .status-info {
          display: flex;
          align-items: center;
          gap: 8px;

          .status-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;

            &.dot-unsent { background-color: #909399; }
            &.dot-waiting { background-color: #409eff; animation: pulse 2s infinite; }
            &.dot-throttled { background-color: #f56c6c; }
            &.dot-error { background-color: #e6a23c; }
            &.dot-completed { background-color: #67c23a; }
          }

          .task-id {
            font-weight: bold;
            color: #333;
            font-size: 14px;
          }
        }
      }

      .card-content {
        margin-bottom: 12px;

        .content-preview {
          font-size: 13px;
          color: #666;
          line-height: 1.5;
          margin-bottom: 4px;
        }

        .content-meta {
          font-size: 12px;
          color: #909399;
          display: flex;
          gap: 12px;
        }
      }

      .progress-bar-wrapper {
        margin-bottom: 12px;
        display: flex;
        gap: 8px;
        align-items: center;

        :deep(.el-progress) {
          flex: 1;
        }

        .progress-text {
          font-size: 12px;
          color: #909399;
          white-space: nowrap;
          min-width: 80px;
          text-align: right;
        }
      }

      .card-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
    }
  }
}

// 脉动动画
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>

