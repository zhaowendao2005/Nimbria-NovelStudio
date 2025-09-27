import { ref } from 'vue';
import { homeDashboardMock } from './mock';
import type { HomeDashboardData } from './types';

export interface HomeDashboardDataSourceOptions {
  useMock?: boolean;
}

const useMockSource = ref(true);

export function configureHomeDashboardDataSource(options: HomeDashboardDataSourceOptions) {
  useMockSource.value = options.useMock ?? true;
}

export async function fetchHomeDashboardData(): Promise<HomeDashboardData> {
  if (useMockSource.value) {
    return Promise.resolve(homeDashboardMock);
  }

  // TODO: 接入真实的 Service 或 Electron 数据源
  throw new Error('HomeDashboardData 数据源未配置');
}

