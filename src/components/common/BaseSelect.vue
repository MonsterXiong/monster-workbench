<script setup lang="ts">
import { computed, nextTick, ref, useId, watchEffect } from "vue";
import { useI18n } from "../../composables/useI18n";
import { getValueIdentity, isSameValueIdentity, joinAriaIds, joinNonEmptyStrings, normalizeStringKey } from "../../utils";

type SelectValue = string | number | boolean | Record<string, unknown> | null | undefined;
type SelectClearValue = SelectValue | SelectValue[] | (() => SelectValue | SelectValue[]);

interface Option {
  label: string;
  selectedLabel?: string;
  value: SelectValue;
  key?: string | number;
  filterText?: string;
  description?: string;
  meta?: string;
  icon?: string;
  disabled?: boolean;
}

interface Props {
  modelValue: SelectValue | SelectValue[];
  options: Option[];
  id?: string;
  name?: string;
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
  loadingText?: string;
  emptyText?: string;
  noMatchText?: string;
  teleported?: boolean;
  fitInputWidth?: boolean;
  popperClass?: string;
  size?: "xs" | "sm" | "md" | "lg";
  error?: boolean;
  errorMessage?: string;
  valueKey?: string;
  valueOnClear?: SelectClearValue;
  emptyValues?: Array<SelectValue | SelectValue[]>;
  ariaLabel?: string;
  ariaDescribedby?: string;
}

const props = withDefaults(defineProps<Props>(), {
  id: "",
  name: "",
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
  loadingText: "",
  emptyText: "",
  noMatchText: "",
  teleported: true,
  fitInputWidth: true,
  popperClass: "",
  size: "md",
  error: false,
  errorMessage: "",
  valueKey: "value",
  valueOnClear: undefined,
  emptyValues: () => ["", null, undefined, []],
  ariaLabel: "",
  ariaDescribedby: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", val: SelectValue | SelectValue[]): void;
  (e: "change", val: SelectValue | SelectValue[]): void;
  (e: "clear"): void;
  (e: "visible-change", val: boolean): void;
  (e: "remove-tag", val: SelectValue): void;
  (e: "focus", event: FocusEvent): void;
  (e: "blur", event: FocusEvent): void;
}>();

const { t } = useI18n();
const selectId = useId();
const rootRef = ref<HTMLElement | null>(null);
const errorId = `${selectId}-error`;

const resolvedAriaLabel = computed(() => props.ariaLabel || props.placeholder || t("common.selectPlaceholder"));
const resolvedErrorMessage = computed(() => props.errorMessage);
const describedBy = computed(() => joinAriaIds([props.ariaDescribedby, resolvedErrorMessage.value ? errorId : undefined]));

const resolvedPopperClass = computed(() => joinNonEmptyStrings(["base-select-popper", props.popperClass]));

const resolvedValueOnClear = computed(() => {
  if (props.multiple) return [];
  if (props.valueOnClear !== undefined) return props.valueOnClear;
  return "";
});

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

const getSelectValueIdentity = (value: unknown) => getValueIdentity(value, props.valueKey);

const isSameValue = (left: unknown, right: unknown) => {
  return isSameValueIdentity(left, right, props.valueKey);
};

const getOptionKey = (option: Option, index: number) => {
  const identity = getSelectValueIdentity(option.value);

  if (option.key !== undefined) return option.key;
  if (typeof identity === "string" && identity) return identity;
  if (typeof identity === "number") return identity;
  if (typeof identity === "boolean") return String(identity);

  return `${normalizeStringKey(option.label) || "option"}-${index}`;
};

const getOptionFilterLabel = (option: Option) => {
  return joinNonEmptyStrings([option.label, option.selectedLabel, option.description, option.meta, option.filterText]);
};

const getSelectedLabel = (label: string | number | undefined, value: unknown) => {
  const selectedOption = props.options.find((option) => isSameValue(option.value, value));
  return selectedOption?.selectedLabel || selectedOption?.label || String(label ?? "");
};

const syncComboboxAria = async () => {
  await nextTick();
  const input = rootRef.value?.querySelector<HTMLInputElement>('input[role="combobox"]');
  if (!input) return;

  input.setAttribute("aria-label", resolvedAriaLabel.value);

  if (describedBy.value) {
    input.setAttribute("aria-describedby", describedBy.value);
  } else {
    input.removeAttribute("aria-describedby");
  }

  if (props.error) {
    input.setAttribute("aria-invalid", "true");
  } else {
    input.removeAttribute("aria-invalid");
  }

  if (resolvedErrorMessage.value) {
    input.setAttribute("aria-errormessage", errorId);
  } else {
    input.removeAttribute("aria-errormessage");
  }

  if (props.loading) {
    input.setAttribute("aria-busy", "true");
  } else {
    input.removeAttribute("aria-busy");
  }
};

watchEffect(() => {
  void props.modelValue;
  void props.disabled;
  void props.loading;
  void props.error;
  void resolvedAriaLabel.value;
  void describedBy.value;
  void resolvedErrorMessage.value;
  void syncComboboxAria();
});

</script>

<template>
  <div ref="rootRef" class="base-select-shell">
    <el-select
      v-model="computedValue"
      :id="id || undefined"
      :name="name || undefined"
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
      :loading-text="loadingText || t('common.loading')"
      :no-data-text="emptyText || t('common.noData')"
      :no-match-text="noMatchText || emptyText || t('common.noData')"
      :teleported="teleported"
      :fit-input-width="fitInputWidth"
      :popper-class="resolvedPopperClass"
      :value-key="valueKey"
      :value-on-clear="resolvedValueOnClear"
      :empty-values="emptyValues"
      :size="elSize"
      :aria-label="resolvedAriaLabel"
      :aria-describedby="describedBy"
      :aria-disabled="disabled ? 'true' : undefined"
      :aria-invalid="error ? 'true' : undefined"
      :aria-errormessage="resolvedErrorMessage ? errorId : undefined"
      :aria-busy="loading ? 'true' : undefined"
      class="base-select"
      :class="[`base-select--${size}`, { 'is-disabled': disabled, 'is-error': error }]"
      @clear="emit('clear')"
      @visible-change="emit('visible-change', $event); syncComboboxAria()"
      @remove-tag="emit('remove-tag', $event)"
      @focus="emit('focus', $event); syncComboboxAria()"
      @blur="emit('blur', $event)"
    >
      <template #label="{ label, value }">
        <span class="base-select__selected-label">{{ getSelectedLabel(label, value) }}</span>
      </template>
      <el-option
        v-for="(opt, index) in options"
        :key="getOptionKey(opt, index)"
        :label="getOptionFilterLabel(opt)"
        :value="opt.value"
        :disabled="opt.disabled"
      >
        <span class="base-select__option">
          <span class="base-select__option-main">
            <BaseIcon v-if="opt.icon" :name="opt.icon" size="14" aria-hidden="true" />
            <span class="base-select__option-text">
              <span class="base-select__option-label">{{ opt.label }}</span>
              <small v-if="opt.description">{{ opt.description }}</small>
            </span>
          </span>
          <span v-if="opt.meta" class="base-select__option-meta">{{ opt.meta }}</span>
        </span>
      </el-option>
    </el-select>
    <p v-if="resolvedErrorMessage" :id="errorId" class="base-select__error" role="alert">{{ resolvedErrorMessage }}</p>
  </div>
</template>

<style scoped>
.base-select-shell {
  @apply min-w-0;
}

.base-select {
  @apply w-full;
}

:deep(.el-select__wrapper) {
  @apply rounded-xl border border-slate-300 bg-slate-50 px-3 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-950;
  box-shadow: none;
}

.base-select--xs :deep(.el-select__wrapper) {
  min-height: 28px;
  @apply rounded-lg px-2.5;
}

.base-select--lg :deep(.el-select__wrapper) {
  min-height: 40px;
  @apply px-3.5;
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

.base-select__selected-label {
  @apply block min-w-0 max-w-full truncate;
}

:deep(.el-tag) {
  @apply rounded-lg border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200;
}

.base-select__option {
  @apply flex min-w-0 items-center justify-between gap-3 overflow-hidden py-1;
}

.base-select__option-main {
  @apply flex min-w-0 flex-1 items-center gap-2;
}

.base-select__option-main :deep(svg) {
  @apply shrink-0 text-slate-400;
}

.base-select__option-text {
  @apply flex min-w-0 flex-1 flex-col;
}

.base-select__option-label {
  @apply block truncate text-xs font-bold;
}

.base-select__option-text small {
  @apply mt-0.5 block truncate text-[10px] font-bold leading-4 text-slate-400;
}

.base-select__option-meta {
  @apply min-w-0 max-w-28 shrink-0 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300;
}

.base-select.is-disabled :deep(.el-select__wrapper) {
  @apply cursor-not-allowed bg-slate-100 opacity-70 dark:bg-slate-900;
}

.is-error :deep(.el-select__wrapper) {
  @apply border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950;
}

.is-error :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.14);
}

.base-select__error {
  @apply mt-1.5 text-[10px] font-bold leading-4 text-red-500 dark:text-red-300;
}

:global(.base-select-popper.el-popper) {
  --el-color-primary: rgb(var(--color-primary));
}

:global(.base-select-popper .el-select-dropdown) {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow:
    0 18px 42px rgba(15, 23, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

:global(.base-select-popper .el-select-dropdown__list) {
  padding: 6px;
}

:global(.base-select-popper .el-select-dropdown__item) {
  height: auto;
  min-height: 38px;
  border-radius: 10px;
  padding: 0 10px;
  color: #334155;
  line-height: 1.25;
  overflow: hidden;
  transition:
    background-color 0.16s ease,
    color 0.16s ease;
}

:global(.base-select-popper .el-select-dropdown__item.hover),
:global(.base-select-popper .el-select-dropdown__item:hover) {
  background: #f1f5f9;
  color: #0f172a;
}

:global(.base-select-popper .el-select-dropdown__item.selected) {
  background: rgb(var(--color-primary) / 0.1);
  color: rgb(var(--color-primary));
  font-weight: 800;
}

:global(.base-select-popper .el-select-dropdown__item.is-disabled) {
  opacity: 0.48;
}

:global(.base-select-popper .el-select-dropdown__empty) {
  padding: 18px 12px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
}

:global(.dark .base-select-popper .el-select-dropdown) {
  border-color: #1e293b;
  background: #0f172a;
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(148, 163, 184, 0.08);
}

:global(.dark .base-select-popper .el-select-dropdown__item) {
  color: #cbd5e1;
}

:global(.dark .base-select-popper .el-select-dropdown__item.hover),
:global(.dark .base-select-popper .el-select-dropdown__item:hover) {
  background: #1e293b;
  color: #f8fafc;
}

:global(.dark .base-select-popper .el-select-dropdown__item.selected) {
  background: rgb(var(--color-primary) / 0.18);
  color: rgb(var(--color-primary));
}
</style>
