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
            <el-radio value="excel">Excel 表格</el-radio>
          </el-radio-group>
          <div class="format-desc">
            <span v-if="exportFormat === 'plain'">只包含翻译结果，按任务顺序拼接</span>
            <span v-else-if="exportFormat === 'parallel'">包含原文和译文的对照格式</span>
            <span v-else>每个任务一行，用分隔符分列</span>
          </div>
        </el-form-item>

        <!-- Excel 专属配置 -->
        <template v-if="exportFormat === 'excel'">
          <el-form-item label="分隔符" class="excel-config">
            <el-input 
              v-model="excelDelimiter" 
              placeholder="|"
              style="width: 100px"
              :disabled="selectedCompletedTasks.length === 0"
            />
            <div class="format-desc" style="margin-top: 8px">
              用于识别译文中的列结构，如 | 或 Tab
            </div>
          </el-form-item>

          <el-form-item label="包含原文">
            <el-checkbox 
              v-model="includeOriginal"
              :disabled="selectedCompletedTasks.length === 0"
            >
              在第一列添加原文内容
            </el-checkbox>
          </el-form-item>

          <el-alert 
            type="info" 
            :closable="false"
            style="margin-bottom: 16px"
          >
            <template #title>
              <span style="font-size: 12px">
                导出逻辑：译文将按分隔符 "{{ excelDelimiter }}" 分为多列{{ includeOriginal ? '，原文作为第一列' : '' }}
              </span>
            </template>
          </el-alert>
        </template>

        <el-form-item label="文件名">
          <el-input 
            v-model="fileName" 
            placeholder="export_result"
            :disabled="selectedCompletedTasks.length === 0"
          >
            <template #append>{{ fileExtension }}</template>
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
const exportFormat = ref<'plain' | 'parallel' | 'excel'>('plain')
const fileName = ref('export_result')
const isExporting = ref(false)
const excelDelimiter = ref('|')
const includeOriginal = ref(false) // 是否包含原文列

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
  if (exportFormat.value === 'excel') {
    // Excel 预览显示前几行的示例
    return generateExcelPreview()
  }
  const content = generateExportContent()
  return content.substring(0, 200)
})

/** 文件扩展名 */
const fileExtension = computed<string>(() => {
  return exportFormat.value === 'excel' ? '.xlsx' : '.txt'
})

// ==================== 方法 ====================

/** 生成 Excel 预览文本 */
const generateExcelPreview = (): string => {
  const delimiter = excelDelimiter.value || '|'
  
  // 拼接所有译文并按逻辑行分割
  const allTranslation = selectedCompletedTasks.value
    .map((task: Task) => task.translation || '')
    .join('\n')
  const lines = allTranslation.split('\n').filter(line => line.trim())
  
  // 预览前3行
  const preview = lines
    .slice(0, 3)
    .map((line: string, index: number) => {
      const cols = line.split(delimiter)
      const colCount = cols.length + (includeOriginal.value ? 1 : 0)
      const displayCols = cols.slice(0, 3).map(c => c.length > 20 ? c.substring(0, 20) + '...' : c)
      
      if (includeOriginal.value) {
        return `逻辑行${index + 1} (${colCount}列): [原文] | ${displayCols.join(' | ')}${cols.length > 3 ? ' | ...' : ''}`
      } else {
        return `逻辑行${index + 1} (${colCount}列): ${displayCols.join(' | ')}${cols.length > 3 ? ' | ...' : ''}`
      }
    })
    .join('\n')
  
  const remaining = lines.length - 3
  return preview + (remaining > 0 ? `\n... 还有 ${remaining} 个逻辑行` : '') + `\n\n总计: ${lines.length} 行`
}

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
    ElMessage({ message: '没有可导出的任务', type: 'warning' } as any)
    return
  }

  isExporting.value = true
  try {
    const finalFileName = fileName.value || 'export_result'
    const ext = exportFormat.value === 'excel' ? '.xlsx' : '.txt'
    
    if (exportFormat.value === 'excel') {
      // Excel 导出
      await handleExcelExport(finalFileName)
    } else {
      // 文本导出
      await handleTextExport(finalFileName)
    }
  } catch (error) {
    console.error('❌ 导出失败:', error)
    ElMessage({ message: '导出异常: ' + (error instanceof Error ? error.message : '未知错误'), type: 'error' } as any)
  } finally {
    isExporting.value = false
  }
}

/** 处理文本导出 */
const handleTextExport = async (finalFileName: string): Promise<void> => {
  const content = generateExportContent()
  
  // 1. 选择保存路径
  const pathResult = await window.nimbria.llmTranslate.selectTextSavePath({
    defaultPath: `${finalFileName}.txt`
  })

  if (!pathResult.success || pathResult.data?.canceled || !pathResult.data?.filePath) {
    ElMessage({ message: '已取消导出', type: 'info' } as any)
    return
  }

  // 2. 保存文件
  const saveResult = await window.nimbria.llmTranslate.saveTextFile({
    filePath: pathResult.data.filePath,
    content: content
  })

  if (saveResult.success) {
    ElMessage({ message: `已导出 ${selectedCompletedTasks.value.length} 个任务到文件`, type: 'success' } as any)
    console.log('✅ 导出成功:', pathResult.data.filePath)
    handleClose()
  } else {
    ElMessage({ message: '导出失败: ' + (saveResult.error || '未知错误'), type: 'error' } as any)
  }
}

/** 处理 Excel 导出 */
const handleExcelExport = async (finalFileName: string): Promise<void> => {
  const delimiter = excelDelimiter.value || '|'
  
  // 1. 拼接所有任务的译文
  const allTranslation = selectedCompletedTasks.value
    .map((task: Task) => task.translation || '')
    .join('\n')
  
  // 2. 按换行符分割成逻辑行
  const translationLines = allTranslation.split('\n').filter(line => line.trim())
  
  // 3. 每个逻辑行按分隔符分列
  const rows = translationLines.map((line: string) => {
    return line.split(delimiter)
  })
  
  // 4. 如果需要包含原文，拼接并按逻辑行分割
  if (includeOriginal.value) {
    const allOriginal = selectedCompletedTasks.value
      .map((task: Task) => task.content || '')
      .join('\n')
    const originalLines = allOriginal.split('\n').filter(line => line.trim())
    
    // 原文行数和译文行数匹配时，添加原文列
    if (originalLines.length === translationLines.length) {
      rows.forEach((row, index) => {
        row.unshift(originalLines[index] || '')
      })
    } else {
      console.warn(`原文行数(${originalLines.length})和译文行数(${translationLines.length})不匹配，跳过原文列`)
    }
  }

  // 调用后端生成并保存 Excel
  const result = await window.nimbria.llmTranslate.saveExcelFile({
    defaultPath: `${finalFileName}.xlsx`,
    rows: rows
  })

  if (result.success) {
    if (!result.data?.canceled) {
      ElMessage({ message: `已导出 ${rows.length} 行数据到 Excel`, type: 'success' } as any)
      console.log('✅ Excel 导出成功:', result.data?.filePath, `共 ${rows.length} 行`)
      handleClose()
    } else {
      ElMessage({ message: '已取消导出', type: 'info' } as any)
    }
  } else {
    ElMessage({ message: '导出失败: ' + (result.error || '未知错误'), type: 'error' } as any)
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

