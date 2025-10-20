<template>
  <div class="home-page">
    <h2>配置面板</h2>
    <p>这是首页配置面板 - 开发中</p>
    
    <el-card class="config-card">
      <template #header>
        <span>输入配置</span>
      </template>
      
      <el-form :model="store.config" label-width="120px">
        <el-form-item label="输入源">
          <el-radio-group v-model="store.config.inputSource">
            <el-radio label="file">文件</el-radio>
            <el-radio label="text">文本</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="系统提示词">
          <el-input
            v-model="store.config.systemPrompt"
            type="textarea"
            :rows="4"
            placeholder="请输入系统提示词..."
          />
        </el-form-item>

        <el-form-item label="并发控制">
          <el-input-number
            v-model="store.config.concurrency"
            :min="1"
            :max="10"
          />
          <span class="form-hint">（推荐: 1~5）</span>
        </el-form-item>

        <el-form-item label="回复模式">
          <el-radio-group v-model="store.config.replyMode">
            <el-radio label="predicted">预计Token</el-radio>
            <el-radio label="equivalent">等额回复</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="store.config.replyMode === 'predicted'" label="预计回复">
          <el-input-number
            v-model="store.config.predictedTokens"
            :min="100"
            :max="10000"
          />
          <span class="form-hint"> tokens</span>
        </el-form-item>
      </el-form>

      <div class="token-estimate">
        <h3>Token 估算</h3>
        <p>输入内容: {{ store.tokenEstimate.inputTokens }} tokens</p>
        <p>系统提示: {{ store.tokenEstimate.systemPromptTokens }} tokens</p>
        <p>总计: {{ store.tokenEstimate.totalTokens }} tokens</p>
        <p>费用预估: ¥{{ store.tokenEstimate.estimatedCost.toFixed(4) }}</p>
      </div>

      <div class="action-buttons">
        <el-button type="primary" @click="handleStartTranslate">
          开始翻译
        </el-button>
        <el-button @click="handleClearConfig">清空</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useLlmTranslateStore } from '../stores/LlmTranslate.store'
import { useBatchManagement } from '../composables/useBatchManagement'

const store = useLlmTranslateStore()
const { createNewBatch } = useBatchManagement()

const handleStartTranslate = async () => {
  await createNewBatch()
  // TODO: 切换到任务管理页
}

const handleClearConfig = () => {
  // TODO: 重置配置
}
</script>

<style scoped lang="scss">
.home-page {
  h2 {
    color: var(--obsidian-text-primary);
    margin-bottom: 16px;
  }

  .config-card {
    margin-top: 16px;
  }

  .form-hint {
    margin-left: 8px;
    color: var(--obsidian-text-secondary);
    font-size: 0.85rem;
  }

  .token-estimate {
    margin: 24px 0;
    padding: 16px;
    background: var(--obsidian-bg-secondary);
    border-radius: 8px;

    h3 {
      margin: 0 0 12px 0;
      font-size: 1rem;
    }

    p {
      margin: 4px 0;
      font-size: 0.9rem;
    }
  }

  .action-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 24px;
  }
}
</style>

