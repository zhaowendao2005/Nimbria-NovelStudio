/**
 * Nimbria项目配置和模板定义
 * 专门针对小说创作项目的配置系统
 */

import type { NimbriaProjectConfig, ProjectTemplate } from './types'

/**
 * 生成默认的项目配置
 */
export function createDefaultConfig(options: {
  projectName: string
  novelTitle: string
  author: string
  genre: string[]
  description?: string
  timestamp: string
}): NimbriaProjectConfig {
  return {
    projectName: options.projectName,
    createdAt: options.timestamp,
    lastModified: options.timestamp,
    version: '1.0.0',
    type: 'nimbria-novel-project',
    
    novel: {
      title: options.novelTitle,
      author: options.author,
      genre: options.genre,
      description: options.description || '',
      language: 'zh-CN'
    },
    
    settings: {
      autoBackup: true,
      backupInterval: 5,
      theme: 'system',
      fontSize: 16,
      fontFamily: 'system-ui',
      defaultChapterTemplate: '# 第{{chapterNumber}}章 {{chapterTitle}}\n\n> 创建时间：{{createdAt}}\n> 字数统计：0\n\n---\n\n'
    }
  }
}

/**
 * 默认的Nimbria小说项目模板
 */
export const NIMBRIA_PROJECT_TEMPLATE: ProjectTemplate = {
  id: 'nimbria-novel',
  name: 'Nimbria 小说项目',
  description: '专业的小说创作项目模板，包含完整的创作目录结构',
  
  defaultFiles: [
    {
      path: 'nimbria.config.json',
      content: '' // 运行时动态生成
    },
    {
      path: 'manuscripts',
      isDirectory: true
    },
    {
      path: 'characters',
      isDirectory: true
    },
    {
      path: 'outlines',
      isDirectory: true
    },
    {
      path: 'research',
      isDirectory: true
    },
    {
      path: 'backups',
      isDirectory: true
    },
    {
      path: 'assets',
      isDirectory: true
    },
    {
      path: 'README.md',
      content: `# {{projectName}}

**小说标题**: {{novelTitle}}
**作者**: {{author}}
**创建时间**: {{createdAt}}
**类型**: {{genre}}

## 项目简介

{{description}}

## 目录结构

- \`manuscripts/\` - 章节手稿，存放所有章节内容
- \`characters/\` - 角色设定，人物描述和关系图
- \`outlines/\` - 大纲规划，故事结构和情节安排  
- \`research/\` - 资料收集，背景资料和参考素材
- \`backups/\` - 自动备份，定期保存的项目备份
- \`assets/\` - 静态资源，图片、音频等素材文件

## 使用说明

这是一个由 Nimbria 创建的小说项目。使用 Nimbria 打开此项目即可开始创作。

---
*由 Nimbria 云墨澜书 自动生成*
`
    },
    {
      path: 'manuscripts/chapter-001.md',
      content: `# 第一章 开始

> 创建时间：{{createdAt}}
> 字数统计：0
> 状态：草稿

---

## 章节大纲

在这里写下本章的大纲要点...

## 正文

在这里开始你的故事...

---

### 写作备注

- 本章要点：
- 人物出场：
- 情节推进：
- 下章预告：
`
    },
    {
      path: 'characters/角色模板.md',
      content: `# 角色设定模板

## 基本信息

- **姓名**：
- **年龄**：
- **性别**：
- **职业**：
- **出生地**：

## 外貌特征

- **身高体型**：
- **面部特征**：
- **穿着风格**：
- **标志特征**：

## 性格特点

- **核心性格**：
- **优点**：
- **缺点**：
- **恐惧/弱点**：
- **目标/动机**：

## 背景故事

- **成长经历**：
- **重要事件**：
- **人际关系**：

## 在故事中的作用

- **角色定位**：（主角/配角/反派）
- **情节作用**：
- **成长轨迹**：

---
*使用此模板创建你的角色*
`
    },
    {
      path: 'outlines/故事大纲.md',
      content: `# {{novelTitle}} - 故事大纲

## 作品信息

- **标题**：{{novelTitle}}
- **作者**：{{author}}
- **类型**：{{genre}}
- **目标字数**：
- **预计章节**：

## 核心设定

### 世界观
- 时代背景：
- 地理环境：
- 社会结构：
- 特殊设定：

### 主题思想
- 核心主题：
- 要传达的价值观：
- 读者群体：

## 故事结构

### 开端（起）
- 背景介绍：
- 主角出场：
- 引发事件：

### 发展（承）
- 矛盾升级：
- 人物关系：
- 情节推进：

### 高潮（转）
- 冲突爆发：
- 关键选择：
- 转折点：

### 结局（合）
- 矛盾解决：
- 人物成长：
- 主题升华：

## 章节规划

| 章节 | 标题 | 主要情节 | 字数 | 状态 |
|------|------|----------|------|------|
| 第一章 | 开始 | 故事开端 | 3000 | 草稿 |
| 第二章 |  |  |  | 规划中 |
| ... |  |  |  |  |

---
*随时更新你的大纲*
`
    }
  ],
  
  requiredDirectories: [
    'manuscripts',
    'characters', 
    'outlines',
    'research',
    'backups',
    'assets'
  ]
}

/**
 * 获取所有可用的项目模板
 */
export function getAvailableTemplates(): ProjectTemplate[] {
  return [NIMBRIA_PROJECT_TEMPLATE]
}

/**
 * 根据ID获取项目模板
 */
export function getTemplateById(templateId: string): ProjectTemplate | null {
  const templates = getAvailableTemplates()
  return templates.find(t => t.id === templateId) || null
}

/**
 * 验证项目配置的完整性
 */
export function validateProjectConfig(config: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!config) {
    errors.push('配置文件为空')
    return { isValid: false, errors }
  }

  // 检查必需字段
  const requiredFields = [
    'projectName',
    'createdAt', 
    'version',
    'type',
    'novel.title',
    'novel.author'
  ]

  for (const field of requiredFields) {
    const fieldParts = field.split('.')
    let value = config
    
    for (const part of fieldParts) {
      value = value?.[part]
    }
    
    if (!value) {
      errors.push(`缺少必需字段: ${field}`)
    }
  }

  // 检查类型
  if (config.type !== 'nimbria-novel-project') {
    errors.push('项目类型不匹配')
  }

  // 检查版本格式
  if (config.version && !/^\d+\.\d+\.\d+$/.test(config.version)) {
    errors.push('版本号格式错误')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 模板变量替换
 */
export function replaceTemplateVariables(content: string, variables: Record<string, string>): string {
  let result = content
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value || '')
  }
  
  return result
}
