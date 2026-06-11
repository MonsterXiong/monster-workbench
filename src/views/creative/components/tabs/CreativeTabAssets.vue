<script setup lang="ts">
import { useI18n } from "../../../../composables/useI18n";
import CreativeSection from "../CreativeSection.vue";

interface ReviewWorkflowForm {
  contentHint: string;
  reviewKind: string;
}

interface DomainAssetForm {
  characterTitle: string;
  sceneTitle: string;
  propTitle: string;
  storyboardTitle: string;
  novelChapterTitle: string;
  scriptSceneTitle: string;
  bibleTitle: string;
}

interface TimelineItem {
  key: string;
  title: string;
  time: string;
  description: string;
  type: "primary" | "success" | "warning" | "danger";
  tag: string;
}

interface DescriptionListItem {
  key: string;
  label: string;
  value: string;
}

const props = defineProps<{
  reviewForm: ReviewWorkflowForm;
  reviewIsRunning: boolean;
  reviewRawStatus: string;
  reviewDisplayStatus: string;
  reviewAssetId: number | null;
  reviewRevisionTaskId: number | null;
  reviewTimelineItems: TimelineItem[];
  reviewError: string | null;
  reviewSummaryItems: DescriptionListItem[];
  reviewProblems: string[];
  revisionInstructionCode: string;
  domainAssetForm: DomainAssetForm;
  domainAssetIsRunning: boolean;
  domainAssetCount: number;
  domainAssetLinkCount: number;
  domainAssetTimelineItems: TimelineItem[];
  domainAssetError: string | null;
  linkSnapshotItems: DescriptionListItem[];
}>();

const emit = defineEmits<{
  (e: "update:reviewForm", value: ReviewWorkflowForm): void;
  (e: "submitReview"): void;
  (e: "update:domainAssetForm", value: DomainAssetForm): void;
  (e: "submitDomainAssets"): void;
}>();

const { t } = useI18n();

const updateReviewFormField = (key: keyof ReviewWorkflowForm, value: string) => {
  emit("update:reviewForm", {
    ...props.reviewForm,
    [key]: value,
  });
};

const updateDomainAssetField = (key: keyof DomainAssetForm, value: string) => {
  emit("update:domainAssetForm", {
    ...props.domainAssetForm,
    [key]: value,
  });
};
</script>

<template>
  <CreativeSection
    :title="t('creativePage.workflow.assets.title')"
    :subtitle="t('creativePage.workflow.assets.subtitle')"
    icon="Library"
  >
    <div class="demo-grid demo-grid--wide">
      <BasePanel
        :title="t('creativePage.workflow.panels.reviewStub')"
        :subtitle="t('creativePage.workflow.panels.reviewStubSubtitle')"
      >
        <div class="workflow-form">
          <BaseTextarea
            :model-value="reviewForm.contentHint"
            :label="t('creativePage.workflow.fields.contentHint')"
            :rows="3"
            @update:model-value="updateReviewFormField('contentHint', $event)"
          />
        </div>
        <template #footer>
          <div class="step-actions">
            <BaseButton
              type="primary"
              size="sm"
              :disabled="reviewIsRunning"
              :loading="reviewIsRunning"
              @click="emit('submitReview')"
            >
              {{ t("creativePage.workflow.actions.runReview") }}
            </BaseButton>
          </div>
        </template>
      </BasePanel>

      <BasePanel
        :title="t('creativePage.workflow.panels.reviewState')"
        :subtitle="t('creativePage.workflow.panels.reviewStateSubtitle')"
      >
        <div class="workflow-status">
          <BaseBadge
            :type="reviewRawStatus === 'manual_approval' ? 'warning' : reviewRawStatus === 'failed' ? 'danger' : 'primary'"
            size="sm"
          >
            {{ reviewDisplayStatus }}
          </BaseBadge>
          <BaseBadge v-if="reviewAssetId" type="success" size="sm">
            {{ t("creativePage.workflow.labels.reviewAsset") }} {{ reviewAssetId }}
          </BaseBadge>
          <BaseBadge v-if="reviewRevisionTaskId" type="warning" size="sm">
            {{ t("creativePage.workflow.labels.revisionTask") }} {{ reviewRevisionTaskId }}
          </BaseBadge>
        </div>
        <div class="creative-scroll-region creative-scroll-region--sm">
          <BaseTimeline
            :items="reviewTimelineItems"
            size="sm"
            dense
            marker="dot"
            surface="muted"
            :empty-text="t('creativePage.workflow.empty.reviewEvents')"
            :aria-label="t('creativePage.workflow.aria.reviewEvents')"
          />
        </div>
        <p v-if="reviewError" class="workflow-error">{{ reviewError }}</p>
      </BasePanel>
    </div>

    <div class="demo-grid">
      <BasePanel
        :title="t('creativePage.workflow.panels.reviewResult')"
        :subtitle="t('creativePage.workflow.panels.reviewResultSubtitle')"
      >
        <BaseDescriptionList :items="reviewSummaryItems" />
        <p v-if="reviewProblems.length" class="workflow-note">
          {{ reviewProblems.join("; ") }}
        </p>
      </BasePanel>
      <BasePanel
        :title="t('creativePage.workflow.panels.revisionInstruction')"
        :subtitle="t('creativePage.workflow.panels.revisionInstructionSubtitle')"
      >
        <BaseCodeBlock
          :code="revisionInstructionCode"
          language="text"
          copyable
          :copy-label="t('creativePage.workflow.actions.copyRevision')"
          :empty-text="t('creativePage.workflow.empty.revisionInstruction')"
        />
      </BasePanel>
    </div>

    <div class="demo-grid demo-grid--wide">
      <BasePanel
        :title="t('creativePage.workflow.panels.domainAssets')"
        :subtitle="t('creativePage.workflow.panels.domainAssetsSubtitle')"
      >
        <div class="workflow-form">
          <BaseInput :model-value="domainAssetForm.characterTitle" :label="t('creativePage.workflow.fields.character')" @update:model-value="updateDomainAssetField('characterTitle', $event)" />
          <BaseInput :model-value="domainAssetForm.sceneTitle" :label="t('creativePage.workflow.fields.scene')" @update:model-value="updateDomainAssetField('sceneTitle', $event)" />
          <BaseInput :model-value="domainAssetForm.propTitle" :label="t('creativePage.workflow.fields.prop')" @update:model-value="updateDomainAssetField('propTitle', $event)" />
          <BaseInput :model-value="domainAssetForm.storyboardTitle" :label="t('creativePage.workflow.fields.storyboard')" @update:model-value="updateDomainAssetField('storyboardTitle', $event)" />
          <BaseInput :model-value="domainAssetForm.novelChapterTitle" :label="t('creativePage.workflow.fields.novelChapter')" @update:model-value="updateDomainAssetField('novelChapterTitle', $event)" />
          <BaseInput :model-value="domainAssetForm.scriptSceneTitle" :label="t('creativePage.workflow.fields.scriptScene')" @update:model-value="updateDomainAssetField('scriptSceneTitle', $event)" />
          <BaseInput :model-value="domainAssetForm.bibleTitle" :label="t('creativePage.workflow.fields.bible')" @update:model-value="updateDomainAssetField('bibleTitle', $event)" />
        </div>
        <template #footer>
          <div class="step-actions">
            <BaseButton
              type="primary"
              size="sm"
              :disabled="domainAssetIsRunning"
              :loading="domainAssetIsRunning"
              @click="emit('submitDomainAssets')"
            >
              {{ t("creativePage.workflow.actions.createDomainAssets") }}
            </BaseButton>
          </div>
        </template>
      </BasePanel>

      <BasePanel
        :title="t('creativePage.workflow.panels.domainState')"
        :subtitle="t('creativePage.workflow.panels.domainStateSubtitle')"
      >
        <div class="workflow-status">
          <BaseBadge v-if="domainAssetCount" type="primary" size="sm">
            {{ t("creativePage.workflow.labels.assets") }} {{ domainAssetCount }}
          </BaseBadge>
          <BaseBadge v-if="domainAssetLinkCount" type="success" size="sm">
            {{ t("creativePage.workflow.labels.links") }} {{ domainAssetLinkCount }}
          </BaseBadge>
        </div>
        <div class="creative-scroll-region">
          <BaseTimeline
            :items="domainAssetTimelineItems"
            size="sm"
            dense
            marker="dot"
            surface="muted"
            :empty-text="t('creativePage.workflow.empty.domainAssets')"
            :aria-label="t('creativePage.workflow.aria.domainAssets')"
          />
        </div>
        <p v-if="domainAssetError" class="workflow-error">{{ domainAssetError }}</p>
      </BasePanel>
    </div>

    <div class="demo-grid demo-grid--single">
      <BasePanel
        :title="t('creativePage.workflow.panels.linkSnapshot')"
        :subtitle="t('creativePage.workflow.panels.linkSnapshotSubtitle')"
      >
        <BaseDescriptionList :items="linkSnapshotItems" />
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

.workflow-note {
  @apply mt-3 text-xs text-slate-600 dark:text-slate-300;
}

.creative-scroll-region {
  @apply max-h-[280px] min-h-0 overflow-y-auto pr-1;
}

.creative-scroll-region--sm {
  @apply max-h-[220px];
}
</style>
