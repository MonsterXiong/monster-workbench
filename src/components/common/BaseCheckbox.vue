<script setup lang="ts">
import type { CheckboxInstance } from "element-plus";
import { computed, ref, useAttrs, useId } from "vue";
import { LoaderCircle } from "lucide-vue-next";
import { isActivationKey, isKeyboardKey, joinAriaIds, omit, preventDomEventDefault } from "../../utils";
import { getElementPlusControlRoot, toElementPlusSize, type ProjectControlSize } from "./elementPlusDom";

defineOptions({
  inheritAttrs: false,
});

interface Props {
  modelValue: boolean;
  id?: string;
  name?: string;
  value?: string | number;
  label?: string;
  description?: string;
  disabled?: boolean;
  readonly?: boolean;
  loading?: boolean;
  indeterminate?: boolean;
  compact?: boolean;
  error?: boolean;
  success?: boolean;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  validateEvent?: boolean;
  size?: ProjectControlSize;
}

const props = withDefaults(defineProps<Props>(), {
  id: "",
  name: "",
  value: "",
  label: "",
  description: "",
  disabled: false,
  readonly: false,
  loading: false,
  indeterminate: false,
  compact: false,
  error: false,
  success: false,
  ariaLabel: "",
  ariaLabelledby: "",
  ariaDescribedby: "",
  validateEvent: false,
  size: "md",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "change", value: boolean): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
  (e: "keydown", value: KeyboardEvent): void;
}>();

const attrs = useAttrs();
const rootRef = ref<HTMLElement | null>(null);
const checkboxRef = ref<CheckboxInstance | null>(null);
const checkboxId = useId();
const labelId = `${checkboxId}-label`;
const descriptionId = `${checkboxId}-description`;
const isReadonly = computed(() => props.disabled || props.readonly || props.loading);
const resolvedAriaLabel = computed(() => props.ariaLabel || props.label || undefined);
const labelledBy = computed(() => props.ariaLabelledby || (props.label ? labelId : undefined));
const describedBy = computed(() => joinAriaIds([props.description ? descriptionId : undefined, props.ariaDescribedby]));

const checked = computed(() => props.modelValue);
const elementSize = computed(() => toElementPlusSize(props.size));
const rootAttrs = computed(() => omit(attrs, ["class", "style"]));

const commitChecked = (value: boolean) => {
  if (isReadonly.value) return;
  emit("update:modelValue", value);
  emit("change", value);
};

const toggle = () => {
  if (isReadonly.value) return;
  commitChecked(!props.modelValue);
};

const computedValue = computed({
  get: () => props.modelValue,
  set: (value) => {
    commitChecked(Boolean(value));
  },
});

const handleRootClick = (event: MouseEvent) => {
  const target = event.target;
  if (target instanceof Element && target.closest(".base-checkbox__control")) {
    if (isReadonly.value) preventDomEventDefault(event);
    return;
  }

  if (!isReadonly.value) {
    toggle();
    return;
  }

  preventDomEventDefault(event);
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  if (isReadonly.value && isActivationKey(event)) {
    preventDomEventDefault(event);
    return;
  }
  if (isKeyboardKey(event, "Enter")) {
    preventDomEventDefault(event);
    toggle();
  }
};

const handleFocusIn = (event: FocusEvent) => {
  emit("focus", event);
};

const handleFocusOut = (event: FocusEvent) => {
  emit("blur", event);
};

const getElement = () => rootRef.value;
const getCheckboxElement = () => getElementPlusControlRoot(checkboxRef.value)?.querySelector<HTMLInputElement>("input[type='checkbox']") ?? null;
const focus = () => {
  const checkbox = getCheckboxElement();
  checkbox?.focus();
  return checkbox;
};

defineExpose({
  focus,
  toggle,
  getNativeCheckbox: () => checkboxRef.value,
  getElement,
  getCheckboxElement,
});
</script>

<template>
  <div
    v-bind="rootAttrs"
    ref="rootRef"
    class="base-checkbox"
    :class="[
      attrs.class,
      {
        [`base-checkbox--${size}`]: true,
        'base-checkbox--checked': checked,
        'base-checkbox--disabled': disabled,
        'base-checkbox--readonly': readonly,
        'base-checkbox--loading': loading,
        'base-checkbox--indeterminate': indeterminate,
        'base-checkbox--compact': compact,
        'base-checkbox--error': error,
        'base-checkbox--success': success
      }
    ]"
    :style="attrs.style"
    :aria-disabled="isReadonly ? 'true' : undefined"
    :aria-readonly="readonly ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :aria-invalid="error ? 'true' : undefined"
    @click="handleRootClick"
    @keydown="handleKeydown"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
  >
    <span class="base-checkbox__box">
      <el-checkbox
        ref="checkboxRef"
        :id="id || undefined"
        v-model="computedValue"
        class="base-checkbox__control"
        :name="name || undefined"
        :value="value === '' ? undefined : value"
        :disabled="disabled || loading"
        :indeterminate="indeterminate"
        :size="elementSize"
        :aria-label="labelledBy ? undefined : resolvedAriaLabel"
        :aria-labelledby="labelledBy"
        :aria-describedby="describedBy"
        :aria-checked="indeterminate ? 'mixed' : checked"
        :aria-disabled="(readonly || loading) ? 'true' : undefined"
        :aria-busy="loading ? 'true' : undefined"
        :aria-invalid="error ? 'true' : undefined"
        :validate-event="validateEvent"
      />
      <span v-if="loading" class="base-checkbox__loading" aria-hidden="true">
        <LoaderCircle class="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </span>
    <span v-if="label || description" class="base-checkbox__text">
      <span v-if="label" :id="labelId" class="base-checkbox__label">{{ label }}</span>
      <span v-if="description" :id="descriptionId" class="base-checkbox__description">{{ description }}</span>
    </span>
  </div>
</template>

<style scoped>
.base-checkbox {
  @apply flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-colors dark:border-slate-800 dark:bg-slate-900;
  --base-checkbox-size: 16px;
  --base-checkbox-radius: 6px;
  --base-checkbox-check-width: 4px;
  --base-checkbox-check-height: 8px;
  --base-checkbox-check-left: 5px;
  --base-checkbox-check-top: 1px;
  --base-checkbox-indeterminate-top: 6px;
}

.base-checkbox:hover:not(.base-checkbox--disabled):not(.base-checkbox--readonly):not(.base-checkbox--loading):not(.base-checkbox--checked):not(.base-checkbox--indeterminate):not(.base-checkbox--success):not(.base-checkbox--error) {
  @apply border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950;
}

.base-checkbox:focus-within {
  border-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.14);
}

.base-checkbox--checked,
.base-checkbox--indeterminate {
  border-color: rgb(var(--color-primary) / 0.34);
  background-color: rgb(var(--color-primary) / 0.06);
}

.base-checkbox--success {
  @apply border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950;
}

.base-checkbox--success:hover:not(.base-checkbox--disabled):not(.base-checkbox--readonly):not(.base-checkbox--loading) {
  @apply border-emerald-400 bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950;
}

.base-checkbox--success:focus-within {
  @apply border-emerald-400;
  box-shadow: 0 0 0 3px rgb(16 185 129 / 0.14);
}

.base-checkbox--error {
  @apply border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950;
}

.base-checkbox--error:hover:not(.base-checkbox--disabled):not(.base-checkbox--readonly):not(.base-checkbox--loading),
.base-checkbox--error:focus-within {
  @apply border-red-400;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.14);
}

.base-checkbox--disabled {
  @apply cursor-not-allowed opacity-60;
}

.base-checkbox--readonly,
.base-checkbox--loading {
  @apply cursor-default bg-slate-50 dark:bg-slate-950;
}

.base-checkbox--sm,
.base-checkbox--compact {
  @apply gap-2 rounded-xl p-2;
  --base-checkbox-size: 15px;
  --base-checkbox-radius: 5px;
  --base-checkbox-check-width: 4px;
  --base-checkbox-check-height: 7px;
  --base-checkbox-check-left: 5px;
  --base-checkbox-check-top: 1px;
  --base-checkbox-indeterminate-top: 6px;
}

.base-checkbox--xs {
  @apply gap-2 rounded-xl p-2;
  --base-checkbox-size: 14px;
  --base-checkbox-radius: 5px;
  --base-checkbox-check-width: 3px;
  --base-checkbox-check-height: 7px;
  --base-checkbox-check-left: 5px;
  --base-checkbox-check-top: 1px;
  --base-checkbox-indeterminate-top: 5px;
}

.base-checkbox--lg {
  @apply p-4;
  --base-checkbox-size: 18px;
  --base-checkbox-radius: 7px;
  --base-checkbox-check-width: 5px;
  --base-checkbox-check-height: 9px;
  --base-checkbox-check-left: 6px;
  --base-checkbox-check-top: 2px;
  --base-checkbox-indeterminate-top: 7px;
}

.base-checkbox__box {
  @apply relative mt-0.5 flex shrink-0 items-center justify-center;
  width: var(--base-checkbox-size);
  height: var(--base-checkbox-size);
}

:deep(.base-checkbox__control) {
  @apply m-0 inline-flex items-center justify-center;
  width: var(--base-checkbox-size);
  height: var(--base-checkbox-size);
}

:deep(.el-checkbox__input) {
  @apply inline-flex items-center justify-center;
  width: var(--base-checkbox-size);
  height: var(--base-checkbox-size);
}

:deep(.el-checkbox__inner) {
  @apply border border-slate-300 bg-white transition-colors dark:border-slate-700 dark:bg-slate-950;
  width: var(--base-checkbox-size);
  height: var(--base-checkbox-size);
  border-radius: var(--base-checkbox-radius);
}

:deep(.el-checkbox__inner::after) {
  border-color: #ffffff;
  border-width: 2px;
  height: var(--base-checkbox-check-height);
  left: var(--base-checkbox-check-left);
  top: var(--base-checkbox-check-top);
  width: var(--base-checkbox-check-width);
}

:deep(.el-checkbox__input.is-indeterminate .el-checkbox__inner::before) {
  @apply bg-white;
  height: 2px;
  top: var(--base-checkbox-indeterminate-top);
}

.base-checkbox:hover:not(.base-checkbox--disabled):not(.base-checkbox--readonly):not(.base-checkbox--loading) :deep(.el-checkbox__inner) {
  @apply border-slate-400 dark:border-slate-600;
}

.base-checkbox--checked :deep(.el-checkbox__inner),
.base-checkbox--indeterminate :deep(.el-checkbox__inner) {
  border-color: rgb(var(--color-primary));
  background-color: rgb(var(--color-primary));
}

.base-checkbox--success :deep(.el-checkbox__inner) {
  @apply border-emerald-300 dark:border-emerald-800;
}

.base-checkbox--success.base-checkbox--checked :deep(.el-checkbox__inner),
.base-checkbox--success.base-checkbox--indeterminate :deep(.el-checkbox__inner) {
  @apply border-emerald-500 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-500;
}

.base-checkbox--error :deep(.el-checkbox__inner) {
  @apply border-red-300 dark:border-red-800;
}

.base-checkbox--error.base-checkbox--checked :deep(.el-checkbox__inner),
.base-checkbox--error.base-checkbox--indeterminate :deep(.el-checkbox__inner) {
  @apply border-red-500 bg-red-500 dark:border-red-400 dark:bg-red-500;
}

.base-checkbox--loading :deep(.el-checkbox__inner) {
  @apply border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500;
}

.base-checkbox--loading :deep(.el-checkbox__inner::before),
.base-checkbox--loading :deep(.el-checkbox__inner::after) {
  opacity: 0;
}

:deep(.el-checkbox__input.is-disabled .el-checkbox__inner) {
  @apply cursor-not-allowed border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900;
}

:deep(.el-checkbox__original) {
  cursor: inherit;
}

.base-checkbox__loading {
  @apply pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500;
}

.base-checkbox__loading svg {
  animation: base-checkbox-spin 0.9s linear infinite;
}

.base-checkbox__text {
  @apply min-w-0;
}

.base-checkbox__label {
  @apply block text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-checkbox__description {
  @apply mt-0.5 block text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

@media (prefers-reduced-motion: reduce) {
  .base-checkbox,
  :deep(.el-checkbox__inner) {
    transition: none !important;
  }

  .base-checkbox__loading svg {
    animation: none !important;
  }
}

@keyframes base-checkbox-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
