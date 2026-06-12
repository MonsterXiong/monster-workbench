<script setup lang="ts">
import { ref } from "vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const workflowStep = ref(1);
const releaseStep = ref(2);
const simpleStep = ref(1);

const workflowSteps = [
  { key: "prepare", title: "Prepare", description: "Collect inputs and dependencies." },
  { key: "scan", title: "Scan", description: "Find missing coverage." },
  { key: "build", title: "Build", description: "Fill the demo state.", error: true },
  { key: "verify", title: "Verify", description: "Type and visual checks.", disabled: true },
];

const releaseSteps = [
  { key: "draft", title: "草稿", description: "整理组件 API 和沙箱示例。" },
  { key: "review", title: "复核", description: "设计和交互状态检查。" },
  { key: "publish", title: "发布", description: "合入公共组件规范。" },
  { key: "archive", title: "归档", description: "同步文档和记忆。" },
];

const simpleSteps = [
  { key: "input", title: "录入" },
  { key: "validate", title: "校验" },
  { key: "confirm", title: "确认" },
];
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="Stepper" subtitle="A compact demo for progress and review states." icon="Footprints">
      <BasePanel title="Horizontal" subtitle="Completed, current, and disabled steps.">
        <BaseStepper v-model:current="workflowStep" :steps="workflowSteps" clickable linear surface="muted" />
      </BasePanel>
      <BasePanel title="Vertical" subtitle="A narrow layout for side panels.">
        <BaseStepper :steps="workflowSteps" :current="2" vertical size="sm" surface="plain" :bordered="false" />
      </BasePanel>
      <BasePanel title="Simple" subtitle="Element Plus simple steps with project sizing and v-model.">
        <BaseStepper
          v-model:current="simpleStep"
          :steps="simpleSteps"
          clickable
          simple
          align-center
          surface="plain"
          :bordered="false"
        />
      </BasePanel>
      <BasePanel title="Status mapping" subtitle="Custom finish and process states stay behind the BaseStepper API.">
        <BaseStepper
          v-model:current="releaseStep"
          :steps="releaseSteps"
          clickable
          align-center
          :columns="4"
          finish-status="finish"
          process-status="process"
          size="lg"
        />
      </BasePanel>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}
</style>
