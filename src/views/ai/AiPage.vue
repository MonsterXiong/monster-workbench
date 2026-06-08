<script setup lang="ts">
import { ref } from "vue";
import { Bot, Image, MessageSquareText, Puzzle, ScrollText, SlidersHorizontal } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { useToast } from "../../composables/useToast";
import AiChatPanel from "./components/AiChatPanel.vue";
import AiFeaturePanel from "./components/AiFeaturePanel.vue";
import AiImagePanel from "./components/AiImagePanel.vue";
import AiPromptPanel from "./components/AiPromptPanel.vue";
import AiProviderPanel from "./components/AiProviderPanel.vue";

const { t } = useI18n();
const { triggerToast } = useToast();

type AiTab = "config" | "chat" | "image" | "prompts" | "features";

const activeTab = ref<AiTab>("config");
const tabs = [
  { key: "config", labelKey: "aiPage.tabs.config", icon: SlidersHorizontal },
  { key: "chat", labelKey: "aiPage.tabs.chat", icon: MessageSquareText },
  { key: "image", labelKey: "aiPage.tabs.image", icon: Image },
  { key: "prompts", labelKey: "aiPage.tabs.prompts", icon: ScrollText },
  { key: "features", labelKey: "aiPage.tabs.features", icon: Puzzle },
] as const;

const handleSaved = () => {
  triggerToast(t("settings.aiProvider.saveSuccess"), "success");
};

const handleTested = (ok: boolean, message: string) => {
  triggerToast(message, ok ? "success" : "error");
};

const handleFailed = (message: string) => {
  triggerToast(message, "error");
};

const handleUsePrompt = (type: "chat" | "image") => {
  activeTab.value = type;
};
</script>

<template>
  <main class="ai-page">
    <header class="ai-page__header">
      <div class="ai-page__mark">
        <Bot class="h-5 w-5" />
      </div>
      <div class="min-w-0">
        <h2>{{ t("aiPage.title") }}</h2>
        <p>{{ t("aiPage.subtitle") }}</p>
      </div>
    </header>

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
        <transition name="fade-fast" mode="out-in">
          <AiProviderPanel
            v-if="activeTab === 'config'"
            key="config"
            @saved="handleSaved"
            @tested="handleTested"
            @failed="handleFailed"
          />
          <AiChatPanel
            v-else-if="activeTab === 'chat'"
            key="chat"
            @failed="handleFailed"
          />
          <AiImagePanel
            v-else-if="activeTab === 'image'"
            key="image"
            @failed="handleFailed"
          />
          <AiPromptPanel v-else-if="activeTab === 'prompts'" key="prompts" @use="handleUsePrompt" />
          <AiFeaturePanel v-else key="features" />
        </transition>
      </div>
    </section>
  </main>
</template>

<style scoped>
.ai-page {
  @apply flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100;
}

.ai-page__header {
  @apply flex shrink-0 items-center gap-3 border-b border-slate-100 pb-5 dark:border-slate-800;
}

.ai-page__mark {
  @apply flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm;
}

.ai-page__header h2 {
  @apply truncate text-sm font-black tracking-wide text-slate-900 dark:text-slate-100;
}

.ai-page__header p {
  @apply mt-1 line-clamp-1 text-xs font-medium text-slate-500 dark:text-slate-400;
}

.ai-page__body {
  @apply flex min-h-0 flex-1 gap-5 overflow-hidden pt-5;
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

.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.15s ease;
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}
</style>
