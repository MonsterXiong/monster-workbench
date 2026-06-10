<script setup lang="ts">
import CreativeWorkflowDemo from "./components/CreativeWorkflowDemo.vue";
</script>

<template>
  <main class="creative-page">
    <CreativeWorkflowDemo />
  </main>
</template>

<style scoped>
.creative-page {
  @apply h-full min-h-0 overflow-hidden text-slate-900 dark:text-slate-100;
}
</style>
