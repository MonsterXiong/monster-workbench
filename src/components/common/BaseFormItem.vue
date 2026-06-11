<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { joinAriaIds } from "../../utils";

type FormItemSpan = 1 | 2 | 3 | 4;
type FormItemStatus = "" | "error" | "validating" | "success";

interface Props {
  label?: string;
  description?: string;
  help?: string;
  error?: string;
  success?: string;
  loading?: boolean;
  loadingText?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  compact?: boolean;
  horizontal?: boolean;
  span?: FormItemSpan;
  hideLabel?: boolean;
  labelAlign?: "start" | "center";
  labelWidth?: string;
  truncateLabel?: boolean;
  wrapDescription?: boolean;
  forId?: string;
  optionalText?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: "",
  description: "",
  help: "",
  error: "",
  success: "",
  loading: false,
  loadingText: "",
  required: false,
  disabled: false,
  readonly: false,
  compact: false,
  horizontal: false,
  span: 1,
  hideLabel: false,
  labelAlign: "start",
  labelWidth: "160px",
  truncateLabel: false,
  wrapDescription: false,
  forId: "",
  optionalText: "",
  ariaLabel: "",
});

const { t } = useI18n();
const fieldId = useId();
const labelId = `${fieldId}-label`;
const descriptionId = `${fieldId}-description`;
const messageId = `${fieldId}-message`;

const hasMessage = computed(() => Boolean(props.error || props.success || props.help || props.loading));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const describedBy = computed(() => joinAriaIds([props.description ? descriptionId : undefined, hasMessage.value ? messageId : undefined]));
const rootStyle = computed(() => ({
  "--base-form-item-label-width": props.labelWidth,
}));
const resolvedLabelPosition = computed(() => (props.horizontal ? "left" : "top"));
const resolvedValidateStatus = computed<FormItemStatus>(() => {
  if (props.error) return "error";
  if (props.loading) return "validating";
  if (props.success) return "success";
  return "";
});
</script>

<template>
  <el-form-item
    class="base-form-item"
    :class="[
      {
        'base-form-item--compact': compact,
        'base-form-item--horizontal': horizontal,
        'base-form-item--span-2': span === 2,
        'base-form-item--span-3': span === 3,
        'base-form-item--span-4': span === 4,
        'base-form-item--label-center': labelAlign === 'center',
        'base-form-item--truncate-label': truncateLabel,
        'base-form-item--wrap-description': wrapDescription,
        'base-form-item--hidden-label': hideLabel,
        'is-error': Boolean(error),
        'is-success': Boolean(success) && !error,
        'is-disabled': disabled,
        'is-readonly': readonly,
        'is-loading': loading,
      },
    ]"
    :style="rootStyle"
    :label="label || undefined"
    :label-width="horizontal ? labelWidth : undefined"
    :label-position="resolvedLabelPosition"
    :required="required"
    :error="error || undefined"
    :validate-status="resolvedValidateStatus || undefined"
    :for="forId || undefined"
    :show-message="false"
    :inline-message="false"
    :size="compact ? 'small' : undefined"
    role="group"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="(label || $slots.label) ? labelId : undefined"
    :aria-describedby="describedBy"
    :aria-invalid="error ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-readonly="readonly ? 'true' : undefined"
  >
    <template #label="{ label: resolvedLabel }">
      <span class="base-form-item__label-stack">
        <span :id="labelId" class="base-form-item__label-row" :class="{ 'base-form-item__label-stack--hidden': hideLabel }">
          <span class="base-form-item__label-text" :class="{ 'is-required': required }">
            <slot name="label">{{ resolvedLabel }}</slot>
            <span v-if="required" class="base-form-item__required" aria-hidden="true">*</span>
            <span v-else-if="optionalText" class="base-form-item__optional">{{ optionalText }}</span>
          </span>
          <span v-if="$slots.meta" class="base-form-item__meta">
            <slot name="meta"></slot>
          </span>
        </span>
        <p v-if="description" :id="descriptionId" class="base-form-item__description">{{ description }}</p>
      </span>
    </template>

    <div class="base-form-item__field">
      <slot></slot>
      <transition name="form-message-fade">
        <span v-if="error" :id="messageId" class="base-form-item__message base-form-item__message--error" role="alert">
          <BaseIcon name="CircleAlert" size="13" aria-hidden="true" />
          {{ error }}
        </span>
        <span v-else-if="success" :id="messageId" class="base-form-item__message base-form-item__message--success" role="status">
          <BaseIcon name="CircleCheck" size="13" aria-hidden="true" />
          {{ success }}
        </span>
        <span v-else-if="loading" :id="messageId" class="base-form-item__message base-form-item__message--loading" role="status">
          <BaseIcon name="LoaderCircle" size="13" aria-hidden="true" />
          {{ resolvedLoadingText }}
        </span>
        <span v-else-if="help" :id="messageId" class="base-form-item__message base-form-item__message--help">
          {{ help }}
        </span>
      </transition>
      <div v-if="$slots.extra" class="base-form-item__extra">
        <slot name="extra"></slot>
      </div>
    </div>
  </el-form-item>
</template>

<style scoped>
.base-form-item {
  @apply m-0 w-full min-w-0;
}

.base-form-item--span-2 {
  @apply md:col-span-2;
}

.base-form-item--span-3 {
  @apply xl:col-span-3;
}

.base-form-item--span-4 {
  @apply xl:col-span-4;
}

.base-form-item--compact {
  @apply gap-1;
}

.base-form-item.is-disabled {
  @apply opacity-60;
}

.base-form-item.is-readonly {
  @apply opacity-90;
}

.base-form-item.is-loading .base-form-item__field {
  @apply opacity-90;
}

.base-form-item :deep(.el-form-item__label) {
  @apply min-w-0 p-0 text-left;
  align-items: flex-start;
  height: auto;
  line-height: normal;
}

.base-form-item--horizontal :deep(.el-form-item__label) {
  @apply pr-4;
}

.base-form-item--label-center :deep(.el-form-item__label) {
  @apply md:items-center;
}

.base-form-item :deep(.el-form-item__content) {
  @apply min-w-0 flex-1 items-start;
  line-height: normal;
}

.base-form-item :deep(.el-form-item__label-wrap) {
  @apply min-w-0;
}

.base-form-item :deep(.el-form-item__label) {
  @apply text-slate-700 dark:text-slate-300;
}

.base-form-item--hidden-label :deep(.el-form-item__label) {
  @apply sr-only;
}

.base-form-item__label-stack {
  @apply flex min-w-0 flex-col gap-0.5;
}

.base-form-item__label-row {
  @apply flex min-w-0 items-center justify-between gap-2;
}

.base-form-item__label-stack--hidden {
  @apply sr-only;
}

.base-form-item__label-text {
  @apply min-w-0 break-words text-sm font-bold leading-5 text-slate-700 dark:text-slate-300;
}

.base-form-item--truncate-label .base-form-item__label-text {
  @apply truncate;
}

.base-form-item--compact .base-form-item__label-text {
  @apply text-xs;
}

.base-form-item__required {
  @apply ml-0.5 text-red-500;
}

.base-form-item__optional {
  @apply ml-1 text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-form-item__meta {
  @apply shrink-0;
}

.base-form-item__description {
  @apply mt-0.5 text-xs leading-5 text-slate-400 dark:text-slate-500;
}

.base-form-item--wrap-description .base-form-item__description,
.base-form-item__description {
  @apply break-words;
}

.base-form-item__field {
  @apply min-w-0;
}

.base-form-item__message {
  @apply mt-1.5 flex min-w-0 items-start gap-1.5 text-xs font-medium leading-5;
}

.base-form-item__message--error {
  @apply text-red-500;
}

.base-form-item__message--success {
  @apply text-emerald-600 dark:text-emerald-400;
}

.base-form-item__message--loading {
  color: rgb(var(--color-primary));
}

.base-form-item__message--loading :deep(svg) {
  animation: base-form-item-spin 0.9s linear infinite;
}

.base-form-item__message--help {
  @apply text-slate-400 dark:text-slate-500;
}

.base-form-item__extra {
  @apply mt-2 min-w-0;
}

.base-form-item--compact :deep(.el-form-item__label) {
  @apply text-xs;
}

.base-form-item--compact .base-form-item__description,
.base-form-item--compact .base-form-item__message {
  @apply text-[11px];
}

.base-form-item--horizontal {
  @apply md:items-start;
}

@media (max-width: 767px) {
  .base-form-item--horizontal :deep(.el-form-item__label) {
    @apply pr-0;
  }

  .base-form-item--horizontal {
    display: block;
  }
}

.form-message-fade-enter-active,
.form-message-fade-leave-active {
  transition: all 0.18s ease;
}

.form-message-fade-enter-from,
.form-message-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .form-message-fade-enter-active,
  .form-message-fade-leave-active,
  .base-form-item__message--loading :deep(svg) {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes base-form-item-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
