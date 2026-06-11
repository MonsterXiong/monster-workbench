<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "../../../../composables/useI18n";
import { useCreativeFormatters } from "../../../../composables/useCreativeFormatters";
import { useCreativeTaskStore } from "../../../../stores/creative-task";
import { useCreativeAssetStore } from "../../../../stores/creative-asset";
import { useCreativeProjectStore } from "../../../../stores/creative-project";
import type { CreativeAssetLink } from "../../../../stores/creative-asset";
import CreativeSection from "../CreativeSection.vue";
import BaseSkeletonCard from "@/components/common/BaseSkeletonCard.vue";

const props = defineProps<{
  activeProjectId: string;
}>();

const { t } = useI18n();
const {
  statusLabel,
  userFacingEventMessage,
  userFacingApproval,
  userFacingAssetType,
  compactTimelineDescription,
  userFacingLinkType,
} = useCreativeFormatters();

const creativeTaskStore = useCreativeTaskStore();
const creativeAssetStore = useCreativeAssetStore();
const creativeProjectStore = useCreativeProjectStore();

const {
  promptWorkflowTask,
  promptWorkflowAsset,
  reviewTaskResult,
  reviewAssetResult,
  reviewRevisionTask,
  reviewResultPayload,
  reviewResultActivity,
  reviewResultError,
  reviewResultRunning,
} = storeToRefs(creativeTaskStore);

const {
  domainAssets,
  domainAssetLinks,
  domainAssetError,
  domainAssetRunning,
} = storeToRefs(creativeAssetStore);

const reviewForm = ref({
  contentHint: "一张干净的产品海报，主体明确，光线清晰。",
  reviewKind: "review.asset_quality",
});

const domainAssetForm = ref({
  characterTitle: "主角设定",
  sceneTitle: "开场场景",
  propTitle: "标志性道具",
  storyboardTitle: "开场分镜",
  novelChapterTitle: "第一章",
  scriptSceneTitle: "第一场",
  bibleTitle: "项目设定集",
});

const reviewTimelineItems = computed(() =>
  reviewResultActivity.value.map((item, index) => ({
    key: `${item.taskId}-${item.createdAt}-${index}`,
    title: `${statusLabel(item.status)} · ${userFacingEventMessage(item.message) || t("creativePage.workflow.labels.task")}`,
    time: item.createdAt,
    description: userFacingEventMessage(item.message) || t("creativePage.workflow.empty.description"),
    type:
      item.status === "failed"
        ? ("danger" as const)
        : item.status === "succeeded"
          ? ("success" as const)
          : item.status === "manual_approval"
            ? ("warning" as const)
            : ("primary" as const),
    tag: statusLabel(item.status),
  }))
);

const reviewSummaryItems = computed(() => [
  {
    key: "reviewTaskId",
    label: t("creativePage.workflow.labels.reviewTask"),
    value: String(reviewTaskResult.value?.id || "-"),
  },
  {
    key: "pass",
    label: t("creativePage.workflow.labels.pass"),
    value:
      reviewResultPayload.value?.pass === true
        ? t("creativePage.workflow.labels.yes")
        : reviewResultPayload.value?.pass === false
          ? t("creativePage.workflow.labels.no")
          : "-",
  },
  {
    key: "score",
    label: t("creativePage.workflow.labels.qualityScore"),
    value: String(reviewResultPayload.value?.qualityScore ?? "-"),
  },
  {
    key: "approval",
    label: t("creativePage.workflow.labels.approval"),
    value: userFacingApproval(reviewResultPayload.value?.manualApprovalStatus),
  },
]);

const domainAssetTimelineItems = computed(() =>
  domainAssets.value.map((asset, index) => ({
    key: `${asset.id}-${index}`,
    title: `${userFacingAssetType(asset.assetType)} · ${asset.title || asset.id}`,
    time: asset.createdAt,
    description: compactTimelineDescription(asset.metadataJson || asset.content),
    type: "primary" as const,
    tag: statusLabel(asset.status),
  }))
);

const linkSnapshotItems = computed(() => [
  {
    key: "links",
    label: t("creativePage.workflow.labels.links"),
    value: String(domainAssetLinks.value.length),
  },
  {
    key: "linkTypes",
    label: t("creativePage.workflow.labels.relations"),
    value:
      Array.from(
        new Set(domainAssetLinks.value.map((link: CreativeAssetLink) => userFacingLinkType(link.linkType)))
      ).join("、") || "-",
  },
  {
    key: "characters",
    label: t("creativePage.workflow.fields.character"),
    value: domainAssetForm.value.characterTitle,
  },
  {
    key: "scene",
    label: t("creativePage.workflow.fields.scene"),
    value: domainAssetForm.value.sceneTitle,
  },
  {
    key: "prop",
    label: t("creativePage.workflow.fields.prop"),
    value: domainAssetForm.value.propTitle,
  },
  {
    key: "bible",
    label: t("creativePage.workflow.fields.bible"),
    value: domainAssetForm.value.bibleTitle,
  },
]);

const runReviewWorkflow = async () => {
  try {
    if (!promptWorkflowAsset.value?.id) {
      reviewForm.value.contentHint = reviewForm.value.contentHint || "生成并审查资产";
      await creativeTaskStore.runReviewAssetQualityStub({
        projectId: props.activeProjectId,
        sourceAssetId: promptWorkflowAsset.value?.id ?? 0,
        sourceTaskId: promptWorkflowTask.value?.id ?? null,
        reviewKind: reviewForm.value.reviewKind,
        contentHint: reviewForm.value.contentHint,
      });
      await Promise.all([
        creativeProjectStore.loadCreativeProjectIndex(),
        creativeProjectStore.loadCreativeProjectHistory(props.activeProjectId),
      ]);
      return;
    }

    await creativeTaskStore.runReviewAssetQualityStub({
      projectId: props.activeProjectId,
      sourceAssetId: promptWorkflowAsset.value.id,
      sourceTaskId: promptWorkflowTask.value?.id ?? null,
      reviewKind: reviewForm.value.reviewKind,
      contentHint: reviewForm.value.contentHint,
    });
    await Promise.all([
      creativeProjectStore.loadCreativeProjectIndex(),
      creativeProjectStore.loadCreativeProjectHistory(props.activeProjectId),
    ]);
  } catch {
    // store records the error state.
  }
};

const runDomainAssetDraft = async () => {
  try {
    await creativeAssetStore.runDomainAssetDraft({
      ...domainAssetForm.value,
      projectId: props.activeProjectId,
      sourceAssetId: reviewAssetResult.value?.id ?? promptWorkflowAsset.value?.id ?? null,
      sourceTaskId: reviewTaskResult.value?.id ?? promptWorkflowTask.value?.id ?? null,
    });
    await Promise.all([
      creativeProjectStore.loadCreativeProjectIndex(),
      creativeProjectStore.loadCreativeProjectHistory(props.activeProjectId),
    ]);
  } catch {
    // store records the error state.
  }
};

const reviewRawStatus = computed(() => reviewTaskResult.value?.status || (reviewResultRunning.value ? 'running' : 'idle'));
const reviewDisplayStatus = computed(() => statusLabel(reviewRawStatus.value));
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
            v-model="reviewForm.contentHint"
            :label="t('creativePage.workflow.fields.contentHint')"
            :rows="3"
          />
        </div>
        <template #footer>
          <div class="step-actions">
            <BaseButton
              type="primary"
              size="sm"
              :disabled="reviewResultRunning"
              :loading="reviewResultRunning"
              @click="runReviewWorkflow"
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
          <BaseBadge v-if="reviewAssetResult?.id" type="success" size="sm">
            {{ t("creativePage.workflow.labels.reviewAsset") }} {{ reviewAssetResult.id }}
          </BaseBadge>
          <BaseBadge v-if="reviewRevisionTask?.id" type="warning" size="sm">
            {{ t("creativePage.workflow.labels.revisionTask") }} {{ reviewRevisionTask.id }}
          </BaseBadge>
        </div>
        <div class="creative-scroll-region creative-scroll-region--sm">
          <BaseSkeletonCard v-if="reviewResultRunning && !reviewTimelineItems.length" animated compact :lines="2" />
          <BaseTimeline
            v-else
            :items="reviewTimelineItems"
            size="sm"
            dense
            marker="dot"
            surface="muted"
            :empty-text="t('creativePage.workflow.empty.reviewEvents')"
            :aria-label="t('creativePage.workflow.aria.reviewEvents')"
          />
        </div>
        <p v-if="reviewResultError" class="workflow-error">{{ reviewResultError }}</p>
      </BasePanel>
    </div>

    <div class="demo-grid">
      <BasePanel
        :title="t('creativePage.workflow.panels.reviewResult')"
        :subtitle="t('creativePage.workflow.panels.reviewResultSubtitle')"
      >
        <BaseSkeletonCard v-if="reviewResultRunning && !reviewResultPayload" animated compact :lines="4" />
        <template v-else>
          <BaseDescriptionList :items="reviewSummaryItems" />
          <p v-if="reviewResultPayload?.problems?.length" class="workflow-note">
            {{ reviewResultPayload.problems.join("; ") }}
          </p>
        </template>
      </BasePanel>
      <BasePanel
        :title="t('creativePage.workflow.panels.revisionInstruction')"
        :subtitle="t('creativePage.workflow.panels.revisionInstructionSubtitle')"
      >
        <BaseSkeletonCard v-if="reviewResultRunning && !reviewResultPayload" animated compact :lines="3" />
        <BaseCodeBlock
          v-else
          :code="reviewResultPayload?.revisionInstruction || t('creativePage.workflow.empty.revisionInstruction')"
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
          <BaseInput v-model="domainAssetForm.characterTitle" :label="t('creativePage.workflow.fields.character')" />
          <BaseInput v-model="domainAssetForm.sceneTitle" :label="t('creativePage.workflow.fields.scene')" />
          <BaseInput v-model="domainAssetForm.propTitle" :label="t('creativePage.workflow.fields.prop')" />
          <BaseInput v-model="domainAssetForm.storyboardTitle" :label="t('creativePage.workflow.fields.storyboard')" />
          <BaseInput v-model="domainAssetForm.novelChapterTitle" :label="t('creativePage.workflow.fields.novelChapter')" />
          <BaseInput v-model="domainAssetForm.scriptSceneTitle" :label="t('creativePage.workflow.fields.scriptScene')" />
          <BaseInput v-model="domainAssetForm.bibleTitle" :label="t('creativePage.workflow.fields.bible')" />
        </div>
        <template #footer>
          <div class="step-actions">
            <BaseButton
              type="primary"
              size="sm"
              :disabled="domainAssetRunning"
              :loading="domainAssetRunning"
              @click="runDomainAssetDraft"
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
          <BaseBadge v-if="domainAssets.length" type="primary" size="sm">
            {{ t("creativePage.workflow.labels.assets") }} {{ domainAssets.length }}
          </BaseBadge>
          <BaseBadge v-if="domainAssetLinks.length" type="success" size="sm">
            {{ t("creativePage.workflow.labels.links") }} {{ domainAssetLinks.length }}
          </BaseBadge>
        </div>
        <div class="creative-scroll-region">
          <BaseSkeletonCard v-if="domainAssetRunning && !domainAssetTimelineItems.length" animated compact :lines="4" />
          <BaseTimeline
            v-else
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
