<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "../../../../composables/useI18n";
import { useCreativeFormatters } from "../../../../composables/useCreativeFormatters";
import { useCreativeTaskStore } from "../../../../stores/creative-task";
import { useCreativeProjectStore } from "../../../../stores/creative-project";
import CreativeSection from "../CreativeSection.vue";
import BaseSkeletonCard from "@/components/common/BaseSkeletonCard.vue";

const props = defineProps<{
  activeProjectId: string;
}>();

const { t } = useI18n();
const { statusLabel, userFacingEventMessage } = useCreativeFormatters();

const creativeTaskStore = useCreativeTaskStore();
const creativeProjectStore = useCreativeProjectStore();

const {
  promptWorkflowTask,
  promptWorkflowAsset,
  promptWorkflowActivity,
  promptWorkflowError,
  promptWorkflowRunning,
} = storeToRefs(creativeTaskStore);

const form = ref({
  brief: "一张干净的产品海报，主体明确，光线清晰。",
  style: "编辑部风格产品插画",
  mood: "专注、现代、高对比",
  aspectRatio: "16:9",
});

const timelineItems = computed(() =>
  promptWorkflowActivity.value.map((item, index) => ({
    key: `${item.taskId}-${item.createdAt}-${index}`,
    title: `${statusLabel(item.status)} · ${userFacingEventMessage(item.message) || t("creativePage.workflow.labels.task")}`,
    time: item.createdAt,
    description: userFacingEventMessage(item.message) || t("creativePage.workflow.empty.description"),
    type:
      item.status === "failed"
        ? ("danger" as const)
        : item.status === "succeeded"
          ? ("success" as const)
          : ("primary" as const),
    tag: statusLabel(item.status),
  }))
);

const rawStatus = computed(() => promptWorkflowTask.value?.status || (promptWorkflowRunning.value ? 'running' : 'idle'));
const displayStatus = computed(() => statusLabel(rawStatus.value));
const assetId = computed(() => promptWorkflowTask.value?.assetId ?? null);
const promptAssetCode = computed(() => promptWorkflowAsset.value?.content || t("creativePage.workflow.empty.promptAsset"));

const runPromptWorkflow = async () => {
  try {
    await creativeTaskStore.runGenerateImagePromptWorkflow({
      ...form.value,
      projectId: props.activeProjectId,
    });
    await Promise.all([
      creativeProjectStore.loadCreativeProjectIndex(),
      creativeProjectStore.loadCreativeProjectHistory(props.activeProjectId),
    ]);
  } catch {
    // store records the error state.
  }
};
</script>

<template>
  <CreativeSection
    :title="t('creativePage.workflow.prompt.title')"
    :subtitle="t('creativePage.workflow.prompt.subtitle')"
    icon="Wand2"
  >
    <div class="demo-grid demo-grid--wide">
      <BasePanel
        :title="t('creativePage.workflow.panels.taskInput')"
        :subtitle="t('creativePage.workflow.panels.taskInputSubtitle')"
      >
        <div class="workflow-form">
          <BaseTextarea
            v-model="form.brief"
            :label="t('creativePage.workflow.fields.brief')"
            :rows="3"
          />
          <BaseInput
            v-model="form.style"
            :label="t('creativePage.workflow.fields.style')"
          />
          <BaseInput
            v-model="form.mood"
            :label="t('creativePage.workflow.fields.mood')"
          />
          <BaseInput
            v-model="form.aspectRatio"
            :label="t('creativePage.workflow.fields.aspectRatio')"
          />
        </div>
        <template #footer>
          <div class="step-actions">
            <BaseButton
              type="primary"
              size="sm"
              :disabled="promptWorkflowRunning"
              :loading="promptWorkflowRunning"
              @click="runPromptWorkflow"
            >
              {{ t("creativePage.workflow.actions.runWorkflow") }}
            </BaseButton>
          </div>
        </template>
      </BasePanel>

      <BasePanel
        :title="t('creativePage.workflow.panels.runState')"
        :subtitle="t('creativePage.workflow.panels.runStateSubtitle')"
      >
        <div class="workflow-status">
          <BaseBadge
            :type="rawStatus === 'failed' ? 'danger' : 'primary'"
            size="sm"
          >
            {{ displayStatus }}
          </BaseBadge>
          <BaseBadge v-if="assetId" type="success" size="sm">
            {{ t("creativePage.workflow.labels.asset") }} {{ assetId }}
          </BaseBadge>
        </div>
        <div class="creative-scroll-region creative-scroll-region--sm">
          <BaseSkeletonCard v-if="promptWorkflowRunning && !timelineItems.length" animated compact :lines="2" />
          <BaseTimeline
            v-else
            :items="timelineItems"
            size="sm"
            dense
            marker="dot"
            surface="muted"
            :empty-text="t('creativePage.workflow.empty.workflowEvents')"
            :aria-label="t('creativePage.workflow.aria.promptEvents')"
          />
        </div>
        <p v-if="promptWorkflowError" class="workflow-error">{{ promptWorkflowError }}</p>
      </BasePanel>
    </div>

    <div class="demo-grid demo-grid--single">
      <BasePanel
        :title="t('creativePage.workflow.panels.promptAsset')"
        :subtitle="t('creativePage.workflow.panels.promptAssetSubtitle')"
      >
        <BaseSkeletonCard v-if="promptWorkflowRunning && !promptWorkflowAsset" animated compact :lines="3" />
        <BaseCodeBlock
          v-else
          :code="promptAssetCode"
          language="text"
          copyable
          :copy-label="t('creativePage.workflow.actions.copyPrompt')"
          :empty-text="t('creativePage.workflow.empty.promptAsset')"
        />
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

.demo-grid--single {
  @apply lg:grid-cols-1;
}

.workflow-form {
  @apply grid gap-3;
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

.creative-scroll-region--sm {
  @apply max-h-[220px];
}
</style>
