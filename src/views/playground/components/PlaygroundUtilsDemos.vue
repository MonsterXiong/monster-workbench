<script setup lang="ts">
import { computed } from "vue";
import { numberUtilityBoundaryCases, numberUtilityExamples } from "../../../utils/examples/number";
import PlaygroundDemoSection from "./PlaygroundDemoSection.vue";

defineProps<{
  activeComponentKey: string;
}>();

const numberSummaryItems = computed(() => [
  { key: "finite", label: "有效数值", value: numberUtilityExamples.listSummary.finiteCount, status: "success" as const },
  { key: "invalid", label: "无效输入", value: numberUtilityExamples.listSummary.invalidCount, status: "warning" as const },
  { key: "sum", label: "合计", value: numberUtilityExamples.listSummary.sum },
  { key: "average", label: "平均值", value: numberUtilityExamples.listSummary.average.toFixed(2) },
  { key: "range", label: "范围夹取", value: `${numberUtilityExamples.range.value} -> ${numberUtilityExamples.range.clampedValue}`, status: "primary" as const },
  { key: "progress", label: "进度归一化", value: numberUtilityExamples.progress.label, status: "danger" as const },
]);

const distributionRows = computed(() => numberUtilityExamples.distribution.buckets.map((bucket) => ({
  key: bucket.key,
  label: bucket.label,
  count: bucket.count,
  percent: `${bucket.percent}%`,
  values: bucket.values.join(", ") || "-",
})));

const distributionColumns = [
  { key: "label", title: "区间", width: "30%" },
  { key: "count", title: "数量", width: "16%" },
  { key: "percent", title: "占比", width: "16%" },
  { key: "values", title: "命中值", width: "38%", wrap: true },
];

const paginationItems = computed(() => [
  { key: "page", label: "归一化页码", value: numberUtilityExamples.pagination.page },
  { key: "totalPages", label: "总页数", value: numberUtilityExamples.pagination.totalPages },
  { key: "range", label: "条目范围", value: `${numberUtilityExamples.pagination.startItemNumber}-${numberUtilityExamples.pagination.endItemNumber}` },
  { key: "pageSizes", label: "页容量选项", value: numberUtilityExamples.pageSizes.join(", ") },
]);
</script>

<template>
  <section v-if="activeComponentKey === 'utils-number'" class="detail-stack">
    <PlaygroundDemoSection title="Number 工具函数" subtitle="覆盖数值解析、范围归一化、分布统计和分页边界。" icon="Hash">
      <div class="utils-demo-grid">
        <BasePanel title="列表与边界摘要" subtitle="非法输入、空值和可解析字符串同时参与统计。">
          <BaseDescriptionList
            :items="numberSummaryItems"
            :columns="3"
            compact
            wrap-value
            aria-label="Number 工具函数列表摘要"
          />
        </BasePanel>

        <BasePanel title="数值分布" subtitle="分桶默认左闭右开，最后一个内部区间右闭。">
          <BaseTable
            :columns="distributionColumns"
            :data="distributionRows"
            row-key="key"
            size="sm"
            :striped="false"
            wrap-cells
            aria-label="Number 分桶统计"
          />
        </BasePanel>

        <BasePanel title="分页归一化" subtitle="页码超出范围时会收敛到最后一页。">
          <BaseKeyValueList
            :items="paginationItems"
            :columns="2"
            compact
            wrap-value
            aria-label="Number 分页摘要"
          />
        </BasePanel>

        <BasePanel title="边界用例" subtitle="独立用例文件可直接复用到后续测试脚本。">
          <BaseKeyValueList
            :items="numberUtilityBoundaryCases.map((item) => ({
              key: item.key,
              label: item.title,
              value: item.expected,
              description: item.input,
              status: item.key === 'range-clamp' ? 'primary' : 'neutral',
            }))"
            :columns="1"
            compact
            wrap-label
            wrap-value
            wrap-description
            aria-label="Number 工具函数边界用例"
          />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.utils-demo-grid {
  @apply grid gap-4 xl:grid-cols-2;
}
</style>
