<template>
  <div class="writing-panel">
    <div class="writing-header">
      <h3>NovelAgent</h3>
    </div>
    
    <el-collapse v-model="activeNames" class="writing-collapse">
      <!-- 分类一 -->
      <el-collapse-item title="分类一" name="category1">
        <div class="collapse-content">
          <el-empty description="功能开发中..." />
        </div>
      </el-collapse-item>

      <!-- 分类二: StarChart 可视化视图 -->
      <el-collapse-item title="StarChart 可视化视图" name="category2">
        <div class="collapse-content">
          <div class="starchart-intro">
            <p class="intro-text">
              📊 基于 Cytoscape.js 的小说设定关系图可视化系统
            </p>
            <p class="intro-desc">
              可视化展示角色、地点、事件、物品等元素之间的关系网络
            </p>
            <el-button type="primary" @click="handleOpenStarChart">
              创建视图
            </el-button>
          </div>
        </div>
      </el-collapse-item>

      <!-- 分类三: StarChart 配置 -->
      <el-collapse-item title="StarChart 配置" name="category3">
        <div class="collapse-content-config">
          <div class="starchart-config-card">
            <div class="config-header">
              <h4>⚙️ 图表配置</h4>
            </div>
            <div class="config-content">
              <!-- 配置预设 -->
              <div class="config-section">
                <h5>📊 配置预设</h5>
                <div class="config-item">
                  <label>预设选择</label>
                  <el-select 
                    v-model="configStore.activePreset" 
                    @change="onPresetChange"
                    placeholder="选择预设"
                  >
                    <el-option label="🚀 性能优先" value="performance" />
                    <el-option label="🔧 开发调试" value="development" />
                    <el-option label="🏭 生产环境" value="production" />
                    <el-option label="📱 极简模式" value="minimal" />
                    <el-option label="🎛️ 自定义" value="custom" />
                  </el-select>
                </div>
              </div>
              
              <div class="config-divider-line"></div>

              <!-- WebGL与渲染 -->
              <div class="config-section">
                <h5>⚡ WebGL与渲染</h5>
                <div class="config-item">
                  <label>WebGL加速</label>
                  <el-switch
                    v-model="configStore.config.webgl.enabled"
                    @change="updateConfig('webgl.enabled', $event)"
                  />
                </div>
                <div class="config-item">
                  <label>显示FPS</label>
                  <el-switch
                    v-model="configStore.config.webgl.showFps"
                    @change="updateConfig('webgl.showFps', $event)"
                  />
                </div>
                <div class="config-item">
                  <label>视口隐藏边</label>
                  <el-switch
                    v-model="configStore.config.rendering.hideEdgesOnViewport"
                    @change="updateConfig('rendering.hideEdgesOnViewport', $event)"
                  />
                </div>
              </div>
              
              <div class="config-divider-line"></div>

              <!-- 性能监控 -->
              <div class="config-section">
                <h5>🔍 性能监控</h5>
                <div class="config-item">
                  <label>性能监控</label>
                  <el-switch
                    v-model="configStore.config.performance.enabled"
                    @change="updateConfig('performance.enabled', $event)"
                  />
                </div>
                <div class="config-item">
                  <label>事件跟踪</label>
                  <el-switch
                    v-model="configStore.config.performance.detailedEventTracking"
                    @change="updateConfig('performance.detailedEventTracking', $event)"
                  />
                </div>
                <div class="config-item">
                  <label>长帧检测</label>
                  <el-switch
                    v-model="configStore.config.performance.longFrameMonitoring"
                    @change="updateConfig('performance.longFrameMonitoring', $event)"
                  />
                </div>
              </div>
              
              <div class="config-divider-line"></div>

              <!-- 日志控制 -->
              <div class="config-section">
                <h5>📋 日志控制</h5>
                <div class="config-item">
                  <label>日志级别</label>
                  <el-select 
                    v-model="configStore.config.logging.level"
                    @change="updateConfig('logging.level', $event)"
                    placeholder="选择级别"
                  >
                    <el-option label="静默" value="silent" />
                    <el-option label="极简" value="minimal" />
                    <el-option label="正常" value="normal" />
                    <el-option label="详细" value="verbose" />
                  </el-select>
                </div>
                <div class="config-item">
                  <label>控制台日志</label>
                  <el-switch
                    v-model="configStore.config.logging.enableConsoleLog"
                    @change="updateConfig('logging.enableConsoleLog', $event)"
                  />
                </div>
                <div class="config-item">
                  <label>性能警告</label>
                  <el-switch
                    v-model="configStore.config.logging.enablePerformanceWarnings"
                    @change="updateConfig('logging.enablePerformanceWarnings', $event)"
                  />
                </div>
              </div>
              
              <div class="config-divider-line"></div>

              <!-- 交互设置 -->
              <div class="config-section">
                <h5>🖱️ 交互设置</h5>
                <div class="config-item">
                  <label>滚轮灵敏度</label>
                  <el-slider
                    v-model="configStore.config.interaction.wheelSensitivity"
                    @change="updateConfig('interaction.wheelSensitivity', $event)"
                    :min="0.1"
                    :max="1.0"
                    :step="0.1"
                  />
                </div>
                <div class="config-item">
                  <label>框选功能</label>
                  <el-switch
                    v-model="configStore.config.interaction.boxSelectionEnabled"
                    @change="updateConfig('interaction.boxSelectionEnabled', $event)"
                  />
                </div>
              </div>
              
              <div class="config-divider-line"></div>

              <!-- 贝塞尔曲线边样式 -->
              <div class="config-section">
                <h5>🌊 贝塞尔曲线边样式</h5>
                <div class="config-item">
                  <label>边形状</label>
                  <el-select 
                    v-model="configStore.config.edgeStyle.curveStyle"
                    @change="updateConfig('edgeStyle.curveStyle', $event)"
                    placeholder="选择形状"
                  >
                    <el-option label="🌊 贝塞尔曲线" value="unbundled-bezier" />
                    <el-option label="📐 直线" value="straight" />
                    <el-option label="🔄 标准贝塞尔" value="bezier" />
                    <el-option label="🎋 干草堆 (性能)" value="haystack" />
                    <el-option label="🚖 出租车路径" value="taxi" />
                  </el-select>
                </div>
                <div class="config-item" v-show="configStore.config.edgeStyle.curveStyle.includes('bezier')">
                  <label>弯曲度</label>
                  <el-slider
                    v-model="configStore.config.edgeStyle.controlPointDistance"
                    @change="updateConfig('edgeStyle.controlPointDistance', $event)"
                    :min="10"
                    :max="120"
                  />
                </div>
                <div class="config-item" v-show="configStore.config.edgeStyle.curveStyle.includes('bezier')">
                  <label>控制点权重</label>
                  <el-slider
                    v-model="configStore.config.edgeStyle.controlPointWeight"
                    @change="updateConfig('edgeStyle.controlPointWeight', $event)"
                    :min="0.1"
                    :max="1.0"
                    :step="0.1"
                  />
                </div>
                <div class="config-item">
                  <label>边透明度</label>
                  <el-slider
                    v-model="configStore.config.edgeStyle.edgeOpacity"
                    @change="updateConfig('edgeStyle.edgeOpacity', $event)"
                    :min="0.1"
                    :max="1.0"
                    :step="0.1"
                  />
                </div>
                <div class="config-item">
                  <label>箭头形状</label>
                  <el-select 
                    v-model="configStore.config.edgeStyle.arrowShape"
                    @change="updateConfig('edgeStyle.arrowShape', $event)"
                    placeholder="选择箭头"
                  >
                    <el-option label="🔺 三角形" value="triangle" />
                    <el-option label="⭕ 无箭头" value="none" />
                    <el-option label="⬛ 方形" value="square" />
                    <el-option label="💎 菱形" value="diamond" />
                    <el-option label="🔴 圆形" value="circle" />
                  </el-select>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="config-actions">
                <el-button type="primary" size="small" @click="handleApplyConfig">
                  保存配置
                </el-button>
                <el-button size="small" @click="handleResetConfig">
                  重置默认
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useStarChartConfigStore } from '@stores/projectPage/starChart'
import type { ConfigPreset } from '@stores/projectPage/starChart/starChart.config.types'

/**
 * WritingPanel
 * NovelAgent 面板
 * 提供小说创作相关功能
 */

// 默认展开第二个分组（StarChart）
const activeNames = ref(['category2'])

// 使用配置store
const configStore = useStarChartConfigStore()

// 初始化配置
configStore.loadConfig()

// 打开 StarChart 视图
const handleOpenStarChart = async () => {
  try {
    const { CustomPageAPI } = await import('../../../../../Service/CustomPageManager')
    await CustomPageAPI.open('starchart-view')
  } catch (error) {
    console.error('[WritingPanel] 打开 StarChart 失败:', error)
  }
}

// 配置预设变更
const onPresetChange = (preset: ConfigPreset | 'custom') => {
  if (preset !== 'custom') {
    configStore.applyPreset(preset)
    console.log(`[WritingPanel] 已应用 ${preset} 配置预设`)
  }
}

// 更新配置的通用方法
const updateConfig = (path: string, value: unknown) => {
  configStore.updateConfig(path, value)
}

// 应用配置
const handleApplyConfig = () => {
  configStore.saveConfig()
  console.log('[WritingPanel] 配置已保存并应用')
}

// 重置配置
const handleResetConfig = async () => {
  try {
    await ElMessageBox.confirm('确定要重置为默认配置吗？', '重置配置', {
      type: 'warning'
    })
    configStore.resetToDefault()
    console.log('[WritingPanel] 配置已重置')
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.writing-panel {
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* 允许垂直滚动 */
}

.writing-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--obsidian-border-color);
  flex-shrink: 0; /* 标题固定 */
}

.writing-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--obsidian-text-primary);
}

/* Collapse 容器占满剩余空间 */
.writing-collapse {
  flex: 0 0 auto; /* 自动调整高度，不占满剩余空间 */
  display: flex;
  flex-direction: column;
  --el-collapse-border-color: var(--obsidian-border-color);
  --el-collapse-header-bg-color: var(--obsidian-background-secondary);
  --el-collapse-header-text-color: var(--obsidian-text-primary);
}

/* 折叠内容区域高度自适应 */
.collapse-content {
  min-height: 200px; /* 最小高度 */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* StarChart 介绍卡片 */
.starchart-intro {
  text-align: center;
  padding: 24px;
  max-width: 400px;
}

.intro-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--obsidian-text-primary);
  margin-bottom: 12px;
}

.intro-desc {
  font-size: 12px;
  color: var(--obsidian-text-secondary);
  margin-bottom: 20px;
  line-height: 1.6;
}

/* StarChart 配置面板 */
.collapse-content-config {
  padding: 8px;
}

.starchart-config-card {
  height: 550px; /* 减小固定高度 */
  border: 1px solid var(--obsidian-border-color);
  border-radius: 6px;
  background: var(--obsidian-background-secondary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.config-header {
  padding: 10px 12px; /* 减小内边距 */
  border-bottom: 1px solid var(--obsidian-border-color);
  background: var(--obsidian-background-primary);
  flex-shrink: 0; /* 头部固定 */
}

.config-header h4 {
  margin: 0;
  font-size: 12px; /* 减小字体 */
  font-weight: 600;
  color: var(--obsidian-text-primary);
}

.config-content {
  flex: 1; /* 占满剩余空间 */
  padding: 12px; /* 减小内边距 */
  overflow-y: auto; /* 内容滚动 */
  display: flex;
  flex-direction: column;
  gap: 0; /* 移除gap，使用divider控制间距 */
}

.config-section {
  margin-bottom: 0; /* 移除底部边距，由divider控制间距 */
}

.config-divider-line {
  height: 1px;
  background-color: var(--obsidian-border);
  margin: 12px 0 8px 0;
  width: 100%;
}

.config-section h5 {
  margin: 0 0 8px 0; /* 减小间距 */
  font-size: 11px; /* 减小字体 */
  font-weight: 600;
  color: var(--obsidian-text-primary);
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: -10px; /* 减小间距 */
  min-height: 24px; /* 设置最小高度 */
}

.config-item:last-child {
  margin-bottom: 0;
}

.config-item label {
  font-size: 10px; /* 减小字体 */
  color: var(--obsidian-text-secondary);
  flex-shrink: 0;
  margin-right: 8px; /* 减小间距 */
  min-width: 70px; /* 减小最小宽度 */
}

.config-item .el-slider {
  flex: 1;
  margin-left: 8px; /* 减小间距 */
}

.config-item .el-select {
  flex: 1;
  max-width: 120px; /* 减小宽度 */
}

.config-actions {
  display: flex;
  gap: 6px; /* 减小间距 */
  justify-content: flex-end;
  padding-top: 8px; /* 减小内边距 */
  margin-top: auto; /* 推到底部 */
  border-top: 1px solid var(--obsidian-border-color);
}
</style>

