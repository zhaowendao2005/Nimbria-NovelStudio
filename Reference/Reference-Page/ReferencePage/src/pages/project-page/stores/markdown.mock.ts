import type { MarkdownFile } from './markdown.store'

// Mock Markdown内容
const sampleMarkdown1 = `# 笔记1

这是第一个示例笔记。

## 功能特性

- **编辑模式**: 使用Vditor的IR模式，类似Obsidian的实时渲染
- **阅览模式**: 纯渲染视图，无编辑功能
- **代码高亮**: 支持多种语言的语法高亮

### 代码示例

\`\`\`typescript
interface User {
  id: string
  name: string
  email: string
}

const user: User = {
  id: '1',
  name: 'Alice',
  email: 'alice@example.com'
}
\`\`\`

## 数学公式

行内公式: $E = mc^2$

块级公式:

$$
\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

## 列表

1. 第一项
2. 第二项
   - 子项 A
   - 子项 B
3. 第三项

> 这是一个引用块
> 可以包含多行内容
`

const sampleMarkdown2 = `# 笔记2

## 表格示例

| 特性 | 描述 | 状态 |
|------|------|------|
| Markdown编辑 | 支持标准Markdown语法 | ✅ 完成 |
| 实时预览 | IR模式实时渲染 | ✅ 完成 |
| 代码高亮 | 多语言支持 | ✅ 完成 |
| 数学公式 | KaTeX渲染 | ✅ 完成 |

## 任务列表

- [x] 完成编辑器集成
- [x] 实现查看模式
- [ ] 添加文件保存功能
- [ ] 实现搜索功能

## 图片

![示例图片](https://via.placeholder.com/400x300)

## 链接

访问 [Vditor官网](https://github.com/Vanessa219/vditor) 了解更多信息。
`

const subNote1 = `# 子笔记1

这是文件夹1中的子笔记。

## 嵌套内容

这个笔记演示了文件树的嵌套结构。

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`)
}

greet('World')
\`\`\`
`

const subNote2 = `# 子笔记2

## 快速笔记

- 想法1
- 想法2
- 想法3

> 💡 **提示**: 这是一个快速记录的示例
`

const readmeContent = `# 参考资料源

欢迎使用Markdown编辑器！

## 使用指南

1. **双击文件** 在阅览模式下打开
2. **点击编辑按钮** 切换到编辑模式
3. **使用快捷键** 提高效率

### 快捷键

- \`Ctrl/Cmd + S\`: 保存
- \`Ctrl/Cmd + E\`: 切换编辑模式
- \`Ctrl/Cmd + V\`: 切换查看模式

## 支持的功能

- ✅ Markdown标准语法
- ✅ 代码高亮
- ✅ 数学公式 (KaTeX)
- ✅ 表格
- ✅ 任务列表
- ✅ 图片
- ✅ 链接

---

**版本**: 1.0.0  
**更新时间**: 2025-01-03
`

// Mock文件树数据
export const mockMarkdownFiles: MarkdownFile[] = [
  {
    id: 'root',
    name: '参考资料源',
    path: '参考资料源',
    content: '',
    lastModified: new Date('2025-01-01'),
    isFolder: true,
    children: [
      {
        id: 'readme',
        name: 'README.md',
        path: '参考资料源/README.md',
        content: readmeContent,
        lastModified: new Date('2025-01-03'),
        isFolder: false
      },
      {
        id: 'note1',
        name: '笔记1.md',
        path: '参考资料源/笔记1.md',
        content: sampleMarkdown1,
        lastModified: new Date('2025-01-02'),
        isFolder: false
      },
      {
        id: 'note2',
        name: '笔记2.md',
        path: '参考资料源/笔记2.md',
        content: sampleMarkdown2,
        lastModified: new Date('2025-01-02'),
        isFolder: false
      },
      {
        id: 'folder1',
        name: '文件夹1',
        path: '参考资料源/文件夹1',
        content: '',
        lastModified: new Date('2025-01-01'),
        isFolder: true,
        children: [
          {
            id: 'subnote1',
            name: '子笔记1.md',
            path: '参考资料源/文件夹1/子笔记1.md',
            content: subNote1,
            lastModified: new Date('2025-01-02'),
            isFolder: false
          },
          {
            id: 'subnote2',
            name: '子笔记2.md',
            path: '参考资料源/文件夹1/子笔记2.md',
            content: subNote2,
            lastModified: new Date('2025-01-02'),
            isFolder: false
          }
        ]
      }
    ]
  }
]

// 导出单个文件查找辅助函数
export const findMockFileByPath = (path: string): MarkdownFile | null => {
  const search = (files: MarkdownFile[]): MarkdownFile | null => {
    for (const file of files) {
      if (file.path === path) {
        return file
      }
      if (file.children) {
        const found = search(file.children)
        if (found) return found
      }
    }
    return null
  }
  
  return search(mockMarkdownFiles)
}

