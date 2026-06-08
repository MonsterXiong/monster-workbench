<script setup lang="ts">
import { findLastItem, findNextCircularItem } from "../../utils";
import BaseIcon from "./BaseIcon.vue";

interface TabItem {
  key: string | number;
  title: string;
  icon?: any; // 可以是字符串(图标名)或 Vue 组件
  badge?: string | number;
  badgeColor?: string; // 如 bg-red-500 text-white 等标准的 Tailwind 类名
  disabled?: boolean;
}

interface Props {
  modelValue: string | number;
  tabs: TabItem[];
  variant?: "pills" | "underline";
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "pills",
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", key: string | number): void;
}>();

const selectTab = (tab: TabItem) => {
  if (tab.disabled) return;
  emit("update:modelValue", tab.key);
};

const moveTab = (direction: 1 | -1) => {
  const enabledTabs = props.tabs.filter((tab) => !tab.disabled);
  if (!enabledTabs.length) return;
  const nextTab = findNextCircularItem(enabledTabs, (tab) => tab.key === props.modelValue, direction);
  if (nextTab) selectTab(nextTab);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    moveTab(1);
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    moveTab(-1);
  }
  if (event.key === "Home") {
    event.preventDefault();
    const firstTab = props.tabs.find((tab) => !tab.disabled);
    if (firstTab) selectTab(firstTab);
  }
  if (event.key === "End") {
    event.preventDefault();
    const lastTab = findLastItem(props.tabs, (tab) => !tab.disabled);
    if (lastTab) selectTab(lastTab);
  }
};
</script>

<template>
  <div
    class="flex no-scrollbar select-none"
    :class="{
      'p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit': variant === 'pills',
      'border-b border-slate-200 dark:border-slate-800 gap-6 w-full': variant === 'underline'
    }"
    role="tablist"
    :aria-label="ariaLabel || undefined"
    @keydown="handleKeydown"
  >
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      role="tab"
      :disabled="tab.disabled"
      :aria-selected="modelValue === tab.key"
      :tabindex="modelValue === tab.key ? 0 : -1"
      class="relative flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-all duration-300 font-bold cursor-pointer"
      :class="{
        // pills 模式下的选中与非选中样式
        'px-4 py-2 text-xs rounded-xl': variant === 'pills',
        'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-700/50': variant === 'pills' && modelValue === tab.key,
        'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200': variant === 'pills' && modelValue !== tab.key && !tab.disabled,

        // underline 模式下的选中与非选中样式
        'px-1 py-3 text-sm border-b-2 -mb-[2px] rounded-none': variant === 'underline',
        'border-primary text-primary': variant === 'underline' && modelValue === tab.key,
        'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200': variant === 'underline' && modelValue !== tab.key && !tab.disabled,

        // 禁用状态
        'opacity-40 cursor-not-allowed': tab.disabled
      }"
      @click="selectTab(tab)"
    >
      <!-- Icon 渲染 -->
      <span v-if="tab.icon" class="shrink-0 flex items-center" aria-hidden="true">
        <BaseIcon v-if="typeof tab.icon === 'string'" :name="tab.icon" size="15" aria-hidden="true" />
        <component :is="tab.icon" v-else class="h-3.5 w-3.5" aria-hidden="true" />
      </span>

      <!-- Title -->
      <span>{{ tab.title }}</span>

      <!-- Badge 渲染 -->
      <span
        v-if="tab.badge !== undefined && tab.badge !== ''"
        class="text-[9px] px-1.5 py-0.5 rounded-full shadow-sm shrink-0 font-bold leading-none"
        :class="tab.badgeColor || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'"
        aria-hidden="true"
      >
        {{ tab.badge }}
      </span>
    </button>
  </div>
</template>

<style scoped>
/* 确保滚动平滑且无滚动条 */
.no-scrollbar {
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
