<script setup lang="ts">
import { computed, ref, useId, watch, watchEffect } from "vue";
import { LoaderCircle, Plus } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { escapeRegExp, mergeLimitedUniqueItems } from "../../utils";
import { syncElementPlusClearButtonLabel } from "./elementPlusDom";

type TagInputSize = "sm" | "md" | "lg";

interface Props {
  modelValue: string[];
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  error?: boolean;
  success?: boolean;
  loading?: boolean;
  loadingText?: string;
  compact?: boolean;
  size?: TagInputSize;
  max?: number;
  allowDuplicates?: boolean;
  addOnBlur?: boolean;
  clearable?: boolean;
  showCount?: boolean;
  showAddIcon?: boolean;
  separators?: string[];
  collapseTags?: boolean;
  collapseTagsTooltip?: boolean;
  maxCollapseTags?: number;
  draggable?: boolean;
  ariaLabel?: string;
  inputAriaLabel?: string;
  clearLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "",
  disabled: false,
  readonly: false,
  error: false,
  success: false,
  loading: false,
  loadingText: "",
  compact: false,
  size: "md",
  max: 12,
  allowDuplicates: false,
  addOnBlur: true,
  clearable: false,
  showCount: true,
  showAddIcon: true,
  separators: () => [",", "，", "\n"],
  collapseTags: false,
  collapseTagsTooltip: true,
  maxCollapseTags: 1,
  draggable: false,
  ariaLabel: "",
  inputAriaLabel: "",
  clearLabel: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
  (e: "change", value: string[]): void;
  (e: "add", value: string): void;
  (e: "remove", value: string): void;
  (e: "clear"): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
}>();

const { t } = useI18n();
const inputId = useId();
const countId = `${inputId}-count`;
const tagInputRef = ref<HTMLElement | null>(null);
const internalValue = ref<string[]>(normalizeTags(props.modelValue));

watch(
  () => props.modelValue,
  (nextValue) => {
    internalValue.value = normalizeTags(nextValue);
  },
  { deep: true }
);

const isLocked = computed(() => props.disabled || props.readonly || props.loading);
const canClear = computed(() => props.clearable && !isLocked.value && internalValue.value.length > 0);
const tagInputLabel = computed(() => props.inputAriaLabel || props.placeholder || t("common.tagInputPlaceholder"));
const rootLabel = computed(() => props.ariaLabel || tagInputLabel.value);
const countText = computed(() => `${internalValue.value.length}/${props.max}`);
const countLabel = computed(() => `${t("common.tagCount")}: ${countText.value}`);
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedClearLabel = computed(() => props.clearLabel || t("common.clear"));
const describedBy = computed(() => (props.showCount ? countId : undefined));
const elementSize = computed(() => {
  if (props.compact || props.size === "sm") return "small";
  if (props.size === "lg") return "large";
  return "default";
});
const delimiter = computed(() => {
  if (props.separators.length === 0) return "";
  return new RegExp(props.separators.map(escapeRegExp).join("|"));
});
const hasReachedLimit = computed(() => internalValue.value.length >= props.max);

function syncClearButtonLabel() {
  return syncElementPlusClearButtonLabel(tagInputRef.value, ".el-input-tag__clear", resolvedClearLabel.value);
}

watchEffect(() => {
  void internalValue.value.length;
  void canClear.value;
  void resolvedClearLabel.value;
  void syncClearButtonLabel();
});

function normalizeTags(value: readonly string[] = []) {
  const { items } = mergeLimitedUniqueItems([], value.map((item) => String(item ?? "").trim()).filter(Boolean), {
    max: props.max,
    allowDuplicates: props.allowDuplicates,
  });

  return items;
}

function getAddedTags(previousValue: readonly string[], nextValue: readonly string[]) {
  const remaining = [...previousValue];

  return nextValue.filter((tag) => {
    const index = remaining.indexOf(tag);
    if (index >= 0) {
      remaining.splice(index, 1);
      return false;
    }
    return true;
  });
}

function getRemovedTags(previousValue: readonly string[], nextValue: readonly string[]) {
  const remaining = [...nextValue];

  return previousValue.filter((tag) => {
    const index = remaining.indexOf(tag);
    if (index >= 0) {
      remaining.splice(index, 1);
      return false;
    }
    return true;
  });
}

function emitValue(nextValue: string[]) {
  internalValue.value = nextValue;
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
}

function handleValueUpdate(value?: string[]) {
  if (isLocked.value) return;

  const previousValue = internalValue.value;
  const normalizedValue = normalizeTags(value ?? []);
  emitValue(normalizedValue);
  getAddedTags(previousValue, normalizedValue).forEach((tag) => emit("add", tag));
  getRemovedTags(previousValue, normalizedValue).forEach((tag) => emit("remove", tag));
}

function handleClear() {
  emit("clear");
}
</script>

<template>
  <div
    ref="tagInputRef"
    class="base-tag-input"
    :class="{
      'is-disabled': disabled,
      'is-readonly': readonly,
      'is-error': error,
      'is-success': success && !error,
      'is-loading': loading,
      'is-compact': compact,
      'is-full': hasReachedLimit,
      [`base-tag-input--${size}`]: true,
    }"
    role="group"
    :aria-label="rootLabel"
    :aria-describedby="describedBy"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-readonly="readonly ? 'true' : undefined"
    :aria-invalid="error ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    @mouseenter="syncClearButtonLabel"
    @focusin="syncClearButtonLabel"
  >
    <el-input-tag
      :id="inputId"
      class="base-tag-input__control"
      :model-value="internalValue"
      :placeholder="tagInputLabel"
      :disabled="disabled || loading"
      :readonly="readonly || loading || hasReachedLimit"
      :max="max"
      :size="elementSize"
      :clearable="canClear"
      :delimiter="delimiter"
      :save-on-blur="addOnBlur"
      :collapse-tags="collapseTags"
      :collapse-tags-tooltip="collapseTagsTooltip"
      :max-collapse-tags="maxCollapseTags"
      :draggable="draggable && !isLocked"
      :aria-label="tagInputLabel"
      :aria-describedby="describedBy"
      :validate-event="false"
      tag-type="info"
      tag-effect="light"
      @update:model-value="handleValueUpdate"
      @clear="handleClear"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    >
      <template v-if="showAddIcon && !isLocked && !hasReachedLimit" #prefix>
        <Plus class="base-tag-input__prefix-icon" aria-hidden="true" />
      </template>
      <template #suffix>
        <span v-if="loading" class="base-tag-input__loading" role="status" aria-live="polite" :aria-label="resolvedLoadingText">
          <LoaderCircle class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ resolvedLoadingText }}</span>
        </span>
        <span v-if="showCount" :id="countId" class="base-tag-input__count" role="status" aria-live="polite" :aria-label="countLabel">
          {{ countText }}
        </span>
      </template>
    </el-input-tag>
  </div>
</template>

<style scoped>
.base-tag-input {
  @apply w-full min-w-0;
}

.base-tag-input__control {
  @apply w-full;
  --el-input-tag-mini-height: 40px;
  --el-input-tag-gap: 8px;
  --el-input-tag-padding: 7px 10px;
  --el-input-tag-inner-padding: 0;
  --el-input-tag-line-height: 24px;
  --el-input-tag-font-size: 12px;
  --el-input-tag-text-color: #334155;
  --el-input-tag-placeholder-color: #94a3b8;
  --el-input-tag-input-focus-border-color: rgb(var(--color-primary));
  border-radius: 12px;
  background-color: #f8fafc;
  box-shadow:
    0 0 0 1px #cbd5e1 inset,
    0 1px 2px rgba(15, 23, 42, 0.04);
}

.base-tag-input__control:hover {
  background-color: #ffffff;
  box-shadow:
    0 0 0 1px #94a3b8 inset,
    0 1px 2px rgba(15, 23, 42, 0.04);
}

.base-tag-input__control.is-focused,
.base-tag-input:focus-within .base-tag-input__control {
  background-color: #ffffff;
  box-shadow:
    0 0 0 1px rgb(var(--color-primary)) inset,
    0 0 0 3px rgb(var(--color-primary) / 0.15);
}

.base-tag-input--sm .base-tag-input__control,
.base-tag-input.is-compact .base-tag-input__control {
  --el-input-tag-mini-height: 32px;
  --el-input-tag-gap: 6px;
  --el-input-tag-padding: 5px 8px;
  --el-input-tag-line-height: 20px;
  --el-input-tag-font-size: 11px;
  border-radius: 10px;
}

.base-tag-input--lg .base-tag-input__control {
  --el-input-tag-mini-height: 48px;
  --el-input-tag-padding: 9px 12px;
  --el-input-tag-font-size: 13px;
}

.base-tag-input.is-disabled {
  @apply cursor-not-allowed opacity-60;
}

.base-tag-input.is-disabled .base-tag-input__control,
.base-tag-input.is-readonly .base-tag-input__control,
.base-tag-input.is-loading .base-tag-input__control,
.base-tag-input.is-full .base-tag-input__control {
  background-color: #f1f5f9;
}

.base-tag-input.is-error .base-tag-input__control {
  background-color: #fef2f2;
  box-shadow: 0 0 0 1px #f87171 inset;
}

.base-tag-input.is-error .base-tag-input__control.is-focused,
.base-tag-input.is-error:focus-within .base-tag-input__control {
  box-shadow:
    0 0 0 1px #ef4444 inset,
    0 0 0 3px rgba(239, 68, 68, 0.14);
}

.base-tag-input.is-success .base-tag-input__control {
  background-color: #ecfdf5;
  box-shadow: 0 0 0 1px #6ee7b7 inset;
}

.base-tag-input__prefix-icon {
  @apply h-3.5 w-3.5 text-slate-400;
}

.base-tag-input__control :deep(.el-input-tag__prefix) {
  @apply pl-1 pr-0;
}

.base-tag-input__control :deep(.el-input-tag__suffix) {
  @apply min-w-0 gap-1 pl-1 pr-0;
}

.base-tag-input__control :deep(.el-input-tag__inner) {
  @apply min-w-0;
}

.base-tag-input__control :deep(.el-input-tag__input) {
  @apply text-xs font-bold;
}

.base-tag-input__control :deep(.el-tag) {
  @apply max-w-full rounded-lg border-slate-200 bg-white px-2 text-[11px] font-black text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200;
}

.base-tag-input--lg .base-tag-input__control :deep(.el-tag) {
  @apply text-xs;
}

.base-tag-input.is-compact .base-tag-input__control :deep(.el-tag) {
  @apply text-[10px];
}

.base-tag-input__control :deep(.el-tag__close) {
  @apply text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

.base-tag-input__loading {
  color: rgb(var(--color-primary));
  @apply inline-flex h-6 shrink-0 items-center gap-1 rounded-lg px-1.5 text-[10px] font-black;
}

.base-tag-input__loading svg {
  animation: base-tag-input-spin 0.9s linear infinite;
}

.base-tag-input__count {
  @apply shrink-0 text-[10px] font-black text-slate-400 dark:text-slate-500;
}

:global(.dark) .base-tag-input__control {
  --el-input-tag-text-color: #f1f5f9;
  background-color: #020617;
  box-shadow:
    0 0 0 1px #334155 inset,
    0 1px 2px rgba(0, 0, 0, 0.18);
}

:global(.dark) .base-tag-input__control:hover,
:global(.dark) .base-tag-input__control.is-focused,
:global(.dark) .base-tag-input:focus-within .base-tag-input__control {
  background-color: #0f172a;
}

:global(.dark) .base-tag-input.is-disabled .base-tag-input__control,
:global(.dark) .base-tag-input.is-readonly .base-tag-input__control,
:global(.dark) .base-tag-input.is-loading .base-tag-input__control,
:global(.dark) .base-tag-input.is-full .base-tag-input__control {
  background-color: #0f172a;
}

:global(.dark) .base-tag-input.is-error .base-tag-input__control {
  background-color: #450a0a;
  box-shadow: 0 0 0 1px #991b1b inset;
}

:global(.dark) .base-tag-input.is-success .base-tag-input__control {
  background-color: #052e16;
  box-shadow: 0 0 0 1px #047857 inset;
}

@media (prefers-reduced-motion: reduce) {
  .base-tag-input__control,
  .base-tag-input__loading svg {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes base-tag-input-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
