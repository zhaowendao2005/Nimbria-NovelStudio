<template>
  <el-drawer
    :model-value="visible"
    @update:model-value="(val: boolean) => $emit('update:visible', val)"
    title="调度器配置"
    direction="rtl"
    size="500px"
    :before-close="handleClose"
  >
    <div class="scheduler-config-drawer">
      <el-tabs v-model="activeTab">
        <!-- Tab 1: 基础设置 -->
        <el-tab-pane label="基础设置" name="basic">
          <div class="config-section">
            <!-- 最高并发数 -->
            <div class="config-item">
              <div class="config-label">
                <span>最高并发数</span>
                <el-tooltip content="同时执行的任务数量，建议1-5" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-slider
                v-model="form.maxConcurrency"
                :min="1"
                :max="10"
                :step="1"
                show-input
                :input-size="'small'"
              />
            </div>

            <!-- 任务超时时间 -->
            <div class="config-item">
              <div class="config-label">
                <span>任务超时时间（秒）</span>
                <el-tooltip content="任务执行超过此时间将标记为error" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="form.taskTimeoutSeconds"
                :min="5"
                :max="120"
                :step="5"
                size="small"
              />
            </div>

            <!-- 流式无数据超时 -->
            <div class="config-item">
              <div class="config-label">
                <span>流式无数据超时（秒）</span>
                <el-tooltip content="流式响应超过此时间无新数据将超时" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="form.streamNoDataTimeoutSeconds"
                :min="10"
                :max="60"
                :step="5"
                size="small"
              />
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 2: 限流处理 -->
        <el-tab-pane label="限流处理" name="throttle">
          <div class="config-section">
            <!-- 限流探针间隔 -->
            <div class="config-item">
              <div class="config-label">
                <span>限流探针间隔（秒）</span>
                <el-tooltip content="遇到限流后，每隔此时间发送测试请求" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="form.throttleProbeIntervalSeconds"
                :min="5"
                :max="30"
                :step="5"
                size="small"
              />
            </div>

            <!-- 探针类型 -->
            <div class="config-item">
              <div class="config-label">
                <span>探针类型</span>
                <el-tooltip content="快速检查消耗资源少但可能不准确" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-radio-group v-model="form.throttleProbeType" size="small">
                <el-radio value="quick">快速检查</el-radio>
                <el-radio value="api">API调用</el-radio>
              </el-radio-group>
            </div>

            <!-- 自动重发限流任务 -->
            <div class="config-item">
              <div class="config-label">
                <span>自动重发限流任务</span>
                <el-tooltip content="限流恢复后自动重新发送失败的任务" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-switch
                v-model="form.autoRetryThrottled"
                active-text="开启"
                inactive-text="关闭"
              />
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 3: 模型参数 -->
        <el-tab-pane label="模型参数" name="model">
          <div class="config-section">
            <el-alert
              title="层叠配置说明"
              type="info"
              :closable="false"
              class="config-alert mb-3"
            >
              <div>这些参数为<strong>可选配置</strong>，不设置则自动使用模型或提供商的默认值</div>
              <div>优先级：用户配置 > 提供商默认 > 模型默认</div>
            </el-alert>

            <!-- 最大输出Token数 -->
            <div class="config-item">
              <div class="config-label">
                <span>最大输出Token数</span>
                <el-tooltip content="限制模型生成的最大token数。不设置则使用模型默认值（通常为4096-128000）" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <div class="param-control">
                <el-input-number
                  v-model="modelParamsForm.maxTokens"
                  :min="100"
                  :max="200000"
                  :step="1000"
                  placeholder="使用默认"
                  size="small"
                  class="flex-1"
                />
                <el-button 
                  v-if="modelParamsForm.maxTokens !== undefined"
                  type="danger" 
                  size="small"
                  text
                  @click="delete modelParamsForm.maxTokens"
                >
                  清除
                </el-button>
              </div>
              <div v-if="modelParamsForm.maxTokens !== undefined" class="param-value">
                当前值: {{ modelParamsForm.maxTokens }}
              </div>
              <div v-else class="param-value placeholder">
                未设置（使用默认值）
              </div>
            </div>

            <!-- 温度参数 -->
            <div class="config-item">
              <div class="config-label">
                <span>温度 (Temperature)</span>
                <el-tooltip content="控制输出的随机性。0=确定性，2=极度随机。推荐翻译任务使用0.3-0.7" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <div class="param-control">
                <el-slider
                  v-model="modelParamsForm.temperature"
                  :min="0"
                  :max="2"
                  :step="0.1"
                  :show-input="true"
                  :show-input-controls="false"
                  class="flex-1"
                />
                <el-button 
                  v-if="modelParamsForm.temperature !== undefined"
                  type="danger" 
                  size="small"
                  text
                  @click="delete modelParamsForm.temperature"
                >
                  清除
                </el-button>
              </div>
              <div v-if="modelParamsForm.temperature !== undefined" class="param-value">
                当前值: {{ modelParamsForm.temperature }}
              </div>
              <div v-else class="param-value placeholder">
                未设置（使用默认值）
              </div>
            </div>

            <!-- Top P -->
            <div class="config-item">
              <div class="config-label">
                <span>Top P</span>
                <el-tooltip content="核采样参数。0.1表示仅考虑前10%的概率分布。推荐0.9-0.95" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <div class="param-control">
                <el-slider
                  v-model="modelParamsForm.topP"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  :show-input="true"
                  :show-input-controls="false"
                  class="flex-1"
                />
                <el-button 
                  v-if="modelParamsForm.topP !== undefined"
                  type="danger" 
                  size="small"
                  text
                  @click="delete modelParamsForm.topP"
                >
                  清除
                </el-button>
              </div>
              <div v-if="modelParamsForm.topP !== undefined" class="param-value">
                当前值: {{ modelParamsForm.topP }}
              </div>
              <div v-else class="param-value placeholder">
                未设置（使用默认值）
              </div>
            </div>

            <!-- Frequency Penalty -->
            <div class="config-item">
              <div class="config-label">
                <span>Frequency Penalty</span>
                <el-tooltip content="降低重复词汇的概率。-2.0到2.0，正值减少重复" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <div class="param-control">
                <el-slider
                  v-model="modelParamsForm.frequencyPenalty"
                  :min="-2"
                  :max="2"
                  :step="0.1"
                  :show-input="true"
                  :show-input-controls="false"
                  class="flex-1"
                />
                <el-button 
                  v-if="modelParamsForm.frequencyPenalty !== undefined"
                  type="danger" 
                  size="small"
                  text
                  @click="delete modelParamsForm.frequencyPenalty"
                >
                  清除
                </el-button>
              </div>
              <div v-if="modelParamsForm.frequencyPenalty !== undefined" class="param-value">
                当前值: {{ modelParamsForm.frequencyPenalty }}
              </div>
              <div v-else class="param-value placeholder">
                未设置（使用默认值）
              </div>
            </div>

            <!-- Presence Penalty -->
            <div class="config-item">
              <div class="config-label">
                <span>Presence Penalty</span>
                <el-tooltip content="增加话题多样性。-2.0到2.0，正值鼓励新话题" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <div class="param-control">
                <el-slider
                  v-model="modelParamsForm.presencePenalty"
                  :min="-2"
                  :max="2"
                  :step="0.1"
                  :show-input="true"
                  :show-input-controls="false"
                  class="flex-1"
                />
                <el-button 
                  v-if="modelParamsForm.presencePenalty !== undefined"
                  type="danger" 
                  size="small"
                  text
                  @click="delete modelParamsForm.presencePenalty"
                >
                  清除
                </el-button>
              </div>
              <div v-if="modelParamsForm.presencePenalty !== undefined" class="param-value">
                当前值: {{ modelParamsForm.presencePenalty }}
              </div>
              <div v-else class="param-value placeholder">
                未设置（使用默认值）
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 4: 高级选项 -->
        <el-tab-pane label="高级选项" name="advanced">
          <div class="config-section">
            <!-- 调度策略 -->
            <div class="config-item">
              <div class="config-label">
                <span>调度策略</span>
                <el-tooltip content="事件驱动性能更好，定时轮询更稳定" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-radio-group v-model="form.schedulingStrategy" size="small">
                <el-radio value="event">事件驱动</el-radio>
                <el-radio value="timed">定时轮询</el-radio>
              </el-radio-group>
            </div>

            <el-alert
              title="提示"
              type="info"
              :closable="false"
              class="config-alert"
            >
              <div>调度器配置将应用于当前批次的所有任务</div>
              <div>修改后需要重新发送任务才能生效</div>
            </el-alert>
          </div>
        </el-tab-pane>
      </el-tabs>

      <!-- 底部按钮 -->
      <div class="drawer-footer">
        <el-button @click="handleReset">重置为默认</el-button>
        <el-button type="primary" @click="handleSave">保存配置</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import type { SchedulerConfig } from '../types/scheduler'
import type { TranslateConfig } from '../types/config'
import { DEFAULT_SCHEDULER_CONFIG } from '../types/scheduler'

interface Props {
  visible: boolean
  initialConfig?: SchedulerConfig
  translateConfig?: TranslateConfig
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', config: SchedulerConfig): void
  (e: 'save-model-params', params: {
    maxTokens?: number
    temperature?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
  }): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  initialConfig: () => ({ ...DEFAULT_SCHEDULER_CONFIG })
})

const emit = defineEmits<Emits>()

// 当前激活的Tab
const activeTab = ref<string>('basic')

// 表单数据（调度器配置）
const form = ref<SchedulerConfig>({ ...DEFAULT_SCHEDULER_CONFIG })

// 模型参数表单（从 translateConfig 中提取）
interface ModelParamsForm {
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

const modelParamsForm = ref<ModelParamsForm>({})

// 监听初始配置变化
watch(() => props.initialConfig, (newConfig) => {
  if (newConfig) {
    form.value = { ...newConfig }
  }
}, { immediate: true })

// 监听 translateConfig 变化（加载模型参数）
watch(() => props.translateConfig, (newConfig) => {
  if (newConfig) {
    const params: ModelParamsForm = {}
    if (newConfig.maxTokens !== undefined) params.maxTokens = newConfig.maxTokens
    if (newConfig.temperature !== undefined) params.temperature = newConfig.temperature
    if (newConfig.topP !== undefined) params.topP = newConfig.topP
    if (newConfig.frequencyPenalty !== undefined) params.frequencyPenalty = newConfig.frequencyPenalty
    if (newConfig.presencePenalty !== undefined) params.presencePenalty = newConfig.presencePenalty
    modelParamsForm.value = params
  }
}, { immediate: true })

// 监听visible变化
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    if (props.initialConfig) {
      form.value = { ...props.initialConfig }
    }
    if (props.translateConfig) {
      const params: ModelParamsForm = {}
      if (props.translateConfig.maxTokens !== undefined) params.maxTokens = props.translateConfig.maxTokens
      if (props.translateConfig.temperature !== undefined) params.temperature = props.translateConfig.temperature
      if (props.translateConfig.topP !== undefined) params.topP = props.translateConfig.topP
      if (props.translateConfig.frequencyPenalty !== undefined) params.frequencyPenalty = props.translateConfig.frequencyPenalty
      if (props.translateConfig.presencePenalty !== undefined) params.presencePenalty = props.translateConfig.presencePenalty
      modelParamsForm.value = params
    }
    activeTab.value = 'basic'
  }
})

// 保存配置
const handleSave = () => {
  // 验证配置
  if (!validateForm()) {
    return
  }
  
  // 保存调度器配置
  emit('save', { ...form.value })
  
  // 保存模型参数
  emit('save-model-params', { ...modelParamsForm.value })
  
  emit('update:visible', false)
}

// 重置为默认配置
const handleReset = () => {
  form.value = { ...DEFAULT_SCHEDULER_CONFIG }
}

// 关闭抽屉
const handleClose = () => {
  emit('update:visible', false)
}

// 验证表单
const validateForm = (): boolean => {
  // 验证并发数
  if (form.value.maxConcurrency < 1 || form.value.maxConcurrency > 10) {
    return false
  }
  
  // 验证超时时间
  if (form.value.taskTimeoutSeconds < 5 || form.value.taskTimeoutSeconds > 120) {
    return false
  }
  
  if (form.value.streamNoDataTimeoutSeconds < 10 || form.value.streamNoDataTimeoutSeconds > 60) {
    return false
  }
  
  // 验证探针间隔
  if (form.value.throttleProbeIntervalSeconds < 5 || form.value.throttleProbeIntervalSeconds > 30) {
    return false
  }
  
  return true
}
</script>

<style scoped lang="scss">
.scheduler-config-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;

  :deep(.el-tabs) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .el-tabs__content {
      flex: 1;
      overflow-y: auto;
    }
  }

  .config-section {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .config-item {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .config-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 500;
      color: #333;

      .info-icon {
        color: #909399;
        cursor: help;
      }
    }
  }

  .config-alert {
    margin-top: 16px;
    
    :deep(.el-alert__description) {
      font-size: 12px;
      line-height: 1.6;
      
      div {
        margin-bottom: 4px;
      }
    }
    
    &.mb-3 {
      margin-bottom: 16px;
    }
  }

  .param-control {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .flex-1 {
      flex: 1;
    }
  }

  .param-value {
    font-size: 12px;
    color: #409eff;
    margin-top: 4px;
    
    &.placeholder {
      color: #909399;
      font-style: italic;
    }
  }

  .drawer-footer {
    border-top: 1px solid #e4e7eb;
    padding: 16px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}
</style>

