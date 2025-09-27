import type { HomeDashboardData } from './types';

export const homeDashboardMock: HomeDashboardData = {
  quickActions: [
    {
      id: 'new-project',
      label: '新建项目',
      description: '从模板快速创建项目工作区',
      icon: 'add_circle'
    },
    {
      id: 'import-data',
      label: '导入数据',
      description: '从外部文件或工具导入数据集',
      icon: 'cloud_upload'
    },
    {
      id: 'open-recent',
      label: '最近项目',
      description: '快速回到最近使用的项目',
      icon: 'history'
    }
  ],
  keyMetrics: [
    {
      id: 'active-projects',
      label: '活跃项目',
      value: '8',
      change: { value: 2, trend: 'up' },
      description: '本周新增项目数量'
    },
    {
      id: 'tasks-completed',
      label: '已完成任务',
      value: '124',
      change: { value: 12, trend: 'up' }
    },
    {
      id: 'pending-reviews',
      label: '待审核',
      value: '5',
      change: { value: 1, trend: 'down' }
    }
  ],
  projectProgress: [
    {
      id: 'proj-1',
      name: 'Nimbria 文档体系搭建',
      status: 'on-track',
      progress: 68,
      owner: 'Alice',
      dueDate: '2025-10-12'
    },
    {
      id: 'proj-2',
      name: 'Electron 集成验证',
      status: 'delayed',
      progress: 42,
      owner: 'Bob',
      dueDate: '2025-10-08'
    },
    {
      id: 'proj-3',
      name: 'AI Agent 工作流梳理',
      status: 'on-track',
      progress: 85,
      owner: 'Carol'
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      title: '项目 “Electron 集成验证” 有新的风险提示',
      content: '最新一次构建失败，需要重新检查环境配置。',
      time: '15分钟前',
      type: 'warning'
    },
    {
      id: 'notif-2',
      title: 'Nimbria 文档体系搭建 已通过阶段性评审',
      content: '评审结论：结构清晰，可进入落地阶段。',
      time: '1小时前',
      type: 'success'
    },
    {
      id: 'notif-3',
      title: 'AI Agent 工作流梳理 提交新的讨论主题',
      content: '请在周五前完成讨论反馈。',
      time: '昨天 18:32',
      type: 'info'
    }
  ],
  resourceLinks: [
    {
      id: 'docs-architecture',
      label: '架构设计文档',
      description: '查看抽象架构与模块职责划分',
      icon: 'description'
    },
    {
      id: 'workflow',
      label: '开发工作流指南',
      description: '遵循通用工作流快速添加页面',
      icon: 'api'
    },
    {
      id: 'issue-board',
      label: '项目任务看板',
      description: '跟踪未解决任务及共识内容',
      icon: 'view_kanban'
    }
  ]
};

