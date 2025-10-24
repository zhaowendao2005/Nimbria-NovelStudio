<template>
  <div class="novel-scraper-panel">
    <div class="placeholder-content">
      <el-empty description="小说爬取功能开发中">
        <template #image>
          <el-icon :size="100" color="var(--el-color-info)">
            <Reading />
          </el-icon>
        </template>
        <template #description>
          <div class="description">
            <p class="title">📚 小说可视化爬取工具</p>
            <p class="subtitle">即将推出以下功能：</p>
            <ul class="feature-list">
              <li>自动识别章节列表</li>
              <li>批量下载小说内容</li>
              <li>智能去除广告和无关内容</li>
              <li>多种格式导出（TXT、EPUB等）</li>
              <li>断点续传和进度保存</li>
            </ul>
          </div>
        </template>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Reading } from '@element-plus/icons-vue'

/**
 * NovelScraperPanel 组件
 * 小说可视化爬取功能（占位）
 */

interface Props {
  tabId: string
}

defineProps<Props>()
</script>

<style scoped lang="scss">
.novel-scraper-panel {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color-page);
  padding: 24px;
}

.placeholder-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.description {
  text-align: center;
  
  .title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 12px;
  }
  
  .subtitle {
    font-size: 14px;
    color: var(--el-text-color-regular);
    margin-bottom: 16px;
  }
  
  .feature-list {
    list-style: none;
    padding: 0;
    margin: 0;
    
    li {
      font-size: 13px;
      color: var(--el-text-color-secondary);
      padding: 4px 0;
      
      &::before {
        content: '✓ ';
        color: var(--el-color-success);
        margin-right: 4px;
      }
    }
  }
}
</style>

