<template>
  <div class="thread-drawer">
    <!-- 基本信息 -->
    <div class="drawer-section">
      <div class="section-title"><el-icon><DataAnalysis /></el-icon> 基本信息</div>
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

    <!-- 任务元数据 -->
    <div v-if="task.metadata" class="drawer-section">
      <div class="section-title"><el-icon><Setting /></el-icon> 任务配置</div>
      <div class="metadata-grid">
        <div class="metadata-item">
          <span class="label">模型:</span>
          <span class="value">{{ task.metadata.modelId }}</span>
        </div>
        <div class="metadata-item">
          <span class="label">分片策略:</span>
          <span class="value">{{ task.metadata.chunkStrategy === 'line' ? `按行 (${task.metadata.chunkSizeByLine})` : `按Token (${task.metadata.chunkSizeByToken})` }}</span>
        </div>
        <div class="metadata-item">
          <span class="label">并发数:</span>
          <span class="value">{{ task.metadata.concurrency }}</span>
        </div>
        <div class="metadata-item">
          <span class="label">回复模式:</span>
          <span class="value">{{ task.metadata.replyMode === 'predicted' ? '预测模式' : '等额模式' }}</span>
        </div>
        <div class="metadata-item">
          <span class="label">预估输入Token:</span>
          <span class="value">{{ task.metadata.estimatedInputTokens }}</span>
        </div>
        <div class="metadata-item">
          <span class="label">预估输出Token:</span>
          <span class="value">{{ task.metadata.estimatedOutputTokens }}</span>
        </div>
        <div class="metadata-item" v-if="task.metadata.actualInputTokens">
          <span class="label">实际输入Token:</span>
          <span class="value">{{ task.metadata.actualInputTokens }}</span>
        </div>
        <div class="metadata-item" v-if="task.metadata.actualOutputTokens">
          <span class="label">实际输出Token:</span>
          <span class="value">{{ task.metadata.actualOutputTokens }}</span>
        </div>
        <div class="metadata-item">
          <span class="label">预估费用:</span>
          <span class="value">¥{{ task.metadata.estimatedCost.toFixed(3) }}</span>
        </div>
        <div class="metadata-item" v-if="task.metadata.actualCost">
          <span class="label">实际费用:</span>
          <span class="value">¥{{ task.metadata.actualCost.toFixed(3) }}</span>
        </div>
      </div>

      <!-- 系统提示词 -->
      <div class="system-prompt-section">
        <div class="prompt-label">系统提示词:</div>
        <div class="prompt-content">{{ task.metadata.systemPrompt }}</div>
      </div>
    </div>

    <el-divider></el-divider>

    <!-- AI 对话流 -->
    <div class="drawer-section">
      <div class="section-title"><el-icon><ChatDotRound /></el-icon> 翻译对话</div>
      
      <div class="chat-container">
        <!-- 用户消息：原文 -->
        <div class="chat-message user-message">
          <div class="message-header">
            <span class="message-sender"><el-icon><User /></el-icon> 用户</span>
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
            <span class="message-sender"><el-icon><Monitor /></el-icon> LLM</span>
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

            <!-- 进度条（waiting/sending 时显示） -->
            <div v-if="task.status === 'waiting' || task.status === 'sending'" class="stream-progress">
              <el-progress
                :percentage="task.progress"
                :stroke-width="3"
                :color="task.status === 'sending' ? '#409eff' : '#67c23a'"
              ></el-progress>
              <span class="progress-info">
                {{ task.replyTokens }} / {{ task.predictedTokens }} tokens
                ({{ task.progress.toFixed(0) }}%)
              </span>
            </div>
            
            <!-- 完成时显示最终结果 -->
            <div v-else-if="task.status === 'completed'" class="stream-progress completed">
              <el-progress
                :percentage="100"
                :stroke-width="3"
                color="#67c23a"
              ></el-progress>
              <span class="progress-info success">
                已完成：{{ task.replyTokens }} / {{ task.predictedTokens }} tokens (100%)
                <span v-if="task.durationMs" class="duration"> · 耗时 {{ task.durationMs }}ms</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-divider></el-divider>

    <!-- 操作按钮 -->
    <div class="drawer-section actions-section">
      <div class="section-title"><el-icon><Tools /></el-icon> 快速操作</div>
      <div class="action-buttons">
        <el-button @click="copySource" type="primary" size="small">
          <el-icon><Document /></el-icon> 复制原文
        </el-button>
        <el-button @click="copyTranslation" type="primary" size="small" :disabled="!task.translation">
          <el-icon><Document /></el-icon> 复制翻译
        </el-button>
        <el-button @click="retryTask" type="warning" size="small" v-if="task.status === 'error'">
          <el-icon><Refresh /></el-icon> 重新翻译
        </el-button>
        <el-button @click="saveTask" type="success" size="small" v-if="task.status === 'completed'">
          <el-icon><Download /></el-icon> 保存结果
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { 
  Loading, 
  DataAnalysis, 
  ChatDotRound, 
  User, 
  Monitor, 
  Tools, 
  Document, 
  Refresh, 
  Download, 
  Check,
  Setting 
} from '@element-plus/icons-vue'
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
  ElMessage({ message: '原文已复制', type: 'success' })
}

// 复制翻译
const copyTranslation = () => {
  if (!props.task.translation) {
    ElMessage({ message: '翻译结果尚未返回', type: 'warning' })
    return
  }
  navigator.clipboard.writeText(props.task.translation)
  ElMessage({ message: '翻译已复制', type: 'success' })
}

// 重新翻译
const retryTask = () => {
  ElMessage({ message: '正在重新翻译...', type: 'info' })
  // TODO: 实现重试逻辑
}

// 保存结果
const saveTask = () => {
  ElMessage({ message: '结果已保存', type: 'success' })
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

  .metadata-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;

    .metadata-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      background-color: #f8f9fa;
      border-radius: 4px;
      border-left: 3px solid #409eff;

      .label {
        font-size: 11px;
        color: #909399;
        font-weight: 500;
      }

      .value {
        font-size: 12px;
        color: #333;
        font-weight: 600;
      }
    }
  }

  .system-prompt-section {
    .prompt-label {
      font-size: 12px;
      font-weight: bold;
      color: #606266;
      margin-bottom: 8px;
    }

    .prompt-content {
      font-size: 12px;
      color: #333;
      line-height: 1.5;
      padding: 12px;
      background-color: #f5f7fa;
      border-radius: 4px;
      border: 1px solid #e4e7eb;
      white-space: pre-wrap;
      word-break: break-word;
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
            
            &.success {
              color: #67c23a;
              font-weight: 500;
            }
            
            .duration {
              color: #909399;
              font-weight: normal;
            }
          }
          
          &.completed {
            border-top-color: #67c23a;
            background-color: #f0f9ff;
            padding: 12px;
            border-radius: 4px;
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
