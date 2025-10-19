<template>
  <el-collapse-item title="🚀 初始化进度监听" name="initProgress">
    <div class="init-progress-panel">
      <!-- 空状态 -->
      <div v-if="!progressState.isInitializing && !progressState.error" class="empty-state">
        <q-icon name="timeline" size="48px" color="grey-5" />
        <div class="empty-text">暂无初始化任务</div>
        <div class="empty-desc">创建视图时将显示初始化进度</div>
      </div>

      <!-- 初始化中 -->
      <div v-if="progressState.isInitializing" class="progress-active">
        <!-- 总进度条 -->
        <div class="progress-bar-container">
          <el-progress 
            :percentage="progressState.currentProgress"
            :color="getProgressColor()"
            :show-text="false"
            :stroke-width="12"
          />
          <div class="progress-percentage">{{ progressState.currentProgress }}%</div>
        </div>

        <!-- 阶段信息 -->
        <div class="stage-info">
          <el-tag 
            :type="getStageType(progressState.currentStage)"
            effect="dark"
            size="large"
          >
            {{ progressState.currentStageLabel }}
          </el-tag>
          <span class="stage-message">{{ getCurrentMessage() }}</span>
        </div>

        <!-- 详细统计 -->
        <div class="statistics">
          <div class="stat-row">
            <q-icon name="analytics" size="16px" class="stat-icon" />
            <span class="stat-label">已处理:</span>
            <span class="stat-value">
              {{ progressState.details.processedNodes }} / {{ progressState.details.totalNodes }}
            </span>
          </div>
          <div class="stat-row">
            <q-icon name="speed" size="16px" class="stat-icon" />
            <span class="stat-label">处理速度:</span>
            <span class="stat-value">{{ progressState.details.speed }}</span>
          </div>
          <div class="stat-row">
            <q-icon name="schedule" size="16px" class="stat-icon" />
            <span class="stat-label">已耗时:</span>
            <span class="stat-value">{{ formatTime(progressState.details.elapsedTime) }}</span>
          </div>
          <div class="stat-row" v-if="progressState.details.estimatedRemaining > 0">
            <q-icon name="hourglass_empty" size="16px" class="stat-icon" />
            <span class="stat-label">预计剩余:</span>
            <span class="stat-value">{{ formatTime(progressState.details.estimatedRemaining) }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="actions">
          <el-button 
            v-if="progressState.canCancel"
            type="danger"
            size="small"
            @click="handleCancel"
          >
            取消初始化
          </el-button>
        </div>
      </div>

      <!-- 完成状态 -->
      <div v-if="!progressState.isInitializing && progressState.performanceMetrics" class="completed-state">
        <el-alert 
          type="success"
          :closable="false"
          show-icon
        >
          <template #title>
            <strong>初始化完成！</strong>
          </template>
          <div class="performance-metrics">
            <div class="metric-row">
              <span>数据适配:</span>
              <span>{{ progressState.performanceMetrics.dataAdaptTime }}ms</span>
            </div>
            <div class="metric-row">
              <span>布局计算:</span>
              <span>{{ progressState.performanceMetrics.layoutCalcTime }}ms</span>
            </div>
            <div class="metric-row">
              <span>样式生成:</span>
              <span>{{ progressState.performanceMetrics.styleGenTime }}ms</span>
            </div>
            <div class="metric-row">
              <span>总耗时:</span>
              <span><strong>{{ progressState.performanceMetrics.totalTime }}ms</strong></span>
            </div>
            <div class="metric-row" v-if="progressState.performanceMetrics.nodesPerSecond">
              <span>处理速度:</span>
              <span>{{ Math.round(progressState.performanceMetrics.nodesPerSecond) }} nodes/s</span>
            </div>
          </div>
        </el-alert>
      </div>

      <!-- 错误状态 -->
      <div v-if="progressState.error" class="error-state">
        <el-alert 
          type="error"
          :closable="false"
          show-icon
        >
          <template #title>
            <strong>初始化失败</strong>
          </template>
          <div class="error-message">{{ progressState.error }}</div>
          <el-button 
            type="primary"
            size="small"
            @click="handleClearError"
            style="margin-top: 12px"
          >
            清除错误
          </el-button>
        </el-alert>
      </div>

      <!-- 说明 -->
      <div class="help-text">
        <q-icon name="info" size="14px" />
        <span>此面板实时显示大规模图表初始化的进度信息</span>
      </div>
    </div>
  </el-collapse-item>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStarChartStore } from '@stores/projectPage/starChart'
import type { InitProgressState } from '../types/panel.types'
import { 
  DEFAULT_INIT_PROGRESS_STATE, 
  formatTime, 
  getStageLabel,
  getStageColor 
} from '../types/panel.types'

/**
 * 初始化进度监听面板
 */

const starChartStore = useStarChartStore()

// 进度状态
const progressState = ref<InitProgressState>({ ...DEFAULT_INIT_PROGRESS_STATE })

// 监听 store 中的进度状态变化
// 注意：需要在 StarChartStore 中添加进度状态的管理
// 这里先使用本地状态，后续集成时会连接到 store

/**
 * 获取进度条颜色
 */
const getProgressColor = () => {
  if (progressState.value.currentProgress < 30) {
    return '#409eff' // 蓝色
  } else if (progressState.value.currentProgress < 70) {
    return '#e6a23c' // 橙色
  } else {
    return '#67c23a' // 绿色
  }
}

/**
 * 获取阶段标签类型
 */
const getStageType = (stage: string): 'success' | 'info' | 'warning' | 'danger' => {
  const color = getStageColor(stage)
  const typeMap: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
    'primary': 'info',
    'warning': 'warning',
    'success': 'success',
    'info': 'info',
    'danger': 'danger'
  }
  return typeMap[color] || 'info'
}

/**
 * 获取当前消息
 */
const getCurrentMessage = () => {
  const stageMessages: Record<string, string> = {
    'data-adapt': '正在验证和转换数据格式...',
    'layout-calc': `正在计算 ${progressState.value.details.totalNodes} 个节点的位置...`,
    'style-gen': '正在生成样式配置和规则...',
    'g6-init': '正在初始化 G6 渲染引擎...',
    'rendering': '正在渲染图表到画布...'
  }
  return stageMessages[progressState.value.currentStage] || '处理中...'
}

/**
 * 取消初始化
 */
const handleCancel = () => {
  console.log('[InitProgressPanel] 用户取消初始化')
  // TODO: 调用 InitializationManager 的 cancel 方法
  // initializationManager.cancel()
}

/**
 * 清除错误
 */
const handleClearError = () => {
  progressState.value = { ...DEFAULT_INIT_PROGRESS_STATE }
}

// 暴露方法供外部调用（用于更新进度）
defineExpose({
  updateProgress: (state: Partial<InitProgressState>) => {
    progressState.value = {
      ...progressState.value,
      ...state
    }
  },
  reset: () => {
    progressState.value = { ...DEFAULT_INIT_PROGRESS_STATE }
  }
})
</script>

<style scoped lang="scss">
.init-progress-panel {
  padding: 16px;
  min-height: 200px;
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-text {
  margin-top: 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--obsidian-text-primary);
}

.empty-desc {
  margin-top: 8px;
  font-size: 12px;
  color: var(--obsidian-text-secondary);
}

// 进度激活状态
.progress-active {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.progress-bar-container {
  position: relative;
}

.progress-percentage {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: 600;
  color: var(--obsidian-text-primary);
}

// 阶段信息
.stage-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--obsidian-background-secondary);
  border-radius: 6px;
}

.stage-message {
  font-size: 13px;
  color: var(--obsidian-text-primary);
  flex: 1;
}

// 统计信息
.statistics {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--obsidian-background-secondary);
  border-radius: 6px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.stat-icon {
  color: var(--obsidian-text-secondary);
}

.stat-label {
  color: var(--obsidian-text-secondary);
  min-width: 70px;
}

.stat-value {
  color: var(--obsidian-text-primary);
  font-weight: 500;
  font-family: 'Courier New', monospace;
}

// 操作按钮
.actions {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

// 完成状态
.completed-state {
  margin-bottom: 16px;
}

.performance-metrics {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  
  span:first-child {
    color: var(--el-text-color-secondary);
  }
  
  span:last-child {
    font-family: 'Courier New', monospace;
    color: var(--el-text-color-primary);
  }
}

// 错误状态
.error-state {
  margin-bottom: 16px;
}

.error-message {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-color-danger);
  font-family: 'Courier New', monospace;
  background: rgba(245, 108, 108, 0.1);
  padding: 8px;
  border-radius: 4px;
}

// 帮助文本
.help-text {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 8px 12px;
  background: var(--obsidian-background-secondary);
  border-radius: 4px;
  font-size: 11px;
  color: var(--obsidian-text-secondary);
}
</style>

