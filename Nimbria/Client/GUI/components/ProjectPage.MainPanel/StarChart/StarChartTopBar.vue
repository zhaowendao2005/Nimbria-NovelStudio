<template>
  <div class="starchart-topbar">
    <div class="topbar-left">
      <span class="topbar-title">📊 StarChart 可视化视图</span>
      <span class="topbar-desc">基于 Cytoscape.js 的小说设定关系图</span>
    </div>
    
    <div class="topbar-right">
      <!-- 滚轮灵敏度控制 -->
      <div class="sensitivity-control">
        <span class="control-label">滚轮灵敏度</span>
        <el-slider
          v-model="sensitivityValue"
          :min="0.05"
          :max="20.0"
          :step="0.05"
          @change="handleSensitivityChange"
          class="sensitivity-slider"
        />
        <span class="sensitivity-label">{{ sensitivityValue.toFixed(2) }}</span>
      </div>
      
      <el-divider direction="vertical" />
      
      <el-button size="small" @click="$emit('create-view')">
        <el-icon><Plus /></el-icon>
        创建视图
      </el-button>
      
      <el-button size="small" @click="$emit('relayout')">
        <el-icon><Refresh /></el-icon>
        重新布局
      </el-button>
      
      <el-button size="small" @click="$emit('export')">
        <el-icon><Download /></el-icon>
        导出
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Refresh, Download } from '@element-plus/icons-vue'
import { useStarChartConfigStore } from '@stores/projectPage/starChart'

const emit = defineEmits<{
  'create-view': []
  'relayout': []
  'export': []
  'sensitivity-change': [sensitivity: number]
}>()

const configStore = useStarChartConfigStore()

// 滚轮灵敏度（从store获取，保持联动）
const sensitivityValue = computed({
  get: () => configStore.config.interaction.wheelSensitivity,
  set: (value: number) => {
    configStore.updateConfig('interaction.wheelSensitivity', value)
    emit('sensitivity-change', value)
  }
})

// 处理灵敏度变化
const handleSensitivityChange = (value: number) => {
  // computed setter 会自动调用，这里只需emit
  emit('sensitivity-change', value)
}
</script>

<style scoped lang="scss">
.starchart-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px; /* 固定高度 */
  padding: 0 16px;
  background: var(--obsidian-background-secondary);
  border-bottom: 1px solid var(--obsidian-border-color);
  flex-shrink: 0; /* 防止被压缩 */
}

.topbar-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.topbar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--obsidian-text-primary);
}

.topbar-desc {
  font-size: 12px;
  color: var(--obsidian-text-secondary);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 滚轮灵敏度控制 */
.sensitivity-control {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
}

.control-label {
  font-size: 12px;
  color: var(--obsidian-text-secondary);
  white-space: nowrap;
}

.sensitivity-slider {
  width: 150px;
  margin: 0 8px;
}

.sensitivity-label {
  font-size: 12px;
  color: var(--obsidian-text-secondary);
  min-width: 35px;
  text-align: right;
  font-weight: 500;
}
</style>

