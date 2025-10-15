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

我看到对话在我准备输出设计文档时被截断了。现在需要我继续完成这个LLM对话功能的详细设计文档吗？

[1 tool called]

现在我完全了解了上下文。让我为你输出完整的LLM对话功能设计文档：

# 🤖 项目页面LLM对话功能设计文档

## 📋 项目概述

为Nimbria项目的左侧栏添加AI助手对话功能，实现与项目文件的智能交互和代码辅助。

## 🏗️ 架构设计

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

## 🎨 界面设计规范

### 整体布局 (280px宽度)
```
┌─────────────────────────────────┐
│ [对话1] [对话2] [+]      [🔧]   │ ← 选项卡 + 工具箱
├─────────────────────────────────┤
│                                 │
│         消息区域                 │ ← 对话内容
│    (滚动区域，高度自适应)         │
│                                 │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 输入框...                   │ │ ← 输入区域
│ └─────────────────────────────┘ │
│ [🤖 模型] [📎] [🎯] [📤发送]    │ ← 工具栏
└─────────────────────────────────┘
```

### 选项卡设计
- **Element Plus Tabs组件**
- **最大显示3个对话标签**，超出显示滚动
- **右侧工具箱按钮**固定位置
- **新建对话**自动生成标题"对话 N"

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
    projectContext: null
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
    addFileReference(filePath: string)
  }
})
```

## 🎯 开发优先级

### Phase 1 - 基础功能 (MVP)
- ✅ 基础UI组件搭建
- ✅ 选项卡系统
- ✅ 消息发送/接收
- ✅ LocalStorage存储
- ✅ 模型选择器

### Phase 2 - 增强功能
- 🔄 流式响应显示
- 🔄 文件引用系统
- 🔄 代码高亮
- 🔄 工具箱功能
- 🔄 对话导出

### Phase 3 - 高级功能
- 📋 项目上下文集成
- 📊 使用统计
- 🎨 主题定制
- 🔧 高级配置

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