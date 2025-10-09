<template>
  <div class="theme-settings">
    <h5 class="settings-title">主题设置</h5>
    <p class="settings-description">
      自定义应用程序的外观（功能开发中）
    </p>

    <q-card flat bordered>
      <q-card-section>
        <!-- 主题模式 -->
        <div class="setting-item">
          <div class="setting-item__label">
            <q-icon name="brightness_6" size="18px" class="q-mr-xs" />
            主题模式
          </div>
          <q-option-group
            v-model="themeMode"
            :options="themeModeOptions"
            color="primary"
            inline
            disable
            class="q-mt-sm"
          />
        </div>

        <q-separator class="q-my-lg" />

        <!-- 主色调 -->
        <div class="setting-item">
          <div class="setting-item__label">
            <q-icon name="palette" size="18px" class="q-mr-xs" />
            主色调
          </div>
          <div class="color-picker-grid">
            <div 
              v-for="color in colorOptions" 
              :key="color.value"
              class="color-picker-item"
              :class="{ 'color-picker-item--active': primaryColor === color.value }"
              :style="{ background: color.color }"
              @click="primaryColor = color.value"
            >
              <q-icon v-if="primaryColor === color.value" name="check" color="white" size="20px" />
            </div>
          </div>
        </div>

        <q-separator class="q-my-lg" />

        <!-- 字体大小 -->
        <div class="setting-item">
          <div class="setting-item__label">
            <q-icon name="format_size" size="18px" class="q-mr-xs" />
            基础字体大小
            <q-badge color="primary" class="q-ml-sm">{{ fontSize }}px</q-badge>
          </div>
          <q-slider 
            v-model="fontSize" 
            :min="12" 
            :max="18" 
            :step="1"
            label
            :label-value="`${fontSize}px`"
            disable
            class="q-mt-md"
          />
        </div>

        <q-separator class="q-my-lg" />

        <!-- 侧边栏位置 -->
        <div class="setting-item">
          <div class="setting-item__label">
            <q-icon name="view_sidebar" size="18px" class="q-mr-xs" />
            侧边栏位置
          </div>
          <q-option-group
            v-model="sidebarPosition"
            :options="sidebarPositionOptions"
            color="primary"
            inline
            disable
            class="q-mt-sm"
          />
        </div>

        <q-separator class="q-my-lg" />

        <!-- 紧凑模式 -->
        <div class="setting-item">
          <div class="setting-item__label">
            <q-icon name="compress" size="18px" class="q-mr-xs" />
            界面密度
          </div>
          <div class="density-options">
            <q-btn-group outline>
              <q-btn 
                outline 
                :color="density === 'comfortable' ? 'primary' : 'grey-6'"
                label="舒适" 
                @click="density = 'comfortable'"
                disable
              />
              <q-btn 
                outline 
                :color="density === 'compact' ? 'primary' : 'grey-6'"
                label="紧凑" 
                @click="density = 'compact'"
                disable
              />
            </q-btn-group>
          </div>
        </div>

        <!-- 功能提示 -->
        <q-banner class="bg-blue-1 text-blue-9 q-mt-lg" rounded dense>
          <template v-slot:avatar>
            <q-icon name="info" color="blue" />
          </template>
          <div class="text-body2">
            此功能正在开发中，敬请期待
          </div>
        </q-banner>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 主题配置状态（仅用于UI展示）
const themeMode = ref('light')
const primaryColor = ref('#1976D2')
const fontSize = ref(14)
const sidebarPosition = ref('left')
const density = ref('comfortable')

const themeModeOptions = [
  { label: '浅色', value: 'light', icon: 'light_mode' },
  { label: '深色', value: 'dark', icon: 'dark_mode' },
  { label: '跟随系统', value: 'auto', icon: 'brightness_auto' }
]

const colorOptions = [
  { value: '#1976D2', color: '#1976D2', name: '蓝色' },
  { value: '#26A69A', color: '#26A69A', name: '青色' },
  { value: '#9C27B0', color: '#9C27B0', name: '紫色' },
  { value: '#E91E63', color: '#E91E63', name: '粉色' },
  { value: '#FF9800', color: '#FF9800', name: '橙色' },
  { value: '#4CAF50', color: '#4CAF50', name: '绿色' },
  { value: '#F44336', color: '#F44336', name: '红色' },
  { value: '#607D8B', color: '#607D8B', name: '灰色' }
]

const sidebarPositionOptions = [
  { label: '左侧', value: 'left' },
  { label: '右侧', value: 'right' }
]
</script>

<style scoped lang="scss">
.theme-settings {
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

.setting-item {
  margin-bottom: 0;

  &__label {
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
  }
}

.color-picker-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.color-picker-item {
  aspect-ratio: 1;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  border: 2px solid transparent;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  &--active {
    border-color: var(--q-dark);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  }
}

.density-options {
  margin-top: 12px;
}
</style>

