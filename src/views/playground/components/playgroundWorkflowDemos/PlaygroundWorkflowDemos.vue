<script setup lang="ts">
import WorkflowStepperDemo from "./components/WorkflowStepperDemo.vue";
import WorkflowTimelineDemo from "./components/WorkflowTimelineDemo.vue";

defineProps<{
  activeComponentKey: string;
}>();
</script>

<template>
  <div>
    <WorkflowStepperDemo v-if="activeComponentKey === 'stepper'" />
    <WorkflowTimelineDemo v-else-if="activeComponentKey === 'timeline'" />
  </div>
</template>
