<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";

type DialogSize = "sm" | "md" | "lg" | "xl";

interface Props {
  modelValue: boolean;
  title?: string;
  description?: string;
  width?: string;
  size?: DialogSize;
  closeOnClickModal?: boolean;
  showClose?: boolean;
  destroyOnClose?: boolean;
  fullscreen?: boolean;
  top?: string;
  loading?: boolean;
  confirmLoading?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  description: "",
  width: "",
  size: "md",
  closeOnClickModal: true,
  showClose: true,
  destroyOnClose: true,
  fullscreen: false,
  top: "10vh",
  loading: false,
  confirmLoading: false,
  ariaLabel: "",
});

const { t } = useI18n();
const dialogId = useId();

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
  (e: "close"): void;
}>();

const computedValue = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit("update:modelValue", val);
  }
});

const titleId = computed(() => `${dialogId}-title`);
const descriptionId = computed(() => `${dialogId}-description`);
const resolvedWidth = computed(() => {
  if (props.width) {
    const widthMap: Record<string, string> = {
      "max-w-sm": "384px",
      "max-w-md": "448px",
      "max-w-lg": "512px",
      "max-w-xl": "576px",
      "max-w-2xl": "672px",
      "max-w-3xl": "768px",
      "max-w-4xl": "896px",
    };
    return widthMap[props.width] ?? props.width;
  }

  const sizeMap: Record<DialogSize, string> = {
    sm: "420px",
    md: "560px",
    lg: "720px",
    xl: "920px",
  };
  return sizeMap[props.size];
});

const handleClose = () => {
  emit("close");
};
</script>

<template>
  <el-dialog
    v-model="computedValue"
    class="base-dialog"
    :class="[
      `base-dialog--${size}`,
      {
        'base-dialog--loading': loading,
        'base-dialog--confirm-loading': confirmLoading,
      },
    ]"
    :width="resolvedWidth"
    :close-on-click-modal="closeOnClickModal"
    :show-close="showClose"
    :destroy-on-close="destroyOnClose"
    :fullscreen="fullscreen"
    :top="top"
    :aria-label="ariaLabel || (!title ? t('common.dialog') : undefined)"
    :aria-labelledby="title ? titleId : undefined"
    :aria-describedby="description ? descriptionId : undefined"
    @closed="handleClose"
  >
    <template #header="{ close, titleClass }">
      <header class="base-dialog__header">
        <div class="base-dialog__heading">
          <slot name="header">
            <h3 :id="titleId" :class="titleClass" class="base-dialog__title">{{ title || t("common.dialog") }}</h3>
            <p v-if="description" :id="descriptionId" class="base-dialog__description">{{ description }}</p>
          </slot>
        </div>
        <button
          v-if="showClose"
          type="button"
          class="base-dialog__close"
          :aria-label="t('common.close')"
          :title="t('common.close')"
          @click="close"
        >
          <BaseIcon name="X" size="16" aria-hidden="true" />
        </button>
      </header>
    </template>
    <BaseLoading v-if="loading" type="skeleton" text="加载中" :skeleton-lines="4" surface="muted" bordered />
    <slot></slot>
    <template #footer v-if="$slots.footer">
      <div class="dialog-footer">
        <BaseLoading v-if="confirmLoading" type="spinner" size="sm" text="处理中" direction="horizontal" compact />
        <slot name="footer"></slot>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.base-dialog__header {
  @apply flex min-w-0 items-start justify-between gap-3;
}

.base-dialog__heading {
  @apply min-w-0;
}

.base-dialog__title {
  @apply truncate text-sm font-black text-slate-900 dark:text-slate-100;
}

.base-dialog__description {
  @apply mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.base-dialog__close {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200;
}

.dialog-footer {
  @apply flex min-w-0 flex-wrap items-center justify-end gap-2;
}

:deep(.base-dialog.el-dialog) {
  @apply max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900;
}

:deep(.base-dialog .el-dialog__header) {
  @apply border-b border-slate-100 px-5 py-4 dark:border-slate-800;
}

:deep(.base-dialog .el-dialog__body) {
  @apply max-h-[min(68vh,720px)] overflow-auto px-5 py-4 text-slate-700 dark:text-slate-200;
}

:deep(.base-dialog .el-dialog__footer) {
  @apply border-t border-slate-100 px-5 py-4 dark:border-slate-800;
}

:deep(.base-dialog.is-fullscreen .el-dialog__body) {
  @apply max-h-none;
}

@media (prefers-reduced-motion: reduce) {
  .base-dialog__close {
    transition: none !important;
  }
}
</style>
