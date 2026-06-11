<script setup lang="ts">
import { useI18n } from "../../../../composables/useI18n";
import CreativeSection from "../CreativeSection.vue";

interface GoalForm {
  title: string;
  description: string;
  characterCount: number;
  sceneCount: number;
  propCount: number;
  reviewCount: number;
}

interface DescriptionListItem {
  key: string;
  label: string;
  value: string;
}

interface TimelineItem {
  key: string;
  title: string;
  time: string;
  description: string;
  type: "primary" | "success" | "warning" | "danger";
  tag: string;
}

const props = defineProps<{
  form: GoalForm;
  isRunning: boolean;
  goalId: number | null;
  goalStatusLabel: string | null;
  stateItems: DescriptionListItem[];
  error: string | null;
  roleItems: TimelineItem[];
  taskItems: TimelineItem[];
}>();

const emit = defineEmits<{
  (e: "update:form", value: GoalForm): void;
  (e: "submit"): void;
  (e: "stop"): void;
}>();

const { t } = useI18n();

const updateFormField = <K extends keyof GoalForm>(key: K, value: GoalForm[K]) => {
  emit("update:form", {
    ...props.form,
    [key]: value,
  });
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
            :model-value="form.title"
            :label="t('creativePage.workflow.fields.goalTitle')"
            @update:model-value="updateFormField('title', $event)"
          />
          <BaseTextarea
            :model-value="form.description"
            :label="t('creativePage.workflow.fields.goalDescription')"
            :rows="2"
            @update:model-value="updateFormField('description', $event)"
          />
          <div class="workflow-form-grid">
            <BaseNumberInput :model-value="form.characterCount" :label="t('creativePage.workflow.fields.characterTasks')" :min="1" :max="4" @update:model-value="updateFormField('characterCount', $event)" />
            <BaseNumberInput :model-value="form.sceneCount" :label="t('creativePage.workflow.fields.sceneTasks')" :min="1" :max="4" @update:model-value="updateFormField('sceneCount', $event)" />
            <BaseNumberInput :model-value="form.propCount" :label="t('creativePage.workflow.fields.propTasks')" :min="1" :max="4" @update:model-value="updateFormField('propCount', $event)" />
            <BaseNumberInput :model-value="form.reviewCount" :label="t('creativePage.workflow.fields.reviewTasks')" :min="1" :max="4" @update:model-value="updateFormField('reviewCount', $event)" />
          </div>
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
              {{ t("creativePage.workflow.actions.createGoal") }}
            </BaseButton>
            <BaseButton
              type="neutral"
              size="sm"
              :disabled="!goalId"
              @click="emit('stop')"
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
          <BaseBadge v-if="goalStatusLabel" type="primary" size="sm">
            {{ goalStatusLabel }}
          </BaseBadge>
          <BaseBadge v-if="goalId" type="success" size="sm">
            {{ t("creativePage.workflow.labels.goal") }} {{ goalId }}
          </BaseBadge>
        </div>
        <BaseDescriptionList :items="stateItems" />
        <p v-if="error" class="workflow-error">{{ error }}</p>
      </BasePanel>
    </div>

    <div class="demo-grid">
      <BasePanel
        :title="t('creativePage.workflow.panels.goalRoles')"
        :subtitle="t('creativePage.workflow.panels.goalRolesSubtitle')"
      >
        <div class="creative-scroll-region">
          <BaseTimeline
            :items="roleItems"
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
          <BaseTimeline
            :items="taskItems"
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
