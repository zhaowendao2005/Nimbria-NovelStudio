<template>
  <div class="control-panel-page">
    <ControlPanelTopBar
      @refresh="handleRefresh"
      @settings="handleSettings"
      @export="handleExport"
    />
    
    <div class="control-panel-page__content">
      <div class="control-panel-grid">
        <!-- 系统信息卡片 -->
        <el-card class="control-card">
          <template #header>
            <div class="card-header">
              <span>📊 系统信息</span>
            </div>
          </template>
          <div class="card-content">
            <div class="info-item">
              <span class="info-label">项目名称：</span>
              <span class="info-value">Nimbria NovelStudio</span>
            </div>
            <div class="info-item">
              <span class="info-label">版本：</span>
              <span class="info-value">1.0.0</span>
            </div>
            <div class="info-item">
              <span class="info-label">状态：</span>
              <el-tag type="success" size="small">运行中</el-tag>
            </div>
          </div>
        </el-card>

        <!-- 快速操作卡片 -->
        <el-card class="control-card">
          <template #header>
            <div class="card-header">
              <span>⚡ 快速操作</span>
            </div>
          </template>
          <div class="card-content">
            <el-space direction="vertical" :size="8" style="width: 100%">
              <el-button type="primary" size="small" style="width: 100%">
                创建新项目
              </el-button>
              <el-button type="success" size="small" style="width: 100%">
                打开项目
              </el-button>
              <el-button type="info" size="small" style="width: 100%">
                导入数据
              </el-button>
            </el-space>
          </div>
        </el-card>

        <!-- 工具箱卡片 -->
        <el-card class="control-card">
          <template #header>
            <div class="card-header">
              <span>🛠️ 工具箱</span>
            </div>
          </template>
          <div class="card-content">
            <el-space wrap :size="8">
              <el-button size="small" @click="openStarChart">
                StarChart
              </el-button>
              <el-button size="small">
                Markdown
              </el-button>
              <el-button size="small">
                DocParser
              </el-button>
              <el-button size="small">
                数据库
              </el-button>
            </el-space>
          </div>
        </el-card>

        <!-- 最近活动卡片 -->
        <el-card class="control-card">
          <template #header>
            <div class="card-header">
              <span>📝 最近活动</span>
            </div>
          </template>
          <div class="card-content">
            <el-empty 
              description="暂无活动记录" 
              :image-size="80"
            />
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import ControlPanelTopBar from './ControlPanelTopBar.vue'

// 处理刷新
const handleRefresh = () => {
  ;(ElMessage as any).success('已刷新')
}

// 处理设置
const handleSettings = () => {
  ;(ElMessage as any).info('设置功能开发中...')
}

// 处理导出
const handleExport = () => {
  ;(ElMessage as any).info('导出功能开发中...')
}

// 打开 StarChart
const openStarChart = async () => {
  try {
    const { CustomPageAPI } = await import('../../../../Service/CustomPageManager')
    await CustomPageAPI.open('starchart-view')
    ;(ElMessage as any).success('已打开 StarChart')
  } catch (error) {
    console.error('[ControlPanel] 打开 StarChart 失败:', error)
    ;(ElMessage as any).error('打开失败')
  }
}
</script>

<style scoped lang="scss">
.control-panel-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
}

.control-panel-page__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
}

.control-panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.control-card {
  height: fit-content;
}

.card-header {
  font-weight: 600;
  font-size: 14px;
}

.card-content {
  padding: 8px 0;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  
  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  min-width: 80px;
}

.info-value {
  font-size: 13px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}
</style>

