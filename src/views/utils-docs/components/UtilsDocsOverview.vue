<script setup lang="ts">
import {
  CheckCircle2,
  Gauge,
  Layers3,
  ShieldCheck,
} from "lucide-vue-next";
import type { UtilityDocEntry } from "../utilsDocsContent";
import type { UtilityDocQualityMap, UtilityDocStats } from "../utilsDocsTypes";
import UtilsDocsQualityBadge from "./UtilsDocsQualityBadge.vue";

defineProps<{
  docs: UtilityDocEntry[];
  visibleStats: UtilityDocStats;
  qualityReports: UtilityDocQualityMap;
}>();

const emit = defineEmits<{
  "select-doc": [key: string];
}>();
</script>

<template>
  <div class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 p-4">
    <section class="utils-docs-panel p-4">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-[11px] font-black uppercase text-primary">
            <ShieldCheck class="h-4 w-4" />
            工具函数文档
          </div>
          <h1 class="mt-1 text-xl font-black text-slate-950 dark:text-white">公共工具库审查台</h1>
          <p class="mt-1 max-w-4xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            按模块核对工具函数用途、参数、示例、边界行为和隔离运行结果。
          </p>
        </div>

        <div class="grid min-w-[360px] grid-cols-4 gap-2">
          <div class="utils-docs-metric">
            <div class="metric-label">模块</div>
            <div class="metric-value">{{ visibleStats.moduleCount }}</div>
          </div>
          <div class="utils-docs-metric">
            <div class="metric-label">函数</div>
            <div class="metric-value">{{ visibleStats.functionCount }}</div>
          </div>
          <div class="utils-docs-metric">
            <div class="metric-label">沙箱</div>
            <div class="metric-value">{{ visibleStats.sandboxReadyCount }}</div>
          </div>
          <div class="utils-docs-metric">
            <div class="metric-label">质量</div>
            <div class="metric-value text-emerald-600 dark:text-emerald-400">{{ visibleStats.averageQualityScore }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="utils-docs-panel flex min-h-0 flex-col overflow-hidden">
      <header class="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <h2 class="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
          <Layers3 class="h-4 w-4 text-primary" />
          模块目录
        </h2>
        <div class="text-xs font-black text-slate-400">{{ docs.length }} 个模块</div>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto p-4">
        <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          <article
            v-for="doc in docs"
            :key="doc.key"
            class="utils-docs-card group cursor-pointer p-4 transition hover:-translate-y-0.5 hover:border-primary"
            @click="emit('select-doc', doc.key)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="font-mono text-sm font-black text-primary">{{ doc.key }}</div>
                <h3 class="mt-1 truncate text-base font-black text-slate-950 dark:text-white">{{ doc.title }}</h3>
              </div>
              <UtilsDocsQualityBadge :report="qualityReports[doc.key]" />
            </div>

            <p class="mt-3 line-clamp-2 min-h-10 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {{ doc.description }}
            </p>

            <div class="mt-4 grid grid-cols-4 gap-2 text-center">
              <div class="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-950">
                <div class="text-sm font-black text-slate-900 dark:text-white">{{ doc.functions.length }}</div>
                <div class="text-[9px] font-bold text-slate-400">函数</div>
              </div>
              <div class="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-950">
                <div class="text-sm font-black text-slate-900 dark:text-white">{{ doc.examples.length }}</div>
                <div class="text-[9px] font-bold text-slate-400">示例</div>
              </div>
              <div class="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-950">
                <div class="text-sm font-black text-slate-900 dark:text-white">{{ doc.boundaryCases.length }}</div>
                <div class="text-[9px] font-bold text-slate-400">边界</div>
              </div>
              <div class="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-950">
                <div class="text-sm font-black text-slate-900 dark:text-white">{{ qualityReports[doc.key].sandboxReadyCount }}</div>
                <div class="text-[9px] font-bold text-slate-400">沙箱</div>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap gap-1.5">
              <span
                v-for="fn in doc.functions.slice(0, 4)"
                :key="fn.name"
                class="inline-flex max-w-full items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                <CheckCircle2 v-if="fn.sandbox?.enabled !== false" class="h-2.5 w-2.5 shrink-0 text-emerald-500" />
                <Gauge v-else class="h-2.5 w-2.5 shrink-0 text-slate-300" />
                <span class="truncate">{{ fn.name }}</span>
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.utils-docs-metric {
  border: 1px solid rgba(203, 213, 225, 0.82);
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.86);
  padding: 10px 12px;
}

.metric-label {
  font-size: 10px;
  font-weight: 900;
  color: #94a3b8;
}

.metric-value {
  margin-top: 2px;
  font-size: 20px;
  font-weight: 900;
  line-height: 1.2;
}

:global(.dark) .utils-docs-metric {
  border-color: rgba(51, 65, 85, 0.86);
  background: rgba(2, 6, 23, 0.55);
}
</style>
