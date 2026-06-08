<script setup lang="ts">
interface ComponentEntry {
  key: string;
  name: string;
  title: string;
  description: string;
}

interface ComponentGroup {
  key: string;
  title: string;
  icon: unknown;
  components: ComponentEntry[];
}

defineProps<{
  groups: ComponentGroup[];
  activeGroupKey: string;
  activeComponentKey: string;
}>();

const emit = defineEmits<{
  (e: "select-group", key: string): void;
  (e: "select-component", key: string): void;
}>();
</script>

<template>
  <aside class="playground-catalog">
    <div class="catalog-heading">
      <span>组件目录</span>
      <strong>{{ groups.length }}</strong>
    </div>

    <div class="catalog-stack">
      <div v-for="group in groups" :key="group.key" class="catalog-group">
        <button
          type="button"
          class="group-tab"
          :class="{ 'is-active': activeGroupKey === group.key }"
          @click="emit('select-group', group.key)"
        >
          <span class="group-tab__main">
            <component :is="group.icon" class="h-4 w-4" />
            <span>{{ group.title }}</span>
          </span>
          <strong>{{ group.components.length }}</strong>
        </button>

        <BaseList
          v-if="activeGroupKey === group.key"
          class="component-list"
          :items="group.components"
          variant="plain"
          size="xs"
          item-key="key"
          label-key="title"
          :active-key="activeComponentKey"
          clickable
          @item-click="(component: ComponentEntry) => emit('select-component', component.key)"
        />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.playground-catalog {
  @apply flex h-full min-h-0 w-full shrink-0 flex-col bg-white/90 px-1 py-2 dark:bg-slate-900/90;
}

.catalog-heading {
  @apply mb-2 flex h-9 shrink-0 items-center justify-between rounded-2xl border border-slate-200 bg-white px-2.5 text-[10px] font-black uppercase tracking-wide text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400;
  background-image:
    linear-gradient(135deg, rgb(var(--color-primary) / 0.08), transparent 38%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.92));
}

.catalog-heading strong {
  @apply rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-primary shadow-sm;
}

:global(.dark) .catalog-heading {
  background-image:
    linear-gradient(135deg, rgb(var(--color-primary) / 0.14), transparent 38%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.88));
}

.catalog-stack {
  @apply min-h-0 flex-1 overflow-y-auto pr-0.5;
  scrollbar-width: none;
}

.catalog-stack::-webkit-scrollbar {
  display: none;
}

.catalog-group {
  @apply relative mb-0.5;
}

.group-tab {
  @apply relative flex h-8 w-full items-center justify-between gap-2 rounded-xl border border-transparent px-2.5 text-left text-[11px] font-black text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

.group-tab.is-active {
  border-color: rgb(var(--color-primary) / 0.18);
  background:
    linear-gradient(90deg, rgb(var(--color-primary) / 0.14), rgb(var(--color-primary) / 0.05) 64%, transparent);
  box-shadow:
    0 8px 18px rgba(15, 23, 42, 0.06),
    inset 0 0 0 1px rgba(255, 255, 255, 0.66);
  @apply text-primary;
}

.group-tab.is-active::before {
  content: "";
  @apply absolute left-0.5 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-primary;
}

.group-tab__main {
  @apply flex min-w-0 items-center gap-2;
}

.group-tab__main span {
  @apply truncate;
}

.group-tab strong {
  @apply shrink-0 rounded-full px-1.5 py-0.5 text-[10px] text-slate-400 transition dark:text-slate-500;
}

.group-tab.is-active strong {
  background-color: rgb(var(--color-primary) / 0.12);
  @apply text-primary shadow-sm;
}

.component-list {
  @apply my-1 ml-1 space-y-1 rounded-xl border border-slate-200 bg-slate-50/70 p-1 dark:border-slate-800 dark:bg-slate-950/70;
  width: calc(100% - 0.25rem);
}

.component-list :deep(.base-list--plain.base-list--xs .base-list__item) {
  @apply rounded-lg;
}

.component-list :deep(.base-list__label) {
  @apply text-[11px];
}
</style>
