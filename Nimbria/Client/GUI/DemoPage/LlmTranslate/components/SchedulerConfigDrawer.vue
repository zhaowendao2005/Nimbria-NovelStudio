<template>
  <el-drawer
    :model-value="visible"
    @update:model-value="(val) => $emit('update:visible', val)"
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

        <!-- Tab 3: 高级选项 -->
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
import { DEFAULT_SCHEDULER_CONFIG } from '../types/scheduler'

interface Props {
  visible: boolean
  initialConfig?: SchedulerConfig
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', config: SchedulerConfig): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  initialConfig: () => ({ ...DEFAULT_SCHEDULER_CONFIG })
})

const emit = defineEmits<Emits>()

// 当前激活的Tab
const activeTab = ref<string>('basic')

// 表单数据
const form = ref<SchedulerConfig>({ ...DEFAULT_SCHEDULER_CONFIG })

// 监听初始配置变化
watch(() => props.initialConfig, (newConfig) => {
  if (newConfig) {
    form.value = { ...newConfig }
  }
}, { immediate: true })

// 监听visible变化
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.initialConfig) {
    form.value = { ...props.initialConfig }
    activeTab.value = 'basic'
  }
})

// 保存配置
const handleSave = () => {
  // 验证配置
  if (!validateForm()) {
    return
  }
  
  emit('save', { ...form.value })
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

