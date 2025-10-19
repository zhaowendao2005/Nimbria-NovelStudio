<template>
  <el-collapse-item title="StarChart 可视化视图" name="category2">
    <div class="collapse-content">
      <div class="starchart-intro">
        <p class="intro-text">
          📊 基于 G6 的小说设定关系图可视化系统
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
</template>

<script setup lang="ts">
/**
 * StarChart 视图创建面板
 * 提供 StarChart 视图的创建入口
 */

// 打开 StarChart 视图
const handleOpenStarChart = async () => {
  try {
    const { CustomPageAPI } = await import('@service/CustomPageManager')
    await CustomPageAPI.open('starchart-view')
    console.log('[StarChartPanel] 打开 StarChart 视图')
  } catch (error) {
    console.error('[StarChartPanel] 打开 StarChart 失败:', error)
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
</style>

