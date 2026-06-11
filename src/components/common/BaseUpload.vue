<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, useSlots, watchEffect } from "vue";
import type { UploadFile, UploadFiles, UploadInstance } from "element-plus";
import { useI18n } from "../../composables/useI18n";
import BaseIcon from "./BaseIcon.vue";
import {
  formatBytes,
  formatTemplate,
  buildAcceptString,
  getNativeAcceptValue,
  hasDragEventFiles,
  hasFiles,
  isAcceptAll,
  isRelatedTargetInsideCurrentTarget,
  joinAriaIds,
  joinTextList,
  validateFileList,
  type FileValidationRejectReason,
} from "../../utils";

type UploadSize = "sm" | "md" | "lg";

interface UploadRejectPayload {
  reason: FileValidationRejectReason;
  files: File[];
}

interface Props {
  id?: string;
  name?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  loading?: boolean;
  active?: boolean;
  loadingText?: string;
  error?: boolean;
  errorText?: string;
  success?: boolean;
  successText?: string;
  title?: string;
  description?: string;
  helper?: string;
  icon?: string;
  compact?: boolean;
  size?: UploadSize;
  maxFiles?: number;
  maxSize?: number;
  showHelper?: boolean;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
}

const props = withDefaults(defineProps<Props>(), {
  id: "",
  name: "",
  accept: "*",
  multiple: false,
  disabled: false,
  loading: false,
  active: false,
  loadingText: "",
  error: false,
  errorText: "",
  success: false,
  successText: "",
  title: "",
  description: "",
  helper: "",
  icon: "UploadCloud",
  compact: false,
  size: "md",
  maxFiles: 0,
  maxSize: 0,
  showHelper: true,
  ariaLabel: "",
  ariaLabelledby: "",
  ariaDescribedby: "",
});

const emit = defineEmits<{
  (e: "select", files: FileList): void;
  (e: "reject", payload: UploadRejectPayload): void;
}>();

type UploadRef = (UploadInstance & { $el?: Element | null }) | null;

const isDragActive = ref(false);
const uploadRef = ref<UploadRef>(null);

const { t } = useI18n();
const slots = useSlots();
const uploadId = useId();
const rootId = computed(() => props.id || `base-upload-${uploadId}`);
const titleId = computed(() => `${rootId.value}-title`);
const descriptionId = `base-upload-description-${uploadId}`;
const helperId = `base-upload-helper-${uploadId}`;
const statusId = `base-upload-status-${uploadId}`;
const isLocked = computed(() => props.disabled || props.loading);
const isActive = computed(() => !isLocked.value && (props.active || isDragActive.value));
const titleText = computed(() => props.title || t("common.uploader.dragTip"));
const descriptionText = computed(() => props.description || t("common.uploader.dragSubTip"));
const loadingText = computed(() => props.loadingText || t("common.uploader.uploading"));
const statusText = computed(() => {
  if (props.error && props.errorText) return props.errorText;
  if (props.success && props.successText) return props.successText;
  if (props.loading) return loadingText.value;
  return "";
});
const acceptText = computed(() => buildAcceptString(props.accept));
const effectiveMaxFiles = computed(() => (props.multiple ? props.maxFiles : 1));
const visibleMaxFiles = computed(() => (props.multiple || props.maxFiles > 0 ? effectiveMaxFiles.value : 0));
const constraintsText = computed(() => {
  const constraints: string[] = [];
  if (!isAcceptAll(props.accept) && acceptText.value) constraints.push(acceptText.value);
  if (visibleMaxFiles.value > 0) constraints.push(formatTemplate(t("common.uploader.maxFiles"), { count: visibleMaxFiles.value }));
  if (props.maxSize > 0) constraints.push(formatTemplate(t("common.uploader.maxSize"), { size: formatBytes(props.maxSize) }));
  return joinTextList(constraints, " · ");
});
const helperText = computed(() => props.helper || constraintsText.value);
const hasDescription = computed(() => Boolean(descriptionText.value));
const hasHelper = computed(() => Boolean(props.showHelper && helperText.value));
const hasDescriptionContent = computed(() => hasDescription.value || Boolean(slots.description));
const hasHelperContent = computed(() => hasHelper.value || Boolean(slots.helper));
const hasStatusContent = computed(() => Boolean(statusText.value || slots.status));
const describedBy = computed(() =>
  joinAriaIds([
    hasDescriptionContent.value ? descriptionId : undefined,
    hasHelperContent.value ? helperId : undefined,
    hasStatusContent.value ? statusId : undefined,
    props.ariaDescribedby,
  ])
);
const rootLabel = computed(() => (props.ariaLabelledby ? "" : props.ariaLabel));
const rootLabelledby = computed(() => props.ariaLabelledby || (rootLabel.value ? "" : titleId.value));
const inputAccept = computed(() => getNativeAcceptValue(props.accept));
const uploadName = computed(() => props.name || "file");
const iconSize = computed(() => {
  if (props.compact || props.size === "sm") return 24;
  if (props.size === "lg") return 36;
  return 32;
});

let pendingFiles: File[] = [];
let pendingFlushTimer: number | null = null;

const setOptionalAttribute = (element: HTMLElement, name: string, value?: string | null) => {
  if (value) {
    element.setAttribute(name, value);
    return;
  }
  element.removeAttribute(name);
};

const getUploadElement = () => {
  const root = uploadRef.value?.$el;
  return root instanceof HTMLElement ? root.querySelector<HTMLElement>(".el-upload") : null;
};

const syncUploadAria = async () => {
  await nextTick();
  const uploadElement = getUploadElement();
  if (!uploadElement) return;

  setOptionalAttribute(uploadElement, "aria-label", rootLabel.value);
  setOptionalAttribute(uploadElement, "aria-labelledby", rootLabelledby.value);
  setOptionalAttribute(uploadElement, "aria-describedby", describedBy.value);
  setOptionalAttribute(uploadElement, "aria-invalid", props.error ? "true" : undefined);
  setOptionalAttribute(uploadElement, "aria-busy", props.loading ? "true" : undefined);
};

const rejectFiles = (reason: FileValidationRejectReason, files: File[]) => {
  emit("reject", { reason, files });
};

const validateFiles = (files: FileList) => {
  const result = validateFileList(files, {
    accept: props.accept,
    maxFiles: effectiveMaxFiles.value,
    maxSize: props.maxSize,
    multiple: props.multiple,
  });

  if (!result.valid) {
    if (result.reason) {
      rejectFiles(result.reason, result.rejectedFiles);
    }
    return false;
  }

  return true;
};

const handleFiles = (files: FileList) => {
  if (isLocked.value || !validateFiles(files)) return;
  emit("select", files);
};

const createFileList = (files: File[]) => {
  if (typeof DataTransfer === "undefined") {
    return files as unknown as FileList;
  }

  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  return transfer.files;
};

const flushPendingFiles = () => {
  pendingFlushTimer = null;
  const files = createFileList(pendingFiles);
  pendingFiles = [];
  isDragActive.value = false;

  if (hasFiles(files)) {
    handleFiles(files);
  }

  uploadRef.value?.clearFiles();
};

const scheduleFileFlush = (files: File[]) => {
  pendingFiles = files;
  if (pendingFlushTimer !== null) {
    window.clearTimeout(pendingFlushTimer);
  }
  pendingFlushTimer = window.setTimeout(flushPendingFiles, 0);
};

const getRawFiles = (uploadFiles: UploadFiles) => uploadFiles.flatMap((file) => (file.raw ? [file.raw] : []));

const onUploadChange = (_file: UploadFile, uploadFiles: UploadFiles) => {
  if (isLocked.value) {
    uploadRef.value?.clearFiles();
    return;
  }

  scheduleFileFlush(getRawFiles(uploadFiles));
};

const onDragOver = (e: DragEvent) => {
  if (!hasDragEventFiles(e)) {
    isDragActive.value = false;
    return;
  }

  e.preventDefault();
  if (isLocked.value) {
    isDragActive.value = false;
    return;
  }
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "copy";
  }
  isDragActive.value = true;
};

const onDragEnter = (e: DragEvent) => {
  if (!hasDragEventFiles(e)) {
    isDragActive.value = false;
    return;
  }

  e.preventDefault();
  if (!isLocked.value) {
    isDragActive.value = true;
  }
};

const onDragLeave = (e: DragEvent) => {
  if (isRelatedTargetInsideCurrentTarget(e)) return;
  isDragActive.value = false;
};

const onDragEnd = () => {
  isDragActive.value = false;
};

const onDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragActive.value = false;
};

watchEffect(() => {
  void rootLabel.value;
  void rootLabelledby.value;
  void describedBy.value;
  void props.error;
  void props.loading;
  void syncUploadAria();
});

onBeforeUnmount(() => {
  if (pendingFlushTimer !== null) {
    window.clearTimeout(pendingFlushTimer);
    pendingFlushTimer = null;
  }
});
</script>

<template>
  <el-upload
    :id="rootId"
    ref="uploadRef"
    class="base-upload"
    :class="{
      'base-upload--active': isActive,
      'base-upload--disabled': disabled,
      'base-upload--loading': loading,
      'base-upload--error': error,
      'base-upload--success': success && !error,
      'base-upload--compact': compact,
      [`base-upload--${size}`]: true,
    }"
    action="#"
    :auto-upload="false"
    :show-file-list="false"
    :drag="true"
    :accept="inputAccept"
    :multiple="multiple"
    :name="uploadName"
    :disabled="isLocked"
    :aria-disabled="isLocked ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :aria-invalid="error ? 'true' : undefined"
    :aria-label="rootLabel || undefined"
    :aria-labelledby="rootLabelledby || undefined"
    :aria-describedby="describedBy || undefined"
    :on-change="onUploadChange"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @dragend="onDragEnd"
    @drop="onDrop"
  >
    <div class="base-upload__surface">
      <div class="base-upload__icon">
        <slot name="icon" :loading="loading">
          <BaseIcon :name="loading ? 'LoaderCircle' : icon" :size="iconSize" aria-hidden="true" />
        </slot>
      </div>
      <span :id="titleId" class="base-upload__title">
        <slot name="title">
          {{ titleText }}
        </slot>
      </span>
      <span v-if="hasDescriptionContent" :id="descriptionId" class="base-upload__description">
        <slot name="description">
          {{ descriptionText }}
        </slot>
      </span>
      <span v-if="hasHelperContent" :id="helperId" class="base-upload__helper">
        <slot name="helper" :helper="helperText">
          {{ helperText }}
        </slot>
      </span>
      <span
        v-if="hasStatusContent"
        :id="statusId"
        class="base-upload__status"
        :class="{
          'base-upload__status--error': error,
          'base-upload__status--success': success && !error,
          'base-upload__status--loading': loading,
        }"
        role="status"
        aria-live="polite"
      >
        <slot name="status" :status="statusText">
          {{ statusText }}
        </slot>
      </span>
    </div>
  </el-upload>
</template>

<style scoped>
.base-upload {
  @apply block w-full min-w-0;
}

.base-upload :deep(.el-upload) {
  @apply block w-full min-w-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-20;
}

.base-upload :deep(.el-upload-dragger) {
  @apply w-full rounded-2xl border-0 bg-transparent p-0;
}

.base-upload__surface {
  @apply flex w-full select-none flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-6 text-center shadow-sm transition duration-200 dark:border-slate-800 dark:bg-slate-900;
}

.base-upload:not(.base-upload--disabled):not(.base-upload--loading):not(.base-upload--error):not(.base-upload--success):hover .base-upload__surface,
.base-upload :deep(.el-upload-dragger.is-dragover) .base-upload__surface {
  border-color: rgb(var(--color-primary) / 0.45);
  background-color: rgb(var(--color-primary) / 0.04);
  @apply shadow-md;
}

.base-upload:not(.base-upload--disabled):not(.base-upload--loading) {
  @apply cursor-pointer;
}

.base-upload--compact {
  @apply rounded-xl;
}

.base-upload--compact .base-upload__surface {
  @apply px-4 py-4;
}

.base-upload--sm :deep(.el-upload),
.base-upload--sm :deep(.el-upload-dragger) {
  @apply rounded-xl;
}

.base-upload--sm .base-upload__surface {
  @apply rounded-xl px-4 py-4;
}

.base-upload--lg .base-upload__surface {
  @apply px-7 py-8;
}

.base-upload--active .base-upload__surface,
.base-upload :deep(.el-upload-dragger.is-dragover) .base-upload__surface {
  @apply scale-[0.99] border-primary bg-white text-primary dark:bg-slate-950;
}

.base-upload--disabled,
.base-upload--loading {
  @apply cursor-not-allowed opacity-60;
}

.base-upload--error .base-upload__surface {
  @apply border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950;
}

.base-upload--error :deep(.el-upload:focus),
.base-upload--error :deep(.el-upload:focus-visible) {
  @apply ring-red-200 dark:ring-red-900;
}

.base-upload--success .base-upload__surface {
  @apply border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950;
}

.base-upload--success :deep(.el-upload:focus),
.base-upload--success :deep(.el-upload:focus-visible) {
  @apply ring-emerald-200 dark:ring-emerald-900;
}

.base-upload__icon {
  @apply mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500;
}

.base-upload--sm .base-upload__icon,
.base-upload--compact .base-upload__icon {
  @apply h-11 w-11 rounded-xl;
}

.base-upload--lg .base-upload__icon {
  @apply h-16 w-16;
}

.base-upload--active .base-upload__icon {
  @apply border-primary text-primary;
}

.base-upload--error .base-upload__icon {
  @apply border-red-200 text-red-500 dark:border-red-900 dark:text-red-300;
}

.base-upload--success .base-upload__icon {
  @apply border-emerald-200 text-emerald-600 dark:border-emerald-900 dark:text-emerald-300;
}

.base-upload--loading .base-upload__icon {
  color: rgb(var(--color-primary));
}

.base-upload--loading .base-upload__icon :deep(svg) {
  animation: base-upload-spin 0.9s linear infinite;
}

.base-upload__title {
  @apply max-w-full break-words text-sm font-black text-slate-800 dark:text-slate-100;
  overflow-wrap: anywhere;
}

.base-upload--lg .base-upload__title {
  @apply text-base;
}

.base-upload__description {
  @apply mt-1 max-w-full break-words text-xs font-medium leading-5 text-slate-500 dark:text-slate-400;
  overflow-wrap: anywhere;
}

.base-upload__helper {
  @apply mt-2 inline-flex max-w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] font-black leading-4 text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500;
  overflow-wrap: anywhere;
}

.base-upload__status {
  @apply mt-2 inline-flex max-w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] font-black leading-4 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400;
  overflow-wrap: anywhere;
}

.base-upload__status--error {
  @apply border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300;
}

.base-upload__status--success {
  @apply border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300;
}

.base-upload__status--loading {
  color: rgb(var(--color-primary));
}

@media (prefers-reduced-motion: reduce) {
  .base-upload__surface,
  .base-upload__icon :deep(svg) {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes base-upload-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
