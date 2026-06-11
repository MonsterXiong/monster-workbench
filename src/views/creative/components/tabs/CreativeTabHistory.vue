<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "../../../../composables/useI18n";
import { useCreativeFormatters } from "../../../../composables/useCreativeFormatters";
import { useCreativeProjectStore } from "../../../../stores/creative-project";
import BaseSkeletonCard from "@/components/common/BaseSkeletonCard.vue";

const props = defineProps<{
  activeProjectId: string;
}>();

const { t } = useI18n();
const { statusLabel, userFacingAssetType, userFacingBatchType, userFacingTaskType, compactTimelineDescription } =
  useCreativeFormatters();

const creativeProjectStore = useCreativeProjectStore();
const {
  creativeProjectHistoryTasks,
  creativeProjectHistoryAssets,
  creativeProjectHistoryGoals,
  creativeProjectHistoryBatchJobs,
  creativeProjectHistoryLoading,
  creativeProjectHistoryError,
} = storeToRefs(creativeProjectStore);

const taskTimelineItems = computed(() =>
  creativeProjectHistoryTasks.value.map((task) => ({
    key: String(task.id),
    title: `${userFacingTaskType(task.taskType)} · ${statusLabel(task.status)}`,
    time: task.updatedAt,
    description: task.errorMessage || compactTimelineDescription(task.resultJson || task.payloadJson),
    type:
      task.status === "failed"
        ? ("danger" as const)
        : task.status === "succeeded"
          ? ("success" as const)
          : task.status === "cancelled"
            ? ("warning" as const)
            : ("primary" as const),
    tag: statusLabel(task.status),
  }))
);

const assetTimelineItems = computed(() =>
  creativeProjectHistoryAssets.value.map((asset) => ({
    key: String(asset.id),
    title: `${userFacingAssetType(asset.assetType)} · ${asset.title || asset.id}`,
    time: asset.updatedAt,
    description: compactTimelineDescription(asset.content || asset.metadataJson || asset.filePath),
    type:
      asset.status === "failed"
        ? ("danger" as const)
        : asset.status === "ready" || asset.status === "succeeded"
          ? ("success" as const)
          : ("primary" as const),
    tag: statusLabel(asset.status),
  }))
);

const milestoneTimelineItems = computed(() =>
  [
    ...creativeProjectHistoryBatchJobs.value.map((job) => ({
      key: `batch-${job.id}`,
      title: `${t("creativePage.project.batchJob")} · ${job.name}`,
      time: job.updatedAt,
      description: `${userFacingBatchType(job.batchType)} · ${job.totalCount} 项`,
      type:
        job.status === "failed"
          ? ("danger" as const)
          : job.status === "completed"
            ? ("success" as const)
            : job.status === "paused"
              ? ("warning" as const)
              : ("primary" as const),
      tag: statusLabel(job.status),
    })),
    ...creativeProjectHistoryGoals.value.map((goal) => ({
      key: `goal-${goal.id}`,
      title: `${t("creativePage.project.goal")} · ${goal.title}`,
      time: goal.updatedAt,
      description: goal.description || "-",
      type:
        goal.status === "failed"
          ? ("danger" as const)
          : goal.status === "succeeded" || goal.status === "completed"
            ? ("success" as const)
            : goal.status === "stopped"
              ? ("warning" as const)
              : ("primary" as const),
      tag: statusLabel(goal.status),
    })),
  ].sort((left, right) => String(right.time || "").localeCompare(String(left.time || "")))
);
</script>

<template>
  <div class="creative-history-grid">
    <BasePanel :title="t('creativePage.project.historyTasks')" :subtitle="t('creativePage.project.historyTasksSubtitle')">
      <div class="creative-scroll-region creative-scroll-region--history">
        <BaseSkeletonCard v-if="creativeProjectHistoryLoading && !taskTimelineItems.length" animated compact :lines="8" />
        <BaseTimeline
          v-else
          :items="taskTimelineItems"
          size="sm"
          dense
          marker="dot"
          surface="muted"
          :empty-text="t('creativePage.project.emptyHistory')"
        />
      </div>
    </BasePanel>
    <BasePanel :title="t('creativePage.project.historyAssets')" :subtitle="t('creativePage.project.historyAssetsSubtitle')">
      <div class="creative-scroll-region creative-scroll-region--history">
        <BaseSkeletonCard v-if="creativeProjectHistoryLoading && !assetTimelineItems.length" animated compact :lines="8" />
        <BaseTimeline
          v-else
          :items="assetTimelineItems"
          size="sm"
          dense
          marker="dot"
          surface="muted"
          :empty-text="t('creativePage.project.emptyHistory')"
        />
      </div>
    </BasePanel>
    <BasePanel :title="t('creativePage.project.historyMilestones')" :subtitle="t('creativePage.project.historyMilestonesSubtitle')">
      <div class="creative-scroll-region creative-scroll-region--history">
        <BaseSkeletonCard v-if="creativeProjectHistoryLoading && !milestoneTimelineItems.length" animated compact :lines="8" />
        <BaseTimeline
          v-else
          :items="milestoneTimelineItems"
          size="sm"
          dense
          marker="dot"
          surface="muted"
          :empty-text="t('creativePage.project.emptyHistory')"
        />
      </div>
    </BasePanel>
  </div>
  <p v-if="creativeProjectHistoryError" class="workflow-error">
    {{ creativeProjectHistoryError }}
  </p>
</template>

<style scoped>
.creative-history-grid {
  @apply grid gap-3 xl:grid-cols-3;
}

.creative-scroll-region--history {
  @apply min-h-[280px] max-h-[420px] overflow-y-auto pr-1;
}

.workflow-error {
  @apply mt-3 text-xs font-bold text-red-600 dark:text-red-400;
}
</style>
