<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useTaskStore } from "../../../stores/task";
import PlaygroundDemoSection from "./PlaygroundDemoSection.vue";

defineProps<{
  activeComponentKey: string;
}>();

const workflowStep = ref(1);
const selectedTimelineKey = ref("review");
const taskStore = useTaskStore();
const {
  promptWorkflowTask,
  promptWorkflowAsset,
  promptWorkflowEvents,
  promptWorkflowActivity,
  promptWorkflowError,
  promptWorkflowRunning,
  reviewTaskResult,
  reviewAssetResult,
  reviewRevisionTask,
  reviewResultEvents,
  reviewResultPayload,
  reviewResultActivity,
  reviewResultError,
  reviewResultRunning,
  domainAssets,
  domainAssetLinks,
  domainAssetError,
  domainAssetRunning,
  goalResult,
  goalRoleResults,
  goalTaskResults,
  goalStatusSnapshot,
  goalError,
  goalRunning,
  batchJobSnapshot,
  batchJobTasks,
  batchJobActivity,
  batchJobError,
  batchJobRunning,
} = storeToRefs(taskStore);

const promptWorkflowForm = ref({
  projectId: "demo-image-workflow",
  brief: "A clean product poster with a clear focal subject and crisp lighting.",
  style: "editorial product illustration",
  mood: "focused, modern, high contrast",
  aspectRatio: "16:9",
});

const reviewWorkflowForm = ref({
  projectId: "demo-image-workflow",
  contentHint: "A clean product poster with a clear focal subject and crisp lighting.",
  reviewKind: "review_asset_quality",
});

const domainAssetForm = ref({
  projectId: "demo-domain-assets",
  characterTitle: "Lead Character",
  sceneTitle: "Opening Scene",
  propTitle: "Signature Prop",
  storyboardTitle: "Opening Storyboard",
  novelChapterTitle: "Chapter 1",
  scriptSceneTitle: "Scene 1",
  bibleTitle: "Project Bible",
});

const goalForm = ref({
  projectId: "demo-goal-mode",
  title: "Demo Goal",
  description: "Split one goal into agent role tasks and a merge stub.",
  characterCount: 1,
  sceneCount: 1,
  propCount: 1,
  reviewCount: 1,
});

const batchJobForm = ref({
  projectId: "demo-batch-image",
  name: "Batch Mock Demo",
  mode: "mock",
  totalCount: 100,
  concurrency: 5,
  maxRetries: 0,
  promptTemplate:
    "Create a production-ready image prompt for batch item {{sequenceNo}}. Keep the subject clear and the composition concise.",
  provider: "custom",
  displayName: "Browser Mock Provider",
  baseUrl: "https://mock.local/v1",
  apiKey: "mock-key",
  model: "mock-image-model",
  imageSize: "1024x1024",
  timeoutMs: 60000,
  queueMode: "serial",
  maxConcurrency: 1,
  queueKey: "batch-demo",
});
const batchTaskPage = ref(1);
const batchTaskPageSize = 20;

const batchModeOptions = [
  {
    label: "Mock",
    value: "mock",
    meta: "Goal 11",
    description: "Create a deterministic batch without provider calls.",
  },
  {
    label: "Prompt",
    value: "prompt",
    meta: "Goal 12",
    description: "Generate demo_image_prompt assets through the provider path.",
  },
];

const promptWorkflowTimelineItems = computed(() =>
  promptWorkflowActivity.value.map((item, index) => ({
    key: `${item.taskId}-${item.createdAt}-${index}`,
    title: `${item.status} · ${item.message || item.taskId}`,
    time: item.createdAt,
    description: `project: ${item.projectId || "-"} / task: ${item.taskId}`,
    type:
      item.status === "failed"
        ? ("danger" as const)
        : item.status === "succeeded"
          ? ("success" as const)
          : ("primary" as const),
    tag: item.status,
  }))
);

const reviewWorkflowTimelineItems = computed(() =>
  reviewResultActivity.value.map((item, index) => ({
    key: `${item.taskId}-${item.createdAt}-${index}`,
    title: `${item.status} · ${item.message || item.taskId}`,
    time: item.createdAt,
    description: `project: ${item.projectId || "-"} / task: ${item.taskId}`,
    type:
      item.status === "failed"
        ? ("danger" as const)
        : item.status === "succeeded"
          ? ("success" as const)
          : item.status === "manual_approval"
            ? ("warning" as const)
            : ("primary" as const),
    tag: item.status,
  }))
);

const domainAssetTypes = computed(() =>
  domainAssets.value.map((asset, index) => ({
    key: `${asset.id}-${index}`,
    title: `${asset.assetType} · ${asset.title || asset.id}`,
    time: asset.createdAt,
    description: asset.metadataJson || asset.content || "-",
    type: "primary" as const,
    tag: asset.status,
  }))
);

const batchJobTimelineItems = computed(() =>
  batchJobActivity.value.map((item, index) => ({
    key: `${item.batchJobId}-${item.createdAt}-${index}`,
    title: `${item.status} · ${item.message || item.batchType}`,
    time: item.createdAt,
    description: `queued ${item.queuedTasks} / running ${item.runningTasks} / done ${item.succeededTasks}`,
    type:
      item.status === "cancelled"
        ? ("warning" as const)
        : item.status === "completed"
          ? ("success" as const)
          : item.status === "failed"
            ? ("danger" as const)
            : ("primary" as const),
    tag: item.status,
  }))
);

const batchTaskResultSummary = computed(() =>
  batchJobTasks.value.map((task) => {
    const result = task.resultJson ? safeParseJson(task.resultJson) : null;
    return {
      id: task.id,
      title: `#${task.sequenceNo || task.id} · ${task.status}`,
      status: task.status,
      taskType: task.taskType,
      promptExcerpt: typeof result?.promptExcerpt === "string" ? result.promptExcerpt : "-",
      assetId: typeof result?.assetId === "number" ? result.assetId : task.assetId,
      modelRunId: typeof result?.modelRunId === "number" ? result.modelRunId : null,
      errorMessage: task.errorMessage || "-",
    };
  })
);

const workflowSteps = [
  { key: "prepare", title: "Prepare", description: "Collect inputs and dependencies." },
  { key: "scan", title: "Scan", description: "Find missing coverage." },
  { key: "build", title: "Build", description: "Fill the demo state.", error: true },
  { key: "verify", title: "Verify", description: "Type and visual checks.", disabled: true },
];

const timelineItems = [
  {
    key: "create",
    title: "Add component entry",
    time: "09:30",
    description: "Keep the layout stable while adding the new workflow demo.",
    type: "success" as const,
    icon: "Plus",
    meta: "component platform",
    tag: "done",
  },
  {
    key: "review",
    title: "Visual review",
    time: "10:10",
    description: "Tune hover highlight and spacing.",
    type: "primary" as const,
    icon: "Eye",
    meta: "design review",
    tag: "in progress",
  },
  {
    key: "pending",
    title: "Pending",
    time: "later",
    description: "Continue reviewing Playground coverage.",
    type: "warning" as const,
    icon: "Monitor",
    meta: "sandbox",
    tag: "queued",
  },
];

const longTimelineItems = [
  {
    key: "long-review",
    title: "A very long title that should wrap naturally in narrow containers.",
    time: "11:40",
    description: "Long labels should wrap without creating horizontal overflow.",
    type: "primary" as const,
    icon: "ScrollText",
    meta: "long form note",
    tag: "Wrap",
  },
  {
    key: "trace",
    title: "trace-20260609-component-playground-timeline-verification-with-very-long-unbroken-token",
    time: "2026-06-09 18:42:16.238 UTC+08:00",
    description:
      "https://monster.local/audit/component/BaseTimeline/events/very-long-path-segment-that-should-wrap-anywhere?trace_id=trace_01HZYX_LONG_LONG_LONG_LONG_LONG&request_id=req_component_sandbox_timeline_visual_check",
    type: "warning" as const,
    icon: "Link",
    meta: "workspace/components/workflow/timeline/very-long-meta-value",
    tag: "TraceId",
  },
  {
    key: "disabled-action",
    title: "Readonly item still shows context but does not allow selection.",
    time: "later",
    description: "Disabled actions should stay readable while blocking selection.",
    type: "neutral" as const,
    icon: "Lock",
    meta: "Readonly",
    tag: "Disabled",
    disabled: true,
  },
];

const runPromptWorkflow = async () => {
  try {
    await taskStore.runGenerateImagePromptWorkflow({
      ...promptWorkflowForm.value,
    });
  } catch {
    // store records the error state.
  }
};

const safeParseJson = (raw: string) => {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const runReviewWorkflow = async () => {
  try {
    if (!promptWorkflowAsset.value?.id) {
      reviewWorkflowForm.value.contentHint = promptWorkflowForm.value.brief;
      const promptResult = await taskStore.runGenerateImagePromptWorkflow({
        ...promptWorkflowForm.value,
      });
      await taskStore.runReviewAssetQualityStub({
        projectId: reviewWorkflowForm.value.projectId,
        sourceAssetId: promptResult.asset.id,
        sourceTaskId: promptResult.task.id,
        reviewKind: reviewWorkflowForm.value.reviewKind,
        contentHint: reviewWorkflowForm.value.contentHint,
      });
      return;
    }

    await taskStore.runReviewAssetQualityStub({
      projectId: reviewWorkflowForm.value.projectId,
      sourceAssetId: promptWorkflowAsset.value.id,
      sourceTaskId: promptWorkflowTask.value?.id ?? null,
      reviewKind: reviewWorkflowForm.value.reviewKind,
      contentHint: reviewWorkflowForm.value.contentHint,
    });
  } catch {
    // store records the error state.
  }
};

const runDomainAssetDraft = async () => {
  try {
    await taskStore.runDomainAssetDraft({
      ...domainAssetForm.value,
      sourceAssetId: reviewAssetResult.value?.id ?? promptWorkflowAsset.value?.id ?? null,
      sourceTaskId: reviewTaskResult.value?.id ?? promptWorkflowTask.value?.id ?? null,
    });
  } catch {
    // store records the error state.
  }
};

const runGoalMultiAgentStub = async () => {
  try {
    await taskStore.runGoalMultiAgentStub({
      projectId: goalForm.value.projectId,
      title: goalForm.value.title,
      description: goalForm.value.description,
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
          description: "Character drafting stub",
          taskCount: goalForm.value.characterCount,
        },
        {
          roleKey: "scene",
          taskType: "goal.scene.stub",
          description: "Scene drafting stub",
          taskCount: goalForm.value.sceneCount,
        },
        {
          roleKey: "prop",
          taskType: "goal.prop.stub",
          description: "Prop drafting stub",
          taskCount: goalForm.value.propCount,
        },
        {
          roleKey: "review",
          taskType: "goal.review.stub",
          description: "Merge and review stub",
          taskCount: goalForm.value.reviewCount,
        },
      ],
      mergeTaskType: "goal.merge_review_stub",
    });
  } catch {
    // store records the error state.
  }
};

const stopGoal = async () => {
  if (!goalResult.value?.id) return;
  await taskStore.stopCreativeGoal(goalResult.value.id);
};

const refreshBatchJobPage = async (page = batchTaskPage.value) => {
  if (!batchJobSnapshot.value?.job.id) return;
  batchTaskPage.value = Math.max(1, page);
  await taskStore.refreshBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
};

const createBatchJob = async () => {
  try {
    batchTaskPage.value = 1;
    const isPromptBatch = batchJobForm.value.mode === "prompt";
    await taskStore.createBatchImageJob({
      projectId: batchJobForm.value.projectId,
      name: batchJobForm.value.name,
      batchType: isPromptBatch ? "demo.image.prompt" : "demo.image.mock",
      totalCount: batchJobForm.value.totalCount,
      concurrency: batchJobForm.value.concurrency,
      maxRetries: batchJobForm.value.maxRetries,
      promptTemplate: isPromptBatch ? batchJobForm.value.promptTemplate : null,
      providerConfig: isPromptBatch
        ? {
            provider: batchJobForm.value.provider,
            displayName: batchJobForm.value.displayName,
            baseUrl: batchJobForm.value.baseUrl,
            apiKey: batchJobForm.value.apiKey,
            model: batchJobForm.value.model,
            timeoutMs: batchJobForm.value.timeoutMs,
            queueMode: batchJobForm.value.queueMode,
            maxConcurrency: batchJobForm.value.maxConcurrency,
            queueKey: batchJobForm.value.queueKey,
          }
        : null,
      budgetJson: JSON.stringify({
        stage: isPromptBatch ? "prompt" : "mock",
        maxConsecutiveFailures: isPromptBatch ? 5 : 20,
      }),
    });
  } catch {
    // store records the error state.
  }
};

const startBatchJob = async () => {
  if (!batchJobSnapshot.value?.job.id) return;
  await taskStore.startBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
};

const pauseBatchJob = async () => {
  if (!batchJobSnapshot.value?.job.id) return;
  await taskStore.pauseBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
};

const resumeBatchJob = async () => {
  if (!batchJobSnapshot.value?.job.id) return;
  await taskStore.resumeBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
};

const cancelBatchJob = async () => {
  if (!batchJobSnapshot.value?.job.id) return;
  await taskStore.cancelBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
};

onMounted(async () => {
  await taskStore.initCreativeTaskListeners();
  await taskStore.initBatchJobListeners();
});
</script>

<template>
  <section v-if="activeComponentKey === 'creative-workflow'" class="detail-stack">
    <PlaygroundDemoSection
      title="generate_image_prompt"
      subtitle="Create the task, start sidecar, persist the asset, and emit events."
      icon="Wand2"
    >
      <div class="demo-grid demo-grid--wide">
        <BasePanel title="Task Input" subtitle="Store -> service -> Tauri command.">
          <div class="workflow-form">
            <BaseInput v-model="promptWorkflowForm.projectId" label="Project ID" />
            <BaseTextarea v-model="promptWorkflowForm.brief" label="Brief" :rows="3" />
            <BaseInput v-model="promptWorkflowForm.style" label="Style" />
            <BaseInput v-model="promptWorkflowForm.mood" label="Mood" />
            <BaseInput v-model="promptWorkflowForm.aspectRatio" label="Aspect Ratio" />
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
                Run workflow
              </BaseButton>
            </div>
          </template>
        </BasePanel>

        <BasePanel title="Run State" subtitle="Live task, events, and errors.">
          <div class="workflow-status">
            <BaseBadge
              :type="promptWorkflowTask?.status === 'failed' ? 'danger' : 'primary'"
              size="sm"
            >
              {{ promptWorkflowTask?.status || (promptWorkflowRunning ? "running" : "idle") }}
            </BaseBadge>
            <BaseBadge v-if="promptWorkflowTask?.assetId" type="success" size="sm">
              asset {{ promptWorkflowTask.assetId }}
            </BaseBadge>
          </div>
          <BaseTimeline
            :items="promptWorkflowTimelineItems"
            size="sm"
            dense
            marker="dot"
            surface="muted"
            empty-text="No workflow events yet"
            aria-label="generate_image_prompt task events"
          />
          <p v-if="promptWorkflowError" class="workflow-error">{{ promptWorkflowError }}</p>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="Prompt Asset" subtitle="The generated prompt asset.">
          <BaseCodeBlock
            :code="promptWorkflowAsset?.content || 'No prompt asset yet'"
            language="text"
            copyable
            copy-label="Copy prompt"
            empty-text="No prompt asset yet"
          />
        </BasePanel>
        <BasePanel title="Workflow Result" subtitle="Task and event snapshot.">
          <BaseDescriptionList
            :items="[
              { key: 'taskId', label: 'Task ID', value: String(promptWorkflowTask?.id || '-') },
              { key: 'status', label: 'Status', value: promptWorkflowTask?.status || '-' },
              { key: 'asset', label: 'Asset ID', value: String(promptWorkflowTask?.assetId || '-') },
              { key: 'events', label: 'Events', value: String(promptWorkflowEvents.length) },
            ]"
          />
        </BasePanel>
      </div>

      <div class="demo-grid demo-grid--wide">
        <BasePanel
          title="Review Stub"
          subtitle="Persist a review_result asset and optional revise task stub."
        >
          <div class="workflow-form">
            <BaseInput v-model="reviewWorkflowForm.projectId" label="Project ID" />
            <BaseInput v-model="reviewWorkflowForm.reviewKind" label="Review Kind" />
            <BaseTextarea
              v-model="reviewWorkflowForm.contentHint"
              label="Content Hint"
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
                Run review stub
              </BaseButton>
            </div>
          </template>
        </BasePanel>

        <BasePanel title="Review State" subtitle="Review result, approval state, and revise stub.">
          <div class="workflow-status">
            <BaseBadge
              :type="reviewTaskResult?.status === 'manual_approval' ? 'warning' : reviewTaskResult?.status === 'failed' ? 'danger' : 'primary'"
              size="sm"
            >
              {{ reviewTaskResult?.status || (reviewResultRunning ? "running" : "idle") }}
            </BaseBadge>
            <BaseBadge v-if="reviewAssetResult?.id" type="success" size="sm">
              review asset {{ reviewAssetResult.id }}
            </BaseBadge>
            <BaseBadge v-if="reviewRevisionTask?.id" type="warning" size="sm">
              revise task {{ reviewRevisionTask.id }}
            </BaseBadge>
          </div>
          <BaseTimeline
            :items="reviewWorkflowTimelineItems"
            size="sm"
            dense
            marker="dot"
            surface="muted"
            empty-text="No review events yet"
            aria-label="review task events"
          />
          <p v-if="reviewResultError" class="workflow-error">{{ reviewResultError }}</p>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="Review Result" subtitle="Parsed review payload and approval state.">
          <BaseDescriptionList
            :items="[
              { key: 'reviewTaskId', label: 'Review Task', value: String(reviewTaskResult?.id || '-') },
              { key: 'pass', label: 'Pass', value: String(reviewResultPayload?.pass ?? '-') },
              { key: 'score', label: 'Quality Score', value: String(reviewResultPayload?.qualityScore ?? '-') },
              { key: 'approval', label: 'Approval', value: reviewResultPayload?.manualApprovalStatus || '-' },
              { key: 'events', label: 'Events', value: String(reviewResultEvents.length) },
            ]"
          />
          <p v-if="reviewResultPayload?.problems?.length" class="workflow-note">
            {{ reviewResultPayload.problems.join("; ") }}
          </p>
        </BasePanel>
        <BasePanel title="Revision Instruction" subtitle="Revision stub appears only when review fails.">
          <BaseCodeBlock
            :code="reviewResultPayload?.revisionInstruction || 'No revision instruction yet'"
            language="text"
            copyable
            copy-label="Copy revision"
            empty-text="No revision instruction yet"
          />
        </BasePanel>
      </div>

      <div class="demo-grid demo-grid--wide">
        <BasePanel title="Domain Assets" subtitle="Create character / scene / prop / bible assets as a compact draft set.">
          <div class="workflow-form">
            <BaseInput v-model="domainAssetForm.projectId" label="Project ID" />
            <BaseInput v-model="domainAssetForm.characterTitle" label="Character" />
            <BaseInput v-model="domainAssetForm.sceneTitle" label="Scene" />
            <BaseInput v-model="domainAssetForm.propTitle" label="Prop" />
            <BaseInput v-model="domainAssetForm.storyboardTitle" label="Storyboard" />
            <BaseInput v-model="domainAssetForm.novelChapterTitle" label="Novel Chapter" />
            <BaseInput v-model="domainAssetForm.scriptSceneTitle" label="Script Scene" />
            <BaseInput v-model="domainAssetForm.bibleTitle" label="Bible" />
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
                Create domain assets
              </BaseButton>
            </div>
          </template>
        </BasePanel>

        <BasePanel title="Domain State" subtitle="Asset types and relation links.">
          <div class="workflow-status">
            <BaseBadge v-if="domainAssets.length" type="primary" size="sm">
              assets {{ domainAssets.length }}
            </BaseBadge>
            <BaseBadge v-if="domainAssetLinks.length" type="success" size="sm">
              links {{ domainAssetLinks.length }}
            </BaseBadge>
          </div>
          <BaseTimeline
            :items="domainAssetTypes"
            size="sm"
            dense
            marker="dot"
            surface="muted"
            empty-text="No domain assets yet"
            aria-label="domain asset list"
          />
          <p v-if="domainAssetError" class="workflow-error">{{ domainAssetError }}</p>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="Link Snapshot" subtitle="Show link types created by the domain draft.">
          <BaseDescriptionList
            :items="[
              { key: 'links', label: 'Links', value: String(domainAssetLinks.length) },
              { key: 'characters', label: 'Character', value: domainAssetForm.characterTitle },
              { key: 'scene', label: 'Scene', value: domainAssetForm.sceneTitle },
              { key: 'prop', label: 'Prop', value: domainAssetForm.propTitle },
              { key: 'bible', label: 'Bible', value: domainAssetForm.bibleTitle },
            ]"
          />
        </BasePanel>
        <BasePanel title="Link Types" subtitle="uses_* / part_of / derived_from are kept on the generic asset_links table.">
          <BaseCodeBlock
            :code="domainAssetLinks.map((link) => `${link.linkType}: ${link.sourceAssetId} -> ${link.targetAssetId}`).join('\n') || 'No links yet'"
            language="text"
            copyable
            copy-label="Copy links"
            empty-text="No links yet"
          />
        </BasePanel>
      </div>

      <div class="demo-grid demo-grid--wide">
        <BasePanel title="Goal Stub" subtitle="Create a goal, fan out tasks, and keep the stop control visible.">
          <div class="workflow-form">
            <BaseInput v-model="goalForm.projectId" label="Project ID" />
            <BaseInput v-model="goalForm.title" label="Goal Title" />
            <BaseTextarea v-model="goalForm.description" label="Goal Description" :rows="3" />
            <BaseNumberInput v-model="goalForm.characterCount" label="Character Tasks" :min="1" :max="4" />
            <BaseNumberInput v-model="goalForm.sceneCount" label="Scene Tasks" :min="1" :max="4" />
            <BaseNumberInput v-model="goalForm.propCount" label="Prop Tasks" :min="1" :max="4" />
            <BaseNumberInput v-model="goalForm.reviewCount" label="Review Tasks" :min="1" :max="4" />
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
                Create goal
              </BaseButton>
              <BaseButton
                type="neutral"
                size="sm"
                :disabled="!goalResult?.id"
                @click="stopGoal"
              >
                Stop goal
              </BaseButton>
            </div>
          </template>
        </BasePanel>

        <BasePanel title="Goal State" subtitle="Goal snapshot, role mapping, and fan-out tasks.">
          <div class="workflow-status">
            <BaseBadge v-if="goalStatusSnapshot?.goal.status" type="primary" size="sm">
              {{ goalStatusSnapshot.goal.status }}
            </BaseBadge>
            <BaseBadge v-if="goalStatusSnapshot?.goal.id" type="success" size="sm">
              goal {{ goalStatusSnapshot.goal.id }}
            </BaseBadge>
          </div>
          <BaseDescriptionList
            :items="[
              { key: 'tasks', label: 'Tasks', value: String(goalStatusSnapshot?.totalTasks ?? 0) },
              { key: 'queued', label: 'Queued', value: String(goalStatusSnapshot?.queuedTasks ?? 0) },
              { key: 'running', label: 'Running', value: String(goalStatusSnapshot?.runningTasks ?? 0) },
              { key: 'done', label: 'Succeeded', value: String(goalStatusSnapshot?.succeededTasks ?? 0) },
            ]"
          />
          <p v-if="goalError" class="workflow-error">{{ goalError }}</p>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="Goal Roles" subtitle="Role keys are bound to task types.">
          <BaseTimeline
            :items="goalRoleResults.map((role) => ({
              key: String(role.id),
              title: `${role.roleKey} · ${role.taskType}`,
              time: role.createdAt,
              description: role.description || 'No description',
              type: 'primary' as const,
              tag: `x${role.taskCount}`,
            }))"
            size="sm"
            dense
            marker="dot"
            surface="muted"
            empty-text="No goal roles yet"
          />
        </BasePanel>
        <BasePanel title="Fan-out Tasks" subtitle="Multiple stub tasks plus merge/review task.">
          <BaseTimeline
            :items="goalTaskResults.map((task) => ({
              key: String(task.id),
              title: `${task.taskType} · ${task.status}`,
              time: task.createdAt,
              description: task.payloadJson || 'No payload',
              type: task.status === 'failed' ? 'danger' : task.status === 'queued' ? 'warning' : 'primary',
              tag: task.status,
            }))"
            size="sm"
            dense
            marker="number"
            surface="plain"
            :bordered="false"
            empty-text="No goal tasks yet"
          />
          <p class="workflow-note">
            Merge stub follows the same task system and stays manual-approval friendly.
          </p>
        </BasePanel>
      </div>

      <div class="demo-grid demo-grid--wide">
        <BasePanel title="Batch Image Demo" subtitle="Create mock or prompt batches with bounded concurrency.">
          <div class="workflow-form">
            <BaseSegmented
              v-model="batchJobForm.mode"
              :options="batchModeOptions"
              block
              detailed
              size="sm"
            />
            <BaseInput v-model="batchJobForm.projectId" label="Project ID" />
            <BaseInput v-model="batchJobForm.name" label="Batch Name" />
            <BaseNumberInput v-model="batchJobForm.totalCount" label="Total Count" :min="1" :max="1000" />
            <BaseNumberInput v-model="batchJobForm.concurrency" label="Concurrency" :min="1" :max="10" />
            <BaseNumberInput v-model="batchJobForm.maxRetries" label="Max Retries" :min="0" :max="3" />
            <BaseTextarea
              v-if="batchJobForm.mode === 'prompt'"
              v-model="batchJobForm.promptTemplate"
              label="Prompt Template"
              :rows="4"
            />
            <div v-if="batchJobForm.mode === 'prompt'" class="workflow-form workflow-form--tight">
              <BaseInput v-model="batchJobForm.provider" label="Provider" />
              <BaseInput v-model="batchJobForm.displayName" label="Display Name" />
              <BaseInput v-model="batchJobForm.baseUrl" label="Base URL" />
              <BaseInput v-model="batchJobForm.apiKey" label="API Key" />
              <BaseInput v-model="batchJobForm.model" label="Model" />
              <BaseInput v-model="batchJobForm.imageSize" label="Image Size" />
            </div>
          </div>
          <template #footer>
            <div class="step-actions step-actions--wrap">
              <BaseButton type="primary" size="sm" @click="createBatchJob">
                Create {{ batchJobForm.mode === 'prompt' ? 'prompt' : 'mock' }} batch
              </BaseButton>
              <BaseButton type="neutral" size="sm" :disabled="!batchJobSnapshot?.job.id" @click="startBatchJob">
                Start
              </BaseButton>
              <BaseButton type="neutral" size="sm" :disabled="!batchJobSnapshot?.job.id || !batchJobRunning" @click="pauseBatchJob">
                Pause
              </BaseButton>
              <BaseButton type="neutral" size="sm" :disabled="!batchJobSnapshot?.job.id || batchJobRunning" @click="resumeBatchJob">
                Resume
              </BaseButton>
              <BaseButton type="danger" size="sm" :disabled="!batchJobSnapshot?.job.id" @click="cancelBatchJob">
                Cancel
              </BaseButton>
              <BaseButton type="neutral" size="sm" :disabled="!batchJobSnapshot?.job.id" @click="refreshBatchJobPage()">
                Refresh
              </BaseButton>
            </div>
          </template>
        </BasePanel>

        <BasePanel title="Batch State" subtitle="Stats update through batch job events and paged task reads.">
          <div class="workflow-status">
            <BaseBadge v-if="batchJobSnapshot?.job.status" type="primary" size="sm">
              {{ batchJobSnapshot.job.status }}
            </BaseBadge>
            <BaseBadge v-if="batchJobSnapshot?.job.id" type="success" size="sm">
              batch {{ batchJobSnapshot.job.id }}
            </BaseBadge>
            <BaseBadge v-if="batchJobSnapshot?.stats.runningTasks" type="warning" size="sm">
              running {{ batchJobSnapshot.stats.runningTasks }}
            </BaseBadge>
          </div>
          <BaseDescriptionList
            :items="[
              { key: 'total', label: 'Total', value: String(batchJobSnapshot?.stats.totalTasks ?? 0) },
              { key: 'queued', label: 'Queued', value: String(batchJobSnapshot?.stats.queuedTasks ?? 0) },
              { key: 'running', label: 'Running', value: String(batchJobSnapshot?.stats.runningTasks ?? 0) },
              { key: 'succeeded', label: 'Succeeded', value: String(batchJobSnapshot?.stats.succeededTasks ?? 0) },
              { key: 'failed', label: 'Failed', value: String(batchJobSnapshot?.stats.failedTasks ?? 0) },
              { key: 'cancelled', label: 'Cancelled', value: String(batchJobSnapshot?.stats.cancelledTasks ?? 0) },
            ]"
          />
          <p v-if="batchJobError" class="workflow-error">{{ batchJobError }}</p>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="Batch Activity" subtitle="Supervisor progress and status changes.">
          <BaseTimeline
            :items="batchJobTimelineItems"
            size="sm"
            dense
            marker="dot"
            surface="muted"
            empty-text="No batch activity yet"
          />
        </BasePanel>
        <BasePanel title="Paged Tasks" subtitle="Only render one page of tasks to avoid a heavy 1000-row surface.">
          <BaseTimeline
            :items="batchJobTasks.map((task) => ({
              key: String(task.id),
              title: `#${task.sequenceNo || task.id} · ${task.status}`,
              time: task.updatedAt,
              description: task.errorMessage || task.payloadJson || 'No payload',
              type: task.status === 'failed' ? 'danger' : task.status === 'cancelled' ? 'warning' : task.status === 'succeeded' ? 'success' : 'primary',
              tag: task.taskType,
            }))"
            size="sm"
            dense
            marker="number"
            surface="plain"
            :bordered="false"
            empty-text="No batch tasks yet"
          />
          <template #footer>
            <div class="step-actions">
              <BaseButton
                type="neutral"
                size="sm"
                :disabled="batchTaskPage <= 1 || !batchJobSnapshot?.job.id"
                @click="refreshBatchJobPage(batchTaskPage - 1)"
              >
                Previous
              </BaseButton>
              <BaseBadge type="neutral" size="sm">Page {{ batchTaskPage }}</BaseBadge>
              <BaseButton
                type="neutral"
                size="sm"
                :disabled="!batchJobSnapshot?.job.id || batchJobTasks.length < batchTaskPageSize"
                @click="refreshBatchJobPage(batchTaskPage + 1)"
              >
                Next
              </BaseButton>
            </div>
          </template>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="Task Results" subtitle="Prompt batches surface asset and model run summaries here.">
          <BaseTimeline
            :items="batchTaskResultSummary.map((task) => ({
              key: String(task.id),
              title: task.title,
              time: task.status,
              description: `asset ${task.assetId ?? '-'} / model run ${task.modelRunId ?? '-'} / ${task.promptExcerpt}`,
              type: task.status === 'failed' ? 'danger' : task.status === 'cancelled' ? 'warning' : 'primary',
              tag: task.taskType,
            }))"
            size="sm"
            dense
            marker="number"
            surface="plain"
            :bordered="false"
            empty-text="No task results yet"
          />
        </BasePanel>
        <BasePanel title="Prompt Notes" subtitle="Prompt batches create demo_image_prompt assets, not images.">
          <BaseDescriptionList
            :items="[
              { key: 'mode', label: 'Mode', value: batchJobForm.mode },
              { key: 'template', label: 'Template', value: batchJobForm.promptTemplate },
              { key: 'provider', label: 'Provider', value: batchJobForm.provider },
              { key: 'model', label: 'Model', value: batchJobForm.model },
            ]"
          />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'stepper'" class="detail-stack">
    <PlaygroundDemoSection title="Stepper" subtitle="A compact demo for progress and review states." icon="Footprints">
      <BasePanel title="Horizontal" subtitle="Completed, current, and disabled steps.">
        <BaseStepper :steps="workflowSteps" :current="workflowStep" clickable linear surface="muted" @select="workflowStep = $event.index" />
      </BasePanel>
      <BasePanel title="Vertical" subtitle="A narrow layout for side panels.">
        <BaseStepper :steps="workflowSteps" :current="2" vertical size="sm" surface="plain" :bordered="false" />
      </BasePanel>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'timeline'" class="detail-stack">
    <PlaygroundDemoSection title="Timeline" subtitle="Record task and release events." icon="History">
      <BasePanel title="Timeline" subtitle="Clickable records with selection and actions.">
        <BaseTimeline
          :items="timelineItems"
          clickable
          :selected-key="selectedTimelineKey"
          aria-label="component timeline"
          actions-label="timeline actions"
          @select="selectedTimelineKey = $event.item.key"
        >
          <template #actions="{ selected, interactiveDisabled }">
            <BaseBadge v-if="selected" type="primary" size="sm">selected</BaseBadge>
            <BaseButton v-else type="neutral" size="sm" :disabled="interactiveDisabled">View</BaseButton>
          </template>
        </BaseTimeline>
      </BasePanel>
      <BasePanel title="Long items" subtitle="Wrap long labels safely in narrow containers.">
        <BaseTimeline :items="longTimelineItems" wrap-title wrap-description :max-description-lines="4" marker="number" surface="plain" :bordered="false" />
      </BasePanel>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.demo-grid {
  @apply grid gap-4 lg:grid-cols-2;
}

.demo-grid--wide {
  @apply lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)];
}

.step-actions {
  @apply flex justify-end gap-2;
}

.step-actions--wrap {
  @apply flex-wrap justify-start;
}

.workflow-form {
  @apply grid gap-3;
}

.workflow-status {
  @apply mb-3 flex flex-wrap gap-2;
}

.workflow-error {
  @apply mt-3 text-xs font-bold text-red-600 dark:text-red-400;
}

.workflow-note {
  @apply mt-3 text-xs text-slate-600 dark:text-slate-300;
}

.timeline-result {
  @apply text-xs font-black text-slate-500 dark:text-slate-400;
}

.timeline-demo-stack {
  @apply grid gap-3;
}

.timeline-narrow-demo {
  @apply w-full max-w-[320px];
}

.stepper-demo-stack {
  @apply grid gap-3;
}
</style>
