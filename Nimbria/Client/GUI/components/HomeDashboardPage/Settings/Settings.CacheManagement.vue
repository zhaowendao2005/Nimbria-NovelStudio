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
        :disable="cacheItems.length === 0"
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
import { ref, computed, onMounted } from 'vue'
import { Notify } from 'quasar'
import { useSettingsStore } from '@stores/settings/settings.store'

const settingsStore = useSettingsStore()

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
    // 延迟模拟清理过程（让用户看到loading效果）
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 清空 localStorage
    settingsStore.clearAllCache()
    
    // 成功提示
    Notify.create({
      type: 'positive',
      message: '缓存已清空',
      caption: '页面将在 2 秒后自动刷新',
      timeout: 2000,
      position: 'top',
      icon: 'check_circle'
    })
    
    // 关闭对话框
    showConfirmDialog.value = false
    
    // 2秒后刷新页面
    setTimeout(() => {
      window.location.reload()
    }, 2000)
    
  } catch (error) {
    console.error('清空缓存失败:', error)
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

