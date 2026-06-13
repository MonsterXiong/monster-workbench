<script setup lang="ts">
import { computed, ref } from "vue";
import {
  BookOpen,
  ChevronDown,
  FileCode2,
  FolderTree,
  LayoutGrid,
  Search,
} from "lucide-vue-next";
import type { UtilityDocGroupView, UtilityDocQualityMap, UtilityDocStats } from "../utilsDocsTypes";
import UtilsDocsQualityBadge from "./UtilsDocsQualityBadge.vue";

const props = defineProps<{
  searchKeyword: string;
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
    <div class="shrink-0 border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-[11px] font-black uppercase text-primary">
            <BookOpen class="h-4 w-4" />
            Monster Utils
          </div>
          <div class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {{ docStats.moduleCount }} 模块 / {{ docStats.functionCount }} 函数 / {{ docStats.sandboxReadyCount }} 已接入
          </div>
        </div>
        <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
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
    </div>

    <nav class="min-h-0 flex-1 overflow-y-auto p-3" aria-label="工具函数模块">
      <button
        type="button"
        class="mb-3 flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-left text-xs font-black transition"
        :class="activeDocKey === 'overview' ? 'border-primary bg-primary text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800'"
        @click="emit('select-overview')"
      >
        <span class="flex min-w-0 items-center gap-2">
          <LayoutGrid class="h-4 w-4 shrink-0" />
          <span class="truncate">工具库概览</span>
        </span>
        <span class="text-[10px] opacity-80">{{ visibleStats.moduleCount }}</span>
      </button>

      <section
        v-for="group in docsByGroup"
        :key="group.groupName"
        class="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[11px] font-black text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100"
          :class="expandedGroups.has(group.groupName) ? 'border-b border-slate-100 dark:border-slate-800' : ''"
          @click="emit('toggle-group', group.groupName)"
        >
          <span class="flex min-w-0 items-center gap-2">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <FolderTree class="h-3.5 w-3.5" />
            </span>
            <span class="truncate">{{ group.groupName }}</span>
          </span>
          <span class="flex shrink-0 items-center gap-1.5">
            <span class="rounded-lg border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400">{{ group.docs.length }}</span>
            <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="{ '-rotate-90': !expandedGroups.has(group.groupName) }" />
          </span>
        </button>

        <div v-show="expandedGroups.has(group.groupName)" class="space-y-1 p-2">
          <button
            v-for="entry in group.docs"
            :key="entry.key"
            type="button"
            class="relative w-full rounded-xl border px-3 py-2 text-left transition"
            :class="activeDocKey === entry.key && !selectedFuncName ? 'border-primary/40 bg-indigo-50 shadow-sm dark:border-indigo-400/40 dark:bg-indigo-500/10' : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-900'"
            @click="emit('select-doc', entry.key)"
          >
            <span v-if="activeDocKey === entry.key" class="absolute bottom-2 left-0 top-2 w-0.5 rounded-r bg-primary"></span>
            <div class="flex items-center justify-between gap-2">
              <span class="flex min-w-0 items-center gap-2">
                <FileCode2 class="h-3.5 w-3.5 shrink-0" :class="activeDocKey === entry.key ? 'text-primary' : 'text-slate-400'" />
                <span class="truncate font-mono text-xs font-black" :class="activeDocKey === entry.key ? 'text-primary' : 'text-slate-700 dark:text-slate-300'">
                  {{ entry.key }}
                </span>
              </span>
              <UtilsDocsQualityBadge :report="qualityReports[entry.key]" variant="score" />
            </div>
            <div class="mt-1 truncate text-[10px] font-semibold text-slate-400">
              {{ entry.functions.length }} 函数 / {{ entry.sourceFiles.length }} 文件
            </div>

            <div v-if="activeDocKey === entry.key" class="mt-2 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-700">
              <button
                v-for="fn in entry.functions"
                :key="fn.name"
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-[11px] transition-colors"
                :class="selectedFuncName === fn.name ? 'bg-indigo-100 font-black text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'text-slate-500 hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'"
                @click.stop="emit('select-function', fn.name)"
              >
                <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="selectedFuncName === fn.name ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'"></span>
                <span class="truncate">{{ fn.name }}</span>
              </button>
            </div>
          </button>

          <div v-if="group.docs.length === 0" class="px-3 py-2 text-[10px] font-semibold text-slate-400">
            无匹配结果
          </div>
        </div>
      </section>
    </nav>
  </aside>
</template>
