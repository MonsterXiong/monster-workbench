<script setup lang="ts">
import { computed, ref } from "vue";
import BaseIcon from "./BaseIcon.vue";
import { createRandomId, joinAriaIds } from "../../utils";

interface Props {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  title?: string;
  description?: string;
  helper?: string;
  icon?: string;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  accept: "*",
  multiple: false,
  disabled: false,
  title: "",
  description: "",
  helper: "",
  icon: "UploadCloud",
  compact: false,
});

const emit = defineEmits<{
  (e: "select", files: FileList): void;
}>();

const isDragActive = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

import { useI18n } from "../../composables/useI18n";
const { t } = useI18n();
const uploadId = createRandomId("");
const descriptionId = `base-upload-description-${uploadId}`;
const helperId = `base-upload-helper-${uploadId}`;
const titleText = computed(() => props.title || t("common.uploader.dragTip"));
const descriptionText = computed(() => props.description || t("common.uploader.dragSubTip"));
const helperText = computed(() => props.helper || (props.accept !== "*" ? props.accept : ""));
const describedBy = computed(() => joinAriaIds([descriptionId, helperText.value ? helperId : undefined]));

const triggerSelect = () => {
  if (props.disabled) return;
  fileInputRef.value?.click();
};

const onFileChanged = (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  if (files && files.length > 0) {
    emit("select", files);
    (e.target as HTMLInputElement).value = "";
  }
};

const onDragOver = (e: DragEvent) => {
  if (props.disabled) return;
  e.preventDefault();
  isDragActive.value = true;
};

const onDragLeave = () => {
  isDragActive.value = false;
};

const onDrop = (e: DragEvent) => {
  if (props.disabled) return;
  e.preventDefault();
  isDragActive.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    emit("select", files);
  }
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    triggerSelect();
  }
};
</script>

<template>
  <div
    class="base-upload"
    :class="{
      'base-upload--active': isDragActive,
      'base-upload--disabled': disabled,
      'base-upload--compact': compact,
    }"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled"
    :aria-label="titleText"
    :aria-describedby="describedBy"
    @click="triggerSelect"
    @keydown="onKeydown"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      @change="onFileChanged"
    />
    <div class="base-upload__icon">
      <BaseIcon :name="icon" :size="compact ? 24 : 32" aria-hidden="true" />
    </div>
    <span class="base-upload__title">
      {{ titleText }}
    </span>
    <span :id="descriptionId" class="base-upload__description">
      {{ descriptionText }}
    </span>
    <span v-if="helperText" :id="helperId" class="base-upload__helper">
      {{ helperText }}
    </span>
  </div>
</template>

<style scoped>
.base-upload {
  @apply flex w-full select-none flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-6 text-center shadow-sm transition duration-200 hover:border-slate-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-20 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-950;
}

.base-upload:not(.base-upload--disabled) {
  @apply cursor-pointer;
}

.base-upload--compact {
  @apply px-4 py-4;
}

.base-upload--active {
  @apply scale-[0.99] border-primary bg-white text-primary dark:bg-slate-950;
}

.base-upload--disabled {
  @apply cursor-not-allowed opacity-60;
}

.base-upload__icon {
  @apply mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500;
}

.base-upload--compact .base-upload__icon {
  @apply h-11 w-11 rounded-xl;
}

.base-upload--active .base-upload__icon {
  @apply border-primary text-primary;
}

.base-upload__title {
  @apply text-sm font-black text-slate-800 dark:text-slate-100;
}

.base-upload__description {
  @apply mt-1 max-w-sm text-xs font-medium leading-5 text-slate-500 dark:text-slate-400;
}

.base-upload__helper {
  @apply mt-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500;
}
</style>
