<script setup lang="ts">
import { ref } from "vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const selectedTimelineKey = ref("review");
const timelineInstanceText = ref("等待实例操作");
const timelineInstanceRef = ref<{
  getNativeTimeline: () => unknown;
  getElement: () => HTMLElement | null;
  getItemElement: (key: string) => HTMLElement | null;
  focusItem: (key: string) => HTMLElement | null;
} | null>(null);

const timelineItems = [
  {
    key: "create",
    title: "新增组件入口",
    time: "09:30",
    description: "补充流程类组件演示，同时保持目录和内容区布局稳定。",
    type: "success" as const,
    icon: "Plus",
    meta: "组件平台",
    tag: "已完成",
  },
  {
    key: "review",
    title: "视觉复核",
    time: "10:10",
    description: "检查悬停高亮、卡片间距和窄容器下的文本换行。",
    type: "primary" as const,
    icon: "Eye",
    meta: "设计审查",
    tag: "进行中",
  },
  {
    key: "pending",
    title: "等待验证",
    time: "稍后",
    description: "继续检查组件沙箱覆盖范围和实例方法输出。",
    type: "warning" as const,
    icon: "Monitor",
    meta: "组件沙箱",
    tag: "排队中",
  },
];

const longTimelineItems = [
  {
    key: "long-review",
    title: "这是一条用于检查窄容器自然换行的长标题记录",
    time: "11:40",
    description: "长标题、长说明和操作区需要在有限宽度内保持可读，不能制造横向溢出。",
    type: "primary" as const,
    icon: "ScrollText",
    meta: "长文本记录",
    tag: "自动换行",
  },
  {
    key: "trace",
    title: "时间线审查追踪标识20260609组件沙箱视觉校验超长连续文本",
    time: "2026-06-09 18:42:16.238 UTC+08:00",
    description:
      "用于校验超长连续文本在窄容器中是否自然换行：组件沙箱时间线审查追踪标识20260609视觉校验请求组件状态动作区域长内容回归检查",
    type: "warning" as const,
    icon: "Link",
    meta: "组件库/流程反馈/时间线/超长元信息校验",
    tag: "追踪标识",
  },
  {
    key: "disabled-action",
    title: "只读记录仍展示上下文，但不允许被选中",
    time: "稍后",
    description: "禁用项需要保持内容可读，同时阻止点击选择和动作触发。",
    type: "neutral" as const,
    icon: "Lock",
    meta: "只读状态",
    tag: "已禁用",
    disabled: true,
  },
];

const releaseTimelineItems = [
  {
    key: "api",
    title: "接口补齐",
    time: "2026-06-13 09:20",
    description: "公共组件保留项目接口，同时把稳定交互交给 Element Plus。",
    type: "success" as const,
    icon: "Braces",
    meta: "公共组件",
    tag: "已完成",
  },
  {
    key: "sandbox",
    title: "沙箱展示",
    time: "2026-06-13 10:05",
    description: "组件列表下展示完整能力，不展示主题 token。",
    type: "primary" as const,
    icon: "MonitorCheck",
    meta: "组件沙箱",
    tag: "复核中",
  },
  {
    key: "verify",
    title: "验证",
    time: "2026-06-13 10:40",
    description: "类型、架构和视觉检查通过后再同步文档。",
    type: "warning" as const,
    icon: "ShieldCheck",
    meta: "验证链路",
    tag: "待验证",
  },
];

const readTimelineElement = () => {
  const element = timelineInstanceRef.value?.getElement();
  timelineInstanceText.value = element ? "根节点：时间线容器" : "未读取到根节点";
};

const focusReviewItem = () => {
  const element = timelineInstanceRef.value?.focusItem("review");
  timelineInstanceText.value = element ? `视觉复核: ${element.textContent?.trim() || "-"}` : "未找到视觉复核记录";
};

const focusPendingItem = () => {
  const element = timelineInstanceRef.value?.focusItem("pending");
  timelineInstanceText.value = element ? `等待验证: ${element.textContent?.trim() || "-"}` : "未找到等待验证记录";
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="时间线" subtitle="记录任务流转、发布事件、长文本和原生时间戳。" icon="History">
      <BasePanel title="可交互记录" subtitle="支持点击选择、动作区、禁用态和实例能力。">
        <BaseTimeline
          ref="timelineInstanceRef"
          data-native-timeline-ref="base-timeline-instance"
          :items="timelineItems"
          clickable
          :selected-key="selectedTimelineKey"
          aria-label="组件流程时间线"
          actions-label="时间线记录操作"
          @select="selectedTimelineKey = $event.item.key"
        >
          <template #actions="{ selected, interactiveDisabled }">
            <BaseBadge v-if="selected" type="primary" size="sm">已选中</BaseBadge>
            <BaseButton v-else type="neutral" size="sm" :disabled="interactiveDisabled">查看</BaseButton>
          </template>
        </BaseTimeline>
        <div class="timeline-instance-panel">
          <div class="timeline-instance-copy">
            <BaseIcon name="Workflow" size="14" aria-hidden="true" />
            <span>实例能力</span>
            <strong>{{ timelineInstanceText }}</strong>
          </div>
          <div class="timeline-instance-actions">
            <BaseButton size="xs" type="secondary" outline @click="readTimelineElement">读取根节点</BaseButton>
            <BaseButton size="xs" type="secondary" outline @click="focusReviewItem">聚焦复核</BaseButton>
            <BaseButton size="xs" type="secondary" outline @click="focusPendingItem">聚焦验证</BaseButton>
          </div>
        </div>
      </BasePanel>
      <BasePanel title="长文本记录" subtitle="长标题、长追踪文本和只读项在窄容器里也不会溢出。">
        <BaseTimeline :items="longTimelineItems" wrap-title wrap-description :max-description-lines="4" marker="number" surface="plain" :bordered="false" />
      </BasePanel>
      <BasePanel title="原生时间戳" subtitle="复用 Element Plus 时间戳位置能力，同时保持项目视觉。">
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

.timeline-instance-panel {
  @apply mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.timeline-instance-copy {
  @apply flex min-w-0 items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.timeline-instance-copy strong {
  @apply min-w-0 truncate text-slate-800 dark:text-slate-100;
}

.timeline-instance-actions {
  @apply flex shrink-0 flex-wrap items-center gap-2;
}
</style>
