/**
 * TestPage 组合式函数
 * 提供页面相关的逻辑和状态管理
 */

import { ref, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'

// 页面状态类型定义
export interface TestPageState {
  loading: boolean
  error: string | null
  data: any[]
}

// 表单数据类型定义
export interface TestFormData {
  name: string
  email: string
  message: string
  category: string
}

/**
 * 测试页面主状态管理
 */
export function useTestPageState() {
  const state = reactive<TestPageState>({
    loading: false,
    error: null,
    data: []
  })
  
  const setLoading = (loading: boolean) => {
    state.loading = loading
  }
  
  const setError = (error: string | null) => {
    state.error = error
  }
  
  const setData = (data: any[]) => {
    state.data = data
  }
  
  return {
    state,
    setLoading,
    setError,
    setData
  }
}

/**
 * 表单处理组合式函数
 */
export function useTestForm() {
  const formData = reactive<TestFormData>({
    name: '',
    email: '',
    message: '',
    category: 'general'
  })
  
  const isFormValid = computed(() => {
    return formData.name.trim() !== '' && 
           formData.email.trim() !== '' && 
           formData.message.trim() !== ''
  })
  
  const resetForm = () => {
    formData.name = ''
    formData.email = ''
    formData.message = ''
    formData.category = 'general'
  }
  
  const submitForm = async () => {
    if (!isFormValid.value) {
      ElMessage.error('请填写所有必填字段')
      return false
    }
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      ElMessage.success('表单提交成功')
      resetForm()
      return true
    } catch (error) {
      ElMessage.error('提交失败，请重试')
      return false
    }
  }
  
  return {
    formData,
    isFormValid,
    resetForm,
    submitForm
  }
}

/**
 * 主题切换组合式函数
 */
export function useThemeToggle() {
  const currentTheme = ref<'light' | 'dark'>('dark')
  
  const toggleTheme = () => {
    currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
    ElMessage.info(`已切换到${currentTheme.value === 'light' ? '浅色' : '深色'}主题`)
  }
  
  const themeClass = computed(() => `theme-${currentTheme.value}`)
  
  return {
    currentTheme,
    toggleTheme,
    themeClass
  }
}

/**
 * 动画控制组合式函数
 */
export function useAnimations() {
  const activeAnimations = ref<Set<string>>(new Set())
  
  const triggerAnimation = (animationName: string, duration: number = 1000) => {
    activeAnimations.value.add(animationName)
    
    setTimeout(() => {
      activeAnimations.value.delete(animationName)
    }, duration)
  }
  
  const isAnimating = (animationName: string) => {
    return activeAnimations.value.has(animationName)
  }
  
  return {
    triggerAnimation,
    isAnimating
  }
}

/**
 * 性能监控组合式函数
 */
export function usePerformanceMonitor() {
  const metrics = reactive({
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 0
  })
  
  const startPerformanceMonitoring = () => {
    const start = performance.now()
    
    // 模拟性能监控
    setTimeout(() => {
      metrics.renderTime = performance.now() - start
      metrics.memoryUsage = (performance as any).memory?.usedJSHeapSize || 0
      metrics.componentCount = document.querySelectorAll('[data-v-]').length
    }, 100)
  }
  
  return {
    metrics,
    startPerformanceMonitoring
  }
}
