<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { RefreshCw, Download, Send, Trash2 } from "lucide-vue-next";
import { useI18n } from "../../../composables/useI18n";

const { t } = useI18n();

const props = defineProps<{
  filteredLines: string[];
  loading: boolean;
  activeFilter: string;
}>();

const emit = defineEmits<{
  (e: "update:activeFilter", val: string): void;
  (e: "refresh"): void;
  (e: "export"): void;
  (e: "report"): void;
  (e: "clear"): void;
}>();

const logTerminal = ref<HTMLElement | null>(null);

watch(
  () => props.filteredLines,
  async () => {
    await nextTick();
    if (logTerminal.value) {
      logTerminal.value.scrollTop = logTerminal.value.scrollHeight;
    }
  },
  { deep: true }
);

// 终端行高亮配色
function getLineColorClass(line: string): string {
  if (line.includes("[ERROR]")) return "text-rose-600 dark:text-red-400 font-extrabold";
  if (line.includes("[WARN]")) return "text-amber-600 dark:text-amber-400 font-semibold";
  if (line.includes("[DEBUG]")) return "text-slate-500 dark:text-slate-500 font-medium";
  return "text-slate-700 dark:text-sky-300";
}
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0">
    <div class="flex items-center justify-between gap-3 shrink-0 pb-3 select-none">
      <!-- 级别过滤 -->
      <div class="flex gap-1.5 bg-slate-50 dark:bg-slate-800 p-0.5 rounded-full border border-slate-200 dark:border-slate-700">
        <button
          v-for="filter in ['all', 'debug', 'info', 'warn', 'error']"
          :key="filter"
          class="px-2.5 py-0.5 text-[9.5px] font-bold rounded-full cursor-pointer transition-all"
          :class="activeFilter === filter ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'"
          @click="emit('update:activeFilter', filter)"
        >
          {{ filter === 'all' ? t('system.logFilterAll') : filter.toUpperCase() }}
        </button>
      </div>

      <!-- 控制钮 -->
      <div class="flex items-center gap-2">
        <BaseButton size="sm" type="ghost" :loading="loading" @click="emit('refresh')">
          <template #icon><RefreshCw class="h-3.5 w-3.5" /></template>
          {{ t('system.refresh') }}
        </BaseButton>
        <BaseButton size="sm" type="ghost" @click="emit('export')">
          <template #icon><Download class="h-3.5 w-3.5" /></template>
          {{ t('system.export') }}
        </BaseButton>
        <BaseButton size="sm" type="ghost" @click="emit('report')">
          <template #icon><Send class="h-3.5 w-3.5" /></template>
          {{ t('system.report') }}
        </BaseButton>
        <BaseButton size="sm" type="danger" outline @click="emit('clear')">
          <template #icon><Trash2 class="h-3.5 w-3.5" /></template>
          {{ t('system.clear') }}
        </BaseButton>
      </div>
    </div>

    <!-- Shell Terminal -->
    <div class="flex-1 flex flex-col min-h-0 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 p-4 shadow-sm relative font-mono">
      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 shrink-0 select-none">
        <div class="flex gap-1.5">
          <span class="h-2.5 w-2.5 rounded-full bg-red-500"></span>
          <span class="h-2.5 w-2.5 rounded-full bg-yellow-500"></span>
          <span class="h-2.5 w-2.5 rounded-full bg-green-500"></span>
        </div>
        <span class="text-[9.5px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          {{ t('system.terminalTitle') }}
        </span>
      </div>

      <div
        ref="logTerminal"
        class="flex-1 overflow-y-auto no-scrollbar text-[10px] leading-5 space-y-1.5 mt-3 pr-1"
      >
        <div v-if="filteredLines.length === 0" class="py-16 text-center text-slate-500 italic">
          {{ t('system.emptyLog') }}
        </div>
        <div
          v-for="(line, idx) in filteredLines"
          :key="idx"
          class="flex gap-2 select-text hover:bg-white dark:hover:bg-slate-800/50 py-0.5 rounded px-1 transition-colors"
        >
          <span class="text-slate-400 dark:text-slate-550 select-none text-right w-6">{{ idx + 1 }}</span>
          <span class="text-primary select-none font-bold shrink-0">&gt;</span>
          <span class="break-all whitespace-pre-wrap flex-1" :class="getLineColorClass(line)">
            {{ line }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
