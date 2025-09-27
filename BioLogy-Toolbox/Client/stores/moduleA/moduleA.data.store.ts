import { defineStore } from 'pinia'
import { ref } from 'vue'

// 模块A数据状态管理
export const useModuleADataStore = defineStore('moduleA-data', () => {
  // TODO: 实现具体状态管理逻辑
  const data = ref<unknown[]>([])
  const loading = ref(false)

  return {
    data,
    loading
  }
})