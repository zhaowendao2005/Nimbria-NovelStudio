<template>
  <div class="search-container-wrapper">
    <div class="search-container">
      <!-- 搜索引擎选择 -->
      <el-dropdown @command="handleEngineSelect" trigger="click">
        <button class="engine-btn">
          <span class="engine-icon">{{ currentEngine }}</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="google">Google</el-dropdown-item>
            <el-dropdown-item command="bing">Bing</el-dropdown-item>
            <el-dropdown-item command="baidu">Baidu</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      
      <!-- 搜索框 -->
      <el-input
        v-model="searchQuery"
        placeholder="搜索..."
        clearable
        @keyup.enter="handleSearch"
        class="search-input"
      >
        <template #suffix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'

/**
 * SearchBox 组件
 * 负责搜索引擎选择和搜索输入框
 */

interface Props {
  modelValue: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'search', query: string, engine: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const searchQuery = ref<string>(props.modelValue)
const currentEngine = ref<string>('G')

/**
 * 处理搜索引擎选择
 */
const handleEngineSelect = (command: string): void => {
  const engineMap: Record<string, string> = {
    google: 'G',
    bing: 'B',
    baidu: '百'
  }
  currentEngine.value = engineMap[command] ?? 'G'
  localStorage.setItem('search_engine', command)
}

/**
 * 处理搜索
 */
const handleSearch = (): void => {
  if (!searchQuery.value.trim()) return
  
  const engine = localStorage.getItem('search_engine') || 'google'
  emit('update:modelValue', searchQuery.value)
  emit('search', searchQuery.value, engine)
}

/**
 * 恢复搜索引擎选择
 */
onMounted(() => {
  const saved = localStorage.getItem('search_engine')
  if (saved) {
    handleEngineSelect(saved)
  }
})
</script>

<style scoped lang="scss">
// 搜索栏容器（垂直居中）
.search-container-wrapper {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.search-container {
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 600px;
}

.engine-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  
  &:hover {
    background: var(--el-fill-color);
    border-color: var(--el-color-primary);
  }
  
  .engine-icon {
    font-size: 16px;
    font-weight: bold;
  }
}

.search-input {
  flex: 1;
  
  :deep(.el-input__wrapper) {
    border-radius: 20px;
    padding: 0 16px;
    height: 40px;
  }
}
</style>

