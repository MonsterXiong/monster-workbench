<script setup lang="ts">
import type { FormInstance, FormItemProp, FormRules, FormValidateCallback } from "element-plus";
import { computed, ref, useId } from "vue";
import { useI18n } from "../../composables/useI18n";

type FormSize = "sm" | "md" | "lg";
type FormBodyGap = "sm" | "md" | "lg";
type FormSurface = "card" | "muted" | "plain";
type ElementFormLabelPosition = "left" | "right" | "top";
type ElementFormAsteriskPosition = "left" | "right";

interface Props {
  model?: Record<string, unknown>;
  rules?: FormRules;
  title?: string;
  description?: string;
  columns?: 1 | 2 | 3 | 4;
  size?: FormSize;
  bodyGap?: FormBodyGap;
  compact?: boolean;
  divided?: boolean;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  showLoadingIndicator?: boolean;
  lockContent?: boolean;
  surface?: FormSurface;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
  noValidate?: boolean;
  autocomplete?: "on" | "off";
  labelPosition?: ElementFormLabelPosition;
  labelWidth?: string | number;
  requireAsteriskPosition?: ElementFormAsteriskPosition;
  statusIcon?: boolean;
  scrollToError?: boolean;
  ariaLabel?: string;
  actionsLabel?: string;
  bodyLabel?: string;
  footerLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  model: undefined,
  rules: undefined,
  title: "",
  description: "",
  columns: 1,
  size: "md",
  bodyGap: "md",
  compact: false,
  divided: false,
  disabled: false,
  loading: false,
  loadingText: "",
  showLoadingIndicator: true,
  lockContent: true,
  surface: "card",
  wrapTitle: false,
  wrapDescription: false,
  noValidate: false,
  autocomplete: undefined,
  labelPosition: "top",
  labelWidth: "",
  requireAsteriskPosition: "left",
  statusIcon: false,
  scrollToError: false,
  ariaLabel: "",
  actionsLabel: "",
  bodyLabel: "",
  footerLabel: "",
});

const { t } = useI18n();
const formRef = ref<FormInstance>();
const formId = useId();
const titleId = `${formId}-title`;
const descriptionId = `${formId}-description`;
const isDisabled = computed(() => props.disabled || props.loading);
const isContentLocked = computed(() => props.lockContent && isDisabled.value);
const describedBy = computed(() => (props.description ? descriptionId : undefined));
const hasHeader = computed(() => Boolean(props.title || props.description || props.showLoadingIndicator && props.loading));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedActionsLabel = computed(() => props.actionsLabel || `${props.title || props.ariaLabel || "表单"} 操作`);
const resolvedBodyLabel = computed(() => props.bodyLabel || `${props.title || props.ariaLabel || "表单"} 内容`);
const resolvedFooterLabel = computed(() => props.footerLabel || `${props.title || props.ariaLabel || "表单"} 动作`);
const elementSize = computed(() => {
  if (props.compact || props.size === "sm") return "small";
  if (props.size === "lg") return "large";
  return "default";
});

const emit = defineEmits<{
  (e: "submit", event: SubmitEvent): void;
  (e: "reset", event: Event): void;
  (e: "validate", prop: string | string[], isValid: boolean, message: string): void;
}>();

const handleSubmit = (event: SubmitEvent) => {
  if (isDisabled.value) return;
  emit("submit", event);
};

const handleReset = (event: Event) => {
  if (isDisabled.value) {
    event.preventDefault();
    return;
  }
  emit("reset", event);
};

const handleValidate = (prop: string | string[], isValid: boolean, message: string) => {
  emit("validate", prop, isValid, message);
};

const validate = (callback?: FormValidateCallback) => formRef.value?.validate(callback);
const validateField = (props?: FormItemProp | FormItemProp[], callback?: FormValidateCallback) =>
  formRef.value?.validateField(props, callback);
const resetFields = (props?: FormItemProp | FormItemProp[]) => {
  formRef.value?.resetFields(props);
};
const clearValidate = (props?: FormItemProp | FormItemProp[]) => {
  formRef.value?.clearValidate(props);
};
const scrollToField = (prop: FormItemProp) => {
  formRef.value?.scrollToField(prop);
};

defineExpose({
  validate,
  validateField,
  resetFields,
  clearValidate,
  scrollToField,
});
</script>

<template>
  <el-form
    ref="formRef"
    class="base-form"
    :class="[
      `base-form--cols-${columns}`,
      `base-form--${size}`,
      `base-form--gap-${bodyGap}`,
      {
        'base-form--compact': compact,
        'base-form--divided': divided,
        'base-form--muted': surface === 'muted',
        'base-form--plain': surface === 'plain',
        'base-form--wrap-title': wrapTitle,
        'base-form--wrap-description': wrapDescription,
        'is-disabled': disabled,
        'is-loading': loading,
      },
    ]"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="title ? titleId : undefined"
    :aria-describedby="describedBy"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :model="model"
    :rules="rules"
    :size="elementSize"
    :disabled="isContentLocked"
    :label-position="labelPosition"
    :label-width="labelWidth"
    :require-asterisk-position="requireAsteriskPosition"
    :status-icon="statusIcon"
    :scroll-to-error="scrollToError"
    :show-message="false"
    :validate-on-rule-change="false"
    :novalidate="noValidate"
    :autocomplete="autocomplete"
    @submit.prevent="handleSubmit"
    @reset="handleReset"
    @validate="handleValidate"
  >
    <header v-if="title || description || $slots.actions || (loading && showLoadingIndicator)" class="base-form__header">
      <div v-if="title || description" class="base-form__title-wrap">
        <div class="min-w-0">
          <h3 v-if="title" :id="titleId">{{ title }}</h3>
          <p v-if="description" :id="descriptionId">{{ description }}</p>
        </div>
      </div>
      <div v-if="$slots.actions || (loading && showLoadingIndicator)" class="base-form__trailing">
        <div
          v-if="loading && showLoadingIndicator"
          class="base-form__loading"
          role="status"
          aria-live="polite"
          :aria-label="resolvedLoadingText"
        >
          <slot name="loading">
            <BaseIcon name="LoaderCircle" size="14" aria-hidden="true" />
            <span>{{ resolvedLoadingText }}</span>
          </slot>
        </div>
        <div v-if="$slots.actions" class="base-form__actions" :aria-label="resolvedActionsLabel">
          <slot name="actions"></slot>
        </div>
      </div>
    </header>

    <fieldset
      class="base-form__fieldset"
      :disabled="isContentLocked"
      :aria-disabled="isContentLocked ? 'true' : undefined"
      :aria-label="resolvedBodyLabel"
    >
      <div class="base-form__body" :class="{ 'base-form__body--with-header': hasHeader || $slots.actions }">
        <slot></slot>
      </div>

      <footer v-if="$slots.footer" class="base-form__footer" :aria-label="resolvedFooterLabel">
        <slot name="footer"></slot>
      </footer>
    </fieldset>
  </el-form>
</template>

<style scoped>
.base-form {
  @apply min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.base-form--sm,
.base-form--compact {
  @apply rounded-xl p-3;
}

.base-form--lg {
  @apply p-5;
}

.base-form--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-form--plain {
  @apply rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent;
}

.base-form.is-disabled,
.base-form.is-loading .base-form__fieldset {
  @apply opacity-75;
}

.base-form__header {
  @apply flex min-w-0 items-start justify-between gap-3;
}

.base-form--divided .base-form__header {
  @apply border-b border-slate-200 pb-3 dark:border-slate-800;
}

.base-form__title-wrap {
  @apply min-w-0 flex-1;
}

.base-form h3 {
  @apply truncate text-sm font-black text-slate-900 dark:text-slate-100;
}

.base-form--sm h3,
.base-form--compact h3 {
  @apply text-xs;
}

.base-form--lg h3 {
  @apply text-base;
}

.base-form--wrap-title h3 {
  @apply whitespace-normal break-words;
}

.base-form p {
  @apply mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.base-form--wrap-description p {
  @apply break-words;
}

.base-form__trailing {
  @apply ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2;
}

.base-form__loading {
  border-color: rgb(var(--color-primary) / 0.18);
  background-color: rgb(var(--color-primary) / 0.08);
  color: rgb(var(--color-primary));
  @apply inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[11px] font-black;
}

.base-form__loading :deep(svg) {
  animation: base-form-spin 0.9s linear infinite;
}

.base-form__actions {
  @apply flex max-w-full flex-wrap items-center justify-end gap-2;
}

.base-form__fieldset {
  @apply min-w-0 border-0 p-0;
}

.base-form__fieldset:disabled {
  @apply cursor-not-allowed;
}

.base-form__body {
  @apply grid min-w-0 gap-3;
}

.base-form__body--with-header {
  @apply mt-4;
}

.base-form--gap-sm .base-form__body {
  @apply gap-2;
}

.base-form--gap-lg .base-form__body {
  @apply gap-4;
}

.base-form--compact .base-form__body {
  @apply gap-2.5;
}

.base-form--compact .base-form__body--with-header,
.base-form--sm .base-form__body--with-header {
  @apply mt-3;
}

.base-form--lg .base-form__body--with-header {
  @apply mt-5;
}

.base-form--cols-1 .base-form__body {
  @apply grid-cols-1;
}

.base-form--cols-2 .base-form__body {
  @apply grid-cols-1 md:grid-cols-2;
}

.base-form--cols-3 .base-form__body {
  @apply grid-cols-1 md:grid-cols-2 xl:grid-cols-3;
}

.base-form--cols-4 .base-form__body {
  @apply grid-cols-1 md:grid-cols-2 xl:grid-cols-4;
}

.base-form__footer {
  @apply mt-5;
}

.base-form--compact .base-form__footer,
.base-form--sm .base-form__footer {
  @apply mt-4;
}

@media (max-width: 640px) {
  .base-form__header {
    @apply flex-wrap;
  }

  .base-form__trailing {
    @apply flex-1 justify-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-form,
  .base-form__loading :deep(svg) {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes base-form-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
