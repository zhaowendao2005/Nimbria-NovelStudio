<template>
  <div class="writing-panel">
    <div class="writing-header">
      <h3>NovelAgent</h3>
    </div>
    
    <el-collapse v-model="activeNames" class="writing-collapse">
      <!-- 中央控制台 -->
      <el-collapse-item title="中央控制台" name="category1">
        <div class="collapse-content">
          <div class="control-panel-intro">
            <p class="intro-text">
              🎛️ 项目中央控制台
            </p>
            <p class="intro-desc">
              统一管理和控制项目的核心功能与系统设置
            </p>
            <el-button type="primary" @click="handleOpenControlPanel">
              打开控制台
            </el-button>
          </div>
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
              <!-- 🆕 数据源选择 -->
              <div class="config-section config-section-highlight">
                <h5>📊 数据源</h5>
                <div class="config-item">
                  <label>数据来源</label>
                  <el-select 
                    :model-value="configStore.dataSource"
                    @change="onDataSourceChange"
                    placeholder="选择数据源"
                    size="default"
                  >
                    <el-option 
                      label="性能测试数据（400节点）" 
                      value="mock-large"
                    >
                      <span style="float: left">性能测试数据</span>
                      <span style="float: right; color: #8492a6; font-size: 12px; margin-left: 12px">400节点</span>
                    </el-option>
                    
                    <el-option 
                      label="测试数据A（30节点）" 
                      value="mock-normal"
                    >
                      <span style="float: left">测试数据A</span>
                      <span style="float: right; color: #8492a6; font-size: 12px; margin-left: 12px">30节点</span>
                    </el-option>
                    
                    <el-option 
                      label="真实后端（Gun数据库）" 
                      value="gun"
                      disabled
                    >
                      <span style="float: left">真实后端</span>
                      <span style="float: right; color: #f56c6c; font-size: 12px; margin-left: 12px">待实现</span>
                    </el-option>
                  </el-select>
                </div>
              </div>
              
              <div class="config-divider-line"></div>

              <!-- 🆕 布局选择 -->
              <div class="config-section">
                <h5>🎨 布局算法</h5>
                <div class="config-item">
                  <label>布局类型</label>
                  <el-select 
                    :model-value="configStore.currentLayoutType"
                    @change="onLayoutChange"
                    placeholder="选择布局"
                    size="default"
                  >
                    <el-option 
                      label="同心圆布局" 
                      value="concentric"
                    >
                      <span style="float: left">同心圆布局</span>
                      <span style="float: right; color: #8492a6; font-size: 12px; margin-left: 12px">手动布局</span>
                    </el-option>
                    
                    <el-option 
                      label="力导向布局" 
                      value="force-directed"
                    >
                      <span style="float: left">力导向布局</span>
                      <span style="float: right; color: #8492a6; font-size: 12px; margin-left: 12px">自动布局</span>
                    </el-option>
                  </el-select>
                </div>
                
                <!-- 🔥 同心圆布局专属配置 -->
                <div v-show="configStore.showNodeSpacingCorrection">
                  <div class="config-divider-line-thin"></div>
                  
                  <div class="config-item">
                    <el-tooltip 
                      content="自动修正节点间距，防止节点重叠。仅同心圆布局可用。" 
                      placement="top"
                    >
                      <label>
                        节点间距修正
                        <el-tag size="small" type="info" style="margin-left: 4px">同心圆专用</el-tag>
                      </label>
                    </el-tooltip>
                    <el-switch
                      v-model="configStore.layoutConfig.enableNodeSpacingCorrection"
                      @change="updateLayoutConfig('enableNodeSpacingCorrection', $event)"
                      active-text="启用"
                      inactive-text="禁用"
                    />
                  </div>
                  
                  <div 
                    class="config-item" 
                    v-show="configStore.layoutConfig.enableNodeSpacingCorrection"
                  >
                    <el-tooltip 
                      content="节点间最小距离 = 节点直径 × 倍数。1.5=紧凑，2.5=舒适，4.0=宽松" 
                      placement="top"
                    >
                      <label>最小间距倍数</label>
                    </el-tooltip>
                    <el-slider
                      v-model="configStore.layoutConfig.minNodeDistanceMultiplier"
                      @change="updateLayoutConfig('minNodeDistanceMultiplier', $event)"
                      :min="1.5"
                      :max="4.0"
                      :step="0.1"
                    />
                  </div>
                  
                  <div 
                    class="config-item" 
                    v-show="configStore.layoutConfig.enableNodeSpacingCorrection"
                  >
                    <el-tooltip 
                      content="控制修正强度。0.3=温和，0.7=平衡，1.0=强力" 
                      placement="top"
                    >
                      <label>修正强度</label>
                    </el-tooltip>
                    <el-slider
                      v-model="configStore.layoutConfig.spacingCorrectionStrength"
                      @change="updateLayoutConfig('spacingCorrectionStrength', $event)"
                      :min="0.1"
                      :max="1.0"
                      :step="0.1"
                    />
                  </div>
                </div>
              </div>
              
              <div class="config-divider-line"></div>

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

              <!-- 节点样式设计 -->
              <div class="config-section">
                <h5>🎨 节点样式设计</h5>
                <div class="config-item">
                  <label>SVG选择模式</label>
                  <el-switch
                    v-model="configStore.config.nodeStyle.randomSVGSelection"
                    @change="updateConfig('nodeStyle.randomSVGSelection', $event)"
                    active-text="随机选择"
                    inactive-text="手动选择"
                  />
                </div>
                <div class="config-item" v-show="!configStore.config.nodeStyle.randomSVGSelection">
                  <label>SVG图标</label>
                  <el-select 
                    v-model="configStore.config.nodeStyle.selectedSVGIndex"
                    @change="updateConfig('nodeStyle.selectedSVGIndex', $event)"
                    placeholder="选择图标"
                    size="small"
                  >
                    <el-option 
                      v-for="(icon, index) in SVG_NODE_ICONS" 
                      :key="icon.id"
                      :label="icon.name" 
                      :value="index" 
                    />
                  </el-select>
                </div>
                <div class="config-item">
                  <label>默认节点大小</label>
                  <el-slider
                    v-model="configStore.config.nodeStyle.defaultSize"
                    @change="updateConfig('nodeStyle.defaultSize', $event)"
                    :min="16"
                    :max="48"
                    :step="2"
                  />
                </div>
                <div class="config-item">
                  <label>节点大小倍数</label>
                  <el-slider
                    v-model="configStore.config.nodeStyle.sizeMultiplier"
                    @change="updateConfig('nodeStyle.sizeMultiplier', $event)"
                    :min="0.5"
                    :max="2.0"
                    :step="0.1"
                  />
                </div>
                <div class="config-item">
                  <label>选中节点大小</label>
                  <el-slider
                    v-model="configStore.config.nodeStyle.selectedNodeSize"
                    @change="updateConfig('nodeStyle.selectedNodeSize', $event)"
                    :min="0.8"
                    :max="1.5"
                    :step="0.1"
                  />
                </div>
                <div class="config-item">
                  <label>一级邻居大小</label>
                  <el-slider
                    v-model="configStore.config.nodeStyle.firstDegreeNodeSize"
                    @change="updateConfig('nodeStyle.firstDegreeNodeSize', $event)"
                    :min="0.8"
                    :max="1.3"
                    :step="0.1"
                  />
                </div>
                <div class="config-item">
                  <label>二级邻居大小</label>
                  <el-slider
                    v-model="configStore.config.nodeStyle.secondDegreeNodeSize"
                    @change="updateConfig('nodeStyle.secondDegreeNodeSize', $event)"
                    :min="0.8"
                    :max="1.2"
                    :step="0.1"
                  />
                </div>
                <div class="config-item">
                  <label>淡化节点大小</label>
                  <el-slider
                    v-model="configStore.config.nodeStyle.fadedNodeSize"
                    @change="updateConfig('nodeStyle.fadedNodeSize', $event)"
                    :min="0.5"
                    :max="1.0"
                    :step="0.1"
                  />
                </div>
                <div class="config-item">
                  <label>填充模式</label>
                  <el-select 
                    v-model="configStore.config.nodeStyle.fillMode"
                    @change="updateConfig('nodeStyle.fillMode', $event)"
                    size="small"
                  >
                    <el-option label="⭕ 无填充" value="none" />
                    <el-option label="🫧 半透明" value="transparent" />
                  </el-select>
                </div>
                <div class="config-item" v-show="configStore.config.nodeStyle.fillMode === 'transparent'">
                  <label>填充透明度</label>
                  <el-slider
                    v-model="configStore.config.nodeStyle.fillOpacity"
                    @change="updateConfig('nodeStyle.fillOpacity', $event)"
                    :min="0.01"
                    :max="0.2"
                    :step="0.01"
                  />
                </div>
                <div class="config-item">
                  <label>描边宽度</label>
                  <el-slider
                    v-model="configStore.config.nodeStyle.strokeWidth"
                    @change="updateConfig('nodeStyle.strokeWidth', $event)"
                    :min="0.5"
                    :max="3"
                    :step="0.5"
                  />
                </div>
                <div class="config-item">
                  <label>文字位置</label>
                  <el-select 
                    v-model="configStore.config.nodeStyle.textPosition"
                    @change="updateConfig('nodeStyle.textPosition', $event)"
                    size="small"
                  >
                    <el-option label="⬇️ 节点下方" value="bottom" />
                    <el-option label="🎯 节点中心" value="center" />
                    <el-option label="⬆️ 节点上方" value="top" />
                  </el-select>
                </div>
                <div class="config-item">
                  <label>字体大小</label>
                  <el-slider
                    v-model="configStore.config.nodeStyle.fontSize"
                    @change="updateConfig('nodeStyle.fontSize', $event)"
                    :min="8"
                    :max="16"
                    :step="1"
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
                  <label>边宽度</label>
                  <el-slider
                    v-model="configStore.config.edgeStyle.defaultEdgeWidth"
                    @change="updateConfig('edgeStyle.defaultEdgeWidth', $event)"
                    :min="0.5"
                    :max="3"
                    :step="0.5"
                  />
                </div>
                <div class="config-item">
                  <label>平时透明度</label>
                  <el-slider
                    v-model="configStore.config.edgeStyle.edgeOpacity"
                    @change="updateConfig('edgeStyle.edgeOpacity', $event)"
                    :min="0.1"
                    :max="1.0"
                    :step="0.1"
                  />
                </div>
                <div class="config-item">
                  <label>高亮透明度</label>
                  <el-slider
                    v-model="configStore.config.edgeStyle.highlightEdgeOpacity"
                    @change="updateConfig('edgeStyle.highlightEdgeOpacity', $event)"
                    :min="0.1"
                    :max="1.0"
                    :step="0.1"
                  />
                </div>
                <div class="config-item">
                  <label>高亮边宽度</label>
                  <el-slider
                    v-model="configStore.config.edgeStyle.highlightEdgeWidth"
                    @change="updateConfig('edgeStyle.highlightEdgeWidth', $event)"
                    :min="1"
                    :max="5"
                    :step="0.5"
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
import { useStarChartConfigStore, useStarChartStore } from '@stores/projectPage/starChart'
import type { ConfigPreset, DataSourceType, LayoutType } from '@stores/projectPage/starChart/starChart.config.types'
import { SVG_NODE_ICONS } from '@stores/projectPage/starChart'

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

// 打开中央控制台
const handleOpenControlPanel = async () => {
  try {
    const { CustomPageAPI } = await import('../../../../../Service/CustomPageManager')
    await CustomPageAPI.open('control-panel')
    console.log('[WritingPanel] 打开中央控制台')
  } catch (error) {
    console.error('[WritingPanel] 打开中央控制台失败:', error)
  }
}

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

// 🆕 切换数据源
const onDataSourceChange = async (source: DataSourceType) => {
  try {
    const starChartStore = useStarChartStore()
    await starChartStore.switchDataSource(source)
    console.log(`[WritingPanel] 数据源已切换: ${source}`)
  } catch (error) {
    console.error('[WritingPanel] 切换数据源失败:', error)
  }
}

// 🆕 切换布局
const onLayoutChange = async (layoutType: LayoutType) => {
  try {
    const starChartStore = useStarChartStore()
    await starChartStore.switchLayout(layoutType)
    console.log(`[WritingPanel] 布局已切换: ${layoutType}`)
  } catch (error) {
    console.error('[WritingPanel] 切换布局失败:', error)
  }
}

// 🆕 更新布局配置
const updateLayoutConfig = (path: string, value: unknown) => {
  configStore.updateLayoutConfig(path, value)
  // 重新计算布局
  const starChartStore = useStarChartStore()
  starChartStore.recomputeLayout()
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

/* 中央控制台介绍卡片 */
.control-panel-intro {
  text-align: center;
  padding: 24px;
  max-width: 400px;
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

/* 🆕 细分割线 */
.config-divider-line-thin {
  height: 1px;
  background: var(--obsidian-border-color);
  margin: 8px 0;
  opacity: 0.5;
}

/* 🆕 高亮section */
.config-section-highlight {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid rgba(102, 126, 234, 0.2);
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
  margin-bottom: 0px; /* 减小间距 */
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

