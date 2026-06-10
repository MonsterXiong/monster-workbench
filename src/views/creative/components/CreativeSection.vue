<script setup lang="ts">
withDefaults(defineProps<{
  title?: string;
  subtitle?: string;
  icon?: string;
}>(), {
  title: "",
  subtitle: "",
  icon: "",
});
</script>

<template>
  <section class="creative-section">
    <BaseSectionHeader
      v-if="title || subtitle || icon || $slots.actions"
      class="creative-section__header"
      :title="title"
      :subtitle="subtitle"
      :icon="icon"
      :divided="false"
    >
      <template v-if="$slots.actions" #actions>
        <slot name="actions"></slot>
      </template>
    </BaseSectionHeader>
    <div class="creative-section__body">
      <slot></slot>
    </div>
  </section>
</template>

<style scoped>
.creative-section {
  @apply flex min-h-0 flex-none flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900;
  box-shadow:
    0 12px 28px rgba(15, 23, 42, 0.045),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.creative-section__header {
  @apply mb-3 shrink-0 pb-0;
}

.creative-section__body {
  @apply min-h-0 space-y-3;
}

:global(.dark) .creative-section {
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(148, 163, 184, 0.08);
}
</style>
