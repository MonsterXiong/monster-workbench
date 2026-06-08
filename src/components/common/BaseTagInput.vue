<script setup lang="ts">
import { computed, ref, useId } from "vue";
import { Plus, X } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { lastItem, mergeLimitedUniqueItems, removeFirstMatching, splitBySeparators } from "../../utils";

interface Props {
  modelValue: string[];
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  error?: boolean;
  compact?: boolean;
  max?: number;
  allowDuplicates?: boolean;
  addOnBlur?: boolean;
  separators?: string[];
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "",
  disabled: false,
  readonly: false,
  error: false,
  compact: false,
  max: 12,
  allowDuplicates: false,
  addOnBlur: true,
  separators: () => [",", "，", "\n"],
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
  (e: "change", value: string[]): void;
  (e: "add", value: string): void;
  (e: "remove", value: string): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
}>();

const draft = ref("");
const { t } = useI18n();
const inputId = useId();
const countId = `${inputId}-count`;

const isReadonly = computed(() => props.disabled || props.readonly);
const canAdd = computed(() => !isReadonly.value && props.modelValue.length < props.max);
const tagInputLabel = computed(() => props.ariaLabel || props.placeholder || t("common.tagInputPlaceholder"));
const countText = computed(() => `${props.modelValue.length}/${props.max}`);
const countLabel = computed(() => `${t("common.tagCount")}: ${countText.value}`);

const splitDraft = (value: string) => {
  return splitBySeparators(value, props.separators);
};

const mergeTags = (nextTags: string[]) => {
  const { items: mergedTags, added: addedTags } = mergeLimitedUniqueItems(props.modelValue, nextTags, {
    max: props.max,
    allowDuplicates: props.allowDuplicates,
  });

  if (!addedTags.length) return false;
  emit("update:modelValue", mergedTags);
  emit("change", mergedTags);
  addedTags.forEach((tag) => emit("add", tag));
  return true;
};

const addTag = () => {
  if (!canAdd.value) return;
  const nextTags = splitDraft(draft.value);
  if (!nextTags.length) {
    draft.value = "";
    return;
  }
  mergeTags(nextTags);
  draft.value = "";
};

const removeTag = (tag: string) => {
  if (isReadonly.value) return;
  const nextTags = props.allowDuplicates
    ? removeFirstMatching(props.modelValue, (item) => item === tag)
    : props.modelValue.filter((item) => item !== tag);
  emit("update:modelValue", nextTags);
  emit("change", nextTags);
  emit("remove", tag);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" || props.separators.includes(event.key)) {
    event.preventDefault();
    addTag();
  }
  if (event.key === "Backspace" && !draft.value && props.modelValue.length > 0) {
    const tag = lastItem(props.modelValue);
    if (tag) removeTag(tag);
  }
};

const handlePaste = (event: ClipboardEvent) => {
  const text = event.clipboardData?.getData("text") || "";
  if (!text || !props.separators.some((separator) => text.includes(separator))) return;
  event.preventDefault();
  mergeTags(splitDraft(text));
};

const handleBlur = (event: FocusEvent) => {
  if (props.addOnBlur) addTag();
  emit("blur", event);
};
</script>

<template>
  <label
    class="base-tag-input"
    :class="{
      'is-disabled': disabled,
      'is-readonly': readonly,
      'is-error': error,
      'is-compact': compact
    }"
  >
    <span v-for="tag in modelValue" :key="tag" class="base-tag-input__tag">
      <span>{{ tag }}</span>
      <button
        v-if="!readonly"
        type="button"
        :disabled="disabled"
        :aria-label="`${t('common.removeTag')}: ${tag}`"
        :title="`${t('common.removeTag')}: ${tag}`"
        @click="removeTag(tag)"
      >
        <X class="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
    <span v-if="canAdd" class="base-tag-input__draft">
      <Plus class="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
      <input
        v-model="draft"
        :placeholder="tagInputLabel"
        :disabled="disabled"
        :aria-label="tagInputLabel"
        :aria-describedby="countId"
        @keydown="handleKeydown"
        @paste="handlePaste"
        @focus="emit('focus', $event)"
        @blur="handleBlur"
      />
    </span>
    <span :id="countId" class="base-tag-input__count" role="status" aria-live="polite" :aria-label="countLabel">
      {{ countText }}
    </span>
  </label>
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

.base-tag-input.is-error {
  @apply border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950;
}

.base-tag-input.is-compact {
  @apply min-h-8 gap-1.5 px-2 py-1.5;
}

.base-tag-input__tag {
  @apply inline-flex h-6 max-w-full items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200;
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

.base-tag-input__count {
  @apply ml-auto shrink-0 text-[10px] font-black text-slate-400 dark:text-slate-500;
}

@media (prefers-reduced-motion: reduce) {
  .base-tag-input,
  .base-tag-input__tag button {
    transition: none !important;
  }
}
</style>
