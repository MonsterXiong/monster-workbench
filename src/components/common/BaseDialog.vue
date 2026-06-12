<script setup lang="ts">
import { computed, useId, useSlots } from "vue";
import { useI18n } from "../../composables/useI18n";
import { joinAriaIds, resolveCssSizeAlias } from "../../utils";

type DialogSize = "sm" | "md" | "lg" | "xl";
type DialogLevel = 2 | 3 | 4 | 5 | 6;
type DialogFooterAlign = "start" | "end" | "between";
type DialogRole = "dialog" | "alertdialog";

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
  role?: DialogRole;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
  ariaLabel?: string;
  ariaDescribedby?: string;
  actionsLabel?: string;
  closeLabel?: string;
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
  role: "dialog",
  wrapTitle: false,
  wrapDescription: false,
  ariaLabel: "",
  ariaDescribedby: "",
  actionsLabel: "",
  closeLabel: "",
  bodyLabel: "",
  footerLabel: "",
});

const { t } = useI18n();
const slots = useSlots();
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
const hasCustomHeader = computed(() => Boolean(slots.header));
const resolvedCloseLabel = computed(() => props.closeLabel || t("common.close"));
const resolvedDialogLabel = computed(() => {
  if (props.ariaLabel) return props.ariaLabel;
  if (hasCustomHeader.value) return props.title || t("common.dialog");
  return "";
});
const labelledBy = computed(() => (resolvedDialogLabel.value ? undefined : titleId.value));
const describedBy = computed(() =>
  joinAriaIds([!hasCustomHeader.value && props.description ? descriptionId.value : undefined, props.ariaDescribedby])
);
const resolvedActionsLabel = computed(() => props.actionsLabel || `${props.title || props.ariaLabel || t("common.dialog")} 操作`);
const resolvedWidth = computed(() => {
  if (props.width) {
    return resolveCssSizeAlias(props.width);
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
    :show-close="false"
    :destroy-on-close="destroyOnClose"
    :fullscreen="fullscreen"
    :top="top"
    :before-close="handleBeforeClose"
    :role="role"
    aria-modal="true"
    :aria-label="resolvedDialogLabel || undefined"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
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
        <div v-if="$slots.actions || showClose" class="base-dialog__header-actions" role="group" :aria-label="resolvedActionsLabel">
          <slot name="actions"></slot>
          <BaseButton
            v-if="showClose"
            class="base-dialog__close"
            type="ghost"
            size="sm"
            native-type="button"
            circle
            :disabled="isCloseDisabled"
            :aria-label="resolvedCloseLabel"
            :title="resolvedCloseLabel"
            data-ignore-container-click
            @click.stop="close"
          >
            <template #icon>
              <BaseIcon name="X" size="16" aria-hidden="true" />
            </template>
          </BaseButton>
        </div>
      </header>
    </template>
    <div :id="bodyId" class="base-dialog__body-inner" :role="bodyLabel ? 'region' : undefined" :aria-label="bodyLabel || undefined">
      <BaseLoading v-if="loading" type="skeleton" :text="resolvedLoadingText" :skeleton-lines="4" surface="muted" bordered />
      <slot></slot>
    </div>
    <template #footer v-if="$slots.footer">
      <div
        :id="footerId"
        class="dialog-footer"
        :class="`dialog-footer--${footerAlign}`"
        :role="footerLabel ? 'group' : undefined"
        :aria-label="footerLabel || undefined"
      >
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
  @apply ml-auto flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2;
  max-width: 100%;
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
  overflow-wrap: anywhere;
}

.base-dialog--wrap-description .base-dialog__description {
  @apply break-words;
}

.base-dialog__close {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200;
  --el-button-size: 2rem;
  border-color: transparent !important;
  background: transparent !important;
  padding: 0 !important;
}

.base-dialog__close:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.18);
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

.base-dialog__header-actions :deep(.el-button),
.dialog-footer :deep(.el-button) {
  min-width: 0;
  max-width: 100%;
  white-space: normal;
}

.base-dialog__header-actions :deep(.el-button > span),
.dialog-footer :deep(.el-button > span) {
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: normal;
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

@media (max-width: 640px) {
  .base-dialog__header {
    @apply gap-2;
  }

  .base-dialog__header-actions {
    @apply gap-1.5;
  }

  .dialog-footer,
  .dialog-footer--between {
    @apply justify-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-dialog__close {
    transition: none !important;
  }
}
</style>
