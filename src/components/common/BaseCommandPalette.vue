<script setup lang="ts">
import { computed, nextTick, ref, useAttrs, watch } from "vue";
import { useI18n } from "../../composables/useI18n";
import { createRandomId, filterByFalsyValue, filterBySearchFields, groupByEntries, handleKeyboardIndexNavigation, isEscapeKey, isKeyboardKey, normalizeSearchText } from "../../utils";

defineOptions({
  inheritAttrs: false,
});

export interface CommandPaletteItem {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  group?: string;
  shortcut?: string;
  disabled?: boolean;
  keywords?: string[];
}

interface Props {
  modelValue: boolean;
  items: CommandPaletteItem[];
  title?: string;
  placeholder?: string;
  emptyText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  placeholder: "",
  emptyText: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "select", item: CommandPaletteItem): void;
  (e: "close"): void;
}>();

const query = ref("");
const activeIndex = ref(0);
const attrs = useAttrs();
const rootRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const { t } = useI18n();
const instanceId = createRandomId("base-command-palette");
const titleId = `${instanceId}-title`;

const resolvedTitle = computed(() => props.title || t("common.commandPalette.title"));
const resolvedPlaceholder = computed(() => props.placeholder || t("common.commandPalette.placeholder"));
const resolvedEmptyText = computed(() => props.emptyText || t("common.commandPalette.empty"));

const open = async () => {
  emit("update:modelValue", true);
  await nextTick();
  inputRef.value?.focus();
  return panelRef.value;
};

const close = () => {
  emit("update:modelValue", false);
  emit("close");
};

const clearSearch = () => {
  query.value = "";
  activeIndex.value = 0;
  inputRef.value?.focus();
};

const normalizedQuery = computed(() => normalizeSearchText(query.value));

const filteredItems = computed(() => {
  if (!normalizedQuery.value) return props.items;
  return filterBySearchFields(props.items, normalizedQuery.value, [
      (command) => command.label,
      (command) => command.description,
      (command) => command.group,
      (command) => command.shortcut,
      (command) => command.keywords,
    ]);
});

const enabledItems = computed(() => filterByFalsyValue(filteredItems.value, (item) => item.disabled));

const groupedItems = computed(() => {
  return groupByEntries(filteredItems.value, (item) => item.group || t("common.commandPalette.defaultGroup"))
    .map(({ key, items }) => ({ name: key, items }));
});

const activeItem = computed(() => enabledItems.value[activeIndex.value]);

const handleSelect = (item: CommandPaletteItem) => {
  if (item.disabled) return;
  emit("select", item);
  close();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (isEscapeKey(event)) {
    event.preventDefault();
    close();
    return;
  }
  if (handleKeyboardIndexNavigation(
    event,
    enabledItems.value.length,
    activeIndex.value,
    (nextIndex) => {
      activeIndex.value = nextIndex;
    },
    {
      forwardKeys: ["ArrowDown"],
      backwardKeys: ["ArrowUp"],
      includeBoundary: false,
    }
  )) {
    return;
  }
  if (isKeyboardKey(event, "Enter") && activeItem.value) {
    event.preventDefault();
    handleSelect(activeItem.value);
  }
};

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      query.value = "";
      activeIndex.value = 0;
      return;
    }
    await nextTick();
    inputRef.value?.focus();
  }
);

watch(filteredItems, () => {
  activeIndex.value = 0;
});

defineExpose({
  open,
  close,
  clearSearch,
  focusInput: () => {
    inputRef.value?.focus();
    return inputRef.value;
  },
  getElement: () => rootRef.value,
  getPanelElement: () => panelRef.value,
  getInputElement: () => inputRef.value,
  getQuery: () => query.value,
});
</script>

<template>
  <Teleport to="body">
    <Transition name="base-command-palette-fade">
      <div
        v-if="modelValue"
        v-bind="attrs"
        ref="rootRef"
        class="base-command-palette"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="close"
        @keydown="handleKeydown"
      >
        <section ref="panelRef" class="base-command-palette__panel">
          <header class="base-command-palette__header">
            <div class="base-command-palette__title">
              <BaseIcon name="Command" size="18" aria-hidden="true" />
              <h3 :id="titleId">{{ resolvedTitle }}</h3>
            </div>
            <BaseButton
              type="ghost"
              size="sm"
              native-type="button"
              circle
              class="base-command-palette__close"
              :aria-label="t('common.commandPalette.close')"
              :title="t('common.commandPalette.close')"
              @click="close"
            >
              <template #icon>
                <BaseIcon name="X" size="16" aria-hidden="true" />
              </template>
            </BaseButton>
          </header>

          <label class="base-command-palette__search">
            <BaseIcon name="Search" size="16" aria-hidden="true" />
            <input ref="inputRef" v-model="query" type="search" :placeholder="resolvedPlaceholder" />
          </label>

          <div class="base-command-palette__body">
            <div v-if="!filteredItems.length" class="base-command-palette__empty">
              <BaseIcon name="SearchX" size="20" aria-hidden="true" />
              <span>{{ resolvedEmptyText }}</span>
            </div>

            <div v-for="group in groupedItems" v-else :key="group.name" class="base-command-palette__group">
              <p class="base-command-palette__group-title">{{ group.name }}</p>
              <button
                v-for="item in group.items"
                :key="item.key"
                type="button"
                class="base-command-palette__item"
                :class="{
                  'is-active': activeItem?.key === item.key,
                  'is-disabled': item.disabled,
                }"
                :disabled="item.disabled"
                :aria-current="activeItem?.key === item.key ? 'true' : undefined"
                @click="handleSelect(item)"
              >
                <span class="base-command-palette__item-icon">
                  <BaseIcon :name="item.icon || 'CircleDot'" size="16" aria-hidden="true" />
                </span>
                <span class="base-command-palette__item-main">
                  <strong>{{ item.label }}</strong>
                  <small v-if="item.description">{{ item.description }}</small>
                </span>
                <kbd v-if="item.shortcut">{{ item.shortcut }}</kbd>
              </button>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.base-command-palette {
  @apply fixed inset-0 z-[1100] flex items-start justify-center bg-slate-950/35 px-4 pt-[12vh] backdrop-blur-sm;
}

.base-command-palette__panel {
  @apply flex max-h-[72vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900;
}

.base-command-palette__header {
  @apply flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800;
}

.base-command-palette__title {
  @apply flex min-w-0 items-center gap-2 text-primary;
}

.base-command-palette__title h3 {
  @apply truncate text-sm font-black text-slate-800 dark:text-slate-100;
}

.base-command-palette__close {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100;
  --el-button-size: 2rem;
  border-color: transparent !important;
  background: transparent !important;
  padding: 0 !important;
}

.base-command-palette__search {
  @apply mx-4 mt-4 flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 text-slate-500 transition focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(var(--color-primary),0.14)] dark:border-slate-700 dark:bg-slate-950 dark:focus-within:bg-slate-900;
}

.base-command-palette__search input {
  @apply min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100;
}

.base-command-palette__body {
  @apply min-h-0 flex-1 overflow-y-auto p-4;
}

.base-command-palette__group + .base-command-palette__group {
  @apply mt-4;
}

.base-command-palette__group-title {
  @apply mb-2 px-1 text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500;
}

.base-command-palette__item {
  @apply flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-slate-800;
}

.base-command-palette__item.is-active {
  background-color: rgba(var(--color-primary), 0.1);
}

.base-command-palette__item-icon {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-primary;
  background-color: rgba(var(--color-primary), 0.1);
}

.base-command-palette__item-main {
  @apply min-w-0 flex-1;
}

.base-command-palette__item-main strong {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-command-palette__item-main small {
  @apply mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-command-palette__item kbd {
  @apply shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500;
}

.base-command-palette__empty {
  @apply flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs font-black text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500;
}

.base-command-palette-fade-enter-active,
.base-command-palette-fade-leave-active {
  @apply transition duration-150;
}

.base-command-palette-fade-enter-from,
.base-command-palette-fade-leave-to {
  @apply opacity-0;
}
</style>
