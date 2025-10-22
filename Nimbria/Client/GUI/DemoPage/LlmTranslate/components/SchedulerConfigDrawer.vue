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
        <!-- Tab 0: 模型配置 -->
        <el-tab-pane label="模型配置" name="model-config">
          <div class="config-section">
            <!-- 模型选择器 -->
            <div class="config-item">
              <div class="config-label">
                <span>选择模型</span>
                <el-tooltip content="选择用于翻译的LLM模型，将应用于当前批次的所有新任务" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <ModelSelector
                v-model="modelConfigForm.modelId"
                @update:model-value="handleModelChange"
              />
            </div>

            <!-- 系统提示词 -->
            <div class="config-item">
              <div class="config-label">
                <span>系统提示词</span>
                <el-tooltip content="指导模型如何进行翻译，提示词会影响翻译质量" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input
                v-model="modelConfigForm.systemPrompt"
                type="textarea"
                :rows="5"
                placeholder="你是一个专业的翻译助手..."
              />
            </div>

            <el-alert
              title="配置说明"
              type="warning"
              :closable="false"
              class="config-alert"
            >
              <div>• 修改模型配置后会立即更新批次配置并保存到数据库</div>
              <div>• 新发送的任务将使用新的模型配置</div>
              <div>• 已发送或正在执行的任务仍使用原配置</div>
            </el-alert>
          </div>
        </el-tab-pane>

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

            <!-- 任务总超时时间 -->
            <div class="config-item">
              <div class="config-label">
                <span>任务总超时时间（秒）</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div><strong>【顶层】单个任务的最大生命周期</strong></div>
                    <div>• 作用范围：从任务开始到完成的总时长</div>
                    <div>• 包括：排队 + 执行 + 重试 + 其他开销</div>
                    <div>• 适用场景：防止任务无限挂起</div>
                    <div>• 建议值：是"HTTP 请求超时"的 1.5-2 倍</div>
                    <div>• 注意：此值应 > HTTP 请求超时 + 重试时间</div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="form.taskTimeoutSeconds"
                :min="10"
                :max="300"
                :step="10"
                size="small"
              />
              <div class="param-value">
                {{ form.taskTimeoutSeconds }}秒 ({{ (form.taskTimeoutSeconds / 60).toFixed(1) }}分钟)
              </div>
            </div>

            <!-- 调度器监控超时 -->
            <div class="config-item">
              <div class="config-label">
                <span>调度器监控超时（秒）</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div><strong>【顶层】调度器层面的健康检测</strong></div>
                    <div>• 作用范围：调度器监控任务是否"卡住"</div>
                    <div>• 检测对象：任务状态、进度更新</div>
                    <div>• 适用场景：发现并清理僵尸任务</div>
                    <div>• 建议值：60-180秒</div>
                    <div>• 注意：这是调度器的监控超时，不影响底层 API</div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="form.streamNoDataTimeoutSeconds"
                :min="30"
                :max="180"
                :step="10"
                size="small"
              />
              <div class="param-value">
                {{ form.streamNoDataTimeoutSeconds }}秒 ({{ (form.streamNoDataTimeoutSeconds / 60).toFixed(1) }}分钟)
              </div>
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

          </div>
        </el-tab-pane>

        <!-- Tab 3: 高级参数 -->
        <el-tab-pane label="高级参数" name="model-params">
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
                  :max="2000000"
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

        <!-- Tab 4: 请求控制 -->
        <el-tab-pane label="请求控制" name="request-control">
          <div class="config-section">
            <el-alert
              title="层级说明"
              type="info"
              :closable="false"
              class="config-alert mb-3"
            >
              <div>这些配置控制底层 LLM 客户端的请求行为</div>
              <div>优先级关系：任务总超时 > HTTP 请求超时 > 流式空闲超时</div>
            </el-alert>

            <!-- 启用流式响应 -->
            <div class="config-item">
              <div class="config-label">
                <span>启用流式响应</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div><strong>控制 API 调用模式</strong></div>
                    <div>• 开启：使用流式 API，实时显示进度（推荐）</div>
                    <div>• 关闭：使用普通 API，完成后一次性返回</div>
                    <div>• 注意：流式模式下"流式空闲超时"生效</div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-switch
                v-model="requestControlForm.enableStreaming"
                active-text="开启"
                inactive-text="关闭"
              />
            </div>

            <!-- HTTP 请求超时 -->
            <div class="config-item">
              <div class="config-label">
                <span>HTTP 请求超时（秒）</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div><strong>【底层】LangChain HTTP 请求的最大等待时间</strong></div>
                    <div>• 作用范围：单次 API 调用的 HTTP 连接超时</div>
                    <div>• 适用场景：防止网络连接无响应</div>
                    <div>• 建议值：短任务 30-60秒，长任务 120-300秒</div>
                    <div>• 注意：流式响应下此配置影响较小</div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="requestControlForm.httpTimeoutSeconds"
                :min="30"
                :max="600"
                :step="10"
                size="small"
              />
              <div class="param-value">
                {{ requestControlForm.httpTimeoutSeconds }}秒 ({{ (requestControlForm.httpTimeoutSeconds / 60).toFixed(1) }}分钟)
              </div>
            </div>

            <!-- 流式空闲超时 -->
            <div v-if="requestControlForm.enableStreaming" class="config-item">
              <div class="config-label">
                <span>流式空闲超时（秒）</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div><strong>【中层】流式数据流的空闲检测时间</strong></div>
                    <div>• 作用范围：两次数据块之间的最大间隔</div>
                    <div>• 适用场景：允许 AI "思考"，只要有数据就继续</div>
                    <div>• 建议值：60-120秒（允许较长的首字延迟）</div>
                    <div>• 优势：比 HTTP 超时更智能，适合长文本任务</div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="requestControlForm.streamIdleTimeoutSeconds"
                :min="30"
                :max="300"
                :step="10"
                size="small"
              />
              <div class="param-value">
                {{ requestControlForm.streamIdleTimeoutSeconds }}秒 ({{ (requestControlForm.streamIdleTimeoutSeconds / 60).toFixed(1) }}分钟)
              </div>
            </div>

            <!-- 最大重试次数 -->
            <div class="config-item">
              <div class="config-label">
                <span>最大重试次数</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div>遇到可重试错误（如限流、超时）时的最大重试次数</div>
                    <div>建议：3-5次</div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="requestControlForm.maxRetries"
                :min="0"
                :max="10"
                :step="1"
                size="small"
              />
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 5: 调度策略 -->
        <el-tab-pane label="调度策略" name="advanced">
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
import { ElMessage } from 'element-plus'
import ModelSelector from './ModelSelector.vue'
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
  (e: 'save-model-config', config: {
    modelId: string
    systemPrompt: string
  }): void
  (e: 'save-request-control', config: {
    httpTimeout?: number
    maxRetries?: number
    enableStreaming?: boolean
    streamIdleTimeout?: number
  }): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  initialConfig: () => ({ ...DEFAULT_SCHEDULER_CONFIG })
})

const emit = defineEmits<Emits>()

// 当前激活的Tab
const activeTab = ref<string>('model-config')

// 表单数据（调度器配置）
const form = ref<SchedulerConfig>({ ...DEFAULT_SCHEDULER_CONFIG })

// 模型配置表单
const modelConfigForm = ref<{
  modelId: string
  systemPrompt: string
}>({
  modelId: '',
  systemPrompt: ''  // 不设置默认值，由加载逻辑从配置中读取
})

// 模型参数表单（从 translateConfig 中提取）
interface ModelParamsForm {
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

const modelParamsForm = ref<ModelParamsForm>({})

// 请求控制表单（使用秒作为单位，方便用户输入）
const requestControlForm = ref<{
  enableStreaming: boolean
  httpTimeoutSeconds: number
  streamIdleTimeoutSeconds: number
  maxRetries: number
}>({
  enableStreaming: true,
  httpTimeoutSeconds: 120,  // 默认 2 分钟
  streamIdleTimeoutSeconds: 60,  // 默认 1 分钟
  maxRetries: 3
})

// 监听初始配置变化
watch(() => props.initialConfig, (newConfig) => {
  if (newConfig) {
    form.value = { ...newConfig }
  }
}, { immediate: true })

// 监听 translateConfig 变化（加载模型配置和参数）
watch(() => props.translateConfig, (newConfig) => {
  if (newConfig) {
    // 加载模型配置 - 使用 ?? 替代 ||，避免空字符串被替换成默认值
    modelConfigForm.value.modelId = newConfig.modelId ?? ''
    modelConfigForm.value.systemPrompt = newConfig.systemPrompt ?? ''
    
    // 加载模型参数
    const params: ModelParamsForm = {}
    if (newConfig.maxTokens !== undefined) params.maxTokens = newConfig.maxTokens
    if (newConfig.temperature !== undefined) params.temperature = newConfig.temperature
    if (newConfig.topP !== undefined) params.topP = newConfig.topP
    if (newConfig.frequencyPenalty !== undefined) params.frequencyPenalty = newConfig.frequencyPenalty
    if (newConfig.presencePenalty !== undefined) params.presencePenalty = newConfig.presencePenalty
    modelParamsForm.value = params
    
    // 加载请求控制配置（转换为秒）
    requestControlForm.value.enableStreaming = newConfig.enableStreaming ?? true
    requestControlForm.value.httpTimeoutSeconds = newConfig.httpTimeout ? Math.round(newConfig.httpTimeout / 1000) : 120
    requestControlForm.value.streamIdleTimeoutSeconds = newConfig.streamIdleTimeout ? Math.round(newConfig.streamIdleTimeout / 1000) : 60
    requestControlForm.value.maxRetries = newConfig.maxRetries ?? 3
  }
}, { immediate: true })

// 监听visible变化
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    if (props.initialConfig) {
      form.value = { ...props.initialConfig }
    }
    if (props.translateConfig) {
      // 加载模型配置 - 使用 ?? 替代 ||，避免空字符串被替换成默认值
      modelConfigForm.value.modelId = props.translateConfig.modelId ?? ''
      modelConfigForm.value.systemPrompt = props.translateConfig.systemPrompt ?? ''
      
      // 加载模型参数
      const params: ModelParamsForm = {}
      if (props.translateConfig.maxTokens !== undefined) params.maxTokens = props.translateConfig.maxTokens
      if (props.translateConfig.temperature !== undefined) params.temperature = props.translateConfig.temperature
      if (props.translateConfig.topP !== undefined) params.topP = props.translateConfig.topP
      if (props.translateConfig.frequencyPenalty !== undefined) params.frequencyPenalty = props.translateConfig.frequencyPenalty
      if (props.translateConfig.presencePenalty !== undefined) params.presencePenalty = props.translateConfig.presencePenalty
      modelParamsForm.value = params
      
      // 加载请求控制配置（转换为秒）
      requestControlForm.value.enableStreaming = props.translateConfig.enableStreaming ?? true
      requestControlForm.value.httpTimeoutSeconds = props.translateConfig.httpTimeout ? Math.round(props.translateConfig.httpTimeout / 1000) : 120
      requestControlForm.value.streamIdleTimeoutSeconds = props.translateConfig.streamIdleTimeout ? Math.round(props.translateConfig.streamIdleTimeout / 1000) : 60
      requestControlForm.value.maxRetries = props.translateConfig.maxRetries ?? 3
    }
    activeTab.value = 'model-config'
  }
})

// 处理模型变更
const handleModelChange = (newModelId: string) => {
  console.log('🔄 [SchedulerConfigDrawer] 模型已切换:', newModelId)
  modelConfigForm.value.modelId = newModelId
}

// 保存配置
const handleSave = () => {
  // 验证配置
  if (!validateForm()) {
    return
  }
  
  // 保存模型配置（优先级最高）
  if (modelConfigForm.value.modelId) {
    emit('save-model-config', {
      modelId: modelConfigForm.value.modelId,
      systemPrompt: modelConfigForm.value.systemPrompt
    })
  }
  
  // 保存调度器配置
  emit('save', { ...form.value })
  
  // 保存模型参数
  emit('save-model-params', { ...modelParamsForm.value })
  
  // 保存请求控制配置（转换为毫秒）
  emit('save-request-control', {
    enableStreaming: requestControlForm.value.enableStreaming,
    httpTimeout: requestControlForm.value.httpTimeoutSeconds * 1000,
    streamIdleTimeout: requestControlForm.value.streamIdleTimeoutSeconds * 1000,
    maxRetries: requestControlForm.value.maxRetries
  })
  
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
  // 验证模型ID
  if (!modelConfigForm.value.modelId) {
    ElMessage({ message: '请选择模型', type: 'error' })
    activeTab.value = 'model-config'
    return false
  }
  
  // 验证并发数
  if (form.value.maxConcurrency < 1 || form.value.maxConcurrency > 10) {
    return false
  }
  
  // 验证超时时间（调整范围）
  if (form.value.taskTimeoutSeconds < 10 || form.value.taskTimeoutSeconds > 300) {
    return false
  }
  
  if (form.value.streamNoDataTimeoutSeconds < 30 || form.value.streamNoDataTimeoutSeconds > 180) {
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

