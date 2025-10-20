<template>
  <div class="export-page">
    <h2>结果导出页</h2>
    <p>导出配置与统计分析 - 开发中</p>

    <el-card class="export-config">
      <template #header>
        <span>导出配置</span>
      </template>

      <el-form label-width="120px">
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportFormat">
            <el-radio label="txt">TXT (并排)</el-radio>
            <el-radio label="csv">CSV (表格)</el-radio>
            <el-radio label="json">JSON</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="导出目录">
          <el-input v-model="store.config.outputDir" placeholder="选择输出目录">
            <template #append>
              <el-button>浏览</el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>

      <div class="export-actions">
        <el-button type="primary" @click="handleExport">
          导出结果
        </el-button>
        <el-button>预览</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLlmTranslateStore } from '../stores'
import { useExportService } from '../composables/useExportService'

const store = useLlmTranslateStore()
const { exportTasks } = useExportService()
const exportFormat = ref('txt')

const handleExport = async () => {
  const completedTaskIds = store.taskList
    .filter(t => t.status === 'completed')
    .map(t => t.id)
  
  await exportTasks(completedTaskIds, {
    format: exportFormat.value as any
  })
}
</script>

<style scoped lang="scss">
.export-page {
  h2 {
    color: var(--obsidian-text-primary);
    margin-bottom: 16px;
  }

  .export-config {
    margin-top: 16px;
  }

  .export-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 24px;
  }
}
</style>

