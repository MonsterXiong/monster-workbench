<script setup lang="ts">
import { AlertTriangle, Sparkles, XCircle } from "lucide-vue-next";
import { useI18n } from "../../../../composables/useI18n";
import type { AiPromptItem } from "../../../../types/ai";
import { firstItem, removeAnyPrefix, splitLines, startsWithAnyText, truncateText } from "../../../../utils";

export type EmptyPromptStarter = {
  key: string;
  title: string;
  prompt: string;
  size: string;
  sizeLabel: string;
};

defineProps<{
  emptyPromptStarters: EmptyPromptStarter[];
  stylePromptPresets: AiPromptItem[];
  filteredStylePromptPresets: AiPromptItem[];
  selectedStylePrompt: AiPromptItem | null;
  selectedStylePromptId: string;
  stylePromptSearch: string;
  stylePickerLabel: string;
  stylePresetCountLabel: string;
  promptStartersExpanded: boolean;
  stylePresetsExpanded: boolean;
  canEnhancePrompt: boolean;
  canUndoPromptEnhance: boolean;
  activeSizeNotice: string;
  draftMetaItems: string[];
  draftHasStyleSubjectPlaceholder: boolean;
}>();

const emit = defineEmits<{
  (event: "update:stylePromptSearch", value: string): void;
  (event: "toggle-prompt-starters"): void;
  (event: "toggle-style-presets"): void;
  (event: "enhance-prompt"): void;
  (event: "undo-prompt-enhance"): void;
  (event: "clear-style-prompt"): void;
  (event: "apply-style-prompt", preset: AiPromptItem): void;
  (event: "apply-empty-prompt-starter", starter: EmptyPromptStarter): void;
  (event: "clear-draft-prompt"): void;
}>();

const { t } = useI18n();

function updateStylePromptSearch(value: unknown) {
  emit("update:stylePromptSearch", String(value ?? ""));
}

function getStylePromptSummary(preset: AiPromptItem) {
  const lines = splitLines(preset.content, { trim: true, keepEmpty: false });
  const styleLine = lines.find((line) => startsWithAnyText(line, ["风格：", "Style:"])) ?? lines[1] ?? firstItem(lines);
  if (!styleLine) {
    return "";
  }
  return truncateText(removeAnyPrefix(styleLine, ["风格：", "Style:"], { trimStart: true }), 54, "");
}
</script>

<template>
  <div
    v-if="emptyPromptStarters.length || stylePromptPresets.length"
    class="composer-size-presets composer-size-presets--tools-only"
    :aria-label="t('aiPage.image.promptToolsLabel')"
  >
    <div class="composer-tools">
      <template v-if="emptyPromptStarters.length">
        <button
          type="button"
          class="starter-toggle-chip"
          :class="{ 'starter-toggle-chip--active': promptStartersExpanded }"
          :aria-expanded="promptStartersExpanded"
          :title="t('aiPage.image.starterLabel')"
          @click="emit('toggle-prompt-starters')"
        >
          <Sparkles class="h-3 w-3" />
          {{ t("aiPage.image.starterToggle") }}
        </button>
      </template>
      <span v-if="emptyPromptStarters.length && stylePromptPresets.length" class="composer-tools-divider"></span>
      <template v-if="stylePromptPresets.length">
        <button
          type="button"
          class="style-toggle-chip"
          :class="{ 'style-toggle-chip--active': stylePresetsExpanded || selectedStylePrompt }"
          :aria-expanded="stylePresetsExpanded"
          :title="selectedStylePrompt?.content || t('aiPage.image.stylePresetLabel')"
          @click="emit('toggle-style-presets')"
        >
          <Sparkles class="h-3 w-3" />
          {{ stylePickerLabel }}
        </button>
        <button
          type="button"
          class="style-tool-chip"
          :disabled="!canEnhancePrompt"
          @click="emit('enhance-prompt')"
        >
          {{ t("aiPage.image.promptEnhance") }}
        </button>
        <button
          v-if="canUndoPromptEnhance"
          type="button"
          class="style-undo-chip"
          @click="emit('undo-prompt-enhance')"
        >
          {{ t("aiPage.image.promptEnhanceUndo") }}
        </button>
        <button
          v-if="selectedStylePrompt"
          type="button"
          class="style-clear-chip"
          @click="emit('clear-style-prompt')"
        >
          {{ t("aiPage.image.stylePresetClear") }}
        </button>
      </template>
    </div>
  </div>

  <div v-if="stylePromptPresets.length && stylePresetsExpanded" class="composer-presets" :aria-label="t('aiPage.image.stylePresetLabel')">
    <div class="composer-presets__head">
      <div class="composer-presets__title">
        <Sparkles class="h-3.5 w-3.5" />
        <span>{{ t("aiPage.image.stylePresetLabel") }}</span>
        <strong>{{ stylePresetCountLabel }}</strong>
      </div>
      <BaseSearchInput
        :model-value="stylePromptSearch"
        size="sm"
        surface="muted"
        class="composer-presets__search"
        :placeholder="t('aiPage.image.styleSearchPlaceholder')"
        search-on-input
        @update:model-value="updateStylePromptSearch"
      />
    </div>
    <div v-if="filteredStylePromptPresets.length" class="composer-presets__grid">
      <button
        v-for="preset in filteredStylePromptPresets"
        :key="preset.id"
        type="button"
        class="style-preset-chip"
        :class="{ 'style-preset-chip--active': preset.id === selectedStylePromptId }"
        :aria-pressed="preset.id === selectedStylePromptId"
        :title="preset.content"
        @click="emit('apply-style-prompt', preset)"
      >
        <span>{{ preset.title }}</span>
        <small>{{ getStylePromptSummary(preset) }}</small>
      </button>
    </div>
    <div v-else class="composer-presets__empty">
      {{ t("aiPage.image.styleSearchEmpty") }}
    </div>
  </div>

  <div v-if="promptStartersExpanded" class="composer-starters" :aria-label="t('aiPage.image.starterLabel')">
    <button
      v-for="starter in emptyPromptStarters"
      :key="starter.key"
      type="button"
      class="starter-preset-chip"
      :title="starter.prompt"
      @click="emit('apply-empty-prompt-starter', starter)"
    >
      <span>{{ starter.title }}</span>
      <small>{{ starter.sizeLabel }}</small>
    </button>
  </div>

  <div
    v-if="activeSizeNotice"
    class="composer-size-warning"
    role="status"
  >
    <AlertTriangle class="h-3.5 w-3.5" />
    <span>{{ activeSizeNotice }}</span>
  </div>

  <div v-if="draftMetaItems.length" class="composer-draft-bar">
    <div class="composer-draft-tags">
      <span v-for="item in draftMetaItems" :key="item">{{ item }}</span>
    </div>
    <button type="button" class="composer-draft-clear" @click="emit('clear-draft-prompt')">
      <XCircle class="h-3 w-3" />
      {{ t("aiPage.image.clearDraft") }}
    </button>
  </div>

  <div v-if="draftHasStyleSubjectPlaceholder" class="composer-subject-warning" role="status">
    <AlertTriangle class="h-3.5 w-3.5" />
    <span>{{ t("aiPage.image.subjectPlaceholderWarning") }}</span>
  </div>
</template>

<style scoped>
.composer-size-presets {
  @apply flex min-w-0 items-center justify-end gap-2 border-t border-slate-200 pt-1.5 dark:border-slate-800;
}
.composer-size-presets--tools-only {
  @apply justify-end;
}
.composer-tools {
  @apply flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1.5;
}
.composer-tools-divider {
  @apply h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700;
}
.style-toggle-chip {
  @apply inline-flex h-6 max-w-28 shrink-0 items-center justify-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-black text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:border-emerald-500 dark:hover:text-emerald-200;
}
.style-toggle-chip svg {
  @apply shrink-0;
}
.style-toggle-chip--active {
  @apply border-emerald-500 bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500 dark:border-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-100;
}
.starter-toggle-chip {
  @apply inline-flex h-6 max-w-24 shrink-0 items-center justify-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-2.5 text-[10px] font-black text-sky-700 shadow-sm transition hover:border-sky-400 hover:text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:border-sky-500 dark:hover:text-sky-200;
}
.starter-toggle-chip svg {
  @apply shrink-0;
}
.starter-toggle-chip--active {
  @apply border-sky-500 bg-sky-100 text-sky-800 ring-1 ring-sky-500 dark:border-sky-400 dark:bg-sky-950/50 dark:text-sky-100;
}
.composer-presets {
  @apply flex max-h-48 min-w-0 flex-col gap-2 overflow-hidden border-t border-slate-200 pt-2 dark:border-slate-800;
}
.composer-presets__head {
  @apply flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-2;
}
.composer-presets__title {
  @apply flex min-w-0 items-center gap-1.5 text-[11px] font-black text-emerald-700 dark:text-emerald-300;
}
.composer-presets__title svg {
  @apply shrink-0;
}
.composer-presets__title span {
  @apply shrink-0;
}
.composer-presets__title strong {
  @apply min-w-0 truncate rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200;
}
.composer-presets__search {
  @apply min-w-36 max-w-56 flex-1;
}
.composer-presets__grid {
  @apply grid min-h-0 flex-1 grid-cols-2 gap-1.5 overflow-y-auto pr-1;
  scrollbar-width: thin;
}
.composer-presets__empty {
  @apply rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-[11px] font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500;
}
.style-preset-chip {
  @apply flex min-h-11 min-w-0 flex-col items-start justify-center gap-0.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-emerald-400 dark:hover:bg-emerald-950/30;
}
.style-preset-chip span {
  @apply max-w-full truncate text-[11px] font-black text-slate-800 dark:text-slate-100;
}
.style-preset-chip small {
  @apply max-w-full truncate text-[10px] font-bold leading-4 text-slate-500 dark:text-slate-400;
}
.style-preset-chip--active {
  @apply border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 dark:border-emerald-400 dark:bg-emerald-950/40;
}
.style-preset-chip--active span {
  @apply text-emerald-800 dark:text-emerald-100;
}
.style-preset-chip--active small {
  @apply text-emerald-700 dark:text-emerald-200;
}
.composer-starters {
  @apply grid grid-cols-2 gap-1.5 border-t border-slate-200 pt-1.5 dark:border-slate-800;
}
.starter-preset-chip {
  @apply flex h-7 min-w-0 items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-3 text-left shadow-sm transition hover:border-sky-400 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-sky-500 dark:hover:bg-sky-950/30;
}
.starter-preset-chip span {
  @apply min-w-0 truncate text-[10px] font-black text-slate-700 dark:text-slate-200;
}
.starter-preset-chip small {
  @apply shrink-0 text-[10px] font-black text-sky-700 dark:text-sky-300;
}
.style-tool-chip,
.style-undo-chip,
.style-clear-chip {
  @apply inline-flex h-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-2.5 text-[10px] font-black text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-950 dark:hover:text-slate-100;
}
.style-tool-chip {
  @apply border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:border-emerald-500 dark:hover:text-emerald-200;
}
.style-tool-chip:disabled {
  @apply cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600 dark:hover:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-slate-600;
}
.style-undo-chip {
  @apply border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 hover:text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:border-amber-500 dark:hover:text-amber-200;
}
.composer-size-warning {
  @apply flex min-w-0 items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200;
}
.composer-size-warning svg {
  @apply mt-0.5 shrink-0;
}
.composer-size-warning span {
  @apply min-w-0 break-words;
}
.composer-draft-bar {
  @apply flex min-w-0 items-center justify-between gap-2 border-t border-slate-200 pt-1.5 dark:border-slate-800;
}
.composer-draft-tags {
  @apply flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto;
  scrollbar-width: thin;
}
.composer-draft-tags span {
  @apply inline-flex h-5 shrink-0 items-center rounded-full border border-slate-200 bg-white px-2 text-[10px] font-black text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300;
}
.composer-draft-clear {
  @apply inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-500 shadow-sm transition hover:border-rose-300 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-rose-700 dark:hover:text-rose-300;
}
.composer-draft-clear svg {
  @apply shrink-0;
}
.composer-subject-warning {
  @apply flex min-w-0 items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200;
}
.composer-subject-warning svg {
  @apply mt-0.5 shrink-0;
}
.composer-subject-warning span {
  @apply min-w-0 break-words;
}

@media (max-width: 1024px) {
  .composer-size-presets {
    @apply justify-start overflow-visible;
  }

  .composer-tools {
    @apply justify-start;
  }
}

@media (max-width: 520px) {
  .composer-presets__head {
    @apply flex-col items-stretch;
  }

  .composer-presets__search {
    @apply max-w-full;
  }

  .composer-presets__grid {
    @apply grid-cols-1 overflow-y-auto;
  }

  .composer-starters {
    @apply grid-cols-1;
  }

  .composer-size-presets {
    @apply justify-start overflow-visible;
  }

  .composer-tools {
    @apply justify-start;
  }

  .composer-draft-bar {
    @apply flex-col items-stretch;
  }

  .composer-draft-tags {
    @apply flex-wrap overflow-visible;
  }

  .composer-draft-clear {
    align-self: flex-end;
  }
}
</style>
