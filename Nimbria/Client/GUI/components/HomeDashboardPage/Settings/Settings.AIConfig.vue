<template>
  <div class="ai-config">
    <h5 class="settings-title">AI 配置</h5>
    <p class="settings-description">
      配置AI助手的相关参数（功能开发中）
    </p>

    <q-card flat bordered>
      <q-card-section>
        <!-- API 端点 -->
        <div class="setting-item">
          <div class="setting-item__label">
            <q-icon name="link" size="18px" class="q-mr-xs" />
            API 端点
          </div>
          <q-input 
            outlined 
            dense 
            v-model="apiEndpoint" 
            placeholder="https://api.example.com/v1"
            disable
            class="q-mt-sm"
          >
            <template v-slot:prepend>
              <q-icon name="http" />
            </template>
          </q-input>
        </div>

        <q-separator class="q-my-lg" />

        <!-- API Key -->
        <div class="setting-item">
          <div class="setting-item__label">
            <q-icon name="key" size="18px" class="q-mr-xs" />
            API Key
          </div>
          <q-input 
            outlined 
            dense 
            v-model="apiKey" 
            type="password"
            placeholder="sk-••••••••••••••••••••"
            disable
            class="q-mt-sm"
          >
            <template v-slot:prepend>
              <q-icon name="vpn_key" />
            </template>
          </q-input>
        </div>

        <q-separator class="q-my-lg" />

        <!-- 模型选择 -->
        <div class="setting-item">
          <div class="setting-item__label">
            <q-icon name="psychology" size="18px" class="q-mr-xs" />
            模型
          </div>
          <q-select 
            outlined 
            dense 
            v-model="modelName" 
            :options="modelOptions"
            disable
            class="q-mt-sm"
          >
            <template v-slot:prepend>
              <q-icon name="model_training" />
            </template>
          </q-select>
        </div>

        <q-separator class="q-my-lg" />

        <!-- 温度参数 -->
        <div class="setting-item">
          <div class="setting-item__label">
            <q-icon name="thermostat" size="18px" class="q-mr-xs" />
            Temperature
            <q-badge color="primary" class="q-ml-sm">{{ temperature.toFixed(1) }}</q-badge>
          </div>
          <div class="slider-container">
            <q-slider 
              v-model="temperature" 
              :min="0" 
              :max="2" 
              :step="0.1"
              label
              :label-value="`${temperature.toFixed(1)}`"
              disable
              class="q-mt-md"
            />
            <div class="slider-hints">
              <span class="text-caption text-grey-6">精确</span>
              <span class="text-caption text-grey-6">平衡</span>
              <span class="text-caption text-grey-6">创造性</span>
            </div>
          </div>
        </div>

        <q-separator class="q-my-lg" />

        <!-- Max Tokens -->
        <div class="setting-item">
          <div class="setting-item__label">
            <q-icon name="format_size" size="18px" class="q-mr-xs" />
            最大生成长度
            <q-badge color="primary" class="q-ml-sm">{{ maxTokens }}</q-badge>
          </div>
          <q-slider 
            v-model="maxTokens" 
            :min="256" 
            :max="4096" 
            :step="256"
            label
            :label-value="`${maxTokens}`"
            disable
            class="q-mt-md"
          />
        </div>

        <!-- 功能提示 -->
        <q-banner class="bg-blue-1 text-blue-9 q-mt-lg" rounded dense>
          <template v-slot:avatar>
            <q-icon name="info" color="blue" />
          </template>
          <div class="text-body2">
            此功能正在开发中，敬请期待
          </div>
        </q-banner>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// AI 配置状态（仅用于UI展示）
const apiEndpoint = ref('https://api.openai.com/v1')
const apiKey = ref('')
const modelName = ref('gpt-3.5-turbo')
const temperature = ref(0.7)
const maxTokens = ref(2048)

const modelOptions = [
  'gpt-4',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'claude-3-opus',
  'claude-3-sonnet'
]
</script>

<style scoped lang="scss">
.ai-config {
  .settings-title {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--q-dark);
  }

  .settings-description {
    margin: 0 0 24px 0;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    line-height: 1.6;
  }
}

.setting-item {
  margin-bottom: 0;

  &__label {
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
  }
}

.slider-container {
  .slider-hints {
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
    padding: 0 4px;
  }
}
</style>

