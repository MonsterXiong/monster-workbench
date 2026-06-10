<script setup lang="ts">
import LoadingIndicatorDemo from "./components/LoadingIndicatorDemo.vue";
import LoadingSkeletonCardDemo from "./components/LoadingSkeletonCardDemo.vue";
import LoadingProgressDemo from "./components/LoadingProgressDemo.vue";

defineProps<{
  activeComponentKey: string;
}>();
</script>

<template>
  <div>
    <LoadingIndicatorDemo v-if="activeComponentKey === 'loading'" />
    <LoadingSkeletonCardDemo v-else-if="activeComponentKey === 'skeleton-card'" />
    <LoadingProgressDemo v-else-if="activeComponentKey === 'progress'" />
  </div>
</template>
