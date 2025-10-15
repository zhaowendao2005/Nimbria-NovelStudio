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
          <div class="cache-stat__value">{{ settingsStore.formattedCacheSize }}</div>
        </div>
        
        <q-separator class="q-my-md" />
        
        <!-- 各模块缓存详情 -->
        <div class="cache-items">
          <div class="cache-item" v-for="item in cacheItems" :key="item.key">
            <q-icon :name="item.icon" size="20px" color="grey-6" />
            <span class="cache-item__name">{{ item.name }}</span>
            <q-space />
            <span class="cache-item__size">{{ item.size }}</span>
          </div>
          
          <!-- 空状态 -->
          <div v-if="cacheItems.length === 0" class="cache-empty">
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
            <li>LLM对话历史与设置</li>
            <li>分屏布局状态</li>
            <li>Markdown编辑器状态</li>
            <li>项目页面状态</li>
            <li>最近项目列表</li>
            <li>其他UI状态</li>
          </ul>
          <div class="text-body2 text-negative q-mt-sm">
            <q-icon name="info" class="q-mr-xs" />
            清空后，这些数据将无法恢复，页面会自动刷新。
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
import { ref, onMounted } from 'vue'
import { Notify } from 'quasar'
import { useSettingsCacheStore } from '@stores/settings'

const settingsStore = useSettingsCacheStore()

const isClearing = ref(false)
const showConfirmDialog = ref(false)
const cacheItems = ref<Array<{
  key: string
  name: string
  icon: string
  size: string
}>>([])

// 加载缓存项
onMounted(() => {
  loadCacheItems()
})

function loadCacheItems() {
  cacheItems.value = settingsStore.getModuleCacheItems()
}

function confirmClearCache() {
  showConfirmDialog.value = true
}

async function clearCache() {
  isClearing.value = true
  
  try {
    // ========== 清理前的日志 ==========
    console.log('='.repeat(60))
    console.log('🗑️  [缓存清理] 开始清理缓存')
    console.log('='.repeat(60))
    
    // 收集清理前的缓存统计
    const beforeClear = {
      totalSize: settingsStore.getCacheSizeInBytes(),
      totalItems: localStorage.length,
      allData: settingsStore.getAllCacheData(),
      modules: settingsStore.getModuleCacheItems()
    }
    
    console.log(`📊 清理前缓存统计:`)
    console.log(`   - 缓存项总数: ${beforeClear.totalItems} 项`)
    console.log(`   - 缓存总大小: ${settingsStore.formattedCacheSize}`)
    console.log(`   - 详细分布:`)
    beforeClear.modules.forEach(module => {
      console.log(`     • ${module.name}: ${module.size}`)
    })
    
    // 打印所有缓存键
    console.log(`\n🔑 缓存键列表:`)
    Object.keys(beforeClear.allData).forEach((key, index) => {
      const valueLength = beforeClear.allData[key]?.length || 0
      console.log(`   ${index + 1}. ${key} (${valueLength} 字符)`)
    })
    
    console.log(`\n⏳ 开始执行清理操作...`)
    
    // 延迟模拟清理过程（让用户看到loading效果）
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // ========== 1. 清空前端 localStorage ==========
    console.log('🗑️  [前端] 开始清空 localStorage...')
    settingsStore.clearAllCache()
    console.log('✅ [前端] localStorage 已清空')
    
    // ========== 2. 清空后端 Electron Store（最近项目等） ==========
    console.log('🗑️  [前端] 调用后端清空缓存接口...')
    if (window.nimbria?.project?.clearCache) {
      try {
        const result = await window.nimbria.project.clearCache()
        if (result.success) {
          console.log('✅ [前端] 后端缓存清空成功')
        } else {
          console.warn('⚠️  [前端] 后端缓存清空失败')
        }
      } catch (error) {
        console.error('❌ [前端] 调用后端清空缓存失败:', error)
      }
    } else {
      console.warn('⚠️  [前端] window.nimbria.project.clearCache 不可用（可能在开发模式）')
    }
    
    // ✅ 所有缓存清空完成
    console.log('🔄 [缓存清理] 准备刷新页面以重置所有状态...')
    
    // 立即更新缓存项列表（UI 刷新，显示空状态）
    loadCacheItems()
    
    // ========== 清理后的验证 ==========
    const afterClear = {
      totalItems: localStorage.length,
      totalSize: settingsStore.getCacheSizeInBytes()
    }
    
    console.log(`\n✅ 清理完成！`)
    console.log(`📊 清理后缓存统计:`)
    console.log(`   - localStorage 项数: ${afterClear.totalItems} 项`)
    console.log(`   - localStorage 大小: ${afterClear.totalSize} 字节`)
    
    if (afterClear.totalItems === 0 && afterClear.totalSize === 0) {
      console.log(`\n🎉 localStorage 清理成功！`)
      console.log(`🎉 所有数据已彻底清除`)
    } else {
      console.warn(`\n⚠️  警告: localStorage 仍有 ${afterClear.totalItems} 项残留`)
    }
    
    console.log(`\n🔄 页面将在 500ms 后自动刷新...`)
    console.log(`🔄 刷新后所有 Pinia Store 会自动重置（包括最近项目列表）`)
    console.log('='.repeat(60))
    
    // 成功提示
    Notify.create({
      type: 'positive',
      message: '缓存已清空',
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
      console.log('🔄 刷新后所有 Pinia Store 会从 localStorage 重新初始化')
      console.log('🔄 由于 localStorage 已清空，所有状态将恢复为初始状态')
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

.cache-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cache-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  transition: background 0.2s;

  &:hover {
    background: var(--el-fill-color);
  }

  &__name {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }

  &__size {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
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

