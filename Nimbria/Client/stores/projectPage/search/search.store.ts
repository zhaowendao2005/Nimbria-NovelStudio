/**
 * Search Panel Store
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSearchStore = defineStore('projectPage-search', () => {
  const initialized = ref(false)
  
  const reset = () => {
    initialized.value = false
  }
  
  return {
    initialized,
    reset
  }
})

