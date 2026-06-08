<script setup lang="ts">
import { FolderOpen, Zap } from "lucide-vue-next";
import { config } from "../../../config";
import { useI18n } from "../../../composables/useI18n";

const { t } = useI18n();

defineProps<{
  appMode: string;
  dbStatus: string;
  isDbOnline: boolean;
  localPath: string;
}>();
</script>

<template>
  <div class="w-full lg:w-72 shrink-0 flex flex-col gap-4 select-none">
    <!-- 基础状态卡片 -->
    <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
      <div class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{{ t('system.summaryTitle') }}</div>

      <div class="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50 text-xs">
        <span class="text-slate-500 dark:text-slate-400 font-medium">{{ t('system.runMode') }}</span>
        <span class="font-bold text-slate-800 dark:text-slate-200">{{ appMode }}</span>
      </div>

      <div class="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50 text-xs">
        <span class="text-slate-500 dark:text-slate-400 font-medium">{{ t('system.envMode') }}</span>
        <span
          class="px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase"
          :class="config.env === 'development' ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20' : 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20'"
        >
          {{ config.env }}
        </span>
      </div>

      <div class="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50 text-xs">
        <span class="text-slate-500 dark:text-slate-400 font-medium">{{ t('system.dbStatus') }}</span>
        <span
          class="font-bold"
          :class="isDbOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'"
        >
          {{ dbStatus }}
        </span>
      </div>

      <div class="flex items-center justify-between py-1 text-xs">
        <span class="text-slate-500 dark:text-slate-400 font-medium">{{ t('system.logLimit') }}</span>
        <span class="px-1.5 py-0.5 rounded bg-slate-250 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-650 font-bold uppercase text-[9px]">
          &ge; {{ config.logLevel }}
        </span>
      </div>
    </div>

    <!-- 数据目录卡 -->
    <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
      <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        <FolderOpen class="h-4 w-4" />
        {{ t('system.pathTitle') }}
      </div>
      <div class="select-all break-all text-[9.5px] leading-relaxed p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl font-mono">
        {{ localPath }}
      </div>
    </div>

    <!-- 自愈哨兵卡 -->
    <div class="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/20 dark:border-rose-900/20 flex flex-col gap-2">
      <div class="flex items-center gap-1.5 text-[10px] font-bold text-rose-500/70 dark:text-rose-400/80 uppercase tracking-wider">
        <Zap class="h-4 w-4" />
        {{ t('system.sentinelTitle') }}
      </div>
      <div class="text-[10px] leading-relaxed text-slate-500 dark:text-slate-455 font-medium">
        {{ t('system.sentinelDesc') }}
      </div>
    </div>
  </div>
</template>
