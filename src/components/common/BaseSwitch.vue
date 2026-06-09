<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";

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
  size?: "sm" | "md" | "lg";
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

const isReadonly = computed(() => props.disabled || props.readonly || props.loading);
const switchLabel = computed(() => props.ariaLabel || props.label || t("common.switch"));
const currentText = computed(() => (props.modelValue ? props.activeText : props.inactiveText));

const computedValue = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (isReadonly.value) return;
    emit("update:modelValue", value);
    emit("change", value);
  },
});

const elSize = computed(() => {
  if (props.size === "sm") return "small";
  if (props.size === "lg") return "large";
  return "default";
});
</script>

<template>
  <label
    class="base-switch"
    :class="{
      'base-switch--checked': modelValue,
      'base-switch--disabled': disabled,
      'base-switch--readonly': readonly,
      'base-switch--loading': loading,
      'base-switch--compact': compact,
      'base-switch--error': error,
      'base-switch--success': success
    }"
    :aria-disabled="isReadonly ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
  >
    <span v-if="label || description" class="base-switch__text">
      <span v-if="label" :id="labelId" class="base-switch__label">{{ label }}</span>
      <span v-if="description" :id="descriptionId" class="base-switch__description">{{ description }}</span>
    </span>
    <span class="base-switch__control">
      <span v-if="currentText" class="base-switch__state" aria-hidden="true">{{ currentText }}</span>
      <el-switch
        v-model="computedValue"
        :disabled="disabled || readonly || loading"
        :loading="loading"
        :size="elSize"
        :active-value="true"
        :inactive-value="false"
        :aria-label="switchLabel"
        :aria-labelledby="label ? labelId : undefined"
        :aria-describedby="description ? descriptionId : undefined"
        :aria-disabled="isReadonly ? 'true' : undefined"
        :aria-busy="loading || undefined"
        style="--el-switch-on-color: rgb(var(--color-primary))"
        @focus="emit('focus', $event as FocusEvent)"
        @blur="emit('blur', $event as FocusEvent)"
      />
    </span>
  </label>
</template>

<style scoped>
.base-switch {
  @apply flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-colors dark:border-slate-800 dark:bg-slate-900;
}

.base-switch:hover {
  @apply border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950;
}

.base-switch--checked {
  border-color: rgba(var(--color-primary), 0.26);
  background-color: rgba(var(--color-primary), 0.04);
}

.base-switch--success {
  @apply border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950;
}

.base-switch--error {
  @apply border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950;
}

.base-switch--disabled {
  @apply cursor-not-allowed opacity-60;
}

.base-switch--readonly,
.base-switch--loading {
  @apply cursor-default bg-slate-50 dark:bg-slate-950;
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
  @apply flex shrink-0 items-center gap-2;
}

.base-switch__state {
  @apply text-[10px] font-black text-slate-400 dark:text-slate-500;
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
