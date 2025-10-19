<template>
  <div class="writing-panel">
    <div class="writing-header">
      <h3>NovelAgent</h3>
    </div>
    
    <el-collapse v-model="activeNames" class="writing-collapse">
      <!-- 中央控制台 -->
      <ControlPanel />

      <!-- StarChart 可视化视图 -->
      <StarChartPanel />

      <!-- 初始化进度监听 -->
      <InitProgressPanel ref="initProgressPanelRef" />

      <!-- StarChart 配置 -->
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
                      label="WebGL 性能测试（10000节点）" 
                      value="mock-xlarge"
                    >
                      <span style="float: left">WebGL 性能测试</span>
                      <span style="float: right; color: #e6a23c; font-size: 12px; margin-left: 12px">10000节点</span>
                    </el-option>
                    
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
                      label="MC配方图谱" 
                      value="mcrecipe-static"
                    >
                      <span style="float: left">MC配方图谱</span>
                      <span style="float: right; color: #67c23a; font-size: 12px; margin-left: 12px">3.4万配方</span>
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

              <!-- G6 渲染器选择 -->
              <div class="config-section config-section-highlight">
                <h5>⚡ G6 渲染器</h5>
                <div class="config-item">
                  <el-tooltip 
                    content="Canvas: 通用渲染（推荐） | WebGL: 大规模数据高性能 | SVG: 矢量导出" 
                    placement="top"
                  >
                    <label>渲染器类型</label>
                  </el-tooltip>
                  <el-select 
                    :model-value="configStore.config.g6.renderer"
                    @change="onG6RendererChange"
                    size="default"
                  >
                    <el-option value="canvas">
                      <span style="float: left">Canvas</span>
                      <span style="float: right; color: #8492a6; font-size: 12px">推荐</span>
                    </el-option>
                    <el-option value="webgl">
                      <span style="float: left">WebGL</span>
                      <span style="float: right; color: #409eff; font-size: 12px">高性能</span>
                    </el-option>
                    <el-option value="svg">
                      <span style="float: left">SVG</span>
                      <span style="float: right; color: #67c23a; font-size: 12px">矢量</span>
                    </el-option>
                  </el-select>
                </div>
                
                <!-- G6 引擎特性说明 -->
                <el-alert 
                  type="success"
                  :closable="false"
                  style="margin-top: 8px"
                >
                  <template #title>
                    <strong>G6 引擎优势：</strong>
                  </template>
                  ✅ WebGL 加速，支持 10万+ 节点<br>
                  ✅ 更流畅的动画和交互<br>
                  ✅ 官方 AntV 团队维护<br>
                  📊 当前节点数: {{ starChartStore.nodeCount }}
                </el-alert>
              </div>
              
              <div class="config-divider-line"></div>

              <!-- 🔥 Canvas 性能优化配置 -->
              <div class="config-section config-section-highlight">
                <h5>🚀 Canvas 性能优化</h5>
                
                <!-- 离屏渲染 -->
                <div class="config-item">
                  <el-tooltip 
                    content="双缓存技术，大幅提升拖动/缩放帧率 (+200%)" 
                    placement="top"
                  >
                    <label>🎯 离屏渲染</label>
                  </el-tooltip>
                  <el-switch
                    v-model="configStore.config.g6.canvasOptimization.enableOffscreen"
                    @change="updateConfig('g6.canvasOptimization.enableOffscreen', $event)"
                  />
                </div>
                
                <!-- 视锥剔除 -->
                <div class="config-item">
                  <el-tooltip 
                    content="只渲染可见节点，大规模数据必备" 
                    placement="top"
                  >
                    <label>👁️ 视锥剔除</label>
                  </el-tooltip>
                  <el-switch
                    v-model="configStore.config.g6.canvasOptimization.enableFrustumCulling"
                    @change="updateConfig('g6.canvasOptimization.enableFrustumCulling', $event)"
                  />
                </div>
                
                <!-- 按类型分组 -->
                <div class="config-item">
                  <el-tooltip 
                    content="减少状态切换，提升渲染效率" 
                    placement="top"
                  >
                    <label>📦 类型分组</label>
                  </el-tooltip>
                  <el-switch
                    v-model="configStore.config.g6.canvasOptimization.enableGroupByTypes"
                    @change="updateConfig('g6.canvasOptimization.enableGroupByTypes', $event)"
                  />
                </div>
                
                <!-- CSS 变换加速 -->
                <div class="config-item">
                  <el-tooltip 
                    content="使用 CSS transform 加速缩放/平移" 
                    placement="top"
                  >
                    <label>⚡ CSS 加速</label>
                  </el-tooltip>
                  <el-switch
                    v-model="configStore.config.g6.canvasOptimization.enableCSSTransform"
                    @change="updateConfig('g6.canvasOptimization.enableCSSTransform', $event)"
                  />
                </div>
                
                <!-- 像素比模式 -->
                <div class="config-item">
                  <label>🎨 像素比</label>
                  <el-select 
                    v-model="configStore.config.g6.canvasOptimization.pixelRatioMode"
                    @change="updateConfig('g6.canvasOptimization.pixelRatioMode', $event)"
                    size="small"
                  >
                    <el-option label="🔄 自动" value="auto">
                      <span style="float: left">自动</span>
                      <span style="float: right; color: #67c23a; font-size: 11px">平衡</span>
                    </el-option>
                    <el-option label="⚡ 性能优先" value="performance">
                      <span style="float: left">性能优先</span>
                      <span style="float: right; color: #e6a23c; font-size: 11px">pixelRatio=1</span>
                    </el-option>
                    <el-option label="💎 质量优先" value="quality">
                      <span style="float: left">质量优先</span>
                      <span style="float: right; color: #409eff; font-size: 11px">原生分辨率</span>
                    </el-option>
                  </el-select>
                </div>
                
                <!-- 自定义像素比 -->
                <div class="config-item" v-show="configStore.config.g6.canvasOptimization.pixelRatioMode === 'auto'">
                  <el-tooltip 
                    content="手动设置像素比（0.5-3.0），越小性能越好但越模糊" 
                    placement="top"
                  >
                    <label>🔧 自定义</label>
                  </el-tooltip>
                  <el-slider
                    v-model="configStore.config.g6.canvasOptimization.customPixelRatio"
                    @change="updateConfig('g6.canvasOptimization.customPixelRatio', $event)"
                    :min="0.5"
                    :max="3.0"
                    :step="0.1"
                  />
                </div>
                
                <!-- 绘制选择器 -->
                <div class="config-item">
                  <el-tooltip 
                    content="控制是否绘制选中/悬停效果" 
                    placement="top"
                  >
                    <label>🎭 选中效果</label>
                  </el-tooltip>
                  <el-select 
                    v-model="configStore.config.g6.canvasOptimization.paintSelector"
                    @change="updateConfig('g6.canvasOptimization.paintSelector', $event)"
                    size="small"
                  >
                    <el-option label="全部" value="all" />
                    <el-option label="禁用（性能++）" value="none" />
                  </el-select>
                </div>
                
                <!-- 性能提示 -->
                <el-alert 
                  type="success"
                  :closable="false"
                  style="margin-top: 8px"
                >
                  <template #title>
                    <span style="font-size: 11px;">💡 优化效果</span>
                  </template>
                  <div style="font-size: 10px;">
                    ✅ 离屏渲染：帧率 +200-300%<br>
                    ✅ 视锥剔除：大数据必备<br>
                    ✅ 全部启用：60 FPS 流畅
                  </div>
                </el-alert>
              </div>
              
              <div class="config-divider-line"></div>

              <!-- 布局选择 -->
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
                      label="多根径向树布局" 
                      value="multi-root-radial"
                    >
                      <span style="float: left">多根径向树</span>
                      <span style="float: right; color: #409eff; font-size: 12px; margin-left: 12px">Multi-Root Radial</span>
                    </el-option>
                    <el-option 
                      label="懒加载多根径向树" 
                      value="lazy-multi-root-radial"
                    >
                      <span style="float: left">🌱 懒加载多根径向树</span>
                      <span style="float: right; color: #52c41a; font-size: 12px; margin-left: 12px">Lazy Loading 🚀</span>
                    </el-option>
                  </el-select>
                </div>
                <el-alert 
                  type="info" 
                  :closable="false"
                  style="margin-top: 12px;"
                >
                  <template #title>
                    <span style="font-size: 12px;">未来版本将支持更多布局算法</span>
                  </template>
                </el-alert>
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


              <!-- 交互设置 -->
              <div class="config-section">
                <h5>🖱️ 交互设置</h5>
                <div class="config-item">
                  <label>滚轮灵敏度</label>
                  <el-slider
                    v-model="configStore.config.interaction.wheelSensitivity"
                    @change="updateConfig('interaction.wheelSensitivity', $event)"
                    :min="0.1"
                    :max="20.0"
                    :step="0.1"
                  />
                </div>
                <div class="config-item">
                  <label>点击激活邻域</label>
                  <el-switch
                    v-model="configStore.config.interaction.enableClickActivate"
                    @change="updateConfig('interaction.enableClickActivate', $event)"
                  />
                </div>
                <div class="config-item">
                  <label>激活层级</label>
                  <el-slider
                    v-model="configStore.config.interaction.activateDegree"
                    @change="updateConfig('interaction.activateDegree', $event)"
                    :min="1"
                    :max="3"
                    :step="1"
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

              <!-- 边样式 -->
              <div class="config-section">
                <h5>🌊 边样式</h5>
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
import { ref, nextTick } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useStarChartConfigStore, useStarChartStore } from '@stores/projectPage/starChart'
import type { ConfigPreset, DataSourceType, LayoutType } from '@stores/projectPage/starChart/starChart.config.types'
import { SVG_NODE_ICONS } from '@stores/projectPage/starChart'

// 导入 Panel 组件
import ControlPanel from './panels/ControlPanel.vue'
import StarChartPanel from './panels/StarChartPanel.vue'
import InitProgressPanel from './panels/InitProgressPanel.vue'

/**
 * WritingPanel
 * NovelAgent 面板
 * 提供小说创作相关功能
 */

// 默认展开第二个分组（StarChart）
const activeNames = ref(['category2'])

// 使用配置store
const configStore = useStarChartConfigStore()

// 🆕 使用 starChart store（用于访问节点数等信息）
const starChartStore = useStarChartStore()

// InitProgressPanel ref
const initProgressPanelRef = ref<InstanceType<typeof InitProgressPanel>>()

// 初始化配置
configStore.loadConfig()

// 暴露 initProgressPanel 的方法给外部使用
defineExpose({
  updateInitProgress: (state: Record<string, unknown>) => {
    if (initProgressPanelRef.value) {
      initProgressPanelRef.value.updateProgress(state)
    }
  },
  resetInitProgress: () => {
    if (initProgressPanelRef.value) {
      initProgressPanelRef.value.reset()
    }
  }
})

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

// 切换布局
const onLayoutChange = async (layoutType: LayoutType) => {
  try {
    // 直接调用配置 store 的 setLayoutType 方法
    configStore.setLayoutType(layoutType)
    console.log(`[WritingPanel] 布局已切换: ${layoutType}`)
  } catch (error) {
    console.error('[WritingPanel] 切换布局失败:', error)
  }
}

// 🆕 切换 G6 渲染器类型（Canvas/WebGL/SVG）
const onG6RendererChange = async (rendererType: 'canvas' | 'webgl' | 'svg') => {
  try {
    console.log(`[WritingPanel] 切换渲染器: ${configStore.config.g6.renderer} → ${rendererType}`)
    
    // 更新配置（会自动触发重新初始化）
    configStore.updateConfig('g6.renderer', rendererType)
    
    console.log(`[WritingPanel] 配置更新完成，当前渲染器: ${configStore.config.g6.renderer}`)
    
    // 用户反馈
    const rendererNames: Record<string, string> = {
      canvas: 'Canvas（通用）',
      webgl: 'WebGL（高性能）',
      svg: 'SVG（矢量）'
    }
    
    ElMessage.info({
      message: `正在切换渲染器到: ${rendererNames[rendererType]}...`
    })
    
    console.log(`[WritingPanel] 渲染器切换完成: ${rendererType}`)
  } catch (error) {
    console.error('[WritingPanel] 切换 G6 渲染器失败:', error)
    
    ElMessage.error({
      message: '渲染器切换失败'
    })
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
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  --el-collapse-border-color: var(--obsidian-border-color);
  --el-collapse-header-bg-color: var(--obsidian-background-secondary);
  --el-collapse-header-text-color: var(--obsidian-text-primary);
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

/* WebGL 子区域样式 */
.webgl-subsection {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid rgba(102, 126, 234, 0.15);
}

.webgl-subsection h6 {
  margin: 0 0 6px 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--obsidian-text-primary);
  opacity: 0.9;
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

/* 布局信息样式 */
.layout-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.layout-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--obsidian-text-primary);
}

.config-actions {
  display: flex;
  gap: 6px; /* 减小间距 */
  justify-content: flex-end;
  padding-top: 8px; /* 减小内边距 */
  margin-top: auto; /* 推到底部 */
  border-top: 1px solid var(--obsidian-border-color);
}

/* ✅ WebGL 优化样式已清理 */
</style>

