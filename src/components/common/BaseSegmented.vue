<script setup lang="ts">
import type { SegmentedInstance } from "element-plus";
import { computed, nextTick, onBeforeUpdate, ref, useAttrs, useId } from "vue";
import type { ComponentPublicInstance } from "vue";
import { filterByFalsyValue, findByValue, findIndexByValue, findNextCircularItem, firstItem, getBoundaryItem, getKeyboardBoundaryPosition, getKeyboardNavigationDirection, omit } from "../../utils";
import BaseIcon from "./BaseIcon.vue";
import { getElementPlusControlRoot, toElementPlusSize, type ProjectControlSize } from "./elementPlusDom";

defineOptions({
  inheritAttrs: false,
});

export interface SegmentedOption {
  label: string;
  value: string | number;
  icon?: string;
  description?: string;
  meta?: string;
  disabled?: boolean;
}

interface Props {
  modelValue: string | number;
  options: SegmentedOption[];
  id?: string;
  size?: ProjectControlSize;
  disabled?: boolean;
  readonly?: boolean;
  loading?: boolean;
  compact?: boolean;
  block?: boolean;
  wrap?: boolean;
  detailed?: boolean;
  error?: boolean;
  success?: boolean;
  loadingText?: string;
  validateEvent?: boolean;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
}

const props = withDefaults(defineProps<Props>(), {
  id: "",
  size: "md",
  disabled: false,
  readonly: false,
  loading: false,
  compact: false,
  block: false,
  wrap: false,
  detailed: false,
  error: false,
  success: false,
  loadingText: "",
  validateEvent: false,
  ariaLabel: "",
  ariaLabelledby: "",
  ariaDescribedby: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string | number): void;
  (e: "change", value: string | number): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
  (e: "keydown", value: KeyboardEvent): void;
}>();

const attrs = useAttrs();
const groupId = useId();
const nativeSegmentedRef = ref<SegmentedInstance | null>(null);
const customSegmentedRef = ref<HTMLElement | null>(null);
const optionRefs = ref<Array<HTMLButtonElement | null>>([]);
const isReadonly = computed(() => props.disabled || props.readonly || props.loading);
const usesNativeSegmented = computed(() => !props.detailed && !props.wrap && !props.readonly && !props.loading);
const enabledOptions = computed(() => filterByFalsyValue(props.options, (option) => option.disabled));
const rootAttrs = computed(() => omit(attrs, ["class", "style"]));
const focusableValue = computed(() => {
  if (props.disabled || props.loading || !enabledOptions.value.length) return undefined;
  return findByValue(enabledOptions.value, (option) => option.value, props.modelValue)?.value ?? firstItem(enabledOptions.value)?.value;
});

const currentValue = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (isReadonly.value) return;
    emit("update:modelValue", value);
    emit("change", value);
  },
});

onBeforeUpdate(() => {
  optionRefs.value = [];
});

const setOptionRef = (element: Element | ComponentPublicInstance | null, index: number) => {
  optionRefs.value[index] = element instanceof HTMLButtonElement ? element : null;
};

const focusOptionByValue = async (value: string | number) => {
  const optionIndex = findIndexByValue(props.options, (option) => option.value, value);
  if (optionIndex < 0) return null;
  await nextTick();
  const customOption = optionRefs.value[optionIndex];
  if (customOption) {
    customOption.focus();
    return customOption;
  }

  const nativeRoot = getElementPlusControlRoot(nativeSegmentedRef.value);
  const nativeItems = nativeRoot ? Array.from(nativeRoot.querySelectorAll<HTMLElement>(".el-segmented__item")) : [];
  const nativeOption = nativeItems[optionIndex] ?? null;
  nativeOption?.focus();
  return nativeOption;
};

const selectOption = (option: SegmentedOption) => {
  if (isReadonly.value || option.disabled) return;
  currentValue.value = option.value;
};

const moveSelection = (direction: 1 | -1) => {
  if (isReadonly.value || !enabledOptions.value.length) return;
  const nextOption = findNextCircularItem(enabledOptions.value, (option) => option.value === currentValue.value, direction);
  if (!nextOption) return;
  currentValue.value = nextOption.value;
  void focusOptionByValue(nextOption.value);
};

const selectBoundary = (position: "first" | "last") => {
  if (isReadonly.value || !enabledOptions.value.length) return;
  const option = getBoundaryItem(enabledOptions.value, position);
  if (!option) return;
  currentValue.value = option.value;
  void focusOptionByValue(option.value);
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  const direction = getKeyboardNavigationDirection(event);
  if (direction) {
    event.preventDefault();
    moveSelection(direction);
    return;
  }

  const boundaryPosition = getKeyboardBoundaryPosition(event);
  if (boundaryPosition) {
    event.preventDefault();
    selectBoundary(boundaryPosition);
  }
};

const nativeSegmentedProps = {
  label: "label",
  value: "value",
  disabled: "disabled",
};

const isSegmentedValue = (value: unknown): value is string | number => {
  return typeof value === "string" || typeof value === "number";
};

const handleNativeValueUpdate = (value: unknown) => {
  if (!isSegmentedValue(value)) return;
  emit("update:modelValue", value);
};

const handleNativeChange = (value: unknown) => {
  if (!isSegmentedValue(value)) return;
  emit("change", value);
};

const elementSize = computed(() => toElementPlusSize(props.size));

const iconSize = computed(() => {
  if (props.size === "xs") return 12;
  if (props.size === "sm") return 13;
  if (props.size === "lg") return 16;
  return 15;
});

const optionLabelId = (index: number) => `${groupId}-label-${index}`;
const optionDescriptionId = (index: number) => `${groupId}-description-${index}`;
const optionButtonId = (index: number) => `${groupId}-option-${index}`;
const getElement = () => getElementPlusControlRoot(nativeSegmentedRef.value) ?? customSegmentedRef.value;
const focusCurrentOption = () => focusOptionByValue(props.modelValue);
const focusFirstOption = () => {
  const firstEnabled = enabledOptions.value[0];
  return firstEnabled ? focusOptionByValue(firstEnabled.value) : Promise.resolve(null);
};

defineExpose({
  focusOptionByValue,
  focusCurrentOption,
  focusFirstOption,
  getNativeSegmented: () => nativeSegmentedRef.value,
  getElement,
});
</script>

<template>
  <el-segmented
    v-if="usesNativeSegmented"
    v-bind="rootAttrs"
    ref="nativeSegmentedRef"
    :id="id || undefined"
    class="base-segmented base-segmented--native"
    :class="[
      attrs.class,
      `base-segmented--${size}`,
      {
        'base-segmented--disabled': disabled,
        'base-segmented--compact': compact,
        'base-segmented--block': block,
        'base-segmented--error': error,
        'base-segmented--success': success
      }
    ]"
    :style="attrs.style"
    :model-value="currentValue"
    :options="options"
    :props="nativeSegmentedProps"
    :block="block"
    :size="elementSize"
    :disabled="disabled"
    :validate-event="validateEvent"
    :aria-label="ariaLabelledby ? undefined : ariaLabel || undefined"
    :aria-labelledby="ariaLabelledby || undefined"
    :aria-describedby="ariaDescribedby || undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-invalid="error ? 'true' : undefined"
    @update:model-value="handleNativeValueUpdate"
    @change="handleNativeChange"
    @keydown="emit('keydown', $event)"
    @focusin="emit('focus', $event)"
    @focusout="emit('blur', $event)"
  >
    <template #default="{ item }">
      <span class="base-segmented__native-content">
        <BaseIcon v-if="item.icon" :name="item.icon" :size="iconSize" aria-hidden="true" />
        <span class="base-segmented__label">{{ item.label }}</span>
        <small v-if="item.meta" class="base-segmented__meta">{{ item.meta }}</small>
      </span>
    </template>
  </el-segmented>

  <div
    v-else
    v-bind="rootAttrs"
    ref="customSegmentedRef"
    :id="id || undefined"
    class="base-segmented"
    :class="[
      attrs.class,
      `base-segmented--${size}`,
      {
        'base-segmented--disabled': disabled,
        'base-segmented--readonly': readonly,
        'base-segmented--loading': loading,
        'base-segmented--compact': compact,
        'base-segmented--block': block,
        'base-segmented--wrap': wrap,
        'base-segmented--detailed': detailed,
        'base-segmented--error': error,
        'base-segmented--success': success
      }
    ]"
    :style="attrs.style"
    role="radiogroup"
    :aria-label="ariaLabelledby ? undefined : ariaLabel || undefined"
    :aria-labelledby="ariaLabelledby || undefined"
    :aria-describedby="ariaDescribedby || undefined"
    :aria-disabled="(disabled || loading) ? 'true' : undefined"
    :aria-readonly="readonly ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :aria-invalid="error ? 'true' : undefined"
    @keydown="handleKeydown"
  >
    <span v-if="loading && loadingText" class="sr-only">{{ loadingText }}</span>
    <button
      v-for="(option, index) in options"
      :key="option.value"
      :id="optionButtonId(index)"
      :ref="(element) => setOptionRef(element, index)"
      type="button"
      role="radio"
      class="base-segmented__item"
      :class="{
        'is-active': currentValue === option.value,
        'is-disabled': disabled || loading || option.disabled,
        'is-readonly': readonly
      }"
      :disabled="disabled || loading || option.disabled"
      :aria-checked="currentValue === option.value"
      :aria-disabled="(disabled || loading || option.disabled) ? 'true' : undefined"
      :aria-readonly="readonly ? 'true' : undefined"
      :aria-labelledby="optionLabelId(index)"
      :aria-describedby="detailed && option.description ? optionDescriptionId(index) : undefined"
      :tabindex="focusableValue === option.value ? 0 : -1"
      @click="selectOption(option)"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    >
      <BaseIcon
        v-if="loading && currentValue === option.value"
        name="LoaderCircle"
        :size="iconSize"
        class="base-segmented__spinner"
        aria-hidden="true"
      />
      <BaseIcon v-else-if="option.icon" :name="option.icon" :size="iconSize" aria-hidden="true" />
      <span class="base-segmented__text">
        <span class="base-segmented__label-row">
          <span :id="optionLabelId(index)" class="base-segmented__label">{{ option.label }}</span>
          <small v-if="option.meta" class="base-segmented__meta">{{ option.meta }}</small>
        </span>
        <span v-if="detailed && option.description" :id="optionDescriptionId(index)" class="base-segmented__description">
          {{ option.description }}
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.base-segmented {
  @apply inline-flex w-fit rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950;
}

.base-segmented--native {
  --el-segmented-color: rgb(100 116 139);
  --el-segmented-bg-color: rgb(241 245 249);
  --el-segmented-padding: 2px;
  --el-segmented-item-selected-color: #ffffff;
  --el-segmented-item-selected-bg-color: rgb(var(--color-primary));
  --el-segmented-item-selected-disabled-bg-color: rgb(var(--color-primary) / 0.72);
  --el-segmented-item-hover-color: rgb(15 23 42);
  --el-segmented-item-hover-bg-color: rgb(226 232 240);
  --el-segmented-item-active-bg-color: rgb(203 213 225);
  --el-segmented-item-disabled-color: rgb(148 163 184);
}

.base-segmented--block {
  @apply flex w-full;
}

.base-segmented--wrap {
  @apply flex-wrap;
}

.base-segmented--compact {
  @apply rounded-xl p-0.5;
}

.base-segmented--disabled {
  @apply opacity-60;
}

.base-segmented--readonly,
.base-segmented--loading {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-segmented--native.base-segmented--success {
  --el-segmented-item-selected-bg-color: rgb(16 185 129);
  --el-segmented-item-selected-disabled-bg-color: rgb(16 185 129 / 0.72);
  --el-segmented-item-hover-bg-color: rgb(236 253 245);
  --el-segmented-item-active-bg-color: rgb(209 250 229);
}

.base-segmented--native.base-segmented--error {
  --el-segmented-item-selected-bg-color: rgb(239 68 68);
  --el-segmented-item-selected-disabled-bg-color: rgb(239 68 68 / 0.72);
  --el-segmented-item-hover-bg-color: rgb(254 242 242);
  --el-segmented-item-active-bg-color: rgb(254 226 226);
}

.base-segmented--native.base-segmented--compact {
  --el-segmented-padding: 2px;
}

.base-segmented__item {
  @apply inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-transparent font-black text-slate-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400;
}

.base-segmented--native :deep(.el-segmented__group) {
  align-items: stretch;
}

.base-segmented--native :deep(.el-segmented__item) {
  min-width: 0;
  justify-content: center;
}

.base-segmented--native :deep(.el-segmented__item-label) {
  @apply flex min-w-0 items-center justify-center gap-1.5;
}

.base-segmented--native .base-segmented__native-content {
  @apply inline-flex min-w-0 items-center justify-center gap-1.5;
}

.base-segmented--native .base-segmented__label {
  @apply min-w-0 truncate;
}

.base-segmented--native .base-segmented__meta {
  @apply shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none text-inherit;
  background-color: rgb(255 255 255 / 0.18);
}

.base-segmented--native :deep(.el-segmented__item.is-selected .base-segmented__meta) {
  background-color: rgb(255 255 255 / 0.16);
}

.base-segmented--native :deep(.el-segmented__item:not(.is-disabled):not(.is-selected):hover .base-segmented__meta) {
  background-color: rgb(148 163 184 / 0.18);
}

.base-segmented--block .base-segmented__item {
  @apply flex-1;
}

.base-segmented--detailed .base-segmented__item {
  @apply items-start justify-start text-left;
}

.base-segmented--sm .base-segmented__item {
  @apply px-2.5 py-1.5 text-[10px];
}

.base-segmented--xs .base-segmented__item {
  @apply rounded-lg px-2 py-1 text-[10px];
}

.base-segmented--compact .base-segmented__item {
  @apply rounded-lg px-2.5 py-1.5 text-[10px];
}

.base-segmented--md .base-segmented__item {
  @apply px-3 py-2 text-xs;
}

.base-segmented--lg .base-segmented__item {
  @apply px-4 py-2.5 text-sm;
}

.base-segmented__item:hover:not(:disabled):not(.is-readonly) {
  @apply text-slate-800 dark:text-slate-100;
}

.base-segmented__item:focus-visible {
  border-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.14);
  outline: none;
}

.base-segmented__item.is-disabled {
  @apply cursor-not-allowed opacity-50;
}

.base-segmented__item.is-readonly {
  @apply cursor-default;
}

.base-segmented__item.is-active {
  @apply bg-white text-primary shadow-sm dark:bg-slate-900;
}

.base-segmented--success .base-segmented__item.is-active {
  @apply bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300;
}

.base-segmented--success .base-segmented__item:focus-visible {
  @apply border-emerald-400;
  box-shadow: 0 0 0 3px rgb(16 185 129 / 0.14);
}

.base-segmented--error .base-segmented__item.is-active {
  @apply bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300;
}

.base-segmented--error .base-segmented__item:focus-visible {
  @apply border-red-400;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.14);
}

.base-segmented__text {
  @apply flex min-w-0 flex-col;
}

.base-segmented__label-row {
  @apply flex min-w-0 items-center justify-center gap-1.5;
}

.base-segmented--detailed .base-segmented__label-row {
  @apply justify-start;
}

.base-segmented__label {
  @apply min-w-0 truncate;
}

.base-segmented__meta {
  @apply shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-black leading-none text-slate-500 dark:bg-slate-800 dark:text-slate-300;
}

.base-segmented__item.is-active .base-segmented__meta {
  background-color: rgb(var(--color-primary) / 0.12);
  @apply text-primary;
}

.base-segmented--success .base-segmented__item.is-active .base-segmented__meta {
  @apply bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200;
}

.base-segmented--error .base-segmented__item.is-active .base-segmented__meta {
  @apply bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200;
}

.base-segmented__description {
  @apply mt-0.5 max-w-full truncate text-[10px] font-bold leading-4 text-slate-400 dark:text-slate-500;
}

.base-segmented__spinner {
  animation: base-segmented-spin 0.9s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .base-segmented__item {
    transition: none !important;
  }

  .base-segmented__spinner {
    animation: none !important;
  }
}

@keyframes base-segmented-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
