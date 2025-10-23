<template>
  <el-dialog
    v-model="dialogVisible"
    title="导出翻译结果"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="export-dialog">
      <!-- 统计信息 -->
      <el-alert 
        :title="alertTitle"
        :type="selectedCompletedTasks.length === 0 ? 'warning' : 'info'"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      >
        <template v-if="selectedCompletedTasks.length === 0">
          <p>请先在任务列表中选择已完成的任务。</p>
        </template>
        <template v-else>
          <p>已选择 {{ selectedCompletedTasks.length }} 个已完成任务</p>
          <p>总计约 {{ totalCharacters.toLocaleString() }} 字符</p>
        </template>
      </el-alert>

      <!-- 导出配置 -->
      <el-form label-width="100px">
        <el-form-item label="导出格式">
          <el-radio-group 
            v-model="exportFormat" 
            :disabled="selectedCompletedTasks.length === 0"
          >
            <el-radio value="plain">纯译文</el-radio>
            <el-radio value="parallel">对照文本</el-radio>
          </el-radio-group>
          <div class="format-desc">
            <span v-if="exportFormat === 'plain'">只包含翻译结果，按任务顺序拼接</span>
            <span v-else>包含原文和译文的对照格式</span>
          </div>
        </el-form-item>

        <el-form-item label="文件名">
          <el-input 
            v-model="fileName" 
            placeholder="export_result"
            :disabled="selectedCompletedTasks.length === 0"
          >
            <template #append>.txt</template>
          </el-input>
        </el-form-item>
      </el-form>

      <!-- 预览区 -->
      <el-collapse 
        v-if="selectedCompletedTasks.length > 0" 
        style="margin-top: 16px"
      >
        <el-collapse-item title="预览导出内容（前200字符）" name="preview">
          <div class="preview-content">
            {{ previewText }}
            <span v-if="previewText.length >= 200">...</span>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button 
        type="primary" 
        @click="handleExport"
        :loading="isExporting"
        :disabled="selectedCompletedTasks.length === 0"
      >
        <el-icon><Download /></el-icon>
        导出文件
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLlmTranslateStore } from '../stores'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import type { Task } from '../types/task'

// ==================== Props & Emits ====================
const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

// ==================== State ====================
const store = useLlmTranslateStore()
const dialogVisible = ref(false)
const exportFormat = ref<'plain' | 'parallel'>('plain')
const fileName = ref('export_result')
const isExporting = ref(false)

// ==================== 计算属性 ====================

/** 选中的已完成任务（按ID排序） */
const selectedCompletedTasks = computed<Task[]>(() => {
  const selectedIds = Array.from(store.selectedTaskIds)
  return store.taskList
    .filter((task: Task) => 
      selectedIds.includes(task.id) && 
      task.status === 'completed' &&
      task.translation
    )
    .sort((a: Task, b: Task) => a.id.localeCompare(b.id)) // 按 ID 排序
})

/** Alert 标题 */
const alertTitle = computed<string>(() => {
  if (selectedCompletedTasks.value.length === 0) {
    return '没有可导出的任务'
  }
  return `准备导出 ${selectedCompletedTasks.value.length} 个任务`
})

/** 总字符数 */
const totalCharacters = computed<number>(() => {
  return selectedCompletedTasks.value.reduce((sum: number, task: Task) => {
    return sum + (task.translation?.length || 0)
  }, 0)
})

/** 预览文本 */
const previewText = computed<string>(() => {
  const content = generateExportContent()
  return content.substring(0, 200)
})

// ==================== 方法 ====================

/** 生成导出内容 */
const generateExportContent = (): string => {
  if (exportFormat.value === 'plain') {
    // 纯译文：只拼接翻译结果，用双换行分隔
    return selectedCompletedTasks.value
      .map((task: Task) => task.translation)
      .join('\n\n')
  } else {
    // 对照文本
    return selectedCompletedTasks.value
      .map((task: Task) => {
        const divider = '='.repeat(60)
        return `【任务 ${task.id}】\n\n【原文】\n${task.content}\n\n【译文】\n${task.translation}\n\n${divider}`
      })
      .join('\n\n')
  }
}

/** 执行导出 */
const handleExport = async (): Promise<void> => {
  if (selectedCompletedTasks.value.length === 0) {
    ElMessage.warning('没有可导出的任务')
    return
  }

  isExporting.value = true
  try {
    const content = generateExportContent()
    const finalFileName = fileName.value || 'export_result'
    
    // 1. 选择保存路径
    const pathResult = await window.nimbria.llmTranslate.selectTextSavePath({
      defaultPath: `${finalFileName}.txt`
    })

    if (!pathResult.success || pathResult.data.canceled || !pathResult.data.filePath) {
      ElMessage.info('已取消导出')
      return
    }

    // 2. 保存文件
    const saveResult = await window.nimbria.llmTranslate.saveTextFile({
      filePath: pathResult.data.filePath,
      content: content
    })

    if (saveResult.success) {
      ElMessage.success(`已导出 ${selectedCompletedTasks.value.length} 个任务到文件`)
      console.log('✅ 导出成功:', pathResult.data.filePath)
      handleClose()
    } else {
      ElMessage.error('导出失败: ' + (saveResult.error || '未知错误'))
    }
  } catch (error) {
    console.error('❌ 导出失败:', error)
    ElMessage.error('导出异常: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isExporting.value = false
  }
}

/** 关闭对话框 */
const handleClose = (): void => {
  emit('update:visible', false)
}

// ==================== 监听 ====================
watch(() => props.visible, (val: boolean) => {
  dialogVisible.value = val
  if (val) {
    // 打开时重置文件名
    const batchId = store.currentBatch?.id?.replace('#', '') || 'export'
    const date = new Date().toISOString().slice(0, 10)
    fileName.value = `${batchId}_${date}`
  }
})

watch(dialogVisible, (val: boolean) => {
  if (!val) {
    emit('update:visible', false)
  }
})
</script>

<style scoped lang="scss">
.export-dialog {
  .format-desc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 4px;
  }

  .preview-content {
    padding: 12px;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    color: var(--el-text-color-regular);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
    line-height: 1.5;
  }
}
</style>

