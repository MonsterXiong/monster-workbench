<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "../../../../composables/useI18n";
import { useCreativeFormatters } from "../../../../composables/useCreativeFormatters";
import { useCreativeGoalStore } from "../../../../stores/creative-goal";
import { useCreativeProjectStore } from "../../../../stores/creative-project";
import CreativeSection from "../CreativeSection.vue";
import BaseSkeletonCard from "@/components/common/BaseSkeletonCard.vue";

const props = defineProps<{
  activeProjectId: string;
}>();

const { t } = useI18n();
const { statusLabel, userFacingEventMessage } = useCreativeFormatters();

const creativeGoalStore = useCreativeGoalStore();
const creativeProjectStore = useCreativeProjectStore();

const {
  goalResult,
  goalRoleResults,
  goalTaskResults,
  goalStatusSnapshot,
  goalError,
  goalRunning,
} = storeToRefs(creativeGoalStore);

const form = ref({
  title: "故事首发目标",
  description: "编排多个角色与场景的主干设计",
  characterCount: 2,
  sceneCount: 1,
  propCount: 1,
  reviewCount: 1,
});

const goalStateItems = computed(() => [
  {
    key: "status",
    label: t("creativePage.workflow.labels.status"),
    value: statusLabel(goalResult.value?.status) || "-",
  },
  {
    key: "progress",
    label: t("creativePage.workflow.labels.progress"),
    value: goalStatusSnapshot.value?.totalTasks !== undefined && goalStatusSnapshot.value.totalTasks > 0
        ? `${Math.round(((goalStatusSnapshot.value.succeededTasks + goalStatusSnapshot.value.failedTasks + goalStatusSnapshot.value.cancelledTasks) / goalStatusSnapshot.value.totalTasks) * 100)}%`
        : "-",
  },
  {
    key: "budget",
    label: t("creativePage.workflow.labels.tasks"),
    value: String(goalStatusSnapshot.value?.totalTasks || 0),
  },
]);

const goalRoleItems = computed(() =>
  goalRoleResults.value.map((role, index) => ({
    key: `${role.id}-${index}`,
    title: role.roleKey,
    time: "",
    description: role.description || "无描述",
    type: "primary" as const,
    tag: String(role.taskCount),
  }))
);

const goalTaskItems = computed(() =>
  goalTaskResults.value.map((task, index) => ({
    key: `${task.id}-${index}`,
    title: `${task.taskType} · ${statusLabel(task.status)}`,
    time: task.createdAt,
    description: userFacingEventMessage(task.errorMessage || "") || t("creativePage.workflow.empty.description"),
    type:
      task.status === "failed"
        ? ("danger" as const)
        : task.status === "succeeded"
          ? ("success" as const)
          : ("primary" as const),
    tag: statusLabel(task.status),
  }))
);

const runGoalMultiAgentStub = async () => {
  try {
    await creativeGoalStore.runGoalMultiAgentStub({
      projectId: props.activeProjectId,
      title: form.value.title,
      description: form.value.description,
      budgetJson: JSON.stringify({
        maxTasks: 12,
        maxRunningTasks: 3,
        maxRetries: 1,
        maxConsecutiveFailures: 3,
      }),
      roleSpecs: [
        {
          roleKey: "character",
          taskType: "goal.character.stub",
          description: "角色草稿",
          taskCount: form.value.characterCount,
        },
        {
          roleKey: "scene",
          taskType: "goal.scene.stub",
          description: "场景草稿",
          taskCount: form.value.sceneCount,
        },
        {
          roleKey: "prop",
          taskType: "goal.prop.stub",
          description: "道具草稿",
          taskCount: form.value.propCount,
        },
        {
          roleKey: "review",
          taskType: "goal.review.stub",
          description: "合并审查",
          taskCount: form.value.reviewCount,
        },
      ],
      mergeTaskType: "goal.merge_review_stub",
    });
    await Promise.all([
      creativeProjectStore.loadCreativeProjectIndex(),
      creativeProjectStore.loadCreativeProjectHistory(props.activeProjectId),
    ]);
  } catch {
    // store records the error state.
  }
};

const stopGoal = async () => {
  if (!goalResult.value?.id) return;
  await creativeGoalStore.stopCreativeGoal(goalResult.value.id);
  await Promise.all([
    creativeProjectStore.loadCreativeProjectIndex(),
    creativeProjectStore.loadCreativeProjectHistory(props.activeProjectId),
  ]);
};
</script>

<template>
  <CreativeSection
    :title="t('creativePage.workflow.goal.title')"
    :subtitle="t('creativePage.workflow.goal.subtitle')"
    icon="Network"
  >
    <div class="demo-grid demo-grid--wide">
      <BasePanel
        :title="t('creativePage.workflow.panels.goalStub')"
        :subtitle="t('creativePage.workflow.panels.goalStubSubtitle')"
      >
        <div class="workflow-form workflow-form--goal">
          <BaseInput
            v-model="form.title"
            :label="t('creativePage.workflow.fields.goalTitle')"
          />
          <BaseTextarea
            v-model="form.description"
            :label="t('creativePage.workflow.fields.goalDescription')"
            :rows="2"
          />
          <div class="workflow-form-grid">
            <BaseNumberInput v-model="form.characterCount" :label="t('creativePage.workflow.fields.characterTasks')" :min="1" :max="4" />
            <BaseNumberInput v-model="form.sceneCount" :label="t('creativePage.workflow.fields.sceneTasks')" :min="1" :max="4" />
            <BaseNumberInput v-model="form.propCount" :label="t('creativePage.workflow.fields.propTasks')" :min="1" :max="4" />
            <BaseNumberInput v-model="form.reviewCount" :label="t('creativePage.workflow.fields.reviewTasks')" :min="1" :max="4" />
          </div>
        </div>
        <template #footer>
          <div class="step-actions">
            <BaseButton
              type="primary"
              size="sm"
              :disabled="goalRunning"
              :loading="goalRunning"
              @click="runGoalMultiAgentStub"
            >
              {{ t("creativePage.workflow.actions.createGoal") }}
            </BaseButton>
            <BaseButton
              type="neutral"
              size="sm"
              :disabled="!goalResult?.id"
              @click="stopGoal"
            >
              {{ t("creativePage.workflow.actions.stopGoal") }}
            </BaseButton>
          </div>
        </template>
      </BasePanel>

      <BasePanel
        :title="t('creativePage.workflow.panels.goalState')"
        :subtitle="t('creativePage.workflow.panels.goalStateSubtitle')"
      >
        <div class="workflow-status">
          <BaseBadge v-if="goalResult?.status" type="primary" size="sm">
            {{ statusLabel(goalResult.status) }}
          </BaseBadge>
          <BaseBadge v-if="goalResult?.id" type="success" size="sm">
            {{ t("creativePage.workflow.labels.goal") }} {{ goalResult.id }}
          </BaseBadge>
        </div>
        <BaseSkeletonCard v-if="goalRunning && !goalResult" animated compact :lines="3" />
        <BaseDescriptionList v-else :items="goalStateItems" />
        <p v-if="goalError" class="workflow-error">{{ goalError }}</p>
      </BasePanel>
    </div>

    <div class="demo-grid">
      <BasePanel
        :title="t('creativePage.workflow.panels.goalRoles')"
        :subtitle="t('creativePage.workflow.panels.goalRolesSubtitle')"
      >
        <div class="creative-scroll-region">
          <BaseSkeletonCard v-if="goalRunning && !goalRoleItems.length" animated compact :lines="4" />
          <BaseTimeline
            v-else
            :items="goalRoleItems"
            size="sm"
            dense
            marker="dot"
            surface="muted"
            :empty-text="t('creativePage.workflow.empty.goalRoles')"
          />
        </div>
      </BasePanel>
      <BasePanel
        :title="t('creativePage.workflow.panels.fanoutTasks')"
        :subtitle="t('creativePage.workflow.panels.fanoutTasksSubtitle')"
      >
        <div class="creative-scroll-region">
          <BaseSkeletonCard v-if="goalRunning && !goalTaskItems.length" animated compact :lines="4" />
          <BaseTimeline
            v-else
            :items="goalTaskItems"
            size="sm"
            dense
            marker="number"
            surface="plain"
            :bordered="false"
            :empty-text="t('creativePage.workflow.empty.goalTasks')"
          />
        </div>
      </BasePanel>
    </div>
  </CreativeSection>
</template>

<style scoped>
.demo-grid {
  @apply grid gap-3 lg:grid-cols-2;
}

.demo-grid--wide {
  @apply lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)];
}

.workflow-form {
  @apply grid gap-3;
}

.workflow-form--goal {
  @apply gap-3;
}

.workflow-form-grid {
  @apply grid gap-2 md:grid-cols-2;
}

.step-actions {
  @apply flex justify-end gap-2;
}

.workflow-status {
  @apply mb-2 flex flex-wrap gap-2;
}

.workflow-error {
  @apply mt-3 text-xs font-bold text-red-600 dark:text-red-400;
}

.creative-scroll-region {
  @apply max-h-[280px] min-h-0 overflow-y-auto pr-1;
}
</style>
