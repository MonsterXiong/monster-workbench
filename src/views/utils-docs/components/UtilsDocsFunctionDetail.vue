<script setup lang="ts">
import {
  AlertTriangle,
  Braces,
  CheckCircle2,
  ChevronRight,
  Code2,
  Copy,
  Layers3,
  SplitSquareHorizontal,
  Terminal,
  XCircle,
} from "lucide-vue-next";
import BaseCodeBlock from "../../../components/common/BaseCodeBlock.vue";
import type {
  UtilityBoundaryCase,
  UtilityDocEntry,
  UtilityExampleRow,
  UtilityFunctionDoc,
} from "../utilsDocsContent";
import type { UtilityFunctionParam } from "../utilsDocsTypes";
import { stringifyExample } from "../utilsDocsUi";

defineProps<{
  doc: UtilityDocEntry;
  functionDoc: UtilityFunctionDoc;
  params: UtilityFunctionParam[];
  signature: string;
  snippets: string[];
  examples: UtilityExampleRow[];
  boundaryCases: UtilityBoundaryCase[];
}>();

const emit = defineEmits<{
  "select-overview": [];
  "select-module": [];
  "copy-import": [];
}>();
</script>

<template>
  <div class="h-full min-h-0 overflow-y-auto p-4">
    <div class="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
      <button type="button" class="hover:text-primary" @click="emit('select-overview')">工具库</button>
      <ChevronRight class="h-4 w-4" />
      <button type="button" class="hover:text-primary" @click="emit('select-module')">{{ doc.title }}</button>
      <ChevronRight class="h-4 w-4" />
      <span class="font-mono font-black text-slate-800 dark:text-slate-200">{{ functionDoc.name }}</span>
    </div>

    <article class="utils-docs-panel overflow-hidden">
      <header class="border-b border-slate-100 p-4 dark:border-slate-800">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="break-words font-mono text-2xl font-black text-indigo-900 dark:text-indigo-100">{{ functionDoc.name }}</h1>
              <span v-if="functionDoc.sandbox?.enabled !== false" class="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 class="h-3 w-3" />
                可运行
              </span>
              <span v-else class="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                <XCircle class="h-3 w-3" />
                静态审查
              </span>
            </div>
            <p class="mt-3 max-w-5xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{{ functionDoc.description }}</p>
          </div>

          <button type="button" class="utils-docs-action" @click="emit('copy-import')">
            <Copy class="h-3.5 w-3.5" />
            复制导入
          </button>
        </div>

        <BaseCodeBlock
          class="mt-4"
          :code="signature"
          language="ts"
          size="sm"
          max-height="140px"
          :show-line-numbers="false"
          copyable
          wrap
        />
      </header>

      <div class="min-w-0 space-y-4 p-4">
        <section v-if="params.length > 0" class="utils-docs-section">
          <h2 class="utils-docs-section-title">
            <Layers3 class="h-4 w-4 text-primary" />
            参数说明
          </h2>
          <div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table class="w-full min-w-[720px] text-left text-sm">
              <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th class="border-b border-slate-200 px-4 py-3 font-black dark:border-slate-800">参数</th>
                  <th class="border-b border-slate-200 px-4 py-3 font-black dark:border-slate-800">类型</th>
                  <th class="border-b border-slate-200 px-4 py-3 font-black dark:border-slate-800">必填</th>
                  <th class="border-b border-slate-200 px-4 py-3 font-black dark:border-slate-800">说明</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr v-for="param in params" :key="param.name" class="align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td class="px-4 py-3 font-mono text-xs font-black text-indigo-600 dark:text-indigo-300">{{ param.name }}</td>
                  <td class="max-w-[320px] break-words px-4 py-3 font-mono text-xs font-bold text-amber-600 dark:text-amber-300">{{ param.type }}</td>
                  <td class="px-4 py-3">
                    <span v-if="param.required" class="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">必填</span>
                    <span v-else class="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-400">可选</span>
                  </td>
                  <td class="min-w-[240px] px-4 py-3 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{{ param.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="functionDoc.returns" class="utils-docs-section">
          <h2 class="utils-docs-section-title">
            <Terminal class="h-4 w-4 text-primary" />
            返回值
          </h2>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <code class="break-words font-mono text-xs font-black text-amber-600 dark:text-amber-300">{{ functionDoc.returns.type }}</code>
            <p class="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{{ functionDoc.returns.description }}</p>
          </div>
        </section>

        <section v-if="functionDoc.throws && functionDoc.throws.length > 0" class="utils-docs-section">
          <h2 class="mb-3 flex items-center gap-2 text-sm font-black text-rose-600 dark:text-rose-300">
            <AlertTriangle class="h-4 w-4" />
            异常说明
          </h2>
          <div class="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/40">
            <ul class="list-disc space-y-1 pl-5">
              <li v-for="throwDesc in functionDoc.throws" :key="throwDesc" class="text-xs font-semibold leading-5 text-rose-700 dark:text-rose-300">
                {{ throwDesc }}
              </li>
            </ul>
          </div>
        </section>

        <section class="utils-docs-section">
          <h2 class="utils-docs-section-title">
            <Braces class="h-4 w-4 text-primary" />
            典型使用
          </h2>
          <div class="grid gap-3 2xl:grid-cols-2">
            <BaseCodeBlock
              v-for="snippet in snippets"
              :key="snippet"
              :code="snippet"
              language="ts"
              size="sm"
              max-height="220px"
              :show-line-numbers="false"
              copyable
              wrap
            />
          </div>
        </section>

        <section v-if="examples.length > 0" class="utils-docs-section">
          <h2 class="utils-docs-section-title">
            <Code2 class="h-4 w-4 text-primary" />
            执行示例
          </h2>
          <div class="grid gap-3 2xl:grid-cols-2">
            <article v-for="example in examples" :key="example.label" class="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <div class="mb-3 min-w-0">
                <div class="truncate text-xs font-black text-slate-800 dark:text-slate-100">{{ example.label }}</div>
                <code class="mt-1 block truncate font-mono text-[11px] font-bold text-primary">{{ example.expression }}</code>
              </div>
              <BaseCodeBlock
                :code="stringifyExample(example.value)"
                language="json"
                size="sm"
                max-height="260px"
                :show-line-numbers="false"
                copyable
                wrap
              />
            </article>
          </div>
        </section>

        <section v-if="boundaryCases.length > 0" class="utils-docs-section">
          <h2 class="utils-docs-section-title">
            <SplitSquareHorizontal class="h-4 w-4 text-primary" />
            容错与边界
          </h2>
          <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            <article v-for="item in boundaryCases" :key="item.key" class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h3 class="text-xs font-black text-slate-800 dark:text-slate-100">{{ item.title }}</h3>
              <code class="mt-2 block break-words font-mono text-[11px] font-bold text-primary">{{ item.input }}</code>
              <div class="mt-3 rounded bg-white px-2.5 py-2 text-[11px] font-semibold leading-5 text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">{{ item.expected }}</div>
            </article>
          </div>
        </section>
      </div>
    </article>
  </div>
</template>

<style scoped>
.utils-docs-section {
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  padding: 16px;
}

.utils-docs-section-title {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 900;
  color: #1e293b;
}

:global(.dark) .utils-docs-section {
  border-color: rgba(51, 65, 85, 0.88);
  background: rgba(2, 6, 23, 0.34);
}

:global(.dark) .utils-docs-section-title {
  color: #e2e8f0;
}
</style>
