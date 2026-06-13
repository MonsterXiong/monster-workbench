<script setup lang="ts">
import {
  ChevronRight,
  Code2,
  Copy,
  FileText,
  Layers3,
  XCircle,
  CheckCircle2,
} from "lucide-vue-next";
import BaseCodeBlock from "../../../components/common/BaseCodeBlock.vue";
import type { UtilityDocEntry, UtilityDocQualityReport } from "../utilsDocsContent";
import { formatSourceFiles } from "../utilsDocsUi";
import UtilsDocsQualityBadge from "./UtilsDocsQualityBadge.vue";

defineProps<{
  doc: UtilityDocEntry;
  quality: UtilityDocQualityReport | null;
  importSnippet: string;
}>();

const emit = defineEmits<{
  "select-overview": [];
  "select-function": [name: string];
  "copy-import": [];
  "copy-source-files": [];
}>();
</script>

<template>
  <div class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 p-4">
    <header class="utils-docs-panel flex shrink-0 flex-col gap-3 p-4">
      <div class="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
        <button type="button" class="hover:text-primary" @click="emit('select-overview')">工具库</button>
        <ChevronRight class="h-4 w-4" />
        <span class="font-black text-slate-800 dark:text-slate-200">{{ doc.title }}</span>
      </div>

      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-xl font-black text-slate-950 dark:text-white">{{ doc.title }}</h1>
            <span class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">{{ doc.group }}</span>
            <UtilsDocsQualityBadge v-if="quality" :report="quality" variant="compact" />
          </div>
          <p class="mt-2 max-w-5xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">{{ doc.description }}</p>
        </div>

        <div class="flex shrink-0 flex-wrap gap-2">
          <button type="button" class="utils-docs-action" @click="emit('copy-import')">
            <Copy class="h-3.5 w-3.5" />
            复制导入
          </button>
          <button type="button" class="utils-docs-action" @click="emit('copy-source-files')">
            <FileText class="h-3.5 w-3.5" />
            复制文件
          </button>
        </div>
      </div>
    </header>

    <div class="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section class="utils-docs-panel flex min-h-0 flex-col overflow-hidden">
        <header class="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 class="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
            <Layers3 class="h-4 w-4 text-primary" />
            函数清单
          </h2>
          <div class="text-xs font-black text-slate-400">{{ doc.functions.length }} 个函数</div>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            <button
              v-for="fn in doc.functions"
              :key="fn.name"
              type="button"
              class="utils-docs-card group min-w-0 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary"
              @click="emit('select-function', fn.name)"
            >
              <div class="flex items-start justify-between gap-2">
                <h3 class="min-w-0 break-words font-mono text-sm font-black text-indigo-700 dark:text-indigo-300">{{ fn.name }}</h3>
                <CheckCircle2 v-if="fn.sandbox?.enabled !== false" class="h-4 w-4 shrink-0 text-emerald-500" />
                <XCircle v-else class="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
              </div>
              <p class="mt-2 line-clamp-3 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{{ fn.description }}</p>
              <div class="mt-3 text-[10px] font-black text-primary opacity-80">查看详情</div>
            </button>
          </div>
        </div>
      </section>

      <aside class="utils-docs-panel flex min-h-0 flex-col overflow-hidden">
        <header class="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-black text-slate-800 dark:border-slate-800 dark:text-slate-200">
          <FileText class="h-4 w-4 text-primary" />
          源文件与导入
        </header>
        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <div class="mb-2 text-[11px] font-black uppercase text-slate-400">Source Files</div>
            <BaseCodeBlock
              :code="formatSourceFiles(doc.sourceFiles)"
              language="text"
              size="sm"
              max-height="260px"
              :show-line-numbers="false"
              copyable
              wrap
            />
          </div>
          <div>
            <div class="mb-2 flex items-center gap-2 text-[11px] font-black uppercase text-slate-400">
              <Code2 class="h-3.5 w-3.5 text-primary" />
              Recommended Import
            </div>
            <BaseCodeBlock
              :code="importSnippet"
              language="ts"
              size="sm"
              max-height="140px"
              :show-line-numbers="false"
              copyable
              wrap
            />
          </div>
          <div v-if="quality" class="grid grid-cols-2 gap-2">
            <div class="utils-docs-mini-stat">
              <span>示例</span>
              <strong>{{ quality.exampleCount }}</strong>
            </div>
            <div class="utils-docs-mini-stat">
              <span>边界</span>
              <strong>{{ quality.boundaryCaseCount }}</strong>
            </div>
            <div class="utils-docs-mini-stat">
              <span>沙箱</span>
              <strong>{{ quality.sandboxReadyCount }}</strong>
            </div>
            <div class="utils-docs-mini-stat">
              <span>完整度</span>
              <strong class="text-emerald-600 dark:text-emerald-400">{{ quality.score }}</strong>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.utils-docs-mini-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid rgba(203, 213, 225, 0.78);
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.8);
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
}

.utils-docs-mini-stat strong {
  font-size: 14px;
  font-weight: 900;
  color: #0f172a;
}

:global(.dark) .utils-docs-mini-stat {
  border-color: rgba(51, 65, 85, 0.86);
  background: rgba(2, 6, 23, 0.55);
  color: #94a3b8;
}

:global(.dark) .utils-docs-mini-stat strong {
  color: #f8fafc;
}
</style>
