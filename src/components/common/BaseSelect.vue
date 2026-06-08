<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";

interface Option {
  label: string;
  selectedLabel?: string;
  value: any;
  disabled?: boolean;
}

interface Props {
  modelValue: any;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  filterable?: boolean;
  multiple?: boolean;
  collapseTags?: boolean;
  collapseTagsTooltip?: boolean;
  maxCollapseTags?: number;
  multipleLimit?: number;
  loading?: boolean;
  emptyText?: string;
  teleported?: boolean;
  fitInputWidth?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  error?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "",
  disabled: false,
  clearable: false,
  filterable: false,
  multiple: false,
  collapseTags: true,
  collapseTagsTooltip: true,
  maxCollapseTags: 2,
  multipleLimit: 0,
  loading: false,
  emptyText: "",
  teleported: true,
  fitInputWidth: true,
  size: "md",
  error: false,
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", val: any): void;
  (e: "change", val: any): void;
  (e: "clear"): void;
  (e: "visible-change", val: boolean): void;
  (e: "remove-tag", val: any): void;
  (e: "focus", event: FocusEvent): void;
  (e: "blur", event: FocusEvent): void;
}>();

const { t } = useI18n();

const resolvedAriaLabel = computed(() => props.ariaLabel || props.placeholder || t("common.selectPlaceholder"));

const elSize = computed(() => {
  if (props.size === "xs") return "small";
  if (props.size === "sm") return "small";
  if (props.size === "lg") return "large";
  return "default";
});

const computedValue = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit("update:modelValue", val);
    emit("change", val);
  },
});
</script>

<template>
  <el-select
    v-model="computedValue"
    :disabled="disabled"
    :placeholder="placeholder || t('common.selectPlaceholder')"
    :clearable="clearable"
    :filterable="filterable"
    :multiple="multiple"
    :collapse-tags="collapseTags"
    :collapse-tags-tooltip="collapseTagsTooltip"
    :max-collapse-tags="maxCollapseTags"
    :multiple-limit="multipleLimit"
    :loading="loading"
    :no-data-text="emptyText || t('common.noData')"
    :teleported="teleported"
    :fit-input-width="fitInputWidth"
    :size="elSize"
    :aria-label="resolvedAriaLabel"
    :aria-invalid="error || undefined"
    class="base-select"
    :class="{ 'is-error': error }"
    @clear="emit('clear')"
    @visible-change="emit('visible-change', $event)"
    @remove-tag="emit('remove-tag', $event)"
    @focus="emit('focus', $event)"
    @blur="emit('blur', $event)"
  >
    <el-option
      v-for="opt in options"
      :key="opt.value"
      :label="opt.selectedLabel || opt.label"
      :value="opt.value"
      :disabled="opt.disabled"
    >
      <span class="base-select__option-label">{{ opt.label }}</span>
    </el-option>
  </el-select>
</template>

<style scoped>
.base-select {
  @apply w-full;
}

:deep(.el-select__wrapper) {
  @apply rounded-xl border border-slate-300 bg-slate-50 px-3 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-950;
  box-shadow: none;
}

:deep(.el-select__wrapper:hover) {
  @apply border-slate-400 bg-white dark:border-slate-600 dark:bg-slate-900;
  box-shadow: none;
}

:deep(.el-select__wrapper.is-focused) {
  border-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.15);
  @apply bg-white dark:bg-slate-900;
}

:deep(.el-select__selected-item),
:deep(.el-select__placeholder),
:deep(.el-select__input) {
  @apply text-xs font-bold text-slate-700 dark:text-slate-100;
}

:deep(.el-select__placeholder.is-transparent) {
  @apply text-slate-400;
}

:deep(.el-select__tags-text) {
  @apply text-[11px] font-bold;
}

:deep(.el-tag) {
  @apply rounded-lg border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200;
}

.base-select__option-label {
  @apply block whitespace-nowrap text-xs font-bold;
}

:deep(.el-select.is-disabled .el-select__wrapper) {
  @apply cursor-not-allowed bg-slate-100 opacity-70 dark:bg-slate-900;
}

.is-error :deep(.el-select__wrapper) {
  @apply border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950;
}

.is-error :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.14);
}
</style>
