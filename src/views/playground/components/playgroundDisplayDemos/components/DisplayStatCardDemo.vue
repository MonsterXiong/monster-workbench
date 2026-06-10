<script setup lang="ts">
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="统计卡片" subtitle="用于工作台、列表摘要和任务看板顶部指标。" icon="ChartNoAxesColumnIncreasing">
      <div class="stat-grid">
        <BaseStatCard
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
</style>
