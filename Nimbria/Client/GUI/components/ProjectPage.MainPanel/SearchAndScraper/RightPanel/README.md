# RightPanel 组件

SearchAndScraper的右侧面板，采用Chrome DevTools风格设计。

## 📁 文件结构

```
RightPanel/
├── RightPanel.vue         # 主面板组件
├── DevToolsTabBar.vue     # DevTools风格的标签栏
├── types.ts               # 类型定义
├── index.ts               # 组件导出
└── README.md              # 本文档
```

## 🎨 设计特点

### Chrome DevTools风格

参照Chrome DevTools的设计：
- **紧凑的标签栏**：高度32px，节省空间
- **简洁的视觉**：扁平化设计，无边框
- **分组支持**：使用竖分割线分隔不同组的标签
- **状态明确**：hover、active状态清晰可见

### 布局结构

```
┌─────────────────────────────────────┐
│ [Tab1] [Tab2] │ [Tab3] [Tab4]      │ ← DevToolsTabBar (32px)
├─────────────────────────────────────┤
│                                     │
│         Tab Content Area            │ ← 内容区域
│                                     │
└─────────────────────────────────────┘
```

## 📝 使用示例

### 基础用法

```vue
<template>
  <RightPanel :tab-id="currentTabId" />
</template>

<script setup lang="ts">
import { RightPanel } from './RightPanel'
</script>
```

### 配置标签页（后续扩展）

```typescript
import { Document, Setting } from '@element-plus/icons-vue'

const tabs: TabItem[] = [
  // 第一组
  {
    id: 'network',
    label: 'Network',
    icon: Document,
    groupStart: false
  },
  {
    id: 'headers',
    label: 'Headers',
    icon: Document
  },
  // 第二组（显示分割线）
  {
    id: 'cookies',
    label: 'Cookies',
    icon: Document,
    groupStart: true
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Setting,
    badge: 2 // 显示Badge
  }
]
```

## 🔧 组件API

### RightPanel

**Props:**
- `tabId: string` - 关联的SearchAndScraper标签页ID

### DevToolsTabBar

**Props:**
- `tabs: TabItem[]` - 标签页配置数组
- `activeTabId: string` - 当前激活的标签页ID

**Events:**
- `tab-click(tabId: string)` - 点击标签页时触发

### TabItem类型

```typescript
interface TabItem {
  /** 唯一标识 */
  id: string
  
  /** 显示标签 */
  label: string
  
  /** 图标组件（Element Plus图标） */
  icon?: Component
  
  /** Badge数字（可选） */
  badge?: number | string
  
  /** 是否是组的第一个（显示分割线） */
  groupStart?: boolean
  
  /** 是否禁用 */
  disabled?: boolean
}
```

## 🎯 设计理念

### 1. 紧凑高效
- 标签栏高度仅32px
- 紧凑的padding和间距
- 最大化内容区域空间

### 2. 清晰分组
- 使用竖分割线清晰分隔不同功能组
- `groupStart: true` 标记组的开始

### 3. 视觉反馈
- **正常状态**：半透明文字
- **Hover状态**：浅色背景 + 高亮文字
- **Active状态**：主题色背景 + 加粗文字

### 4. 灵活扩展
- 支持图标
- 支持Badge
- 易于添加新标签页

## 🚀 后续扩展计划

### 第一阶段（当前）
- ✅ 基础TabBar组件
- ✅ 分组支持
- ✅ DevTools风格样式

### 第二阶段（计划）
- [ ] 添加具体的标签页内容
  - Network请求监控
  - Headers查看
  - Cookies管理
  - Console日志
- [ ] 支持标签页拖拽排序
- [ ] 支持标签页右键菜单
- [ ] 支持标签页关闭按钮

### 第三阶段（计划）
- [ ] 标签页状态持久化
- [ ] 自定义标签页配置
- [ ] 快捷键支持

## 💡 代码示例

### 添加新标签页

```typescript
// 1. 定义标签页配置
const newTab: TabItem = {
  id: 'my-tab',
  label: 'My Tab',
  icon: Document,
  groupStart: false // 或 true 如果要开始新组
}

// 2. 添加到tabs数组
tabs.value.push(newTab)

// 3. 创建对应的内容组件
// components/MyTabContent.vue
```

### 自定义样式

可以通过CSS变量自定义颜色：

```scss
.devtools-tabbar {
  // 使用Element Plus的主题变量
  --tab-bg: var(--el-bg-color);
  --tab-hover-bg: var(--el-fill-color-light);
  --tab-active-bg: var(--el-color-primary-light-9);
}
```

## 🔍 技术细节

### 为什么选择这个设计？

1. **紧凑性**：DevTools需要在有限空间内显示大量信息
2. **可扩展性**：Tab模式易于添加新功能
3. **专业感**：与开发者熟悉的工具保持一致
4. **性能**：简单的DOM结构，渲染高效

### 与其他设计的对比

| 设计方案 | 优点 | 缺点 | 选择原因 |
|---------|------|------|----------|
| DevTools标签栏 | 紧凑、专业 | 较小的点击区域 | ✅ 适合开发工具 |
| 侧边栏导航 | 易于点击 | 占用更多空间 | ❌ 空间有限 |
| 下拉菜单 | 极简 | 操作步骤多 | ❌ 效率较低 |

## 📚 参考资料

- [Chrome DevTools UI](https://developer.chrome.com/docs/devtools/)
- [Element Plus Badge](https://element-plus.org/en-US/component/badge.html)
- [Element Plus Icon](https://element-plus.org/en-US/component/icon.html)

