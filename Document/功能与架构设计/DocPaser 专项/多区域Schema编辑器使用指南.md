# 多区域 Schema 编辑器使用指南

## 📋 功能概述

多区域 Schema 编辑器是 DocParser 系统的重要扩展，专门用于解析**题目答案分离**等跨区域数据关联场景。

### 🎯 适用场景

1. **题目答案分离型题库**：题目在前半部分，答案在后半部分
2. **多节内容文档**：不同章节需要分别解析后再合并
3. **数据关联场景**：需要将多个区域的数据进行匹配关联

---

## 🚀 快速开始

### 第一步：创建 Multi-Region Schema

1. 打开 DocParser 面板
2. 点击"编辑 Schema"
3. 在右上角类型下拉框选择 **"Multi-Region (多区域)"**

![类型选择](./assets/multi-region-type-select.png)

---

## 🎨 界面导览

### Tab 1: 区域配置

#### 添加区域

点击"添加区域"按钮，在对话框中配置：

```
┌────────────────────────────────────┐
│ 添加区域                           │
├────────────────────────────────────┤
│ 区域名称: [questions        ]      │  👈 唯一标识符（英文）
│ 说明:     [题目内容区域      ]      │
│                                    │
│ 提取方式: ● 按行范围  ○ 按标记识别  │
│                                    │
│ 起始行号: [1          ]            │
│ 结束行号: [51158      ]            │
│                                    │
│ ℹ️ 将提取第 1 行到第 51158 行     │
│                                    │
│ Schema配置: [配置此区域的Schema]   │  👈 点击配置解析规则
│                                    │
│          [取消]  [确认]            │
└────────────────────────────────────┘
```

#### 配置提取方式

**方式1：按行范围**
- 适用场景：已知具体的行号范围
- 配置：起始行号 + 结束行号
- 示例：`1-51158`（题目区域）

**方式2：按标记识别**
- 适用场景：通过特定文本标记区分区域
- 配置：起始标记 + 结束标记（可选）
- 示例：起始标记 `"# 附录 参考答案"`，结束标记留空

#### 配置 Schema

点击"配置此区域的Schema"后，会打开嵌套的 Schema 编辑器：

- 支持 Object/Array 类型
- 使用完整的可视化+代码双编辑器
- 可配置字段的 `x-parse` 和 `x-export`

---

### Tab 2: 数据关联

配置后处理器，将多个区域的数据进行关联。

#### 添加合并查找后处理器

```
┌────────────────────────────────────┐
│ 🔗 关联器 1 [合并查找]             │
├────────────────────────────────────┤
│ 处理类型: [合并查找 ▼]             │
│                                    │
│ 源数据区域: [questions ▼]          │  👈 需要关联答案的数据
│ 查找表区域: [answers   ▼]          │  👈 提供答案的数据
│                                    │
│ 匹配字段:                          │
│   ☑ chapter                        │  👈 用于匹配的字段
│   ☑ questionType                   │
│   ☑ questionNumber                 │
│                                    │
│ 匹配策略: [精确匹配 ▼]             │
│   • 精确匹配 - 所有字段完全相同    │
│   • 模糊匹配 - 允许轻微差异        │
│   • 位置匹配 - 按顺序对应          │
│                                    │
│ 置信度: ──●────────── 95%          │
│                                    │
│ 说明: [将题目与答案关联]           │
│                                    │
│          [删除]                    │
└────────────────────────────────────┘
```

#### 匹配策略说明

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| **精确匹配** | 所有匹配字段必须完全相同 | 数据规范、格式统一 |
| **模糊匹配** | 允许字段有轻微差异 | 存在格式不统一（如空格） |
| **位置匹配** | 按数组顺序一一对应 | 两个区域题目顺序完全一致 |

---

### Tab 3: JSON代码

查看或直接编辑生成的完整 JSON Schema。

```json
{
  "type": "multi-region",
  "title": "解剖学题库解析",
  "regions": [
    {
      "name": "questions",
      "description": "题目区域",
      "range": {
        "start": 1,
        "end": 51158
      },
      "schema": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "chapter": { /* ... */ },
            "questionNumber": { /* ... */ }
          }
        }
      }
    },
    {
      "name": "answers",
      "description": "答案区域",
      "marker": {
        "start": "# 附录 参考答案"
      },
      "schema": {
        "type": "array",
        "items": { /* ... */ }
      }
    }
  ],
  "postProcessors": [
    {
      "type": "merge-lookup",
      "source": "questions",
      "lookup": "answers",
      "matchFields": ["chapter", "questionType", "questionNumber"],
      "strategy": "exact",
      "confidence": 0.95
    }
  ]
}
```

---

## 📝 完整示例：解剖学题库

### 场景描述

- **文档结构**：
  - 第 1-51158 行：题目内容（章节、题型、题号、题目、选项）
  - 第 51159-53053 行：参考答案（章节、题型、答案列表）

### 配置步骤

#### 1. 创建区域1: questions

```yaml
区域名称: questions
说明: 题目内容区域
提取方式: 按行范围
  起始行号: 1
  结束行号: 51158
Schema配置:
  type: array
  items:
    type: object
    properties:
      chapter:
        type: string
        x-parse:
          pattern: "^# (第.+章.+)$"
          mode: extract
          captureGroups: [1]
          flags: "m"
      questionType:
        type: string
        x-parse:
          pattern: "^# (.+、.+型题.*)$"
          mode: extract
          captureGroups: [1]
          flags: "m"
      questionNumber:
        type: string
        x-parse:
          pattern: "^(\\d+)\\."
          mode: extract
          captureGroups: [1]
          flags: "m"
      questionContent:
        type: string
        x-parse:
          pattern: "^\\d+\\.\\s*(.+?)$"
          mode: extract
          captureGroups: [1]
          flags: "m"
      # ... 其他字段（选项A-E等）
```

#### 2. 创建区域2: answers

```yaml
区域名称: answers
说明: 参考答案区域
提取方式: 按标记识别
  起始标记: "# 附录 参考答案"
  结束标记: (留空)
Schema配置:
  type: array
  items:
    type: object
    properties:
      chapter:
        type: string
        x-parse:
          pattern: "^# (第.+章.+)$"
          mode: extract
          captureGroups: [1]
          flags: "m"
      questionType:
        type: string
        x-parse:
          pattern: "^# (.+、.+型题.*)$"
          mode: extract
          captureGroups: [1]
          flags: "m"
      answerLine:
        type: string
        x-parse:
          pattern: "^([\\d.A-Z\\s]+)$"
          mode: extract
          captureGroups: [1]
          flags: "m"
```

#### 3. 添加后处理器

```yaml
处理类型: 合并查找
源数据区域: questions
查找表区域: answers
匹配字段:
  - chapter
  - questionType
  - questionNumber
匹配策略: 精确匹配
置信度: 95%
```

#### 4. 执行解析

1. 选择文档：`full.md`
2. 点击"开始解析"
3. 系统执行流程：
   - ✅ 提取区域1（第1-51158行）
   - ✅ 提取区域2（从"# 附录 参考答案"开始）
   - ✅ 分别解析两个区域
   - ✅ 执行数据关联（章节+题型+题号匹配）
   - ✅ 生成最终结果

#### 5. 查看结果

```javascript
{
  "regions": {
    "questions": [
      {
        "chapter": "第一章 绪论",
        "questionType": "一、A1型题（单句型最佳选择题）",
        "questionNumber": "1",
        "questionContent": "人体解剖学属于生物学中的（ ）范畴",
        "optionA": "力学",
        "optionB": "化学",
        // ...
      },
      // ... 1200题
    ],
    "answers": [
      {
        "chapter": "第一章 绪论",
        "questionType": "一、A1型题（单句型最佳选择题）",
        "answerLine": "1.C 2.B 3.D 4.E 5.E"
      },
      // ...
    ]
  },
  "merged": [
    {
      "chapter": "第一章 绪论",
      "questionType": "一、A1型题（单句型最佳选择题）",
      "questionNumber": "1",
      "questionContent": "人体解剖学属于生物学中的（ ）范畴",
      "optionA": "力学",
      "optionB": "化学",
      "answer": "C"  // 👈 已关联的答案
    },
    // ...
  ],
  "statistics": {
    "totalItems": 1200,
    "regionStats": {
      "questions": { "itemCount": 1200 },
      "answers": { "itemCount": 50, "matchedCount": 1180 }
    }
  }
}
```

---

## 🎯 最佳实践

### ✅ 推荐做法

1. **区域命名**：使用语义化的英文名称（`questions`, `answers`, `metadata`）
2. **提取方式选择**：
   - 已知行号 → 使用"按行范围"
   - 文档结构可能变化 → 使用"按标记识别"
3. **匹配字段**：选择最能唯一标识的字段组合
4. **逐步验证**：先配置一个区域并解析，确认无误后再添加其他区域

### ❌ 常见错误

1. **区域重叠**：两个区域的行范围有重叠
2. **匹配字段不一致**：两个区域的字段名不同（如 `chapter` vs `chapterName`）
3. **标记不存在**：使用"按标记识别"时，标记在文档中不存在
4. **循环引用**：后处理器的 source 和 lookup 指向同一个区域

---

## 🔧 技术细节

### 扩展字段规范

#### 根级扩展（不带 x- 前缀）

```typescript
interface MultiRegionSchema {
  type: 'multi-region'
  regions: ParseRegion[]        // 区域列表
  postProcessors: PostProcessorConfig[]  // 后处理器
}
```

#### 字段级扩展（带 x- 前缀）

```typescript
interface FieldSchema {
  type: string
  'x-parse'?: ParseMetadata     // 解析规则
  'x-export'?: ExportMetadata   // 导出配置
}
```

### 解析流程

```
文档加载
    ↓
分割区域（按range或marker）
    ↓
并行解析各区域
    ├─ 区域1: DocumentParser.parse(content1, schema1)
    ├─ 区域2: DocumentParser.parse(content2, schema2)
    └─ 区域N: ...
    ↓
执行后处理器
    ├─ merge-lookup: 数据关联匹配
    ├─ cross-reference: 建立引用关系
    └─ transform: 自定义转换
    ↓
生成最终结果
    ├─ regions: { questions: [...], answers: [...] }
    └─ merged: [...]  // 关联后的数据
```

---

## 📚 相关文档

- [DocParser文档解析系统设计文档](./DocParser文档解析系统设计文档.md)
- [Schema示例与规范](./Schema示例与规范.md)
- [解剖学题库Schema示例](./解剖学题库Schema示例.json)

---

## 💡 FAQ

### Q: 可以创建超过2个区域吗？

A: 可以！Multi-Region 支持任意数量的区域，只需确保区域间不重叠。

### Q: 后处理器可以链式执行吗？

A: 可以！按添加顺序执行，后一个处理器可以使用前一个处理器的结果。

### Q: 如果匹配失败怎么办？

A: 未匹配的数据会保留原样，并在统计信息中显示匹配失败的数量。

### Q: 可以在 Object 模式下使用后处理器吗？

A: 不行，后处理器仅在 Multi-Region 模式下可用。

---

**最后更新**: 2025年10月13日  
**版本**: v1.0  
**作者**: Nimbria 开发团队

