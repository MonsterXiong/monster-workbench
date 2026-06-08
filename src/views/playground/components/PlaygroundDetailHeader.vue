<script setup lang="ts">
interface BreadcrumbItem {
  key: string;
  label: string;
  icon?: string;
}

defineProps<{
  breadcrumbs: BreadcrumbItem[];
  name: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <div class="detail-heading">
    <div class="detail-heading__mark">
      <BaseIcon name="Component" :size="18" />
    </div>

    <div class="detail-heading__body">
      <BaseBreadcrumb :items="breadcrumbs" />
      <div class="detail-heading__title-row">
        <div class="min-w-0">
          <h3>{{ name }}</h3>
          <p>{{ description }}</p>
        </div>
        <BaseBadge type="primary" variant="outline">{{ title }}</BaseBadge>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-heading {
  @apply mx-3 mt-3 mb-3 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:mx-4 lg:mt-4 lg:px-5;
  background-image:
    linear-gradient(135deg, rgb(var(--color-primary) / 0.06), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.86));
}

:global(.dark) .detail-heading {
  background-image:
    linear-gradient(135deg, rgb(var(--color-primary) / 0.12), transparent 42%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.86));
}

.detail-heading__mark {
  @apply mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm;
}

.detail-heading__body {
  @apply min-w-0 flex-1;
}

.detail-heading__title-row {
  @apply mt-2 flex min-w-0 items-start justify-between gap-3;
}

.detail-heading h3 {
  @apply truncate text-lg font-black text-slate-800 dark:text-slate-100;
}

.detail-heading p {
  @apply mt-1 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400;
}

@media (max-width: 640px) {
  .detail-heading {
    @apply mx-2 flex-col;
  }

  .detail-heading__title-row {
    @apply flex-col;
  }
}
</style>
