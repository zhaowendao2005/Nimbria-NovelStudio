<template>
  <div class="dashboard-card">
    <header class="dashboard-card__header">
      <div>
        <h3 class="dashboard-card__title">项目进度</h3>
        <p class="dashboard-card__subtitle">关注关键项目当前状态</p>
      </div>
    </header>

    <div class="progress-list">
      <div
        v-for="project in projectProgress"
        :key="project.id"
        class="progress-item"
      >
        <div class="progress-item__header">
          <span>{{ project.name }}</span>
          <span class="progress-item__owner">负责人：{{ project.owner }}</span>
        </div>

        <div class="progress-item__meta">
          <span
            class="progress-item__status"
            :class="`progress-item__status--${project.status}`"
          >
            {{ statusLabel(project.status) }}
          </span>
          <span v-if="project.dueDate" class="progress-item__due">
            截止：{{ project.dueDate }}
          </span>
        </div>

        <q-linear-progress :value="project.progress / 100" rounded size="10px" color="primary" />
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

const projectProgress = computed(() => data.value?.projectProgress ?? []);

function statusLabel(status: 'on-track' | 'delayed' | 'blocked') {
  switch (status) {
    case 'on-track':
      return '正常';
    case 'delayed':
      return '延期';
    case 'blocked':
      return '阻塞';
    default:
      return '未知';
  }
}
</script>

<style scoped>
.progress-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-item__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #64748b;
}

.progress-item__owner {
  font-size: 12px;
  color: #475569;
}

.progress-item__due {
  color: #0f172a;
}
</style>

