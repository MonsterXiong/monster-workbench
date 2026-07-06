<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowRight,
  Bot,
  FolderOpen,
  ImageIcon,
  LoaderCircle,
  MessageSquareText,
  Sparkles,
  Wrench,
} from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { useAiStore } from "../../stores/ai";
import { useBackgroundTaskStore } from "../../stores/background-task";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import { formatDateTime, formatTemplate } from "../../utils";
import "./WorkspacePage.css";

const { t } = useI18n();
const router = useRouter();
const aiStore = useAiStore();
const backgroundTaskStore = useBackgroundTaskStore();
const imageWorkbenchStore = useImageWorkbenchStore();

const loading = ref(true);

const runningTasks = computed(() =>
  backgroundTaskStore.tasks.filter((task) => task.status === "running")
);
const readyModelConfigs = computed(() =>
  aiStore.modelConfigs.filter((item) => Boolean(item.baseUrl.trim()) && Boolean(item.model.trim()))
);
const latestJob = computed(() => imageWorkbenchStore.jobs[0] ?? null);
const recentAssets = computed(() => imageWorkbenchStore.libraryAssetCards.slice(0, 4));
const statusCards = computed(() => [
  {
    key: "providers",
    icon: Bot,
    value: String(readyModelConfigs.value.length),
    label: t("workspace.stats.providers"),
  },
  {
    key: "tasks",
    icon: LoaderCircle,
    value: String(runningTasks.value.length),
    label: t("workspace.stats.tasks"),
  },
  {
    key: "assets",
    icon: ImageIcon,
    value: String(imageWorkbenchStore.assetLibrary.length),
    label: t("workspace.stats.assets"),
  },
]);

const quickActions = computed(() => [
  {
    key: "image-workbench",
    icon: Sparkles,
    title: t("workspace.actions.imageTitle"),
    route: "/image-workbench",
  },
  {
    key: "ai",
    icon: MessageSquareText,
    title: t("workspace.actions.aiTitle"),
    route: "/ai",
  },
  {
    key: "tools",
    icon: Wrench,
    title: t("workspace.actions.toolsTitle"),
    route: "/tools",
  },
  {
    key: "files",
    icon: FolderOpen,
    title: t("workspace.actions.filesTitle"),
    route: "/file-manager",
  },
]);

const recentWorkItems = computed(() => {
  const items = [];

  if (latestJob.value) {
    items.push({
      key: "job",
      icon: Sparkles,
      title: t("workspace.continue.latestJobTitle"),
      description: latestJob.value.prompt || t("workspace.continue.emptyPrompt"),
      meta: formatTemplate(t("workspace.continue.latestJobMeta"), {
        status: t(`imageWorkbench.jobStatuses.${latestJob.value.status}`),
        time: formatDateTime(new Date(latestJob.value.updatedAtMs)),
      }),
      route: "/image-workbench",
    });
  }

  return items;
});

function openRoute(path: string) {
  void router.push(path);
}

async function loadWorkspace() {
  loading.value = true;
  try {
    await Promise.all([
      aiStore.loadConfig(),
      imageWorkbenchStore.loadInitialState(),
    ]);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadWorkspace();
});
</script>

<template>
  <div class="workspace-page workbench-page-shell workbench-page-shell--scroll">
    <section class="workspace-overview">
      <div class="workspace-overview__copy">
        <h1>{{ t("workspace.title") }}</h1>
      </div>

      <div class="workspace-overview__side">
        <div class="workspace-overview__actions">
          <BaseButton type="primary" size="sm" @click="openRoute('/image-workbench')">
            <template #icon><Sparkles class="h-3.5 w-3.5" /></template>
            {{ t("workspace.primaryAction") }}
          </BaseButton>
          <BaseButton type="neutral" outline size="sm" @click="openRoute('/ai')">
            <template #icon><Bot class="h-3.5 w-3.5" /></template>
            {{ t("workspace.secondaryAction") }}
          </BaseButton>
        </div>
      </div>
    </section>

    <section class="workspace-stats">
      <article v-for="item in statusCards" :key="item.key" class="workspace-stat-card workbench-card">
        <div class="workspace-stat-card__icon">
          <component :is="item.icon" class="h-4.5 w-4.5" />
        </div>
        <div>
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </div>
      </article>
    </section>

    <section class="workspace-actions-panel workbench-card">
      <div class="workspace-actions">
        <button
          v-for="item in quickActions"
          :key="item.key"
          type="button"
          class="workspace-action"
          @click="openRoute(item.route)"
        >
          <div class="workspace-action__icon">
            <component :is="item.icon" class="h-4 w-4" />
          </div>
          <div class="workspace-action__body">
            <strong>{{ item.title }}</strong>
          </div>
          <ArrowRight class="h-4 w-4 workspace-action__arrow" />
        </button>
      </div>
    </section>

    <section class="workspace-grid workspace-grid--lower">
      <article class="workspace-block workbench-card">
        <div class="workspace-block__head">
          <div>
            <h2>{{ t("workspace.continue.title") }}</h2>
          </div>
        </div>

        <div v-if="recentWorkItems.length" class="workspace-list">
          <button
            v-for="item in recentWorkItems"
            :key="item.key"
            type="button"
            class="workspace-list__item"
            @click="openRoute(item.route)"
          >
            <div class="workspace-list__icon">
              <component :is="item.icon" class="h-4 w-4" />
            </div>
            <div class="workspace-list__body">
              <strong>{{ item.title }}</strong>
              <p>{{ item.description }}</p>
              <small>{{ item.meta }}</small>
            </div>
          </button>
        </div>
        <div v-else class="workspace-empty">
          <strong>{{ t("workspace.continue.emptyTitle") }}</strong>
        </div>
      </article>

      <article class="workspace-block workbench-card">
        <div class="workspace-block__head">
          <div>
            <h2>{{ t("workspace.assets.title") }}</h2>
          </div>
          <BaseButton type="neutral" outline size="xs" @click="openRoute('/image-workbench')">
            {{ t("workspace.assets.action") }}
          </BaseButton>
        </div>

        <div v-if="recentAssets.length" class="workspace-assets">
          <button
            v-for="asset in recentAssets"
            :key="asset.id"
            type="button"
            class="workspace-assets__item"
            @click="openRoute('/image-workbench')"
          >
            <img :src="asset.displayUrl" alt="" />
            <span>{{ asset.width || "-" }} x {{ asset.height || "-" }}</span>
          </button>
        </div>
        <div v-else class="workspace-empty">
          <ImageIcon class="h-6 w-6" />
          <strong>{{ t("workspace.assets.emptyTitle") }}</strong>
        </div>
      </article>
    </section>

    <div v-if="loading" class="workspace-loading">
      <LoaderCircle class="h-4 w-4 animate-spin" />
      <span>{{ t("workspace.loading") }}</span>
    </div>
  </div>
</template>
