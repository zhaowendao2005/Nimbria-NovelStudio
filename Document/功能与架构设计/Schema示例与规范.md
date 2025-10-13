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
    "flags": "gm",                      // 可选：正则标志（g=全局, m=多行, i=忽略大小写, s=dotAll）
    "captureGroups": [1],               // 可选：提取哪些捕获组（从1开始）
    "examples": ["示例文本"]            // 可选：用于测试的示例
  }
}
```

---

#### 📌 `mode` - 解析模式详解

##### 1. `extract` - 提取模式（最常用）
**用途**：从文档中提取匹配的内容

**行为**：
- 使用正则表达式匹配文本
- 如果指定了 `captureGroups`，提取指定的捕获组
- 如果未指定 `captureGroups`，提取整个匹配
- 配合 `flags` 可实现单次或多次提取

**使用场景**：
- 提取题号：`"pattern": "^(\\d+)\\."`
- 提取答案：`"pattern": "答案[：:]?\\s*([A-D])"`
- 提取键值对：`"pattern": "项目名称[：:]\\s*(.+)"`

**示例**：
```json
{
  "questionNumber": {
    "type": "string",
    "x-parse": {
      "pattern": "^(\\d+)\\.",
      "mode": "extract",
      "flags": "m",
      "captureGroups": [1]
    }
  }
}
```
**效果**：从文本 `"1. 这是题目"` 中提取 `"1"`

---

##### 2. `split` - 分割模式
**用途**：用匹配项作为分隔符，将文档分割成多个部分

**行为**：
- 找到所有匹配项
- 以匹配项为分界线，将文档切分
- 返回切分后的数组
- 常用于将长文档分割成多个独立单元

**使用场景**：
- 分割多道题目：以题号为分隔符
- 分割章节：以章节标题为分隔符
- 分割记录：以特定标记为分隔符

**示例**：
```json
{
  "questions": {
    "type": "array",
    "x-parse": {
      "pattern": "^\\d+\\.",
      "mode": "split",
      "flags": "gm"
    }
  }
}
```
**效果**：
```
输入文本：
1. 第一题内容...
2. 第二题内容...
3. 第三题内容...

输出：["", "第一题内容...", "第二题内容...", "第三题内容..."]
```

---

##### 3. `validate` - 验证模式
**用途**：验证字段内容是否符合指定格式

**行为**：
- 检查文本是否匹配正则表达式
- 返回布尔值（true/false）
- 不提取内容，仅验证格式
- 常用于数据质量检查

**使用场景**：
- 验证邮箱格式
- 验证日期格式
- 验证手机号格式
- 检查必填项是否存在

**示例**：
```json
{
  "email": {
    "type": "string",
    "x-parse": {
      "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      "mode": "validate",
      "flags": "i"
    }
  }
}
```
**效果**：验证 `"user@example.com"` → `true`，`"invalid-email"` → `false`

---

#### 📌 `flags` - 正则标志详解

正则标志控制正则表达式的匹配行为，可以组合使用（如 `"gm"`, `"gims"`）。

##### 1. `g` - 全局匹配（Global）
**作用**：匹配所有符合条件的内容，而不是只匹配第一个

**不使用 `g`**：
```javascript
文本: "A. 选项1  B. 选项2  C. 选项3"
正则: "[A-C]\\."
结果: ["A."]  // 只匹配第一个
```

**使用 `g`**：
```javascript
文本: "A. 选项1  B. 选项2  C. 选项3"
正则: "[A-C]\\."
flags: "g"
结果: ["A.", "B.", "C."]  // 匹配所有
```

**使用建议**：
- ✅ 提取多个选项时使用
- ✅ 提取列表项时使用
- ❌ 提取单个唯一值时不要使用

---

##### 2. `m` - 多行模式（Multiline）
**作用**：让 `^` 和 `$` 匹配每一行的开头和结尾，而不仅仅是整个文本的开头和结尾

**不使用 `m`**：
```javascript
文本:
"1. 第一行
2. 第二行
3. 第三行"

正则: "^(\\d+)\\."
结果: ["1."]  // ^ 只匹配整个文本的开头
```

**使用 `m`**：
```javascript
文本:
"1. 第一行
2. 第二行
3. 第三行"

正则: "^(\\d+)\\."
flags: "gm"
结果: ["1.", "2.", "3."]  // ^ 匹配每一行的开头
```

**使用建议**：
- ✅ 匹配以特定字符开头的行（题号、标题）
- ✅ 匹配以特定字符结尾的行
- ✅ 几乎所有多行文本都建议使用

---

##### 3. `i` - 忽略大小写（Case-Insensitive）
**作用**：匹配时不区分大小写

**不使用 `i`**：
```javascript
文本: "Answer: A"
正则: "答案[：:]?\\s*([A-D])"
结果: []  // "Answer" ≠ "答案"
```

**使用 `i`**：
```javascript
文本: "ANSWER: A" 或 "answer: a"
正则: "answer[：:]?\\s*([a-d])"
flags: "i"
结果: ["a"]  // 不区分大小写
```

**使用建议**：
- ✅ 处理可能有大小写变化的关键词
- ✅ 提取选项答案（A/a 都能匹配）
- ❌ 需要严格区分大小写时不要使用

---

##### 4. `s` - DotAll 模式（单行模式）
**作用**：让 `.` 能够匹配换行符（默认 `.` 不匹配换行符）

**不使用 `s`**：
```javascript
文本:
"题目：这是题目内容
它有多行
答案：A"

正则: "题目：(.+?)答案："
结果: []  // .+ 不能跨行匹配
```

**使用 `s`**：
```javascript
文本:
"题目：这是题目内容
它有多行
答案：A"

正则: "题目：(.+?)答案："
flags: "s"
结果: ["这是题目内容\n它有多行\n"]  // . 可以匹配换行符
```

**使用建议**：
- ✅ 提取跨越多行的内容
- ✅ 提取段落或大块文本
- ⚠️ 配合非贪婪模式 `.+?` 使用，避免过度匹配

**注意**：如果不使用 `s`，可以用 `[\\s\\S]` 替代 `.` 来匹配包括换行符在内的所有字符：
```javascript
正则: "题目：([\\s\\S]+?)答案："  // 等效于使用 s 标志
```

---

##### 🎯 标志组合示例

```json
// 示例1：提取多行题目内容（gms）
{
  "x-parse": {
    "pattern": "^\\d+\\.(.+?)(?=^\\d+\\.|$)",
    "mode": "extract",
    "flags": "gms",  // g=全局, m=多行, s=跨行匹配
    "captureGroups": [1]
  }
}

// 示例2：提取所有列表项（gm）
{
  "x-parse": {
    "pattern": "^[-*]\\s*(.+)",
    "mode": "extract",
    "flags": "gm",  // g=全局, m=每行开头
    "captureGroups": [1]
  }
}

// 示例3：验证邮箱（i）
{
  "x-parse": {
    "pattern": "^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$",
    "mode": "validate",
    "flags": "i"  // 忽略大小写
  }
}
```

---

#### 📌 `captureGroups` - 捕获组详解

捕获组用于从正则表达式匹配结果中提取特定部分。

##### 基本概念

**正则表达式中的捕获组**：用圆括号 `()` 包裹的部分
```javascript
正则: "答案[：:]?\\s*([A-D])"
       |____________| |______|
          不捕获         捕获组1
```

**捕获组编号**：从左到右，从 1 开始（0 是整个匹配）
```javascript
正则: "(\\d+)\\.(\\w+)-(\\w+)"
       |____| |____| |____|
       组1    组2    组3

文本: "1.张三-男"
结果:
  组0 (整体): "1.张三-男"
  组1: "1"
  组2: "张三"
  组3: "男"
```

---

##### 使用方式

**不指定 `captureGroups`**：提取整个匹配
```json
{
  "x-parse": {
    "pattern": "答案[：:]?\\s*([A-D])",
    "mode": "extract"
  }
}
// 结果: "答案：A" (整个匹配)
```

**指定 `captureGroups: [1]`**：只提取第一个捕获组
```json
{
  "x-parse": {
    "pattern": "答案[：:]?\\s*([A-D])",
    "mode": "extract",
    "captureGroups": [1]
  }
}
// 结果: "A" (只有捕获组1的内容)
```

**指定多个捕获组 `captureGroups: [1, 2]`**：提取多个捕获组
```json
{
  "x-parse": {
    "pattern": "(\\d+)\\s*[、.]\\s*(.+)",
    "mode": "extract",
    "captureGroups": [1, 2]
  }
}
// 文本: "1. 这是题目"
// 结果: ["1", "这是题目"]
```

---

##### 实战示例

**示例1：提取题号**
```json
{
  "questionNumber": {
    "type": "string",
    "x-parse": {
      "pattern": "^(\\d+)\\.",
      "mode": "extract",
      "flags": "m",
      "captureGroups": [1]
    }
  }
}
// 文本: "123. 题目内容"
// 提取: "123"
```

**示例2：提取选项内容（不要前面的字母）**
```json
{
  "optionA": {
    "type": "string",
    "x-parse": {
      "pattern": "A[.、]\\s*(.+?)(?=\\nB\\.|$)",
      "mode": "extract",
      "flags": "ms",
      "captureGroups": [1]
    }
  }
}
// 文本: "A. 这是选项A的内容"
// 提取: "这是选项A的内容" (不包含 "A.")
```

**示例3：提取姓名和性别**
```json
{
  "pattern": "姓名[：:]\\s*(\\S+)\\s+性别[：:]\\s*(\\S+)",
  "mode": "extract",
  "captureGroups": [1, 2]
}
// 文本: "姓名：张三  性别：男"
// 提取: ["张三", "男"]
```

**示例4：提取URL的各个部分**
```json
{
  "pattern": "(https?)://([^/]+)(/.+)",
  "mode": "extract",
  "captureGroups": [1, 2, 3]
}
// 文本: "https://example.com/path/to/page"
// 提取: ["https", "example.com", "/path/to/page"]
```

---

##### ⚠️ 常见错误

**错误1：忘记使用 `captureGroups`**
```json
// ❌ 错误
{
  "pattern": "答案[：:]?\\s*([A-D])",
  "mode": "extract"
}
// 结果: "答案：A" (包含前缀，可能不是你想要的)

// ✅ 正确
{
  "pattern": "答案[：:]?\\s*([A-D])",
  "mode": "extract",
  "captureGroups": [1]
}
// 结果: "A"
```

**错误2：捕获组编号错误**
```json
// ❌ 错误
{
  "pattern": "(\\d+)\\.(\\w+)",
  "captureGroups": [2, 3]  // 只有2个捕获组，没有第3个
}

// ✅ 正确
{
  "pattern": "(\\d+)\\.(\\w+)",
  "captureGroups": [1, 2]
}
```

**错误3：使用非捕获组**
```json
// ❌ 这不会创建捕获组
{
  "pattern": "(?:\\d+)\\.(\\w+)",  // (?:...) 是非捕获组
  "captureGroups": [1]  // 捕获组1是 (\\w+)，不是 (?:\\d+)
}
```

---

##### 💡 最佳实践

1. **简单提取：总是指定 `captureGroups: [1]`**
   ```json
   {
     "pattern": "关键词[：:]\\s*(.+)",
     "captureGroups": [1]  // 只要内容，不要关键词
   }
   ```

2. **复杂提取：用多个捕获组**
   ```json
   {
     "pattern": "(\\d+)\\s+([^\\s]+)\\s+(\\d+)分",
     "captureGroups": [1, 2, 3]  // 提取多个字段
   }
   ```

3. **调试技巧：先不用 `captureGroups`，看整体匹配**
   ```json
   // 第1步：调试正则
   { "pattern": "...", "mode": "extract" }
   
   // 第2步：确认后加 captureGroups
   { "pattern": "...", "mode": "extract", "captureGroups": [1] }
   ```

4. **测试工具：使用 regex101.com**
   - 输入正则和测试文本
   - 查看捕获组的匹配结果
   - 确认编号无误后再使用

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

## 🎮 Schema 编辑器操作指南

### 📋 工具栏操作

#### 1. 从JSON导入
- **位置**：左上角工具栏
- **功能**：从剪贴板导入JSON数据，自动生成Schema
- **操作**：复制JSON数据 → 点击"从JSON导入" → 自动分析并生成Schema结构

#### 2. 分享
- **位置**：右上角工具栏
- **功能**：复制当前Schema到剪贴板，方便分享给其他人
- **操作**：点击"分享" → Schema已复制到剪贴板

---

### 🌲 可视化编辑操作

#### 3. 添加根级字段
- **位置**：可视化编辑区 header
- **功能**：在根级添加新字段
- **操作**：点击"添加字段" → 填写字段信息 → 确认
- **注意**：
  - Object类型：添加到 `properties`
  - Array类型：添加到 `items.properties`

#### 4. 双击编辑字段名
- **位置**：树节点字段名
- **功能**：快速重命名字段
- **操作**：双击字段名 → 输入新名称 → Enter确认 / Esc取消
- **规则**：只能包含字母、数字和下划线，不能以数字开头

#### 5. 编辑字段（详细配置）
- **位置**：节点悬浮菜单 - 铅笔图标
- **功能**：打开完整的字段配置对话框
- **可配置项**：
  - **基本信息**：名称、类型、描述、必填
  - **解析规则**：正则表达式、模式、标志、捕获组、示例
  - **导出配置**：导出类型、列名、列顺序、列宽、格式

#### 6. 添加子字段
- **位置**：节点悬浮菜单 - 加号图标
- **功能**：为 object/array 类型字段添加子字段
- **操作**：
  - Object类型：点击加号 → 选择子字段类型 → 填写信息
  - Array类型：点击加号 → 填写元素信息

#### 7. 切换必填状态
- **位置**：节点悬浮菜单 - 星星图标
- **功能**：快速切换字段的必填状态
- **操作**：点击星星图标 → 状态切换（实心=必填，空心=可选）

#### 8. 快速类型切换
- **位置**：节点悬浮菜单 - 下箭头图标
- **功能**：快速更改字段类型
- **可选类型**：string, number, boolean, object, array
- **操作**：点击下箭头 → 选择新类型

#### 9. 删除字段
- **位置**：节点悬浮菜单 - 删除图标
- **功能**：删除当前字段（及其子字段）
- **操作**：点击删除图标 → 确认删除

---

### 💻 代码编辑操作

#### 10. 类型选择（Object/Array）
- **位置**：代码编辑器 header - 下拉框
- **功能**：切换根节点类型
- **选项**：Object / Array
- **操作**：选择类型 → 自动转换Schema结构

#### 11. 清空Schema
- **位置**：代码编辑器 header - "清空"按钮
- **功能**：清空当前Schema，保留基本结构
- **结果**：
  - Object: `{ type: "object", properties: {} }`
  - Array: `{ type: "array", items: { type: "object", properties: {} } }`

#### 12. 加载示例
- **位置**：代码编辑器 header - "示例"按钮
- **功能**：加载完整的示例Schema（根据类型）
- **示例内容**：
  - Object示例：配置文档解析（projectName, version）
  - Array示例：题目解析（questionNumber, questionContent, answer）

#### 13. 复制代码
- **位置**：代码编辑器 header - "复制"按钮
- **功能**：复制当前JSON Schema代码到剪贴板

#### 14. 直接编辑代码
- **位置**：Monaco编辑器
- **功能**：直接编辑JSON Schema代码
- **特性**：
  - 语法高亮
  - 自动补全
  - 实时同步到可视化树形视图
  - 自动保存

---

### 🎯 字段配置详解

#### Tab 1: 基本信息
- **字段名**：字段的标识符（必填）
- **字段类型**：string, number, boolean, object, array
- **描述**：字段说明文字
- **必填**：是否为必填字段

#### Tab 2: 解析规则
- **启用解析**：开关，控制是否配置 `x-parse`
- **正则表达式**：匹配文本的正则模式（必填）
- **解析模式**：
  - `extract`：提取匹配内容
  - `split`：分割文本
  - `validate`：验证格式
- **正则标志**：可多选
  - `g`：全局匹配
  - `m`：多行模式
  - `i`：忽略大小写
  - `s`：dotAll模式（. 匹配换行符）
- **捕获组**：提取哪些捕获组（如：1,2,3）
- **测试示例**：用于测试正则表达式的示例文本

#### Tab 3: 导出配置
- **启用导出**：开关，控制是否配置 `x-export`
- **导出类型**：
  - `column`：普通列（显示为Excel列）
    - 列名（必填）
    - 列顺序（推荐填写，控制列的位置）
    - 列宽度（可选，默认15）
    - 格式化：粗体、字号、对齐方式
  - `section-header`：多行合并（跨越多列的标题行）
    - 跨越列数（1-50）
  - `ignore`：不导出（仅用于解析，不输出到Excel）

---

### 💡 操作技巧

1. **快速编辑流程**：
   - 加载示例 → 修改字段 → 调整正则 → 配置导出 → 保存

2. **正则调试**：
   - 在"解析规则"Tab中使用"测试示例"验证正则
   - 使用 https://regex101.com/ 进行复杂正则的调试

3. **双向同步**：
   - 可视化编辑和代码编辑实时同步
   - 选择你熟悉的方式进行编辑

4. **Array vs Object**：
   - 单个文档 → 使用 Object
   - 多条记录 → 使用 Array
   - Array的字段添加到 `items.properties` 中

5. **导出列顺序**：
   - 设置 `columnOrder` 确保Excel列的正确顺序
   - 从左到右：1, 2, 3, ...

---

## 📚 更多资源

- 正则表达式测试：https://regex101.com/
- JSON Schema 规范：https://json-schema.org/
- 项目文档：`.Document/功能与架构设计/DocParser文档解析系统设计文档.md`

