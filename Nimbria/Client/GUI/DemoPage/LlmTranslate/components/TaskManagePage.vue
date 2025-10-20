<template>
  <div class="task-manage-page">
    <!-- 左侧：批次列表 -->
    <div class="sidebar">
      <!-- 批次列表标题栏 + 工具栏 -->
      <div class="sidebar-header">
        <div class="header-content">
          <el-icon><Collection /></el-icon> 
          <span>批次列表</span>
        </div>
        
        <!-- 批次管理工具栏 -->
        <div class="batch-toolbar">
          <!-- 选择模式切换 -->
          <div 
            class="batch-tool-item" 
            :class="{ 'batch-tool-item--active': store.batchSelectMode }"
            @click="store.batchSelectMode = !store.batchSelectMode"
            :title="`${store.batchSelectMode ? '取消' : '启用'}批次选择模式`"
          >
            <el-icon><Check /></el-icon>
          </div>

          <!-- 全选批次 -->
          <div 
            v-show="store.batchSelectMode"
            class="batch-tool-item" 
            @click="selectAllBatches"
            title="全选所有批次"
          >
            <el-icon><Select /></el-icon>
          </div>

          <!-- 删除选中批次 -->
          <div 
            v-show="store.batchSelectMode && store.selectedBatchIds.size > 0"
            class="batch-tool-item batch-tool-item--danger" 
            @click="deleteSelectedBatches"
            :title="`删除选中的 ${store.selectedBatchIds.size} 个批次`"
          >
            <el-icon><Delete /></el-icon>
          </div>
        </div>
      </div>

      <!-- 批次列表 -->
      <div class="batch-list">
        <div
          v-for="batch in store.batchList"
          :key="batch.id"
          class="batch-item"
          :class="{ 
            active: store.currentBatch?.id === batch.id,
            selected: store.selectedBatchIds.has(batch.id)
          }"
          @click="handleBatchClick(batch)"
        >
          <!-- 选择模式下的复选框 -->
          <div v-if="store.batchSelectMode" class="batch-checkbox">
            <el-checkbox
              :model-value="store.selectedBatchIds.has(batch.id)"
              @change="store.toggleBatchSelection(batch.id)"
              @click.stop
            />
          </div>

          <div class="batch-info">
            <div class="batch-id">{{ batch.id }}</div>
            <div class="batch-status" :class="`status-${batch.status}`">
              {{ getBatchStatusText(batch.status) }}
            </div>
            <div class="batch-stats">
              {{ batch.totalTasks }} 任务 | <el-icon><Check /></el-icon> {{ batch.completedTasks }}
            </div>
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
          <span class="stat-label"><el-icon><Check /></el-icon> 已完成:</span>
          <span class="stat-value" style="color: #67c23a">{{ store.batchStats?.completedTasks }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label"><el-icon><Timer /></el-icon> 进行中:</span>
          <span class="stat-value" style="color: #409eff">{{ store.currentBatch.totalTasks - store.batchStats!.completedTasks - store.batchStats!.failedTasks }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label"><el-icon><Close /></el-icon> 失败:</span>
          <span class="stat-value" style="color: #f56c6c">{{ store.batchStats?.failedTasks }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">成功率:</span>
          <span class="stat-value">{{ store.batchStats?.successRate.toFixed(1) }}%</span>
        </div>
      </div>

      <!-- 工具栏 -->
      <div class="toolbar">
        <!-- 第一行：搜索栏 + 留空区域 -->
        <div class="toolbar-row toolbar-row-1">
          <el-input
            v-model="store.taskFilters.searchText"
            placeholder="搜索任务 ID 或内容..."
            :prefix-icon="Search"
            class="search-input"
            clearable
          />
          <div class="toolbar-spacer"></div>
        </div>

        <!-- 第二行：工具栏 -->
        <div class="toolbar-row toolbar-row-2">
          <div class="toolbar-tools">
            <!-- 选择（切换选择状态） -->
            <div 
              class="tool-item" 
              :class="{ 'tool-item--active': store.taskFilters.selectMode }"
              @click="store.taskFilters.selectMode = !store.taskFilters.selectMode"
              :title="`${store.taskFilters.selectMode ? '取消' : '启用'}选择模式`"
            >
              <el-icon><Check /></el-icon>
            </div>

            <!-- 全选 -->
            <div 
              class="tool-item" 
              @click="selectAllTasks"
              :title="`全选`"
            >
              <el-icon><Select /></el-icon>
            </div>

            <!-- 重试 -->
            <div 
              class="tool-item" 
              @click="retryFailedTasks"
              :title="`重试`"
            >
              <el-icon><Refresh /></el-icon>
            </div>

            <!-- 测试限流 -->
            <div 
              class="tool-item" 
              @click="testThrottle"
              :title="`测试限流`"
            >
              <el-icon><VideoPlay /></el-icon>
            </div>

            <!-- 暂停 -->
            <div 
              class="tool-item" 
              @click="store.currentBatch?.id && pauseBatch(store.currentBatch.id)"
              :title="`暂停`"
            >
              <el-icon><VideoPause /></el-icon>
            </div>

            <!-- 发送 -->
            <div 
              class="tool-item" 
              @click="sendSelected"
              :title="`发送`"
            >
              <el-icon><Upload /></el-icon>
            </div>

            <!-- 删除 -->
            <div 
              class="tool-item" 
              @click="deleteSelected"
              :title="`删除`"
            >
              <el-icon><Delete /></el-icon>
            </div>
          </div>
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
            <!-- 选择模式下的复选框 -->
            <div v-if="store.taskFilters.selectMode" class="task-checkbox">
              <el-checkbox 
                :model-value="store.selectedTaskIds.has(task.id)"
                @change="toggleTaskSelection(task.id)"
              />
            </div>
            
            <div class="status-info">
              <span class="status-dot" :class="`dot-${task.status}`"></span>
              <span class="task-id">{{ task.id }}</span>
              <el-tag :type="getStatusTagType(task.status)" size="small">
                {{ getStatusText(task.status) }}
              </el-tag>
              
              <!-- 错误代码显示 -->
              <el-tag v-if="task.errorType" type="danger" size="small" class="error-code-tag">
                {{ task.errorType }}
              </el-tag>
              
              <!-- 暂停按钮（仅在 sending 状态） -->
              <el-button
                v-if="task.status === 'sending'"
                type="warning"
                size="small"
                @click.stop="pauseTask(task.id)"
                class="btn-pause"
              >
                <el-icon><VideoPause /></el-icon> 暂停
              </el-button>
            </div>
          </div>

          <!-- 卡片内容 -->
          <div class="card-content">
            <div class="content-preview">{{ task.content.substring(0, 80) }}...</div>
            <div class="content-meta">
              <span v-if="task.sentTime"><el-icon><Clock /></el-icon> {{ task.sentTime }}</span>
              <span v-if="task.status === 'completed'"><el-icon><Check /></el-icon> 已完成</span>
            </div>
          </div>

          <!-- 进度条（waiting/sending 时显示） -->
          <div v-if="task.status === 'sending' || task.status === 'waiting'" class="progress-section">
            <el-progress
              :percentage="task.progress"
              :stroke-width="2"
              :color="task.status === 'sending' ? '#409eff' : '#67c23a'"
            ></el-progress>
            <div class="progress-info">
              {{ task.replyTokens }} / {{ task.predictedTokens }} tokens ({{ task.progress.toFixed(0) }}%)
            </div>
          </div>

          <!-- 卡片操作 -->
          <div class="card-actions">
            <el-button size="small" @click="openThreadDrawer(task.id)">
              <el-icon><Document /></el-icon> 详情
            </el-button>
            <el-button
              v-if="task.status === 'error' || task.status === 'throttled'"
              size="small"
              type="warning"
            >
              <el-icon><Refresh /></el-icon> 重试
            </el-button>
            <el-button v-if="task.status === 'unsent'" size="small" type="primary">
              <el-icon><Upload /></el-icon> 发送
            </el-button>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Refresh, 
  Search, 
  VideoPause, 
  VideoPlay, 
  Check, 
  Select, 
  Upload, 
  Delete, 
  Collection, 
  Timer, 
  Close, 
  Clock, 
  Document
} from '@element-plus/icons-vue'
import { useLlmTranslateStore } from '../stores'
import { useTaskManagement } from '../composables/useTaskManagement'
import { useBatchManagement } from '../composables/useBatchManagement'
import ThreadDrawer from './ThreadDrawer.vue'
import type { TaskStatus } from '../types/task'

const store = useLlmTranslateStore()
const { loadTasks, retryFailedTasks } = useTaskManagement()
const { switchToBatch, pauseBatch } = useBatchManagement()

const currentTask = computed(() => {
  if (!store.threadDrawer.currentTaskId) return null
  return store.taskList.find(task => task.id === store.threadDrawer.currentTaskId)
})

// 获取批次状态文本
const getBatchStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'running': '进行中',
    'paused': '已暂停',
    'completed': '已完成',
    'failed': '失败'
  }
  return statusMap[status] || status
}

// 获取任务状态文本
const getStatusText = (status: TaskStatus): string => {
  switch (status) {
    case 'unsent': return '未发送'
    case 'queued': return '排队中'
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
    case 'queued': return ''
    case 'waiting': return 'primary'
    case 'throttled': return 'danger'
    case 'error': return 'warning'
    case 'unsent': return 'info'
    default: return ''
  }
}

// 处理批次选择
const handleBatchSelect = async (batchId: string) => {
  await switchToBatch(batchId)
}

// 处理批次点击（区分选择模式和正常模式）
const handleBatchClick = (batch: { id: string }) => {
  if (store.batchSelectMode) {
    // 选择模式下切换选择状态
    store.toggleBatchSelection(batch.id)
  } else {
    // 正常模式下切换批次
    void handleBatchSelect(batch.id)
  }
}

// 全选批次
const selectAllBatches = () => {
  store.selectAllBatches()
}

// 删除选中批次
const deleteSelectedBatches = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${store.selectedBatchIds.size} 个批次吗？这将同时删除所有相关任务。`,
      '删除批次',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await store.deleteSelectedBatches()
    
    ElMessage({ message: '成功删除批次', type: 'success' })
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除批次失败:', error)
      const errorMsg = error instanceof Error ? error.message : '删除批次失败'
      ElMessage({ message: errorMsg, type: 'error' })
    }
  }
}

// 打开线程详情抽屉
const openThreadDrawer = (taskId: string) => {
  store.threadDrawer.currentTaskId = taskId
  store.threadDrawer.isOpen = true
}

// 暂停任务
const pauseTask = async (taskId: string) => {
  try {
    await store.pauseTask(taskId)
    ElMessage({ message: '任务已暂停', type: 'success' })
  } catch (error) {
    console.error('暂停任务失败:', error)
    const errorMsg = error instanceof Error ? error.message : '暂停任务失败'
    ElMessage({ message: errorMsg, type: 'error' })
  }
}

// 切换单个任务选择状态
const toggleTaskSelection = (taskId: string) => {
  if (store.selectedTaskIds.has(taskId)) {
    store.selectedTaskIds.delete(taskId)
  } else {
    store.selectedTaskIds.add(taskId)
  }
}

// 全选/全不选任务（智能切换）
const selectAllTasks = () => {
  if (!store.currentBatch) return
  
  const availableTaskIds = store.filteredTaskList.map(task => task.id)
  const selectedCount = availableTaskIds.filter(id => store.selectedTaskIds.has(id)).length
  
  // 如果全部已选中，则全部取消选中
  if (selectedCount === availableTaskIds.length && availableTaskIds.length > 0) {
    store.selectedTaskIds = new Set()
  } else {
    // 否则全部选中
    store.selectedTaskIds = new Set(availableTaskIds)
  }
}

// 测试限流
const testThrottle = () => {
  console.log('测试限流功能')
  // TODO: 实现测试限流的具体逻辑
}

// 发送选中任务
const sendSelected = async () => {
  try {
    await store.sendSelectedTasks()
  } catch (err) {
    console.error('发送任务失败:', err)
  }
}

// 删除选中任务
const deleteSelected = async () => {
  try {
    await store.deleteSelectedTasks()
  } catch (err) {
    console.error('删除任务失败:', err)
  }
}

// 页面加载
onMounted(async () => {
  if (!store.currentBatch && store.batchList.length > 0 && store.batchList[0]) {
    await switchToBatch(store.batchList[0].id)
  }
  if (store.currentBatch?.id) {
    await loadTasks(store.currentBatch.id)
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
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background-color: #f5f7fa;
    border-bottom: 1px solid #e4e7eb;
    
    .header-content {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: bold;
      color: #333;
    }
    
    .batch-toolbar {
      display: flex;
      gap: 4px;
      align-items: center;
      
      .batch-tool-item {
        cursor: pointer;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 1px solid #dcdfe6;
        background-color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        
        &:hover {
          border-color: #409eff;
          background-color: #ecf5ff;
        }
        
        &--active {
          background-color: #409eff;
          color: white;
          border-color: #409eff;
        }
        
        &--danger {
          &:hover {
            border-color: #f56c6c;
            background-color: #fef0f0;
            color: #f56c6c;
          }
        }
        
        .el-icon {
          font-size: 14px;
        }
      }
    }
  }

  .batch-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;

    .batch-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
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

      &.selected {
        background-color: #e1f3ff;
        border-color: #91d5ff;
        box-shadow: 0 0 0 1px #91d5ff;
      }

      .batch-checkbox {
        padding-top: 2px;
        flex-shrink: 0;
      }

      .batch-info {
        flex: 1;
        min-width: 0;
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
    padding: 6px 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;

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
    flex-direction: column;
    gap: 12px;

    .toolbar-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .toolbar-row-1 {
      margin-bottom: 0;
    }

    .toolbar-spacer {
      flex-grow: 1;
    }

    .toolbar-tools {
      display: flex;
      gap: 0;
      align-items: flex-start;

      .tool-item {
        cursor: pointer;
        width: 36px;
        height: 36px;
        border-radius: 0;
        background-color: #f0f2f5;
        border: 1px solid #d9d9d9;
        border-right: none;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        font-size: 18px;

        &:last-child {
          border-right: 1px solid #d9d9d9;
        }

        &:hover {
          background-color: #e6f7ff;
          border-color: #409eff;
        }

        span {
          font-size: 18px;
        }

        &.tool-item--active {
          background-color: #409eff;
          color: white;
          border-color: #409eff;
        }
      }
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
      &.status-queued { border-left-color: #e3d217; }
      &.status-waiting { border-left-color: #409eff; }
      &.status-throttled { border-left-color: #a02de2; }
      &.status-error { border-left-color: #f56c6c; }
      &.status-completed { border-left-color: #67c23a; }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .task-checkbox {
          margin-right: 12px;
          display: flex;
          align-items: center;
        }

        .status-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;

          .status-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;

            &.dot-unsent { background-color: #909399; }
            &.dot-queued { background-color: #909399; }
            &.dot-waiting { background-color: #409eff; animation: pulse 2s infinite; }
            &.dot-sending { background-color: #409eff; animation: pulse 1s infinite; }
            &.dot-throttled { background-color: #f56c6c; }
            &.dot-error { background-color: #e6a23c; }
            &.dot-paused { background-color: #e6a23c; }
            &.dot-completed { background-color: #67c23a; }
          }

          .task-id {
            font-weight: bold;
            color: #333;
            font-size: 14px;
          }

          .error-code-tag {
            margin-left: 4px;
            font-size: 11px;
          }

          .btn-pause {
            margin-left: auto;
            font-size: 12px;
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

      .progress-section {
        margin: 8px 0;
        padding: 8px 0;
        border-top: 1px solid #f0f0f0;
        border-bottom: 1px solid #f0f0f0;

        :deep(.el-progress) {
          margin-bottom: 4px;
        }

        .progress-info {
          font-size: 12px;
          color: #909399;
          text-align: right;
          margin-top: 4px;
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

