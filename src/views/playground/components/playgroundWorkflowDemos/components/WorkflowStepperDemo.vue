<script setup lang="ts">
import { ref } from "vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const workflowStep = ref(1);

const workflowSteps = [
  { key: "prepare", title: "Prepare", description: "Collect inputs and dependencies." },
  { key: "scan", title: "Scan", description: "Find missing coverage." },
  { key: "build", title: "Build", description: "Fill the demo state.", error: true },
  { key: "verify", title: "Verify", description: "Type and visual checks.", disabled: true },
];
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="Stepper" subtitle="A compact demo for progress and review states." icon="Footprints">
      <BasePanel title="Horizontal" subtitle="Completed, current, and disabled steps.">
        <BaseStepper :steps="workflowSteps" :current="workflowStep" clickable linear surface="muted" @select="workflowStep = $event.index" />
      </BasePanel>
      <BasePanel title="Vertical" subtitle="A narrow layout for side panels.">
        <BaseStepper :steps="workflowSteps" :current="2" vertical size="sm" surface="plain" :bordered="false" />
      </BasePanel>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}
</style>
