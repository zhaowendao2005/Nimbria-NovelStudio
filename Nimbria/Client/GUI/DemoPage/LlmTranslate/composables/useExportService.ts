/**
 * 导出服务组合式函数
 */

import { ref, h } from 'vue'
import { useLlmTranslateStore } from '../stores'
import { ElMessage } from 'element-plus'
import type { ExportOptions } from './types'
import type { Task } from '../types/task'

export function useExportService() {
  const store = useLlmTranslateStore()
  const isExporting = ref(false)

  /**
   * 导出任务结果
   */
  const exportTasks = async (taskIds: string[], options: ExportOptions) => {
    isExporting.value = true
    try {
      const tasks = store.taskList.filter((t: Task) => taskIds.includes(t.id))
      
      let exportContent = ''
      
      switch (options.format) {
        case 'txt':
          exportContent = generateTxtExport(tasks)
          break
        case 'csv':
          exportContent = generateCsvExport(tasks)
          break
        case 'json':
          exportContent = JSON.stringify(tasks, null, 2)
          break
        default:
          throw new Error('不支持的导出格式')
      }

      // TODO: 调用 Electron API 保存文件
      console.log('Export content:', exportContent)
      // @ts-ignore - Element Plus message type compatibility
      ElMessage({
        message: h('p', `已导出 ${tasks.length} 个任务`),
        type: 'success'
      })
      
      return exportContent
    } catch (_error) {
      // @ts-ignore - Element Plus message type compatibility
      ElMessage({
        message: h('p', '导出失败'),
        type: 'error'
      })
      throw _error
    } finally {
      isExporting.value = false
    }
  }

  /**
   * 生成 TXT 格式导出
   */
  const generateTxtExport = (tasks: Task[]): string => {
    return tasks.map((task: Task) => {
      return `任务ID: ${task.id}\n原文: ${task.content}\n翻译: ${task.translation || '未完成'}\n---\n`
    }).join('\n')
  }

  /**
   * 生成 CSV 格式导出
   */
  const generateCsvExport = (tasks: Task[]): string => {
    const header = 'ID,原文,翻译,状态,耗时\n'
    const rows = tasks.map((task: Task) => {
      return `"${task.id}","${task.content}","${task.translation || ''}","${task.status}","0"`
    }).join('\n')
    return header + rows
  }

  /**
   * 预览导出内容
   */
  const previewExport = (taskIds: string[], _format: string) => {
    const tasks = store.taskList.filter((t: Task) => taskIds.includes(t.id))
    // TODO: 显示预览对话框
    console.log('Preview tasks:', tasks)
  }

  return {
    isExporting,
    exportTasks,
    previewExport
  }
}

