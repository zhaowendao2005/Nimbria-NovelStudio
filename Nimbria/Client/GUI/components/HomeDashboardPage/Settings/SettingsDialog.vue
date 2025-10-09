<template>
  <q-dialog 
    v-model="isVisible" 
    persistent 
    maximized 
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="settings-dialog">
      <!-- 标题栏 -->
      <q-card-section class="settings-dialog__header">
        <div class="settings-dialog__header-content">
          <q-icon name="settings" size="24px" color="primary" class="q-mr-sm" />
          <div class="text-h6">设置</div>
        </div>
        <q-btn 
          flat 
          round 
          dense 
          icon="close" 
          @click="close" 
        />
      </q-card-section>

      <!-- 主体区域 -->
      <q-card-section class="settings-dialog__body">
        <!-- 左侧菜单 -->
        <div class="settings-menu">
          <q-list>
            <q-item
              v-for="item in menuItems"
              :key="item.id"
              clickable
              :active="activeSection === item.id"
              @click="scrollToSection(item.id)"
              active-class="settings-menu__item--active"
              class="settings-menu__item"
            >
              <q-item-section avatar>
                <q-icon :name="item.icon" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ item.label }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <!-- 菜单底部信息 -->
          <div class="settings-menu__footer">
            <q-separator class="q-mb-md" />
            <div class="text-caption text-grey-6 q-px-md">
              <div>Nimbria v1.0.0</div>
              <div class="q-mt-xs">云墨澜书</div>
            </div>
          </div>
        </div>

        <!-- 右侧主内容区（可滚动） -->
        <div class="settings-content" ref="contentRef" @scroll="handleScroll">
          <!-- 缓存管理 -->
          <section :id="'section-cache'" class="settings-section">
            <SettingsCacheManagement />
          </section>

          <!-- AI配置 -->
          <section :id="'section-ai'" class="settings-section">
            <SettingsAIConfig />
          </section>

          <!-- 主题设置 -->
          <section :id="'section-theme'" class="settings-section">
            <SettingsThemeSettings />
          </section>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SettingsCacheManagement from './Settings.CacheManagement.vue'
import SettingsAIConfig from './Settings.AIConfig.vue'
import SettingsThemeSettings from './Settings.ThemeSettings.vue'

/**
 * 设置对话框
 * 提供应用程序的各项设置功能
 */

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 双向绑定显示状态
const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 当前激活的章节
const activeSection = ref('cache')

// 内容区域引用
const contentRef = ref<HTMLElement>()

// 菜单项配置
const menuItems = [
  { id: 'cache', label: '缓存管理', icon: 'storage' },
  { id: 'ai', label: 'AI配置', icon: 'smart_toy' },
  { id: 'theme', label: '主题设置', icon: 'palette' }
]

/**
 * 滚动到指定章节
 */
function scrollToSection(sectionId: string) {
  const element = document.getElementById(`section-${sectionId}`)
  if (element && contentRef.value) {
    const container = contentRef.value
    const elementTop = element.offsetTop
    
    // 平滑滚动到目标位置
    container.scrollTo({
      top: elementTop - 32, // 减去顶部padding
      behavior: 'smooth'
    })
    
    // 更新激活状态
    activeSection.value = sectionId
  }
}

/**
 * 处理滚动事件，更新激活的菜单项
 */
function handleScroll() {
  if (!contentRef.value) return

  const scrollTop = contentRef.value.scrollTop
  const sections = ['cache', 'ai', 'theme']
  
  // 找到当前在视口中的章节
  for (const id of sections) {
    const element = document.getElementById(`section-${id}`)
    if (element) {
      const rect = element.getBoundingClientRect()
      const containerRect = contentRef.value.getBoundingClientRect()
      
      // 检查元素是否在视口顶部附近
      if (rect.top <= containerRect.top + 100 && rect.bottom > containerRect.top + 100) {
        activeSection.value = id
        break
      }
    }
  }
}

/**
 * 关闭对话框
 */
function close() {
  isVisible.value = false
}

// 监听对话框打开，重置到第一个章节
watch(isVisible, (newVal) => {
  if (newVal) {
    activeSection.value = 'cache'
    // 延迟滚动，确保DOM已渲染
    setTimeout(() => {
      if (contentRef.value) {
        contentRef.value.scrollTop = 0
      }
    }, 100)
  }
})
</script>

<style scoped lang="scss">
.settings-dialog {
  height: 100vh;
  display: flex;
  flex-direction: column;

  &__header {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--el-border-color);
    padding: 16px 24px;
    background: var(--el-bg-color);
  }

  &__header-content {
    display: flex;
    align-items: center;
  }

  &__body {
    flex: 1;
    flex-shrink: 0;
    min-height: 0;
    display: flex;
    padding: 0;
    overflow: hidden;
  }
}

.settings-menu {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color);
  background: var(--el-fill-color-light);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .q-list {
    padding: 16px 0;
    flex: 1;
  }

  &__item {
    margin: 4px 12px;
    border-radius: 8px;
    transition: all 0.2s;

    &:hover {
      background: var(--el-fill-color);
    }

    &--active {
      background: var(--q-primary) !important;
      color: white;

      :deep(.q-item__section--avatar .q-icon) {
        color: white !important;
      }
    }
  }

  &__footer {
    flex-shrink: 0;
    padding: 16px 0;
  }
}

.settings-content {
  flex: 1;
  flex-shrink: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 32px 48px 48px;
  background: var(--el-bg-color);

  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color);
    border-radius: 4px;

    &:hover {
      background: var(--el-border-color-dark);
    }
  }
}

.settings-section {
  margin-bottom: 64px;
  
  &:last-child {
    margin-bottom: 0;
  }
}
</style>

