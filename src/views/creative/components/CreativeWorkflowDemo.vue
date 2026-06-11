<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "../../../composables/useI18n";
import { useCreativeBatchStore } from "../../../stores/creative-batch";
import { useCreativeProjectStore } from "../../../stores/creative-project";
import { useCreativeTaskStore } from "../../../stores/creative-task";
import CreativeTabAssets from "./tabs/CreativeTabAssets.vue";
import CreativeTabBatch from "./tabs/CreativeTabBatch.vue";
import CreativeTabGoal from "./tabs/CreativeTabGoal.vue";
import CreativeProjectList, { type CreativeProjectCardRecord } from "./tabs/CreativeProjectList.vue";
import CreativeTabHistory from "./tabs/CreativeTabHistory.vue";
import CreativeTabPrompt from "./tabs/CreativeTabPrompt.vue";

const creativeBatchStore = useCreativeBatchStore();
const creativeProjectStore = useCreativeProjectStore();
const creativeTaskStore = useCreativeTaskStore();
const { t } = useI18n();

const {
  creativeProjectIndexTasks,
  creativeProjectIndexAssets,
  creativeProjectIndexGoals,
  creativeProjectIndexBatchJobs,
} = storeToRefs(creativeProjectStore);

const activeProjectId = ref("creative-main-project");
const activeWorkspaceTab = ref("prompt");

const creativeWorkspaceTabs = computed(() => [
  { label: t("creativePage.workspaceTabs.prompt"), value: "prompt" },
  { label: t("creativePage.workspaceTabs.assets"), value: "assets" },
  { label: t("creativePage.workspaceTabs.goal"), value: "goal" },
  { label: t("creativePage.workspaceTabs.batch"), value: "batch" },
  { label: t("creativePage.workspaceTabs.history"), value: "history" },
]);

const projectSeedItems = [
  {
    projectId: "creative-main-project",
    title: "默认创作项目",
    description: "承接日常提示词、审查和资产入库。",
  },
  {
    projectId: "story-assets",
    title: "故事资产项目",
    description: "管理角色、场景、道具、分镜和设定集。",
  },
  {
    projectId: "goal-planning",
    title: "目标编排项目",
    description: "把创作目标拆成可执行的协作任务。",
  },
  {
    projectId: "batch-production",
    title: "批量生图项目",
    description: "验证批量提示词和图片生成链路。",
  },
];

const creativeProjectCards = computed(() => {
  const records = new Map<string, CreativeProjectCardRecord>();

  for (const seed of projectSeedItems) {
    records.set(seed.projectId, {
      projectId: seed.projectId,
      title: seed.title,
      description: seed.description,
      tasks: 0,
      assets: 0,
      goals: 0,
      batchJobs: 0,
      latestAt: null,
      status: "idle",
    });
  }

  const touchRecord = (projectId: string | null, updater: (record: CreativeProjectCardRecord) => void) => {
    if (!projectId) return;
    if (!records.has(projectId)) {
      records.set(projectId, createSeedRecord(projectId));
    }
    const record = records.get(projectId);
    if (!record) return;
    updater(record);
  };

  function createSeedRecord(projectId: string): CreativeProjectCardRecord {
    return {
      projectId,
      title: projectId,
      description: "项目记录已同步，等待进一步整理命名。",
      tasks: 0,
      assets: 0,
      goals: 0,
      batchJobs: 0,
      latestAt: null,
      status: "idle",
    };
  }

  for (const task of creativeProjectIndexTasks.value) {
    touchRecord(task.projectId, (record) => {
      record.tasks += 1;
      if (!record.latestAt || task.updatedAt > record.latestAt) {
        record.latestAt = task.updatedAt;
        record.status = task.status;
      }
    });
  }

  for (const asset of creativeProjectIndexAssets.value) {
    touchRecord(asset.projectId, (record) => {
      record.assets += 1;
      if (!record.latestAt || asset.updatedAt > record.latestAt) {
        record.latestAt = asset.updatedAt;
        record.status = asset.status;
      }
    });
  }

  for (const goal of creativeProjectIndexGoals.value) {
    touchRecord(goal.projectId, (record) => {
      record.goals += 1;
      if (!record.latestAt || goal.updatedAt > record.latestAt) {
        record.latestAt = goal.updatedAt;
        record.status = goal.status;
      }
    });
  }

  for (const batchJob of creativeProjectIndexBatchJobs.value) {
    touchRecord(batchJob.projectId, (record) => {
      record.batchJobs += 1;
      if (!record.latestAt || batchJob.updatedAt > record.latestAt) {
        record.latestAt = batchJob.updatedAt;
        record.status = batchJob.status;
      }
    });
  }

  if (activeProjectId.value && !records.has(activeProjectId.value)) {
    records.set(activeProjectId.value, {
      ...createSeedRecord(activeProjectId.value),
      description: t("creativePage.project.currentFallback"),
    });
  }

  return Array.from(records.values()).sort((left, right) => {
    if (left.projectId === activeProjectId.value) return -1;
    if (right.projectId === activeProjectId.value) return 1;
    const leftTime = left.latestAt || "";
    const rightTime = right.latestAt || "";
    return rightTime.localeCompare(leftTime);
  });
});

const activeProjectCard = computed(
  () =>
    creativeProjectCards.value.find((item) => item.projectId === activeProjectId.value) || {
      projectId: activeProjectId.value,
      title: activeProjectId.value,
      description: t("creativePage.project.currentFallback"),
      tasks: 0,
      assets: 0,
      goals: 0,
      batchJobs: 0,
      latestAt: null,
      status: "idle",
    }
);

const activeProjectStats = computed(() => [
  { key: "tasks", label: t("creativePage.project.tasks"), value: activeProjectCard.value.tasks },
  { key: "assets", label: t("creativePage.project.assets"), value: activeProjectCard.value.assets },
  { key: "goals", label: t("creativePage.project.goals"), value: activeProjectCard.value.goals },
  { key: "batchJobs", label: t("creativePage.project.batchJobs"), value: activeProjectCard.value.batchJobs },
]);

const refreshCreativeProjectCenter = async () => {
  await Promise.all([
    creativeProjectStore.loadCreativeProjectIndex(),
    creativeProjectStore.loadCreativeProjectHistory(activeProjectId.value),
  ]);
};

const selectCreativeProject = (projectId: string) => {
  activeProjectId.value = projectId;
};

onMounted(async () => {
  await creativeTaskStore.initCreativeTaskListeners();
  await creativeBatchStore.initBatchJobListeners();
  await creativeProjectStore.ensureCreativeProjectSeeds(
    projectSeedItems.map((seed) => ({ ...seed }))
  );
  await refreshCreativeProjectCenter();
});

watch(
  () => activeProjectId.value,
  async (projectId) => {
    await creativeProjectStore.loadCreativeProjectHistory(projectId);
  }
);
</script>

<template>
  <section class="detail-stack">
    <section class="creative-project-center">
      <CreativeProjectList
        class="creative-project-list"
        :active-id="activeProjectId"
        :cards="creativeProjectCards"
        @update:active-id="selectCreativeProject"
      />

      <section class="creative-project-workspace">
        <div class="creative-project-workspace__header">
          <div class="creative-project-workspace__title">
            <h2>{{ activeProjectCard?.title || activeProjectId }}</h2>
            <span>{{ activeProjectCard?.description || t("creativePage.project.currentFallback") }}</span>
          </div>
          <div class="creative-project-workspace__meta">
            <span
              v-for="item in activeProjectStats"
              :key="item.key"
              class="creative-project-stat"
            >
              {{ item.label }} {{ item.value }}
            </span>
            <BaseButton type="neutral" size="sm" @click="refreshCreativeProjectCenter">
              {{ t("creativePage.project.refresh") }}
            </BaseButton>
          </div>
        </div>

        <div class="creative-workspace-nav">
          <BaseSegmented
            v-model="activeWorkspaceTab"
            :options="creativeWorkspaceTabs"
            block
            size="sm"
          />
        </div>

        <div class="creative-workspace-body">
          <Transition name="fade-slide" mode="out-in">
            <CreativeTabPrompt
              v-if="activeWorkspaceTab === 'prompt'"
              :active-project-id="activeProjectId"
            />
            <CreativeTabAssets
              v-else-if="activeWorkspaceTab === 'assets'"
              :active-project-id="activeProjectId"
            />
            <CreativeTabGoal
              v-else-if="activeWorkspaceTab === 'goal'"
              :active-project-id="activeProjectId"
            />
            <CreativeTabBatch
              v-else-if="activeWorkspaceTab === 'batch'"
              :active-project-id="activeProjectId"
            />
            <CreativeTabHistory
              v-else-if="activeWorkspaceTab === 'history'"
              :active-project-id="activeProjectId"
            />
          </Transition>
        </div>
      </section>
    </section>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply h-full min-h-0 overflow-hidden;
}

.creative-project-center {
  @apply grid h-full min-h-0 items-stretch gap-3;
  grid-template-rows: minmax(132px, 34%) minmax(0, 1fr);
}

@media (min-width: 1024px) {
  .creative-project-center {
    grid-template-rows: minmax(0, 1fr);
    grid-template-columns: 300px minmax(0, 1fr);
  }
}

.creative-project-list,
.creative-project-workspace {
  @apply min-h-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.creative-project-list {
  @apply flex flex-col overflow-hidden;
}

.creative-project-workspace {
  @apply flex h-full flex-col overflow-hidden;
}

.creative-project-workspace__header {
  @apply shrink-0;
}

.creative-project-workspace__header {
  @apply grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start;
}

.creative-project-workspace__header h2 {
  @apply text-base font-black text-slate-950 dark:text-white;
}

.creative-project-workspace__title {
  @apply min-w-0;
}

.creative-project-workspace__title span {
  @apply block truncate text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.creative-project-workspace__meta {
  @apply flex shrink-0 flex-wrap items-center justify-start gap-2 lg:justify-end;
}

.creative-project-stat {
  @apply rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300;
}

.creative-workspace-nav {
  @apply mt-2 shrink-0 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-950;
}

.creative-workspace-body {
  @apply mt-2 min-h-0 flex flex-1 flex-col overflow-hidden relative;
}

/* 选项卡切换动效：滑动过渡与交错渐显 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.creative-project-workspace :deep(.creative-section) {
  @apply min-h-0 flex-1 border-0 bg-transparent p-0 shadow-none;
  box-shadow: none;
}

.creative-project-workspace :deep(.creative-section__header) {
  @apply mb-2;
}

.creative-project-workspace :deep(.creative-section__body) {
  @apply min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-3 pr-2;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.creative-project-workspace :deep(.creative-section__body::-webkit-scrollbar) {
  @apply w-2;
}

.creative-project-workspace :deep(.creative-section__body::-webkit-scrollbar-thumb) {
  @apply rounded-full bg-slate-300 dark:bg-slate-700;
}

.creative-project-workspace :deep(.creative-section__body::-webkit-scrollbar-track) {
  @apply bg-transparent;
}
</style>
