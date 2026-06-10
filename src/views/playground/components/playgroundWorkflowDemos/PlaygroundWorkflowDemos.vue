<script setup lang="ts">
import WorkflowCreativeDemo from "./components/WorkflowCreativeDemo.vue";
import WorkflowStepperDemo from "./components/WorkflowStepperDemo.vue";
import WorkflowTimelineDemo from "./components/WorkflowTimelineDemo.vue";

defineProps<{
  activeComponentKey: string;
}>();
</script>

<template>
  <div>
    <WorkflowCreativeDemo v-if="activeComponentKey === 'creative-workflow'" />
    <WorkflowStepperDemo v-else-if="activeComponentKey === 'stepper'" />
    <WorkflowTimelineDemo v-else-if="activeComponentKey === 'timeline'" />
  </div>
</template>
