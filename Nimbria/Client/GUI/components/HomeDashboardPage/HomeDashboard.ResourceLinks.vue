<template>
  <div class="dashboard-card">
    <header class="dashboard-card__header">
      <div>
        <h3 class="dashboard-card__title">资源导航</h3>
        <p class="dashboard-card__subtitle">快速浏览项目相关资料</p>
      </div>
    </header>

    <div class="resource-list">
      <div
        v-for="link in resourceLinks"
        :key="link.id"
        class="resource-link"
      >
        <q-icon :name="link.icon" color="primary" size="22px" />
        <div class="resource-link__content">
          <div class="resource-link__title">{{ link.label }}</div>
          <div class="resource-link__description">{{ link.description }}</div>
        </div>
        <q-icon name="chevron_right" class="resource-link__chevron" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useHomeDashboardStore } from '@stores/home';

const store = useHomeDashboardStore();
const { data } = storeToRefs(store);

const resourceLinks = computed(() => data.value?.resourceLinks ?? []);
</script>

<style scoped>
.resource-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resource-link__title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.resource-link__description {
  font-size: 12px;
  color: #6b7280;
}

.resource-link__chevron {
  color: #94a3b8;
}
</style>

