<template>
  <div class="llm-translate-page">
    <!-- 顶部导航 Tab -->
    <div class="page-navigation">
      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="首页 - 配置" name="home">
          <div class="tab-content">
            <HomePage />
          </div>
        </el-tab-pane>

        <el-tab-pane label="任务管理" name="tasks">
          <div class="tab-content">
            <TaskManagePage />
          </div>
        </el-tab-pane>

        <el-tab-pane label="结果导出" name="export">
          <div class="tab-content">
            <ExportPage />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLlmTranslateStore } from './stores/LlmTranslate.store'
import HomePage from './components/HomePage.vue'
import TaskManagePage from './components/TaskManagePage.vue'
import ExportPage from './components/ExportPage.vue'

const props = defineProps<{
  instanceId?: string
  tabId?: string
}>()

const activeTab = ref('home')
const store = useLlmTranslateStore()

onMounted(async () => {
  console.log('[LlmTranslatePage] Mounted with props:', props)
  await store.initialize()
})
</script>

<style scoped lang="scss">
.llm-translate-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--obsidian-bg-primary);
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
  text-align: center;

  .page-title {
    margin: 0 0 8px 0;
    color: var(--obsidian-text-primary);
    font-size: 1.8rem;
    font-weight: 600;
  }

  .page-subtitle {
    margin: 0;
    color: var(--obsidian-text-secondary);
    font-size: 1rem;
  }
}

.page-navigation {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.el-tabs) {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;

    .el-tabs__content {
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }

    .el-tab-pane {
      height: 100%;
      overflow: hidden;
    }
  }
}

.tab-content {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}
</style>

