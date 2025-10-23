<template>
  <div class="thread-drawer">
    <!-- 基本信息 -->
    <div class="drawer-section">
      <div class="section-title"><el-icon><DataAnalysis /></el-icon> 基本信息</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">任务ID:</span>
          <span class="value">{{ taskData.id }}</span>
        </div>
        <div class="info-item">
          <span class="label">状态:</span>
          <el-tag :type="getStatusTagType(taskData.status)" size="small">{{ getStatusText(taskData.status) }}</el-tag>
        </div>
        <div class="info-item">
          <span class="label">发送时间:</span>
          <span class="value">{{ taskData.sentTime || '未发送' }}</span>
        </div>
        <div class="info-item">
          <span class="label">进度:</span>
          <span class="value">{{ taskData.progress.toFixed(0) }}%</span>
        </div>
      </div>
    </div>

    <el-divider></el-divider>

    <!-- 任务创建时元数据 -->
    <div v-if="taskData.metadata" class="drawer-section">
      <div class="section-title">
        <el-icon><Setting /></el-icon> 
        任务创建时元数据
        <el-tooltip content="创建时使用的配置，具体发送请以实际发送配置为准" placement="top">
          <el-icon class="info-icon" style="margin-left: 8px; font-size: 14px; color: #909399;">
            <QuestionFilled />
          </el-icon>
        </el-tooltip>
      </div>
      <div class="metadata-grid">
        <div class="metadata-item">
          <span class="label">模型:</span>
          <span class="value">{{ taskData.metadata.modelId }}</span>
        </div>
        <div class="metadata-item">
          <span class="label">分片策略:</span>
          <span class="value">{{ taskData.metadata.chunkStrategy === 'line' ? `按行 (${taskData.metadata.chunkSizeByLine})` : `按Token (${taskData.metadata.chunkSizeByToken})` }}</span>
        </div>
        <div class="metadata-item">
          <span class="label">并发数:</span>
          <span class="value">{{ taskData.metadata.concurrency }}</span>
        </div>
        <div class="metadata-item">
          <span class="label">回复模式:</span>
          <span class="value">{{ getReplyModeText(taskData.metadata.replyMode) }}</span>
        </div>
        <div class="metadata-item">
          <span class="label">预估输入Token:</span>
          <span class="value">{{ taskData.metadata.estimatedInputTokens }}</span>
        </div>
        <div class="metadata-item">
          <span class="label">预估输出Token:</span>
          <span class="value">{{ taskData.metadata.estimatedOutputTokens }}</span>
        </div>
        <div class="metadata-item" v-if="taskData.metadata.actualInputTokens">
          <span class="label">实际输入Token:</span>
          <span class="value">{{ taskData.metadata.actualInputTokens }}</span>
        </div>
        <div class="metadata-item" v-if="taskData.metadata.actualOutputTokens">
          <span class="label">实际输出Token:</span>
          <span class="value">{{ taskData.metadata.actualOutputTokens }}</span>
        </div>
        <div class="metadata-item">
          <span class="label">预估费用:</span>
          <span class="value">¥{{ taskData.metadata.estimatedCost.toFixed(3) }}</span>
        </div>
        <div class="metadata-item" v-if="taskData.metadata.actualCost">
          <span class="label">实际费用:</span>
          <span class="value">¥{{ taskData.metadata.actualCost.toFixed(3) }}</span>
        </div>
      </div>

    </div>

    <el-divider></el-divider>

    <!-- 实际发送配置 -->
    <div v-if="batchConfig" class="drawer-section">
      <div class="section-title">
        <el-icon><Stamp /></el-icon> 
        实际发送配置
        <el-tooltip content="批次的 config.json，为实际发送请求的配置（实时更新）" placement="top">
          <el-icon class="info-icon" style="margin-left: 8px; font-size: 14px; color: #909399;">
            <QuestionFilled />
          </el-icon>
        </el-tooltip>
      </div>
      
      <!-- 模型参数 -->
      <div class="config-subsection">
        <div class="subsection-title">模型参数</div>
        <div class="metadata-grid">
          <div class="metadata-item">
            <span class="label">模型ID:</span>
            <span class="value">{{ batchConfig.modelId }}</span>
          </div>
          <div class="metadata-item" v-if="batchConfig.maxTokens">
            <span class="label">最大Token:</span>
            <span class="value">{{ batchConfig.maxTokens }}</span>
          </div>
          <div class="metadata-item" v-if="batchConfig.temperature !== undefined">
            <span class="label">Temperature:</span>
            <span class="value">{{ batchConfig.temperature }}</span>
          </div>
          <div class="metadata-item" v-if="batchConfig.topP !== undefined">
            <span class="label">Top P:</span>
            <span class="value">{{ batchConfig.topP }}</span>
          </div>
          <div class="metadata-item" v-if="batchConfig.frequencyPenalty !== undefined">
            <span class="label">频率惩罚:</span>
            <span class="value">{{ batchConfig.frequencyPenalty }}</span>
          </div>
          <div class="metadata-item" v-if="batchConfig.presencePenalty !== undefined">
            <span class="label">存在惩罚:</span>
            <span class="value">{{ batchConfig.presencePenalty }}</span>
          </div>
        </div>
      </div>

      <!-- 分片策略 -->
      <div class="config-subsection">
        <div class="subsection-title">分片策略</div>
        <div class="metadata-grid">
          <div class="metadata-item">
            <span class="label">分片策略:</span>
            <span class="value">{{ batchConfig.chunkStrategy === 'line' ? '按行' : '按Token' }}</span>
          </div>
          <div class="metadata-item" v-if="batchConfig.chunkStrategy === 'line'">
            <span class="label">每片行数:</span>
            <span class="value">{{ batchConfig.chunkSizeByLine }}</span>
          </div>
          <div class="metadata-item" v-if="batchConfig.chunkStrategy === 'token'">
            <span class="label">每片Token:</span>
            <span class="value">{{ batchConfig.chunkSizeByToken }}</span>
          </div>
          <div class="metadata-item">
            <span class="label">并发数:</span>
            <span class="value">{{ batchConfig.concurrency }}</span>
          </div>
          <div class="metadata-item">
            <span class="label">回复模式:</span>
            <span class="value">{{ getReplyModeText(batchConfig.replyMode) }}</span>
          </div>
          <div class="metadata-item" v-if="batchConfig.predictedTokens">
            <span class="label">预测Token:</span>
            <span class="value">{{ batchConfig.predictedTokens }}</span>
          </div>
        </div>
      </div>

      <!-- 超时控制 -->
      <div class="config-subsection">
        <div class="subsection-title">超时控制</div>
        <div class="metadata-grid">
          <div class="metadata-item" v-if="batchConfig.taskTotalTimeout">
            <span class="label">任务总超时:</span>
            <span class="value">{{ (batchConfig.taskTotalTimeout / 1000).toFixed(0) }}秒</span>
          </div>
          <div class="metadata-item" v-if="batchConfig.httpTimeout">
            <span class="label">HTTP超时:</span>
            <span class="value">{{ (batchConfig.httpTimeout / 1000).toFixed(0) }}秒</span>
          </div>
          <div class="metadata-item" v-if="batchConfig.streamFirstTokenTimeout">
            <span class="label">流式首字超时:</span>
            <span class="value">{{ (batchConfig.streamFirstTokenTimeout / 1000).toFixed(0) }}秒</span>
          </div>
          <div class="metadata-item" v-if="batchConfig.streamIdleTimeout">
            <span class="label">流式空闲超时:</span>
            <span class="value">{{ (batchConfig.streamIdleTimeout / 1000).toFixed(0) }}秒</span>
          </div>
        </div>
      </div>

      <!-- 请求控制 -->
      <div class="config-subsection">
        <div class="subsection-title">请求控制</div>
        <div class="metadata-grid">
          <div class="metadata-item" v-if="batchConfig.enableStreaming !== undefined">
            <span class="label">启用流式:</span>
            <span class="value">
              <el-tag :type="batchConfig.enableStreaming ? 'success' : 'info'" size="small">
                {{ batchConfig.enableStreaming ? '是' : '否' }}
              </el-tag>
            </span>
          </div>
          <div class="metadata-item" v-if="batchConfig.maxRetries !== undefined">
            <span class="label">最大重试:</span>
            <span class="value">{{ batchConfig.maxRetries }}次</span>
          </div>
          <div class="metadata-item" v-if="batchConfig.tokenConversionConfigId">
            <span class="label">Token估算:</span>
            <span class="value">{{ batchConfig.tokenConversionConfigId }}</span>
          </div>
        </div>
      </div>

      <!-- 调度策略 -->
      <div class="config-subsection" v-if="batchConfig.schedulerConfig">
        <div class="subsection-title">调度策略</div>
        <div class="metadata-grid">
          <div class="metadata-item">
            <span class="label">调度模式:</span>
            <span class="value">
              <el-tag :type="batchConfig.schedulerConfig.schedulingStrategy === 'event' ? 'success' : 'warning'" size="small">
                {{ batchConfig.schedulerConfig.schedulingStrategy === 'event' ? '事件驱动' : '定时轮询' }}
              </el-tag>
            </span>
          </div>
          <div class="metadata-item" v-if="batchConfig.schedulerConfig.schedulingStrategy === 'timed'">
            <span class="label">轮询间隔:</span>
            <span class="value">{{ batchConfig.schedulerConfig.timedInterval }}秒</span>
          </div>
        </div>
      </div>

      <!-- 系统提示词 -->
      <div class="config-subsection">
        <div class="subsection-title">系统提示词</div>
        <div class="prompt-content-box">
          {{ batchConfig.systemPrompt || '未设置' }}
        </div>
      </div>
    </div>
    
    <!-- 如果批次配置不可用，显示提示 -->
    <div v-else class="drawer-section">
      <div class="section-title">
        <el-icon><Stamp /></el-icon> 
        实际发送配置
      </div>
      <el-alert
        title="批次配置不可用"
        type="warning"
        :closable="false"
        description="无法加载批次的 config.json，请确保批次数据已正确加载"
      />
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
            <span class="message-time">{{ taskData.sentTime }}</span>
          </div>
          <div class="message-content">
            <div class="message-label">原文:</div>
            <div class="message-text">{{ taskData.content }}</div>
          </div>
        </div>

        <!-- LLM 消息：翻译结果 -->
        <div class="chat-message llm-message">
          <div class="message-header">
            <span class="message-sender"><el-icon><Monitor /></el-icon> LLM</span>
            <span class="message-time" v-if="taskData.status === 'completed'">已完成</span>
            <span v-else class="message-status">
              <el-icon class="is-loading"><Loading /></el-icon>
              翻译中...
            </span>
          </div>
          <div class="message-content">
            <div class="message-label">翻译结果:</div>
            <div class="message-text">
              {{ taskData.translation || '（翻译结果尚未返回）' }}
            </div>

            <!-- 进度条（waiting/sending 时显示） -->
            <div v-if="taskData.status === 'waiting' || taskData.status === 'sending'" class="stream-progress">
              <el-progress
                :percentage="taskData.progress"
                :stroke-width="3"
                :color="taskData.status === 'sending' ? '#409eff' : '#67c23a'"
              ></el-progress>
              <span class="progress-info">
                {{ taskData.replyTokens }} / {{ taskData.predictedTokens }} tokens
                ({{ taskData.progress.toFixed(0) }}%)
              </span>
            </div>
            
            <!-- 完成时显示最终结果 -->
            <div v-else-if="taskData.status === 'completed'" class="stream-progress completed">
              <el-progress
                :percentage="100"
                :stroke-width="3"
                color="#67c23a"
              ></el-progress>
              <span class="progress-info success">
                已完成：{{ taskData.replyTokens }} / {{ taskData.predictedTokens }} tokens (100%)
                <span v-if="taskData.durationMs" class="duration"> · 耗时 {{ taskData.durationMs }}ms</span>
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
        <el-button @click="copyTranslation" type="primary" size="small" :disabled="!taskData.translation">
          <el-icon><Document /></el-icon> 复制翻译
        </el-button>
        <el-button @click="retryTask" type="warning" size="small" v-if="taskData.status === 'error'">
          <el-icon><Refresh /></el-icon> 重新翻译
        </el-button>

        <!-- 已完成任务的重发操作 -->
        <template v-if="taskData.status === 'completed'">
          <div class="retry-completed-group">
            <el-checkbox 
              v-model="withPromptModification" 
              size="small"
            >
              <el-tooltip 
                content="勾选后可在重发时修改或追加系统提示词"
                placement="top"
              >
                <span class="checkbox-label">修改提示词</span>
              </el-tooltip>
            </el-checkbox>
            <el-button 
              @click="handleRetryCompleted" 
              type="success" 
              size="small"
            >
              <el-icon><Refresh /></el-icon> 重发
            </el-button>
          </div>
        </template>

        <el-button @click="saveTask" type="success" size="small" v-if="taskData.status === 'completed'">
          <el-icon><Download /></el-icon> 保存结果
        </el-button>
      </div>
    </div>

    <!-- 任务提示词修正对话框 -->
    <TaskRetryDialog
      v-model:visible="retryDialogVisible"
      :current-system-prompt="taskData.metadata?.systemPrompt || ''"
      @confirm="handleRetryConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElAlert } from 'element-plus'
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
  Setting,
  Stamp,
  QuestionFilled
} from '@element-plus/icons-vue'
import type { Task } from '../types/task'
import type { TaskStatus } from '../types/task'
import { useLlmTranslateStore } from '../stores'
import { computed, ref } from 'vue'
import TaskRetryDialog from './TaskRetryDialog.vue'

interface Props {
  task: Task
}

const props = defineProps<Props>()
const store = useLlmTranslateStore()

// 实时响应 Store 中的任务更新
const taskData = computed(() => {
  // 从 Store 中查找最新的任务数据
  return store.taskList.find(t => t.id === props.task.id) || props.task
})

// 获取批次的实际配置（从批次的 config.json）
const batchConfig = computed(() => {
  const batch = store.batchList.find(b => b.id === taskData.value.batchId)
  if (batch && batch.configJson) {
    try {
      return typeof batch.configJson === 'string' 
        ? JSON.parse(batch.configJson) 
        : batch.configJson
    } catch (error) {
      console.error('解析批次配置失败:', error)
      return null
    }
  }
  return null
})

// 重发相关状态
const withPromptModification = ref(false)
const retryDialogVisible = ref(false)

// 辅助函数：获取回复模式文本
const getReplyModeText = (mode: string) => {
  const modeMap: Record<string, string> = {
    'equivalent': '等量',
    'concise': '精简',
    'detailed': '详细'
  }
  return modeMap[mode] || mode
}

// 处理已完成任务的重发
const handleRetryCompleted = () => {
  if (withPromptModification.value) {
    // 打开对话框让用户修改提示词
    retryDialogVisible.value = true
  } else {
    // 直接重发，不修改提示词
    void retryTaskWithPrompt('none')
  }
}

// 处理对话框确认
const handleRetryConfirm = async (data: {
  type: 'replace' | 'append' | 'none'
  content?: string
}) => {
  await retryTaskWithPrompt(data.type, data.content)
  withPromptModification.value = false
}

// 执行重发任务
const retryTaskWithPrompt = async (
  type: 'replace' | 'append' | 'none',
  content?: string
) => {
  try {
    const currentTask = taskData.value
    let modifiedSystemPrompt: string | undefined = undefined

    if (type === 'replace' && content) {
      // 替换系统提示词
      modifiedSystemPrompt = content
    } else if (type === 'append' && content) {
      // 追加系统提示词
      const original = currentTask.metadata?.systemPrompt || ''
      modifiedSystemPrompt = original + '\n\n' + content
    }
    // type === 'none' 时 modifiedSystemPrompt 为 undefined，后端使用原提示词

    // 调用 Store 的重试方法
    await store.retryTaskWithPrompt(currentTask.id, modifiedSystemPrompt)
  } catch (error) {
    console.error('重发任务失败:', error)
  }
}

// 获取任务状态文本
const getStatusText = (status: TaskStatus): string => {
  switch (status) {
    case 'unsent': return '未发送'
    case 'waiting': return '等待中'
    case 'sending': return '发送中'
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
    case 'sending': return 'primary'
    case 'waiting': return 'primary'
    case 'throttled': return 'danger'
    case 'error': return 'warning'
    case 'unsent': return 'info'
    default: return ''
  }
}

// 复制原文
const copySource = () => {
  void navigator.clipboard.writeText(taskData.value.content)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ElMessage.success({ message: '原文已复制' } as any)
}

// 复制翻译
const copyTranslation = () => {
  if (!taskData.value.translation) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ElMessage.warning({ message: '翻译结果尚未返回' } as any)
    return
  }
  void navigator.clipboard.writeText(taskData.value.translation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ElMessage.success({ message: '翻译已复制' } as any)
}

// 重新翻译
const retryTask = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ElMessage.info({ message: '正在重新翻译...' } as any)
  // TODO: 实现重试逻辑
}

// 保存结果
const saveTask = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ElMessage.success({ message: '结果已保存' } as any)
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

  // 实际发送配置区域样式
  .config-subsection {
    margin-bottom: 20px;

    .subsection-title {
      font-size: 13px;
      font-weight: 600;
      color: #606266;
      margin-bottom: 12px;
      padding-left: 8px;
      border-left: 3px solid #409eff;
    }

    .prompt-content-box {
      padding: 12px;
      background-color: #f5f7fa;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 13px;
      color: #333;
      line-height: 1.8;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 300px;
      overflow-y: auto;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
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
      align-items: center;
    }

    .retry-completed-group {
      display: inline-flex;
      align-items: center;
      gap: 8px;

      .checkbox-label {
        font-size: 12px;
        color: #606266;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
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
