# 🎮 MC 配方翻译处理系统 v1.0

一个完整的自动化解决方案，用于解析Minecraft配方日志、提取、翻译和生成优化的JSON索引。

## 📋 系统架构

```
recipes.log (44726行)
    ↓
[阶段1] 解析日志 → recipes.raw.json (200万行)
    ↓
[阶段2] 提取翻译键（去重） → lang.yaml + lang.mapping.json
    ↓
[阶段3] AI翻译 (可选) → lang.cn.yaml
    ↓
[阶段4] 合并翻译 (可选) → recipes.cn.json
    ↓
[阶段5] 生成优化索引 → 多个JSON索引 + 增量数据
```

## 🚀 快速开始

### 前置要求
- Node.js 14+ 
- npm 或 yarn

### 安装依赖

```bash
cd McRecipe
npm install
```

### 基础模式（仅解析和提取）

```bash
npm run all -- --skip-translation
```

这将执行：
1. ✅ 解析日志
2. ✅ 提取翻译键（去重）
3. ✅ 生成优化索引

### 完整模式（包括AI翻译）

#### 第一步：基础处理

```bash
npm run all -- --skip-translation
```

生成文件：
- `output/recipes.raw.json` - 解析后的原始配方
- `output/lang.yaml` - **去重后的英文名称**（用于翻译）
- `output/lang.mapping.json` - ID映射关系

#### 第二步：AI翻译

**1. 配置API密钥**

编辑 `config.yaml`：

```yaml
llm:
  api_key: "sk-..."  # 你的OpenAI API密钥
  base_url: "https://api.openai.com/v1"
  model: "gpt-4o-mini"
  max_concurrent: 5  # 并发数（根据API限制调整）
```

**2. 运行翻译脚本**

```bash
npm run translate
```

脚本会：
- ✓ 读取去重后的 `lang.yaml`
- ✓ 并发调用 OpenAI API
- ✓ 跟踪每个批次的进度
- ✓ 支持断点续传（中断后可继续）
- ✓ 输出翻译结果到 `lang.cn.yaml`

**显示信息示例：**

```
进度: [████████░░░░░░░░░░░░] 40% 1000/2500 (处理中:3) 失败:2
```

#### 第三步：完成处理

```bash
npm run all
```

这将自动：
1. ✅ 检测翻译文件
2. ✅ 合并翻译 → `recipes.cn.json`
3. ✅ 生成所有优化索引

## 📊 生成的文件详解

### 核心文件

| 文件 | 大小 | 用途 |
|------|------|------|
| `recipes.raw.json` | ~200MB | 解析后的原始配方 |
| `lang.yaml` | ~1.5MB | 去重后的英文名称（翻译用） |
| `lang.cn.yaml` | ~1.5MB | 中文翻译结果 |
| `recipes.cn.json` | ~200MB | 带中文翻译的配方 |

### 优化索引

#### 1. **items.index.json** - 物品快速查询
```json
{
  "minecraft:iron_ingot": {
    "name": "Iron Ingot",
    "nameCn": "铁锭",
    "type": "item",
    "recipes": [123, 456, ...],
    "asInput": [...],
    "asOutput": [...]
  }
}
```

#### 2. **platforms.index.json** - 平台索引
```json
{
  "minecraft": {
    "name": "Minecraft",
    "recipes": [100, 200, ...],
    "itemCount": 5000
  }
}
```

#### 3. **recipe.graph.json** - StarChart图数据
用于Sigma.js可视化，包含节点和边的完整定义。

#### 4. **search.index.json** - 全文搜索索引
```json
{
  "items": [
    { "id": "minecraft:iron_ingot", "name": "Iron Ingot", "tags": [...] },
    ...
  ]
}
```

#### 5. **incremental/** - 按平台的增量数据
```
incremental/
├── minecraft.json
├── gregtech.json
├── tinkers.json
└── ...
```

## 🎯 核心特性

### ✨ 去重机制

**问题**：不同的ID可能有相同的显示名称
- `minecraft:iron_ingot` → "Iron Ingot"
- `some_mod:iron_ingot` → "Iron Ingot"

**解决方案**：
1. 提取 **唯一的英文名称** → `lang.yaml`
2. 翻译时只需翻译去重后的内容
3. 通过映射文件 `lang.mapping.json` 建立关系
4. 合并时自动映射回原始ID

**成本节省**：
- 减少 30-50% 的翻译成本
- 减少 AI Token 使用

### 🔄 断点续传

翻译中断？不用担心！

- 自动保存进度到 `translation_progress.json`
- 再次运行时自动从中断处继续
- 已完成的批次不会重新翻译

### 📈 实时进度跟踪

```
进度: [████████████░░░░░░░░░░░░] 50%
已完成: 1500/3000
处理中: 5
失败: 0
预计剩余: 2分钟
```

### ⚡ 并发翻译

支持自定义并发数量：

```yaml
llm:
  max_concurrent: 5  # 同时最多5个请求
  batch_size: 300    # 每批300个名称
```

## 🔧 脚本详解

### 1. 解析脚本 - `1-parser.js`

```bash
npm run parse
```

- 读取 `recipes.log`
- 逐行解析配方数据
- 处理多种配方格式
- 输出 `recipes.raw.json`

### 2. 提取脚本 - `2-extract-lang.js`

```bash
npm run extract
```

- 从配方中提取所有ID
- 按 **显示名称** 去重
- 生成 `lang.yaml`（待翻译）
- 生成 `lang.mapping.json`（ID映射）

### 3. 翻译脚本 - `translate-with-ai.js`

```bash
npm run translate
```

**工作流**：
1. 读取 `lang.yaml`
2. 分批处理
3. 并发调用OpenAI API
4. 实时跟踪进度
5. 输出 `lang.cn.yaml`

### 4. 合并脚本 - `3-merge-translation.js`

```bash
npm run merge
```

- 加载原始配方
- 通过映射查找中文翻译
- 添加 `nameCn`、`platformCn` 字段
- 输出 `recipes.cn.json`

### 5. 索引脚本 - `4-generate-indexes.js`

```bash
npm run index
```

- 生成物品索引
- 生成平台索引
- 生成图数据（供Sigma.js）
- 生成搜索索引
- 生成增量数据

## 📌 配置详解

### config.yaml 关键参数

```yaml
llm:
  api_key: "sk-..."              # OpenAI密钥（必需）
  base_url: "https://api.openai.com/v1"
  model: "gpt-4o-mini"           # 使用的模型
  temperature: 0.3               # 0=稳定，1=创意
  max_tokens: 2000               # 每次请求最大token
  
  max_concurrent: 5              # 💡 并发数（5-10推荐）
  batch_size: 300                # 💡 每批大小（200-500推荐）
  retry_times: 3                 # 失败重试次数
  
  rate_limit:
    requests_per_minute: 50      # API限流
    tokens_per_minute: 40000     # Token限流
```

### 成本计算示例

以 30,000 个去重后的名称为例：

- 每个名称平均 15 tokens
- 总共约 450,000 tokens
- GPT-4o-mini 价格：$0.000150 / 1000 tokens
- **预计费用：$0.07 左右**

## ⚠️ 常见问题

### Q: 翻译中途中断了怎么办？

A: 再次运行脚本会自动继续：
```bash
npm run translate
```

### Q: 如何调整并发数提高速度？

A: 编辑 `config.yaml`：
```yaml
max_concurrent: 10  # 提高到10
batch_size: 200    # 减小批次
```

### Q: 如何使用其他LLM服务？

A: 修改 `config.yaml` 中的 `base_url`：
```yaml
base_url: "https://api.together.ai/v1"  # Together AI
base_url: "https://api.groq.com/v1"     # Groq
```

OpenAI SDK 兼容多种服务。

### Q: 翻译结果不满意怎么办？

A: 直接编辑 `lang.cn.yaml` 进行手动修正，然后：
```bash
npm run merge   # 重新合并
npm run index   # 重新生成索引
```

### Q: 生成的索引文件很大怎么办？

A: 使用 `incremental/` 目录中的增量数据，按需加载每个平台。

## 🎨 集成到StarChart系统

1. 复制 `recipe.graph.json` 到前端项目
2. 用 Sigma.js 加载该JSON
3. 根据用户操作加载 `incremental/` 中的平台数据

```javascript
// 初始化图
const graph = new graphology.Graph();
const data = require('recipe.graph.json');
graph.import(data);

// 加载平台数据
const platform = require('incremental/minecraft.json');
graph.import(platform);
```

## 🔄 完整工作流（参考）

```bash
# 1. 只做基础处理
npm run all -- -s

# 2. 配置API密钥后翻译
# 编辑 config.yaml

# 3. 运行翻译
npm run translate

# 4. 完成所有处理
npm run all

# 5. 查看输出
ls -lh output/
```

## 📞 技术支持

遇到问题？查看：
- `translation.log` - 翻译日志
- `translation_progress.json` - 进度文件
- 各脚本的详细输出

## 📝 许可证

MIT

---

**最后更新**: 2025-10-19
**版本**: 1.0.0
