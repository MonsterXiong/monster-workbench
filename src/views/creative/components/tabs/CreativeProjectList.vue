<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "../../../../composables/useI18n";
import { useCreativeFormatters } from "../../../../composables/useCreativeFormatters";
import BaseSearchInput from "@/components/common/BaseSearchInput.vue";
import BaseSegmented from "@/components/common/BaseSegmented.vue";
import BaseDataState from "@/components/common/BaseDataState.vue";

export interface CreativeProjectCardRecord {
  projectId: string;
  title: string;
  description: string;
  tasks: number;
  assets: number;
  goals: number;
  batchJobs: number;
  latestAt: string | null;
  status: string;
}

const props = defineProps<{
  activeId: string;
  cards: CreativeProjectCardRecord[];
}>();

const emit = defineEmits<{
  (e: "update:activeId", value: string): void;
}>();

const { t } = useI18n();
const { statusLabel } = useCreativeFormatters();

const projectSearchQuery = ref("");
const projectStatusFilter = ref("all");

const projectStatusFilterOptions = computed(() => [
  { label: t("creativePage.project.filters.all"), value: "all" },
  { label: t("creativePage.project.filters.active"), value: "active" },
  { label: t("creativePage.project.filters.running"), value: "running" },
  { label: t("creativePage.project.filters.attention"), value: "attention" },
]);

const projectMatchesStatusFilter = (project: CreativeProjectCardRecord) => {
  if (projectStatusFilter.value === "active") {
    return project.tasks + project.assets + project.goals + project.batchJobs > 0;
  }
  if (projectStatusFilter.value === "running") {
    return ["running", "queued"].includes(project.status);
  }
  if (projectStatusFilter.value === "attention") {
    return ["failed", "manual_approval", "paused"].includes(project.status);
  }
  return true;
};

const filteredCreativeProjectCards = computed(() => {
  const query = projectSearchQuery.value.trim().toLowerCase();
  return props.cards.filter((project) => {
    if (!projectMatchesStatusFilter(project)) return false;
    if (!query) return true;
    return [project.title, project.description, project.projectId, statusLabel(project.status)]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
});

const projectStatsLabel = (project: CreativeProjectCardRecord) =>
  [
    project.tasks ? `${project.tasks} 个任务` : "",
    project.assets ? `${project.assets} 个资产` : "",
    project.goals ? `${project.goals} 个目标` : "",
    project.batchJobs ? `${project.batchJobs} 个批量` : "",
  ]
    .filter(Boolean)
    .join(" · ") || "暂无产出";

const selectCreativeProject = (projectId: string) => {
  emit("update:activeId", projectId);
};
</script>

<template>
  <aside class="creative-project-list">
    <div class="creative-project-list__header">
      <h2>{{ t("creativePage.project.listTitle") }}</h2>
      <span>{{ filteredCreativeProjectCards.length }} / {{ cards.length }}</span>
    </div>
    <div class="creative-project-list__toolbar">
      <BaseSearchInput
        v-model="projectSearchQuery"
        :placeholder="t('creativePage.project.searchPlaceholder')"
        size="sm"
        surface="muted"
        search-on-input
        trim-on-input-search
      />
      <BaseSegmented
        v-model="projectStatusFilter"
        :options="projectStatusFilterOptions"
        block
        wrap
        compact
        size="sm"
      />
    </div>
    <div class="creative-project-list__items">
      <button
        v-for="project in filteredCreativeProjectCards"
        :key="project.projectId"
        class="creative-project-card group"
        :class="{ 'is-active': project.projectId === activeId }"
        type="button"
        @click="selectCreativeProject(project.projectId)"
      >
        <span class="creative-project-card__title">{{ project.title }}</span>
        <span class="creative-project-card__desc">{{ project.description }}</span>
        <span class="creative-project-card__meta">{{ projectStatsLabel(project) }}</span>
      </button>
      <BaseDataState
        v-if="!filteredCreativeProjectCards.length"
        state="empty"
        :title="t('creativePage.project.emptyProjectsTitle')"
        :description="t('creativePage.project.emptyProjectsDescription')"
        compact
      />
    </div>
  </aside>
</template>

<style scoped>
.creative-project-list {
  @apply flex h-full flex-col overflow-hidden border-r border-slate-100 pr-4;
}

.creative-project-list__header {
  @apply shrink-0 flex items-center justify-between gap-2;
}

.creative-project-list__header span {
  @apply shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-950 dark:text-slate-400;
}

.creative-project-list__header h2 {
  @apply text-base font-black text-slate-950 dark:text-white;
}

.creative-project-list__toolbar {
  @apply mt-3 grid shrink-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start;
}

.creative-project-list__toolbar :deep(.base-segmented__item) {
  @apply min-w-[64px];
}

.creative-project-list__items {
  @apply mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1;
}

.creative-project-card {
  @apply grid gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-primary/50;
}

.creative-project-card.is-active {
  @apply border-primary bg-primary/10 dark:bg-primary/15;
}

.creative-project-card__title {
  @apply text-sm font-bold text-slate-950 dark:text-white transition-colors group-hover:text-primary;
}

.creative-project-card__desc,
.creative-project-card__meta {
  @apply break-all text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.creative-project-card__meta {
  @apply font-bold text-slate-600 dark:text-slate-300;
}

.creative-project-list__items::-webkit-scrollbar {
  @apply w-1.5;
}

.creative-project-list__items::-webkit-scrollbar-thumb {
  @apply rounded-full bg-slate-200 dark:bg-slate-800;
}

.creative-project-list__items:hover::-webkit-scrollbar-thumb {
  @apply bg-slate-300 dark:bg-slate-700;
}

.creative-project-list__items::-webkit-scrollbar-track {
  @apply bg-transparent;
}
</style>
