<template>
  <div class="thread-drawer">
    <!-- 基本信息 -->
    <div class="drawer-section">
      <div class="section-title">📊 基本信息</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">任务ID:</span>
          <span class="value">{{ task.id }}</span>
        </div>
        <div class="info-item">
          <span class="label">状态:</span>
          <el-tag :type="getStatusTagType(task.status)" size="small">{{ getStatusText(task.status) }}</el-tag>
        </div>
        <div class="info-item">
          <span class="label">发送时间:</span>
          <span class="value">{{ task.sentTime || '未发送' }}</span>
        </div>
        <div class="info-item">
          <span class="label">进度:</span>
          <span class="value">{{ task.progress.toFixed(0) }}%</span>
        </div>
      </div>
    </div>

    <el-divider></el-divider>

    <!-- AI 对话流 -->
    <div class="drawer-section">
      <div class="section-title">💬 翻译对话</div>
      
      <div class="chat-container">
        <!-- 用户消息：原文 -->
        <div class="chat-message user-message">
          <div class="message-header">
            <span class="message-sender">👤 用户</span>
            <span class="message-time">{{ task.sentTime }}</span>
          </div>
          <div class="message-content">
            <div class="message-label">原文:</div>
            <div class="message-text">{{ task.content }}</div>
          </div>
        </div>

        <!-- LLM 消息：翻译结果 -->
        <div class="chat-message llm-message">
          <div class="message-header">
            <span class="message-sender">🤖 LLM</span>
            <span class="message-time" v-if="task.status === 'completed'">已完成</span>
            <span v-else class="message-status">
              <el-icon class="is-loading"><Loading /></el-icon>
              翻译中...
            </span>
          </div>
          <div class="message-content">
            <div class="message-label">翻译结果:</div>
            <div class="message-text">
              {{ task.translation || '（翻译结果尚未返回）' }}
            </div>

            <!-- 进度条（仅在等待中显示） -->
            <div v-if="task.status === 'waiting'" class="stream-progress">
              <el-progress
                :percentage="task.progress"
                :stroke-width="3"
                color="#409eff"
              ></el-progress>
              <span class="progress-info">
                {{ task.replyTokens }} / {{ task.predictedTokens }} tokens
                ({{ task.progress.toFixed(0) }}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-divider></el-divider>

    <!-- 操作按钮 -->
    <div class="drawer-section actions-section">
      <div class="section-title">🔧 快速操作</div>
      <div class="action-buttons">
        <el-button @click="copySource" type="primary" size="small">📋 复制原文</el-button>
        <el-button @click="copyTranslation" type="primary" size="small" :disabled="!task.translation">
          📋 复制翻译
        </el-button>
        <el-button @click="retryTask" type="warning" size="small" v-if="task.status === 'error'">
          🔄 重新翻译
        </el-button>
        <el-button @click="saveTask" type="success" size="small" v-if="task.status === 'completed'">
          💾 保存结果
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import type { Task } from '../types/task'
import type { TaskStatus } from '../types/task'

interface Props {
  task: Task
}

const props = defineProps<Props>()

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

// 复制原文
const copySource = () => {
  navigator.clipboard.writeText(props.task.content)
  ElMessage.success('✅ 原文已复制')
}

// 复制翻译
const copyTranslation = () => {
  if (!props.task.translation) {
    ElMessage.warning('翻译结果尚未返回')
    return
  }
  navigator.clipboard.writeText(props.task.translation)
  ElMessage.success('✅ 翻译已复制')
}

// 重新翻译
const retryTask = () => {
  ElMessage.info('正在重新翻译...')
  // TODO: 实现重试逻辑
}

// 保存结果
const saveTask = () => {
  ElMessage.success('✅ 结果已保存')
  // TODO: 实现保存逻辑
}
</script>

<style scoped lang="scss">
.thread-drawer {
  padding: 16px;
  height: 100%;
  overflow-y: auto;

  .drawer-section {
    margin-bottom: 20px;

    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #333;
      margin-bottom: 12px;
      padding-left: 4px;
      border-left: 3px solid #409eff;
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      background-color: #f5f7fa;
      border-radius: 4px;

      .label {
        font-size: 12px;
        color: #909399;
      }

      .value {
        font-size: 13px;
        color: #333;
        font-weight: 500;
      }
    }
  }

  .chat-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 400px;
    overflow-y: auto;
    padding: 8px;
    background-color: #fafbfc;
    border-radius: 4px;

    .chat-message {
      padding: 12px;
      border-radius: 6px;
      background-color: white;
      border: 1px solid #e4e7eb;

      &.user-message {
        background-color: #f0f9ff;
        border-color: #b3d8ff;
      }

      &.llm-message {
        background-color: #f6f8fb;
        border-color: #e4e7eb;
      }

      .message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 12px;

        .message-sender {
          font-weight: bold;
          color: #333;
        }

        .message-time {
          color: #909399;
        }

        .message-status {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #409eff;

          .el-icon {
            animation: spin 1s linear infinite;
          }
        }
      }

      .message-content {
        .message-label {
          font-size: 12px;
          font-weight: bold;
          color: #606266;
          margin-bottom: 6px;
        }

        .message-text {
          font-size: 13px;
          color: #333;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .stream-progress {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e4e7eb;

          :deep(.el-progress) {
            margin-bottom: 6px;
          }

          .progress-info {
            display: block;
            font-size: 12px;
            color: #909399;
            text-align: right;
          }
        }
      }
    }
  }

  .actions-section {
    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
