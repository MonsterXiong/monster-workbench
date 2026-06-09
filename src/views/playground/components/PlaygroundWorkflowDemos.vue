<script setup lang="ts">
import { ref } from "vue";
import PlaygroundDemoSection from "./PlaygroundDemoSection.vue";

defineProps<{
  activeComponentKey: string;
}>();

const workflowStep = ref(1);
const selectedTimelineKey = ref("review");

const workflowSteps = [
  { key: "prepare", title: "准备配置", description: "收集字段与依赖。" },
  { key: "scan", title: "扫描组件", description: "发现未展示组件。" },
  { key: "build", title: "生成演示", description: "补充完整状态。", error: true },
  { key: "verify", title: "验证", description: "类型与视觉复核。", disabled: true },
];

const releaseSteps = [
  { key: "draft", title: "草稿", description: "填写信息。", state: "done" as const, icon: "FileText" },
  { key: "review", title: "审核", description: "等待确认。", state: "current" as const, icon: "ShieldCheck" },
  { key: "publish", title: "发布", description: "生成版本。", state: "pending" as const, icon: "Rocket" },
  { key: "notify", title: "通知", description: "同步结果。", state: "disabled" as const, icon: "Bell" },
];

const longStepperSteps = [
  {
    key: "collect",
    title: "收集需要迁移的公共组件和对应页面入口",
    description: "长标题和长描述在窄容器中需要自然换行，避免步骤卡片把页面撑出横向滚动。",
    state: "done" as const,
    icon: "ListChecks",
  },
  {
    key: "review",
    title: "逐个补齐状态、交互、键盘和视觉反馈",
    description: "适合流程配置页、导入向导、发布检查和组件沙箱的长任务说明。",
    state: "current" as const,
    icon: "ScanSearch",
  },
];

const timelineItems = [
  {
    key: "create",
    title: "新增组件入口",
    time: "09:30",
    description: "完成 BaseFilterBar 独立展示，并补齐筛选摘要、动作区和紧凑态。",
    type: "success" as const,
    icon: "Plus",
    meta: "组件平台",
    tag: "已完成",
  },
  {
    key: "review",
    title: "视觉复核",
    time: "10:10",
    description: "调整拖拽手柄 hover 高亮，统一页面留白与分割线背景。",
    type: "primary" as const,
    icon: "Eye",
    meta: "设计复核",
    tag: "进行中",
  },
  {
    key: "pending",
    title: "待处理",
    time: "待处理",
    description: "继续逐个审查 Playground 组件能力，优先补高频展示、容器和表单组件。",
    type: "warning" as const,
    icon: "Monitor",
    meta: "组件沙箱",
    tag: "排队",
  },
  {
    key: "blocked",
    title: "外部依赖",
    time: "稍后",
    description: "等待真实业务页面复核后再迁移到更多页面，避免和页面开发冲突。",
    type: "neutral" as const,
    icon: "Clock",
    meta: "待确认",
    tag: "只读",
    disabled: true,
  },
];

const releaseTimelineItems = [
  {
    key: "draft",
    title: "草稿编排",
    time: "D1",
    description: "整理变更说明、组件截图和验证记录。",
    type: "success" as const,
    meta: "Owner: UI",
    tag: "Done",
  },
  {
    key: "check",
    title: "质量门禁",
    time: "D2",
    description: "执行类型检查、架构检查和浏览器验收。",
    type: "primary" as const,
    meta: "CI Gate",
    tag: "Active",
  },
  {
    key: "publish",
    title: "发布同步",
    time: "D3",
    description: "同步组件说明，通知使用方按公共组件方式接入。",
    type: "warning" as const,
    meta: "Docs",
    tag: "Next",
  },
];

const longTimelineItems = [
  {
    key: "long-review",
    title: "超长任务标题会在 wrapTitle 开启后自然换行，避免窄容器里被截断",
    time: "11:40",
    description:
      "时间线经常出现在抽屉、审计详情和发布记录中，描述文本可能包含较长的业务背景。开启 wrapDescription 后应该完整展示，并且不会让内容区产生横向溢出。",
    type: "primary" as const,
    icon: "ScrollText",
    meta: "长文案",
    tag: "Wrap",
  },
];
</script>

<template>
  <section v-if="activeComponentKey === 'stepper'" class="detail-stack">
    <PlaygroundDemoSection title="步骤条" subtitle="向导、导入、发布检查和多阶段任务都可以复用。" icon="Footprints">
      <BasePanel title="横向流程" subtitle="支持完成态、当前态、禁用态和点击切换。" divided>
        <BaseStepper :steps="workflowSteps" :current="workflowStep" clickable linear surface="muted" @select="workflowStep = $event.index" />
        <template #footer>
          <div class="step-actions">
            <BaseButton type="neutral" size="sm" :disabled="workflowStep <= 0" @click="workflowStep -= 1">上一步</BaseButton>
            <BaseButton type="primary" size="sm" :disabled="workflowStep >= workflowSteps.length - 1" @click="workflowStep += 1">下一步</BaseButton>
          </div>
        </template>
      </BasePanel>

      <BasePanel title="纵向错误态" subtitle="适合抽屉、侧栏和校验流程。">
        <BaseStepper :steps="workflowSteps" :current="2" vertical size="sm" surface="plain" :bordered="false" />
      </BasePanel>

      <BasePanel title="发布流程" subtitle="自定义图标、状态和大尺寸适合发布检查。">
        <BaseStepper :steps="releaseSteps" :current="1" size="lg" :columns="4" aria-label="发布流程步骤" />
      </BasePanel>

      <div class="demo-grid">
        <BasePanel title="状态展示" subtitle="空态和加载态保持流程区域结构稳定。">
          <div class="stepper-demo-stack">
            <BaseStepper :steps="[]" :current="0" empty-text="暂无流程步骤" surface="muted" />
            <BaseStepper :steps="workflowSteps" :current="1" loading loading-text="加载步骤配置" size="sm" />
          </div>
        </BasePanel>
        <BasePanel title="长文案步骤" subtitle="标题与描述支持换行，不撑出内容区域。">
          <BaseStepper
            :steps="longStepperSteps"
            :current="1"
            wrap-title
            wrap-description
            :max-description-lines="4"
            surface="plain"
            :bordered="false"
            vertical
          />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'timeline'" class="detail-stack">
    <PlaygroundDemoSection title="时间线" subtitle="记录任务、发布、审计和同步事件。" icon="History">
      <div class="demo-grid demo-grid--wide">
        <BasePanel title="审计时间线" subtitle="支持图标、状态色、标签、meta、禁用项和点击选择。">
          <BaseTimeline
            :items="timelineItems"
            clickable
            :selected-key="selectedTimelineKey"
            aria-label="组件审计时间线"
            @select="selectedTimelineKey = $event.item.key"
          >
            <template #actions="{ item }">
              <BaseBadge v-if="item.key === selectedTimelineKey" type="primary" size="sm">已选中</BaseBadge>
            </template>
          </BaseTimeline>
          <template #footer>
            <span class="timeline-result">当前选择：{{ selectedTimelineKey }}</span>
          </template>
        </BasePanel>
        <BasePanel title="紧凑日志" subtitle="plain 表面和圆点标记适合侧栏、详情卡片和抽屉嵌入。" muted>
          <BaseTimeline :items="timelineItems" dense size="sm" surface="plain" :bordered="false" marker="dot" reverse />
        </BasePanel>
      </div>

      <BasePanel title="发布记录" subtitle="数字节点、大尺寸和 muted 表面适合阶段性发布说明。">
        <BaseTimeline :items="releaseTimelineItems" size="lg" surface="muted" marker="number" aria-label="发布记录时间线">
          <template #actions="{ item }">
            <BaseButton v-if="item.key === 'check'" type="primary" size="sm">查看检查</BaseButton>
            <BaseButton v-else type="neutral" size="sm">查看详情</BaseButton>
          </template>
        </BaseTimeline>
        <template #footer>
          <span class="timeline-result">覆盖 dot / icon / number 三种标记和 card / muted / plain 三种表面。</span>
        </template>
      </BasePanel>
      <div class="demo-grid">
        <BasePanel title="只读记录" subtitle="保留旧 API：只传 items 就能展示标准时间线。">
          <BaseTimeline :items="timelineItems" />
        </BasePanel>
        <BasePanel title="状态与长文案" subtitle="空态、加载态、选中态和长文案换行保持稳定。">
          <div class="timeline-demo-stack">
            <BaseTimeline :items="[]" empty-text="暂无审计记录" surface="muted" />
            <BaseTimeline :items="timelineItems" loading loading-text="加载审计记录" dense size="sm" />
            <BaseTimeline
              :items="longTimelineItems"
              wrap-title
              wrap-description
              :max-description-lines="4"
              marker="number"
              surface="plain"
              :bordered="false"
            />
          </div>
        </BasePanel>
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

.demo-grid--wide {
  @apply lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)];
}

.step-actions {
  @apply flex justify-end gap-2;
}

.timeline-result {
  @apply text-xs font-black text-slate-500 dark:text-slate-400;
}

.timeline-demo-stack {
  @apply grid gap-3;
}

.stepper-demo-stack {
  @apply grid gap-3;
}
</style>
