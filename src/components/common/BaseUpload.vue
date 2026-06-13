<script setup lang="ts">
import type { StyleValue } from "vue";
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, useId, useSlots, watchEffect } from "vue";
import type {
  Crossorigin,
  ListType,
  UploadData,
  UploadFile,
  UploadFiles,
  UploadHooks,
  UploadInstance,
  UploadProgressEvent,
  UploadRawFile,
  UploadRequestHandler,
  UploadStatus,
  UploadUserFile,
} from "element-plus";
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
  omit,
  validateFileList,
  type FileValidationRejectReason,
} from "../../utils";
import { getElementPlusControlRoot } from "./elementPlusDom";

defineOptions({
  inheritAttrs: false,
});

type UploadSize = "sm" | "md" | "lg";

interface UploadRejectPayload {
  reason: FileValidationRejectReason;
  files: File[];
}

interface Props {
  id?: string;
  action?: string;
  method?: string;
  headers?: Headers | Record<string, unknown>;
  data?: UploadData | Promise<UploadData> | ((rawFile: UploadRawFile) => UploadData | Promise<UploadData>);
  withCredentials?: boolean;
  autoUpload?: boolean;
  httpRequest?: UploadRequestHandler;
  beforeUpload?: UploadHooks["beforeUpload"];
  beforeRemove?: UploadHooks["beforeRemove"];
  crossorigin?: Crossorigin;
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
  drag?: boolean;
  showFileList?: boolean;
  listType?: ListType;
  fileList?: UploadUserFile[];
  limit?: number;
  directory?: boolean;
  clearAfterSelect?: boolean;
  showHelper?: boolean;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
}

const props = withDefaults(defineProps<Props>(), {
  id: "",
  action: "#",
  method: "post",
  headers: undefined,
  data: undefined,
  withCredentials: false,
  autoUpload: false,
  httpRequest: undefined,
  beforeUpload: undefined,
  beforeRemove: undefined,
  crossorigin: "",
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
  drag: true,
  showFileList: false,
  listType: "text",
  fileList: () => [],
  limit: 0,
  directory: false,
  showHelper: true,
  ariaLabel: "",
  ariaLabelledby: "",
  ariaDescribedby: "",
});

const emit = defineEmits<{
  (e: "update:fileList", files: UploadUserFile[]): void;
  (e: "select", files: FileList): void;
  (e: "reject", payload: UploadRejectPayload): void;
  (e: "change", file: UploadFile, files: UploadFiles): void;
  (e: "preview", file: UploadFile): void;
  (e: "remove", file: UploadFile, files: UploadFiles): void;
  (e: "exceed", files: File[], uploadFiles: UploadUserFile[]): void;
  (e: "progress", event: UploadProgressEvent, file: UploadFile, files: UploadFiles): void;
  (e: "success", response: unknown, file: UploadFile, files: UploadFiles): void;
  (e: "error", error: Error, file: UploadFile, files: UploadFiles): void;
}>();

const attrs = useAttrs();
const isDragActive = ref(false);
const uploadRef = ref<UploadInstance | null>(null);

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
const effectiveMaxFiles = computed(() => {
  if (!props.multiple) return 1;
  if (props.maxFiles > 0) return props.maxFiles;
  return props.limit > 0 ? props.limit : 0;
});
const elementLimit = computed(() => (props.limit > 0 ? props.limit : effectiveMaxFiles.value));
const shouldClearFiles = computed(() => props.clearAfterSelect ?? (!props.showFileList && !props.autoUpload));
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
const rootClass = computed(() => attrs.class);
const rootStyle = computed(() => attrs.style as StyleValue | undefined);
const uploadPassthroughAttrs = computed(() =>
  omit(attrs, ["class", "style", "aria-label", "aria-labelledby", "aria-describedby", "aria-busy", "aria-disabled", "aria-invalid"])
);

let pendingFiles: File[] = [];
let pendingUploadFiles: UploadFiles = [];
let pendingFlushTimer: number | null = null;
const transientUploadStates: UploadStatus[] = ["ready", "fail"];

const setOptionalAttribute = (element: HTMLElement, name: string, value?: string | null) => {
  if (value) {
    element.setAttribute(name, value);
    return;
  }
  element.removeAttribute(name);
};

const getUploadElement = () => {
  return getElementPlusControlRoot(uploadRef.value)?.querySelector<HTMLElement>(".el-upload") ?? null;
};

const getElement = () => getElementPlusControlRoot(uploadRef.value);

const getTriggerElement = () => getUploadElement();

const focusTrigger = () => {
  const target = getTriggerElement();
  target?.focus();
  return target;
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

const validateRawFile = (file: UploadRawFile) => {
  const files = createFileList([file]);
  return validateFiles(files);
};

const handleFiles = (files: FileList) => {
  if (isLocked.value || !validateFiles(files)) return false;
  emit("select", files);
  return true;
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
  const uploadFiles = pendingUploadFiles;
  pendingFiles = [];
  pendingUploadFiles = [];
  isDragActive.value = false;

  let accepted = false;
  if (hasFiles(files)) {
    accepted = handleFiles(files);
  }

  if (!accepted) {
    uploadRef.value?.clearFiles(transientUploadStates);
    return;
  }

  if (shouldClearFiles.value) {
    uploadRef.value?.clearFiles();
    emit("update:fileList", []);
    return;
  }

  emit("update:fileList", uploadFiles);
};

const scheduleFileFlush = (files: File[], uploadFiles: UploadFiles) => {
  pendingFiles = files;
  pendingUploadFiles = uploadFiles;
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

  emit("change", _file, uploadFiles);
  scheduleFileFlush(getRawFiles(uploadFiles), uploadFiles);
};

const onBeforeUpload: UploadHooks["beforeUpload"] = (file) => {
  if (!validateRawFile(file)) return false;
  return props.beforeUpload?.(file) ?? true;
};

const onBeforeRemove: UploadHooks["beforeRemove"] = (file, uploadFiles) => {
  return props.beforeRemove?.(file, uploadFiles) ?? true;
};

const onUploadPreview = (file: UploadFile) => {
  emit("preview", file);
};

const onUploadRemove = (file: UploadFile, uploadFiles: UploadFiles) => {
  emit("update:fileList", uploadFiles);
  emit("remove", file, uploadFiles);
};

const onUploadExceed = (files: File[], uploadFiles: UploadUserFile[]) => {
  rejectFiles("max-files", files);
  emit("exceed", files, uploadFiles);
};

const onUploadProgress = (event: UploadProgressEvent, file: UploadFile, uploadFiles: UploadFiles) => {
  emit("progress", event, file, uploadFiles);
};

const onUploadSuccess = (response: unknown, file: UploadFile, uploadFiles: UploadFiles) => {
  emit("update:fileList", uploadFiles);
  emit("success", response, file, uploadFiles);
};

const onUploadError = (error: Error, file: UploadFile, uploadFiles: UploadFiles) => {
  emit("update:fileList", uploadFiles);
  emit("error", error, file, uploadFiles);
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

defineExpose({
  getNativeUpload: () => uploadRef.value,
  getElement,
  getTriggerElement,
  focusTrigger,
  abort: (file?: UploadFile) => uploadRef.value?.abort(file),
  clearFiles: () => uploadRef.value?.clearFiles(),
  handleRemove: (file: UploadFile | UploadRawFile) => uploadRef.value?.handleRemove(file),
  handleStart: (file: UploadRawFile) => uploadRef.value?.handleStart(file),
  submit: () => uploadRef.value?.submit(),
});
</script>

<template>
  <el-upload
    v-bind="uploadPassthroughAttrs"
    :id="rootId"
    ref="uploadRef"
    class="base-upload"
    :class="[
      rootClass,
      {
        'base-upload--active': isActive,
        'base-upload--disabled': disabled,
        'base-upload--loading': loading,
        'base-upload--error': error,
        'base-upload--success': success && !error,
        'base-upload--compact': compact,
        'base-upload--with-list': showFileList,
        'base-upload--dragless': !drag,
        [`base-upload--${size}`]: true,
      },
    ]"
    :style="rootStyle"
    :action="action"
    :headers="headers"
    :method="method"
    :data="data"
    :with-credentials="withCredentials"
    :auto-upload="autoUpload"
    :http-request="httpRequest"
    :before-upload="onBeforeUpload"
    :before-remove="onBeforeRemove"
    :crossorigin="crossorigin || undefined"
    :show-file-list="showFileList"
    :drag="drag"
    :accept="inputAccept"
    :multiple="multiple"
    :name="uploadName"
    :list-type="listType"
    :file-list="fileList"
    :limit="elementLimit || undefined"
    :directory="directory"
    :disabled="isLocked"
    :aria-disabled="isLocked ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :aria-invalid="error ? 'true' : undefined"
    :aria-label="rootLabel || undefined"
    :aria-labelledby="rootLabelledby || undefined"
    :aria-describedby="describedBy || undefined"
    :on-change="onUploadChange"
    :on-preview="onUploadPreview"
    :on-remove="onUploadRemove"
    :on-exceed="onUploadExceed"
    :on-progress="onUploadProgress"
    :on-success="onUploadSuccess"
    :on-error="onUploadError"
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
    <template v-if="$slots.trigger" #trigger>
      <slot name="trigger"></slot>
    </template>
    <template v-if="$slots.file" #file="{ file, index }">
      <slot name="file" :file="file" :index="index"></slot>
    </template>
    <template v-if="$slots.tip" #tip>
      <slot name="tip"></slot>
    </template>
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

.base-upload--with-list {
  @apply rounded-2xl;
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

.base-upload--dragless .base-upload__surface {
  @apply border-solid bg-white dark:bg-slate-950;
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

.base-upload :deep(.el-upload-list) {
  @apply mt-3 grid gap-2;
}

.base-upload :deep(.el-upload-list__item) {
  @apply m-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300;
}

.base-upload :deep(.el-upload-list__item:hover) {
  @apply border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900;
}

.base-upload :deep(.el-upload-list__item-name) {
  @apply min-w-0 text-xs font-bold text-slate-600 dark:text-slate-300;
}

.base-upload :deep(.el-upload-list__item-name .el-icon) {
  color: rgb(var(--color-primary));
}

.base-upload :deep(.el-upload-list__item-status-label) {
  @apply text-emerald-500;
}

.base-upload :deep(.el-upload-list__item .el-progress) {
  @apply mt-2;
}

.base-upload :deep(.el-upload-list__item .el-progress-bar__outer) {
  @apply bg-slate-100 dark:bg-slate-800;
}

.base-upload :deep(.el-upload-list__item .el-progress-bar__inner) {
  background-color: rgb(var(--color-primary));
}

.base-upload :deep(.el-upload-list__item-delete) {
  @apply rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-300;
}

.base-upload :deep(.el-upload-list--picture .el-upload-list__item) {
  @apply min-h-16 p-2;
}

.base-upload :deep(.el-upload-list--picture .el-upload-list__item-thumbnail) {
  @apply h-12 w-12 rounded-lg border border-slate-200 object-cover dark:border-slate-800;
}

.base-upload :deep(.el-upload-list--picture-card) {
  @apply flex flex-wrap gap-2;
}

.base-upload :deep(.el-upload-list--picture-card .el-upload-list__item) {
  @apply h-24 w-24 rounded-xl p-0;
}

.base-upload :deep(.el-upload-list--picture-card .el-upload-list__item-thumbnail) {
  @apply h-full w-full rounded-xl object-cover;
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
