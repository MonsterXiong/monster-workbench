<script setup lang="ts">
import { computed } from "vue";
import { FolderSearch2, FileSearch } from "lucide-vue-next";
import { useSystemStore } from "../../stores/system";
import { useToast } from "../../composables/useToast";
import { useI18n } from "../../composables/useI18n";
import { getErrorMessage } from "../../utils";

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
const resolvedPlaceholder = computed(() => props.placeholder || t("common.pathSelector.placeholder"));

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
      getErrorMessage(err, t("common.pathSelector.failed")),
      "error"
    );
  }
}
</script>

<template>
  <div class="app-path-selector">
    <el-input
      class="app-path-selector__input"
      :model-value="modelValue"
      :placeholder="resolvedPlaceholder"
      :aria-label="inputLabel"
      clearable
      @update:model-value="emit('update:modelValue', String($event))"
    >
      <template #append>
        <el-button
          class="app-path-selector__button"
          type="default"
          :aria-label="selectLabel"
          :title="selectLabel"
          @click="handleSelect"
        >
          <FolderSearch2 v-if="type === 'folder'" class="app-path-selector__icon" aria-hidden="true" />
          <FileSearch v-else class="app-path-selector__icon" aria-hidden="true" />
          <span>{{ t('common.pathSelector.select') }}</span>
        </el-button>
      </template>
    </el-input>
  </div>
</template>

<style scoped>
.app-path-selector {
  @apply w-full min-w-0;
}

.app-path-selector__input {
  @apply w-full min-w-0 font-mono text-xs;
}

.app-path-selector__input :deep(.el-input__wrapper) {
  @apply min-w-0 bg-white shadow-sm transition dark:bg-slate-900;
}

.app-path-selector__input :deep(.el-input__inner) {
  @apply min-w-0 font-mono text-xs;
}

.app-path-selector__input :deep(.el-input-group__append) {
  @apply bg-white p-0 shadow-sm dark:bg-slate-800;
}

.app-path-selector__button {
  @apply h-10 shrink-0 rounded-none border-0 px-3.5 text-xs font-bold text-slate-700 shadow-none dark:text-slate-300;
}

.app-path-selector__button :deep(span) {
  @apply flex min-w-0 items-center gap-1.5;
}

.app-path-selector__icon {
  @apply h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400;
}
</style>
