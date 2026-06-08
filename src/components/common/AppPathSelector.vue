<script setup lang="ts">
import { computed } from "vue";
import { FolderSearch2, FileSearch } from "lucide-vue-next";
import { useSystemStore } from "../../stores/system";
import { useToast } from "../../composables/useToast";
import { useI18n } from "../../composables/useI18n";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    type?: "folder" | "file";
  }>(),
  {
    placeholder: "",
    type: "folder",
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", val: string): void;
}>();

const { triggerToast } = useToast();
const { t } = useI18n();
const systemStore = useSystemStore();
const inputLabel = computed(() => props.placeholder || t("common.pathSelector.placeholder"));
const selectLabel = computed(() => props.type === "folder" ? t("common.pathSelector.selectFolder") : t("common.pathSelector.selectFile"));

async function handleSelect() {
  if (!systemStore.isDesktopRuntime) {
    triggerToast(t("common.pathSelector.browserTip"), "warning");
    return;
  }

  try {
    const selected = await systemStore.selectPath(props.type);
    if (selected) {
      emit("update:modelValue", selected);
    }
  } catch (err) {
    triggerToast(
      err instanceof Error ? err.message : t("common.pathSelector.failed"),
      "error"
    );
  }
}
</script>

<template>
  <div class="flex gap-2 w-full">
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder || t('common.pathSelector.placeholder')"
      :aria-label="inputLabel"
      class="workbench-input h-10 flex-1 text-xs font-mono"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      class="workbench-btn border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 h-10 px-3.5 text-xs font-bold shrink-0 shadow-sm flex items-center gap-1.5"
      type="button"
      :aria-label="selectLabel"
      :title="selectLabel"
      @click="handleSelect"
    >
      <FolderSearch2 v-if="type === 'folder'" class="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
      <FileSearch v-else class="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
      <span>{{ t('common.pathSelector.select') }}</span>
    </button>
  </div>
</template>
