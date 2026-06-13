<script setup lang="ts">
import { ref } from "vue";
import BaseStatCard from "../../../../../components/common/BaseStatCard.vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();
const statCardInstanceText = ref("等待实例操作");
const statCardInstanceRef = ref<InstanceType<typeof BaseStatCard> | null>(null);

const readStatCardElement = () => {
  const element = statCardInstanceRef.value?.getElement();
  statCardInstanceText.value = element ? `DOM: ${element.tagName.toLowerCase()}.${element.classList[0] || "root"}` : "未读取到 DOM";
};

const focusStatCard = () => {
  const element = statCardInstanceRef.value?.focus();
  statCardInstanceText.value = element ? "已聚焦可点击指标" : "指标不可聚焦";
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="统计卡片" subtitle="用于工作台、列表摘要和任务看板顶部指标。" icon="ChartNoAxesColumnIncreasing">
      <div class="stat-grid">
        <BaseStatCard
          ref="statCardInstanceRef"
          data-native-stat-card-ref="base-stat-card-instance"
          label="已接入"
          value="36"
          description="已进入组件沙箱"
          icon="CheckCircle2"
          trend="75%"
          trend-label="接入完成率 75%"
          trend-direction="up"
          type="success"
          clickable
          aria-label="查看已接入组件"
          @click="triggerToast('查看已接入组件', 'info')"
        />
        <BaseStatCard label="待完善" value="8" description="交互和状态补齐" icon="CircleAlert" trend="本周" type="warning" surface="muted" />
        <BaseStatCard label="阻塞项" value="1" description="等待真实窗口复核" icon="Bug" trend="1" trend-direction="down" type="danger" />
        <BaseStatCard label="分类数" value="10" description="细粒度组件目录" icon="Boxes" trend="稳定" type="primary" size="lg" />
        <BaseStatCard label="覆盖率" value="92" unit="%" description="公共组件展示覆盖" icon="ChartNoAxesColumnIncreasing" trend="+12%" trend-direction="up" type="primary" />
        <BaseStatCard label="加载中" value="--" description="等待统计接口返回" icon="LoaderCircle" trend="Loading" loading loading-text="统计数据加载中" compact />
        <BaseStatCard label="只读指标" value="18" suffix=" 项" description="权限不足时不可点击" icon="Lock" trend="Readonly" disabled clickable type="neutral" />
        <BaseStatCard label="Plain 指标" value="4" description="无边框表面适合嵌套在面板内部" icon="FileText" trend="plain" surface="plain" type="neutral" />
        <BaseStatCard label="预算" value="24.8" prefix="¥" suffix="k" description="纯文本指标，无图标和趋势。" type="neutral" />
        <BaseStatCard
          label="非常长的统计指标名称需要在窄容器里稳定换行"
          value="128,640"
          suffix=" 次"
          description="说明文案来自异步统计、权限上下文或跨模块汇总时，应该能按需换行，而不是撑破卡片边界。"
          icon="Activity"
          trend="+18.6%"
          trend-label="较上周增长 18.6%"
          trend-direction="up"
          type="primary"
          wrap-label
          wrap-value
          wrap-description
          :max-description-lines="3"
        />
      </div>
      <BasePanel title="实例能力" subtitle="可点击统计卡片可以读取根节点，并把焦点交给卡片本身。">
        <div class="stat-instance-panel">
          <div class="stat-instance-copy">
            <BaseIcon name="Workflow" size="14" aria-hidden="true" />
            <span>{{ statCardInstanceText }}</span>
          </div>
          <div class="stat-instance-actions">
            <BaseButton size="xs" type="secondary" outline @click="readStatCardElement">DOM</BaseButton>
            <BaseButton size="xs" type="secondary" outline @click="focusStatCard">聚焦</BaseButton>
          </div>
        </div>
      </BasePanel>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.stat-grid {
  @apply grid gap-4 sm:grid-cols-2 xl:grid-cols-4;
}

.stat-instance-panel {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.stat-instance-copy {
  @apply flex min-w-0 items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.stat-instance-copy span {
  @apply min-w-0 truncate;
}

.stat-instance-actions {
  @apply flex shrink-0 flex-wrap items-center gap-2;
}
</style>
