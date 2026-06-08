<script setup lang="ts">
import { BrainCircuit, FileText, ImagePlus, Sparkles } from "lucide-vue-next";
import { useI18n } from "../../../composables/useI18n";

const { t } = useI18n();

const features = [
  { key: "workflow", titleKey: "aiPage.features.workflowTitle", descKey: "aiPage.features.workflowDesc", icon: BrainCircuit },
  { key: "document", titleKey: "aiPage.features.documentTitle", descKey: "aiPage.features.documentDesc", icon: FileText },
  { key: "image", titleKey: "aiPage.features.imageTitle", descKey: "aiPage.features.imageDesc", icon: ImagePlus },
] as const;
</script>

<template>
  <section class="ai-feature-panel">
    <header class="ai-feature-panel__header">
      <div class="ai-feature-panel__icon">
        <Sparkles class="h-4.5 w-4.5" />
      </div>
      <div class="min-w-0">
        <h3>{{ t("aiPage.features.title") }}</h3>
        <p>{{ t("aiPage.features.desc") }}</p>
      </div>
    </header>

    <div class="feature-grid">
      <article v-for="item in features" :key="item.key" class="feature-item">
        <div class="feature-item__icon">
          <component :is="item.icon" class="h-4 w-4" />
        </div>
        <div class="min-w-0">
          <h4>{{ t(item.titleKey) }}</h4>
          <p>{{ t(item.descKey) }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.ai-feature-panel {
  @apply flex min-h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30;
}
.ai-feature-panel__header {
  @apply flex items-center gap-3;
}
.ai-feature-panel__icon {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300;
}
.ai-feature-panel__header h3 {
  @apply text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200;
}
.ai-feature-panel__header p {
  @apply mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400;
}
.feature-grid {
  @apply grid grid-cols-1 gap-3 xl:grid-cols-3;
}
.feature-item {
  @apply flex min-h-32 gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950;
}
.feature-item__icon {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300;
}
.feature-item h4 {
  @apply text-xs font-black text-slate-800 dark:text-slate-200;
}
.feature-item p {
  @apply mt-1 text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400;
}
</style>
