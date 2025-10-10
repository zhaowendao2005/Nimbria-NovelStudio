我来帮您研究这个系统并制定集成 Vue Draggable Plus 的方案。让我先了解当前的主内容区分割器系统。

[15 tools called]

Boss，我已经详细了解了当前系统的架构和分割器系统。现在为您规划如何使用 **Vue Draggable Plus** 来实现分屏系统下不同节点间标签页的拖拽功能。

---

# 📋 **Nimbria 分屏系统标签页拖拽功能设计方案**

## 一、**当前系统架构分析**

### 1.1 **核心组件结构**

```
ProjectPage.MainPanel
└── PaneContainer (递归组件)
    ├── QSplitter (split 节点)
    │   ├── PaneContainer (子节点)
    │   └── PaneContainer (子节点)
    └── PaneContent (leaf 节点)
        └── el-tabs (标签页容器)
            └── el-tab-pane[] (标签页列表)
                └── MarkdownTab (标签页内容)
```

### 1.2 **数据结构**

```typescript
// Pane 树节点结构
interface PaneNode {
  id: string                    // 面板唯一ID
  type: 'split' | 'leaf'
  
  // Leaf 节点专用
  tabIds?: string[]             // 该面板的所有标签页ID
  activeTabId?: string | null   // 当前激活的标签页
  isFocused?: boolean
  
  // Split 节点专用
  direction?: 'horizontal' | 'vertical'
  splitRatio?: number
  children?: [PaneNode, PaneNode]
}
```

### 1.3 **现有功能**

- ✅ 使用右键菜单进行分屏（转移/复制标签页）
- ✅ 标签页关闭功能
- ✅ 面板焦点管理
- ✅ 标签页切换
- ❌ **缺少：拖拽标签页在不同面板间移动**

---

## 二、**技术方案选型**

### 2.1 **为什么选择 Vue Draggable Plus**

| 特性 | Vue Draggable Plus | 原生实现 |
|------|-------------------|---------|
| Vue 3 支持 | ✅ 完整支持 | ❌ 需要大量代码 |
| TypeScript | ✅ 类型完善 | ❌ 需要自己定义 |
| 组件间拖拽 | ✅ `group` 机制 | ❌ 复杂的事件传递 |
| 性能优化 | ✅ 基于 Sortable.js | ❌ 需要手动优化 |
| Element Plus 兼容 | ✅ 可集成 | ❌ 兼容性问题 |

**结论**：Vue Draggable Plus 是最优选择。

---

## 三、**核心设计思路**

### 3.1 **拖拽流程**

```
用户拖拽标签页
    ↓
触发 VueDraggablePlus 的 onStart 事件
    ↓
Element 在不同 Pane 的拖拽容器间移动
    ↓
触发 onEnd 事件
    ↓
更新 paneLayout store 的 tabIds 分配
    ↓
Element Plus tabs 自动重新渲染
    ↓
完成拖拽
```

### 3.2 **关键技术点**

1. **覆盖 Element Plus tabs 的标签头**
   - 不使用 `el-tabs` 的默认标签头
   - 自定义标签头容器，注入 `VueDraggablePlus`

2. **使用 `group` 机制实现跨面板拖拽**
   ```typescript
   group: {
     name: 'pane-tabs',  // 全局统一分组
     pull: true,         // 允许拖出
     put: true           // 允许放入
   }
   ```

3. **数据同步策略**
   - **禁用 v-model 自动更新**（避免与 store 冲突）
   - 在 `onEnd` 事件中手动更新 `paneLayout store`
   - Store 更新后通过响应式触发 UI 重新渲染

4. **🔥 布局不受影响的关键设计**
   
   **问题**：VueDraggablePlus 会渲染为一个 `div` 容器，如何确保它不破坏原有布局？
   
   **解决方案**：
   ```scss
   // 1. 外层容器（.draggable-tab-bar）
   .draggable-tab-bar {
     flex-shrink: 0;  // 防止被压缩
     // 其他样式...
   }
   
   // 2. VueDraggablePlus 渲染的容器（.tab-headers-container）
   .tab-headers-container {
     display: flex;           // flex 容器，与原布局一致
     flex-shrink: 0;          // 不被压缩
     min-height: 44px;        // 固定高度，避免抖动
     width: 100%;             // 占满宽度
     pointer-events: auto;    // 启用鼠标交互
   }
   ```
   
   **原理说明**：
   - VueDraggablePlus 本身就是标签栏容器，不是覆盖层
   - 使用 `flex` 布局无缝融入现有布局流
   - `flex-shrink: 0` 确保容器不会被压缩变形
   - `min-height` 固定高度，避免内容变化时抖动
   - Sortable.js 内部会创建拖拽代理元素，不影响原布局
   
   **与原 el-tabs 对比**：
   | 特性 | el-tabs | DraggableTabBar |
   |------|---------|-----------------|
   | 标签栏容器 | `.el-tabs__header` | `.tab-headers-container` |
   | 布局方式 | flex | flex (相同) |
   | 高度 | 自适应 | 固定 min-height |
   | 交互层 | 原生点击 | Sortable.js 拖拽层 |
   | 布局影响 | 无 | 无 (设计保证) |

---

## 四、**详细实现方案**

### 4.1 **架构调整**

#### 4.1.1 **新增组件**

```
Nimbria/Client/GUI/components/ProjectPage.MainPanel/PaneSystem/
├── PaneContainer.vue        (现有，无需修改)
├── PaneContent.vue          (现有，需要大幅修改)
├── ContextMenu.vue          (现有，无需修改)
└── DraggableTabBar.vue      (🆕 新增：可拖拽的标签栏)
```

#### 4.1.2 **DraggableTabBar.vue 组件设计**

```vue
<template>
  <div class="draggable-tab-bar">
    <!-- 🔥 使用 VueDraggablePlus 包裹标签头 -->
    <!-- 
      重要说明：
      1. VueDraggablePlus 会渲染为一个 div 容器
      2. 我们通过 class="tab-headers-container" 直接样式化这个容器
      3. data-pane-id 属性用于在拖拽事件中识别源/目标面板
      4. 容器采用 flex 布局，不会影响原有布局流
    -->
    <VueDraggablePlus
      :model-value="localTabIds"
      :group="dragGroup"
      :animation="200"
      handle=".tab-handle"
      ghost-class="tab-ghost"
      chosen-class="tab-chosen"
      drag-class="tab-drag"
      @start="handleDragStart"
      @end="handleDragEnd"
      @add="handleAdd"
      @remove="handleRemove"
      class="tab-headers-container"
      :data-pane-id="paneId"
    >
      <div
        v-for="tabId in localTabIds"
        :key="tabId"
        :class="['custom-tab-item', { 'active': tabId === activeTabId }]"
        @click="handleTabClick(tabId)"
      >
        <!-- 拖拽手柄 -->
        <div class="tab-handle">
          <span class="tab-label">{{ getTabName(tabId) }}</span>
          <SaveStatusBadge :tab="getTab(tabId)" />
        </div>
        
        <!-- 关闭按钮 -->
        <el-icon
          class="tab-close-btn"
          @click.stop="handleTabClose(tabId)"
        >
          <Close />
        </el-icon>
      </div>
    </VueDraggablePlus>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VueDraggablePlus } from 'vue-draggable-plus'
import { Close } from '@element-plus/icons-vue'
import { useMarkdownStore } from '@stores/projectPage/Markdown'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'
import SaveStatusBadge from '@components/ProjectPage.MainPanel/AutoSave/SaveStatusBadge.vue'

interface Props {
  paneId: string
  tabIds: string[]
  activeTabId: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'tab-click': [tabId: string]
  'tab-close': [tabId: string]
  'tabs-reorder': [newTabIds: string[]]
}>()

const markdownStore = useMarkdownStore()
const paneLayoutStore = usePaneLayoutStore()

// 本地标签页列表（用于拖拽）
const localTabIds = ref<string[]>([...props.tabIds])

// 监听外部数据变化
watch(() => props.tabIds, (newTabIds) => {
  localTabIds.value = [...newTabIds]
}, { deep: true })

// 拖拽分组配置
const dragGroup = {
  name: 'pane-tabs',  // 全局统一分组
  pull: true,
  put: true
}

// 获取标签名称
const getTabName = (tabId: string): string => {
  const tab = markdownStore.openTabs.find(t => t.id === tabId)
  return tab?.fileName || 'Untitled'
}

// 获取标签对象
const getTab = (tabId: string) => {
  return markdownStore.openTabs.find(t => t.id === tabId) || null
}

// 拖拽开始
const handleDragStart = (evt: any) => {
  console.log('[DraggableTabBar] Drag start:', evt)
  // 设置焦点到当前面板
  paneLayoutStore.setFocusedPane(props.paneId)
}

// 拖拽结束
const handleDragEnd = (evt: any) => {
  console.log('[DraggableTabBar] Drag end:', evt)
  
  const { from, to, oldIndex, newIndex } = evt
  const fromPaneId = from.dataset.paneId
  const toPaneId = to.dataset.paneId
  const draggedTabId = localTabIds.value[newIndex]
  
  // 跨面板拖拽
  if (fromPaneId !== toPaneId) {
    // 通过 store 处理跨面板移动
    paneLayoutStore.moveTabBetweenPanes(
      fromPaneId,
      toPaneId,
      draggedTabId,
      newIndex
    )
  } else {
    // 同面板内重新排序
    paneLayoutStore.reorderTabsInPane(
      props.paneId,
      localTabIds.value
    )
  }
}

// 标签被添加到当前面板
const handleAdd = (evt: any) => {
  console.log('[DraggableTabBar] Tab added:', evt)
}

// 标签被移除出当前面板
const handleRemove = (evt: any) => {
  console.log('[DraggableTabBar] Tab removed:', evt)
}

// 标签点击
const handleTabClick = (tabId: string) => {
  emit('tab-click', tabId)
}

// 标签关闭
const handleTabClose = (tabId: string) => {
  emit('tab-close', tabId)
}
</script>

<style scoped lang="scss">
.draggable-tab-bar {
  // 🔥 关键：确保标签栏容器不占据额外空间
  flex-shrink: 0;  // 不被压缩
  background: var(--obsidian-bg-secondary, #f5f6f8);
  border-bottom: 1px solid var(--obsidian-border, #e3e5e8);
}

// 🔥 VueDraggablePlus 渲染的容器
// 这个类会应用到 VueDraggablePlus 组件渲染出的 div 元素上
.tab-headers-container {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  gap: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  
  // 🔥 关键：确保容器自身不影响布局
  min-height: 44px;      // 固定最小高度，避免抖动
  flex-shrink: 0;        // 不被压缩
  width: 100%;           // 占满父容器宽度
  
  // 确保拖拽时的交互层不阻挡事件
  // Sortable.js 会自动处理拖拽事件，我们只需要确保正常的点击事件能穿透
  pointer-events: auto;  // 启用鼠标事件
}

.custom-tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--obsidian-bg-primary, #fff);
  border: 1px solid var(--obsidian-border, #e3e5e8);
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  
  &.active {
    background: var(--obsidian-bg-active, #e8f0fe);
    border-bottom-color: transparent;
  }
  
  &:hover {
    background: var(--obsidian-bg-hover, #f0f2f5);
  }
}

.tab-handle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: move;
}

.tab-label {
  font-size: 14px;
  color: var(--obsidian-text-primary, #1f2329);
}

.tab-close-btn {
  opacity: 0.6;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
    color: var(--obsidian-danger, #ff4d4f);
  }
}

// 拖拽样式
.tab-ghost {
  opacity: 0.4;
  background: var(--obsidian-accent-light, #d6e4ff);
}

.tab-chosen {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.tab-drag {
  cursor: grabbing !important;
}
</style>
```

### 4.2 **PaneContent.vue 改造**

```vue
<template>
  <div 
    class="pane-content"
    :class="{ 'is-focused': isFocused }"
    @click="handleClick"
  >
    <!-- 焦点指示器 -->
    <div v-if="isFocused" class="focus-indicator"></div>
    
    <!-- 🔥 使用自定义可拖拽标签栏 -->
    <!-- 
      布局说明：
      1. .pane-tabs-wrapper 是 flex 容器（flex-direction: column）
      2. DraggableTabBar 占据固定高度（flex-shrink: 0）
      3. .tab-content-area 占据剩余空间（flex: 1）
      4. 这与原 el-tabs 的布局结构完全一致
    -->
    <div v-if="paneTabIds.length > 0" class="pane-tabs-wrapper">
      <DraggableTabBar
        :pane-id="paneId"
        :tab-ids="paneTabIds"
        :active-tab-id="localActiveTabId"
        @tab-click="handleTabSwitch"
        @tab-close="handleTabRemove"
      />
      
      <!-- 标签页内容区域 -->
      <div class="tab-content-area">
        <MarkdownTab
          v-if="localActiveTabId"
          :tab-id="localActiveTabId"
        />
      </div>
    </div>
    
    <!-- 空面板提示 -->
    <div v-else class="empty-pane">
      <el-empty 
        description="点击左侧文件树打开文件"
        :image-size="120"
      >
        <template #image>
          <el-icon :size="80" color="var(--obsidian-text-muted)">
            <Document />
          </el-icon>
        </template>
      </el-empty>
    </div>
    
    <!-- 右键菜单保留 -->
    <ContextMenu
      v-model:visible="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      :items="contextMenuItems"
      @select="handleMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Document } from '@element-plus/icons-vue'
import { useMarkdownStore } from '@stores/projectPage/Markdown'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'
import MarkdownTab from '@components/ProjectPage.MainPanel/Markdown/MarkdownTab.vue'
import DraggableTabBar from './DraggableTabBar.vue'
import ContextMenu from './ContextMenu.vue'

// ... 其余代码基本保持不变，只是移除 el-tabs 相关代码
</script>

<style scoped>
/* 🔥 关键布局样式 - 与原 el-tabs 结构保持一致 */
.pane-tabs-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;  // 🔥 关键：允许在 flex 中收缩
}

.tab-content-area {
  flex: 1;        // 🔥 关键：占据剩余空间
  min-height: 0;  // 🔥 关键：允许在 flex 中收缩
  overflow: hidden;
}

/* 
  对比原 el-tabs 布局：
  
  原布局：
  .el-tabs (flex column)
    └── .el-tabs__header (flex-shrink: 0)
    └── .el-tabs__content (flex: 1)
  
  新布局：
  .pane-tabs-wrapper (flex column)
    └── DraggableTabBar > .draggable-tab-bar (flex-shrink: 0)
    └── .tab-content-area (flex: 1)
  
  两者完全等价！
*/
</style>
```

### 4.3 **Store 扩展**

在 `paneLayout.store.ts` 中新增以下方法：

```typescript
/**
 * 在不同面板间移动标签页
 * @param fromPaneId 源面板ID
 * @param toPaneId 目标面板ID
 * @param tabId 标签页ID
 * @param toIndex 目标位置索引
 */
const moveTabBetweenPanes = (
  fromPaneId: string,
  toPaneId: string,
  tabId: string,
  toIndex: number
) => {
  console.log('[PaneLayout] Moving tab between panes:', {
    fromPaneId,
    toPaneId,
    tabId,
    toIndex
  })
  
  const updateTree = (node: PaneNode): PaneNode => {
    if (node.type === 'leaf') {
      // 从源面板移除
      if (node.id === fromPaneId) {
        const newTabIds = (node.tabIds || []).filter(id => id !== tabId)
        const newActiveTabId = node.activeTabId === tabId
          ? (newTabIds[0] || null)
          : node.activeTabId
        
        return {
          ...node,
          tabIds: newTabIds,
          activeTabId: newActiveTabId
        }
      }
      
      // 添加到目标面板
      if (node.id === toPaneId) {
        const currentTabIds = node.tabIds || []
        const newTabIds = [...currentTabIds]
        
        // 在指定位置插入
        newTabIds.splice(toIndex, 0, tabId)
        
        return {
          ...node,
          tabIds: newTabIds,
          activeTabId: tabId,  // 激活新添加的标签
          lastActiveAt: Date.now()
        }
      }
    } else if (node.children) {
      return {
        ...node,
        children: [
          updateTree(node.children[0]),
          updateTree(node.children[1])
        ] as [PaneNode, PaneNode]
      }
    }
    
    return node
  }
  
  paneTree.value = updateTree(paneTree.value)
  
  // 设置焦点到目标面板
  setFocusedPane(toPaneId)
}

/**
 * 重新排序面板内的标签页
 * @param paneId 面板ID
 * @param newTabIds 新的标签页顺序
 */
const reorderTabsInPane = (paneId: string, newTabIds: string[]) => {
  console.log('[PaneLayout] Reordering tabs in pane:', { paneId, newTabIds })
  
  const updateTree = (node: PaneNode): PaneNode => {
    if (node.type === 'leaf' && node.id === paneId) {
      return {
        ...node,
        tabIds: newTabIds
      }
    } else if (node.children) {
      return {
        ...node,
        children: [
          updateTree(node.children[0]),
          updateTree(node.children[1])
        ] as [PaneNode, PaneNode]
      }
    }
    
    return node
  }
  
  paneTree.value = updateTree(paneTree.value)
}

// 在 return 中导出
return {
  // ... 现有导出
  moveTabBetweenPanes,
  reorderTabsInPane
}
```

### 4.4 **依赖安装**

```json
// Nimbria/package.json 修改
{
  "dependencies": {
    // ... 现有依赖
    "vue-draggable-plus": "^0.6.0"  // 🆕 新增
  }
}
```

---

## 五、**实现步骤计划**

### 5.1 **第一阶段：基础集成**（1-2小时）

1. **安装依赖**
   ```bash
   npm install vue-draggable-plus
   ```

2. **创建 DraggableTabBar.vue 组件**
   - 实现基础的拖拽标签栏
   - 支持同面板内拖拽排序

3. **修改 PaneContent.vue**
   - 替换 `el-tabs` 为自定义标签栏
   - 保持原有功能（切换、关闭、焦点管理）

4. **测试单面板拖拽**
   - 验证标签页可以在同一面板内重新排序
   - 验证拖拽后激活状态正确

### 5.2 **第二阶段：跨面板拖拽**（2-3小时）

1. **扩展 paneLayout.store.ts**
   - 添加 `moveTabBetweenPanes` 方法
   - 添加 `reorderTabsInPane` 方法

2. **完善 DraggableTabBar 事件处理**
   - 实现 `onEnd` 事件中的跨面板逻辑
   - 处理拖拽后的焦点切换

3. **测试跨面板拖拽**
   - 创建多个分屏面板
   - 测试标签页在不同面板间拖拽
   - 验证数据同步正确性

### 5.3 **第三阶段：优化与调试**（1-2小时）

1. **样式优化**
   - 调整拖拽过程中的视觉反馈
   - 优化 ghost/chosen/drag 状态样式
   - 确保与 Obsidian 主题一致

2. **边界情况处理**
   - 最后一个标签页被拖走时面板的处理
   - 拖拽到空面板的处理
   - 快速连续拖拽的防抖

3. **性能优化**
   - 避免不必要的重新渲染
   - 优化拖拽动画性能

### 5.4 **第四阶段：增强功能**（可选，1-2小时）

1. **拖拽预览增强**
   - 显示拖拽中的标签页缩略图
   - 目标位置的插入指示器

2. **键盘辅助**
   - `Ctrl` + 拖拽 = 复制标签页
   - `Shift` + 拖拽 = 移动到新面板

3. **拖拽到面板外创建新面板**
   - 检测拖拽到边界
   - 自动创建新分屏

---

## 六、**注意事项与最佳实践**

### 6.1 **🔥 布局完整性保障（重要）**

**核心原则**：VueDraggablePlus 容器必须完全融入现有 flex 布局，不产生任何额外空间或布局偏移。

#### 6.1.1 **必须设置的 CSS 属性**

```scss
// ✅ 必须设置
.tab-headers-container {
  display: flex;           // 保持 flex 布局
  flex-shrink: 0;          // 防止被压缩
  min-height: 44px;        // 固定高度，避免抖动
  width: 100%;             // 占满父容器宽度
  pointer-events: auto;    // 确保鼠标事件正常
}

// ❌ 禁止设置
.tab-headers-container {
  position: absolute;      // ❌ 会脱离文档流
  float: left;             // ❌ 破坏 flex 布局
  height: auto;            // ❌ 可能导致高度抖动
}
```

#### 6.1.2 **布局验证清单**

在实现时，必须验证以下几点：

- [ ] 标签栏高度固定，不随内容变化
- [ ] 内容区正确占据剩余空间
- [ ] 拖拽时不出现滚动条或布局抖动
- [ ] 多个面板的标签栏高度一致
- [ ] 分隔器拖动时布局正常响应

#### 6.1.3 **常见布局问题及解决方案**

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 标签栏被压缩 | 缺少 `flex-shrink: 0` | 添加 `flex-shrink: 0` |
| 内容区不可滚动 | 缺少 `min-height: 0` | 为 flex 子元素添加 `min-height: 0` |
| 拖拽时布局抖动 | 高度未固定 | 使用 `min-height` 固定高度 |
| 点击事件失效 | `pointer-events` 问题 | 确保设置为 `auto` |
| 标签栏溢出 | `overflow` 设置错误 | 设置 `overflow-x: auto` |

### 6.2 **性能考虑**

1. **避免频繁更新 store**
   - 拖拽过程中不更新，只在 `onEnd` 时更新一次
   - 使用防抖优化持久化

2. **大量标签页优化**
   - 当标签页数量 > 20 时考虑虚拟滚动
   - 限制同时打开的标签页数量

### 6.3 **兼容性保障**

1. **保留右键菜单功能**
   - 拖拽和右键菜单并存
   - 用户可以选择任一方式操作

2. **渐进增强**
   - 拖拽失败时回退到原位置
   - 提供清晰的错误提示

### 6.3 **类型安全**

```typescript
// 在 types.ts 中新增拖拽相关类型
export interface DragEvent {
  from: HTMLElement
  to: HTMLElement
  oldIndex: number
  newIndex: number
  item: HTMLElement
}

export interface TabDragPayload {
  tabId: string
  fromPaneId: string
  toPaneId: string
  toIndex: number
}
```

---

## 七、**预期效果**

### 7.1 **用户体验**

- ✅ 鼠标拖拽标签头即可移动标签页
- ✅ 拖拽过程中有清晰的视觉反馈
- ✅ 可以在任意面板间自由移动标签页
- ✅ 拖拽后焦点自动跟随到目标面板
- ✅ 支持同面板内重新排序

### 7.2 **开发体验**

- ✅ 类型安全的 API
- ✅ 清晰的事件日志
- ✅ 易于扩展的架构
- ✅ 与现有系统无缝集成

---

## 八、**后续扩展方向**

1. **拖拽到分隔线自动分屏**
   - 检测拖拽到 QSplitter 区域
   - 自动创建新面板并分配标签

2. **标签页克隆**
   - 按住 `Ctrl` 拖拽实现复制
   - 支持同一文件在多个面板打开

3. **标签页分组**
   - 支持标签页分组管理
   - 拖拽整组标签页

4. **保存布局模板**
   - 保存常用的分屏布局
   - 一键恢复布局配置

---

## 九、**布局验证步骤（实现前必读）**

在开始实现之前，请完整阅读本节，确保理解布局设计的关键点。

### 9.1 **开发环境准备**

```bash
# 1. 安装依赖
npm install vue-draggable-plus

# 2. 启动开发服务器
npm run dev:electron

# 3. 打开 Chrome DevTools (F12)
# 4. 切换到 Elements 面板，准备检查布局
```

### 9.2 **分步验证流程**

#### **步骤 1：创建 DraggableTabBar 组件**

1. 创建组件文件
2. 复制设计中的模板和脚本
3. **关键**：仔细检查样式中的以下属性：
   ```scss
   .tab-headers-container {
     display: flex;
     flex-shrink: 0;
     min-height: 44px;
     width: 100%;
   }
   ```

#### **步骤 2：集成到 PaneContent**

1. 替换 `el-tabs` 为 `DraggableTabBar`
2. **验证点**：使用 DevTools 检查：
   - `.pane-tabs-wrapper` 的高度应该是 `100%`
   - `.tab-content-area` 应该有 `flex: 1`
   - 标签栏的高度应该是固定的（约 44-48px）

#### **步骤 3：单面板拖拽测试**

1. 打开 3-5 个标签页
2. 尝试拖拽标签页重新排序
3. **验证点**：
   - [ ] 拖拽时标签页跟随鼠标
   - [ ] 拖拽过程中布局不抖动
   - [ ] 拖拽结束后顺序正确
   - [ ] 标签栏高度始终不变

#### **步骤 4：创建分屏并测试跨面板拖拽**

1. 使用右键菜单创建分屏
2. 尝试将标签页从一个面板拖到另一个
3. **验证点**：
   - [ ] 两个面板的标签栏高度一致
   - [ ] 拖拽时目标面板有插入提示
   - [ ] 拖拽完成后数据同步正确
   - [ ] 空面板显示欢迎页

#### **步骤 5：调整分隔器测试**

1. 拖动 QSplitter 分隔线
2. **验证点**：
   - [ ] 标签栏保持固定高度
   - [ ] 内容区正确缩放
   - [ ] 分隔器拖动流畅
   - [ ] 没有出现意外的滚动条

### 9.3 **布局问题排查工具**

如果遇到布局问题，使用以下 DevTools 命令检查：

```javascript
// 在 Console 中运行，检查标签栏容器
const containers = document.querySelectorAll('.tab-headers-container')
containers.forEach((el, i) => {
  console.log(`Container ${i}:`, {
    display: getComputedStyle(el).display,
    flexShrink: getComputedStyle(el).flexShrink,
    height: getComputedStyle(el).height,
    minHeight: getComputedStyle(el).minHeight,
    width: getComputedStyle(el).width
  })
})
```

### 9.4 **验证通过标准**

所有以下条件必须同时满足：

- ✅ 标签栏高度固定，不随拖拽变化
- ✅ 内容区占据剩余空间，可正常滚动
- ✅ 拖拽过程中无布局抖动
- ✅ 多个分屏面板的标签栏高度一致
- ✅ 分隔器拖动不影响标签栏高度
- ✅ 点击、拖拽、关闭等交互全部正常
- ✅ 控制台无 Vue 警告或错误

---

## 十、**总结**

通过集成 **Vue Draggable Plus**，我们将为 Nimbria 的分屏系统带来：

1. **直观的拖拽交互** - 符合用户对现代编辑器的预期
2. **灵活的面板管理** - 快速调整工作区布局
3. **无缝的系统集成** - 与现有架构完美融合
4. **可扩展的架构** - 为未来功能打下基础

**核心原则**：在不破坏现有功能的前提下，渐进式增强用户体验。

**布局保证**：通过精心设计的 flex 布局和 CSS 属性，VueDraggablePlus 容器完全融入现有布局流，不产生任何副作用。

