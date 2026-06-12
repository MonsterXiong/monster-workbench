<script setup lang="ts">
import { ref } from "vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const selectedTimelineKey = ref("review");

const timelineItems = [
  {
    key: "create",
    title: "Add component entry",
    time: "09:30",
    description: "Keep the layout stable while adding the new workflow demo.",
    type: "success" as const,
    icon: "Plus",
    meta: "component platform",
    tag: "done",
  },
  {
    key: "review",
    title: "Visual review",
    time: "10:10",
    description: "Tune hover highlight and spacing.",
    type: "primary" as const,
    icon: "Eye",
    meta: "design review",
    tag: "in progress",
  },
  {
    key: "pending",
    title: "Pending",
    time: "later",
    description: "Continue reviewing Playground coverage.",
    type: "warning" as const,
    icon: "Monitor",
    meta: "sandbox",
    tag: "queued",
  },
];

const longTimelineItems = [
  {
    key: "long-review",
    title: "A very long title that should wrap naturally in narrow containers.",
    time: "11:40",
    description: "Long labels should wrap without creating horizontal overflow.",
    type: "primary" as const,
    icon: "ScrollText",
    meta: "long form note",
    tag: "Wrap",
  },
  {
    key: "trace",
    title: "trace-20260609-component-playground-timeline-verification-with-very-long-unbroken-token",
    time: "2026-06-09 18:42:16.238 UTC+08:00",
    description:
      "https://monster.local/audit/component/BaseTimeline/events/very-long-path-segment-that-should-wrap-anywhere?trace_id=trace_01HZYX_LONG_LONG_LONG_LONG_LONG&request_id=req_component_sandbox_timeline_visual_check",
    type: "warning" as const,
    icon: "Link",
    meta: "workspace/components/workflow/timeline/very-long-meta-value",
    tag: "TraceId",
  },
  {
    key: "disabled-action",
    title: "Readonly item still shows context but does not allow selection.",
    time: "later",
    description: "Disabled actions should stay readable while blocking selection.",
    type: "neutral" as const,
    icon: "Lock",
    meta: "Readonly",
    tag: "Disabled",
    disabled: true,
  },
];

const releaseTimelineItems = [
  {
    key: "api",
    title: "API 补齐",
    time: "2026-06-13 09:20",
    description: "公共组件保留项目 API，同时把稳定交互交给 Element Plus。",
    type: "success" as const,
    icon: "Braces",
    meta: "Base*",
    tag: "done",
  },
  {
    key: "sandbox",
    title: "沙箱展示",
    time: "2026-06-13 10:05",
    description: "组件列表下展示完整能力，不展示主题 token。",
    type: "primary" as const,
    icon: "MonitorCheck",
    meta: "Playground",
    tag: "review",
  },
  {
    key: "verify",
    title: "验证",
    time: "2026-06-13 10:40",
    description: "类型、架构和视觉 smoke 通过后再同步文档。",
    type: "warning" as const,
    icon: "ShieldCheck",
    meta: "verify",
    tag: "pending",
  },
];
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="Timeline" subtitle="Record task and release events." icon="History">
      <BasePanel title="Timeline" subtitle="Clickable records with selection and actions.">
        <BaseTimeline
          :items="timelineItems"
          clickable
          :selected-key="selectedTimelineKey"
          aria-label="component timeline"
          actions-label="timeline actions"
          @select="selectedTimelineKey = $event.item.key"
        >
          <template #actions="{ selected, interactiveDisabled }">
            <BaseBadge v-if="selected" type="primary" size="sm">selected</BaseBadge>
            <BaseButton v-else type="neutral" size="sm" :disabled="interactiveDisabled">View</BaseButton>
          </template>
        </BaseTimeline>
      </BasePanel>
      <BasePanel title="Long items" subtitle="Wrap long labels safely in narrow containers.">
        <BaseTimeline :items="longTimelineItems" wrap-title wrap-description :max-description-lines="4" marker="number" surface="plain" :bordered="false" />
      </BasePanel>
      <BasePanel title="Native timestamps" subtitle="Use Element Plus timestamp placement without losing project styling.">
        <BaseTimeline
          :items="releaseTimelineItems"
          dense
          show-timestamp
          timestamp-placement="top"
          marker="dot"
          surface="muted"
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
