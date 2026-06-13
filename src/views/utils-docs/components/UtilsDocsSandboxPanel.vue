<script setup lang="ts">
import {
  AlertTriangle,
  Play,
  Terminal,
} from "lucide-vue-next";
import type { UtilityFunctionParam } from "../utilsDocsTypes";

const props = defineProps<{
  params: UtilityFunctionParam[];
  paramValues: string[];
  syntaxErrors: string[];
  disabledReason: string;
  canRun: boolean;
  isRunning: boolean;
  result: string;
  error: string;
}>();

const emit = defineEmits<{
  "update:paramValues": [value: string[]];
  run: [];
  clear: [];
  copy: [];
}>();

function updateParamValue(index: number, event: Event) {
  const target = event.target as HTMLTextAreaElement;
  const nextValues = [...props.paramValues];
  nextValues[index] = target.value;
  emit("update:paramValues", nextValues);
}
</script>

<template>
  <aside class="utils-docs-sandbox-panel flex min-h-[520px] flex-col border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 xl:h-full xl:min-h-0 xl:border-t-0">
    <div class="flex min-h-0 flex-1 flex-col">
      <header class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <h2 class="flex items-center gap-2 text-sm font-black text-indigo-900 dark:text-indigo-100">
          <Terminal class="h-4 w-4" />
          控制台
        </h2>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          :disabled="!canRun"
          @click="emit('run')"
        >
          <Play class="h-3 w-3" :class="{ 'animate-pulse': isRunning }" />
          {{ isRunning ? "执行中" : "运行" }}
        </button>
      </header>

      <div v-if="disabledReason" class="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        {{ disabledReason }}
      </div>

      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div class="space-y-3">
          <div v-for="(param, index) in params" :key="param.name" class="space-y-1.5">
            <label class="block text-xs font-black text-slate-700 dark:text-slate-300">
              {{ index + 1 }}. <span class="font-mono text-indigo-500">{{ param.name }}</span>
            </label>
            <textarea
              :value="paramValues[index]"
              rows="3"
              class="utils-docs-input w-full resize-y rounded-lg border px-3 py-2 font-mono text-xs font-semibold text-slate-800 outline-none transition dark:text-slate-200"
              :class="syntaxErrors[index] ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500 focus:ring-opacity-20 dark:border-rose-500/50' : ''"
              placeholder="输入 JS 表达式"
              @input="updateParamValue(index, $event)"
            />
            <div v-if="syntaxErrors[index]" class="flex items-center gap-1 text-[10px] font-bold text-rose-500">
              <AlertTriangle class="h-3 w-3" />
              {{ syntaxErrors[index] }}
            </div>
            <div v-else class="text-[10px] font-semibold text-slate-400">{{ param.type }}</div>
          </div>

          <div v-if="params.length === 0" class="rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            该函数无需传入参数。
          </div>
        </div>
      </div>

      <section class="flex min-h-0 basis-[42%] flex-col border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <header class="flex items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-slate-800">
          <span class="text-xs font-black text-slate-500">执行结果</span>
          <div class="flex items-center gap-2">
            <button v-if="result || error" type="button" class="text-[10px] font-black text-slate-400 transition hover:text-primary" @click="emit('copy')">复制</button>
            <button v-if="result || error" type="button" class="text-[10px] font-black text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200" @click="emit('clear')">清空</button>
          </div>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto p-4 font-mono text-xs">
          <div v-if="error" class="break-words text-rose-600 dark:text-rose-300">{{ error }}</div>
          <pre v-else-if="result" class="whitespace-pre-wrap break-words text-emerald-600 dark:text-emerald-300">{{ result }}</pre>
          <div v-else class="mt-8 text-center font-sans text-xs font-semibold text-slate-400">等待执行</div>
        </div>
      </section>
    </div>
  </aside>
</template>
