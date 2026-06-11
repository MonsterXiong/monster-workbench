<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../../../composables/useI18n";
import { useCreativeFormatters } from "../../../../composables/useCreativeFormatters";
import type { CreativeAsset } from "../../../../stores/creative-asset";
import type { CreativeBatchJob } from "../../../../stores/creative-batch";
import type { CreativeGoal } from "../../../../stores/creative-goal";
import type { CreativeTask } from "../../../../stores/creative-task";

const props = defineProps<{
  tasks: CreativeTask[];
  assets: CreativeAsset[];
  goals: CreativeGoal[];
  batchJobs: CreativeBatchJob[];
  loading: boolean;
  error: string | null;
}>();

const { t } = useI18n();
const { statusLabel, userFacingAssetType, userFacingBatchType, userFacingTaskType, compactTimelineDescription } =
  useCreativeFormatters();

const taskTimelineItems = computed(() =>
  props.tasks.map((task) => ({
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
  props.assets.map((asset) => ({
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
    ...props.batchJobs.map((job) => ({
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
    ...props.goals.map((goal) => ({
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
        <BaseTimeline
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
        <BaseTimeline
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
        <BaseTimeline
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
  <p v-if="loading" class="workflow-note">
    {{ t("creativePage.project.loadingHistory") }}
  </p>
  <p v-if="error" class="workflow-error">
    {{ error }}
  </p>
</template>

<style scoped>
.creative-history-grid {
  @apply grid gap-3 xl:grid-cols-3;
}

.creative-scroll-region--history {
  @apply min-h-[280px] max-h-[420px];
}
</style>
