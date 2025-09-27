import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchHomeDashboardData } from './DataSource';
import type { HomeDashboardData } from './types';

export const useHomeDashboardStore = defineStore('home-dashboard', () => {
  const data = ref<HomeDashboardData | null>(null);
  const loading = ref(false);
  const lastUpdated = ref<string | null>(null);

  async function load() {
    loading.value = true;

    try {
      const result = await fetchHomeDashboardData();
      data.value = result;
      lastUpdated.value = new Date().toISOString();
    } catch (error) {
      console.error('加载 HomeDashboard 数据失败：', error);
    } finally {
      loading.value = false;
    }
  }

  return {
    data,
    loading,
    lastUpdated,
    load
  };
});

