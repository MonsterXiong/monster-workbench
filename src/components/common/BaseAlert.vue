<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import { useI18n } from "../../composables/useI18n";

type AlertType = "info" | "success" | "warning" | "danger";
type AlertVariant = "soft" | "solid" | "plain";
type AlertSize = "sm" | "md" | "lg";

interface Props {
  type?: AlertType;
  title?: string;
  description?: string;
  closable?: boolean;
  modelValue?: boolean;
  closeLabel?: string;
  compact?: boolean;
  variant?: AlertVariant;
  size?: AlertSize;
  icon?: string;
  showIcon?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: "info",
  title: "",
  description: "",
  closable: false,
  modelValue: true,
  closeLabel: "",
  compact: false,
  variant: "soft",
  size: "md",
  icon: "",
  showIcon: true,
  disabled: false,
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "close"): void;
}>();

const visible = ref(props.modelValue);
const { t } = useI18n();
const alertId = useId();
const titleId = computed(() => `${alertId}-title`);
const descriptionId = computed(() => `${alertId}-description`);
const resolvedCloseLabel = computed(() => props.closeLabel || t("common.close"));
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const labelledBy = computed(() => (!props.ariaLabel && props.title ? titleId.value : undefined));
const describedBy = computed(() => (props.description ? descriptionId.value : undefined));
const role = computed(() => (props.type === "danger" || props.type === "warning" ? "alert" : "status"));

watch(
  () => props.modelValue,
  (nextValue) => {
    visible.value = nextValue;
  }
);

const iconName = computed(() => {
  if (props.icon) return props.icon;
  if (props.type === "success") return "CheckCircle2";
  if (props.type === "warning") return "AlertTriangle";
  if (props.type === "danger") return "XCircle";
  return "Info";
});

const close = () => {
  if (props.disabled) return;
  visible.value = false;
  emit("update:modelValue", false);
  emit("close");
};
</script>

<template>
  <Transition name="base-alert">
    <section
      v-if="visible"
      class="base-alert"
      :class="[
        `base-alert--${type}`,
        `base-alert--${variant}`,
        `base-alert--${resolvedSize}`,
        {
          'base-alert--compact': compact,
          'is-disabled': disabled,
        },
      ]"
      :role="role"
      :aria-label="ariaLabel || undefined"
      :aria-labelledby="labelledBy"
      :aria-describedby="describedBy"
      :aria-disabled="disabled ? 'true' : undefined"
    >
      <BaseIcon v-if="showIcon" :name="iconName" class="base-alert__icon" aria-hidden="true" />
      <div class="base-alert__body">
        <h4 v-if="title" :id="titleId" class="base-alert__title">{{ title }}</h4>
        <p v-if="description" :id="descriptionId" class="base-alert__description">{{ description }}</p>
        <div v-if="$slots.default" class="base-alert__content">
          <slot></slot>
        </div>
      </div>
      <div v-if="$slots.actions" class="base-alert__actions">
        <slot name="actions"></slot>
      </div>
      <button
        v-if="closable"
        type="button"
        class="base-alert__close"
        :aria-label="resolvedCloseLabel"
        :title="resolvedCloseLabel"
        :disabled="disabled"
        @click="close"
      >
        <BaseIcon name="X" size="14" aria-hidden="true" />
      </button>
    </section>
  </Transition>
</template>

<style scoped>
.base-alert {
  @apply flex min-w-0 items-start gap-3 border shadow-sm transition;
  background-color: var(--alert-bg);
  border-color: var(--alert-border);
  color: var(--alert-fg);
}

.base-alert__icon {
  @apply mt-0.5 shrink-0;
}

.base-alert--compact {
  @apply rounded-xl p-2.5;
}

.base-alert--sm {
  @apply rounded-xl p-2.5;
}

.base-alert--md {
  @apply rounded-2xl p-3;
}

.base-alert--lg {
  @apply rounded-2xl p-4;
}

.base-alert--sm .base-alert__icon,
.base-alert--md .base-alert__icon {
  @apply h-4 w-4;
}

.base-alert--lg .base-alert__icon {
  @apply h-5 w-5;
}

.base-alert__body {
  @apply min-w-0 flex-1;
}

.base-alert__title {
  @apply text-xs font-black;
}

.base-alert__description,
.base-alert__content {
  @apply mt-0.5 text-[11px] font-bold leading-5;
  color: var(--alert-muted);
}

.base-alert--lg .base-alert__title {
  @apply text-sm;
}

.base-alert--lg .base-alert__description,
.base-alert--lg .base-alert__content {
  @apply text-xs leading-5;
}

.base-alert__actions {
  @apply flex shrink-0 flex-wrap items-center justify-end gap-2;
}

.base-alert__close {
  @apply flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10;
}

.base-alert__close:disabled {
  @apply cursor-not-allowed opacity-50;
}

.base-alert.is-disabled {
  @apply opacity-65;
}

.base-alert--plain {
  @apply border-0 bg-transparent shadow-none;
}

.base-alert--solid {
  border-color: transparent;
  background-color: var(--alert-solid-bg);
  color: var(--alert-solid-fg);
}

.base-alert--solid .base-alert__description,
.base-alert--solid .base-alert__content {
  color: var(--alert-solid-muted);
}

.base-alert--info {
  --alert-bg: rgba(var(--color-primary), 0.08);
  --alert-border: rgba(var(--color-primary), 0.22);
  --alert-fg: rgb(var(--color-primary));
  --alert-muted: #475569;
  --alert-solid-bg: rgb(var(--color-primary));
  --alert-solid-fg: #ffffff;
  --alert-solid-muted: #dbeafe;
}

.base-alert--success {
  --alert-bg: #ecfdf5;
  --alert-border: #a7f3d0;
  --alert-fg: #059669;
  --alert-muted: #047857;
  --alert-solid-bg: #059669;
  --alert-solid-fg: #ffffff;
  --alert-solid-muted: #d1fae5;
}

.base-alert--warning {
  --alert-bg: #fffbeb;
  --alert-border: #fde68a;
  --alert-fg: #d97706;
  --alert-muted: #92400e;
  --alert-solid-bg: #d97706;
  --alert-solid-fg: #ffffff;
  --alert-solid-muted: #fef3c7;
}

.base-alert--danger {
  --alert-bg: #fef2f2;
  --alert-border: #fecaca;
  --alert-fg: #dc2626;
  --alert-muted: #991b1b;
  --alert-solid-bg: #dc2626;
  --alert-solid-fg: #ffffff;
  --alert-solid-muted: #fee2e2;
}

:global(.dark) .base-alert--info {
  --alert-muted: #bfdbfe;
  --alert-solid-muted: #dbeafe;
}

:global(.dark) .base-alert--success {
  --alert-bg: #052e24;
  --alert-border: #065f46;
  --alert-fg: #6ee7b7;
  --alert-muted: #a7f3d0;
  --alert-solid-bg: #047857;
  --alert-solid-muted: #d1fae5;
}

:global(.dark) .base-alert--warning {
  --alert-bg: #451a03;
  --alert-border: #92400e;
  --alert-fg: #fbbf24;
  --alert-muted: #fde68a;
  --alert-solid-bg: #b45309;
  --alert-solid-muted: #fef3c7;
}

:global(.dark) .base-alert--danger {
  --alert-bg: #450a0a;
  --alert-border: #991b1b;
  --alert-fg: #fca5a5;
  --alert-muted: #fecaca;
  --alert-solid-bg: #b91c1c;
  --alert-solid-muted: #fee2e2;
}

.base-alert-enter-active,
.base-alert-leave-active {
  @apply transition duration-150;
}

.base-alert-enter-from,
.base-alert-leave-to {
  @apply -translate-y-1 opacity-0;
}

@media (prefers-reduced-motion: reduce) {
  .base-alert,
  .base-alert__close,
  .base-alert-enter-active,
  .base-alert-leave-active {
    transition: none !important;
  }
}
</style>
