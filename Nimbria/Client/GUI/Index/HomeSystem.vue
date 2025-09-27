<template>
  <div class="home-system">
    <header class="home-system__header">
      <h1 class="home-system__title">Home System 控制台</h1>
      <p class="home-system__subtitle">管理项目并快速进入各个业务子系统</p>
    </header>

    <nav class="home-system__nav">
      <q-btn-group unelevated class="home-system__nav-group">
        <q-btn
          v-for="item in navigationItems"
          :key="item.to"
          :label="item.label"
          :icon="item.icon"
          :color="isActive(item.to) ? 'primary' : 'grey-7'"
          :text-color="isActive(item.to) ? 'white' : 'dark'"
          :outline="!isActive(item.to)"
          :disable="item.disable"
          @click="go(item.to)"
        />
      </q-btn-group>
    </nav>

    <section class="home-system__content">
      <router-view />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

onMounted(() => {
  console.log('🏠 HomeSystem component mounted successfully!');
});

interface NavigationItem {
  label: string;
  icon: string;
  to: string;
  disable?: boolean;
}

const route = useRoute();
const router = useRouter();

const navigationItems = computed<NavigationItem[]>(() => [
  { label: 'Home Dashboard', icon: 'dashboard', to: '/' },
  { label: 'Module A 示例', icon: 'widgets', to: '/module-a' },
  { label: '更多系统 (规划中)', icon: 'pending', to: '/upcoming', disable: true }
]);

function go(target: string) {
  if (target === route.path) {
    return;
  }

  void router.push(target === '/' ? '/' : target);
}

function isActive(target: string) {
  if (target === '/') {
    return route.path === '/' || route.path === '';
  }

  return route.path.startsWith(target);
}
</script>

<style scoped>
.home-system {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  box-sizing: border-box;
  gap: 24px;
}

.home-system__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.home-system__title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #212121;
}

.home-system__subtitle {
  margin: 0;
  font-size: 14px;
  color: #616161;
}

.home-system__nav-group {
  max-width: 640px;
}

.home-system__content {
  flex: 1;
  min-height: 0;
}
</style>

