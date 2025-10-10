/**
 * Vite 开发环境下的统一 Mock 数据
 * 包含文件系统和项目管理相关的所有模拟数据
 */

// ============================================
// 类型定义
// ============================================

// 文件节点类型定义（与 MarkdownFile 类型保持一致）
interface MockFileNode {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  children?: MockFileNode[];
  metadata?: {
    size?: number;
    mtime?: Date;
  };
}

// 项目类型定义（与真实类型保持一致）
interface MockProject {
  id: string;
  name: string;
  path: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  cover?: string;
  tags?: string[];
}

// ============================================
// 文件系统 Mock 数据
// ============================================

// 模拟文件树结构
export const MOCK_FILE_TREE: MockFileNode[] = [
  {
    id: 'file-001',
    name: '第一章.md',
    path: '/第一章.md',
    isFolder: false,
    metadata: {
      size: 1024,
      mtime: new Date('2025-01-01')
    }
  },
  {
    id: 'file-002',
    name: '第二章.md',
    path: '/第二章.md',
    isFolder: false,
    metadata: {
      size: 2048,
      mtime: new Date('2025-01-02')
    }
  },
  {
    id: 'file-003',
    name: '第三章.md',
    path: '/第三章.md',
    isFolder: false,
    metadata: {
      size: 1536,
      mtime: new Date('2025-01-03')
    }
  },
  {
    id: 'folder-001',
    name: '设定资料',
    path: '/设定资料',
    isFolder: true,
    children: [
      {
        id: 'file-004',
        name: '世界观.md',
        path: '/设定资料/世界观.md',
        isFolder: false,
        metadata: {
          size: 3072,
          mtime: new Date('2025-01-04')
        }
      },
      {
        id: 'file-005',
        name: '人物设定.md',
        path: '/设定资料/人物设定.md',
        isFolder: false,
        metadata: {
          size: 2560,
          mtime: new Date('2025-01-05')
        }
      }
    ]
  },
  {
    id: 'folder-002',
    name: '大纲',
    path: '/大纲',
    isFolder: true,
    children: [
      {
        id: 'file-006',
        name: '故事大纲.md',
        path: '/大纲/故事大纲.md',
        isFolder: false,
        metadata: {
          size: 4096,
          mtime: new Date('2025-01-06')
        }
      }
    ]
  }
];

// 模拟文件内容（key 使用文件路径）
export const MOCK_FILE_CONTENTS: Record<string, string> = {
  '/第一章.md': `# 第一章：启程

这是一个关于星际探索的故事。

## 场景一：启航

> 2500年，人类第一次跨越银河系的边界。

宇宙飞船"希望号"缓缓离开地球轨道，船长李明站在舰桥前,望着渐渐远去的蓝色星球。

"航向设定完毕，准备进入超空间跳跃。"副驾驶报告道。

"很好，启动跃迁引擎。"李明深吸一口气，下达了命令。

飞船周围的空间开始扭曲，下一秒，他们便消失在了虚空之中...`,

  '/第二章.md': `# 第二章：未知星域

超空间跳跃结束后，飞船来到了一个从未被探索过的星域。

## 场景一：神秘信号

"船长，我们接收到了一个奇怪的信号。"通讯官突然报告。

"什么类型的信号？"李明皱起眉头。

"不像是自然现象，更像是...某种智能生命发出的。"

这个发现让所有人都紧张起来。在这片星域中，他们并不孤单。`,

  '/第三章.md': `# 第三章：初次接触

在追踪信号的过程中，飞船发现了一座巨大的空间站。

## 场景一：空间站

这座空间站的建造技术远超人类的想象，它静静地漂浮在虚空中，像是在等待着什么。

"尝试建立通讯。"李明命令道。

几分钟后，一个陌生的声音响起："欢迎，来自地球的旅行者..."`,

  '/设定资料/世界观.md': `# 世界观设定

## 时间背景

- **2500年**：人类已经完全掌握太阳系内的星际航行技术
- **2485年**：星际联邦正式成立
- **2490年**：超空间跃迁技术突破

## 宇宙结构

- 银河系分为7个主要星区
- 已知智慧种族：3个（包括人类）
- 未探索区域占比：85%

## 科技水平

- 超光速旅行：通过超空间跃迁实现
- 能源：可控核聚变 + 暗物质能源
- 武器：等离子炮、引力武器
- 防御：能量护盾、相位装甲`,

  '/设定资料/人物设定.md': `# 人物设定

## 主要角色

### 李明（船长）
- **年龄**：42岁
- **背景**：前星际联邦军官，经验丰富
- **性格**：冷静、果断、富有责任感
- **特长**：战术指挥、危机处理

### 艾莉（科学官）
- **年龄**：35岁
- **背景**：天体物理学博士
- **性格**：好奇心强、逻辑思维
- **特长**：科学分析、外星语言学

### 马克（工程师）
- **年龄**：38岁
- **背景**：顶尖的飞船工程师
- **性格**：乐观、幽默、技术狂热
- **特长**：飞船维修、设备改造`,

  '/大纲/故事大纲.md': `# 故事大纲

## 第一部分：启航（第1-5章）

- 介绍背景和主要角色
- 飞船启程，进行首次超空间跃迁
- 到达未知星域

## 第二部分：探索（第6-15章）

- 发现神秘信号
- 接触未知文明
- 揭开古老秘密的一角
- 遭遇危险，飞船受损

## 第三部分：危机（第16-25章）

- 发现更大的阴谋
- 多方势力介入
- 船员间的信任危机
- 关键抉择时刻

## 第四部分：真相（第26-30章）

- 揭开所有谜团
- 最终对决
- 新的征程开始`
};

// 模拟网络延迟
function simulateDelay(ms: number = 200): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 文件系统 Mock API
 */
export const MockFileAPI = {
  /**
   * 获取文件树
   */
  async getFileTree(): Promise<MockFileNode[]> {
    console.log('[Mock] 获取文件树');
    await simulateDelay(150);
    return JSON.parse(JSON.stringify(MOCK_FILE_TREE)); // 深拷贝
  },

  /**
   * 获取文件内容
   */
  async getFileContent(filePath: string): Promise<string> {
    console.log(`[Mock] 获取文件内容: ${filePath}`);
    await simulateDelay(100);
    return MOCK_FILE_CONTENTS[filePath] || '# 文件未找到\n\n该文件暂无内容。';
  },

  /**
   * 保存文件内容
   */
  async saveFile(filePath: string, content: string): Promise<boolean> {
    console.log(`[Mock] 保存文件: ${filePath}`, content.substring(0, 50) + '...');
    await simulateDelay(150);
    MOCK_FILE_CONTENTS[filePath] = content;
    return true;
  },

  /**
   * 创建文件
   */
  async createFile(path: string, name: string): Promise<MockFileNode> {
    console.log(`[Mock] 创建文件: ${path}/${name}`);
    await simulateDelay(100);
    const newFile: MockFileNode = {
      id: `file-${Date.now()}`,
      name,
      path: `${path}/${name}`,
      isFolder: false,
      metadata: {
        size: 0,
        mtime: new Date()
      }
    };
    return newFile;
  },

  /**
   * 删除文件
   */
  async deleteFile(filePath: string): Promise<boolean> {
    console.log(`[Mock] 删除文件: ${filePath}`);
    await simulateDelay(100);
    delete MOCK_FILE_CONTENTS[filePath];
    return true;
  },

  /**
   * 重命名文件
   */
  async renameFile(filePath: string, newName: string): Promise<boolean> {
    console.log(`[Mock] 重命名文件: ${filePath} -> ${newName}`);
    await simulateDelay(100);
    // 在实际实现中，这里应该更新文件路径
    return true;
  },

  /**
   * 移动文件
   */
  async moveFile(filePath: string, targetPath: string): Promise<boolean> {
    console.log(`[Mock] 移动文件: ${filePath} -> ${targetPath}`);
    await simulateDelay(100);
    // 在实际实现中，这里应该更新文件路径和内容映射
    return true;
  }
};

// ============================================
// 项目管理 Mock 数据
// ============================================

// 模拟项目列表
export const MOCK_PROJECTS: MockProject[] = [
  {
    id: 'mock-project-001',
    name: '星际旅行',
    path: '/mock/projects/starjourney',
    description: '一个关于星际探索的科幻小说',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date(),
    tags: ['科幻', '太空', '冒险']
  },
  {
    id: 'mock-project-002',
    name: '古代传说',
    path: '/mock/projects/ancient-legends',
    description: '基于中国古代神话的奇幻故事',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date(),
    tags: ['奇幻', '神话', '古代']
  },
  {
    id: 'mock-project-003',
    name: '都市迷案',
    path: '/mock/projects/urban-mystery',
    description: '现代都市背景的悬疑推理小说',
    createdAt: new Date('2025-02-01'),
    updatedAt: new Date(),
    tags: ['悬疑', '推理', '现代']
  }
];

/**
 * 项目管理 Mock API
 */
export const MockProjectAPI = {
  /**
   * 获取项目列表
   */
  async getProjectList(): Promise<MockProject[]> {
    console.log('[Mock] 获取项目列表');
    await simulateDelay(200);
    return JSON.parse(JSON.stringify(MOCK_PROJECTS)); // 深拷贝
  },

  /**
   * 获取项目信息
   */
  async getProjectInfo(projectId: string): Promise<MockProject | null> {
    console.log(`[Mock] 获取项目信息: ${projectId}`);
    await simulateDelay(150);
    const project = MOCK_PROJECTS.find(p => p.id === projectId);
    return project ? JSON.parse(JSON.stringify(project)) : (MOCK_PROJECTS[0] ? JSON.parse(JSON.stringify(MOCK_PROJECTS[0])) : null);
  },

  /**
   * 创建项目
   */
  async createProject(name: string, path: string, description: string = ''): Promise<MockProject> {
    console.log(`[Mock] 创建项目: ${name}`);
    await simulateDelay(200);
    const newProject: MockProject = {
      id: `mock-project-${Date.now()}`,
      name,
      path,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    };
    MOCK_PROJECTS.push(newProject);
    return newProject;
  },

  /**
   * 更新项目信息
   */
  async updateProject(projectId: string, updates: Partial<MockProject>): Promise<boolean> {
    console.log(`[Mock] 更新项目: ${projectId}`, updates);
    await simulateDelay(150);
    const project = MOCK_PROJECTS.find(p => p.id === projectId);
    if (project) {
      Object.assign(project, updates, { updatedAt: new Date() });
      return true;
    }
    return false;
  },

  /**
   * 删除项目
   */
  async deleteProject(projectId: string): Promise<boolean> {
    console.log(`[Mock] 删除项目: ${projectId}`);
    await simulateDelay(100);
    const index = MOCK_PROJECTS.findIndex(p => p.id === projectId);
    if (index > -1) {
      MOCK_PROJECTS.splice(index, 1);
      return true;
    }
    return false;
  },

  /**
   * 获取最近打开的项目
   */
  async getRecentProjects(limit: number = 5): Promise<MockProject[]> {
    console.log(`[Mock] 获取最近项目 (limit: ${limit})`);
    await simulateDelay(100);
    return MOCK_PROJECTS.slice(0, limit);
  }
};

