# DocParser Schema 示例与编写规范

## 📘 概述

DocParser 使用扩展的 JSON Schema 格式来定义文档解析规则。Schema 支持两种根节点类型：
- **`object`**: 解析单个对象（如单篇文章、单个配置文件）
- **`array`**: 解析对象数组（如多道题目、多条记录）

## 🎯 核心扩展字段

### `x-parse` - 解析规则
定义如何从文档中提取数据的正则表达式规则。

```typescript
{
  "x-parse": {
    "pattern": "正则表达式",           // 必填：正则表达式模式
    "mode": "extract",                  // 必填：extract | split | validate
    "flags": "gm",                      // 可选：正则标志（g=全局, m=多行, i=忽略大小写）
    "captureGroups": [1],               // 可选：提取哪些捕获组（从1开始）
    "examples": ["示例文本"]            // 可选：用于测试的示例
  }
}
```

**模式说明**：
- `extract`: 提取匹配的内容
- `split`: 用匹配项分割文档
- `validate`: 验证是否匹配

### `x-export` - 导出配置
定义如何将解析结果导出到 Excel 等格式。

```typescript
{
  "x-export": {
    "type": "column",                   // 必填：column | section-header | ignore
    "columnName": "列标题",             // column 时必填
    "columnOrder": 1,                   // column 时推荐：列顺序（1,2,3...）
    "columnWidth": 20,                  // 可选：列宽度
    "format": {                         // 可选：格式化选项
      "bold": true,
      "fontSize": 12,
      "alignment": "center"
    }
  }
}
```

---

## 📝 示例 1: Array 模式 - 多道题目解析

**使用场景**：解析包含多道题目的文档，每道题有题号、题目内容、选项和答案。

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "title": "题目解析 Schema",
  "description": "用于解析包含多道选择题的文档",
  
  "items": {
    "type": "object",
    "properties": {
      "questionNumber": {
        "type": "string",
        "description": "题号",
        "x-parse": {
          "pattern": "^(\\d+)\\.",
          "mode": "extract",
          "captureGroups": [1],
          "flags": "m"
        },
        "x-export": {
          "type": "column",
          "columnName": "题号",
          "columnOrder": 1,
          "columnWidth": 8
        }
      },
      
      "questionContent": {
        "type": "string",
        "description": "题目内容",
        "x-parse": {
          "pattern": "(?<=^\\d+\\.)(.+?)(?=\\n[A-D]\\.|$)",
          "mode": "extract",
          "captureGroups": [1],
          "flags": "ms"
        },
        "x-export": {
          "type": "column",
          "columnName": "题目内容",
          "columnOrder": 2,
          "columnWidth": 50
        }
      },
      
      "optionA": {
        "type": "string",
        "description": "选项 A",
        "x-parse": {
          "pattern": "A[.、]\\s*(.+?)(?=\\n[B-D]\\.|\\n答案|$)",
          "mode": "extract",
          "captureGroups": [1],
          "flags": "ms"
        },
        "x-export": {
          "type": "column",
          "columnName": "A选项",
          "columnOrder": 3,
          "columnWidth": 30
        }
      },
      
      "optionB": {
        "type": "string",
        "description": "选项 B",
        "x-parse": {
          "pattern": "B[.、]\\s*(.+?)(?=\\n[C-D]\\.|\\n答案|$)",
          "mode": "extract",
          "captureGroups": [1],
          "flags": "ms"
        },
        "x-export": {
          "type": "column",
          "columnName": "B选项",
          "columnOrder": 4,
          "columnWidth": 30
        }
      },
      
      "optionC": {
        "type": "string",
        "description": "选项 C",
        "x-parse": {
          "pattern": "C[.、]\\s*(.+?)(?=\\nD\\.|\\n答案|$)",
          "mode": "extract",
          "captureGroups": [1],
          "flags": "ms"
        },
        "x-export": {
          "type": "column",
          "columnName": "C选项",
          "columnOrder": 5,
          "columnWidth": 30
        }
      },
      
      "optionD": {
        "type": "string",
        "description": "选项 D",
        "x-parse": {
          "pattern": "D[.、]\\s*(.+?)(?=\\n答案|$)",
          "mode": "extract",
          "captureGroups": [1],
          "flags": "ms"
        },
        "x-export": {
          "type": "column",
          "columnName": "D选项",
          "columnOrder": 6,
          "columnWidth": 30
        }
      },
      
      "answer": {
        "type": "string",
        "description": "正确答案",
        "x-parse": {
          "pattern": "答案[：:]?\\s*([A-D])",
          "mode": "extract",
          "captureGroups": [1],
          "flags": "i"
        },
        "x-export": {
          "type": "column",
          "columnName": "答案",
          "columnOrder": 7,
          "columnWidth": 8,
          "format": {
            "bold": true,
            "alignment": "center"
          }
        }
      },
      
      "explanation": {
        "type": "string",
        "description": "答案解析（可选）",
        "x-parse": {
          "pattern": "解析[：:]?\\s*(.+?)(?=^\\d+\\.|$)",
          "mode": "extract",
          "captureGroups": [1],
          "flags": "ms"
        },
        "x-export": {
          "type": "column",
          "columnName": "解析",
          "columnOrder": 8,
          "columnWidth": 40
        }
      }
    },
    
    "required": ["questionNumber", "questionContent", "answer"]
  }
}
```

**对应的文档格式示例**：
```
1. 下列关于蛋白质的叙述，正确的是
A. 蛋白质是由氨基酸组成的高分子化合物
B. 所有蛋白质都含有C、H、O、N四种元素
C. 蛋白质遇高温会变性
D. 以上都对
答案：D
解析：蛋白质的基本组成和性质...

2. DNA分子的基本组成单位是
A. 核苷酸
B. 脱氧核糖
C. 磷酸
D. 含氮碱基
答案：A
```

---

## 📝 示例 2: Object 模式 - 配置文件解析

**使用场景**：解析单个配置文档，提取各个配置项。

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "配置文档解析 Schema",
  "description": "解析配置文档中的各项设置",
  
  "properties": {
    "projectName": {
      "type": "string",
      "description": "项目名称",
      "x-parse": {
        "pattern": "项目名称[：:]\\s*(.+)",
        "mode": "extract",
        "captureGroups": [1],
        "flags": "m"
      },
      "x-export": {
        "type": "column",
        "columnName": "项目名称",
        "columnOrder": 1,
        "columnWidth": 25
      }
    },
    
    "version": {
      "type": "string",
      "description": "版本号",
      "x-parse": {
        "pattern": "版本[：:]\\s*([\\d.]+)",
        "mode": "extract",
        "captureGroups": [1],
        "flags": "m"
      },
      "x-export": {
        "type": "column",
        "columnName": "版本",
        "columnOrder": 2,
        "columnWidth": 15
      }
    },
    
    "author": {
      "type": "string",
      "description": "作者",
      "x-parse": {
        "pattern": "作者[：:]\\s*(.+)",
        "mode": "extract",
        "captureGroups": [1],
        "flags": "m"
      },
      "x-export": {
        "type": "column",
        "columnName": "作者",
        "columnOrder": 3,
        "columnWidth": 20
      }
    },
    
    "features": {
      "type": "array",
      "description": "功能列表",
      "items": {
        "type": "string"
      },
      "x-parse": {
        "pattern": "^[-*]\\s*(.+)",
        "mode": "extract",
        "captureGroups": [1],
        "flags": "gm"
      },
      "x-export": {
        "type": "column",
        "columnName": "功能列表",
        "columnOrder": 4,
        "columnWidth": 40
      }
    }
  },
  
  "required": ["projectName", "version"]
}
```

---

## 📝 示例 3: 嵌套结构 - 章节文档解析

**使用场景**：解析包含多个章节的文档，每个章节有标题和多个段落。

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "章节文档解析 Schema",
  
  "properties": {
    "documentTitle": {
      "type": "string",
      "description": "文档标题",
      "x-parse": {
        "pattern": "^#\\s*(.+)",
        "mode": "extract",
        "captureGroups": [1],
        "flags": "m"
      },
      "x-export": {
        "type": "section-header",
        "mergeCols": 3
      }
    },
    
    "chapters": {
      "type": "array",
      "description": "章节列表",
      "items": {
        "type": "object",
        "properties": {
          "chapterNumber": {
            "type": "string",
            "description": "章节号",
            "x-parse": {
              "pattern": "^##\\s*(\\d+)",
              "mode": "extract",
              "captureGroups": [1],
              "flags": "m"
            },
            "x-export": {
              "type": "column",
              "columnName": "章节号",
              "columnOrder": 1,
              "columnWidth": 10
            }
          },
          
          "chapterTitle": {
            "type": "string",
            "description": "章节标题",
            "x-parse": {
              "pattern": "^##\\s*\\d+[.、]?\\s*(.+)",
              "mode": "extract",
              "captureGroups": [1],
              "flags": "m"
            },
            "x-export": {
              "type": "column",
              "columnName": "章节标题",
              "columnOrder": 2,
              "columnWidth": 30
            }
          },
          
          "content": {
            "type": "string",
            "description": "章节内容",
            "x-parse": {
              "pattern": "(?<=^##.+\\n)([\\s\\S]+?)(?=^##|$)",
              "mode": "extract",
              "captureGroups": [1],
              "flags": "m"
            },
            "x-export": {
              "type": "column",
              "columnName": "内容",
              "columnOrder": 3,
              "columnWidth": 60
            }
          }
        }
      }
    }
  }
}
```

---

## 🎨 正则表达式常用模式

### 1. 匹配题号
```regex
^(\d+)[.、]?\s*
# 匹配：1. 或 1、 或 1（开头的数字）
```

### 2. 匹配选项
```regex
([A-D])[.、]?\s*(.+?)(?=\n[A-D]|$)
# 匹配：A. 内容  或  B、内容
# 直到下一个选项或结束
```

### 3. 匹配键值对
```regex
(.+?)[：:]\s*(.+)
# 匹配：标题：内容  或  Title: Content
```

### 4. 匹配标题（Markdown）
```regex
^#{1,6}\s*(.+)
# 匹配：# 标题  或  ## 二级标题
```

### 5. 匹配列表项
```regex
^[-*+]\s*(.+)
# 匹配：- 项目  或  * 项目
```

### 6. 非贪婪匹配到特定标记
```regex
(.+?)(?=标记|$)
# 匹配内容直到"标记"或文档结束
```

---

## ⚠️ 常见错误与注意事项

### 1. ❌ 忘记转义特殊字符
```json
// 错误
"pattern": "A."

// 正确（. 需要转义）
"pattern": "A\\."
```

### 2. ❌ 没有指定 captureGroups
```json
// 错误：提取整个匹配
{
  "pattern": "答案：([A-D])",
  "mode": "extract"
}

// 正确：提取捕获组1
{
  "pattern": "答案：([A-D])",
  "mode": "extract",
  "captureGroups": [1]
}
```

### 3. ❌ 多行匹配没有使用正确的 flags
```json
// 错误：无法跨行匹配
{
  "pattern": "题目(.+?)答案",
  "flags": "g"
}

// 正确：使用 s 标志让 . 匹配换行符
{
  "pattern": "题目([\\s\\S]+?)答案",
  "flags": "gs"
}
```

### 4. ❌ Export 配置不完整
```json
// 错误：缺少 columnOrder
{
  "x-export": {
    "type": "column",
    "columnName": "题号"
  }
}

// 正确
{
  "x-export": {
    "type": "column",
    "columnName": "题号",
    "columnOrder": 1,
    "columnWidth": 10
  }
}
```

---

## 📊 完整的类型定义参考

```typescript
interface DocParserSchema {
  $schema?: string
  type: 'object' | 'array'
  title?: string
  description?: string
  properties?: Record<string, DocParserSchemaField>
  items?: DocParserSchemaField
  required?: string[]
}

interface DocParserSchemaField {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array'
  title?: string
  description?: string
  properties?: Record<string, DocParserSchemaField>
  items?: DocParserSchemaField
  required?: string[]
  
  'x-parse'?: ParseMetadata
  'x-export'?: ExportMetadata
}

interface ParseMetadata {
  pattern: string              // 正则表达式
  mode: 'extract' | 'split' | 'validate'
  flags?: string               // 'g', 'm', 'i', 's' 等
  captureGroups?: number[]     // [1, 2, 3]
  examples?: string[]
}

interface ExportMetadata {
  type: 'column' | 'section-header' | 'ignore'
  columnName?: string          // column 时必填
  columnOrder?: number         // column 时推荐
  columnWidth?: number
  format?: {
    bold?: boolean
    fontSize?: number
    alignment?: 'left' | 'center' | 'right'
  }
}
```

---

## 🚀 快速开始检查清单

创建新 Schema 时，请检查：

- [ ] 确定根节点类型（`object` 还是 `array`）
- [ ] 为每个需要解析的字段添加 `x-parse` 规则
- [ ] 为需要导出的字段添加 `x-export` 配置
- [ ] 设置合适的 `columnOrder` 确保列顺序正确
- [ ] 测试正则表达式是否正确匹配目标文本
- [ ] 添加必要的 `required` 字段
- [ ] 为复杂规则添加 `description` 说明

---

## 📚 更多资源

- 正则表达式测试：https://regex101.com/
- JSON Schema 规范：https://json-schema.org/
- 项目文档：`.Document/功能与架构设计/DocParser文档解析系统设计文档.md`

