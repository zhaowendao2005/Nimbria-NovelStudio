<template>
  <div class="home-page">
    <el-card class="config-card">
      <!-- 卡片标题 -->
      <template #header>
        <div class="card-header">
          <span><el-icon><Document /></el-icon> 任务配置</span>
        </div>
      </template>

      <!-- 输入源切换 Tab -->
      <div class="input-section">
        <div class="section-header">输入源选择</div>
        <el-radio-group v-model="store.config.inputSource" class="input-tabs">
          <el-radio-button label="file"><el-icon><Folder /></el-icon> 文件上传</el-radio-button>
          <el-radio-button label="text"><el-icon><Edit /></el-icon> 文本输入</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 文件模式 -->
      <div v-if="store.config.inputSource === 'file'" class="file-mode">
        <div class="section-header">选择待翻译文件</div>
        <el-upload
          class="upload-demo"
          drag
          action="#"
          :auto-upload="false"
          :on-change="handleFileChange"
          :show-file-list="false"
          accept=".txt,.md,.pdf,.docx"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            拖拽文件到此处或 <em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">支持 txt、md、pdf、docx 等文本文件，单个文件不超过 50MB</div>
          </template>
        </el-upload>

        <!-- 文件信息 -->
        <div v-if="fileName" class="file-info">
          <el-alert
            title="文件已选择"
            :description="`${fileName} (${fileSize})`"
            type="success"
            :closable="false"
            class="mb-2"
          />
          <el-button type="text" @click="removeFile" class="remove-btn">
            <el-icon><Delete /></el-icon> 移除此文件
          </el-button>
        </div>
      </div>

      <!-- 文本模式 -->
      <div v-if="store.config.inputSource === 'text'" class="text-mode">
        <div class="section-header">输入待翻译文本</div>
        <el-input
          v-model="store.config.content"
          type="textarea"
          :rows="12"
          placeholder="请粘贴或输入需要翻译的文本内容...（支持长篇幅）"
          class="text-input"
        ></el-input>
        <div class="text-stats">
          字符数: {{ store.config.content.length }} | 预计行数: {{ store.config.content.split('\n').length }}
        </div>
      </div>

      <el-divider></el-divider>

      <!-- 系统提示词 -->
      <div class="config-item">
        <div class="section-header">系统提示词</div>
        <el-input
          v-model="store.config.systemPrompt"
          type="textarea"
          :rows="4"
          placeholder="请输入系统提示词，引导 LLM 的翻译风格和规则..."
          class="system-prompt"
        ></el-input>
        <el-button type="text" size="small" @click="useDefaultPrompt" class="mt-1">
          <el-icon><Refresh /></el-icon> 使用默认提示词
        </el-button>
      </div>

      <el-divider></el-divider>

      <!-- Token 估算 -->
      <div class="config-item">
        <div class="section-header">Token 估算与费用预估</div>
        <el-card class="token-card">
          <div class="token-info">
            <div class="token-row">
              <span class="token-label">输入内容:</span>
              <span class="token-value">{{ tokenEstimate.inputTokens }} tokens</span>
            </div>
            <div class="token-row">
              <span class="token-label">系统提示:</span>
              <span class="token-value">{{ tokenEstimate.systemTokens }} tokens</span>
            </div>
            <div class="token-row total">
              <span class="token-label">总计:</span>
              <span class="token-value">{{ tokenEstimate.totalTokens }} tokens</span>
            </div>
            <div class="token-row cost">
              <span class="token-label"><el-icon><Money /></el-icon> 费用预估:</span>
              <span class="token-value">¥{{ tokenEstimate.estimatedCost.toFixed(2) }}</span>
            </div>
          </div>
        </el-card>
      </div>

      <el-divider></el-divider>

      <!-- 分片策略 -->
      <div class="config-item">
        <div class="section-header">分片策略</div>
        <el-radio-group v-model="store.config.chunkStrategy" class="strategy-options">
          <div class="radio-group-item">
            <el-radio label="line">按行数分片</el-radio>
            <el-input-number
              v-model="store.config.chunkSizeByLine"
              :min="1"
              :max="1000000"
              controls-position="right"
              class="chunk-input"
              size="small"
            ></el-input-number>
            <span class="unit">行/批</span>
          </div>
          <div class="radio-group-item">
            <el-radio label="token">按 Token 分片</el-radio>
            <el-input-number
              v-model="store.config.chunkSizeByToken"
              :min="100"
              :max="40000000"
              controls-position="right"
              class="chunk-input"
              size="small"
            ></el-input-number>
            <span class="unit">tokens/批</span>
          </div>
        </el-radio-group>
        <el-alert 
          title="重要提示" 
          description="选择分片策略后，系统会按行完整保存，不会在行中间截断"
          type="warning" 
          :closable="false"
          class="mt-2"
        />
      </div>

      <el-divider></el-divider>

      <!-- 并发控制 -->
      <div class="config-item">
        <div class="section-header">并发控制</div>
        <div class="concurrency-control">
          <span class="label">最高并发数:</span>
          <el-slider
            v-model="store.config.concurrency"
            :min="1"
            :max="10"
            :step="1"
            show-input
            class="concurrency-slider"
          ></el-slider>
          <span class="tip">(推荐: 1~5，过高易被限流)</span>
        </div>
        <el-alert 
          v-if="store.config.concurrency > 5"
          title="并发过高警告" 
          description="当前并发设置较高，可能导致被API限流，建议降低至 ≤3"
          type="warning" 
          :closable="false"
        />
      </div>

      <el-divider></el-divider>

      <!-- 回复配置 -->
      <div class="config-item">
        <div class="section-header">回复模式配置</div>
        <el-radio-group v-model="store.config.replyMode" class="reply-options">
          <div class="radio-group-item">
            <el-radio label="predicted">预计回复 Token</el-radio>
            <el-input-number
              v-model="store.config.predictedTokens"
              :min="100"
              :max="4000000"
              controls-position="right"
              class="token-input"
              size="small"
            ></el-input-number>
            <span class="unit">tokens</span>
          </div>
          <div class="radio-group-item">
            <el-radio label="equivalent">等额回复模式</el-radio>
            <span class="description">自动检测等长内容</span>
          </div>
        </el-radio-group>
        <el-alert 
          title="用途说明" 
          type="info" 
          :closable="false"
          class="mt-2"
        >
          <div><strong>用于流式进度估算</strong>，任务卡片会根据实时回复 Token 显示动态进度条</div>
          <div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">
            • <strong>预计回复</strong>：使用固定值 | 
            <strong>等额回复</strong>：输出≈输入
          </div>
          <div style="margin-top: 8px; font-size: 12px; opacity: 0.9; color: #409eff;">
            💡 提示：如需更精准的Token估算，请在配置抽屉的"Token估算"标签中选择或创建Token换算配置
          </div>
        </el-alert>
      </div>

      <el-divider></el-divider>

      <!-- 模型选择 -->
      <div class="config-item">
        <div class="section-header">模型选择</div>
        <ModelSelector v-model="store.config.modelId" />
      </div>

      <el-divider></el-divider>

      <!-- 底部操作栏 -->
      <div class="bottom-actions">
        <el-button @click="previewConfig">
          <el-icon><View /></el-icon> 预览配置
        </el-button>
        <el-button @click="clearConfig">
          <el-icon><Delete /></el-icon> 清空所有
        </el-button>
        <el-button @click="saveDraft" type="info">
          <el-icon><Download /></el-icon> 保存草稿
        </el-button>
        <el-button @click="handleStartTranslate" type="primary" size="large">
          <el-icon><VideoPlay /></el-icon> 开始翻译
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ModelSelector from './ModelSelector.vue'
import { 
  UploadFilled, 
  FolderOpened, 
  Document, 
  Folder, 
  Edit, 
  Check, 
  Delete, 
  Refresh, 
  Warning, 
  InfoFilled, 
  Money, 
  View, 
  Download, 
  VideoPlay 
} from '@element-plus/icons-vue'
import { ElMessage, ElNotification } from 'element-plus'
import { useLlmTranslateStore } from '../stores'
import { useBatchManagement } from '../composables/useBatchManagement'

const store = useLlmTranslateStore()
const { createNewBatch } = useBatchManagement()

const fileName = ref('')
const fileSize = ref('')

// Token 估算
const tokenEstimate = computed(() => {
  const inputTokens = store.config.content.length > 0 ? Math.ceil(store.config.content.length / 4) : 0
  const systemTokens = store.config.systemPrompt.length > 0 ? Math.ceil(store.config.systemPrompt.length / 4) : 0
  const totalTokens = inputTokens + systemTokens
  const estimatedCost = (totalTokens / 1000) * 0.002
  return { inputTokens, systemTokens, totalTokens, estimatedCost }
})

// 文件处理
const handleFileChange = (file: any) => {
  fileName.value = file.name
  fileSize.value = `${(file.size / 1024 / 1024).toFixed(2)} MB`
  store.config.content = '【示例文件内容】\n这是一段待翻译的示例文本...'
  ElMessage({ message: `文件 ${file.name} 已选择`, type: 'success' })
}

const removeFile = () => {
  fileName.value = ''
  fileSize.value = ''
  store.config.content = ''
}

// 使用默认提示词
const useDefaultPrompt = () => {
  store.config.systemPrompt = '你是一个专业的翻译助手，请将以下内容翻译成英文。保持原文的风格和语气，对于专业术语请提供准确的翻译。'
  ElMessage({ message: '已应用默认提示词', type: 'success' })
}


// 预览配置
const previewConfig = () => {
  ElNotification({
    title: '配置预览',
    message: `
      <p><strong>输入方式:</strong> ${store.config.inputSource === 'file' ? '文件上传' : '文本输入'}</p>
      <p><strong>内容量:</strong> ${tokenEstimate.value.inputTokens} tokens</p>
      <p><strong>分片策略:</strong> ${store.config.chunkStrategy === 'line' ? `按行 (${store.config.chunkSizeByLine})` : `按Token (${store.config.chunkSizeByToken})`}</p>
      <p><strong>并发数:</strong> ${store.config.concurrency}</p>
      <p><strong>回复模式:</strong> ${store.config.replyMode === 'predicted' ? `预计 ${store.config.predictedTokens} tokens` : '等额模式'}</p>
      <p><strong>模型:</strong> ${store.config.modelId}</p>
      <p><strong>预估费用:</strong> ¥${tokenEstimate.value.estimatedCost.toFixed(2)}</p>
    `,
    dangerouslyUseHTMLString: true,
    duration: 0,
    position: 'bottom-right'
  })
}

// 开始翻译
const handleStartTranslate = async () => {
  if (!store.config.content) {
    ElMessage({ message: '请先输入或上传内容', type: 'warning' })
    return
  }
  
  const newBatch = await createNewBatch()
  if (newBatch) {
    ElMessage({ message: `批次 ${newBatch.id} 已创建！`, type: 'success' })
    ElNotification({
      title: '任务创建成功',
      message: `批次 ${newBatch.id} 已创建，包含 ${newBatch.totalTasks} 个任务，预计耗时...`,
      type: 'success',
      duration: 3
    })
    // TODO: 跳转到任务管理页面
  }
}

// 清空配置
const clearConfig = () => {
  store.config = {
    inputSource: 'file',
    content: '',
    filePath: '',
    systemPrompt: '',
    chunkStrategy: 'line',
    chunkSizeByLine: 50,
    chunkSizeByToken: 2000,
    concurrency: 3,
    replyMode: 'predicted',
    predictedTokens: 2000,
    modelId: '' // 清空模型选择
  }
  fileName.value = ''
  fileSize.value = ''
  ElMessage({ message: '配置已清空', type: 'info' })
}

// 保存草稿
const saveDraft = () => {
  localStorage.setItem('llm-translate-draft', JSON.stringify(store.config))
  ElMessage({ message: '配置已保存为草稿', type: 'success' })
}
</script>

<style scoped lang="scss">
.home-page {
  padding: 8px;
  max-width: 1200px;
  margin: 0 auto;
  overflow-y: auto;
}

.config-card {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  :deep(.el-card__header) {
    background-color: #f5f7fa;
    border-bottom: 2px solid #e4e7eb;
  }
}

.card-header {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.section-header {
  font-size: 14px;
  font-weight: bold;
  color: #595959;
  margin-bottom: 12px;
  padding-left: 4px;
  border-left: 3px solid #409eff;
}

.input-section,
.file-mode,
.text-mode,
.config-item {
  margin-bottom: 20px;
}

.input-tabs {
  display: flex;
  gap: 8px;
}

.file-info {
  margin-top: 12px;

  .remove-btn {
    color: #f56c6c;
    margin-top: 8px;
  }
}

.text-mode {
  .text-input {
    border: 1px solid #dcdfe6;
    border-radius: 4px;
  }

  .text-stats {
    font-size: 12px;
    color: #909399;
    margin-top: 8px;
    text-align: right;
  }
}

.token-card {
  background-color: #f0f9ff;
  border: 1px solid #b3d8ff;

  :deep(.el-card__body) {
    padding: 16px;
  }
}

.token-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.token-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;

  &.total {
    font-weight: bold;
    color: #409eff;
    border-top: 1px solid #b3d8ff;
    padding-top: 8px;
    margin-top: 8px;
  }

  &.cost {
    font-weight: bold;
    color: #67c23a;
  }
}

.token-label {
  color: #666;
}

.token-value {
  color: #333;
  font-weight: 500;
}

.strategy-options,
.reply-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.radio-group-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 4px;
  background-color: #fafafa;

  .el-radio {
    flex-shrink: 0;
  }

  .chunk-input,
  .token-input {
    width: 100px;
  }

  .unit {
    font-size: 12px;
    color: #909399;
    flex-shrink: 0;
  }

  .description {
    font-size: 12px;
    color: #909399;
  }
}

.concurrency-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  .label {
    font-weight: 500;
    color: #606266;
    white-space: nowrap;
  }

  .concurrency-slider {
    flex: 1;
    min-width: 200px;
  }

  .tip {
    font-size: 12px;
    color: #909399;
    white-space: nowrap;
  }
}

.model-select {
  width: 100%;
}

.bottom-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;

  .el-button {
    min-width: 100px;
  }

  .el-button[type='primary'] {
    font-size: 14px;
    font-weight: bold;
  }
}

.mt-1 {
  margin-top: 4px;
}

.mt-2 {
  margin-top: 8px;
}

.mb-2 {
  margin-bottom: 8px;
}
</style>

