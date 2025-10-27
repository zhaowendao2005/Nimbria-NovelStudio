好的，Boss！让我先研究一下当前的实现，然后设计这个爬取模式的功能。

[1 tool called]

现在让我搜索一下 Element Plus 的胶囊开关（Segmented）或者类似组件的用法：

[1 tool called]

好的！我现在来为你设计这个"爬取模式"功能。让我先整理一下需求和设计方案：

## 📋 需求分析

### 两种爬取模式

1. **全浏览器自动化模式（当前模式）**
   - 每个章节都在 BrowserView 中加载
   - 更慢，但兼容性好
   - 可以处理动态加载的内容

2. **轻量模式（新增）**
   - 浏览器自动化仅用于：
     - 获取章节列表
     - 获取内容选择器
   - 实际爬取使用 cheerio（后端）+ 并行请求
   - 更快，但需要提前确定选择器

### UI 设计

1. **胶囊式开关**
   - 蓝色：全浏览器模式
   - 黄色：轻量模式
   - 类似 iOS 的 Segmented Control

2. **并行数设置**
   - 仅在轻量模式下显示
   - 使用 `el-input-number` 或 `el-slider`

## 🎨 设计方案

由于你在 **Ask 模式**，我给你完整的代码，你可以切换到 Agent 模式让我帮你应用：

### 修改后的 `SettingsContent.vue`

```vue
<template>
  <div class="settings-content">
    <!-- 🔥 新增：爬取模式 -->
    <div class="settings-section">
      <div class="section-header">
        <h4>爬取模式</h4>
      </div>
      <div class="section-body">
        <!-- 模式切换器 -->
        <div class="mode-switcher">
          <div
            class="mode-option"
            :class="{ active: scrapeMode === 'browser', 'mode-browser': scrapeMode === 'browser' }"
            @click="scrapeMode = 'browser'"
          >
            <el-icon><Monitor /></el-icon>
            <span>全浏览器模式</span>
          </div>
          <div
            class="mode-option"
            :class="{ active: scrapeMode === 'light', 'mode-light': scrapeMode === 'light' }"
            @click="scrapeMode = 'light'"
          >
            <el-icon><Lightning /></el-icon>
            <span>轻量模式</span>
          </div>
        </div>
        
        <!-- 模式说明 -->
        <div class="mode-description">
          <div v-if="scrapeMode === 'browser'" class="description-text">
            <el-icon class="description-icon" color="#409EFF"><InfoFilled /></el-icon>
            <div>
              <p><strong>全浏览器自动化模式</strong></p>
              <p>每个章节都在浏览器中加载，兼容性好，适合复杂网站</p>
            </div>
          </div>
          <div v-else class="description-text">
            <el-icon class="description-icon" color="#F7BA2A"><InfoFilled /></el-icon>
            <div>
              <p><strong>轻量模式</strong></p>
              <p>浏览器仅用于获取章节列表和选择器，实际爬取使用并行请求，速度更快</p>
            </div>
          </div>
        </div>
        
        <!-- 轻量模式专属设置 -->
        <transition name="slide-fade">
          <div v-if="scrapeMode === 'light'" class="light-mode-settings">
            <el-divider />
            
            <el-form label-position="top">
              <el-form-item label="并行请求数">
                <div class="parallel-control">
                  <el-slider
                    v-model="parallelCount"
                    :min="1"
                    :max="10"
                    :step="1"
                    show-stops
                    :marks="parallelMarks"
                  />
                  <el-input-number
                    v-model="parallelCount"
                    :min="1"
                    :max="10"
                    size="small"
                    style="width: 80px; margin-left: 12px"
                  />
                </div>
                <span class="form-hint">同时发送的请求数量，数值越大速度越快，但可能被网站限制</span>
              </el-form-item>
              
              <el-form-item label="请求超时（秒）">
                <el-input-number
                  v-model="requestTimeout"
                  :min="5"
                  :max="60"
                  :step="5"
                  size="small"
                />
                <span class="form-hint">单个请求的超时时间</span>
              </el-form-item>
            </el-form>
          </div>
        </transition>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="settings-actions">
      <el-button type="primary" @click="handleSave">保存设置</el-button>
      <el-button @click="handleReset">重置为默认</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Monitor, Lightning, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

/**
 * SettingsContent 组件
 * 小说爬取设置页内容
 */

// 🔥 爬取模式
type ScrapeMode = 'browser' | 'light'
const scrapeMode = ref<ScrapeMode>('browser')

// 🔥 轻量模式设置
const parallelCount = ref(3)
const requestTimeout = ref(30)

// 并行数滑块标记
const parallelMarks = {
  1: '慢',
  5: '中',
  10: '快'
}

/**
 * 保存设置
 */
const handleSave = (): void => {
  // TODO: 将设置保存到 Store 或持久化存储
  console.log('[SettingsContent] Saving settings:', {
    scrapeMode: scrapeMode.value,
    parallelCount: parallelCount.value,
    requestTimeout: requestTimeout.value
  })
  
  // @ts-expect-error - ElMessage类型定义问题
  ElMessage.success({ message: '设置已保存' })
}

/**
 * 重置为默认值
 */
const handleReset = (): void => {
  scrapeMode.value = 'browser'
  parallelCount.value = 3
  requestTimeout.value = 30
  
  // @ts-expect-error - ElMessage类型定义问题
  ElMessage.info({ message: '已重置为默认设置' })
}
</script>

<style scoped lang="scss">
.settings-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  min-height: 100%;
  min-width: 320px;
}

// 设置区域
.settings-section {
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.section-header {
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
  
  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
}

.section-body {
  padding: 16px;
}

// 🔥 模式切换器 - 胶囊式
.mode-switcher {
  display: flex;
  gap: 8px;
  padding: 4px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.mode-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;
  background: transparent;
  color: var(--el-text-color-regular);
  
  .el-icon {
    font-size: 24px;
  }
  
  span {
    font-size: 13px;
    font-weight: 500;
  }
  
  &:hover {
    background: var(--el-fill-color-light);
  }
  
  // 🔥 激活状态 - 蓝色（全浏览器）
  &.active.mode-browser {
    background: #409EFF;
    color: white;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
  }
  
  // 🔥 激活状态 - 黄色（轻量模式）
  &.active.mode-light {
    background: #F7BA2A;
    color: white;
    box-shadow: 0 2px 8px rgba(247, 186, 42, 0.3);
  }
}

// 模式说明
.mode-description {
  margin-top: 16px;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
}

.description-text {
  display: flex;
  gap: 12px;
  font-size: 13px;
  line-height: 1.6;
  
  .description-icon {
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  p {
    margin: 0 0 4px 0;
    
    &:last-child {
      margin-bottom: 0;
      color: var(--el-text-color-secondary);
    }
  }
}

// 轻量模式专属设置
.light-mode-settings {
  margin-top: 16px;
  
  .el-divider {
    margin: 16px 0;
  }
  
  .el-form-item {
    margin-bottom: 20px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
}

// 并行控制
.parallel-control {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .el-slider {
    flex: 1;
  }
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

// 过渡动画
.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-5px);
  opacity: 0;
}

// 操作按钮
.settings-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--el-border-color);
  background: var(--el-fill-color-lighter);
  margin-top: auto;
  position: sticky;
  bottom: 0;
  z-index: 1;
}
</style>
```

## 🎯 设计亮点

### 1. **胶囊式切换器**
- 类似 iOS Segmented Control
- 蓝色（#409EFF）：全浏览器模式
- 黄色（#F7BA2A）：轻量模式
- 带阴影效果和平滑过渡

### 2. **可视化图标**
- `Monitor`（显示器）：全浏览器模式
- `Lightning`（闪电）：轻量模式
- 直观表达模式特点

### 3. **动态说明**
- 根据选择的模式显示不同说明
- 带信息图标，颜色匹配模式

### 4. **渐进式设置**
- 轻量模式专属设置仅在选中时显示
- 使用 slide-fade 动画过渡

### 5. **并行数控制**
- 滑块 + 数字输入框组合
- 滑块带标记（慢/中/快）
- 范围 1-10，默认 3

## 📐 UI 效果预览

```
┌─────────────────────────────────────┐
│ 爬取模式                             │
├─────────────────────────────────────┤
│ ┌───────────────┬───────────────┐   │
│ │  🖥️          │  ⚡           │   │
│ │ 全浏览器模式  │ 轻量模式      │   │  ← 胶囊开关
│ └───────────────┴───────────────┘   │
│                                     │
│ ℹ️ 轻量模式                          │
│    浏览器仅用于获取章节列表和选择器  │  ← 动态说明
│    实际爬取使用并行请求，速度更快    │
│                                     │
│ ────────────────────────────────    │
│                                     │
│ 并行请求数                           │
│ [━━━●━━━━━━] 3                      │  ← 滑块 + 数字
│ 慢      中      快                   │
│ 同时发送的请求数量...                │
│                                     │
│ 请求超时（秒） [30] ▲▼              │
│                                     │
└─────────────────────────────────────┘
```

## 🚀 下一步实现

需要我切换到 Agent 模式帮你应用这些修改吗？还是你想先看看设计，有什么需要调整的？

另外，后续还需要：
1. 在 Store 中添加爬取模式的状态管理
2. 在后端实现轻量模式的爬取逻辑（使用 cheerio）
3. 修改 `handleScrapeChapters` 方法，根据模式选择不同的爬取策略