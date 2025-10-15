# 🤖 项目页面LLM对话功能设计文档

## 📋 项目概述

为Nimbria项目的左侧栏添加AI助手对话功能，实现与项目文件的智能交互和代码辅助。

## 🎨 左侧栏导航交互设计

### 导航状态管理
- **选项高亮**：点击左栏导航按钮时，对应选项高亮显示
- **内容区切换**：导航按钮控制右侧内容区域的显示内容
- **收起功能**：高亮按钮第二次点击时，隐藏整个内容区域
- **状态持久化**：记住用户最后选择的导航状态
- **特殊处理**：文档解析器按钮点击后不显示左侧内容，而是在主内容区创建panel

### 导航选项列表
```
左侧导航栏
├── 📁 文件浏览器 (FileTree) → 左侧内容区
├── 🤖 AI助手 (LlmChat) → 左侧内容区 ← 新增
├── 🔍 搜索功能 → 左侧内容区
├── 📅 笔记本 → 左侧内容区
├── 📄 文档解析器 → 主内容区Panel ← 特殊处理
└── ⚙️ 设置 → 左侧内容区
```

### 分隔面板设计
- **可调节分隔器**：左侧栏与主内容区之间添加可拖拽的分隔线
- **最小宽度限制**：左侧栏最小宽度280px，最大宽度600px
- **拖拽手柄**：3px宽度的分隔线，鼠标悬停时显示调整光标
- **宽度记忆**：用户调整后的宽度保存到localStorage

## 📁 文件结构规划
- 文件管理器组件：`Nimbria\Client\GUI\components\ProjectPage.Shell\Navbar.content\FileTree`
- LLM对话组件：`Nimbria\Client\GUI\components\ProjectPage.Shell\Navbar.content\LlmChat`

## 🎨 交互设计要点
1. **选项卡设计**：使用Element Plus的选项页组件，将模型选择、新对话、历史记录改为选项卡形式
2. **工具栏设计**：最右边放置工具箱按钮，包含创建新对话、历史记录等功能
3. **输入栏设计**：底部工具栏包含模型选择和发送按钮
4. **模型选择机制**：
   - 点击后向上展开选择菜单
   - 初始为空，显示"add model"按钮
   - 弹出对话框选择当前活跃模型
   - 数据存储在localStorage
   - 需要校验机制确保选中的模型仍然活跃

## 🏗️ 架构设计

### 布局架构
```
项目页面布局
├── 左侧栏 (280-600px, 可调节)
│   ├── 导航栏 (48px)
│   └── 内容区 (动态高度)
├── 分隔器 (3px, 可拖拽)
└── 主内容区 (剩余宽度)
    ├── 编辑器面板
    └── 特殊面板 (如文档解析器)
```

### 文件结构
```
Nimbria/Client/GUI/components/ProjectPage.Shell/Navbar.content/
├── FileTree/          # 文件管理器组件
│   ├── FileTreePanel.vue
│   ├── FileTreeToolbar.vue
│   └── FileTreeContent.vue
└── LlmChat/           # LLM对话组件 (新增)
    ├── LlmChatPanel.vue         # 主面板
    ├── ChatTabs.vue             # 选项卡组件
    ├── ChatToolbox.vue          # 工具箱组件
    ├── ChatInput.vue            # 输入组件
    ├── ChatMessages.vue         # 消息列表
    ├── ModelSelector.vue        # 模型选择器
    └── types.ts                 # 类型定义
```

### 分隔器组件设计
```
Nimbria/Client/GUI/components/ProjectPage.Shell/
├── ResizableSplitter.vue     # 可调节分隔器组件
└── SplitterHandle.vue        # 拖拽手柄组件
```

## 🎨 界面设计规范

### 整体布局 (可调节宽度: 280-600px)
```
┌─────────────────────────────────┐ ┃ ← 分隔器
│ [对话1] [对话2] [+] [🔧]        │ ┃   (可拖拽)
│ [对话3] [对话4]                 │ ┃
├─────────────────────────────────┤ ┃
│                                 │ ┃
│         消息区域                 │ ┃ ← 对话内容
│    (滚动区域，高度自适应)         │ ┃
│                                 │ ┃
├─────────────────────────────────┤ ┃
│ ┌─────────────────────────────┐ │ ┃
│ │ 输入框...                   │ │ ┃ ← 输入区域
│ └─────────────────────────────┘ │ ┃
│ [🤖 模型] [📎] [🎯] [📤发送]    │ ┃ ← 工具栏
└─────────────────────────────────┘ ┃
```

### 多行选项卡布局示例
```
第一行: [对话1] [对话2] [对话3] [对话4]    [🔧]
第二行: [对话5] [对话6] [对话7]
第三行: [对话8] [对话9]              [⬇️更多]
```

### 选项卡设计
- **Element Plus Tabs组件**
- **自动换行布局**：当对话标签过多时自动换行显示
- **推荐组件**：使用 `el-tabs` 配合 `flex-wrap: wrap` 实现多行标签
- **最大显示行数**：限制最多3行，超出时显示滚动
- **右侧工具箱按钮**：固定在第一行右侧位置
- **新建对话**：自动生成标题"对话 N"
- **标签宽度**：每个标签最小宽度80px，最大宽度120px

### 工具箱功能菜单
```
🔧 工具箱
├── ➕ 创建新对话
├── 📚 历史记录
├── 📤 导出对话
├── 🗑️ 清空当前对话
└── ⚙️ 更多设置
```

### 输入区域设计
```
┌─────────────────────────────────┐
│ 在这里输入消息...                │ ← 多行文本框
│                                 │   自动高度(最大120px)
└─────────────────────────────────┘
[🤖 GPT-4] [📎] [🎯] [📤]          ← 工具栏
```

## 🔧 功能模块设计

### 1. 模型选择器 (ModelSelector)

#### 交互流程
```
点击 [🤖 模型名称] 
→ 向上弹出选择菜单
→ 显示已配置模型列表
→ 底部显示 [+ 添加模型] 按钮
```

#### 添加模型对话框
```
┌─────────────────────────────┐
│ 📱 选择聊天模型              │
├─────────────────────────────┤
│ ☑️ GPT-4 Turbo             │
│ ☑️ Claude-3.5 Sonnet       │
│ ☐ GPT-3.5 Turbo           │
│ ☐ Gemini Pro              │
├─────────────────────────────┤
│        [取消]    [确定]      │
└─────────────────────────────┘
```

#### 校验机制
- **启动时校验**：检查localStorage中的模型是否仍在活跃列表
- **实时校验**：打开选择器时同步最新的活跃模型状态
- **自动清理**：移除已失效的模型配置

### 2. 对话管理 (ChatTabs)

#### 数据结构
```typescript
interface ChatConversation {
  id: string
  title: string
  messages: ChatMessage[]
  modelId: string
  createdAt: Date
  updatedAt: Date
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  status: 'sending' | 'sent' | 'error' | 'streaming'
  attachments?: FileReference[]
}
```

#### 选项卡功能
- **自动标题生成**：基于首条消息内容
- **手动重命名**：双击标题编辑
- **关闭确认**：有未保存内容时提示
- **最大限制**：同时最多打开5个对话

### 3. 消息显示 (ChatMessages)

#### 消息样式
```
👤 用户消息
┌─────────────────────────────┐
│ 请解释这段代码的作用           │
│                             │
│ ```javascript               │
│ function test() {           │
│   return 'hello'            │
│ }                          │
│ ```                        │
│                             │
│ 13:45                  [⋯]  │
└─────────────────────────────┘

🤖 AI回复
┌─────────────────────────────┐
│ 这是一个简单的JavaScript函数  │
│ 功能是返回字符串 "hello"...   │
│                             │
│ 13:45    [👍] [👎] [📋] [🔄] │
└─────────────────────────────┘
```

#### 消息操作
- **👍👎** 反馈按钮
- **📋** 复制内容
- **🔄** 重新生成
- **⋯** 更多操作(编辑、删除)

### 4. 项目集成功能

#### 文件引用系统
- **@文件名** 语法快速引用
- **拖拽文件**到输入框自动引用
- **选中代码**右键菜单"发送到AI"

#### 上下文管理
```typescript
interface ProjectContext {
  currentFile?: string
  selectedCode?: string
  projectStructure: FileNode[]
  recentFiles: string[]
}
```

## 💾 数据存储设计

### LocalStorage结构
```typescript
interface ChatSettings {
  selectedModels: string[]        // 已选择的模型列表
  defaultModel: string           // 默认模型
  conversations: ChatConversation[] // 对话历史
  preferences: {
    autoSave: boolean            // 自动保存
    maxHistory: number           // 最大历史记录
    streamResponse: boolean      // 流式响应
  }
}
```

### 存储键名
- `nimbria_chat_settings` - 聊天配置
- `nimbria_chat_conversations` - 对话记录  
- `nimbria_chat_temp` - 临时数据
- `nimbria_sidebar_width` - 侧栏宽度设置

## 🔄 状态管理 (Pinia Store)

### ChatStore结构
```typescript
// Client/stores/chat/chatStore.ts
export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    conversations: [],
    activeConversationId: null,
    isLoading: false,
    selectedModels: [],
    defaultModel: null,
    projectContext: null,
    // 新增：导航状态管理
    isContentVisible: true,
    activeNavItem: 'chat',
    // 新增：布局状态管理
    leftSidebarWidth: 328,
    minSidebarWidth: 280,
    maxSidebarWidth: 600
  }),
  
  actions: {
    // 对话管理
    createConversation(),
    deleteConversation(id: string),
    setActiveConversation(id: string),
    
    // 消息管理  
    sendMessage(content: string),
    regenerateMessage(messageId: string),
    deleteMessage(messageId: string),
    
    // 模型管理
    setSelectedModels(models: string[]),
    validateModels(),
    
    // 项目集成
    setProjectContext(context: ProjectContext),
    addFileReference(filePath: string),
    
    // 导航状态管理
    toggleContentVisibility(),
    setActiveNavItem(item: string),
    
    // 布局管理
    setSidebarWidth(width: number),
    resetSidebarWidth()
  }
})
```

## 🎯 开发优先级

### Phase 1 - 基础功能 (MVP)
- ✅ 基础UI组件搭建
- ✅ 选项卡系统（支持多行换行）
- ✅ 消息发送/接收
- ✅ LocalStorage存储
- ✅ 模型选择器
- ✅ 可调节分隔器组件

### Phase 2 - 增强功能
- 🔄 流式响应显示
- 🔄 文件引用系统
- 🔄 代码高亮
- 🔄 工具箱功能
- 🔄 对话导出
- 🔄 文档解析器特殊处理

### Phase 3 - 高级功能
- 📋 项目上下文集成
- 📊 使用统计
- 🎨 主题定制
- 🔧 高级配置
- 🖱️ 拖拽交互优化

## 🔌 技术栈

- **UI框架**: Element Plus (选项卡、对话框、按钮)
- **状态管理**: Pinia Store
- **存储**: LocalStorage + IndexedDB(大文件)
- **样式**: SCSS + Quasar变量
- **类型**: TypeScript
- **图标**: Element Plus Icons + 自定义SVG

## 📝 开发注意事项

1. **性能优化**：大量消息时使用虚拟滚动
2. **内存管理**：限制同时打开的对话数量
3. **错误处理**：网络异常、模型调用失败的优雅处理
4. **用户体验**：加载状态、进度指示、操作反馈
5. **数据安全**：敏感信息不存储在localStorage
6. **响应式设计**：适配不同屏幕尺寸
7. **特殊处理**：文档解析器按钮不影响左侧栏状态管理
8. **布局约束**：左侧栏宽度限制在280-600px范围内
9. **多行标签**：Element Plus Tabs需要自定义CSS实现换行
10. **分隔器交互**：确保拖拽时的流畅性和边界检查