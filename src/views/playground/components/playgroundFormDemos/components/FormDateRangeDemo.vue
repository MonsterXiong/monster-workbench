<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const dateRangeValue = ref({ start: "2026-06-01", end: "2026-06-08" });
const compactDateRangeValue = ref({ start: "2026-06-06", end: "2026-06-12" });
const sundayDateRangeValue = ref({ start: "2026-06-07", end: "2026-06-14" });
const boundaryDateRangeValue = ref({ start: "2026-06-01", end: "2026-06-30" });
const boundaryOverflowDateRangeValue = ref({ start: "2026-05-20", end: "2026-07-02" });
const invalidOrderDateRangeValue = ref({ start: "2026-06-12", end: "2026-06-06" });
const plainDateRangeValue = ref({ start: "", end: "" });
const manualDateRangeValue = ref({ start: "2026-06-10", end: "2026-06-20" });

const datePresets = [
  { key: "week", label: "本周", start: "2026-06-01", end: "2026-06-08" },
  { key: "month", label: "本月", start: "2026-06-01", end: "2026-06-30" },
  { key: "release", label: "发布窗口", start: "2026-06-06", end: "2026-06-12" },
];
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="日期范围" subtitle="时间筛选、周起始、发布窗口、日志范围和统计报表都可以复用。" icon="CalendarRange">
      <div class="demo-grid">
        <BaseDateRange
          v-model="dateRangeValue"
          label="发布窗口"
          :presets="datePresets"
          min="2026-06-01"
          max="2026-06-30"
          size="lg"
          @preset="triggerToast(`已选择：${$event.label}`, 'info')"
        />
        <BaseDateRange
          v-model="compactDateRangeValue"
          label="紧凑范围"
          :presets="datePresets.slice(0, 2)"
          min="2026-06-01"
          max="2026-06-30"
          compact
          surface="muted"
        />
        <BaseDateRange
          v-model="sundayDateRangeValue"
          label="周日起始"
          :first-day-of-week="0"
          min="2026-06-01"
          max="2026-06-30"
          compact
        />
        <BaseDateRange
          v-model="boundaryDateRangeValue"
          label="边界限制"
          start-placeholder="最早日期"
          end-placeholder="最晚日期"
          min="2026-06-01"
          max="2026-06-30"
          surface="muted"
        />
        <BaseDateRange
          v-model="boundaryOverflowDateRangeValue"
          label="越界提示"
          :presets="datePresets"
          min="2026-06-01"
          max="2026-06-30"
          compact
          surface="muted"
        />
        <BaseDateRange
          :model-value="{ start: '', end: '' }"
          label="错误态"
          error="结束日期不能早于开始日期。"
          compact
        />
        <BaseDateRange
          v-model="invalidOrderDateRangeValue"
          label="自动校验"
          min="2026-06-01"
          max="2026-06-30"
          compact
        />
        <BaseDateRange :model-value="dateRangeValue" label="只读态" readonly />
        <BaseDateRange :model-value="dateRangeValue" label="禁用态" disabled />
        <BaseDateRange
          v-model="plainDateRangeValue"
          label="Plain 嵌入"
          surface="plain"
          :presets="datePresets"
          min="2026-06-01"
          max="2026-06-30"
        />
        <BaseDateRange
          v-model="manualDateRangeValue"
          label="手输模式"
          :show-calendar="false"
          surface="muted"
          compact
        />
      </div>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.demo-grid {
  @apply grid gap-4 lg:grid-cols-2;
}
</style>
