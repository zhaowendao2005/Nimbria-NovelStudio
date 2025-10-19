<template>
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
</template>

<script setup lang="ts">
/**
 * 中央控制台面板
 * 提供项目中央控制台的入口
 */

// 打开中央控制台
const handleOpenControlPanel = async () => {
  try {
    const { CustomPageAPI } = await import('@service/CustomPageManager')
    await CustomPageAPI.open('control-panel')
    console.log('[ControlPanel] 打开中央控制台')
  } catch (error) {
    console.error('[ControlPanel] 打开中央控制台失败:', error)
  }
}
</script>

<style scoped>
.collapse-content {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-panel-intro {
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
</style>

