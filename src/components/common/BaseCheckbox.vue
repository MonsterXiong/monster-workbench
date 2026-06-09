<script setup lang="ts">
import { computed, useId } from "vue";
import { Check, LoaderCircle, Minus } from "lucide-vue-next";
import { getEventTargetChecked, isActivationKey, isKeyboardKey, preventDomEventDefault, setEventTargetChecked } from "../../utils";

interface Props {
  modelValue: boolean;
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
  size?: "sm" | "md" | "lg";
}

const props = withDefaults(defineProps<Props>(), {
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
  size: "md",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "change", value: boolean): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
  (e: "keydown", value: KeyboardEvent): void;
}>();

const checkboxId = useId();
const labelId = `${checkboxId}-label`;
const descriptionId = `${checkboxId}-description`;
const isReadonly = computed(() => props.disabled || props.readonly || props.loading);
const resolvedAriaLabel = computed(() => props.ariaLabel || props.label || undefined);
const describedBy = computed(() => (props.description ? descriptionId : undefined));

const checked = computed(() => props.modelValue);

const commitChecked = (value: boolean) => {
  if (isReadonly.value) return;
  emit("update:modelValue", value);
  emit("change", value);
};

const toggle = () => {
  if (isReadonly.value) return;
  commitChecked(!props.modelValue);
};

const handleClick = (event: MouseEvent) => {
  if (!isReadonly.value) return;
  preventDomEventDefault(event);
};

const handleChange = (event: Event) => {
  if (isReadonly.value) {
    setEventTargetChecked(event, props.modelValue);
    preventDomEventDefault(event);
    return;
  }
  commitChecked(getEventTargetChecked(event, props.modelValue));
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
</script>

<template>
  <label
    class="base-checkbox"
    :class="{
      [`base-checkbox--${size}`]: true,
      'base-checkbox--checked': checked,
      'base-checkbox--disabled': disabled,
      'base-checkbox--readonly': readonly,
      'base-checkbox--loading': loading,
      'base-checkbox--indeterminate': indeterminate,
      'base-checkbox--compact': compact,
      'base-checkbox--error': error,
      'base-checkbox--success': success
    }"
    @click="handleClick"
  >
    <input
      :checked="checked"
      class="sr-only"
      type="checkbox"
      :disabled="disabled"
      :indeterminate="indeterminate"
      :aria-label="resolvedAriaLabel"
      :aria-labelledby="label ? labelId : undefined"
      :aria-describedby="describedBy"
      :aria-checked="indeterminate ? 'mixed' : checked"
      :aria-disabled="(readonly || loading) ? 'true' : undefined"
      :aria-busy="loading ? 'true' : undefined"
      @change="handleChange"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
      @keydown="handleKeydown"
    />
    <span class="base-checkbox__box" aria-hidden="true">
      <LoaderCircle v-if="loading" class="h-3.5 w-3.5" aria-hidden="true" />
      <Minus v-else-if="indeterminate" class="h-3.5 w-3.5" aria-hidden="true" />
      <Check v-else-if="checked" class="h-3.5 w-3.5" aria-hidden="true" />
    </span>
    <span v-if="label || description" class="base-checkbox__text">
      <span v-if="label" :id="labelId" class="base-checkbox__label">{{ label }}</span>
      <span v-if="description" :id="descriptionId" class="base-checkbox__description">{{ description }}</span>
    </span>
  </label>
</template>

<style scoped>
.base-checkbox {
  @apply flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-colors dark:border-slate-800 dark:bg-slate-900;
}

.base-checkbox:hover {
  @apply border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950;
}

.base-checkbox--checked,
.base-checkbox--indeterminate {
  border-color: rgba(var(--color-primary), 0.34);
  background-color: rgba(var(--color-primary), 0.06);
}

.base-checkbox--success {
  @apply border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950;
}

.base-checkbox--error {
  @apply border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950;
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
}

.base-checkbox--lg {
  @apply p-4;
}

.base-checkbox__box {
  @apply mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-white transition-colors dark:border-slate-700 dark:bg-slate-950;
}

.base-checkbox--checked .base-checkbox__box,
.base-checkbox--indeterminate .base-checkbox__box {
  border-color: rgb(var(--color-primary));
  background-color: rgb(var(--color-primary));
}

.base-checkbox--loading .base-checkbox__box {
  @apply border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500;
}

.base-checkbox--loading .base-checkbox__box svg {
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
  .base-checkbox__box {
    transition: none !important;
  }

  .base-checkbox--loading .base-checkbox__box svg {
    animation: none !important;
  }
}

@keyframes base-checkbox-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
