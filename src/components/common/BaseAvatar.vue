<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";
import { getInitials } from "../../utils";

interface Props {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "busy" | "offline" | "none";
}

const props = withDefaults(defineProps<Props>(), {
  name: "",
  src: "",
  size: "md",
  status: "none",
});

const initials = computed(() => getInitials(props.name));

const { t } = useI18n();

const ariaLabel = computed(() => {
  const displayName = props.name || t("common.avatar");
  if (props.status === "none") return displayName;
  return `${displayName}, ${t(`common.avatarStatus.${props.status}`)}`;
});
</script>

<template>
  <span class="base-avatar" :class="[`base-avatar--${size}`, `base-avatar--${status}`]" role="img" :aria-label="ariaLabel">
    <img v-if="src" :src="src" alt="" aria-hidden="true" />
    <span v-else aria-hidden="true">{{ initials }}</span>
    <i v-if="status !== 'none'" class="base-avatar__status" aria-hidden="true"></i>
  </span>
</template>

<style scoped>
.base-avatar {
  @apply relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 font-black text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200;
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

.base-avatar img {
  @apply h-full w-full object-cover;
}

.base-avatar__status {
  @apply absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-slate-900;
  background-color: var(--avatar-status-color);
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

.base-avatar--online {
  --avatar-status-color: #10b981;
}

.base-avatar--busy {
  --avatar-status-color: #f59e0b;
}

.base-avatar--offline {
  --avatar-status-color: #94a3b8;
}
</style>
