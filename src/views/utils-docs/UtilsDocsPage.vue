<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from "vue";
import { BookOpen, Braces, Code2, Layers3, Search, SplitSquareHorizontal, Terminal, Play, LayoutGrid, ChevronDown, ChevronRight, AlertTriangle } from "lucide-vue-next";
import BaseCodeBlock from "../../components/common/BaseCodeBlock.vue";
import { utilityDocGroups, utilityDocs } from "./utilsDocsContent";
import * as monsterUtils from "@/utils";

const searchKeyword = ref("");
const activeDocKey = ref<string | null>("overview");
const searchInputRef = ref<HTMLInputElement | null>(null);

const expandedGroups = ref<Set<string>>(new Set());

const normalizedKeyword = computed(() => searchKeyword.value.trim().toLowerCase());

const filteredDocs = computed(() => {
  const keyword = normalizedKeyword.value;
  return utilityDocs.filter((entry) => {
    if (!keyword) return true;
    return [
      entry.key,
      entry.title,
      entry.group,
      entry.description,
      entry.importPath,
      ...entry.sourceFiles,
      ...entry.functions.flatMap((item) => [item.name, item.description]),
      ...entry.snippets,
      ...entry.examples.flatMap((item) => [item.label, item.expression]),
      ...entry.boundaryCases.flatMap((item) => [item.title, item.input, item.expected]),
    ].join(" ").toLowerCase().includes(keyword);
  });
});

const activeDoc = computed(() => {
  return utilityDocs.find(d => d.key === activeDocKey.value);
});

// 左侧菜单折叠
function toggleGroup(group: string) {
  if (expandedGroups.value.has(group)) {
    expandedGroups.value.delete(group);
  } else {
    expandedGroups.value.add(group);
  }
}

// 确保选中的文档所在 group 是展开的
watch(activeDoc, (doc) => {
  if (doc) {
    expandedGroups.value.add(doc.group);
  }
}, { immediate: true });

// === 沙盒与测试相关状态 ===
const selectedFuncName = ref<string>("");
const parsedParams = ref<string[]>([]);
const paramValues = ref<string[]>([]);
const isRunningSandbox = ref(false);
const sandboxResult = ref<any>("");
const sandboxError = ref<string>("");
const syntaxErrors = ref<string[]>([]);

const isSyntaxValid = computed(() => syntaxErrors.value.every(e => !e));

const activeFunctionObj = computed(() => {
  if (!activeDoc.value || !selectedFuncName.value) return null;
  return activeDoc.value.functions.find(f => f.name === selectedFuncName.value) || null;
});

// 监听选中的模块，自动切换到“模块汇总”视图（清除选择的函数）
watch(activeDocKey, (newKey) => {
  if (newKey !== 'overview') {
    // 切换模块时，清空当前选中的函数，进入层级 2 (模块汇总)
    selectedFuncName.value = "";
    sandboxResult.value = "";
    sandboxError.value = "";
    parsedParams.value = [];
    paramValues.value = [];
    syntaxErrors.value = [];
  }
});

// 辅助函数：提取函数形参名称
function getFunctionParams(fn: Function): string[] {
  try {
    const str = fn.toString();
    const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    const ARGUMENT_NAMES = /([^\s,]+)/g;
    const fnStr = str.replace(STRIP_COMMENTS, '');
    const argsMatch = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    return argsMatch || [];
  } catch (e) {
    return [];
  }
}

// 辅助函数：提供一些默认值的智能推断
function getDefaultParamValue(pName: string) {
  if (pName.includes("array") || pName.includes("tasks") || pName.includes("items")) return "[]";
  if (pName.includes("text") || pName.includes("str") || pName.includes("name")) return "\"\"";
  if (pName.includes("obj") || pName.includes("options")) return "{}";
  if (pName.includes("window")) return "window";
  return "";
}

// 监听选中函数，更新参数表单
watch(selectedFuncName, (newFnName) => {
  if (!newFnName || !activeDocKey.value || activeDocKey.value === 'overview') {
    parsedParams.value = [];
    paramValues.value = [];
    return;
  }

  try {
    const fn = (monsterUtils as any)[newFnName];
    if (typeof fn === 'function') {
      const params = getFunctionParams(fn);
      parsedParams.value = params;

      // 直接读取底层硬装配的真实测试数据，如果有，直接填入
      const fnObj = activeDoc.value?.functions.find(f => f.name === newFnName);
      if (fnObj && fnObj.defaultTestArgs) {
        paramValues.value = params.map((pName, idx) => {
          if (fnObj.defaultTestArgs![idx] !== undefined) return fnObj.defaultTestArgs![idx];
          return getDefaultParamValue(pName);
        });
      } else {
        // 如果没有预装配，降级兜底
        paramValues.value = params.map((pName) => getDefaultParamValue(pName));
      }
    } else {
      parsedParams.value = [];
      paramValues.value = [];
    }
  } catch(e) {
    parsedParams.value = [];
    paramValues.value = [];
  }
});

// 实时语法探针：鉴权参数是否符合合法 JS
watch(paramValues, (newVals) => {
  syntaxErrors.value = newVals.map(valStr => {
    const trimmed = (valStr || "").trim();
    if (!trimmed) return "";
    try {
      // 通过沙箱隔离和安全策略尝试转换 AST/Function
      new Function('return ' + trimmed);
      return "";
    } catch (e: any) {
      return e.message || "语法错误";
    }
  });
}, { deep: true, immediate: true });

function selectFunction(fnName: string) {
  selectedFuncName.value = fnName;
}

let sandboxWorker: Worker | null = null;
let sandboxWorkerId = 0;

function runSandbox() {
  if (activeDocKey.value === 'overview' || !selectedFuncName.value) return;
  isRunningSandbox.value = true;
  sandboxError.value = "";
  if (sandboxWorker) {
    sandboxWorker.terminate();
  }

  sandboxWorker = new Worker(new URL('./sandboxWorker.ts', import.meta.url), { type: 'module' });
  const currentId = ++sandboxWorkerId;

  const timeoutId = setTimeout(() => {
    if (sandboxWorker) {
      sandboxWorker.terminate();
      sandboxWorker = null;
    }
    if (currentId === sandboxWorkerId) {
      sandboxError.value = "执行超时 ( > 2000ms )。已强制中断，可能是由于存在死循环或长时间阻塞的计算。";
      isRunningSandbox.value = false;
    }
  }, 2000);

  sandboxWorker.onmessage = (e) => {
    if (e.data.id !== currentId) return;
    clearTimeout(timeoutId);
    if (e.data.success) {
      sandboxResult.value = e.data.result;
    } else {
      sandboxError.value = e.data.error;
    }
    isRunningSandbox.value = false;
  };

  sandboxWorker.onerror = (e) => {
    clearTimeout(timeoutId);
    sandboxError.value = "Worker 执行发生致命异常：" + e.message;
    isRunningSandbox.value = false;
  };

  sandboxWorker.postMessage({
    id: currentId,
    fnName: selectedFuncName.value,
    argsStrings: Array.from(paramValues.value)
  });
}

function stringifyExample(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    value,
    (_key, currentValue) => {
      if (currentValue instanceof Error) return { name: currentValue.name, message: currentValue.message };
      if (typeof currentValue === "bigint") return currentValue.toString();
      if (typeof currentValue === "function") return `[Function ${currentValue.name || "anonymous"}]`;
      if (currentValue && typeof currentValue === "object") {
        if (seen.has(currentValue)) return "[Circular]";
        seen.add(currentValue);
      }
      return currentValue;
    },
    2
  ) ?? String(value);
}

function handleGlobalKeydown(event: KeyboardEvent) {
  const isInput = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
  if (event.key === "/" && !isInput) {
    event.preventDefault();
    searchInputRef.value?.focus();
  }
}

onMounted(() => window.addEventListener("keydown", handleGlobalKeydown));
onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalKeydown);
  if (sandboxWorker) {
    sandboxWorker.terminate();
    sandboxWorker = null;
  }
});
</script>

<template>
  <div class="flex h-full w-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div class="flex min-h-0 flex-1 flex-col lg:flex-row relative">
      <!-- 1. 左侧导航 -->
      <aside class="shrink-0 w-64 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 z-10 flex flex-col min-h-0">
        <div class="flex items-center gap-2 text-xs font-black text-primary mb-4 shrink-0">
          <BookOpen class="h-4 w-4" />
          Monster Utils
        </div>

        <div class="relative mt-2 shrink-0">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref="searchInputRef"
            v-model="searchKeyword"
            type="text"
            placeholder="搜索工具 (/)"
            class="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-900 transition-colors focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-primary dark:focus:bg-slate-900"
          />
        </div>

        <nav class="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" aria-label="工具函数模块">
          <button
            class="mb-2 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold transition"
            :class="[
              activeDocKey === 'overview'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20'
            ]"
            @click="activeDocKey = 'overview'"
          >
            <span class="flex items-center gap-2"><LayoutGrid class="h-4 w-4" /> 工具库概览</span>
          </button>

          <div v-for="groupName in utilityDocGroups" :key="groupName" class="space-y-1">
            <button
              class="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-black text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              @click="toggleGroup(groupName)"
            >
              <span class="uppercase tracking-wider">{{ groupName }}</span>
              <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="{ '-rotate-90': !expandedGroups.has(groupName) }" />
            </button>

            <div v-show="expandedGroups.has(groupName)" class="ml-2 space-y-0.5 border-l-2 border-slate-100 pl-2 dark:border-slate-800">
              <div
                v-for="entry in filteredDocs.filter(d => d.group === groupName)"
                :key="entry.key"
                class="flex flex-col gap-1 rounded-md px-3 py-2 transition cursor-pointer"
                :class="[
                  activeDocKey === entry.key && !selectedFuncName
                    ? 'bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                ]"
                @click="activeDocKey = entry.key"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold" :class="activeDocKey === entry.key && !selectedFuncName ? 'text-primary dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'">{{ entry.key }}</span>
                  <span v-if="entry.splitStatus === 'single'" class="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" title="单文件"></span>
                  <span v-else class="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" title="已拆分"></span>
                </div>

                <!-- 二级方法菜单 -->
                <div v-if="activeDocKey === entry.key" class="mt-2 flex flex-col gap-0.5 border-l-2 border-indigo-100 pl-2 dark:border-indigo-900/50">
                  <div
                    v-for="fn in entry.functions"
                    :key="fn.name"
                    class="rounded px-2 py-1 text-[11px] transition-colors"
                    :class="selectedFuncName === fn.name ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'"
                    @click.stop="selectFunction(fn.name)"
                  >
                    {{ fn.name }}
                  </div>
                </div>
              </div>
              <div v-if="filteredDocs.filter(d => d.group === groupName).length === 0" class="px-3 py-1 text-[10px] italic text-slate-400">
                无匹配结果
              </div>
            </div>
          </div>
        </nav>
      </aside>

      <!-- 2. 中间主内容区 -->
      <main class="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50/50 dark:bg-slate-950/50">
        <!-- 搜索无结果 -->
        <div v-if="filteredDocs.length === 0" class="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Search class="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
          <div class="text-sm font-bold text-slate-500 dark:text-slate-400">没有匹配的工具函数模块</div>
          <div class="mt-1 text-xs text-slate-400 dark:text-slate-500">尝试更换搜索词或分组</div>
        </div>

        <Transition name="fade" mode="out-in">
          <!-- 层级 1: 概览 -->
          <div v-if="activeDocKey === 'overview'" key="overview" class="mx-auto w-full max-w-7xl space-y-6">
            <div class="rounded-xl border border-indigo-200 bg-indigo-50/60 p-6 shadow-sm dark:border-indigo-500/20 dark:bg-indigo-500/10">
              <h2 class="mb-2 text-xl font-black text-indigo-900 dark:text-indigo-100">欢迎查阅 Monster 通用工具库</h2>
              <p class="max-w-3xl text-sm font-semibold leading-relaxed text-indigo-700/80 dark:text-indigo-300/80">
                这是本项目的公共底层引擎，所有功能均经过了严格的单元测试。在此概览页您可以快速掌握各模块支持的能力大纲。点击下方卡片或左侧列表可深入了解模块汇总。
              </p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="doc in utilityDocs"
                :key="doc.key"
                class="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary"
                @click="activeDocKey = doc.key"
              >
                <div>
                  <div class="mb-2 flex items-start justify-between gap-2">
                    <h3 class="text-base font-black text-slate-900 dark:text-slate-100">{{ doc.title }}</h3>
                    <span class="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-slate-800">{{ doc.group }}</span>
                  </div>
                  <p class="mb-5 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{{ doc.description }}</p>
                </div>

                <div class="mt-auto">
                  <div class="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">模块能力概览</div>
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="fn in doc.functions.slice(0, 4)" :key="fn.name" class="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">{{ fn.name }}</span>
                    <span v-if="doc.functions.length > 4" class="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-950">+{{ doc.functions.length - 4 }}</span>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <!-- 层级 2: 模块汇总层 (未选择具体函数时) -->
          <div v-else-if="activeDoc && !selectedFuncName" :key="'module-' + activeDoc.key" class="mx-auto max-w-7xl h-full">
            <div class="mb-6 flex items-center gap-2 text-sm text-slate-500">
              <span class="cursor-pointer hover:text-indigo-600 transition" @click="activeDocKey = 'overview'">工具库</span>
              <ChevronRight class="h-4 w-4" />
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ activeDoc.title }}</span>
            </div>

            <section class="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <header class="border-b border-slate-100 p-6 dark:border-slate-800">
                <div class="flex items-center gap-3">
                  <h2 class="text-2xl font-black tracking-normal text-slate-950 dark:text-white">{{ activeDoc.title }}</h2>
                  <span class="rounded bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">{{ activeDoc.group }}</span>
                </div>
                <p class="mt-3 text-sm font-semibold leading-relaxed text-slate-500 dark:text-slate-400">{{ activeDoc.description }}</p>
                <div class="mt-4 flex gap-4 text-[11px] text-slate-400">
                  <div class="flex items-center gap-1"><Code2 class="h-3 w-3" /> {{ activeDoc.importPath }}</div>
                  <div class="flex items-center gap-1"><Files class="h-3 w-3" /> {{ activeDoc.sourceFiles[0] }}</div>
                </div>
              </header>

              <div class="p-6">
                <h3 class="mb-4 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                  <Layers3 class="h-4 w-4 text-primary" />
                  本模块函数汇总
                </h3>
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div
                    v-for="fn in activeDoc.functions"
                    :key="fn.name"
                    class="group flex cursor-pointer flex-col rounded-lg border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-500/50"
                    @click="selectFunction(fn.name)"
                  >
                    <h4 class="font-mono text-sm font-bold text-indigo-700 dark:text-indigo-400 group-hover:text-indigo-600">
                      {{ fn.name }}
                    </h4>
                    <p class="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">
                      {{ fn.description }}
                    </p>
                    <div class="mt-4 flex items-center gap-1 text-[10px] font-bold text-slate-400 group-hover:text-indigo-500 transition">
                      查看详情与测试 <ChevronRight class="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- 层级 3: 单个函数详情层 -->
          <div v-else-if="activeDoc && selectedFuncName" :key="'fn-' + selectedFuncName" class="mx-auto max-w-7xl h-full space-y-6">
            <div class="flex items-center gap-2 text-sm text-slate-500">
              <span class="cursor-pointer hover:text-indigo-600 transition" @click="activeDocKey = 'overview'">工具库</span>
              <ChevronRight class="h-4 w-4" />
              <span class="cursor-pointer hover:text-indigo-600 transition" @click="selectedFuncName = ''">{{ activeDoc.title }}</span>
              <ChevronRight class="h-4 w-4" />
              <span class="font-bold text-slate-800 font-mono dark:text-slate-200">{{ selectedFuncName }}</span>
            </div>

            <section class="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6 lg:p-8">
              <div class="mb-6 border-b border-slate-100 pb-6 dark:border-slate-800">
                <h1 class="font-mono text-3xl font-black text-indigo-900 dark:text-indigo-100">{{ selectedFuncName }}</h1>
                <p class="mt-4 text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                  {{ activeFunctionObj?.description || '暂无该函数的详细描述。' }}
                </p>
              </div>

              <!-- API 参数说明 -->
              <div v-if="activeFunctionObj?.params && activeFunctionObj.params.length > 0" class="mb-8">
                <h3 class="mb-4 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                  <Layers3 class="h-4 w-4 text-primary" />
                  参数说明
                </h3>
                <div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                    <thead class="bg-slate-50 text-xs uppercase text-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                      <tr>
                        <th class="px-4 py-3 font-bold border-b border-slate-200 dark:border-slate-800">参数名</th>
                        <th class="px-4 py-3 font-bold border-b border-slate-200 dark:border-slate-800">类型</th>
                        <th class="px-4 py-3 font-bold border-b border-slate-200 dark:border-slate-800">是否必填</th>
                        <th class="px-4 py-3 font-bold border-b border-slate-200 dark:border-slate-800">说明</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
                      <tr v-for="param in activeFunctionObj.params" :key="param.name" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td class="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{{ param.name }}</td>
                        <td class="px-4 py-3 font-mono text-xs text-amber-600 dark:text-amber-400 break-words max-w-[300px]">{{ param.type }}</td>
                        <td class="px-4 py-3 shrink-0 whitespace-nowrap">
                          <span v-if="param.required" class="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-400">必填</span>
                          <span v-else class="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">可选</span>
                        </td>
                        <td class="px-4 py-3 text-xs leading-relaxed min-w-[200px]">{{ param.description || '暂无详细说明' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- 返回值说明 -->
              <div v-if="activeFunctionObj?.returns" class="mb-8">
                <h3 class="mb-3 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                  <Terminal class="h-4 w-4 text-primary" />
                  返回值
                </h3>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  <code class="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 break-words">{{ activeFunctionObj.returns.type }}</code>
                  <p v-if="activeFunctionObj.returns.description" class="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">{{ activeFunctionObj.returns.description }}</p>
                </div>
              </div>

              <!-- 异常说明 (Throws) -->
              <div v-if="activeFunctionObj?.throws && activeFunctionObj.throws.length > 0" class="mb-8">
                <h3 class="mb-3 flex items-center gap-2 text-sm font-black text-rose-600 dark:text-rose-400">
                  <AlertTriangle class="h-4 w-4" />
                  异常说明 (Throws)
                </h3>
                <div class="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/50">
                  <ul class="list-disc pl-5 space-y-1">
                    <li v-for="(throwDesc, idx) in activeFunctionObj.throws" :key="idx" class="text-xs font-medium text-rose-700 dark:text-rose-300">
                      {{ throwDesc }}
                    </li>
                  </ul>
                </div>
              </div>

              <!-- 用法介绍（提取包含该函数名的 snippets） -->
              <div v-if="activeDoc.snippets.filter(s => s.includes(selectedFuncName)).length > 0" class="mb-8">
                <h3 class="mb-4 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                  <Braces class="h-4 w-4 text-primary" />
                  典型使用场景
                </h3>
                <div class="grid gap-4 lg:grid-cols-2">
                  <div v-for="snippet in activeDoc.snippets.filter(s => s.includes(selectedFuncName))" :key="snippet">
                    <BaseCodeBlock
                      :code="snippet"
                      language="ts"
                      size="sm"
                      max-height="200px"
                      :show-line-numbers="false"
                      copyable
                      wrap
                    />
                  </div>
                </div>
              </div>

              <!-- 执行示例展示 -->
              <div v-if="activeDoc.examples.filter(e => e.expression.includes(selectedFuncName)).length > 0" class="mb-8">
                <h3 class="mb-4 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                  <Code2 class="h-4 w-4 text-primary" />
                  执行示例
                </h3>
                <div class="grid gap-4 lg:grid-cols-2">
                  <article v-for="example in activeDoc.examples.filter(e => e.expression.includes(selectedFuncName))" :key="example.label" class="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div class="mb-3 min-w-0">
                      <div class="flex items-center gap-2">
                        <div class="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                        <div class="truncate text-xs font-black text-slate-800 dark:text-slate-100">{{ example.label }}</div>
                      </div>
                      <code class="mt-1.5 block truncate text-[11px] font-bold text-primary opacity-80">{{ example.expression }}</code>
                    </div>
                    <BaseCodeBlock
                      :code="stringifyExample(example.value)"
                      language="json"
                      size="sm"
                      max-height="240px"
                      :show-line-numbers="false"
                      copyable
                    />
                  </article>
                </div>
              </div>

              <!-- 静态边界示例 -->
              <div v-if="activeDoc.boundaryCases.filter(b => b.input.includes(selectedFuncName)).length > 0">
                <h3 class="mb-4 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                  <SplitSquareHorizontal class="h-4 w-4 text-primary" />
                  容错与边界情况
                </h3>
                <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <article v-for="item in activeDoc.boundaryCases.filter(b => b.input.includes(selectedFuncName))" :key="item.key" class="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div class="text-xs font-black text-slate-800 dark:text-slate-100">{{ item.title }}</div>
                    <code class="mt-2 block break-words font-mono text-[11px] font-bold text-primary opacity-80">{{ item.input }}</code>
                    <div class="mt-3 rounded bg-white px-2.5 py-2 text-[11px] font-semibold leading-5 text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">{{ item.expected }}</div>
                  </article>
                </div>
              </div>
            </section>
          </div>
        </Transition>
      </main>

      <!-- 3. 右侧独立实时沙盒 -->
      <aside v-if="activeDocKey !== 'overview' && selectedFuncName" class="flex w-[400px] shrink-0 flex-col border-l border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 z-10">
        <div class="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800 xl:px-5">
          <h3 class="flex items-center gap-2 text-sm font-black text-indigo-900 dark:text-indigo-100">
            <Terminal class="h-4 w-4" />
            测试控制台
          </h3>
          <button
            @click="runSandbox"
            :disabled="isRunningSandbox || activeDocKey === 'overview' || !selectedFuncName || !isSyntaxValid"
            class="flex items-center gap-1.5 rounded bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-sm"
          >
            <Play class="h-3 w-3" :class="{'animate-pulse': isRunningSandbox}" />
            {{ isRunningSandbox ? '执行中...' : '运行测试' }}
          </button>
        </div>

        <div class="flex flex-1 flex-col overflow-hidden">
          <div class="border-b border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <div class="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">当前目标函数</div>
            <div class="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {{ selectedFuncName }}
            </div>
          </div>

          <div class="flex-1 overflow-y-auto space-y-4">
            <!-- 参数表单 -->
            <div class="p-4 space-y-4">
              <div v-for="(pName, idx) in parsedParams" :key="idx" class="space-y-1.5">
                <label class="text-xs font-bold text-slate-700 dark:text-slate-300">参数 {{ idx + 1 }}: <span class="font-mono text-indigo-500">{{ pName }}</span></label>
                <textarea
                  v-model="paramValues[idx]"
                  rows="2"
                  class="w-full rounded-md border bg-white px-3 py-2 text-xs font-mono text-slate-800 shadow-sm outline-none transition dark:bg-slate-900 dark:text-slate-200"
                  :class="syntaxErrors[idx] ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 dark:border-rose-500/50' : 'border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:focus:border-indigo-500'"
                  placeholder="在此输入有效的 JS 表达式"
                ></textarea>
                <div v-if="syntaxErrors[idx]" class="mt-1 flex items-center gap-1 text-[10px] font-bold text-rose-500">
                  <AlertTriangle class="h-3 w-3" />
                  语法错误: {{ syntaxErrors[idx] }}
                </div>
              </div>
              <div v-if="parsedParams.length === 0" class="text-xs text-slate-400 italic">该函数无需传入参数。</div>
            </div>
          </div>

          <div class="flex flex-col border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 h-56 shrink-0">
            <div class="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800">
              <span class="text-xs font-bold text-slate-500">执行结果</span>
              <button v-if="sandboxResult || sandboxError" @click="sandboxResult=''; sandboxError=''" class="text-[10px] text-slate-400 hover:text-slate-600">清空</button>
            </div>
            <div class="flex-1 overflow-y-auto p-4 font-mono text-xs">
              <div v-if="sandboxError" class="text-red-500 break-words">{{ sandboxError }}</div>
              <pre v-else-if="sandboxResult !== ''" class="text-emerald-600 dark:text-emerald-400 break-words whitespace-pre-wrap">{{ sandboxResult }}</pre>
              <div v-else class="text-slate-400 italic text-center mt-6">等待执行...</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
