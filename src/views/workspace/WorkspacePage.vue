<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowRight,
  Bot,
  BookOpen,
  Boxes,
  Compass,
  FolderOpen,
  ImageIcon,
  LoaderCircle,
  MessageSquareText,
  Settings2,
  Sparkles,
  Wrench,
} from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { useAiStore } from "../../stores/ai";
import { useAppStore } from "../../stores/app";
import { useBackgroundTaskStore } from "../../stores/background-task";
import { useFileManagerStore } from "../../stores/file-manager";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import { useNavigationStore } from "../../stores/navigation";
import { useUpdateStore } from "../../stores/update";
import { formatDateTime, formatTemplate } from "../../utils";
import "./WorkspacePage.css";

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const aiStore = useAiStore();
const updateStore = useUpdateStore();
const backgroundTaskStore = useBackgroundTaskStore();
const imageWorkbenchStore = useImageWorkbenchStore();
const fileManagerStore = useFileManagerStore();
const navigationStore = useNavigationStore();

const loading = ref(true);

const runningTasks = computed(() =>
  backgroundTaskStore.tasks.filter((task) => task.status === "running")
);
const readyModelConfigs = computed(() =>
  aiStore.modelConfigs.filter((item) => Boolean(item.baseUrl.trim()) && Boolean(item.model.trim()))
);
const latestChatSession = computed(() => aiStore.chatSessions[0] ?? null);
const latestImageSession = computed(() => aiStore.imageSessions[0] ?? null);
const latestJob = computed(() => imageWorkbenchStore.jobs[0] ?? null);
const recentAssets = computed(() => imageWorkbenchStore.libraryAssetCards.slice(0, 4));
const providerCoverage = computed(() => {
  const total = aiStore.modelConfigs.length || 1;
  return `${readyModelConfigs.value.length}/${total}`;
});
const statusCards = computed(() => [
  {
    key: "providers",
    icon: Bot,
    value: providerCoverage.value,
    label: t("workspace.stats.providers"),
    meta: formatTemplate(t("workspace.stats.providersMeta"), {
      count: aiStore.modelConfigs.length,
    }),
  },
  {
    key: "tasks",
    icon: LoaderCircle,
    value: String(runningTasks.value.length),
    label: t("workspace.stats.tasks"),
    meta: formatTemplate(t("workspace.stats.tasksMeta"), {
      count: backgroundTaskStore.tasks.length,
    }),
  },
  {
    key: "assets",
    icon: ImageIcon,
    value: String(imageWorkbenchStore.assetLibrary.length),
    label: t("workspace.stats.assets"),
    meta: formatTemplate(t("workspace.stats.assetsMeta"), {
      count: imageWorkbenchStore.jobs.length,
    }),
  },
  {
    key: "library",
    icon: Boxes,
    value: String(fileManagerStore.files.length),
    label: t("workspace.stats.files"),
    meta: formatTemplate(t("workspace.stats.filesMeta"), {
      count: navigationStore.total,
    }),
  },
]);

const readinessItems = computed(() => [
  {
    key: "provider",
    tone: readyModelConfigs.value.length > 0 ? "good" : "warn",
    title: t("workspace.readiness.providerTitle"),
    description:
      readyModelConfigs.value.length > 0
        ? formatTemplate(t("workspace.readiness.providerReady"), {
            count: readyModelConfigs.value.length,
          })
        : t("workspace.readiness.providerEmpty"),
  },
  {
    key: "image",
    tone: imageWorkbenchStore.contract ? "good" : "warn",
    title: t("workspace.readiness.imageTitle"),
    description: imageWorkbenchStore.contract
      ? formatTemplate(t("workspace.readiness.imageReady"), {
          count: imageWorkbenchStore.supportedModes.length,
        })
      : t("workspace.readiness.imageLoading"),
  },
  {
    key: "update",
    tone: updateStore.hasUpdate ? "warn" : "neutral",
    title: t("workspace.readiness.updateTitle"),
    description: updateStore.hasUpdate
      ? formatTemplate(t("workspace.readiness.updateAvailable"), {
          version: updateStore.updateInfo?.version || "",
        })
      : t("workspace.readiness.updateIdle"),
  },
  {
    key: "storage",
    tone: appStore.localPath && appStore.localPath !== "Load Failed" ? "good" : "warn",
    title: t("workspace.readiness.storageTitle"),
    description: appStore.localPath || t("workspace.readiness.storageMissing"),
  },
]);

const quickActions = computed(() => [
  {
    key: "image-workbench",
    icon: Sparkles,
    title: t("workspace.actions.imageTitle"),
    description: t("workspace.actions.imageDesc"),
    route: "/image-workbench",
  },
  {
    key: "ai",
    icon: MessageSquareText,
    title: t("workspace.actions.aiTitle"),
    description: t("workspace.actions.aiDesc"),
    route: "/ai",
  },
  {
    key: "tools",
    icon: Wrench,
    title: t("workspace.actions.toolsTitle"),
    description: t("workspace.actions.toolsDesc"),
    route: "/tools",
  },
  {
    key: "files",
    icon: FolderOpen,
    title: t("workspace.actions.filesTitle"),
    description: t("workspace.actions.filesDesc"),
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

  if (latestChatSession.value) {
    items.push({
      key: "chat",
      icon: MessageSquareText,
      title: t("workspace.continue.chatTitle"),
      description: latestChatSession.value.title,
      meta: formatTemplate(t("workspace.continue.chatMeta"), {
        count: `${latestChatSession.value.messages.length} ${t("workspace.units.messages")}`,
      }),
      route: "/ai?tab=chat",
    });
  }

  if (latestImageSession.value) {
    items.push({
      key: "session-image",
      icon: ImageIcon,
      title: t("workspace.continue.imageSessionTitle"),
      description: latestImageSession.value.title,
      meta: formatTemplate(t("workspace.continue.imageSessionMeta"), {
        count: `${latestImageSession.value.messages.length} ${t("workspace.units.messages")}`,
      }),
      route: "/ai?tab=image",
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
      fileManagerStore.fetchFiles(),
      navigationStore.fetchList(),
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
  <div class="workspace-page">
    <section class="workspace-hero workbench-card">
      <div class="workspace-hero__copy">
        <span class="workspace-badge">{{ t("workspace.kicker") }}</span>
        <h1>{{ t("workspace.title") }}</h1>
        <p>{{ t("workspace.welcome") }}</p>
        <div class="workspace-hero__actions">
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

      <div class="workspace-hero__summary">
        <div class="workspace-hero__panel">
          <span class="workspace-hero__eyebrow">{{ t("workspace.summaryTitle") }}</span>
          <strong>{{ t("workspace.summaryHeadline") }}</strong>
          <p>{{ t("workspace.summaryBody") }}</p>
        </div>
        <div class="workspace-hero__pill-group">
          <span class="workspace-pill">
            <LoaderCircle class="h-3.5 w-3.5" :class="{ 'animate-spin': runningTasks.length > 0 }" />
            {{ formatTemplate(t("workspace.summaryRunning"), { count: runningTasks.length }) }}
          </span>
          <span class="workspace-pill">
            <ImageIcon class="h-3.5 w-3.5" />
            {{ formatTemplate(t("workspace.summaryAssets"), { count: imageWorkbenchStore.assetLibrary.length }) }}
          </span>
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
          <small>{{ item.meta }}</small>
        </div>
      </article>
    </section>

    <section class="workspace-grid">
      <article class="workspace-block workbench-card">
        <div class="workspace-block__head">
          <div>
            <span class="workspace-block__eyebrow">{{ t("workspace.readiness.kicker") }}</span>
            <h2>{{ t("workspace.readiness.title") }}</h2>
          </div>
          <BaseButton type="neutral" outline size="xs" @click="openRoute('/settings')">
            <template #icon><Settings2 class="h-3 w-3" /></template>
            {{ t("workspace.readiness.action") }}
          </BaseButton>
        </div>

        <div class="workspace-readiness">
          <div
            v-for="item in readinessItems"
            :key="item.key"
            class="workspace-readiness__item"
            :class="`is-${item.tone}`"
          >
            <span class="workspace-readiness__dot"></span>
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.description }}</p>
            </div>
          </div>
        </div>
      </article>

      <article class="workspace-block workbench-card">
        <div class="workspace-block__head">
          <div>
            <span class="workspace-block__eyebrow">{{ t("workspace.actions.kicker") }}</span>
            <h2>{{ t("workspace.actions.title") }}</h2>
          </div>
        </div>

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
              <p>{{ item.description }}</p>
            </div>
            <ArrowRight class="h-4 w-4 workspace-action__arrow" />
          </button>
        </div>
      </article>
    </section>

    <section class="workspace-grid workspace-grid--lower">
      <article class="workspace-block workbench-card">
        <div class="workspace-block__head">
          <div>
            <span class="workspace-block__eyebrow">{{ t("workspace.continue.kicker") }}</span>
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
          <BookOpen class="h-6 w-6" />
          <strong>{{ t("workspace.continue.emptyTitle") }}</strong>
          <p>{{ t("workspace.continue.emptyDesc") }}</p>
        </div>
      </article>

      <article class="workspace-block workbench-card">
        <div class="workspace-block__head">
          <div>
            <span class="workspace-block__eyebrow">{{ t("workspace.assets.kicker") }}</span>
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
          <p>{{ t("workspace.assets.emptyDesc") }}</p>
        </div>
      </article>
    </section>

    <section class="workspace-grid workspace-grid--lower">
      <article class="workspace-block workbench-card">
        <div class="workspace-block__head">
          <div>
            <span class="workspace-block__eyebrow">{{ t("workspace.system.kicker") }}</span>
            <h2>{{ t("workspace.system.title") }}</h2>
          </div>
          <BaseButton type="neutral" outline size="xs" @click="openRoute('/system')">
            {{ t("workspace.system.action") }}
          </BaseButton>
        </div>

        <div class="workspace-system">
          <div class="workspace-system__item">
            <span>{{ t("workspace.system.version") }}</span>
            <strong>v{{ appStore.version }}</strong>
          </div>
          <div class="workspace-system__item">
            <span>{{ t("workspace.system.path") }}</span>
            <strong>{{ appStore.localPath }}</strong>
          </div>
          <div class="workspace-system__item">
            <span>{{ t("workspace.system.backgroundTasks") }}</span>
            <strong>{{ backgroundTaskStore.tasks.length }}</strong>
          </div>
          <div class="workspace-system__item">
            <span>{{ t("workspace.system.navRecords") }}</span>
            <strong>{{ navigationStore.total }}</strong>
          </div>
        </div>
      </article>

      <article class="workspace-block workbench-card">
        <div class="workspace-block__head">
          <div>
            <span class="workspace-block__eyebrow">{{ t("workspace.shortcuts.kicker") }}</span>
            <h2>{{ t("workspace.shortcuts.title") }}</h2>
          </div>
        </div>

        <div class="workspace-shortcuts">
          <button type="button" class="workspace-shortcuts__item" @click="openRoute('/navigation')">
            <Compass class="h-4 w-4" />
            <span>{{ t("workspace.shortcuts.navigation") }}</span>
          </button>
          <button type="button" class="workspace-shortcuts__item" @click="openRoute('/tools')">
            <Wrench class="h-4 w-4" />
            <span>{{ t("workspace.shortcuts.tools") }}</span>
          </button>
          <button type="button" class="workspace-shortcuts__item" @click="openRoute('/file-manager')">
            <FolderOpen class="h-4 w-4" />
            <span>{{ t("workspace.shortcuts.files") }}</span>
          </button>
          <button type="button" class="workspace-shortcuts__item" @click="openRoute('/settings')">
            <Settings2 class="h-4 w-4" />
            <span>{{ t("workspace.shortcuts.settings") }}</span>
          </button>
        </div>
      </article>
    </section>

    <div v-if="loading" class="workspace-loading">
      <LoaderCircle class="h-4 w-4 animate-spin" />
      <span>{{ t("workspace.loading") }}</span>
    </div>
  </div>
</template>
