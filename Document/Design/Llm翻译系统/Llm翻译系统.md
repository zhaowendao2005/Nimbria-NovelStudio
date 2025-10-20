# 🎨 **Llm Translate 批量翻译系统 UI/UX 设计方案**

## 📋 **系统概览**

这是一个完整的批量翻译工作流系统，包含三个核心模块：
1. **任务配置模块** - Token估算与任务设置
2. **批次管理模块** - 任务执行与状态监控
3. **结果导出模块** - 线程预览与内容导出

---

## 🏗️ **整体架构设计**

```
┌─────────────────────────────────────────────────────┐
│  LlmTranslate - 多页面应用                           │
├─────────────────────────────────────────────────────┤
│  [🏠 首页] [📋 任务管理] [💾 结果导出] [⚙️ 设置]      │  ← Tab 导航栏
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │  页面内容区                                     │  │
│  │                                                 │  │
│  │  首页: 配置面板 + 批次提交                     │  │
│  │  任务管理: 左侧批次列表 + 中心任务列表        │  │
│  │  结果导出: 导出配置 + 文件选择                │  │
│  │                                                 │  │
│  └───────────────────────────────────────────────┘  │
│                                                       │
└─────────────────────────────────────────────────────┘
```

**系统分页设计**：
- **首页 (Home)**：输入配置 + Token估算 + 参数设置 + 批次提交
- **任务管理 (Task Manager)**：批次列表 + 任务监控 + 实时状态追踪
- **结果导出 (Export)**：线程预览 + 批量导出 + 统计分析

---

## 📑 **页面导航与路由设计**

### **顶部导航栏**
```
┌─────────────────────────────────────────────────────┐
│ Llm Translate  [🏠 首页] [📋 任务管理] [💾 结果导出]   │
│                                    [⚙️ 设置] [👤 用户] │
└─────────────────────────────────────────────────────┘
```

### **页面路由映射**

| 页面 | 路由 | 主要功能 | 左侧栏 | 中心区 | 右侧栏 |
|------|------|---------|--------|--------|--------|
| 首页 | `/` | 配置任务、批次提交 | - | 配置面板 | - |
| 任务管理 | `/tasks` | 监控执行、预览线程 | 批次列表 | 任务列表 | 线程详情(抽屉) |
| 结果导出 | `/export` | 导出结果、统计分析 | 批次列表 | 导出配置 | - |

---

## 💎 **详细设计方案**

### **第一部分：首页 - 配置面板**

#### **UI 布局结构**
```
┌─────────────────────────┐
│  输入配置区              │
├─────────────────────────┤
│ [Tab: 文件] [Tab: 文本]  │  ← 输入源切换
├─────────────────────────┤
│ 📁 文件上传               │
│ [选择文件] [显示文件名]   │
├─────────────────────────┤
│ 系统提示词配置           │
│ ┌─────────────────────┐  │
│ │ 请输入系统提示词... │  │
│ │ (多行文本框)       │  │
│ └─────────────────────┘  │
│ ℹ️ 默认: [使用默认提示词]│
├─────────────────────────┤
│ Token 估算结果           │
│ ┌──────────────────────┐│
│ │ 输入内容: X tokens  ││
│ │ 系统提示: Y tokens  ││
│ │ 总计: Z tokens      ││
│ │ 费用预估: ¥XXX      ││
│ └──────────────────────┘│
├─────────────────────────┤
│ 分片策略配置             │
│ ◉ 按照行数分片           │
│   └─ 每批行数: [___]    │
│ ○ 按照Token分片          │
│   └─ 每批Token: [___]   │
│ ⚠️ 注意: 不会在行中截断 │
├─────────────────────────┤
│ 并发控制                 │
│ 每分钟最高并发: [_____] │
│ (推荐: 1~5)             │
├─────────────────────────┤
│ 回复配置                 │
│ ◉ 预计回复Token         │
│   └─ 每个回复预计:      │
│       [_____] tokens   │
│ ○ 等额回复模式           │
│   └─ 自动检测等长内容   │
│ ℹ️ 用于流式进度估算      │
├─────────────────────────┤
│ 模型选择                 │
│ [下拉框: GPT-4 ▼]      │
│                         │
├─────────────────────────┤
│ 输出配置                 │
│ [选择输出目录] [默认]    │
│ 📍 D:\output\translate\ │
└─────────────────────────┘
```

#### **交互细节**

1. **输入源切换**
   - 两个 Tab：「文件」和「文本」
   - 文件 Tab：显示文件选择器、文件预览（首100字）、文件大小
   - 文本 Tab：显示大型文本框，支持拖拽粘贴

2. **Token 估算区**
   - **实时计算**：输入时动态更新
   - 显示明细：输入内容 Token 数 + 系统提示词 Token 数
   - 支持**费用预估**（基于选定模型的价格表）
   - "ℹ️ 预估值仅供参考，实际以API返回为准"

3. **分片策略**
   - 两个单选按钮：按行数 / 按 Token
   - **关键约束**："不会在一行中间截断"（重要提示）
   - 行数分片：适合结构化文本（如代码、对话）
   - Token 分片：适合连续段落

4. **回复配置**（新增）
   - **预计回复Token**：用户手动设置每个任务的预期回复长度
   - **等额回复模式**：系统自动检测等长内容
   - 作用：与流式传输结合，实时显示进度条
   - "ℹ️ 当启用时，任务卡片会显示动态进度条"

5. **并发控制**
   - 滑块 + 数字输入框
   - 实时显示"预计耗时"（基于内容量和并发数）
   - 警告提示：超过推荐值时显示"⚠️ 过高的并发可能被限流"

#### **底部操作栏**
```
┌──────────────────────────────────────────┐
│ [预览配置] [开始翻译] [保存草稿] [清空]  │
└──────────────────────────────────────────┘
```

**按钮说明**：
- **开始翻译**：创建新批次并跳转到「任务管理」页
- **预览配置**：弹出模态框展示配置摘要
- **保存草稿**：保存当前配置，下次打开时自动恢复
- **清空**：重置所有设置到默认值

---

### **第二部分：任务管理页**

#### **页面整体布局**
```
┌─────────────────────────────────────────────────────┐
│ [🏠 首页] [📋 任务管理] [💾 结果导出]                 │ ← 顶部导航
├──────────────────┬─────────────────────────────────┤
│  左侧栏: 批次列表 │  中心区: 任务列表 + 工具栏       │
│                  │                                   │
│ ┌──────────────┐ │  📊 统计条                       │
│ │ #001 (进行中)│ │  ├─ 总任务/完成/进行/失败...     │
│ │ #002 (已完成)│ │  │                               │
│ │ #003 (已完成)│ │  🔧 工具栏 (批处理操作)         │
│ │ ...          │ │  ├─ [全选] [重试失败] [暂停]     │
│ │              │ │  └─ [🗑️ 清空]                   │
│ │ [新建批次]   │ │                                   │
│ └──────────────┘ │  📋 任务列表 (竖向卡片)          │
│                  │  ┌──────────────────────────┐    │
│                  │  │ #1241 | 等待中            │    │
│                  │  │ ████░░░░░░ 45%           │    │
│                  │  │ [详情] [重试]             │    │
│                  │  └──────────────────────────┘    │
│                  │  ┌──────────────────────────┐    │
│                  │  │ #1240 | 已完成 ✓          │    │
│                  │  │ ██████████ 100%          │    │
│                  │  │ [详情]                    │    │
│                  │  └──────────────────────────┘    │
│                  │  ... (可滚动)                     │
└──────────────────┴─────────────────────────────────┘
```

#### **左侧批次列表**
```
┌──────────────────────────┐
│ 📚 批次列表              │
├──────────────────────────┤
│                          │
│ 🔹 #20250115-001         │
│   进行中 | 1,250 任务    │
│   ✅ 1,100 ⏳ 45        │
│   [选中] [详情] [暂停]  │
│                          │
│ 🔹 #20250114-005         │
│   已完成 | 800 任务      │
│   ✅ 800 (100%)         │
│   [选中] [详情]         │
│                          │
│ 🔹 #20250114-004         │
│   已完成 | 500 任务      │
│   ✅ 500 (100%)         │
│   [选中] [详情]         │
│                          │
│ ... (可滚动)             │
│                          │
│ ┌──────────────────────┐│
│ │ [➕ 新建批次]        ││
│ └──────────────────────┘│
└──────────────────────────┘
```

#### **顶部统计条**
```
┌─────────────────────────────────────────────┐
│ 📊 当前批次: #20250115-001 | 创建于 14:32:15 │
├─────────────────────────────────────────────┤
│ 总任务: 1,250 │ ✅ 已完成: 1,100 │ ⏳ 进行中: 45 │
│ ⚠️ 限流: 5   │ ❌ 失败: 10      │ ⏸️ 未发送: 90  │
├─────────────────────────────────────────────┤
│ ⏱️ 总耗时: 2h 15m 30s | 预计完成: 14:52:30  │
└─────────────────────────────────────────────┘
```

#### **工具栏（顶部批处理操作）**
```
┌─────────────────────────────────────────────────────┐
│ 🔧 批处理工具栏                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│ [☐ 全选] [🔄 重试失败] [⏸️ 暂停所有]              │
│ [▶️ 恢复] [🗑️ 清空已完成] [📋 导出选中]           │
│                                                      │
│ 📋 过滤器:  ☑ 等待中  ☑ 限流  ☑ 失败  ☑ 未发送   │
│ 🔍 搜索:  [搜索任务ID或内容...]                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### **任务列表区域（竖向卡片布局）**

使用 **竖向排列** 展示任务卡片，支持滚动：

```
┌─────────────────────────────────────────────────┐
│ 📋 任务列表                                       │
├─────────────────────────────────────────────────┤
│                                                  │
│ ╔═══════════════════════════════════════════╗  │
│ ║ #1250 | 🔴 限流(429)                      ║  │ ← 红色高亮
│ ║ 内容预览: "这是一段需要翻译的文本..."     ║  │
│ ║ 发送时间: 14:30:25  耗时: --              ║  │
│ ║ [详情] [重试] [删除]                       ║  │
│ ╚═══════════════════════════════════════════╝  │
│                                                  │
│ ╔═══════════════════════════════════════════╗  │
│ ║ #1249 | 🔵 等待中                         ║  │ ← 蓝色高亮
│ ║ 内容预览: "Another text that needs..."   ║  │
│ ║ 发送时间: 14:30:18  已等待: 12s           ║  │
│ ║ ███░░░░░░░░░░░░░░░░ 25% (500/2000)      ║  │ ← 流式进度条
│ ║ [详情] [取消]                             ║  │
│ ╚═══════════════════════════════════════════╝  │
│                                                  │
│ ╔═══════════════════════════════════════════╗  │
│ ║ #1248 | 🟢 已完成 ✓                       ║  │ ← 绿色高亮
│ ║ 内容预览: "Text completed successfully" ║  │
│ ║ 发送时间: 14:28:45  耗时: 2.3s           ║  │
│ ║ ██████████ 100%                          ║  │
│ ║ [详情] [重新翻译]                         ║  │
│ ╚═══════════════════════════════════════════╝  │
│                                                  │
│ ╔═══════════════════════════════════════════╗  │
│ ║ #1247 | 🟠 错误(网络异常)                ║  │ ← 橙色高亮
│ ║ 内容预览: "Error occurred during..."     ║  │
│ ║ 发送时间: 14:28:30  耗时: --              ║  │
│ ║ [详情] [重试] [删除]                       ║  │
│ ╚═══════════════════════════════════════════╝  │
│                                                  │
│ ╔═══════════════════════════════════════════╗  │
│ ║ #1246 | ⚪ 未发送                          ║  │ ← 灰色高亮
│ ║ 内容预览: "Waiting to be sent..."        ║  │
│ ║ 创建时间: 14:28:15                        ║  │
│ ║ [详情] [发送] [删除]                       ║  │
│ ╚═══════════════════════════════════════════╝  │
│                                                  │
│ ... (向下滚动查看更多任务)                      │
│                                                  │
└─────────────────────────────────────────────────┘
```

#### **卡片内容设计**

**标准任务卡片结构**：
```
┌──────────────────────────────────────────┐
│ 任务ID: #1198 | 🔴 状态标签              │  ← 左侧颜色标记
├──────────────────────────────────────────┤
│ 📝 内容预览:                              │
│ "这是一段需要翻译的文本。今年的春节..." │  (显示前100字)
├──────────────────────────────────────────┤
│ ⏱️ 发送时间: 14:30:25                    │
│ ⌚ 已等待: 20s / 耗时: 2.3s             │
├──────────────────────────────────────────┤
│ 📊 进度条（仅当状态为"等待中"时显示）    │
│ ████░░░░░░░░░░░░░░░░ 45% (900/2000)   │  ← 流式Token进度
│ 💡 基于预计回复2000 tokens计算          │
├──────────────────────────────────────────┤
│ [查看详情] [操作按钮组]                   │
└──────────────────────────────────────────┘
```

**卡片颜色标记**：
```
左边框 | 卡片背景 | 说明
-------|---------|-------
🔴 红  | #FFF1F0 | 已发送且收到限流(429)
🔵 蓝  | #E6F7FF | 已发送且等待回复(脉动)
🟢 绿  | #F6FFED | 已发送且已返回(已完成)
🟠 橙  | #FFF7E6 | 已发送且其他报错
⚪ 灰  | #FAFAFA | 未发送
```

**进度条设计**：
- 仅在「等待中」和「等额回复模式」下显示
- 基于流式回复的 Token 数 vs 预计回复 Token 数
- 实时更新（每100ms）
- 格式：`████░░░░░░ 45% (900/2000 tokens)`
- 支持自动向上取整（若流式到达，进度条自动填满）

**状态标记**：
- ✅ **已完成**：绿色，显示"已完成 ✓"
- ⏳ **等待中**：蓝色脉动，显示"等待中..."，显示进度条
- 🔴 **限流**：红色，显示"限流(429)"，有重试按钮
- 🟠 **错误**：橙色，显示具体错误类型，有重试按钮
- ⚪ **未发送**：灰色，显示"未发送"，有发送按钮

---

### **第三部分：结果导出页 - 线程预览与导出**

#### **线程详情 - 抽屉式弹出**

当点击任务卡片的「详情」按钮时，从**右侧滑出抽屉**展示线程详情：

```
┌────────────────────────────────────────────────────────┐
│ [主任务列表]                    ┌──────────────────────┐│
│                                  │ 线程详情 - 任务#1198 ││
│ ╔═══════════════════╗           ├──────────────────────┤│
│ ║ #1198 | 🔵等待中 ║           │ 状态: 🔵 等待中      ││
│ ║ .....  ║ ────────> │ ↗→ 点击详情 │ 发送时间: 14:30:25  ││
│ ║ [详情] ║           │           │ 耗时: 20s           ││
│ ╚═══════════════════╝           ├──────────────────────┤│
│                                  │ 🔄 流式对话          ││
│ ╔═══════════════════╗           │                      ││
│ ║ #1197 | 🟢已完成 ║           │ ┌──────────────────┐││
│ ║ .....  ║           │           │ │ 14:30:25 [用户] ││││
│ ║ [详情] ║           │           │ │ 原文:            ││││
│ ╚═══════════════════╝           │ │ > 这是一段需要翻 ││││
│                                  │ │ > 译的文本。今年 ││││
│                                  │ │ > 的春节特别冷...││││
│                                  │ │                  ││││
│                                  │ │ 14:30:45 [LLM]   ││││
│                                  │ │ 翻译结果:        ││││
│                                  │ │ > This is a text ││││
│                                  │ │ > that needs...  ││││
│                                  │ │ ⏳ 翻译中...      ││││
│                                  │ │ ████░░░░░░ 45%  ││││
│                                  │ └──────────────────┘││
│                                  │                      ││
│                                  │ [📋 复制] [💾 保存] ││
│                                  │ [🔄 重新翻译] [X]   ││
│                                  └──────────────────────┘│
└────────────────────────────────────────────────────────┘
```

#### **抽屉内容设计**

```
┌──────────────────────────────────────┐
│ 线程详情 - 任务 #1198                 │  ← 标题
│ [← 返回]               [🔗 分享]     │  ← 控制按钮
├──────────────────────────────────────┤
│ 📊 基本信息                           │
│ • 状态: 🔵 等待中                    │
│ • 发送时间: 2025-01-15 14:30:25     │
│ • 耗时: 20s / 进度: 45% (900/2000)  │
│ • 预计完成: 14:30:50                │
├──────────────────────────────────────┤
│ 💬 AI对话流（支持流式输出）          │
│                                      │
│ ┌──────────────────────────────────┐│
│ │ 14:30:25 [用户]                  ││
│ │ 原文:                            ││
│ │ > 这是一段需要翻译的文本。今年   ││
│ │ > 的春节特别冷，我想有个温暖的  ││
│ │ > 春节...                        ││
│ │                                  ││
│ │ 14:30:45 [LLM] (⏳ 流式传入中)   ││
│ │ 翻译结果:                        ││
│ │ > This is a text that needs      ││
│ │ > translation. This year's       ││
│ │ > spring festival is specially   ││
│ │ > cold, I want a warm spring...  ││
│ │ ⌛ 翻译中... (████░░░░░░ 45%)    ││
│ └──────────────────────────────────┘│
│                                      │
├──────────────────────────────────────┤
│ 🔧 操作按钮                          │
│ [📋 复制原文] [📋 复制翻译]          │
│ [💾 保存到本地] [🔄 重新翻译]       │
│ [⬆️ 编辑并重新翻译] [X 关闭]        │
└──────────────────────────────────────┘
```

**流式输出标记**：
- 当任务在进行中时，显示实时流入的内容
- 加载动画：`⏳ 翻译中...` (或打字动画)
- 进度条：`████░░░░░░ 45%` (基于Token流式进度)
- 完成时自动填满进度条 `██████████ 100%`
- 支持暂停/继续流式输出

---

#### **结果导出面板**

结果导出页面的主要功能区域：

```
┌─────────────────────────────────────────────────────┐
│ 结果导出页                                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 📚 批次选择                                          │
│ [选择批次: #20250115-001 ▼]                         │
│ 该批次: 1,250 任务 | ✅ 完成: 1,230 | ❌ 失败: 20  │
│                                                      │
├─────────────────────────────────────────────────────┤
│ 📊 导出统计                                          │
│ • 已完成任务: 1,230 个                             │
│ • 总字符数: 525,000                                │
│ • 文件大小(预估): 1.2 MB                           │
│ • 导出时间预估: ~3s                                │
│                                                      │
├─────────────────────────────────────────────────────┤
│ 🎯 导出内容选择                                      │
│ ☑ 仅导出完成的任务                                 │
│ ☐ 包含失败任务 (标注为失败)                        │
│ ☐ 包含未发送任务                                   │
│                                                      │
├─────────────────────────────────────────────────────┤
│ 📋 导出格式选择                                      │
│ ◉ 并排格式 (原文 | 翻译)                           │
│ ○ 分段格式 (原文后跟翻译)                          │
│ ○ JSON 格式 (结构化)                               │
│ ○ CSV 格式 (表格)                                  │
│                                                      │
├─────────────────────────────────────────────────────┤
│ 🔧 内容过滤                                          │
│ ☑ 包含原文                                         │
│ ☑ 包含翻译                                         │
│ ☐ 包含元数据 (时间/token/费用)                    │
│ ☐ 包含状态信息 (是否成功等)                       │
│                                                      │
├─────────────────────────────────────────────────────┤
│ 📁 输出配置                                          │
│ [选择输出目录] D:\output\translate\                │
│ 文件名: translate_#20250115-001_20250115143000.txt │
│                                                      │
├─────────────────────────────────────────────────────┤
│ [预览] [导出为TXT] [导出为CSV]                     │
│ [导出为JSON] [导出为Excel] [打开目录]             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### **3. 统计分析标签页（结果导出页内）**

```
┌─────────────────────────────────────┐
│ 📊 统计分析                          │
├─────────────────────────────────────┤
│                                      │
│ 📈 基础统计                         │
│ ├─ 成功率: 98.4% (1,230/1,250)     │
│ ├─ 平均耗时: 1.2s/任务              │
│ ├─ 总成本: ¥12.50                  │
│ └─ 总Token数: 450,000              │
│                                      │
│ 📊 失败分析                         │
│ ├─ 限流(429): 10 次                │
│ ├─ 网络错误: 5 次                  │
│ ├─ 其他错误: 5 次                  │
│ └─ 建议: 降低并发数或增加延迟      │
│                                      │
│ ⏱️ 时间分析                         │
│ ├─ 快速完成(< 1s): 800            │
│ ├─ 正常完成(1-3s): 350            │
│ └─ 缓慢完成(> 3s): 80             │
│                                      │
│ 💰 成本分析                         │
│ ├─ 输入Token成本: ¥8.00            │
│ ├─ 输出Token成本: ¥4.50            │
│ └─ 平均成本/任务: ¥0.010           │
│                                      │
│ 📉 性能趋势图                        │
│ (显示任务完成速度随时间的变化)      │
│                                      │
└─────────────────────────────────────┘
```

---

## 🔄 **完整用户工作流**

### **流程 1：初次使用流程 - 首页配置**

```
1. 打开LlmTranslate应用，进入首页
   ↓
2. 选择输入源（文件/文本）
   ↓
3. 上传/粘贴内容
   ↓
4. 检查Token估算和费用预估
   ↓
5. 配置分片策略和并发限制
   ↓
6. [新增] 设置回复模式（预计Token / 等额模式）
   ↓
7. [可选] 自定义系统提示词
   ↓
8. 选择输出目录
   ↓
9. 点击"开始翻译" → 自动创建批次并跳转到任务管理页
```

### **流程 2：任务监控流程 - 任务管理页**

```
1. 进入「任务管理」页，查看左侧批次列表
   ↓
2. 选择要监控的批次（或使用当前批次）
   ↓
3. 监控中心任务列表
   - 观察各个任务卡片的状态变化
   - 根据颜色标记快速判断状态
   - 关注进度条（实时显示流式回复进度）
   ↓
4. [可选] 使用工具栏进行批处理
   - 全选 + 重试失败
   - 暂停/恢复全局执行
   - 清空已完成任务
   ↓
5. [可选] 点击任务卡片的「详情」按钮
   - 右侧抽屉弹出线程详情
   - 实时查看AI对话内容
   - 支持流式输出可视化
   ↓
6. 等待批次完成（或手动停止）
```

### **流程 3：结果导出流程 - 结果导出页**

```
1. 进入「结果导出」页
   ↓
2. 选择要导出的批次
   ↓
3. 查看导出统计（任务数、字符数、预估大小）
   ↓
4. 选择导出格式和内容过滤条件
   ↓
5. 设置输出目录
   ↓
6. 点击「导出」按钮
   ↓
7. 导出完成，显示"✅ 已导出到..."
   ↓
8. [可选] 查看「统计分析」标签，了解本批次的表现
```

---

## 🎭 **交互动画与反馈设计**

### **关键动画**

| 场景 | 动画效果 | 持续时间 |
|------|---------|--------|
| 任务卡片进入 | 从底部或侧边滑入，伴有淡入 | 0.3s |
| 等待中脉动 | 卡片左边框蓝色脉动闪烁 | 循环 |
| 流式进度条 | 进度条平滑增长（每100ms更新一次） | 实时 |
| 任务完成 | 卡片颜色从蓝变绿，伴有✓图标闪烁 | 0.4s |
| Token估算 | 数字从旧值滚动到新值 | 0.3s |
| 限流提示 | 红色边框闪烁 + 轻微震动效果 | 1s |
| 抽屉弹出 | 从右侧边界平滑滑入 | 0.3s |
| 抽屉关闭 | 平滑滑出至右侧边界 | 0.2s |
| 打字效果 | LLM回复区域显示打字/流式输入动画 | 实时 |

### **状态颜色变化动画**

```
未发送(灰) → 已发送(蓝) → 流式接收中(蓝脉动) → 已完成(绿✓)
              ↓
         [可能出现]
         限流(红) → 重试中(橙) → ...
         错误(橙) → 重试中(橙) → ...
```

### **用户反馈**

**成功提示**（右上角 Toast，持续 3s）：
```
✅ 已添加 1,250 个任务到批次 #20250115-001
预计耗时: 1h 45m (基于当前设置)
[去查看] [关闭]
```

**警告提示**：
```
⚠️ 当前并发过高，建议 ≤ 3，否则易被限流
```

**进度通知**（任务监控页面）：
```
📊 批次进度: 85% 完成
✅ 1,062 已完成 | ⏳ 45 进行中 | ⚠️ 143 需要重试
```

**错误提示**：
```
❌ 上传失败: 文件大小超过 50MB 限制
[重新选择] [关闭]
```

---

## 📐 **响应式设计**

### **宽屏布局（≥1400px）- 任务管理页**
```
┌──────────────┬────────────────────────────┐
│ 左侧栏:      │  中心区: 任务列表          │
│ 批次列表    │  (占主要空间)              │
│ (左15%)      │  (中85%)                   │
└──────────────┴────────────────────────────┘

抽屉从右侧弹出，覆盖任务列表，保留左侧批次列表
```

### **标准屏幕（1024-1399px）- 任务管理页**
```
┌──────────┬──────────────────────┐
│ 左侧栏  │  中心区: 任务列表     │
│ (收起)   │  (占主要空间)         │
│ 🔽      │                        │
└──────────┴──────────────────────┘

左侧栏自动折叠为侧边栏图标，可点击展开。
抽屉从右侧弹出。
```

### **小屏设备（< 1024px）**

**任务管理页**：
- 隐藏左侧批次列表，使用顶部标签切换：「当前批次」→ 批次选择菜单
- 任务列表全屏显示
- 抽屉改为模态框展示（全屏或大型浮窗）

**首页（配置页）**：
- 配置面板垂直排列
- 所有输入框响应式自适应
- 按钮单列排列

**结果导出页**：
- 所有配置单列排列
- 导出按钮组垂直显示

---

## 🎨 **颜色与设计系统**

### **状态颜色定义**

| 状态 | 左边框 | 背景色 | 文字色 | 使用场景 |
|------|--------|--------|--------|---------|
| 已完成 | 🟢 `#67C23A` | `#F6FFED` | `#52C41A` | 已发送且已返回 |
| 等待中 | 🔵 `#409EFF` | `#E6F7FF` | `#1890FF` | 已发送且等待回复(脉动) |
| 限流 | 🔴 `#F56C6C` | `#FFF1F0` | `#FF4D4F` | 已发送且收到429 |
| 错误 | 🟠 `#E6A23C` | `#FFF7E6` | `#FA8C16` | 已发送且其他报错 |
| 未发送 | ⚪ `#909399` | `#FAFAFA` | `#595959` | 未发送 |

### **进度条颜色**
- **背景**：`#F0F0F0`（浅灰）
- **填充（进行中）**：`#409EFF`（蓝色）
- **填充（完成）**：`#67C23A`（绿色）
- **填充（错误/限流）**：`#F56C6C`（红色）

### **样式规范**

**卡片样式**：
- 边框：`1px solid` + 状态颜色
- 左边框：`4px solid` + 状态颜色
- 背景：状态背景色
- 圆角：`8px`
- 阴影：`0 2px 8px rgba(0,0,0,0.08)`
- 悬停效果：`0 4px 16px rgba(0,0,0,0.12)`，向上偏移 `2px`

**进度条样式**：
- 高度：`4px`
- 圆角：`2px`
- 背景：`#F0F0F0`
- 填充：根据状态使用不同颜色

**字体排版**：
- 主体：`14px`（系统字体栈）
- 标题：`16px` 加粗
- 小字：`12px`
- 行高：`1.5`

**间距规范**：
- 卡片内间距：`16px`
- 卡片间距：`12px`
- 板块间距：`24px`
- 按钮间距：`8px`

### **暗色模式支持**

```
已完成 (暗): 背景 `#1B6623` | 文字 `#95DE64`
等待中 (暗): 背景 `#0E2A45` | 文字 `#85C5FF`
限流 (暗):   背景 `#581B1B` | 文字 `#FF9C9C`
错误 (暗):   背景 `#4A3900` | 文字 `#FFC069`
未发送 (暗): 背景 `#262626` | 文字 `#BFBFBF`
```

---

## 🚀 **高级功能设想**

### **第一阶段可实现**

1. **自动重试策略**
   - 限流自动降并发重试
   - 可配置重试次数和间隔

2. **批次对比分析**
   - 对比多个批次的成功率、成本、速度
   - 帮助用户优化参数

3. **预设模板**
   - 保存常用配置为模板
   - 快速切换不同场景（快速/精确/经济）

4. **任务导入/导出**
   - 从 CSV/JSON 导入待翻译内容
   - 支持断点续传

### **未来可扩展**

1. **定时任务**
   - 支持设置每日自动翻译
   - 条件触发（如文件变化时）

2. **多语言支持**
   - 支持多个目标语言
   - 同一批次多语言并行处理

3. **团队协作**
   - 任务分享和审核
   - 协作翻译反馈
   - 权限管理

4. **质量评分**
   - 用户对翻译结果打分
   - AI 学习和优化
   - 建立质量基准

5. **成本优化**
   - 支持多模型自动选择（快速/精确）
   - 批量优惠定价
   - 智能成本预测

6. **高级分析**
   - 词汇难度分析
   - 翻译一致性检查
   - 质量度量仪表板

---

## 📝 **总结：完整的闭环设计**

### **核心优势**

✅ **多页面设计**：分离关注点，每个页面专注于单一功能流程

✅ **配置层（首页）**：完整的参数设置，包括输入、模型、并发、回复模式、输出

✅ **执行层（任务管理）**：实时的任务监控，竖向卡片展示，颜色高亮 + 进度条结合

✅ **预览层（抽屉弹出）**：聊天界面风格的线程详情，支持流式输出和实时Token进度

✅ **导出层（结果导出）**：灵活的导出选项，满足多种输出需求和格式

✅ **反馈层（统计分析）**：详细的批次表现分析，帮助用户优化参数

### **关键创新点**

🔥 **流式Token进度条**：
- 根据预计回复Token + 流式实时Token，动态显示进度
- 提供视觉反馈，让用户了解任务进度

🔥 **颜色 + 图标 + 进度条三层反馈**：
- 颜色快速识别状态
- 图标提供语义信息  
- 进度条展示实时进度

🔥 **抽屉式线程详情**：
- 无需离开任务列表，点击即预览
- 支持流式输出的实时显示
- 支持在详情中进行快速操作（重新翻译等）

🔥 **批处理工具栏**：
- 支持大批量任务的快速操作
- 减少重复点击

---

## 🎯 **设计原则**

1. **信息清晰度**：用颜色 + 进度条 + 文字三层传达信息
2. **操作高效性**：批处理 + 快捷操作 + 快速预览
3. **视觉反馈**：每个操作都有明确的动画和状态变化
4. **响应式适配**：支持从小屏到大屏的完整体验
5. **可扩展性**：架构支持未来功能的平滑扩展

---

## 🛠️ **技术实现指南**

### **1. Flex 布局与滚动规范**

#### **高度控制原则**
- **顶部导航栏**：固定高度 `60px`，`height: 60px`
- **左侧栏**：自动填充剩余高度，`flex: 0 0 auto`
- **中心内容区**：自动填充，`flex: 1 1 auto`，`min-height: 0`
- **底部工具栏**：固定高度 `60px`

#### **垂直滚动规范**
- **原则**：仅在需要滚动的元素上设置 `overflow-y: auto`
- **其他元素**：设置 `overflow: hidden`
- **Flex 容器链**：所有垂直 Flex 容器必须设置 `min-height: 0`
- **实例**：任务列表卡片区需要滚动 → 该区设 `overflow-y: auto`；其他区设 `overflow: hidden`

#### **布局示例代码**
```vue
<template>
  <div class="llm-translate-container" style="display: flex; flex-direction: column; height: 100vh; overflow: hidden;">
    <!-- 顶部导航栏 -->
    <div class="navbar" style="flex: 0 0 60px; overflow: hidden;">
      <!-- 导航内容 -->
    </div>

    <!-- 中心内容区 -->
    <div class="main-content" style="flex: 1 1 auto; display: flex; min-height: 0; overflow: hidden;">
      <!-- 左侧栏 -->
      <div class="sidebar" style="flex: 0 0 250px; overflow-y: auto;">
        <!-- 批次列表 -->
      </div>

      <!-- 中心任务列表 -->
      <div class="center-panel" style="flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
        <!-- 统计条 -->
        <div class="stats-bar" style="flex: 0 0 auto;">
          <!-- 统计内容 -->
        </div>

        <!-- 工具栏 -->
        <div class="toolbar" style="flex: 0 0 60px; overflow: hidden;">
          <!-- 工具栏内容 -->
        </div>

        <!-- 任务列表（支持滚动） -->
        <div class="task-list" style="flex: 1 1 auto; min-height: 0; overflow-y: auto;">
          <!-- 任务卡片 -->
        </div>
      </div>
    </div>
  </div>
</template>
```

---

### **2. 组件库与UI框架**

**使用 Element Plus 作为UI组件库**：
- **表单组件**：`el-input`, `el-select`, `el-radio-group`, `el-checkbox`
- **容器组件**：`el-card`, `el-drawer`
- **交互组件**：`el-button`, `el-message`, `el-notification`
- **数据展示**：`el-progress`, `el-tag`, `el-badge`

**CSS 框架**：自定义 SCSS 或 Tailwind CSS

---

### **3. 数据管理架构 - 三层设计**

采用 **Vue 组件 → Store → DataSource** 的三层数据架构，核心优势：

**🎯 单一开关切换 Mock ↔ 真实后端**：只需修改 DataSource 中的 `useMock` 开关！

#### **第一层：Mock 数据** (`LlmTranslate.mock.ts`)

定义所有测试数据，开发时直接使用：

```typescript
// 文件：LlmTranslate.mock.ts
export const mockBatchList = [
  {
    id: '#20250115-001',
    status: 'running',
    totalTasks: 1250,
    completedTasks: 1100,
    failedTasks: 10,
    createdAt: '2025-01-15 14:32:15'
  },
  // ... 更多批次
];

export const mockTaskList = [
  {
    id: '#1250',
    status: 'throttled',
    content: '这是一段需要翻译的文本...',
    sentTime: '14:30:25',
    replyTokens: 900,
    predictedTokens: 2000
  },
  // ... 更多任务
];
```

#### **第二层：DataSource 层** (`LlmTranslate.datasource.ts`)

**核心逻辑**：管理数据来源的切换和计算逻辑

```typescript
// 文件：LlmTranslate.datasource.ts
import { mockBatchList, mockTaskList } from './mock/LlmTranslate.mock';
import { API_BASE_URL } from '@config';

export class LlmTranslateDataSource {
  // ⭐ 单一开关：改这里就能切换 Mock ↔ 真实后端
  private useMock = true; // 开发阶段 = true，生产 = false

  /**
   * 获取批次列表
   * - useMock = true → 返回 mockBatchList
   * - useMock = false → 调用真实 API
   */
  async getBatchList() {
    if (this.useMock) {
      return mockBatchList;
    }
    
    // 真实 API 调用
    const response = await fetch(`${API_BASE_URL}/batches`);
    return response.json();
  }

  /**
   * 获取特定批次的任务列表
   */
  async getTaskList(batchId: string) {
    if (this.useMock) {
      return mockTaskList.filter(task => task.batchId === batchId);
    }

    const response = await fetch(`${API_BASE_URL}/batches/${batchId}/tasks`);
    return response.json();
  }

  /**
   * 计算进度百分比
   * 基于实时回复 Token 数 vs 预计 Token 数
   */
  calculateProgress(replyTokens: number, predictedTokens: number): number {
    return Math.min(Math.round((replyTokens / predictedTokens) * 100), 100);
  }

  /**
   * 计算预计完成时间
   */
  calculateEstimatedTime(
    completedTasks: number,
    totalTasks: number,
    avgTimePerTask: number
  ): number {
    const remainingTasks = totalTasks - completedTasks;
    return remainingTasks * avgTimePerTask;
  }

  // 更多数据处理方法...
}
```

#### **第三层：Store 层** (`LlmTranslate.store.ts`)

**职责**：管理状态，调用 DataSource 获取和更新数据

```typescript
// 文件：LlmTranslate.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { LlmTranslateDataSource } from './datasource/LlmTranslate.datasource';

export const useLlmTranslateStore = defineStore('llmTranslate', () => {
  const dataSource = new LlmTranslateDataSource();

  // ========== 状态定义 ==========
  
  // 配置状态
  const config = ref({
    inputSource: 'file',
    content: '',
    systemPrompt: '',
    chunkStrategy: 'line',
    chunkSize: 50,
    concurrency: 3,
    replyMode: 'predicted',
    predictedTokens: 2000,
    outputDir: ''
  });

  // 批次状态
  const batchList = ref([]);
  const currentBatch = ref(null);
  const batchStats = computed(() => {
    if (!currentBatch.value) return null;
    return {
      totalTasks: currentBatch.value.totalTasks,
      completedTasks: currentBatch.value.completedTasks,
      failedTasks: currentBatch.value.failedTasks,
      successRate: (currentBatch.value.completedTasks / currentBatch.value.totalTasks) * 100
    };
  });

  // 任务状态
  const taskList = ref([]);
  const selectedTasks = ref([]);
  const taskFilters = ref({
    status: ['waiting', 'throttled', 'error', 'unsent'],
    searchText: ''
  });

  // UI 状态
  const threadDrawer = ref({ isOpen: false, currentTaskId: null });

  // ========== 数据操作方法 ==========

  /**
   * 加载批次列表
   * 调用 DataSource，自动处理 Mock/真实后端切换
   */
  const fetchBatchList = async () => {
    try {
      batchList.value = await dataSource.getBatchList();
    } catch (error) {
      console.error('Failed to fetch batch list:', error);
      // 错误处理...
    }
  };

  /**
   * 加载任务列表
   */
  const fetchTaskList = async (batchId: string) => {
    try {
      taskList.value = await dataSource.getTaskList(batchId);
      // 更新任务的进度百分比
      taskList.value.forEach(task => {
        task.progress = dataSource.calculateProgress(
          task.replyTokens,
          task.predictedTokens
        );
      });
    } catch (error) {
      console.error('Failed to fetch task list:', error);
    }
  };

  /**
   * 创建新批次
   */
  const createBatch = async (configData) => {
    try {
      // 使用 DataSource 处理创建逻辑
      const newBatch = await dataSource.createBatch(configData);
      currentBatch.value = newBatch;
      await fetchBatchList();
      return newBatch;
    } catch (error) {
      console.error('Failed to create batch:', error);
      throw error;
    }
  };

  /**
   * 重试失败的任务
   */
  const retryFailedTasks = async (batchId: string) => {
    try {
      await dataSource.retryTasks(batchId);
      await fetchTaskList(batchId);
    } catch (error) {
      console.error('Failed to retry tasks:', error);
    }
  };

  // ========== 计算属性 ==========

  const filteredTaskList = computed(() => {
    return taskList.value.filter(task => {
      const statusMatch = taskFilters.value.status.includes(task.status);
      const searchMatch = !taskFilters.value.searchText ||
        task.id.includes(taskFilters.value.searchText) ||
        task.content.includes(taskFilters.value.searchText);
      return statusMatch && searchMatch;
    });
  });

  return {
    // 状态
    config,
    batchList,
    currentBatch,
    batchStats,
    taskList,
    filteredTaskList,
    selectedTasks,
    taskFilters,
    threadDrawer,

    // 方法
    fetchBatchList,
    fetchTaskList,
    createBatch,
    retryFailedTasks,
    // ... 更多方法
  };
});
```

#### **第四层：Vue 组件** (使用 Store)

```vue
<template>
  <div class="llm-translate-page">
    <!-- 任务列表 -->
    <div class="task-list">
      <TaskCard 
        v-for="task in store.filteredTaskList" 
        :key="task.id"
        :task="task"
        @click="store.threadDrawer.currentTaskId = task.id; store.threadDrawer.isOpen = true"
      />
    </div>

    <!-- 线程详情抽屉 -->
    <ThreadDrawer 
      v-if="store.threadDrawer.isOpen"
      :task="getTaskById(store.threadDrawer.currentTaskId)"
      @close="store.threadDrawer.isOpen = false"
    />
  </div>
</template>

<script setup>
import { useLlmTranslateStore } from '@stores/LlmTranslate.store';
import TaskCard from './components/TaskCard.vue';
import ThreadDrawer from './components/ThreadDrawer.vue';

const store = useLlmTranslateStore();

// 页面加载时获取数据
onMounted(() => {
  store.fetchBatchList();
  if (store.currentBatch) {
    store.fetchTaskList(store.currentBatch.id);
  }
});
</script>
```

#### **切换 Mock ↔ 真实后端**

只需改一个地方（DataSource 中的开关）：

```typescript
// DataSource.ts - 第 5 行
private useMock = true;  // ← 改这里即可
// true = Mock 模式（开发）
// false = 真实后端（生产）
```

**完全无需修改** Store 和 Vue 组件！

---

### **4. 文件架构修改树**

```
Nimbria/Client/GUI/DemoPage/LlmTranslate/
├── LlmTranslatePage.vue                 ⭐ 页面主入口
├── index.ts                             ⭐ 统一导出入口
│
├── stores/                              ⭐ Store 目录
│   ├── index.ts                         ⭐ Store 导出入口
│   ├── LlmTranslate.store.ts            ⭐ Pinia Store（包含数据获取逻辑）
│   ├── mock.ts                          ⭐ Mock 数据定义
│   └── types.ts                         ⭐ Store 类型定义
│
├── composables/                         ⭐ Composables 目录
│   ├── index.ts                         ⭐ Composables 导出入口
│   ├── useTaskManagement.ts             ⭐ 任务管理逻辑
│   ├── useBatchManagement.ts            ⭐ 批次管理逻辑
│   ├── useExportService.ts              ⭐ 导出相关逻辑
│   └── types.ts                         ⭐ Composables 类型定义
│
├── types/                               ⭐ Types 目录
│   ├── index.ts                         ⭐ Types 导出入口
│   ├── task.ts                          ⭐ 任务相关类型
│   ├── batch.ts                         ⭐ 批次相关类型
│   ├── config.ts                        ⭐ 配置相关类型
│   └── api.ts                           ⭐ API 相关类型
│
└── components/                          ⭐ 组件目录（可选，如果组件多）
    ├── HomePage.vue                     ⭐ 首页配置面板
    ├── TaskManagePage.vue               ⭐ 任务管理页面
    ├── ExportPage.vue                   ⭐ 结果导出页面
    └── ThreadDrawer.vue                 ⭐ 线程详情抽屉
```

**关键说明：**
- ✅ 所有代码**完全内聚**在 `LlmTranslate/` 目录下
- ✅ Mock 数据在 `stores/mock.ts` 中定义
- ✅ 业务逻辑在 `composables/` 目录中分类管理
- ✅ 类型定义在 `types/` 目录中组织
- ✅ 一个 `index.ts` 统一导出所有功能

---

### **5. 核心代码组织**

#### **stores/mock.ts - Mock 数据定义**

```typescript
// 文件：stores/mock.ts
export const mockBatchList = [
  {
    id: '#20250115-001',
    status: 'running',
    totalTasks: 1250,
    completedTasks: 1100,
    failedTasks: 10,
    createdAt: '2025-01-15 14:32:15'
  }
  // ... 更多批次
];

export const mockTaskList = [
  {
    id: '#1250',
    status: 'throttled',
    content: '这是一段需要翻译的文本...',
    sentTime: '14:30:25',
    replyTokens: 900,
    predictedTokens: 2000
  }
  // ... 更多任务
];
```

#### **stores/LlmTranslate.store.ts - Pinia Store**

```typescript
// 文件：stores/LlmTranslate.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mockBatchList, mockTaskList } from './mock'
import type { Batch, Task } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const useLlmTranslateStore = defineStore('llmTranslate', () => {
  // ⭐ 单一开关：改这里切换 Mock ↔ 真实后端
  const useMock = import.meta.env.MODE === 'development'

  // ========== 状态定义 ==========
  const batchList = ref<Batch[]>([])
  const currentBatch = ref<Batch | null>(null)
  const taskList = ref<Task[]>([])
  const selectedTasks = ref<string[]>([])
  
  // ========== 数据获取方法 ==========
  
  /**
   * 获取批次列表 - 支持 Mock/真实后端切换
   */
  const fetchBatchList = async () => {
    if (useMock) {
      batchList.value = mockBatchList
    } else {
      const response = await fetch(`${API_BASE_URL}/batches`)
      batchList.value = await response.json()
    }
  }

  /**
   * 获取任务列表 - 支持 Mock/真实后端切换
   */
  const fetchTaskList = async (batchId: string) => {
    if (useMock) {
      taskList.value = mockTaskList.filter(t => t.batchId === batchId)
    } else {
      const response = await fetch(`${API_BASE_URL}/batches/${batchId}/tasks`)
      taskList.value = await response.json()
    }
    
    // 计算进度
    taskList.value.forEach(task => {
      task.progress = calculateProgress(task.replyTokens, task.predictedTokens)
    })
  }

  /**
   * 计算进度百分比
   */
  const calculateProgress = (replyTokens: number, predictedTokens: number): number => {
    return Math.min(Math.round((replyTokens / predictedTokens) * 100), 100)
  }

  return {
    batchList,
    currentBatch,
    taskList,
    selectedTasks,
    fetchBatchList,
    fetchTaskList,
    calculateProgress
  }
})
```

#### **composables/useTaskManagement.ts - 业务逻辑**

```typescript
// 文件：composables/useTaskManagement.ts
import { useLlmTranslateStore } from '../stores'
import { ref } from 'vue'

export function useTaskManagement() {
  const store = useLlmTranslateStore()
  const isLoading = ref(false)

  /**
   * 加载任务列表
   */
  const loadTasks = async (batchId: string) => {
    isLoading.value = true
    try {
      await store.fetchTaskList(batchId)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 重试失败任务
   */
  const retryFailedTasks = async () => {
    const failedTasks = store.taskList.filter(t => t.status === 'error')
    // ... 重试逻辑
  }

  return {
    isLoading,
    loadTasks,
    retryFailedTasks
  }
}
```

#### **types/task.ts - 类型定义**

```typescript
// 文件：types/task.ts
export interface Task {
  id: string
  batchId: string
  status: 'unsent' | 'waiting' | 'throttled' | 'error' | 'completed'
  content: string
  sentTime: string
  replyTokens: number
  predictedTokens: number
  progress: number
}

export interface TaskStats {
  total: number
  completed: number
  failed: number
  successRate: number
}
```

#### **index.ts - 统一导出**

```typescript
// 文件：index.ts
export { default as LlmTranslatePage } from './LlmTranslatePage.vue'
export { useLlmTranslateStore } from './stores'
export * from './stores/types'
export { useTaskManagement, useBatchManagement } from './composables'
export * from './composables/types'
```

---

### **6. 数据流向图**

```
┌─────────────────────────────────────────────────────┐
│ Vue 组件（HomePage、TaskManagePage 等）              │
│ ↓ 调用                                               │
├─────────────────────────────────────────────────────┤
│ Composables（useTaskManagement 等）                 │
│ - 封装业务逻辑                                       │
│ ↓ 调用                                               │
├─────────────────────────────────────────────────────┤
│ Store（useLlmTranslateStore）                       │
│ - ⭐ 单一开关（useMock）控制数据来源                 │
│ ↓ 分流                                               │
├────────────────────────┬────────────────────────────┤
│ Mock 数据              │ 真实后端 API               │
│ stores/mock.ts         │ fetch(`${API_BASE_URL}/..`) │
│ - mockBatchList        │ - GET /api/batches        │
│ - mockTaskList         │ - GET /api/tasks          │
└────────────────────────┴────────────────────────────┘

✅ 切换只需改一处：stores/LlmTranslate.store.ts 的 useMock 变量
```
