<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";
import {
  clampNumber,
  compactMap,
  createLineClampStyle,
  findNextCircularItem,
  getKeyboardNavigationDirection,
  getLastIndex,
  isActivationKey,
  isEmptyArray,
  isNonEmptyArray,
} from "../../utils";
import BaseIcon from "./BaseIcon.vue";

type StepperState = "done" | "current" | "pending" | "error" | "disabled";
type StepperSize = "sm" | "md" | "lg";
type StepperSurface = "card" | "muted" | "plain";
type ElementStepStatus = "wait" | "process" | "finish" | "error" | "success";

export interface StepperItem {
  key: string;
  title: string;
  description?: string;
  disabled?: boolean;
  error?: boolean;
  state?: StepperState;
  icon?: string;
}

interface Props {
  steps: StepperItem[];
  current: number;
  vertical?: boolean;
  clickable?: boolean;
  ariaLabel?: string;
  size?: StepperSize;
  surface?: StepperSurface;
  bordered?: boolean;
  linear?: boolean;
  columns?: number;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  showConnector?: boolean;
  alignCenter?: boolean;
  simple?: boolean;
  finishStatus?: ElementStepStatus;
  processStatus?: ElementStepStatus;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
  maxDescriptionLines?: number;
}

const props = withDefaults(defineProps<Props>(), {
  vertical: false,
  clickable: false,
  ariaLabel: "",
  size: "md",
  surface: "card",
  bordered: true,
  linear: false,
  columns: 0,
  loading: false,
  loadingText: "",
  emptyText: "",
  showConnector: true,
  alignCenter: false,
  simple: false,
  finishStatus: "success",
  processStatus: "process",
  wrapTitle: false,
  wrapDescription: false,
  maxDescriptionLines: 2,
});

const emit = defineEmits<{
  (e: "update:current", value: number): void;
  (e: "change", payload: { step: StepperItem; index: number }): void;
  (e: "select", payload: { step: StepperItem; index: number }): void;
}>();

const { t } = useI18n();
const hasSteps = computed(() => isNonEmptyArray(props.steps));
const normalizedCurrent = computed(() => (hasSteps.value ? clampNumber(props.current, 0, getLastIndex(props.steps), 0, 0) : 0));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedEmptyText = computed(() => props.emptyText || t("common.noData"));
const elementDirection = computed(() => (props.vertical ? "vertical" : "horizontal"));
const isSimpleLayout = computed(() => props.simple && !props.vertical);
const stepSpace = computed(() => {
  if (props.vertical || isSimpleLayout.value || !props.columns) return "";
  return `${100 / clampNumber(props.columns, 1, 6, 1, 0)}%`;
});
const descriptionStyle = computed(() => {
  if (props.wrapDescription) return undefined;
  return createLineClampStyle(props.maxDescriptionLines);
});

const stepState = (step: StepperItem, index: number): StepperState => {
  if (step.disabled || step.state === "disabled") return "disabled";
  if (step.state) return step.state;
  if (step.error) return "error";
  if (index < normalizedCurrent.value) return "done";
  if (index === normalizedCurrent.value) return "current";
  return "pending";
};

const stepStatus = (step: StepperItem, index: number): ElementStepStatus => {
  const state = stepState(step, index);
  if (state === "done") return props.finishStatus;
  if (state === "current") return props.processStatus;
  if (state === "error") return "error";
  return "wait";
};

const stepIconName = (step: StepperItem, index: number) => {
  const state = stepState(step, index);
  if (step.icon) return step.icon;
  if (state === "done") return "CheckCircle2";
  if (state === "error") return "AlertCircle";
  if (state === "current") return "CircleDot";
  return "Circle";
};

const isCurrentStep = (step: StepperItem, index: number) => stepState(step, index) !== "disabled" && index === normalizedCurrent.value;

const canSelect = (step: StepperItem, index: number) => {
  if (!props.clickable || step.disabled || step.state === "disabled") return false;
  if (!props.linear) return true;
  return index <= normalizedCurrent.value + 1;
};

const commitSelect = (step: StepperItem, index: number) => {
  const payload = { step, index };
  emit("update:current", index);
  emit("change", payload);
  emit("select", payload);
};

const handleSelect = (step: StepperItem, index: number) => {
  if (!canSelect(step, index)) return;
  commitSelect(step, index);
};

const moveStep = (direction: 1 | -1) => {
  if (!props.clickable) return;
  const enabledSteps = compactMap(props.steps, (step, index) => (canSelect(step, index) ? { step, index } : undefined));
  if (isEmptyArray(enabledSteps)) return;
  const nextStep = findNextCircularItem(enabledSteps, (item) => item.index === normalizedCurrent.value, direction);
  if (nextStep) commitSelect(nextStep.step, nextStep.index);
};

const handleStepKeydown = (event: KeyboardEvent, step: StepperItem, index: number) => {
  const direction = getKeyboardNavigationDirection(event);
  if (direction) {
    event.preventDefault();
    moveStep(direction);
    return;
  }

  if (isActivationKey(event)) {
    event.preventDefault();
    handleSelect(step, index);
  }
};
</script>

<template>
  <div
    class="base-stepper"
    :class="[
      `base-stepper--${size}`,
      `base-stepper--${surface}`,
      {
        'base-stepper--vertical': vertical,
        'base-stepper--bordered': bordered,
        'base-stepper--linear': linear,
        'base-stepper--align-center': alignCenter,
        'base-stepper--simple': isSimpleLayout,
        'base-stepper--with-connector': showConnector && !loading,
        'base-stepper--hide-connector': !showConnector,
        'base-stepper--wrap-title': wrapTitle,
        'base-stepper--wrap-description': wrapDescription,
        'is-loading': loading,
      },
    ]"
    :aria-label="ariaLabel || undefined"
    :aria-busy="loading ? 'true' : undefined"
  >
    <div v-if="loading || !hasSteps" class="base-stepper__state" aria-live="polite">
      <span class="base-stepper__state-icon" aria-hidden="true">
        <BaseIcon :name="loading ? 'LoaderCircle' : 'Inbox'" size="16" />
      </span>
      <span class="base-stepper__state-title">{{ loading ? resolvedLoadingText : resolvedEmptyText }}</span>
    </div>

    <el-steps
      v-else
      class="base-stepper__steps"
      :active="normalizedCurrent"
      :direction="elementDirection"
      :space="stepSpace"
      :align-center="alignCenter || isSimpleLayout"
      :simple="isSimpleLayout"
      :finish-status="finishStatus"
      :process-status="processStatus"
      role="list"
    >
      <el-step
        v-for="(step, index) in steps"
        :key="step.key"
        class="base-stepper__item"
        :class="[
          `is-${stepState(step, index)}`,
          { 'is-clickable': canSelect(step, index), 'is-disabled': stepState(step, index) === 'disabled' },
        ]"
        :status="stepStatus(step, index)"
        :aria-current="isCurrentStep(step, index) ? 'step' : undefined"
        :aria-disabled="clickable && !canSelect(step, index) ? 'true' : undefined"
        :aria-invalid="stepState(step, index) === 'error' ? 'true' : undefined"
        :role="clickable ? 'button' : 'listitem'"
        :tabindex="canSelect(step, index) ? 0 : undefined"
        @click="handleSelect(step, index)"
        @keydown="handleStepKeydown($event, step, index)"
      >
        <template #icon>
          <BaseIcon :name="stepIconName(step, index)" size="16" aria-hidden="true" />
        </template>
        <template #title>
          <span class="base-stepper__title">{{ step.title }}</span>
        </template>
        <template #description>
          <span v-if="step.description" class="base-stepper__description" :style="descriptionStyle">{{ step.description }}</span>
        </template>
      </el-step>
    </el-steps>
  </div>
</template>

<style scoped>
.base-stepper {
  @apply min-w-0;
}

.base-stepper__steps {
  @apply min-w-0;
}

.base-stepper__state {
  @apply flex min-w-0 items-center gap-3 rounded-2xl p-3 text-left;
}

.base-stepper--bordered .base-stepper__state {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-stepper--card .base-stepper__state {
  @apply bg-white shadow-sm dark:bg-slate-900;
}

.base-stepper--muted .base-stepper__state {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-stepper--plain .base-stepper__state {
  @apply bg-transparent shadow-none;
}

.base-stepper__state-icon {
  color: rgb(var(--color-primary));
  @apply flex h-5 w-5 shrink-0 items-center justify-center rounded-full;
}

.base-stepper.is-loading .base-stepper__state-icon :deep(svg) {
  animation: base-stepper-spin 0.9s linear infinite;
}

.base-stepper__state-title {
  @apply min-w-0 truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-stepper :deep(.el-step) {
  @apply min-w-0;
}

.base-stepper :deep(.el-step__head) {
  @apply shrink-0;
}

.base-stepper :deep(.el-step__icon) {
  @apply h-8 w-8 border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500;
}

.base-stepper--sm :deep(.el-step__icon) {
  @apply h-7 w-7;
}

.base-stepper--lg :deep(.el-step__icon) {
  @apply h-9 w-9;
}

.base-stepper :deep(.el-step__icon.is-icon) {
  @apply flex items-center justify-center;
}

.base-stepper :deep(.el-step__icon-inner) {
  @apply flex items-center justify-center font-black;
}

.base-stepper :deep(.el-step__main) {
  @apply min-w-0;
}

.base-stepper :deep(.el-step__title),
.base-stepper :deep(.el-step__description) {
  @apply min-w-0 p-0 leading-normal;
}

.base-stepper__title {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-stepper--wrap-title .base-stepper__title {
  @apply whitespace-normal break-words;
}

.base-stepper__description {
  @apply mt-1 block text-[10px] font-bold leading-4 text-slate-400 dark:text-slate-500;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.base-stepper--wrap-description .base-stepper__description {
  @apply whitespace-normal break-words;
  display: block;
  overflow: visible;
}

.base-stepper--lg .base-stepper__title {
  @apply text-sm;
}

.base-stepper--lg .base-stepper__description {
  @apply text-xs;
}

.base-stepper :deep(.el-step__line) {
  @apply bg-slate-200 dark:bg-slate-800;
}

.base-stepper :deep(.el-step__line-inner) {
  border-color: rgb(var(--color-primary));
}

.base-stepper--hide-connector :deep(.el-step__line) {
  @apply hidden;
}

.base-stepper__item :deep(.el-step__head.is-success),
.base-stepper__item.is-done :deep(.el-step__icon) {
  @apply border-emerald-200 text-emerald-500 dark:border-emerald-900 dark:text-emerald-300;
}

.base-stepper__item :deep(.el-step__head.is-process),
.base-stepper__item.is-current :deep(.el-step__icon) {
  border-color: rgb(var(--color-primary));
  color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.12);
}

.base-stepper__item :deep(.el-step__head.is-error),
.base-stepper__item.is-error :deep(.el-step__icon) {
  @apply border-red-200 text-red-500 dark:border-red-900 dark:text-red-300;
}

.base-stepper__item.is-disabled {
  @apply cursor-not-allowed opacity-60;
}

.base-stepper__item.is-clickable {
  @apply cursor-pointer rounded-2xl outline-none transition;
}

.base-stepper__item.is-clickable:hover :deep(.el-step__icon),
.base-stepper__item.is-clickable:focus-visible :deep(.el-step__icon) {
  @apply border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900;
}

.base-stepper__item.is-current.is-clickable:hover :deep(.el-step__icon),
.base-stepper__item.is-current.is-clickable:focus-visible :deep(.el-step__icon) {
  border-color: rgb(var(--color-primary));
  background-color: rgb(var(--color-primary) / 0.08);
}

.base-stepper--bordered :deep(.el-step__main) {
  @apply rounded-2xl border border-slate-200 dark:border-slate-800;
}

.base-stepper--card :deep(.el-step__main) {
  @apply bg-white shadow-sm dark:bg-slate-900;
}

.base-stepper--muted :deep(.el-step__main) {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-stepper--plain :deep(.el-step__main) {
  @apply bg-transparent shadow-none;
}

.base-stepper--plain.base-stepper--bordered :deep(.el-step__main) {
  @apply border-0;
}

.base-stepper--simple :deep(.el-step__main) {
  @apply rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent;
}

.base-stepper--simple :deep(.el-step__icon) {
  @apply shadow-none;
}

.base-stepper--sm :deep(.el-step__main) {
  @apply rounded-xl p-2.5;
}

.base-stepper--md :deep(.el-step__main) {
  @apply p-3;
}

.base-stepper--lg :deep(.el-step__main) {
  @apply p-4;
}

.base-stepper--vertical :deep(.el-step) {
  @apply min-h-0;
}

.base-stepper--vertical :deep(.el-step__main) {
  @apply mb-2;
}

@media (prefers-reduced-motion: reduce) {
  .base-stepper__item,
  .base-stepper :deep(.el-step__icon),
  .base-stepper__state-icon :deep(svg) {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes base-stepper-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
