<template>
  <div class="cache-management">
    <h5 class="settings-title">缓存管理</h5>
    <p class="settings-description">
      管理应用程序的本地缓存数据。清空缓存后，某些设置可能会恢复为默认值。
    </p>

    <!-- 缓存信息卡片 -->
    <q-card flat bordered class="cache-info-card">
      <q-card-section>
        <!-- 总缓存大小 -->
        <div class="cache-stat">
          <div class="cache-stat__label">
            <q-icon name="storage" size="20px" color="primary" class="q-mr-sm" />
            当前缓存大小
          </div>
          <div class="cache-stat__value">{{ totalCacheSize }}</div>
        </div>
        
        <q-separator class="q-my-md" />
        
        <!-- 分类缓存详情 -->
        <div class="cache-categories">
          <div v-for="category in cacheCategories" :key="category.type" class="cache-category">
            <div class="cache-category__header">
              <div class="cache-category__info">
                <q-icon :name="category.icon" size="20px" :color="category.color" />
                <span class="cache-category__name">{{ category.name }}</span>
                <q-chip 
                  :label="`${category.items.length} 项`" 
                  size="sm" 
                  color="grey-4" 
                  text-color="grey-8"
                />
              </div>
              <div class="cache-category__actions">
                <span class="cache-category__size">{{ category.totalSize }}</span>
                <q-btn
                  flat
                  dense
                  round
                  :icon="category.expanded ? 'expand_less' : 'expand_more'"
                  size="sm"
                  color="grey-6"
                  @click="toggleCategory(category.type)"
                />
                <q-btn
                  flat
                  dense
                  round
                  icon="delete"
                  size="sm"
                  color="negative"
                  @click="confirmClearCategory(category)"
                  :disable="category.items.length === 0"
                >
                  <q-tooltip>清空此分类</q-tooltip>
                </q-btn>
              </div>
            </div>
            
            <!-- 分类下的具体项目 -->
            <q-slide-transition>
              <div v-show="category.expanded" class="cache-category__items">
                <div v-for="item in category.items" :key="item.key" class="cache-item">
                  <q-icon name="description" size="16px" color="grey-5" />
                  <span class="cache-item__key">{{ item.key }}</span>
                  <q-space />
                  <span class="cache-item__size">{{ item.size }}</span>
                </div>
              </div>
            </q-slide-transition>
          </div>
          
          <!-- 空状态 -->
          <div v-if="cacheCategories.length === 0" class="cache-empty">
            <q-icon name="inbox" size="48px" color="grey-4" />
            <div class="text-grey-6 q-mt-sm">暂无缓存数据</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- 操作按钮 -->
    <div class="cache-actions">
      <q-btn
        color="negative"
        outline
        icon="delete_sweep"
        label="清空所有缓存"
        :loading="isClearing"
        @click="confirmClearCache"
      />
    </div>

    <!-- 确认对话框 -->
    <q-dialog v-model="showConfirmDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section class="row items-start q-pb-none">
          <q-icon name="warning" color="warning" size="48px" class="q-mr-md" />
          <div class="col">
            <div class="text-h6">确认清空缓存？</div>
            <div class="text-body2 text-grey-7 q-mt-sm">
              此操作将清空所有本地缓存数据，包括：
            </div>
          </div>
        </q-card-section>

        <q-card-section>
          <ul class="cache-warning-list">
            <li><strong>所有 localStorage 数据</strong>（应用设置、用户配置等）</li>
            <li><strong>所有 sessionStorage 数据</strong>（临时会话状态）</li>
            <li><strong>StarChart 图表配置</strong>（渲染器设置、布局配置等）</li>
            <li><strong>LLM 对话历史</strong>（聊天记录、模型配置等）</li>
            <li><strong>项目相关数据</strong>（最近项目、项目状态等）</li>
            <li><strong>编辑器状态</strong>（Markdown 编辑器、分屏布局等）</li>
            <li><strong>其他所有本地缓存</strong>（无需单独注册的模块）</li>
          </ul>
          <div class="text-body2 text-negative q-mt-sm">
            <q-icon name="warning" class="q-mr-xs" />
            <strong>注意：</strong>此操作会清空 <strong>所有</strong> 本地存储数据，无法恢复！页面会自动刷新。
          </div>
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn 
            flat 
            label="取消" 
            color="grey" 
            v-close-popup 
            :disable="isClearing"
          />
          <q-btn 
            unelevated 
            label="确认清空" 
            color="negative" 
            :loading="isClearing"
            @click="clearCache"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Notify } from 'quasar'

interface CacheItem {
  key: string
  name: string
  icon: string
  size: string
  sizeBytes: number
}

interface CacheCategory {
  type: string
  name: string
  icon: string
  color: string
  items: CacheItem[]
  totalSize: string
  totalSizeBytes: number
  expanded: boolean
}

const isClearing = ref(false)
const showConfirmDialog = ref(false)
const cacheItems = ref<CacheItem[]>([])
const expandedCategories = ref<Set<string>>(new Set(['starChart', 'llm', 'project']))

// 计算总缓存大小
const totalCacheSize = computed(() => {
  const totalBytes = getCacheSizeInBytes()
  return formatBytes(totalBytes)
})

// 计算分类缓存
const cacheCategories = computed(() => {
  const categories = new Map<string, CacheCategory>()
  
  // 定义分类配置
  const categoryConfigs = {
    starChart: { name: 'StarChart 图表', icon: 'share', color: 'primary' },
    llm: { name: 'LLM 对话', icon: 'chat', color: 'secondary' },
    project: { name: '项目管理', icon: 'folder', color: 'accent' },
    editor: { name: '编辑器', icon: 'edit', color: 'info' },
    layout: { name: '布局设置', icon: 'view_quilt', color: 'warning' },
    settings: { name: '系统设置', icon: 'settings', color: 'grey-6' },
    other: { name: '其他', icon: 'storage', color: 'grey-5' }
  }
  
  // 初始化所有分类
  Object.entries(categoryConfigs).forEach(([type, config]) => {
    categories.set(type, {
      type,
      name: config.name,
      icon: config.icon,
      color: config.color,
      items: [],
      totalSize: '0 B',
      totalSizeBytes: 0,
      expanded: expandedCategories.value.has(type)
    })
  })
  
  // 将缓存项分配到对应分类
  cacheItems.value.forEach(item => {
    const categoryType = getCategoryType(item.key)
    const category = categories.get(categoryType)
    if (category) {
      category.items.push(item)
      category.totalSizeBytes += item.sizeBytes
      category.totalSize = formatBytes(category.totalSizeBytes)
    }
  })
  
  // 只返回有数据的分类，并按大小排序
  return Array.from(categories.values())
    .filter(category => category.items.length > 0)
    .sort((a, b) => b.totalSizeBytes - a.totalSizeBytes)
})

// 根据键名判断分类类型
function getCategoryType(key: string): string {
  const lowerKey = key.toLowerCase()
  
  if (lowerKey.includes('starchart') || lowerKey.includes('star-chart')) {
    return 'starChart'
  }
  if (lowerKey.includes('llm') || lowerKey.includes('chat') || lowerKey.includes('conversation')) {
    return 'llm'
  }
  if (lowerKey.includes('project') || lowerKey.includes('recent')) {
    return 'project'
  }
  if (lowerKey.includes('editor') || lowerKey.includes('markdown')) {
    return 'editor'
  }
  if (lowerKey.includes('layout') || lowerKey.includes('pane') || lowerKey.includes('split')) {
    return 'layout'
  }
  if (lowerKey.includes('settings') || lowerKey.includes('config')) {
    return 'settings'
  }
  
  return 'other'
}

// 加载缓存项
onMounted(() => {
  loadCacheItems()
})

/**
 * 获取缓存大小（字节）
 */
function getCacheSizeInBytes(): number {
  let totalSize = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const value = localStorage.getItem(key) || ''
      // 计算 key + value 的字节数（UTF-16 编码，每个字符2字节）
      totalSize += (key.length + value.length) * 2
    }
  }
  return totalSize
}

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 根据键名推断模块类型和图标
 */
function inferModuleInfo(key: string): { name: string; icon: string } {
  // StarChart 相关
  if (key.includes('starChart') || key.includes('star-chart')) {
    return { name: 'StarChart 图表', icon: 'share' }
  }
  
  // LLM 相关
  if (key.includes('llm') || key.includes('chat') || key.includes('conversation')) {
    return { name: 'LLM 对话', icon: 'chat' }
  }
  
  // 项目相关
  if (key.includes('project') || key.includes('recent')) {
    return { name: '项目数据', icon: 'folder' }
  }
  
  // 编辑器相关
  if (key.includes('editor') || key.includes('markdown')) {
    return { name: '编辑器', icon: 'edit' }
  }
  
  // 布局相关
  if (key.includes('layout') || key.includes('pane') || key.includes('split')) {
    return { name: '布局状态', icon: 'view_quilt' }
  }
  
  // 设置相关
  if (key.includes('settings') || key.includes('config')) {
    return { name: '应用设置', icon: 'settings' }
  }
  
  // 默认
  return { name: '其他数据', icon: 'storage' }
}

/**
 * 加载所有 localStorage 缓存项
 */
function loadCacheItems() {
  const items: CacheItem[] = []
  
  // 遍历所有 localStorage 项
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const value = localStorage.getItem(key) || ''
      const sizeBytes = (key.length + value.length) * 2
      const moduleInfo = inferModuleInfo(key)
      
      items.push({
        key,
        name: `${moduleInfo.name} (${key})`,
        icon: moduleInfo.icon,
        size: formatBytes(sizeBytes),
        sizeBytes
      })
    }
  }
  
  // 按大小排序（大的在前）
  items.sort((a, b) => b.sizeBytes - a.sizeBytes)
  
  cacheItems.value = items
}

// 切换分类展开状态
function toggleCategory(categoryType: string) {
  if (expandedCategories.value.has(categoryType)) {
    expandedCategories.value.delete(categoryType)
  } else {
    expandedCategories.value.add(categoryType)
  }
}

// 确认清空分类
async function confirmClearCategory(category: CacheCategory) {
  try {
    const result = await new Promise<boolean>((resolve) => {
      Notify.create({
        type: 'warning',
        message: `确定要清空 "${category.name}" 分类的所有缓存吗？`,
        timeout: 0,
        actions: [
          {
            label: '取消',
            color: 'white',
            handler: () => resolve(false)
          },
          {
            label: '确定清空',
            color: 'negative',
            handler: () => resolve(true)
          }
        ]
      })
    })
    
    if (result) {
      clearCategoryCache(category)
    }
  } catch (error) {
    console.error('[缓存管理] 清空分类确认失败:', error)
  }
}

// 清空指定分类的缓存
function clearCategoryCache(category: CacheCategory) {
  try {
    console.log(`🗑️  [缓存清理] 开始清空分类: ${category.name}`)
    console.log(`📊 分类统计: ${category.items.length} 项, ${category.totalSize}`)
    
    let clearedCount = 0
    let clearedSize = 0
    
    // 逐个删除该分类下的所有项目
    for (const item of category.items) {
      try {
        localStorage.removeItem(item.key)
        clearedCount++
        clearedSize += item.sizeBytes
        console.log(`✅ 已删除: ${item.key}`)
      } catch (error) {
        console.error(`❌ 删除失败: ${item.key}`, error)
      }
    }
    
    // 重新加载缓存项
    loadCacheItems()
    
    console.log(`🎉 分类清理完成: ${category.name}`)
    console.log(`📊 清理统计: ${clearedCount}/${category.items.length} 项, ${formatBytes(clearedSize)}`)
    
    Notify.create({
      type: 'positive',
      message: `已清空 "${category.name}" 分类 (${clearedCount} 项, ${formatBytes(clearedSize)})`,
      timeout: 3000
    })
    
  } catch (error) {
    console.error(`[缓存管理] 清空分类失败: ${category.name}`, error)
    Notify.create({
      type: 'negative',
      message: `清空 "${category.name}" 分类失败: ${error instanceof Error ? error.message : '未知错误'}`,
      timeout: 5000
    })
  }
}

function confirmClearCache() {
  showConfirmDialog.value = true
}

async function clearCache() {
  isClearing.value = true
  
  try {
    // ========== 清理前的日志 ==========
    console.log('='.repeat(60))
    console.log('🗑️  [缓存清理] 开始清理所有本地存储')
    console.log('='.repeat(60))
    
    // 收集清理前的缓存统计
    const beforeClear = {
      totalSize: getCacheSizeInBytes(),
      totalItems: localStorage.length,
      allKeys: [] as string[]
    }
    
    // 收集所有键名
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        beforeClear.allKeys.push(key)
      }
    }
    
    console.log(`📊 清理前缓存统计:`)
    console.log(`   - 缓存项总数: ${beforeClear.totalItems} 项`)
    console.log(`   - 缓存总大小: ${formatBytes(beforeClear.totalSize)}`)
    
    // 打印所有缓存键
    console.log(`\n🔑 所有 localStorage 键:`)
    beforeClear.allKeys.forEach((key, index) => {
      const value = localStorage.getItem(key) || ''
      const size = (key.length + value.length) * 2
      console.log(`   ${index + 1}. ${key} (${formatBytes(size)})`)
    })
    
    console.log(`\n⏳ 开始执行清理操作...`)
    
    // 延迟模拟清理过程（让用户看到loading效果）
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // ========== 1. 清空前端 localStorage ==========
    console.log('🗑️  [前端] 开始清空 localStorage...')
    
    // 逐个删除所有项目（更安全的方式）
    const keysToDelete = [...beforeClear.allKeys]
    keysToDelete.forEach(key => {
      try {
        localStorage.removeItem(key)
        console.log(`   ✅ 已删除: ${key}`)
      } catch (error) {
        console.warn(`   ⚠️  删除失败: ${key}`, error)
      }
    })
    
    // 最后执行完全清空（确保没有遗漏）
    try {
      localStorage.clear()
      console.log('✅ [前端] localStorage.clear() 执行完成')
    } catch (error) {
      console.error('❌ [前端] localStorage.clear() 失败:', error)
    }
    
    // ========== 2. 清空后端 Electron Store（最近项目等） ==========
    console.log('🗑️  [后端] 调用后端清空缓存接口...')
    if (window.nimbria?.project?.clearCache) {
      try {
        const result = await window.nimbria.project.clearCache()
        if (result.success) {
          console.log('✅ [后端] 后端缓存清空成功')
        } else {
          console.warn('⚠️  [后端] 后端缓存清空失败:', result)
        }
      } catch (error) {
        console.error('❌ [后端] 调用后端清空缓存失败:', error)
      }
    } else {
      console.warn('⚠️  [后端] window.nimbria.project.clearCache 不可用（可能在开发模式）')
    }
    
    // ========== 3. 清空其他存储（如果需要） ==========
    console.log('🗑️  [其他] 检查其他存储...')
    
    // 清空 sessionStorage
    try {
      const sessionCount = sessionStorage.length
      if (sessionCount > 0) {
        sessionStorage.clear()
        console.log(`✅ [其他] sessionStorage 已清空 (${sessionCount} 项)`)
      } else {
        console.log('ℹ️  [其他] sessionStorage 为空，无需清理')
      }
    } catch (error) {
      console.warn('⚠️  [其他] sessionStorage 清理失败:', error)
    }
    
    // 清空 IndexedDB（如果有的话）
    try {
      if ('indexedDB' in window) {
        // 这里可以添加 IndexedDB 清理逻辑
        console.log('ℹ️  [其他] IndexedDB 清理功能待实现')
      }
    } catch (error) {
      console.warn('⚠️  [其他] IndexedDB 检查失败:', error)
    }
    
    // ✅ 所有缓存清空完成
    console.log('🔄 [缓存清理] 准备刷新页面以重置所有状态...')
    
    // 立即更新缓存项列表（UI 刷新，显示空状态）
    loadCacheItems()
    
    // ========== 清理后的验证 ==========
    const afterClear = {
      totalItems: localStorage.length,
      totalSize: getCacheSizeInBytes()
    }
    
    console.log(`\n✅ 清理完成！`)
    console.log(`📊 清理后缓存统计:`)
    console.log(`   - localStorage 项数: ${afterClear.totalItems} 项`)
    console.log(`   - localStorage 大小: ${formatBytes(afterClear.totalSize)}`)
    
    if (afterClear.totalItems === 0 && afterClear.totalSize === 0) {
      console.log(`\n🎉 localStorage 清理成功！`)
      console.log(`🎉 所有数据已彻底清除`)
    } else {
      console.warn(`\n⚠️  警告: localStorage 仍有 ${afterClear.totalItems} 项残留`)
      // 打印残留项
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          console.warn(`   残留项: ${key}`)
        }
      }
    }
    
    console.log(`\n🔄 页面将在 500ms 后自动刷新...`)
    console.log(`🔄 刷新后所有状态将恢复为初始状态`)
    console.log('='.repeat(60))
    
    // 成功提示
    Notify.create({
      type: 'positive',
      message: '所有缓存已清空',
      caption: '页面即将刷新以重置所有状态',
      timeout: 500,
      position: 'top',
      icon: 'check_circle'
    })
    
    // 关闭对话框
    showConfirmDialog.value = false
    
    // 500ms 后刷新页面（确保所有状态都彻底重置）
    setTimeout(() => {
      console.log('🔄 正在刷新页面...')
      console.log('🔄 刷新后所有状态将从初始状态开始')
      window.location.reload()
    }, 500)
    
  } catch (error) {
    console.log('='.repeat(60))
    console.error('❌ [缓存清理] 清理失败:', error)
    console.error('错误详情:', error)
    console.log('='.repeat(60))
    
    Notify.create({
      type: 'negative',
      message: '清空缓存失败',
      caption: '请稍后重试',
      timeout: 2000,
      position: 'top'
    })
    isClearing.value = false
  }
}
</script>

<style scoped lang="scss">
.cache-management {
  .settings-title {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--q-dark);
  }

  .settings-description {
    margin: 0 0 24px 0;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    line-height: 1.6;
  }
}

.cache-info-card {
  margin-bottom: 24px;
}

.cache-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;

  &__label {
    display: flex;
    align-items: center;
    font-size: 15px;
    font-weight: 500;
    color: var(--q-dark);
  }

  &__value {
    font-size: 24px;
    font-weight: 600;
    color: var(--q-primary);
  }
}

.cache-categories {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.cache-category {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  overflow: hidden;
  
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--el-fill-color-extra-light);
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
  
  &__info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }
  
  &__name {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
  
  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  &__size {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-family: 'Courier New', monospace;
    min-width: 60px;
    text-align: right;
  }
  
  &__items {
    padding: 8px 16px 16px;
    background: var(--el-fill-color-blank);
  }
}

.cache-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  gap: 8px;
  margin-bottom: 4px;
  transition: background 0.2s;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &:hover {
    background: var(--el-fill-color);
  }
  
  &__key {
    font-size: 12px;
    color: var(--el-text-color-regular);
    font-family: 'Courier New', monospace;
    opacity: 0.8;
  }
  
  &__size {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    font-family: 'Courier New', monospace;
    min-width: 50px;
    text-align: right;
  }
}

.cache-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.cache-actions {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
}

.cache-warning-list {
  margin: 8px 0 0 0;
  padding-left: 20px;
  
  li {
    color: var(--el-text-color-regular);
    line-height: 1.8;
  }
}
</style>

