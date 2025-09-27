<template>
  <div class="dashboard-card">
    <header class="dashboard-card__header">
      <div>
        <h3 class="dashboard-card__title">关键指标</h3>
        <p class="dashboard-card__subtitle">近期项目表现与任务推进概览</p>
      </div>
      <q-btn flat round dense icon="refresh" @click="reload" />
    </header>

    <q-skeleton type="QAvatar" v-if="loading" class="q-mt-lg" />

    <div v-else class="metrics-grid">
      <div v-for="metric in metrics" :key="metric.id" class="metric-item">
        <span class="metric-item__label">{{ metric.label }}</span>
        <span class="metric-item__value">{{ metric.value }}</span>
        <span
          v-if="metric.change"
          class="metric-item__change"
          :class="`metric-item__change--${metric.change.trend}`"
        >
          <q-icon :name="metric.change.trend === 'up' ? 'trending_up' : metric.change.trend === 'down' ? 'trending_down' : 'drag_handle'" size="16px" />
          {{ metric.change.value }}
        </span>
        <span class="metric-item__description" v-if="metric.description">
          {{ metric.description }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useHomeDashboardStore } from '@stores/home';

const store = useHomeDashboardStore();
const { data, loading } = storeToRefs(store);

const metrics = computed(() => data.value?.keyMetrics ?? []);

function reload() {
  void store.load();
}
</script>

<style scoped>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 18px;
}

.metric-item__label {
  font-size: 14px;
  color: #64748b;
}

.metric-item__description {
  font-size: 12px;
  color: #94a3b8;
}
</style>

