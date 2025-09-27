export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export interface KeyMetric {
  id: string;
  label: string;
  value: string;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  description?: string;
}

export interface ProjectProgressItem {
  id: string;
  name: string;
  status: 'on-track' | 'delayed' | 'blocked';
  progress: number;
  owner: string;
  dueDate?: string;
}

export interface HomeNotification {
  id: string;
  title: string;
  content: string;
  time: string;
  type: 'info' | 'warning' | 'success';
}

export interface ResourceLink {
  id: string;
  label: string;
  description: string;
  icon: string;
  to?: string;
}

export interface HomeDashboardData {
  quickActions: QuickAction[];
  keyMetrics: KeyMetric[];
  projectProgress: ProjectProgressItem[];
  notifications: HomeNotification[];
  resourceLinks: ResourceLink[];
}

export interface HomeDashboardState {
  data: HomeDashboardData | null;
  loading: boolean;
  lastUpdated: string | null;
}

