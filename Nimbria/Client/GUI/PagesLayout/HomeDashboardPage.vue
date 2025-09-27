<template>
  <q-page class="home-dashboard">
    <section class="home-dashboard__main">
      <div class="home-dashboard__column home-dashboard__column--left">
        <home-dashboard-quick-actions />
        <home-dashboard-resource-links />
      </div>

      <div class="home-dashboard__column home-dashboard__column--center">
        <home-dashboard-key-metrics />
        <home-dashboard-project-progress />
      </div>

      <div class="home-dashboard__column home-dashboard__column--right">
        <home-dashboard-notifications />
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import HomeDashboardQuickActions from 'components/HomeDashboardPage/HomeDashboard.QuickActions.vue';
import HomeDashboardKeyMetrics from 'components/HomeDashboardPage/HomeDashboard.KeyMetrics.vue';
import HomeDashboardNotifications from 'components/HomeDashboardPage/HomeDashboard.Notifications.vue';
import HomeDashboardResourceLinks from 'components/HomeDashboardPage/HomeDashboard.ResourceLinks.vue';
import HomeDashboardProjectProgress from 'components/HomeDashboardPage/HomeDashboard.ProjectProgress.vue';

onMounted(() => {
  console.log('📊 HomeDashboardPage component mounted successfully!');
});
</script>

<style scoped lang="scss">
@use './HomeDashboardPage.scss';
</style>

