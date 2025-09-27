<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="main-layout__header">
      <home-topbar />
    </q-header>

    <q-page-container class="main-layout__container">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import HomeTopbar from 'components/shell/topbar/HomeTopbar.vue';
</script>

<style scoped>
.main-layout__header {
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.main-layout__container {
  background: #f5f7fb;
}
</style>