<script setup lang="ts">
import { computed, ref, useAttrs } from "vue";
import { useI18n } from "../../composables/useI18n";
import { getInitials, joinNonEmptyStrings } from "../../utils";
import { getElementPlusControlRoot, type ElementPlusControlRef } from "./elementPlusDom";

defineOptions({
  inheritAttrs: false,
});

type AvatarFit = "fill" | "contain" | "cover" | "none" | "scale-down";

interface Props {
  name?: string;
  src?: string;
  srcSet?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: "online" | "busy" | "offline" | "none";
  shape?: "circle" | "rounded";
  fit?: AvatarFit;
  fallback?: string;
  icon?: string;
  alt?: string;
  ariaLabel?: string;
  statusLabel?: string;
  clickable?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  name: "",
  src: "",
  srcSet: "",
  size: "md",
  status: "none",
  shape: "circle",
  fit: "cover",
  fallback: "?",
  icon: "",
  alt: "",
  ariaLabel: "",
  statusLabel: "",
  clickable: false,
  disabled: false,
  loading: false,
});

const emit = defineEmits<{
  (e: "click", event: MouseEvent): void;
  (e: "error", event: Event): void;
}>();

const attrs = useAttrs();
const { t } = useI18n();
const rootRef = ref<HTMLButtonElement | HTMLSpanElement | null>(null);
const avatarRef = ref<ElementPlusControlRef>(null);
const initials = computed(() => getInitials(props.name, props.fallback));
const isInteractive = computed(() => props.clickable && !props.disabled && !props.loading);
const avatarSrc = computed(() => (props.loading ? "" : props.src));
const avatarSize = computed(() => {
  if (props.size === "xs") return 24;
  if (props.size === "sm") return 28;
  if (props.size === "lg") return 48;
  if (props.size === "xl") return 64;
  return 36;
});
const avatarShape = computed(() => (props.shape === "rounded" ? "square" : "circle"));

const ariaLabel = computed(() => {
  if (props.ariaLabel) return props.ariaLabel;
  const displayName = props.name || t("common.avatar");
  const statusLabel = props.statusLabel || (props.status === "none" ? "" : t(`common.avatarStatus.${props.status}`));
  const loadingLabel = props.loading ? t("common.loading") : "";
  return joinNonEmptyStrings([displayName, statusLabel, loadingLabel], ", ");
});

const handleClick = (event: MouseEvent) => {
  if (!isInteractive.value) return;
  emit("click", event);
};

const getElement = () => rootRef.value;
const getAvatarElement = () => getElementPlusControlRoot(avatarRef.value);
const focus = () => {
  if (!isInteractive.value) return null;
  rootRef.value?.focus();
  return rootRef.value;
};

defineExpose({
  focus,
  getNativeAvatar: () => avatarRef.value,
  getElement,
  getAvatarElement,
});
</script>

<template>
  <component
    v-bind="attrs"
    :is="clickable ? 'button' : 'span'"
    ref="rootRef"
    :type="clickable ? 'button' : undefined"
    class="base-avatar"
    :class="[
      `base-avatar--${size}`,
      `base-avatar--${status}`,
      `base-avatar--${shape}`,
      {
        'is-disabled': disabled,
        'is-loading': loading,
        'is-clickable': isInteractive,
      },
    ]"
    :role="clickable ? undefined : 'img'"
    :disabled="clickable ? disabled || loading : undefined"
    :aria-label="ariaLabel"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled || loading ? 'true' : undefined"
    @click="handleClick"
  >
    <el-avatar
      ref="avatarRef"
      class="base-avatar__core"
      :src="avatarSrc"
      :alt="alt"
      :src-set="srcSet || undefined"
      :size="avatarSize"
      :shape="avatarShape"
      :fit="fit"
      aria-hidden="true"
      @error="emit('error', $event)"
    >
      <span v-if="loading" class="base-avatar__spinner" aria-hidden="true">
        <BaseIcon name="LoaderCircle" size="14" />
      </span>
      <BaseIcon v-else-if="icon" :name="icon" size="16" aria-hidden="true" />
      <span v-else class="base-avatar__initials" aria-hidden="true">{{ initials }}</span>
    </el-avatar>
    <i v-if="status !== 'none'" class="base-avatar__status" aria-hidden="true"></i>
  </component>
</template>

<style scoped>
.base-avatar {
  @apply relative inline-flex shrink-0 items-center justify-center border-0 bg-transparent p-0 font-black outline-none transition;
}

button.base-avatar {
  @apply cursor-pointer focus:ring-2 focus:ring-primary focus:ring-opacity-20 disabled:cursor-not-allowed;
  appearance: none;
}

.base-avatar__core {
  @apply h-full w-full border border-slate-200 bg-slate-100 font-black text-slate-600 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200;
  font-size: inherit;
}

button.base-avatar:hover .base-avatar__core {
  @apply border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100;
}

.base-avatar--circle .base-avatar__core {
  @apply rounded-full;
}

.base-avatar--rounded .base-avatar__core {
  @apply rounded-xl;
}

.base-avatar--xs {
  @apply h-6 w-6 text-[9px];
}

.base-avatar--sm {
  @apply h-7 w-7 text-[10px];
}

.base-avatar--md {
  @apply h-9 w-9 text-xs;
}

.base-avatar--lg {
  @apply h-12 w-12 text-sm;
}

.base-avatar--xl {
  @apply h-16 w-16 text-base;
}

.base-avatar__core :deep(img) {
  @apply h-full w-full;
}

.base-avatar__initials {
  @apply max-w-full truncate px-1;
}

.base-avatar__spinner {
  @apply inline-flex items-center justify-center text-primary;
}

.base-avatar__spinner :deep(svg) {
  animation: base-avatar-spin 0.9s linear infinite;
}

.base-avatar__status {
  @apply absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-slate-900;
  background-color: var(--avatar-status-color);
}

.base-avatar--xs .base-avatar__status {
  @apply h-2 w-2 border;
}

.base-avatar--sm .base-avatar__status {
  @apply h-2.5 w-2.5;
}

.base-avatar--md .base-avatar__status {
  @apply h-3 w-3;
}

.base-avatar--lg .base-avatar__status {
  @apply h-3.5 w-3.5;
}

.base-avatar--xl .base-avatar__status {
  @apply h-4 w-4;
}

.base-avatar.is-disabled,
.base-avatar.is-loading {
  @apply opacity-70;
}

.base-avatar--online {
  --avatar-status-color: #10b981;
}

.base-avatar--busy {
  --avatar-status-color: #f59e0b;
}

.base-avatar--offline {
  --avatar-status-color: #94a3b8;
}

@media (prefers-reduced-motion: reduce) {
  .base-avatar,
  .base-avatar__spinner :deep(svg) {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes base-avatar-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
