<script setup lang="ts">
import { computed } from "vue";
import { AlertCircle, CheckCircle2, Circle } from "lucide-vue-next";
import { clampNumber, findNextCircularItem } from "../../utils";
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
});

const emit = defineEmits<{
  (e: "select", payload: { step: StepperItem; index: number }): void;
}>();

const normalizedCurrent = computed(() => clampNumber(props.current, 0, props.steps.length - 1, 0, 0));
const gridColumns = computed(() => {
  if (props.vertical) return undefined;
  const count = props.columns || props.steps.length || 1;
  return `repeat(${clampNumber(count, 1, 6, 1, 0)}, minmax(0, 1fr))`;
});

const stepState = (step: StepperItem, index: number) => {
  if (step.disabled || step.state === "disabled") return "disabled";
  if (step.state) return step.state;
  if (step.error) return "error";
  if (index < normalizedCurrent.value) return "done";
  if (index === normalizedCurrent.value) return "current";
  return "pending";
};

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
  const enabledSteps = props.steps
    .map((step, index) => ({ step, index }))
    .filter((item) => canSelect(item.step, item.index));
  if (!enabledSteps.length) return;
  const nextStep = findNextCircularItem(enabledSteps, (item) => item.index === normalizedCurrent.value, direction);
  if (nextStep) emit("select", nextStep);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    moveStep(1);
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    moveStep(-1);
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
      },
    ]"
    :style="{ gridTemplateColumns: gridColumns }"
    :aria-label="ariaLabel || undefined"
    @keydown="handleKeydown"
  >
    <li
      v-for="(step, index) in steps"
      :key="step.key"
      class="base-stepper__item"
      :class="[
        `is-${stepState(step, index)}`,
        { 'is-clickable': canSelect(step, index), 'is-disabled': stepState(step, index) === 'disabled' }
      ]"
      :aria-current="stepState(step, index) === 'current' ? 'step' : undefined"
    >
      <button
        type="button"
        class="base-stepper__button"
        :disabled="stepState(step, index) === 'disabled'"
        :tabindex="canSelect(step, index) ? 0 : -1"
        :aria-disabled="!canSelect(step, index)"
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
          <span v-if="step.description" class="base-stepper__description">{{ step.description }}</span>
        </span>
      </button>
    </li>
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
  @apply flex h-full w-full min-w-0 items-start gap-3 rounded-2xl text-left transition disabled:cursor-not-allowed disabled:opacity-60;
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

.base-stepper__text {
  @apply min-w-0;
}

.base-stepper__title {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-stepper__description {
  @apply mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-stepper--lg .base-stepper__title {
  @apply text-sm;
}

.base-stepper--lg .base-stepper__description {
  @apply text-xs;
}

@media (prefers-reduced-motion: reduce) {
  .base-stepper__button {
    transition: none !important;
  }
}
</style>
