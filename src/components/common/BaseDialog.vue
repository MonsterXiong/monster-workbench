<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";

type DialogSize = "sm" | "md" | "lg" | "xl";
type DialogLevel = 2 | 3 | 4 | 5 | 6;
type DialogFooterAlign = "start" | "end" | "between";

interface Props {
  modelValue: boolean;
  title?: string;
  description?: string;
  level?: DialogLevel;
  icon?: string;
  showIcon?: boolean;
  width?: string;
  size?: DialogSize;
  closeOnClickModal?: boolean;
  closeOnPressEscape?: boolean;
  showClose?: boolean;
  closeDisabled?: boolean;
  lockCloseOnLoading?: boolean;
  destroyOnClose?: boolean;
  fullscreen?: boolean;
  top?: string;
  loading?: boolean;
  loadingText?: string;
  confirmLoading?: boolean;
  confirmLoadingText?: string;
  footerAlign?: DialogFooterAlign;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
  ariaLabel?: string;
  bodyLabel?: string;
  footerLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  description: "",
  level: 3,
  icon: "",
  showIcon: false,
  width: "",
  size: "md",
  closeOnClickModal: true,
  closeOnPressEscape: true,
  showClose: true,
  closeDisabled: false,
  lockCloseOnLoading: false,
  destroyOnClose: true,
  fullscreen: false,
  top: "10vh",
  loading: false,
  loadingText: "",
  confirmLoading: false,
  confirmLoadingText: "",
  footerAlign: "end",
  wrapTitle: false,
  wrapDescription: false,
  ariaLabel: "",
  bodyLabel: "",
  footerLabel: "",
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
const bodyId = computed(() => `${dialogId}-body`);
const footerId = computed(() => `${dialogId}-footer`);
const headingTag = computed(() => `h${props.level}`);
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedConfirmLoadingText = computed(() => props.confirmLoadingText || "处理中");
const isCloseDisabled = computed(() => props.closeDisabled || (props.lockCloseOnLoading && (props.loading || props.confirmLoading)));
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

const handleBeforeClose = (done: () => void) => {
  if (isCloseDisabled.value) return;
  done();
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
        'base-dialog--wrap-title': wrapTitle,
        'base-dialog--wrap-description': wrapDescription,
      },
    ]"
    :width="resolvedWidth"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape"
    :show-close="showClose"
    :destroy-on-close="destroyOnClose"
    :fullscreen="fullscreen"
    :top="top"
    :before-close="handleBeforeClose"
    :aria-label="ariaLabel || (!title ? t('common.dialog') : undefined)"
    :aria-labelledby="title ? titleId : undefined"
    :aria-describedby="description ? descriptionId : undefined"
    :aria-busy="loading || confirmLoading ? 'true' : undefined"
    @closed="handleClose"
  >
    <template #header="{ close, titleClass }">
      <header class="base-dialog__header">
        <div class="base-dialog__heading">
          <slot name="header">
            <div v-if="showIcon || icon || $slots.icon" class="base-dialog__icon" aria-hidden="true">
              <slot name="icon">
                <BaseIcon :name="icon || 'PanelTopOpen'" size="17" aria-hidden="true" />
              </slot>
            </div>
            <div class="base-dialog__heading-text">
              <component :is="headingTag" :id="titleId" :class="titleClass" class="base-dialog__title">{{ title || t("common.dialog") }}</component>
              <p v-if="description" :id="descriptionId" class="base-dialog__description">{{ description }}</p>
            </div>
          </slot>
        </div>
        <div v-if="$slots.actions || showClose" class="base-dialog__header-actions">
          <slot name="actions"></slot>
          <button
            v-if="showClose"
            type="button"
            class="base-dialog__close"
            :disabled="isCloseDisabled"
            :aria-label="t('common.close')"
            :title="t('common.close')"
            @click="close"
          >
            <BaseIcon name="X" size="16" aria-hidden="true" />
          </button>
        </div>
      </header>
    </template>
    <div :id="bodyId" class="base-dialog__body-inner" :role="bodyLabel ? 'region' : undefined" :aria-label="bodyLabel || undefined">
      <BaseLoading v-if="loading" type="skeleton" :text="resolvedLoadingText" :skeleton-lines="4" surface="muted" bordered />
      <slot></slot>
    </div>
    <template #footer v-if="$slots.footer">
      <div :id="footerId" class="dialog-footer" :class="`dialog-footer--${footerAlign}`" :aria-label="footerLabel || undefined">
        <BaseLoading v-if="confirmLoading" type="spinner" size="sm" :text="resolvedConfirmLoadingText" direction="horizontal" compact />
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
  @apply flex min-w-0 flex-1 items-start gap-3;
}

.base-dialog__icon {
  color: rgb(var(--color-primary));
  background-color: rgba(var(--color-primary), 0.1);
  @apply mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl;
}

.base-dialog__heading-text {
  @apply min-w-0 flex-1;
}

.base-dialog__header-actions {
  @apply flex shrink-0 flex-wrap items-center justify-end gap-2;
}

.base-dialog__title {
  @apply truncate text-sm font-black text-slate-900 dark:text-slate-100;
}

.base-dialog--wrap-title :deep(.base-dialog__title),
.base-dialog--wrap-title .base-dialog__title {
  @apply whitespace-normal break-words;
}

.base-dialog__description {
  @apply mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.base-dialog--wrap-description .base-dialog__description {
  @apply break-words;
}

.base-dialog__close {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200;
}

.base-dialog__close:disabled {
  @apply cursor-not-allowed opacity-50;
}

.base-dialog__body-inner {
  @apply min-w-0;
}

.dialog-footer {
  @apply flex min-w-0 flex-wrap items-center justify-end gap-2;
}

.dialog-footer--start {
  @apply justify-start;
}

.dialog-footer--between {
  @apply justify-between;
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
