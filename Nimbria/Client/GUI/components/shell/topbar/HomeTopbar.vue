<template>
  <q-toolbar class="home-topbar">
    <div class="home-topbar__left">
      <q-avatar size="36px" class="home-topbar__logo">
        <img src="/icons/favicon-32x32.png" alt="Nimbria" />
      </q-avatar>
      <div class="home-topbar__titles">
        <span class="home-topbar__product">Nimbria</span>
        <span class="home-topbar__system">Project Home</span>
      </div>
    </div>

    <q-space />

    <div class="home-topbar__actions">
      <q-btn round dense flat icon="search" aria-label="搜索项目" />
      <q-btn round dense flat icon="notifications" aria-label="通知" />
      <q-separator vertical spaced />
      <q-btn flat unelevated class="home-topbar__profile" icon="account_circle" label="访客" />
    </div>
  </q-toolbar>
</template>

<script setup lang="ts">
// Home 系统 Topbar
// TODO: 当接入真实数据时加载用户信息、通知等
</script>

<style scoped>
.home-topbar {
  padding: 0 20px;
  min-height: 64px;
}

.home-topbar__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.home-topbar__logo {
  background: #eef2ff;
  border: 1px solid rgba(109, 123, 255, 0.2);
}

.home-topbar__titles {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.home-topbar__product {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.home-topbar__system {
  font-size: 12px;
  color: #6b7280;
}

.home-topbar__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.home-topbar__profile {
  border-radius: 999px;
  padding-left: 12px;
  padding-right: 16px;
  background: rgba(59, 130, 246, 0.08);
  color: #1d4ed8;
}
</style>

