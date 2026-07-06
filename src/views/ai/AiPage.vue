<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ScrollText, SlidersHorizontal } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { useToast } from "../../composables/useToast";
import { useAiStore } from "../../stores/ai";
import AiPromptPanel from "./components/AiPromptPanel.vue";
import AiProviderPanel from "./components/AiProviderPanel.vue";
import { getQueryParamEnum } from "../../utils";

const { t } = useI18n();
const { triggerToast } = useToast();
const aiStore = useAiStore();
const route = useRoute();
const router = useRouter();

const AI_TAB_VALUES = ["config", "prompts"] as const;
type AiTab = typeof AI_TAB_VALUES[number];

const tabs = [
  { key: "config", labelKey: "aiPage.tabs.config", icon: SlidersHorizontal },
  { key: "prompts", labelKey: "aiPage.tabs.prompts", icon: ScrollText },
] as const;

function normalizeTab(value: unknown): AiTab {
  return getQueryParamEnum(value, AI_TAB_VALUES, "config", { arrayMode: "fallback" });
}

const activeTab = computed<AiTab>({
  get: () => normalizeTab(route.query.tab),
  set: (tab) => {
    void router.replace({
      query: {
        ...route.query,
        tab,
      },
    });
  },
});

watch(
  () => route.query.tab,
  (value) => {
    const current = Array.isArray(value) ? value[0] : value;
    const normalized = normalizeTab(value);
    if (current && current !== normalized) {
      void router.replace({
        query: {
          ...route.query,
          tab: normalized,
        },
      });
    }
  },
  { immediate: true }
);

const handleSaved = () => {
  triggerToast(t("settings.aiProvider.saveSuccess"), "success");
};

const handleTested = (ok: boolean, message: string) => {
  triggerToast(message, ok ? "success" : "error");
};

const handleFailed = (message: string) => {
  triggerToast(message, "error");
};

onMounted(() => {
  if (!aiStore.isLoaded) {
    void aiStore.loadConfig();
  }
});
</script>

<template>
  <main class="ai-page workbench-page-shell">
    <section class="ai-page__body">
      <aside class="ai-page__tabs">
        <button
          v-for="item in tabs"
          :key="item.key"
          type="button"
          class="ai-tab"
          :class="activeTab === item.key ? 'ai-tab--active' : 'ai-tab--idle'"
          @click="activeTab = item.key"
        >
          <component :is="item.icon" class="h-4 w-4" />
          <span>{{ t(item.labelKey) }}</span>
        </button>
      </aside>

      <div class="ai-page__panel">
        <AiProviderPanel
          v-if="activeTab === 'config'"
          @saved="handleSaved"
          @tested="handleTested"
          @failed="handleFailed"
        />
        <AiPromptPanel v-else />
      </div>
    </section>
  </main>
</template>

<style scoped>
.ai-page__body {
  @apply flex min-h-0 flex-1 gap-5 overflow-hidden;
}

.ai-page__tabs {
  @apply flex w-44 shrink-0 flex-col gap-1.5 border-r border-slate-100 pr-4 dark:border-slate-800;
}

.ai-tab {
  @apply flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-bold transition-all duration-200;
}

.ai-tab--active {
  @apply bg-primary/10 text-primary shadow-inner;
}

.ai-tab--idle {
  @apply bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

.ai-page__panel {
  @apply min-h-0 flex-1 overflow-hidden pr-1;
}

@media (max-width: 1400px) {
  .ai-page__body {
    @apply flex-col gap-2 overflow-hidden;
  }

  .ai-page__tabs {
    @apply w-full flex-row gap-1.5 overflow-x-auto border-b border-r-0 border-slate-100 pb-2 pr-0 dark:border-slate-800;
    scrollbar-width: none;
  }

  .ai-page__tabs::-webkit-scrollbar {
    display: none;
  }

  .ai-tab {
    @apply h-8 w-auto shrink-0 px-3;
  }

  .ai-page__panel {
    @apply pr-0;
  }
}

@media (max-width: 720px) {
  .ai-tab {
    @apply h-8 px-2.5 text-[11px];
  }
}
</style>
