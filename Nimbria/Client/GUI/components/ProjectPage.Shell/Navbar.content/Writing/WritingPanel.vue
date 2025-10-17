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
              <!-- 节点配置 -->
              <div class="config-section">
                <h5>节点配置</h5>
                <div class="config-item">
                  <label>默认节点大小</label>
                  <el-slider v-model="nodeSize" :min="20" :max="100" />
                </div>
                <div class="config-item">
                  <label>节点标签显示</label>
                  <el-switch v-model="showLabels" />
                </div>
              </div>
              
              <div class="config-divider-line"></div>

              <!-- 关系配置 -->
              <div class="config-section">
                <h5>关系配置</h5>
                <div class="config-item">
                  <label>边线粗细</label>
                  <el-slider v-model="edgeWidth" :min="1" :max="10" />
                </div>
                <div class="config-item">
                  <label>显示关系标签</label>
                  <el-switch v-model="showEdgeLabels" />
                </div>
              </div>
              
              <div class="config-divider-line"></div>

              <!-- 布局配置 -->
              <div class="config-section">
                <h5>布局算法</h5>
                <div class="config-item">
                  <label>布局类型</label>
                  <el-select v-model="layoutType" placeholder="选择布局">
                    <el-option label="力导向布局" value="fcose" />
                    <el-option label="圆形布局" value="circle" />
                    <el-option label="网格布局" value="grid" />
                    <el-option label="层次布局" value="dagre" />
                  </el-select>
                </div>
              </div>
              
              <div class="config-divider-line"></div>

              <!-- 颜色主题 -->
              <div class="config-section">
                <h5>颜色主题</h5>
                <div class="config-item">
                  <label>主题选择</label>
                  <el-select v-model="colorTheme" placeholder="选择主题">
                    <el-option label="默认主题" value="default" />
                    <el-option label="深色主题" value="dark" />
                    <el-option label="彩虹主题" value="rainbow" />
                    <el-option label="简约主题" value="minimal" />
                  </el-select>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="config-actions">
                <el-button type="primary" size="small" @click="handleApplyConfig">
                  应用配置
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

/**
 * WritingPanel
 * NovelAgent 面板
 * 提供小说创作相关功能
 */

// 默认展开第二个分组（StarChart）
const activeNames = ref(['category2'])

// StarChart 配置数据
const nodeSize = ref(40)
const showLabels = ref(true)
const edgeWidth = ref(2)
const showEdgeLabels = ref(false)
const layoutType = ref('fcose')
const colorTheme = ref('default')

// 打开 StarChart 视图
const handleOpenStarChart = async () => {
  try {
    const { CustomPageAPI } = await import('../../../../../Service/CustomPageManager')
    await CustomPageAPI.open('starchart-view')
  } catch (error) {
    console.error('[WritingPanel] 打开 StarChart 失败:', error)
  }
}

// 应用配置
const handleApplyConfig = () => {
  const config = {
    nodeSize: nodeSize.value,
    showLabels: showLabels.value,
    edgeWidth: edgeWidth.value,
    showEdgeLabels: showEdgeLabels.value,
    layoutType: layoutType.value,
    colorTheme: colorTheme.value
  }
  
  console.log('[WritingPanel] 应用 StarChart 配置:', config)
  // TODO: 实现配置应用逻辑
}

// 重置配置
const handleResetConfig = () => {
  nodeSize.value = 40
  showLabels.value = true
  edgeWidth.value = 2
  showEdgeLabels.value = false
  layoutType.value = 'fcose'
  colorTheme.value = 'default'
  
  console.log('[WritingPanel] 重置 StarChart 配置')
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

