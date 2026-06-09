<script setup lang="ts">
import { computed, ref, useId } from "vue";
import { LoaderCircle, Plus, X } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import {
  getLastIndex,
  hasItem,
  includesAnyText,
  isEmptyArray,
  isKeyboardKey,
  isNonEmptyArray,
  lastItem,
  mergeLimitedUniqueItems,
  removeAt,
  removeByValue,
  splitBySeparators,
} from "../../utils";

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

const draft = ref("");
const { t } = useI18n();
const inputId = useId();
const countId = `${inputId}-count`;

const isLocked = computed(() => props.disabled || props.readonly || props.loading);
const canAdd = computed(() => !isLocked.value && props.modelValue.length < props.max);
const canRemove = computed(() => !isLocked.value);
const canClear = computed(() => props.clearable && canRemove.value && isNonEmptyArray(props.modelValue));
const tagInputLabel = computed(() => props.inputAriaLabel || props.placeholder || t("common.tagInputPlaceholder"));
const rootLabel = computed(() => props.ariaLabel || tagInputLabel.value);
const countText = computed(() => `${props.modelValue.length}/${props.max}`);
const countLabel = computed(() => `${t("common.tagCount")}: ${countText.value}`);
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedClearLabel = computed(() => props.clearLabel || t("common.clear"));
const describedBy = computed(() => (props.showCount ? countId : undefined));

const splitDraft = (value: string) => {
  return splitBySeparators(value, props.separators);
};

const mergeTags = (nextTags: string[]) => {
  const { items: mergedTags, added: addedTags } = mergeLimitedUniqueItems(props.modelValue, nextTags, {
    max: props.max,
    allowDuplicates: props.allowDuplicates,
  });

  if (isEmptyArray(addedTags)) return false;
  emit("update:modelValue", mergedTags);
  emit("change", mergedTags);
  addedTags.forEach((tag) => emit("add", tag));
  return true;
};

const addTag = () => {
  if (!canAdd.value) return;
  const nextTags = splitDraft(draft.value);
  if (isEmptyArray(nextTags)) {
    draft.value = "";
    return;
  }
  mergeTags(nextTags);
  draft.value = "";
};

const removeTag = (tag: string, index: number) => {
  if (!canRemove.value) return;
  const nextTags = props.allowDuplicates ? removeAt(props.modelValue, index) : removeByValue(props.modelValue, (item) => item, tag);
  emit("update:modelValue", nextTags);
  emit("change", nextTags);
  emit("remove", tag);
};

const clearTags = () => {
  if (!canClear.value) return;
  emit("update:modelValue", []);
  emit("change", []);
  emit("clear");
};

const handleKeydown = (event: KeyboardEvent) => {
  if (isKeyboardKey(event, "Enter") || hasItem(props.separators, event.key)) {
    event.preventDefault();
    addTag();
  }
  if (isKeyboardKey(event, "Backspace") && !draft.value && isNonEmptyArray(props.modelValue)) {
    const tag = lastItem(props.modelValue);
    if (tag) removeTag(tag, getLastIndex(props.modelValue));
  }
};

const handlePaste = (event: ClipboardEvent) => {
  if (isLocked.value) return;
  const text = event.clipboardData?.getData("text") || "";
  if (!text || !includesAnyText(text, props.separators, { trimKeyword: false })) return;
  event.preventDefault();
  mergeTags(splitDraft(text));
};

const handleBlur = (event: FocusEvent) => {
  if (props.addOnBlur) addTag();
  emit("blur", event);
};
</script>

<template>
  <div
    class="base-tag-input"
    :class="{
      'is-disabled': disabled,
      'is-readonly': readonly,
      'is-error': error,
      'is-success': success && !error,
      'is-loading': loading,
      'is-compact': compact,
      [`base-tag-input--${size}`]: true,
    }"
    role="group"
    :aria-label="rootLabel"
    :aria-describedby="describedBy"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-readonly="readonly ? 'true' : undefined"
    :aria-invalid="error ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
  >
    <span v-for="(tag, index) in modelValue" :key="`${tag}-${index}`" class="base-tag-input__tag">
      <span>{{ tag }}</span>
      <button
        v-if="canRemove"
        type="button"
        :aria-label="`${t('common.removeTag')}: ${tag}`"
        :title="`${t('common.removeTag')}: ${tag}`"
        @click="removeTag(tag, index)"
      >
        <X class="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
    <span v-if="canAdd" class="base-tag-input__draft">
      <Plus v-if="showAddIcon" class="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
      <input
        v-model="draft"
        :placeholder="tagInputLabel"
        :disabled="disabled"
        :aria-label="tagInputLabel"
        :aria-describedby="describedBy"
        @keydown="handleKeydown"
        @paste="handlePaste"
        @focus="emit('focus', $event)"
        @blur="handleBlur"
      />
    </span>
    <button
      v-if="canClear"
      type="button"
      class="base-tag-input__clear"
      :aria-label="resolvedClearLabel"
      :title="resolvedClearLabel"
      @click="clearTags"
    >
      <X class="h-3.5 w-3.5" aria-hidden="true" />
    </button>
    <span v-if="loading" class="base-tag-input__loading" role="status" aria-live="polite" :aria-label="resolvedLoadingText">
      <LoaderCircle class="h-3.5 w-3.5" aria-hidden="true" />
      <span>{{ resolvedLoadingText }}</span>
    </span>
    <span v-if="showCount" :id="countId" class="base-tag-input__count" role="status" aria-live="polite" :aria-label="countLabel">
      {{ countText }}
    </span>
  </div>
</template>

<style scoped>
.base-tag-input {
  @apply flex min-h-10 w-full min-w-0 flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-950;
}

.base-tag-input:focus-within {
  border-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.15);
  @apply bg-white dark:bg-slate-900;
}

.base-tag-input.is-disabled {
  @apply cursor-not-allowed opacity-60;
}

.base-tag-input.is-readonly {
  @apply bg-slate-100 dark:bg-slate-900;
}

.base-tag-input.is-loading {
  @apply bg-slate-100 dark:bg-slate-900;
}

.base-tag-input.is-error {
  @apply border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950;
}

.base-tag-input.is-success {
  @apply border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950;
}

.base-tag-input--sm,
.base-tag-input.is-compact {
  @apply min-h-8 gap-1.5 px-2 py-1.5;
}

.base-tag-input--lg {
  @apply min-h-12 gap-2.5 px-3 py-2.5;
}

.base-tag-input__tag {
  @apply inline-flex h-6 max-w-full items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200;
}

.base-tag-input--lg .base-tag-input__tag {
  @apply h-7 text-xs;
}

.base-tag-input.is-compact .base-tag-input__tag {
  @apply h-5 text-[10px];
}

.base-tag-input__tag span {
  @apply truncate;
}

.base-tag-input__tag button {
  @apply flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

.base-tag-input__draft {
  @apply flex h-6 min-w-28 flex-1 items-center gap-1;
}

.base-tag-input__draft input {
  @apply min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-slate-100;
}

.base-tag-input__clear {
  @apply ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

.base-tag-input__loading {
  color: rgb(var(--color-primary));
  @apply ml-auto inline-flex h-6 shrink-0 items-center gap-1 rounded-lg px-1.5 text-[10px] font-black;
}

.base-tag-input__loading svg {
  animation: base-tag-input-spin 0.9s linear infinite;
}

.base-tag-input__count {
  @apply ml-auto shrink-0 text-[10px] font-black text-slate-400 dark:text-slate-500;
}

.base-tag-input__clear + .base-tag-input__count,
.base-tag-input__loading + .base-tag-input__count {
  @apply ml-0;
}

@media (prefers-reduced-motion: reduce) {
  .base-tag-input,
  .base-tag-input__tag button,
  .base-tag-input__clear {
    transition: none !important;
  }

  .base-tag-input__loading svg {
    animation: none !important;
  }
}

@keyframes base-tag-input-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
