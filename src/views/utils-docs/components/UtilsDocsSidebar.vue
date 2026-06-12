<script setup lang="ts">
import { computed, ref } from "vue";
import {
  BookOpen,
  ChevronDown,
  LayoutGrid,
  Search,
} from "lucide-vue-next";
import type { UtilityDocGroupView, UtilityDocQualityMap, UtilityDocStats, QualityFilter } from "../utilsDocsTypes";
import UtilsDocsQualityBadge from "./UtilsDocsQualityBadge.vue";

const props = defineProps<{
  searchKeyword: string;
  qualityFilter: QualityFilter;
  docStats: UtilityDocStats;
  visibleStats: UtilityDocStats;
  docsByGroup: UtilityDocGroupView[];
  activeDocKey: string | null;
  selectedFuncName: string;
  expandedGroups: Set<string>;
  qualityReports: UtilityDocQualityMap;
}>();

const emit = defineEmits<{
  "update:searchKeyword": [value: string];
  "update:qualityFilter": [value: QualityFilter];
  "select-overview": [];
  "select-doc": [key: string];
  "select-function": [name: string];
  "toggle-group": [groupName: string];
}>();

const searchInputRef = ref<HTMLInputElement | null>(null);
const searchValue = computed({
  get: () => props.searchKeyword,
  set: (value: string) => emit("update:searchKeyword", value),
});
const filterValue = computed({
  get: () => props.qualityFilter,
  set: (value: QualityFilter) => emit("update:qualityFilter", value),
});

function focusSearch() {
  searchInputRef.value?.focus();
}

defineExpose({ focusSearch });
</script>

<template>
  <aside
    class="utils-docs-sidebar flex min-h-0 w-full shrink-0 flex-col border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:max-h-none lg:w-80 lg:border-b-0"
    :class="selectedFuncName ? 'max-h-56' : 'max-h-[44vh]'"
  >
    <div class="shrink-0 border-b border-slate-100 p-4 dark:border-slate-800">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-[11px] font-black uppercase text-primary">
            <BookOpen class="h-4 w-4" />
            Monster Utils
          </div>
          <div class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {{ docStats.moduleCount }} 模块 / {{ docStats.functionCount }} 函数 / {{ docStats.sandboxReadyCount }} 可运行
          </div>
        </div>
        <div class="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {{ docStats.averageQualityScore }}
        </div>
      </div>

      <div class="relative mt-4">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref="searchInputRef"
          v-model="searchValue"
          type="search"
          placeholder="搜索模块、函数、参数"
          class="utils-docs-input w-full rounded-lg border py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none transition dark:text-slate-100"
        />
      </div>

      <div class="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
        <button
          v-for="item in [
            { value: 'all', label: '全部' },
            { value: 'runnable', label: '可运行' },
            { value: 'review', label: '待审查' },
          ]"
          :key="item.value"
          type="button"
          class="rounded-md px-2 py-1.5 text-[11px] font-black transition"
          :class="filterValue === item.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
          @click="filterValue = item.value as QualityFilter"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <nav class="min-h-0 flex-1 space-y-3 overflow-y-auto p-3" aria-label="工具函数模块">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-black transition"
        :class="activeDocKey === 'overview' ? 'bg-primary text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'"
        @click="emit('select-overview')"
      >
        <span class="flex min-w-0 items-center gap-2">
          <LayoutGrid class="h-4 w-4 shrink-0" />
          <span class="truncate">工具库概览</span>
        </span>
        <span class="text-[10px] opacity-80">{{ visibleStats.moduleCount }}</span>
      </button>

      <div v-for="group in docsByGroup" :key="group.groupName" class="space-y-1">
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-black text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          @click="emit('toggle-group', group.groupName)"
        >
          <span class="truncate">{{ group.groupName }}</span>
          <span class="flex items-center gap-1">
            <span>{{ group.docs.length }}</span>
            <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="{ '-rotate-90': !expandedGroups.has(group.groupName) }" />
          </span>
        </button>

        <div v-show="expandedGroups.has(group.groupName)" class="ml-2 space-y-1 border-l border-slate-200 pl-2 dark:border-slate-800">
          <button
            v-for="entry in group.docs"
            :key="entry.key"
            type="button"
            class="w-full rounded-lg px-3 py-2 text-left transition"
            :class="activeDocKey === entry.key && !selectedFuncName ? 'bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'"
            @click="emit('select-doc', entry.key)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate font-mono text-xs font-black" :class="activeDocKey === entry.key ? 'text-primary' : 'text-slate-700 dark:text-slate-300'">
                {{ entry.key }}
              </span>
              <UtilsDocsQualityBadge :report="qualityReports[entry.key]" variant="score" />
            </div>
            <div class="mt-1 truncate text-[10px] font-semibold text-slate-400">
              {{ entry.functions.length }} 函数 / {{ entry.sourceFiles.length }} 文件
            </div>

            <div v-if="activeDocKey === entry.key" class="mt-2 flex flex-col gap-0.5 border-l-2 border-primary border-opacity-20 pl-2">
              <button
                v-for="fn in entry.functions"
                :key="fn.name"
                type="button"
                class="rounded px-2 py-1 text-left font-mono text-[11px] transition-colors"
                :class="selectedFuncName === fn.name ? 'bg-indigo-50 font-black text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'"
                @click.stop="emit('select-function', fn.name)"
              >
                {{ fn.name }}
              </button>
            </div>
          </button>

          <div v-if="group.docs.length === 0" class="px-3 py-2 text-[10px] font-semibold text-slate-400">
            无匹配结果
          </div>
        </div>
      </div>
    </nav>
  </aside>
</template>
