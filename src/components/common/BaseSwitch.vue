<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { joinAriaIds, joinNonEmptyStrings } from "../../utils";
import { toElementPlusSize, type ProjectControlSize } from "./elementPlusDom";

interface Props {
  modelValue: boolean;
  label?: string;
  description?: string;
  disabled?: boolean;
  readonly?: boolean;
  loading?: boolean;
  compact?: boolean;
  error?: boolean;
  success?: boolean;
  activeText?: string;
  inactiveText?: string;
  ariaLabel?: string;
  ariaDescribedby?: string;
  size?: ProjectControlSize;
}

const props = withDefaults(defineProps<Props>(), {
  label: "",
  description: "",
  disabled: false,
  readonly: false,
  loading: false,
  compact: false,
  error: false,
  success: false,
  activeText: "",
  inactiveText: "",
  ariaLabel: "",
  ariaDescribedby: "",
  size: "md",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "change", value: boolean): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
}>();

const { t } = useI18n();
const switchId = useId();
const labelId = `${switchId}-label`;
const descriptionId = `${switchId}-description`;
const stateId = `${switchId}-state`;

const isReadonly = computed(() => props.disabled || props.readonly || props.loading);
const currentText = computed(() => (props.modelValue ? props.activeText : props.inactiveText));
const interactionStateText = computed(() => {
  if (props.loading) return t("common.loading");
  if (props.disabled) return t("common.disabled");
  if (props.readonly) return t("common.readonly");
  return "";
});
const switchLabel = computed(() => joinNonEmptyStrings([props.ariaLabel || props.label || t("common.switch"), currentText.value, interactionStateText.value], "\uFF0C"));
const switchDescribedBy = computed(() =>
  joinAriaIds([props.description ? descriptionId : undefined, currentText.value ? stateId : undefined, props.ariaDescribedby])
);

const computedValue = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (isReadonly.value) return;
    emit("update:modelValue", value);
    emit("change", value);
  },
});

const elSize = computed(() => toElementPlusSize(props.size));

const handleBeforeChange = () => !isReadonly.value;
</script>

<template>
  <label
    class="base-switch"
    :class="{
      'base-switch--checked': modelValue,
      [`base-switch--${size}`]: true,
      'base-switch--disabled': disabled,
      'base-switch--readonly': readonly,
      'base-switch--loading': loading,
      'base-switch--compact': compact,
      'base-switch--error': error,
      'base-switch--success': success
    }"
    :aria-disabled="isReadonly ? 'true' : undefined"
    :aria-readonly="readonly ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :aria-describedby="switchDescribedBy"
  >
    <span v-if="label || description" class="base-switch__text">
      <span v-if="label" :id="labelId" class="base-switch__label">{{ label }}</span>
      <span v-if="description" :id="descriptionId" class="base-switch__description">{{ description }}</span>
    </span>
    <span class="base-switch__control">
      <span v-if="currentText" :id="stateId" class="base-switch__state">{{ currentText }}</span>
      <el-switch
        v-model="computedValue"
        :disabled="disabled || loading"
        :loading="loading"
        :size="elSize"
        :active-value="true"
        :inactive-value="false"
        :aria-label="switchLabel"
        :aria-describedby="switchDescribedBy"
        :aria-disabled="isReadonly ? 'true' : undefined"
        :aria-readonly="readonly ? 'true' : undefined"
        :aria-busy="loading || undefined"
        :before-change="handleBeforeChange"
        :validate-event="false"
        style="--el-switch-on-color: rgb(var(--color-primary))"
        @focus="emit('focus', $event as FocusEvent)"
        @blur="emit('blur', $event as FocusEvent)"
      />
    </span>
  </label>
</template>

<style scoped>
.base-switch {
  @apply flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-colors dark:border-slate-800 dark:bg-slate-900;
}

.base-switch:hover:not(.base-switch--disabled):not(.base-switch--readonly):not(.base-switch--loading):not(.base-switch--checked):not(.base-switch--success):not(.base-switch--error) {
  @apply border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950;
}

.base-switch:focus-within {
  border-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.14);
}

.base-switch--checked {
  border-color: rgb(var(--color-primary) / 0.26);
  background-color: rgb(var(--color-primary) / 0.04);
}

.base-switch--checked:hover:not(.base-switch--disabled):not(.base-switch--readonly):not(.base-switch--loading) {
  border-color: rgb(var(--color-primary) / 0.42);
  background-color: rgb(var(--color-primary) / 0.08);
}

.base-switch--success {
  @apply border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950;
}

.base-switch--success:hover:not(.base-switch--disabled):not(.base-switch--readonly):not(.base-switch--loading) {
  @apply border-emerald-400 bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950;
}

.base-switch--error {
  @apply border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950;
}

.base-switch--error:hover:not(.base-switch--disabled):not(.base-switch--readonly):not(.base-switch--loading) {
  @apply border-red-400 bg-red-100 dark:border-red-800 dark:bg-red-950;
}

.base-switch--error:focus-within {
  @apply border-red-400;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.14);
}

.base-switch--disabled {
  @apply cursor-not-allowed opacity-60;
}

.base-switch--readonly,
.base-switch--loading {
  @apply cursor-default bg-slate-50 dark:bg-slate-950;
}

.base-switch--sm {
  @apply rounded-xl px-3 py-2;
}

.base-switch--xs {
  @apply rounded-xl px-3 py-2;
}

.base-switch--lg {
  @apply px-4 py-3.5;
}

.base-switch--compact {
  @apply rounded-xl px-3 py-2;
}

.base-switch__text {
  @apply min-w-0;
}

.base-switch__label {
  @apply block text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-switch__description {
  @apply mt-0.5 block text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-switch__control {
  @apply flex min-w-0 shrink-0 items-center gap-2;
}

.base-switch__state {
  @apply max-w-28 truncate text-[10px] font-black text-slate-400 dark:text-slate-500;
}

@media (prefers-reduced-motion: reduce) {
  .base-switch {
    transition: none !important;
  }

  :deep(.el-switch__core),
  :deep(.el-switch__action) {
    transition: none !important;
  }
}
</style>
