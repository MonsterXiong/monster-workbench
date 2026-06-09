<script setup lang="ts">
import { computed } from "vue";
import { AlertCircle, CheckCircle2, Circle } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import {
  clampNumber,
  compactMap,
  createLineClampStyle,
  findNextCircularItem,
  getKeyboardNavigationDirection,
  getLastIndex,
  isEmptyArray,
  isNonEmptyArray,
} from "../../utils";
import BaseIcon from "./BaseIcon.vue";

type StepperState = "done" | "current" | "pending" | "error" | "disabled";
type StepperSize = "sm" | "md" | "lg";
type StepperSurface = "card" | "muted" | "plain";

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
  wrapTitle: false,
  wrapDescription: false,
  maxDescriptionLines: 2,
});

const emit = defineEmits<{
  (e: "select", payload: { step: StepperItem; index: number }): void;
}>();

const { t } = useI18n();
const hasSteps = computed(() => isNonEmptyArray(props.steps));
const normalizedCurrent = computed(() => (hasSteps.value ? clampNumber(props.current, 0, getLastIndex(props.steps), 0, 0) : 0));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedEmptyText = computed(() => props.emptyText || t("common.noData"));
const gridColumns = computed(() => {
  if (props.vertical) return undefined;
  const count = props.columns || props.steps.length || 1;
  return `repeat(${clampNumber(count, 1, 6, 1, 0)}, minmax(0, 1fr))`;
});
const descriptionStyle = computed(() => {
  if (props.wrapDescription) return undefined;

  return createLineClampStyle(props.maxDescriptionLines);
});

const stepState = (step: StepperItem, index: number) => {
  if (step.disabled || step.state === "disabled") return "disabled";
  if (step.state) return step.state;
  if (step.error) return "error";
  if (index < normalizedCurrent.value) return "done";
  if (index === normalizedCurrent.value) return "current";
  return "pending";
};

const isCurrentStep = (step: StepperItem, index: number) => stepState(step, index) !== "disabled" && index === normalizedCurrent.value;

const canSelect = (step: StepperItem, index: number) => {
  if (!props.clickable || step.disabled || step.state === "disabled") return false;
  if (!props.linear) return true;
  return index <= normalizedCurrent.value + 1;
};

const handleSelect = (step: StepperItem, index: number) => {
  if (!canSelect(step, index)) return;
  emit("select", { step, index });
};

const moveStep = (direction: 1 | -1) => {
  if (!props.clickable) return;
  const enabledSteps = compactMap(props.steps, (step, index) => (canSelect(step, index) ? { step, index } : undefined));
  if (isEmptyArray(enabledSteps)) return;
  const nextStep = findNextCircularItem(enabledSteps, (item) => item.index === normalizedCurrent.value, direction);
  if (nextStep) emit("select", nextStep);
};

const handleKeydown = (event: KeyboardEvent) => {
  const direction = getKeyboardNavigationDirection(event);
  if (direction) {
    event.preventDefault();
    moveStep(direction);
  }
};
</script>

<template>
  <ol
    class="base-stepper"
    :class="[
      `base-stepper--${size}`,
      `base-stepper--${surface}`,
      {
        'base-stepper--vertical': vertical,
        'base-stepper--bordered': bordered,
        'base-stepper--linear': linear,
        'base-stepper--with-connector': showConnector && !loading,
        'base-stepper--wrap-title': wrapTitle,
        'base-stepper--wrap-description': wrapDescription,
        'is-loading': loading,
      },
    ]"
    :style="{ gridTemplateColumns: gridColumns }"
    :aria-label="ariaLabel || undefined"
    :aria-busy="loading ? 'true' : undefined"
    @keydown="handleKeydown"
  >
    <li v-if="loading" class="base-stepper__item base-stepper__item--state" aria-live="polite">
      <div class="base-stepper__button">
        <span class="base-stepper__mark" aria-hidden="true">
          <BaseIcon name="LoaderCircle" size="16" />
        </span>
        <span class="base-stepper__text">
          <span class="base-stepper__title">{{ resolvedLoadingText }}</span>
        </span>
      </div>
    </li>
    <li v-else-if="!hasSteps" class="base-stepper__item base-stepper__item--state">
      <div class="base-stepper__button">
        <span class="base-stepper__mark" aria-hidden="true">
          <BaseIcon name="Inbox" size="16" />
        </span>
        <span class="base-stepper__text">
          <span class="base-stepper__title">{{ resolvedEmptyText }}</span>
        </span>
      </div>
    </li>
    <template v-else>
      <li
        v-for="(step, index) in steps"
        :key="step.key"
        class="base-stepper__item"
        :class="[
          `is-${stepState(step, index)}`,
          { 'is-clickable': canSelect(step, index), 'is-disabled': stepState(step, index) === 'disabled' }
        ]"
        :aria-current="isCurrentStep(step, index) ? 'step' : undefined"
      >
        <component
          :is="canSelect(step, index) ? 'button' : 'div'"
          :type="canSelect(step, index) ? 'button' : undefined"
          class="base-stepper__button"
          :role="clickable && !canSelect(step, index) ? 'button' : undefined"
          :tabindex="canSelect(step, index) ? 0 : -1"
          :aria-disabled="clickable && !canSelect(step, index) ? 'true' : undefined"
          :aria-invalid="stepState(step, index) === 'error' ? true : undefined"
          @click="handleSelect(step, index)"
        >
          <span class="base-stepper__mark" aria-hidden="true">
            <BaseIcon v-if="step.icon" :name="step.icon" size="16" />
            <CheckCircle2 v-else-if="stepState(step, index) === 'done'" class="h-4 w-4" />
            <AlertCircle v-else-if="stepState(step, index) === 'error'" class="h-4 w-4" />
            <Circle v-else class="h-4 w-4" />
          </span>
          <span class="base-stepper__text">
            <span class="base-stepper__title">{{ step.title }}</span>
            <span v-if="step.description" class="base-stepper__description" :style="descriptionStyle">{{ step.description }}</span>
          </span>
        </component>
      </li>
    </template>
  </ol>
</template>

<style scoped>
.base-stepper {
  @apply grid min-w-0 gap-3;
}

.base-stepper--vertical {
  @apply flex flex-col gap-2;
}

.base-stepper__item {
  @apply relative min-w-0;
}

.base-stepper__button {
  @apply relative z-10 flex h-full w-full min-w-0 items-start gap-3 rounded-2xl text-left transition;
}

.base-stepper--bordered .base-stepper__button {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-stepper--card .base-stepper__button {
  @apply bg-white shadow-sm dark:bg-slate-900;
}

.base-stepper--muted .base-stepper__button {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-stepper--plain .base-stepper__button {
  @apply bg-transparent shadow-none;
}

.base-stepper--plain.base-stepper--bordered .base-stepper__button {
  @apply border-0;
}

.base-stepper--sm .base-stepper__button {
  @apply rounded-xl p-2.5;
}

.base-stepper--md .base-stepper__button {
  @apply p-3;
}

.base-stepper--lg .base-stepper__button {
  @apply p-4;
}

.base-stepper__item.is-clickable .base-stepper__button:hover {
  @apply border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950;
}

.base-stepper__item.is-current.is-clickable .base-stepper__button:hover {
  border-color: rgba(var(--color-primary), 0.34);
  background-color: rgba(var(--color-primary), 0.08);
}

.base-stepper__mark {
  @apply mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-300 dark:text-slate-600;
}

.base-stepper__item.is-done .base-stepper__mark {
  @apply text-emerald-500;
}

.base-stepper__item.is-current .base-stepper__button {
  border-color: rgba(var(--color-primary), 0.34);
  background-color: rgba(var(--color-primary), 0.06);
}

.base-stepper__item.is-current .base-stepper__mark {
  @apply text-primary;
}

.base-stepper__item.is-error .base-stepper__mark {
  @apply text-red-500;
}

.base-stepper__item.is-disabled .base-stepper__mark {
  @apply text-slate-300 dark:text-slate-700;
}

.base-stepper__item.is-disabled .base-stepper__button {
  @apply cursor-not-allowed opacity-60;
}

.base-stepper__item--state .base-stepper__mark {
  color: rgb(var(--color-primary));
}

.base-stepper.is-loading .base-stepper__item--state .base-stepper__mark :deep(svg) {
  animation: base-stepper-spin 0.9s linear infinite;
}

.base-stepper__text {
  @apply min-w-0;
}

.base-stepper__title {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-stepper--wrap-title .base-stepper__title {
  @apply whitespace-normal break-words;
}

.base-stepper__description {
  @apply mt-0.5 block text-[10px] font-bold text-slate-400 dark:text-slate-500;
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

.base-stepper--with-connector:not(.base-stepper--vertical) .base-stepper__item:not(:last-child)::after {
  @apply absolute left-[calc(50%+1rem)] right-[calc(-50%+1rem)] top-6 h-px bg-slate-200 dark:bg-slate-800;
  content: "";
}

.base-stepper--with-connector.base-stepper--sm:not(.base-stepper--vertical) .base-stepper__item:not(:last-child)::after {
  @apply top-5;
}

.base-stepper--with-connector.base-stepper--lg:not(.base-stepper--vertical) .base-stepper__item:not(:last-child)::after {
  @apply top-7;
}

.base-stepper--with-connector.base-stepper--vertical .base-stepper__item:not(:last-child)::after {
  @apply absolute bottom-[-0.75rem] left-5 top-10 w-px bg-slate-200 dark:bg-slate-800;
  content: "";
}

.base-stepper--with-connector.base-stepper--sm.base-stepper--vertical .base-stepper__item:not(:last-child)::after {
  @apply left-4 top-8;
}

.base-stepper--with-connector.base-stepper--lg.base-stepper--vertical .base-stepper__item:not(:last-child)::after {
  @apply left-6 top-12;
}

@media (prefers-reduced-motion: reduce) {
  .base-stepper__button,
  .base-stepper__item--state .base-stepper__mark :deep(svg) {
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
