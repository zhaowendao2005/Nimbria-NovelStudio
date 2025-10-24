<template>
  <div v-if="visible" class="history-panel-overlay" @click.self="handleClose">
    <div class="history-panel" @click.stop>
      <!-- 头部 -->
      <div class="panel-header">
        <div class="header-left">
          <el-icon class="header-icon"><Clock /></el-icon>
          <span class="header-title">历史记录</span>
        </div>
        <div class="header-actions">
          <el-button
            :icon="Delete"
            size="small"
            text
            @click="handleClearAll"
          >
            清空全部
          </el-button>
          <el-button
            :icon="Close"
            size="small"
            text
            @click="handleClose"
          />
        </div>
      </div>
      
      <!-- 搜索框 -->
      <div class="search-box">
        <el-input
          v-model="searchQuery"
          placeholder="搜索历史记录..."
          :prefix-icon="Search"
          clearable
          size="small"
        />
      </div>
      
      <!-- 历史列表 -->
      <el-scrollbar class="history-scrollbar">
        <div v-if="groupedHistory.length === 0" class="empty-state">
          <el-empty description="暂无历史记录" :image-size="80" />
        </div>
        <div v-else class="history-groups">
          <!-- 按日期分组 -->
          <div
            v-for="group in groupedHistory"
            :key="group.date"
            class="history-group"
          >
            <!-- 日期标题 -->
            <div class="group-header">
              {{ group.label }}
            </div>
            
            <!-- 历史项 -->
            <div
              v-for="item in group.items"
              :key="item.timestamp"
              class="history-item"
              @click="handleItemClick(item)"
            >
              <div class="item-favicon">
                <el-icon v-if="!item.favicon"><Link /></el-icon>
                <img v-else :src="item.favicon" alt="">
              </div>
              <div class="item-content">
                <div class="item-title">{{ item.title }}</div>
                <div class="item-url">{{ item.url }}</div>
              </div>
              <div class="item-time">
                {{ formatTime(item.timestamp) }}
              </div>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Clock, Delete, Close, Search, Link } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useSearchAndScraperStore } from '@stores/projectPage/searchAndScraper'
import type { BrowseHistoryItem } from '@stores/projectPage/searchAndScraper/searchAndScraper.types'

/**
 * HistoryPanel 组件
 * 仿Edge风格的历史记录面板
 */

interface Props {
  visible: boolean
  tabId: string
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'navigate', url: string): void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const store = useSearchAndScraperStore()
const searchQuery = ref('')

// 🌐 获取全局历史记录
const historyItems = computed(() => store.browseHistory)

// 过滤后的历史记录
const filteredHistory = computed(() => {
  if (!searchQuery.value) {
    return historyItems.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return historyItems.value.filter(item =>
    item.title.toLowerCase().includes(query) ||
    item.url.toLowerCase().includes(query)
  )
})

// 按日期分组
interface HistoryGroup {
  date: string
  label: string
  items: BrowseHistoryItem[]
}

const groupedHistory = computed((): HistoryGroup[] => {
  const groups: Map<string, BrowseHistoryItem[]> = new Map()
  const now = Date.now()
  const oneDayMs = 24 * 60 * 60 * 1000
  
  filteredHistory.value.forEach(item => {
    const itemDate = new Date(item.timestamp)
    const diff = now - item.timestamp
    
    let dateKey: string
    
    if (diff < oneDayMs && itemDate.getDate() === new Date().getDate()) {
      // 今天
      dateKey = 'today'
    } else if (diff < 2 * oneDayMs) {
      // 昨天
      dateKey = 'yesterday'
    } else {
      // 其他日期
      dateKey = itemDate.toDateString()
    }
    
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(item)
  })
  
  // 转换为数组并排序
  const result: HistoryGroup[] = []
  const order = ['today', 'yesterday']
  
  // 先添加今天和昨天
  order.forEach(key => {
    const items = groups.get(key)
    if (items) {
      result.push({
        date: key,
        label: key === 'today' 
          ? `今天 - ${new Date().getFullYear()}年${new Date().getMonth() + 1}月${new Date().getDate()}日`
          : `昨天 - ${new Date(Date.now() - oneDayMs).getFullYear()}年${new Date(Date.now() - oneDayMs).getMonth() + 1}月${new Date(Date.now() - oneDayMs).getDate()}日`,
        items: items.sort((a, b) => b.timestamp - a.timestamp)
      })
      groups.delete(key)
    }
  })
  
  // 添加其他日期（按时间倒序）
  Array.from(groups.entries())
    .filter(([, items]) => items.length > 0)
    .sort((a, b) => {
      const dateA = new Date(a[1][0]!.timestamp)
      const dateB = new Date(b[1][0]!.timestamp)
      return dateB.getTime() - dateA.getTime()
    })
    .forEach(([date, items]) => {
      const itemDate = new Date(items[0]!.timestamp)
      result.push({
        date,
        label: `${itemDate.getFullYear()}年${itemDate.getMonth() + 1}月${itemDate.getDate()}日`,
        items: items.sort((a, b) => b.timestamp - a.timestamp)
      })
    })
  
  return result
})

/**
 * 格式化时间
 */
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * 关闭面板
 */
const handleClose = (): void => {
  emit('update:visible', false)
}

/**
 * 清空所有历史
 */
const handleClearAll = async (): Promise<void> => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有历史记录吗？',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    store.clearHistory()
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.success({ message: '历史记录已清空' })
  } catch {
    // 用户取消
  }
}

/**
 * 点击历史项
 * 🔥 通过 emit 通知父组件导航，父组件会确保 browser view 已挂载
 */
const handleItemClick = (item: BrowseHistoryItem): void => {
  emit('navigate', item.url)
  handleClose()
}
</script>

<style scoped lang="scss">
.history-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  z-index: 2000;
  padding: 50px 20px 20px 20px; // 给toolbar留出空间
}

.history-panel {
  width: 400px;
  max-height: calc(100vh - 70px);
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// ==================== 头部 ====================
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
  color: var(--el-text-color-primary);
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

// ==================== 搜索框 ====================
.search-box {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

// ==================== 历史列表 ====================
.history-scrollbar {
  flex: 1;
  overflow: hidden;
}

.empty-state {
  padding: 40px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-groups {
  padding: 8px 0;
}

.history-group {
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.group-header {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  position: sticky;
  top: 0;
  z-index: 1;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: var(--el-fill-color-light);
  }
  
  &:active {
    background: var(--el-fill-color);
  }
}

.item-favicon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 4px;
  }
  
  .el-icon {
    font-size: 18px;
    color: var(--el-text-color-secondary);
  }
}

.item-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.item-title {
  font-size: 14px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.item-url {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.item-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}
</style>

