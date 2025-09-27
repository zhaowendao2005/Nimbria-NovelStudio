<template>
  <div class="dashboard-card">
    <header class="dashboard-card__header">
      <div>
        <h3 class="dashboard-card__title">快捷操作</h3>
        <p class="dashboard-card__subtitle">常用项目操作快速入口</p>
      </div>
      <q-btn flat round dense icon="more_horiz" aria-label="更多操作" />
    </header>

    <q-list separator>
      <q-item
        v-for="action in quickActions"
        :key="action.id"
        clickable
        class="quick-action"
      >
        <q-item-section avatar>
          <q-icon :name="action.icon" color="primary" class="quick-action__icon" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ action.label }}</q-item-label>
          <q-item-label caption>{{ action.description }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon name="chevron_right" />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onMounted } from 'vue';
import { useHomeDashboardStore } from '@stores/home';

const store = useHomeDashboardStore();
const { data, loading } = storeToRefs(store);

const quickActions = computed(() => data.value?.quickActions ?? []);

onMounted(() => {
  if (!data.value && !loading.value) {
    void store.load();
  }
});
</script>

<style scoped>
.quick-action {
  border-radius: 12px;
  padding: 12px 4px;
}

.quick-action:hover {
  background: rgba(59, 130, 246, 0.08);
}

.quick-action__icon {
  font-size: 22px;
}
</style>

