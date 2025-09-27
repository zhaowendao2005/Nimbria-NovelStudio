<template>
  <div class="dashboard-card">
    <header class="dashboard-card__header">
      <div>
        <h3 class="dashboard-card__title">最新动态</h3>
        <p class="dashboard-card__subtitle">跟进项目提醒与系统通知</p>
      </div>
      <q-btn flat dense icon="mark_email_read" aria-label="全部已读" />
    </header>

    <div class="notification-list">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification-item"
      >
        <div class="notification-item__title">
          {{ notification.title }}
        </div>
        <div class="notification-item__content">
          {{ notification.content }}
        </div>
        <div class="notification-item__time">{{ notification.time }}</div>
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

const notifications = computed(() => data.value?.notifications ?? []);
</script>

<style scoped>
.notification-item__content {
  font-size: 13px;
  color: #475569;
}
</style>

