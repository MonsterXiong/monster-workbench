<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  AlertTriangle,
  BookOpen,
  Braces,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  FileText,
  Gauge,
  Layers3,
  LayoutGrid,
  Play,
  Search,
  ShieldCheck,
  SplitSquareHorizontal,
  Terminal,
  XCircle,
} from "lucide-vue-next";
import BaseCodeBlock from "../../components/common/BaseCodeBlock.vue";
import { useClipboard } from "../../composables/useClipboard";
import {
  getUtilityDocQualityReport,
  getUtilityDocStats,
  utilityDocGroups,
  utilityDocs,
  type UtilityDocEntry,
  type UtilityDocQualityReport,
  type UtilityFunctionDoc,
} from "./utilsDocsContent";

type QualityFilter = "all" | "runnable" | "review";

interface SandboxResponse {
  id: number;
  success: boolean;
  result?: string;
  error?: string;
}

const searchKeyword = ref("");
const activeDocKey = ref<string | null>("overview");
const selectedFuncName = ref("");
const searchInputRef = ref<HTMLInputElement | null>(null);
const expandedGroups = ref<Set<string>>(new Set(utilityDocGroups));
const qualityFilter = ref<QualityFilter>("all");
const { copyText } = useClipboard();

const paramValues = ref<string[]>([]);
const syntaxErrors = ref<string[]>([]);
const isRunningSandbox = ref(false);
const sandboxResult = ref("");
const sandboxError = ref("");

let sandboxWorker: Worker | null = null;
let sandboxWorkerId = 0;

const docStats = computed(() => getUtilityDocStats(utilityDocs));
const qualityReports = computed<Record<string, UtilityDocQualityReport>>(() =>
  Object.fromEntries(utilityDocs.map((entry) => [entry.key, getUtilityDocQualityReport(entry)]))
);

const normalizedKeyword = computed(() => searchKeyword.value.trim().toLowerCase());

const filteredDocs = computed(() => {
  const keyword = normalizedKeyword.value;

  return utilityDocs.filter((entry) => {
    const qualityReport = qualityReports.value[entry.key];
    const matchesFilter =
      qualityFilter.value === "all" ||
      (qualityFilter.value === "runnable" && qualityReport.sandboxReadyCount > 0) ||
      (qualityFilter.value === "review" && qualityReport.level !== "excellent");

    if (!matchesFilter) return false;
    if (!keyword) return true;

    return buildDocSearchText(entry).includes(keyword);
  });
});

const visibleStats = computed(() => getUtilityDocStats(filteredDocs.value));
const docsByGroup = computed(() =>
  utilityDocGroups.map((groupName) => ({
    groupName,
    docs: filteredDocs.value.filter((entry) => entry.group === groupName),
  }))
);

const activeDoc = computed(() => utilityDocs.find((doc) => doc.key === activeDocKey.value) ?? null);
const activeDocQuality = computed(() => (activeDoc.value ? qualityReports.value[activeDoc.value.key] : null));
const activeFunctionObj = computed(() => {
  if (!activeDoc.value || !selectedFuncName.value) return null;
  return activeDoc.value.functions.find((fn) => fn.name === selectedFuncName.value) ?? null;
});
const activeFunctionParams = computed(() => activeFunctionObj.value?.params ?? []);
const activeFunctionSignature = computed(() => (activeFunctionObj.value ? formatFunctionSignature(activeFunctionObj.value) : ""));
const activeFunctionSnippets = computed(() => {
  if (!activeDoc.value || !selectedFuncName.value) return [];

  const curatedSnippets = activeDoc.value.snippets.filter((snippet) => snippet.includes(selectedFuncName.value));
  if (curatedSnippets.length > 0) return curatedSnippets;

  return [`import { ${selectedFuncName.value} } from "@/utils";\n\nconst result = ${selectedFuncName.value}(...args);`];
});
const activeFunctionExamples = computed(() => {
  if (!activeDoc.value || !selectedFuncName.value) return [];
  return activeDoc.value.examples.filter((example) => example.expression.includes(selectedFuncName.value));
});
const activeFunctionBoundaryCases = computed(() => {
  if (!activeDoc.value || !selectedFuncName.value) return [];
  return activeDoc.value.boundaryCases.filter((item) => item.input.includes(selectedFuncName.value));
});
const activeModuleImportSnippet = computed(() => {
  if (!activeDoc.value) return "";
  const names = activeDoc.value.functions.map((fn) => fn.name);
  return `import {\n  ${names.join(",\n  ")}\n} from "@/utils";`;
});
const isSyntaxValid = computed(() => syntaxErrors.value.every((error) => !error));
const sandboxDisabledReason = computed(() => activeFunctionObj.value?.sandbox?.reason ?? "");
const canRunSandbox = computed(() => Boolean(activeFunctionObj.value?.sandbox?.enabled !== false && isSyntaxValid.value && !isRunningSandbox.value));

watch(activeDoc, (doc) => {
  if (doc) {
    expandedGroups.value.add(doc.group);
  }
});

watch(normalizedKeyword, (keyword) => {
  if (!keyword) return;
  expandedGroups.value = new Set(docsByGroup.value.filter((group) => group.docs.length > 0).map((group) => group.groupName));
});

watch(activeDocKey, (newKey) => {
  if (newKey !== "overview") {
    selectedFuncName.value = "";
  }
});

watch(activeFunctionObj, () => {
  resetSandboxState();
  hydrateSandboxParams();
}, { immediate: true });

watch(paramValues, (newValues) => {
  syntaxErrors.value = newValues.map((value) => validateParamExpression(value));
}, { deep: true, immediate: true });

function buildDocSearchText(entry: UtilityDocEntry): string {
  return [
    entry.key,
    entry.title,
    entry.group,
    entry.description,
    entry.importPath,
    ...entry.sourceFiles,
    ...entry.functions.flatMap((fn) => [
      fn.name,
      fn.description,
      fn.returns?.type ?? "",
      fn.returns?.description ?? "",
      ...(fn.params?.flatMap((param) => [param.name, param.type, param.description]) ?? []),
    ]),
    ...entry.snippets,
    ...entry.examples.flatMap((item) => [item.label, item.expression]),
    ...entry.boundaryCases.flatMap((item) => [item.title, item.input, item.expected]),
  ].join(" ").toLowerCase();
}

function toggleGroup(group: string) {
  const next = new Set(expandedGroups.value);
  if (next.has(group)) {
    next.delete(group);
  } else {
    next.add(group);
  }
  expandedGroups.value = next;
}

function selectDoc(key: string) {
  activeDocKey.value = key;
  selectedFuncName.value = "";
}

function selectFunction(fnName: string) {
  selectedFuncName.value = fnName;
}

function resetSandboxState() {
  sandboxResult.value = "";
  sandboxError.value = "";
  syntaxErrors.value = [];
}

function hydrateSandboxParams() {
  const fn = activeFunctionObj.value;
  if (!fn) {
    paramValues.value = [];
    return;
  }

  paramValues.value = activeFunctionParams.value.map((param, index) => fn.defaultTestArgs?.[index] ?? getDefaultParamValue(param.name, param.type));
}

function getDefaultParamValue(paramName: string, type: string): string {
  const name = paramName.toLowerCase();
  const normalizedType = type.toLowerCase();

  if (name.includes("getchildren")) return "item => item.children";
  if (name.includes("getparentid")) return "item => item.parentId";
  if (name.includes("getid") || name.includes("getkey")) return "item => item.id";
  if (name.includes("equals")) return "(left, right) => Object.is(left, right)";
  if (name.includes("mapper")) return "(item) => item";
  if (name.includes("validators")) return "[(value) => value ? null : 'required']";
  if (name.includes("validator")) return "(value) => value ? null : 'required'";
  if (name.includes("schema")) return "createRecordValidationSchema({ name: [createRequiredValidator('required')] }, { name: 'Name' })";
  if (name.includes("options")) return "{}";
  if (name.includes("breakpoints")) return "[{ key: 'sm', minWidth: 640 }, { key: 'lg', minWidth: 1024 }]";
  if (name.includes("queries")) return "['(prefers-color-scheme: dark)']";
  if (name.includes("searchparams")) return "new URLSearchParams('?page=1&tag=utils')";
  if (name.includes("url")) return "'https://example.com/tools?page=1'";
  if (name.includes("path")) return "'C:/workspace/project/file.txt'";
  if (name.includes("text") || name.includes("message")) return "'Monster Tools'";
  if (name.includes("key")) return "'id'";
  if (name.includes("count") || name.includes("total") || name.includes("page") || name.includes("size")) return "10";
  if (normalizedType.includes("string")) return "''";
  if (normalizedType.includes("number")) return "0";
  if (normalizedType.includes("boolean")) return "false";
  if (normalizedType.includes("[]") || normalizedType.includes("array") || normalizedType.includes("readonly")) return "[]";
  if (normalizedType.includes("record") || normalizedType.includes("object")) return "{}";
  return "undefined";
}

function validateParamExpression(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    new Function(`return (${trimmed});`);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "表达式语法错误";
  }
}

function runSandbox() {
  const fn = activeFunctionObj.value;
  if (!fn || !canRunSandbox.value) return;

  isRunningSandbox.value = true;
  sandboxError.value = "";
  sandboxResult.value = "";

  if (sandboxWorker) {
    sandboxWorker.terminate();
  }

  sandboxWorker = new Worker(new URL("./sandboxWorker.ts", import.meta.url), { type: "module" });
  const currentId = ++sandboxWorkerId;
  const timeoutId = window.setTimeout(() => {
    sandboxWorker?.terminate();
    sandboxWorker = null;

    if (currentId === sandboxWorkerId) {
      sandboxError.value = "执行超过 2000ms，已强制中断。";
      isRunningSandbox.value = false;
    }
  }, 2000);

  sandboxWorker.onmessage = (event: MessageEvent<SandboxResponse>) => {
    if (event.data.id !== currentId) return;
    window.clearTimeout(timeoutId);

    if (event.data.success) {
      sandboxResult.value = event.data.result ?? "undefined";
    } else {
      sandboxError.value = event.data.error ?? "沙箱执行失败";
    }

    isRunningSandbox.value = false;
  };

  sandboxWorker.onerror = (event) => {
    window.clearTimeout(timeoutId);
    sandboxError.value = `Worker 执行异常：${event.message}`;
    isRunningSandbox.value = false;
  };

  sandboxWorker.postMessage({
    id: currentId,
    fnName: fn.name,
    argsStrings: [...paramValues.value],
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

function formatFunctionSignature(fn: UtilityFunctionDoc): string {
  const params = fn.params?.map((param) => `${param.name}${param.required ? "" : "?"}: ${param.type}`).join(", ") ?? "";
  return `${fn.name}(${params})${fn.returns?.type ? `: ${fn.returns.type}` : ""}`;
}

function getQualityLabel(report: UtilityDocQualityReport): string {
  if (report.level === "excellent") return "优秀";
  if (report.level === "good") return "良好";
  return "待审查";
}

function getQualityClasses(report: UtilityDocQualityReport): string {
  if (report.level === "excellent") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  if (report.level === "good") return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
}

function formatSourceFiles(files: readonly string[]): string {
  return files.join("\n");
}

function copyImportStatement() {
  if (activeFunctionObj.value) {
    void copyText(`import { ${activeFunctionObj.value.name} } from "@/utils";`, "导入语句已复制");
    return;
  }

  if (activeModuleImportSnippet.value) {
    void copyText(activeModuleImportSnippet.value, "模块导入语句已复制");
  }
}

function copySourceFileList() {
  if (!activeDoc.value) return;
  void copyText(formatSourceFiles(activeDoc.value.sourceFiles), "源文件列表已复制");
}

function copySandboxResult() {
  if (!sandboxResult.value && !sandboxError.value) return;
  void copyText(sandboxResult.value || sandboxError.value, "执行结果已复制");
}

function handleGlobalKeydown(event: KeyboardEvent) {
  const activeElement = document.activeElement;
  const isTyping = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;

  if (event.key === "/" && !isTyping) {
    event.preventDefault();
    searchInputRef.value?.focus();
    return;
  }

  if (event.key === "Escape" && selectedFuncName.value) {
    selectedFuncName.value = "";
  }
}

onMounted(() => window.addEventListener("keydown", handleGlobalKeydown));
onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalKeydown);
  sandboxWorker?.terminate();
  sandboxWorker = null;
});
</script>

<template>
  <div class="utils-docs-page flex h-full w-full flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside
        class="utils-docs-nav-panel flex w-full shrink-0 flex-col border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r"
        :class="selectedFuncName ? 'max-h-52' : 'max-h-[42vh]'"
      >
        <div class="shrink-0 border-b border-slate-100 p-4 dark:border-slate-800">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-primary">
                <BookOpen class="h-4 w-4" />
                Monster Utils
              </div>
              <div class="mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                {{ docStats.moduleCount }} 模块 / {{ docStats.functionCount }} 函数
              </div>
            </div>
            <span class="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {{ docStats.averageQualityScore }}
            </span>
          </div>

          <div class="relative mt-4">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref="searchInputRef"
              v-model="searchKeyword"
              type="search"
              placeholder="搜索模块、函数、参数"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary focus:ring-opacity-15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
            />
          </div>

          <div class="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
            <button
              type="button"
              class="rounded-md px-2 py-1.5 text-[11px] font-black transition"
              :class="qualityFilter === 'all' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
              @click="qualityFilter = 'all'"
            >
              全部
            </button>
            <button
              type="button"
              class="rounded-md px-2 py-1.5 text-[11px] font-black transition"
              :class="qualityFilter === 'runnable' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
              @click="qualityFilter = 'runnable'"
            >
              可运行
            </button>
            <button
              type="button"
              class="rounded-md px-2 py-1.5 text-[11px] font-black transition"
              :class="qualityFilter === 'review' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
              @click="qualityFilter = 'review'"
            >
              待审查
            </button>
          </div>
        </div>

        <nav class="min-h-0 flex-1 space-y-3 overflow-y-auto p-3" aria-label="工具函数模块">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-black transition"
            :class="activeDocKey === 'overview' ? 'bg-primary text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'"
            @click="activeDocKey = 'overview'; selectedFuncName = ''"
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
              class="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-black text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              @click="toggleGroup(group.groupName)"
            >
              <span class="uppercase tracking-wide">{{ group.groupName }}</span>
              <span class="flex items-center gap-1">
                <span>{{ group.docs.length }}</span>
                <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="{ '-rotate-90': !expandedGroups.has(group.groupName) }" />
              </span>
            </button>

            <div v-show="expandedGroups.has(group.groupName)" class="ml-2 space-y-1 border-l-2 border-slate-100 pl-2 dark:border-slate-800">
              <button
                v-for="entry in group.docs"
                :key="entry.key"
                type="button"
                class="w-full rounded-lg px-3 py-2 text-left transition"
                :class="activeDocKey === entry.key && !selectedFuncName ? 'bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'"
                @click="selectDoc(entry.key)"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="truncate font-mono text-xs font-black" :class="activeDocKey === entry.key ? 'text-primary' : 'text-slate-700 dark:text-slate-300'">{{ entry.key }}</span>
                  <span class="rounded px-1.5 py-0.5 text-[9px] font-black" :class="getQualityClasses(qualityReports[entry.key])">
                    {{ qualityReports[entry.key].score }}
                  </span>
                </div>
                <div class="mt-1 truncate text-[10px] font-semibold text-slate-400">{{ entry.functions.length }} 函数 / {{ entry.sourceFiles.length }} 文件</div>

                <div v-if="activeDocKey === entry.key" class="mt-2 flex flex-col gap-0.5 border-l-2 border-primary border-opacity-20 pl-2">
                  <button
                    v-for="fn in entry.functions"
                    :key="fn.name"
                    type="button"
                    class="rounded px-2 py-1 text-left font-mono text-[11px] transition-colors"
                    :class="selectedFuncName === fn.name ? 'bg-indigo-50 font-black text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'"
                    @click.stop="selectFunction(fn.name)"
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

      <main class="utils-docs-main min-h-0 flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div v-if="filteredDocs.length === 0" class="flex h-full min-h-[360px] flex-col items-center justify-center p-8 text-center">
          <Search class="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
          <div class="text-sm font-black text-slate-600 dark:text-slate-300">没有匹配的工具函数模块</div>
          <div class="mt-1 text-xs font-semibold text-slate-400">请调整搜索词或筛选条件</div>
        </div>

        <Transition name="fade" mode="out-in">
          <div v-if="activeDocKey === 'overview'" key="overview" class="h-full w-full space-y-5 overflow-y-auto p-4 lg:p-6">
            <section class="utils-docs-hero rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-primary">
                    <ShieldCheck class="h-4 w-4" />
                    工具函数文档站点
                  </div>
                  <h1 class="mt-2 text-2xl font-black text-slate-950 dark:text-white">公共工具库审查台</h1>
                  <p class="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                    覆盖纯函数模块、使用示例、边界行为、源文件索引和隔离沙箱。页面数据来自 `src/utils` 与 `src/utils/examples`，用于日常开发前快速核对公共能力。
                  </p>
                </div>

                <div class="grid min-w-[320px] grid-cols-2 gap-2 sm:grid-cols-4">
                  <div class="utils-docs-stat-card rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div class="text-[10px] font-black uppercase tracking-wide text-slate-400">模块</div>
                    <div class="mt-1 text-xl font-black text-slate-900 dark:text-white">{{ visibleStats.moduleCount }}</div>
                  </div>
                  <div class="utils-docs-stat-card rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div class="text-[10px] font-black uppercase tracking-wide text-slate-400">函数</div>
                    <div class="mt-1 text-xl font-black text-slate-900 dark:text-white">{{ visibleStats.functionCount }}</div>
                  </div>
                  <div class="utils-docs-stat-card rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div class="text-[10px] font-black uppercase tracking-wide text-slate-400">示例</div>
                    <div class="mt-1 text-xl font-black text-slate-900 dark:text-white">{{ visibleStats.exampleCount }}</div>
                  </div>
                  <div class="utils-docs-stat-card rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div class="text-[10px] font-black uppercase tracking-wide text-slate-400">质量</div>
                    <div class="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">{{ visibleStats.averageQualityScore }}</div>
                  </div>
                </div>
              </div>
            </section>

            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="doc in filteredDocs"
                :key="doc.key"
                class="utils-docs-module-card group flex min-h-[220px] cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary"
                @click="selectDoc(doc.key)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="font-mono text-sm font-black text-primary">{{ doc.key }}</div>
                    <h2 class="mt-1 line-clamp-1 text-base font-black text-slate-950 dark:text-white">{{ doc.title }}</h2>
                  </div>
                  <span class="shrink-0 rounded border px-2 py-1 text-[10px] font-black" :class="getQualityClasses(qualityReports[doc.key])">
                    {{ getQualityLabel(qualityReports[doc.key]) }}
                  </span>
                </div>

                <p class="mt-3 line-clamp-3 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{{ doc.description }}</p>

                <div class="mt-4 grid grid-cols-4 gap-2 text-center">
                  <div class="rounded-md bg-slate-50 px-2 py-2 dark:bg-slate-950">
                    <div class="text-sm font-black text-slate-900 dark:text-white">{{ doc.functions.length }}</div>
                    <div class="text-[9px] font-bold text-slate-400">函数</div>
                  </div>
                  <div class="rounded-md bg-slate-50 px-2 py-2 dark:bg-slate-950">
                    <div class="text-sm font-black text-slate-900 dark:text-white">{{ doc.examples.length }}</div>
                    <div class="text-[9px] font-bold text-slate-400">示例</div>
                  </div>
                  <div class="rounded-md bg-slate-50 px-2 py-2 dark:bg-slate-950">
                    <div class="text-sm font-black text-slate-900 dark:text-white">{{ doc.boundaryCases.length }}</div>
                    <div class="text-[9px] font-bold text-slate-400">边界</div>
                  </div>
                  <div class="rounded-md bg-slate-50 px-2 py-2 dark:bg-slate-950">
                    <div class="text-sm font-black text-slate-900 dark:text-white">{{ qualityReports[doc.key].sandboxReadyCount }}</div>
                    <div class="text-[9px] font-bold text-slate-400">沙箱</div>
                  </div>
                </div>

                <div class="mt-auto pt-4">
                  <div class="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">高频函数</div>
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="fn in doc.functions.slice(0, 5)" :key="fn.name" class="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                      {{ fn.name }}
                    </span>
                  </div>
                </div>
              </article>
            </section>
          </div>

          <div v-else-if="activeDoc && !selectedFuncName" :key="`module-${activeDoc.key}`" class="h-full w-full space-y-5 overflow-y-auto p-4 lg:p-6">
            <div class="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
              <button type="button" class="hover:text-primary" @click="activeDocKey = 'overview'">工具库</button>
              <ChevronRight class="h-4 w-4" />
              <span class="font-black text-slate-800 dark:text-slate-200">{{ activeDoc.title }}</span>
            </div>

            <section class="utils-docs-module-panel rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <header class="border-b border-slate-100 p-5 dark:border-slate-800">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h1 class="text-2xl font-black text-slate-950 dark:text-white">{{ activeDoc.title }}</h1>
                      <span class="rounded bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">{{ activeDoc.group }}</span>
                      <span v-if="activeDocQuality" class="rounded border px-2.5 py-1 text-[11px] font-black" :class="getQualityClasses(activeDocQuality)">
                        {{ getQualityLabel(activeDocQuality) }} · {{ activeDocQuality.score }}
                      </span>
                    </div>
                    <p class="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">{{ activeDoc.description }}</p>
                  </div>

                  <div class="flex shrink-0 flex-wrap gap-2">
                    <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" @click="copyImportStatement">
                      <Copy class="h-3.5 w-3.5" />
                      复制导入
                    </button>
                    <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" @click="copySourceFileList">
                      <FileText class="h-3.5 w-3.5" />
                      复制文件
                    </button>
                  </div>
                </div>

                <div v-if="activeDocQuality" class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div class="text-[10px] font-black uppercase tracking-wide text-slate-400">函数</div>
                    <div class="mt-1 text-lg font-black">{{ activeDocQuality.functionCount }}</div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div class="text-[10px] font-black uppercase tracking-wide text-slate-400">源文件</div>
                    <div class="mt-1 text-lg font-black">{{ activeDocQuality.sourceFileCount }}</div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div class="text-[10px] font-black uppercase tracking-wide text-slate-400">示例</div>
                    <div class="mt-1 text-lg font-black">{{ activeDocQuality.exampleCount }}</div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div class="text-[10px] font-black uppercase tracking-wide text-slate-400">边界</div>
                    <div class="mt-1 text-lg font-black">{{ activeDocQuality.boundaryCaseCount }}</div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div class="text-[10px] font-black uppercase tracking-wide text-slate-400">沙箱</div>
                    <div class="mt-1 text-lg font-black">{{ activeDocQuality.sandboxReadyCount }}</div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div class="text-[10px] font-black uppercase tracking-wide text-slate-400">完整度</div>
                    <div class="mt-1 text-lg font-black text-emerald-600 dark:text-emerald-400">{{ activeDocQuality.score }}</div>
                  </div>
                </div>
              </header>

              <div class="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div class="p-5">
                  <h2 class="mb-4 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                    <Layers3 class="h-4 w-4 text-primary" />
                    函数清单
                  </h2>
                  <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    <button
                      v-for="fn in activeDoc.functions"
                      :key="fn.name"
                      type="button"
                      class="utils-docs-function-card group min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-primary dark:hover:bg-slate-900"
                      @click="selectFunction(fn.name)"
                    >
                      <div class="flex items-start justify-between gap-2">
                        <h3 class="min-w-0 break-words font-mono text-sm font-black text-indigo-700 dark:text-indigo-300">{{ fn.name }}</h3>
                        <CheckCircle2 v-if="fn.sandbox?.enabled !== false" class="h-4 w-4 shrink-0 text-emerald-500" />
                        <XCircle v-else class="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                      </div>
                      <p class="mt-2 line-clamp-3 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{{ fn.description }}</p>
                      <div class="mt-3 flex items-center gap-1 text-[10px] font-black text-primary opacity-80">
                        查看详情
                        <ChevronRight class="h-3 w-3" />
                      </div>
                    </button>
                  </div>
                </div>

                <aside class="border-t border-slate-100 p-5 dark:border-slate-800 xl:border-l xl:border-t-0">
                  <h2 class="mb-3 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                    <FileText class="h-4 w-4 text-primary" />
                    源文件索引
                  </h2>
                  <BaseCodeBlock
                    :code="formatSourceFiles(activeDoc.sourceFiles)"
                    language="text"
                    size="sm"
                    max-height="260px"
                    :show-line-numbers="false"
                    copyable
                    wrap
                  />
                  <div class="mt-4">
                    <h3 class="mb-2 flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300">
                      <Code2 class="h-3.5 w-3.5 text-primary" />
                      推荐导入
                    </h3>
                    <BaseCodeBlock
                      :code="activeModuleImportSnippet"
                      language="ts"
                      size="sm"
                      max-height="120px"
                      :show-line-numbers="false"
                      copyable
                      wrap
                    />
                  </div>
                </aside>
              </div>
            </section>
          </div>

          <div
            v-else-if="activeDoc && activeFunctionObj"
            :key="`fn-${activeFunctionObj.name}`"
            class="grid h-full min-h-0 w-full grid-cols-1 overflow-y-auto xl:grid-cols-[minmax(0,1fr)_420px] xl:overflow-hidden 2xl:grid-cols-[minmax(0,1fr)_460px]"
          >
            <div class="min-w-0 space-y-5 p-4 lg:p-6 xl:min-h-0 xl:overflow-y-auto">
              <div class="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                <button type="button" class="hover:text-primary" @click="activeDocKey = 'overview'">工具库</button>
                <ChevronRight class="h-4 w-4" />
                <button type="button" class="hover:text-primary" @click="selectedFuncName = ''">{{ activeDoc.title }}</button>
                <ChevronRight class="h-4 w-4" />
                <span class="font-mono font-black text-slate-800 dark:text-slate-200">{{ activeFunctionObj.name }}</span>
              </div>

            <section class="utils-docs-detail-card rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <header class="border-b border-slate-100 p-5 dark:border-slate-800">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h1 class="break-words font-mono text-2xl font-black text-indigo-900 dark:text-indigo-100">{{ activeFunctionObj.name }}</h1>
                      <span v-if="activeFunctionObj.sandbox?.enabled !== false" class="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <CheckCircle2 class="h-3 w-3" />
                        可运行
                      </span>
                      <span v-else class="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                        <XCircle class="h-3 w-3" />
                        静态审查
                      </span>
                    </div>
                    <p class="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{{ activeFunctionObj.description }}</p>
                  </div>

                  <button type="button" class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" @click="copyImportStatement">
                    <Copy class="h-3.5 w-3.5" />
                    复制导入
                  </button>
                </div>

                <BaseCodeBlock
                  class="mt-4"
                  :code="activeFunctionSignature"
                  language="ts"
                  size="sm"
                  max-height="140px"
                  :show-line-numbers="false"
                  copyable
                  wrap
                />
              </header>

              <div class="min-w-0 space-y-6 p-5">
                  <section v-if="activeFunctionParams.length > 0">
                    <h2 class="mb-3 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
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
                          <tr v-for="param in activeFunctionParams" :key="param.name" class="align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
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

                  <section v-if="activeFunctionObj.returns">
                    <h2 class="mb-3 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                      <Terminal class="h-4 w-4 text-primary" />
                      返回值
                    </h2>
                    <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <code class="break-words font-mono text-xs font-black text-amber-600 dark:text-amber-300">{{ activeFunctionObj.returns.type }}</code>
                      <p class="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{{ activeFunctionObj.returns.description }}</p>
                    </div>
                  </section>

                  <section v-if="activeFunctionObj.throws && activeFunctionObj.throws.length > 0">
                    <h2 class="mb-3 flex items-center gap-2 text-sm font-black text-rose-600 dark:text-rose-300">
                      <AlertTriangle class="h-4 w-4" />
                      异常说明
                    </h2>
                    <div class="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/40">
                      <ul class="list-disc space-y-1 pl-5">
                        <li v-for="throwDesc in activeFunctionObj.throws" :key="throwDesc" class="text-xs font-semibold leading-5 text-rose-700 dark:text-rose-300">
                          {{ throwDesc }}
                        </li>
                      </ul>
                    </div>
                  </section>

                  <section>
                    <h2 class="mb-3 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                      <Braces class="h-4 w-4 text-primary" />
                      典型使用
                    </h2>
                    <div class="grid gap-4 xl:grid-cols-2">
                      <BaseCodeBlock
                        v-for="snippet in activeFunctionSnippets"
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

                  <section v-if="activeFunctionExamples.length > 0">
                    <h2 class="mb-3 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                      <Code2 class="h-4 w-4 text-primary" />
                      执行示例
                    </h2>
                    <div class="grid gap-4 xl:grid-cols-2">
                      <article v-for="example in activeFunctionExamples" :key="example.label" class="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
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

                  <section v-if="activeFunctionBoundaryCases.length > 0">
                    <h2 class="mb-3 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                      <SplitSquareHorizontal class="h-4 w-4 text-primary" />
                      容错与边界
                    </h2>
                    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <article v-for="item in activeFunctionBoundaryCases" :key="item.key" class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                        <h3 class="text-xs font-black text-slate-800 dark:text-slate-100">{{ item.title }}</h3>
                        <code class="mt-2 block break-words font-mono text-[11px] font-bold text-primary">{{ item.input }}</code>
                        <div class="mt-3 rounded bg-white px-2.5 py-2 text-[11px] font-semibold leading-5 text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">{{ item.expected }}</div>
                      </article>
                    </div>
                  </section>
                </div>
              </section>
            </div>

            <aside class="utils-docs-sandbox-panel flex min-h-[520px] flex-col border-t border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:h-full xl:min-h-0 xl:border-l xl:border-t-0">
              <div class="flex min-h-0 flex-1 flex-col">
                    <div class="flex items-center justify-between border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <h2 class="flex items-center gap-2 text-sm font-black text-indigo-900 dark:text-indigo-100">
                        <Terminal class="h-4 w-4" />
                        隔离沙箱
                      </h2>
                      <button
                        type="button"
                        class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                        :disabled="!canRunSandbox"
                        @click="runSandbox"
                      >
                        <Play class="h-3 w-3" :class="{ 'animate-pulse': isRunningSandbox }" />
                        {{ isRunningSandbox ? "执行中" : "运行" }}
                      </button>
                    </div>

                    <div v-if="sandboxDisabledReason" class="border-b border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                      {{ sandboxDisabledReason }}
                    </div>

                    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                      <div class="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                        <div class="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                          <Gauge class="h-3.5 w-3.5" />
                          当前函数
                        </div>
                        <div class="break-words font-mono text-sm font-black text-indigo-600 dark:text-indigo-300">{{ activeFunctionObj.name }}</div>
                      </div>

                      <div class="space-y-3">
                        <div v-for="(param, index) in activeFunctionParams" :key="param.name" class="space-y-1.5">
                          <label class="block text-xs font-black text-slate-700 dark:text-slate-300">
                            {{ index + 1 }}. <span class="font-mono text-indigo-500">{{ param.name }}</span>
                          </label>
                          <textarea
                            v-model="paramValues[index]"
                            rows="3"
                            class="w-full resize-y rounded-lg border bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-800 shadow-sm outline-none transition dark:bg-slate-900 dark:text-slate-200"
                            :class="syntaxErrors[index] ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500 focus:ring-opacity-20 dark:border-rose-500/50' : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 dark:border-slate-700 dark:focus:border-indigo-500'"
                            placeholder="输入 JS 表达式"
                          />
                          <div v-if="syntaxErrors[index]" class="flex items-center gap-1 text-[10px] font-bold text-rose-500">
                            <AlertTriangle class="h-3 w-3" />
                            {{ syntaxErrors[index] }}
                          </div>
                          <div v-else class="text-[10px] font-semibold text-slate-400">{{ param.type }}</div>
                        </div>

                        <div v-if="activeFunctionParams.length === 0" class="rounded-lg border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                          该函数无需传入参数。
                        </div>
                      </div>
                    </div>

                    <div class="flex min-h-0 basis-[42%] flex-col border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                      <div class="flex items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-slate-800">
                        <span class="text-xs font-black text-slate-500">执行结果</span>
                        <div class="flex items-center gap-2">
                          <button v-if="sandboxResult || sandboxError" type="button" class="text-[10px] font-black text-slate-400 transition hover:text-primary" @click="copySandboxResult">复制</button>
                          <button v-if="sandboxResult || sandboxError" type="button" class="text-[10px] font-black text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200" @click="resetSandboxState">清空</button>
                        </div>
                      </div>
                      <div class="min-h-0 flex-1 overflow-y-auto p-4 font-mono text-xs">
                        <div v-if="sandboxError" class="break-words text-rose-600 dark:text-rose-300">{{ sandboxError }}</div>
                        <pre v-else-if="sandboxResult" class="whitespace-pre-wrap break-words text-emerald-600 dark:text-emerald-300">{{ sandboxResult }}</pre>
                        <div v-else class="mt-8 text-center font-sans text-xs font-semibold text-slate-400">等待执行</div>
                      </div>
                    </div>
              </div>
            </aside>
          </div>
        </Transition>
      </main>
    </div>
  </div>
</template>

<style scoped>
.utils-docs-page {
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.94));
}

.utils-docs-main {
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(241, 245, 249, 0.92));
}

.utils-docs-nav-panel {
  box-shadow: inset -1px 0 0 rgba(148, 163, 184, 0.12);
}

.utils-docs-nav-panel input,
.utils-docs-sandbox-panel textarea {
  border-color: #dbe3ef;
  background-color: #f8fafc;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.utils-docs-nav-panel input:focus,
.utils-docs-sandbox-panel textarea:focus {
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.utils-docs-hero,
.utils-docs-module-panel,
.utils-docs-detail-card,
.utils-docs-sandbox-panel {
  border-color: rgba(203, 213, 225, 0.86);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.045);
}

.utils-docs-hero {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
}

.utils-docs-stat-card {
  min-height: 74px;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(241, 245, 249, 0.72));
}

.utils-docs-module-card,
.utils-docs-function-card {
  border-color: rgba(203, 213, 225, 0.88);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.035);
}

.utils-docs-module-card:hover,
.utils-docs-function-card:hover {
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.1);
}

.utils-docs-detail-card {
  overflow: hidden;
}

.utils-docs-detail-card table {
  border-collapse: separate;
  border-spacing: 0;
}

.utils-docs-detail-card thead {
  background-color: #f8fafc;
}

.utils-docs-sandbox-panel {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
}

.utils-docs-sandbox-panel pre {
  line-height: 1.65;
}

.utils-docs-page * {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.75) transparent;
}

.utils-docs-page ::-webkit-scrollbar {
  height: 10px;
  width: 10px;
}

.utils-docs-page ::-webkit-scrollbar-thumb {
  border: 3px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
  background-color: rgba(148, 163, 184, 0.7);
}

.utils-docs-page ::-webkit-scrollbar-thumb:hover {
  background-color: rgba(100, 116, 139, 0.78);
}

.utils-docs-page ::-webkit-scrollbar-track {
  background: transparent;
}

:global(.dark) .utils-docs-page,
:global(.dark) .utils-docs-main {
  background:
    linear-gradient(180deg, rgba(2, 6, 23, 0.98), rgba(15, 23, 42, 0.96));
}

:global(.dark) .utils-docs-nav-panel {
  box-shadow: inset -1px 0 0 rgba(51, 65, 85, 0.65);
}

:global(.dark) .utils-docs-nav-panel input,
:global(.dark) .utils-docs-sandbox-panel textarea {
  border-color: #334155;
  background-color: #020617;
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.08);
}

:global(.dark) .utils-docs-hero,
:global(.dark) .utils-docs-module-panel,
:global(.dark) .utils-docs-detail-card,
:global(.dark) .utils-docs-sandbox-panel {
  border-color: rgba(51, 65, 85, 0.9);
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.24);
}

:global(.dark) .utils-docs-hero,
:global(.dark) .utils-docs-sandbox-panel {
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.92));
}

:global(.dark) .utils-docs-stat-card {
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(2, 6, 23, 0.8));
}

:global(.dark) .utils-docs-module-card,
:global(.dark) .utils-docs-function-card {
  border-color: rgba(51, 65, 85, 0.88);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}
</style>
