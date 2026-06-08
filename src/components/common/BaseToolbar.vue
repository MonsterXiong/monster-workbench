<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";

interface Props {
  compact?: boolean;
  wrap?: boolean;
  role?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  wrap: true,
  role: "toolbar",
  ariaLabel: "",
});

const { t } = useI18n();
const toolbarLabel = computed(() => props.ariaLabel || (props.role === "toolbar" ? t("common.toolbar") : ""));
</script>

<template>
  <div
    class="base-toolbar"
    :class="{ 'base-toolbar--compact': compact, 'base-toolbar--nowrap': !wrap }"
    :role="role || undefined"
    :aria-label="toolbarLabel || undefined"
  >
    <div v-if="$slots.left" class="base-toolbar__group">
      <slot name="left"></slot>
    </div>
    <div v-if="$slots.default" class="base-toolbar__group base-toolbar__group--main">
      <slot></slot>
    </div>
    <div v-if="$slots.right" class="base-toolbar__group">
      <slot name="right"></slot>
    </div>
  </div>
</template>

<style scoped>
.base-toolbar {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.base-toolbar--compact {
  @apply gap-2 p-2;
}

.base-toolbar--nowrap {
  @apply flex-nowrap overflow-x-auto;
}

.base-toolbar__group {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}

.base-toolbar--nowrap .base-toolbar__group {
  @apply flex-nowrap;
}

.base-toolbar__group--main {
  @apply flex-1 justify-center;
}
</style>
