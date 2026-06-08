<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { Check, FilePenLine, Plus, ScrollText, Sparkles, Trash2 } from "lucide-vue-next";
import { useAiStore } from "../../../stores/ai";
import { useI18n } from "../../../composables/useI18n";
import { useToast } from "../../../composables/useToast";
import { findByValue, hasByValue, mapToMap } from "../../../utils";
import type { AiPromptItem, AiPromptType } from "../../../types/ai";

const aiStore = useAiStore();
const { t } = useI18n();
const { triggerToast } = useToast();

const activeType = ref<AiPromptType>("chat");
const filterCategoryId = ref("");
const dialogVisible = ref(false);
const editingId = ref("");
const selectedPromptId = ref("");
const draft = reactive({
  title: "",
  categoryId: "",
  newCategoryName: "",
  content: "",
});

const emit = defineEmits<{
  (e: "use", type: AiPromptType): void;
}>();

const typeOptions = computed(() =>
  aiStore.promptTypeOptions.map((option) => ({
    ...option,
    label: t(option.value === "image" ? "aiPage.prompts.typeImage" : "aiPage.prompts.typeChat"),
  }))
);
const categoryOptions = computed(() => aiStore.getPromptCategoryOptions(activeType.value));
const filterCategoryOptions = computed(() => [
  { label: t("aiPage.prompts.allCategories"), value: "" },
  ...categoryOptions.value,
]);
const prompts = computed(() => aiStore.getPrompts(activeType.value, filterCategoryId.value));
const categoryNameMap = computed(() => mapToMap(aiStore.promptLibrary.categories, (item) => item.id, (item) => item.name));
const dialogTitle = computed(() => (editingId.value ? t("aiPage.prompts.editDialog") : t("aiPage.prompts.createDialog")));
const selectedPrompt = computed(() => findByValue(prompts.value, (prompt) => prompt.id, selectedPromptId.value) ?? prompts.value[0] ?? null);

watch(activeType, () => {
  filterCategoryId.value = "";
  resetDraft();
});

watch(
  prompts,
  (items) => {
    if (!hasByValue(items, (prompt) => prompt.id, selectedPromptId.value)) {
      selectedPromptId.value = items[0]?.id || "";
    }
  },
  { immediate: true }
);

function setActiveType(value: string | number) {
  activeType.value = value === "image" ? "image" : "chat";
}

function resetDraft() {
  editingId.value = "";
  draft.title = "";
  draft.content = "";
  draft.newCategoryName = "";
  draft.categoryId = categoryOptions.value[0]?.value || "";
}

function openCreate() {
  resetDraft();
  dialogVisible.value = true;
}

function openEdit(prompt: AiPromptItem) {
  activeType.value = prompt.type;
  editingId.value = prompt.id;
  draft.title = prompt.title;
  draft.content = prompt.content;
  draft.categoryId = prompt.categoryId;
  draft.newCategoryName = "";
  dialogVisible.value = true;
}

async function savePrompt() {
  try {
    await aiStore.savePrompt({
      id: editingId.value || undefined,
      type: activeType.value,
      categoryId: draft.categoryId,
      categoryName: draft.newCategoryName,
      title: draft.title,
      content: draft.content,
    });
    triggerToast(t(editingId.value ? "aiPage.prompts.updated" : "aiPage.prompts.created"), "success");
    dialogVisible.value = false;
    resetDraft();
  } catch (err) {
    triggerToast(err instanceof Error ? err.message : t("aiPage.prompts.saveFailed"), "error");
  }
}

async function deletePrompt(promptId: string) {
  try {
    await aiStore.deletePrompt(promptId);
    triggerToast(t("aiPage.prompts.deleted"), "success");
  } catch (err) {
    triggerToast(err instanceof Error ? err.message : t("aiPage.prompts.deleteFailed"), "error");
  }
}

async function usePrompt(promptId: string) {
  try {
    const prompt = await aiStore.applyPrompt(promptId);
    triggerToast(t("aiPage.prompts.applied"), "success");
    emit("use", prompt.type);
  } catch (err) {
    triggerToast(err instanceof Error ? err.message : t("aiPage.prompts.applyFailed"), "error");
  }
}
</script>

<template>
  <section class="prompt-panel">
    <aside class="prompt-sidebar">
      <div class="prompt-sidebar__top">
        <BaseSegmented :model-value="activeType" :options="typeOptions" size="sm" @update:model-value="setActiveType" />
        <button type="button" class="prompt-add" @click="openCreate">
          <Plus class="h-4 w-4" />
        </button>
      </div>
      <BaseSelect
        v-model="filterCategoryId"
        :options="filterCategoryOptions"
        size="sm"
        :placeholder="t('aiPage.prompts.categoryFilter')"
      />

      <div class="prompt-list">
        <button
          v-for="prompt in prompts"
          :key="prompt.id"
          type="button"
          class="prompt-list-item"
          :class="{ 'prompt-list-item--active': selectedPrompt?.id === prompt.id }"
          @click="selectedPromptId = prompt.id"
        >
          <span class="prompt-list-item__title">{{ prompt.title }}</span>
          <span class="prompt-list-item__meta">
            {{ categoryNameMap.get(prompt.categoryId) || t("aiPage.prompts.uncategorized") }}
          </span>
          <span class="prompt-list-item__content">{{ prompt.content }}</span>
        </button>
        <div v-if="!prompts.length" class="prompt-empty">{{ t("aiPage.prompts.empty") }}</div>
      </div>
    </aside>

    <section class="prompt-detail">
      <template v-if="selectedPrompt">
        <header class="prompt-detail__header">
          <div class="prompt-detail__icon">
            <Sparkles v-if="selectedPrompt.type === 'image'" class="h-4.5 w-4.5" />
            <ScrollText v-else class="h-4.5 w-4.5" />
          </div>
          <div class="min-w-0 flex-1">
            <h3>{{ selectedPrompt.title }}</h3>
            <p>{{ categoryNameMap.get(selectedPrompt.categoryId) || t("aiPage.prompts.uncategorized") }}</p>
          </div>
          <span class="type-chip">
            {{ selectedPrompt.type === "image" ? t("aiPage.prompts.typeImage") : t("aiPage.prompts.typeChat") }}
          </span>
        </header>

        <div class="prompt-detail__content">
          <pre>{{ selectedPrompt.content }}</pre>
        </div>

        <footer class="prompt-detail__actions">
          <BaseButton type="neutral" outline size="sm" @click="openEdit(selectedPrompt)">
            <template #icon><FilePenLine class="h-3.5 w-3.5" /></template>
            {{ t("aiPage.prompts.update") }}
          </BaseButton>
          <BaseButton type="danger" outline size="sm" @click="deletePrompt(selectedPrompt.id)">
            <template #icon><Trash2 class="h-3.5 w-3.5" /></template>
            {{ t("common.delete") }}
          </BaseButton>
          <BaseButton type="primary" size="sm" @click="usePrompt(selectedPrompt.id)">
            <template #icon><Check class="h-3.5 w-3.5" /></template>
            {{ t("aiPage.prompts.apply") }}
          </BaseButton>
        </footer>
      </template>
      <div v-else class="prompt-detail-empty">
        {{ t("aiPage.prompts.empty") }}
      </div>
    </section>

    <BaseDialog v-model="dialogVisible" :title="dialogTitle" width="720px" @close="resetDraft">
      <div class="dialog-form">
        <div class="dialog-grid">
          <label class="field-block">
            <span class="field-label">{{ t("aiPage.prompts.titleLabel") }}</span>
            <BaseInput v-model="draft.title" :placeholder="t('aiPage.prompts.titlePlaceholder')" clearable />
          </label>

          <label class="field-block">
            <span class="field-label">{{ t("aiPage.prompts.categoryLabel") }}</span>
            <BaseSelect v-model="draft.categoryId" :options="categoryOptions" :placeholder="t('aiPage.prompts.categoryPlaceholder')" />
          </label>

          <label class="field-block xl:col-span-2">
            <span class="field-label">{{ t("aiPage.prompts.newCategoryLabel") }}</span>
            <BaseInput v-model="draft.newCategoryName" :placeholder="t('aiPage.prompts.newCategoryPlaceholder')" clearable />
          </label>

          <label class="field-block xl:col-span-2">
            <span class="field-label">{{ t("aiPage.prompts.contentLabel") }}</span>
            <BaseTextarea
              v-model="draft.content"
              :rows="9"
              :maxlength="8000"
              :placeholder="t('aiPage.prompts.contentPlaceholder')"
            />
          </label>
        </div>
      </div>
      <template #footer>
        <BaseButton type="neutral" outline size="sm" @click="dialogVisible = false">
          {{ t("common.cancel") }}
        </BaseButton>
        <BaseButton type="primary" size="sm" @click="savePrompt">
          {{ editingId ? t("aiPage.prompts.update") : t("aiPage.prompts.save") }}
        </BaseButton>
      </template>
    </BaseDialog>
  </section>
</template>

<style scoped>
.prompt-panel {
  @apply grid min-h-full grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)];
}
.prompt-sidebar {
  @apply flex min-h-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30;
}
.prompt-sidebar__top {
  @apply flex items-center gap-2;
}
.prompt-sidebar__top :deep(.base-segmented) {
  @apply min-w-0 flex-1;
}
.prompt-add {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-violet-500 hover:text-violet-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400;
}
.prompt-list {
  @apply flex min-h-0 flex-1 flex-col gap-2 overflow-auto pr-1;
}
.prompt-list-item {
  @apply flex min-h-20 flex-col gap-1 rounded-xl border border-transparent bg-white px-3 py-2 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:hover:border-slate-800 dark:hover:bg-slate-900;
}
.prompt-list-item--active {
  @apply border-violet-500 bg-violet-50 text-violet-700 shadow-sm dark:bg-violet-500/10 dark:text-violet-300;
}
.prompt-list-item__title {
  @apply truncate text-xs font-black text-slate-800 dark:text-slate-100;
}
.prompt-list-item__meta {
  @apply truncate text-[10px] font-bold text-slate-500 dark:text-slate-400;
}
.prompt-list-item__content {
  @apply line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400;
}
.prompt-detail {
  @apply flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950;
}
.prompt-detail__header {
  @apply flex shrink-0 items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800;
}
.prompt-detail__icon {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300;
}
.prompt-detail__header h3 {
  @apply truncate text-sm font-black text-slate-800 dark:text-slate-100;
}
.prompt-detail__header p {
  @apply mt-0.5 truncate text-[11px] font-bold text-slate-500 dark:text-slate-400;
}
.type-chip {
  @apply shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400;
}
.prompt-detail__content {
  @apply min-h-0 flex-1 overflow-auto bg-slate-50/70 p-4 dark:bg-slate-900/40;
}
.prompt-detail__content pre {
  @apply min-h-full whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-white p-4 text-[13px] font-medium leading-7 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200;
}
.prompt-detail__actions {
  @apply flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950;
}
.prompt-empty {
  @apply flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-[11px] font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500;
}
.prompt-detail-empty {
  @apply flex min-h-full items-center justify-center text-[12px] font-bold text-slate-400 dark:text-slate-500;
}
.dialog-form {
  @apply p-1;
}
.dialog-grid {
  @apply grid grid-cols-1 gap-3 xl:grid-cols-2;
}
.field-block {
  @apply flex flex-col gap-1.5;
}
.field-label {
  @apply flex items-center gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-300;
}
</style>
