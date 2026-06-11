<script setup lang="ts">
import { useI18n } from "../../../../composables/useI18n";
import CreativeSection from "../CreativeSection.vue";

interface PromptWorkflowForm {
  brief: string;
  style: string;
  mood: string;
  aspectRatio: string;
}

interface PromptTimelineItem {
  key: string;
  title: string;
  time: string;
  description: string;
  type: "primary" | "success" | "warning" | "danger";
  tag: string;
}

const props = defineProps<{
  form: PromptWorkflowForm;
  isRunning: boolean;
  rawStatus: string;
  displayStatus: string;
  assetId: number | null;
  timelineItems: PromptTimelineItem[];
  error: string | null;
  promptAssetCode: string;
}>();

const emit = defineEmits<{
  (e: "update:form", value: PromptWorkflowForm): void;
  (e: "submit"): void;
}>();

const { t } = useI18n();

const updateFormField = (key: keyof PromptWorkflowForm, value: string) => {
  emit("update:form", {
    ...props.form,
    [key]: value,
  });
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
            :model-value="form.brief"
            :label="t('creativePage.workflow.fields.brief')"
            :rows="3"
            @update:model-value="updateFormField('brief', $event)"
          />
          <BaseInput
            :model-value="form.style"
            :label="t('creativePage.workflow.fields.style')"
            @update:model-value="updateFormField('style', $event)"
          />
          <BaseInput
            :model-value="form.mood"
            :label="t('creativePage.workflow.fields.mood')"
            @update:model-value="updateFormField('mood', $event)"
          />
          <BaseInput
            :model-value="form.aspectRatio"
            :label="t('creativePage.workflow.fields.aspectRatio')"
            @update:model-value="updateFormField('aspectRatio', $event)"
          />
        </div>
        <template #footer>
          <div class="step-actions">
            <BaseButton
              type="primary"
              size="sm"
              :disabled="isRunning"
              :loading="isRunning"
              @click="emit('submit')"
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
          <BaseTimeline
            :items="timelineItems"
            size="sm"
            dense
            marker="dot"
            surface="muted"
            :empty-text="t('creativePage.workflow.empty.workflowEvents')"
            :aria-label="t('creativePage.workflow.aria.promptEvents')"
          />
        </div>
        <p v-if="error" class="workflow-error">{{ error }}</p>
      </BasePanel>
    </div>

    <div class="demo-grid demo-grid--single">
      <BasePanel
        :title="t('creativePage.workflow.panels.promptAsset')"
        :subtitle="t('creativePage.workflow.panels.promptAssetSubtitle')"
      >
        <BaseCodeBlock
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
