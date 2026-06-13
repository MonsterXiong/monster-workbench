<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Search } from "lucide-vue-next";
import { useClipboard } from "../../composables/useClipboard";
import UtilsDocsFunctionDetail from "./components/UtilsDocsFunctionDetail.vue";
import UtilsDocsModuleView from "./components/UtilsDocsModuleView.vue";
import UtilsDocsOverview from "./components/UtilsDocsOverview.vue";
import UtilsDocsSandboxPanel from "./components/UtilsDocsSandboxPanel.vue";
import UtilsDocsSidebar from "./components/UtilsDocsSidebar.vue";
import {
  getUtilityDocQualityReport,
  getUtilityDocStats,
  utilityDocGroups,
  utilityDocs,
  type UtilityDocEntry,
  type UtilityDocQualityReport,
} from "./utilsDocsContent";
import { formatFunctionSignature, formatSourceFiles } from "./utilsDocsUi";

interface SandboxResponse {
  id: number;
  success: boolean;
  result?: string;
  error?: string;
}

const searchKeyword = ref("");
const activeDocKey = ref<string | null>("overview");
const selectedFuncName = ref("");
const sidebarRef = ref<InstanceType<typeof UtilsDocsSidebar> | null>(null);
const expandedGroups = ref<Set<string>>(new Set());
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
  if (!keyword) return utilityDocs;

  return utilityDocs.filter((entry) => buildDocSearchText(entry).includes(keyword));
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
    const nextGroups = new Set(expandedGroups.value);
    nextGroups.add(doc.group);
    expandedGroups.value = nextGroups;
  }
});

watch(normalizedKeyword, (keyword) => {
  if (!keyword) {
    expandedGroups.value = activeDoc.value ? new Set([activeDoc.value.group]) : new Set();
    return;
  }
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

function selectOverview() {
  activeDocKey.value = "overview";
  selectedFuncName.value = "";
  expandedGroups.value = new Set();
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
    sidebarRef.value?.focusSearch();
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
  <div class="utils-docs-page flex h-full w-full overflow-hidden rounded-3xl bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
    <div class="utils-docs-shell flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <UtilsDocsSidebar
        ref="sidebarRef"
        v-model:search-keyword="searchKeyword"
        :doc-stats="docStats"
        :visible-stats="visibleStats"
        :docs-by-group="docsByGroup"
        :active-doc-key="activeDocKey"
        :selected-func-name="selectedFuncName"
        :expanded-groups="expandedGroups"
        :quality-reports="qualityReports"
        @select-overview="selectOverview"
        @select-doc="selectDoc"
        @select-function="selectFunction"
        @toggle-group="toggleGroup"
      />

      <main class="utils-docs-main min-h-0 flex-1 overflow-hidden">
        <div v-if="filteredDocs.length === 0" class="flex h-full min-h-[360px] flex-col items-center justify-center p-8 text-center">
          <Search class="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
          <div class="text-sm font-black text-slate-600 dark:text-slate-300">没有匹配的工具函数模块</div>
          <div class="mt-1 text-xs font-semibold text-slate-400">请调整搜索词</div>
        </div>

        <Transition name="fade" mode="out-in">
          <UtilsDocsOverview
            v-if="activeDocKey === 'overview'"
            key="overview"
            :docs="filteredDocs"
            :visible-stats="visibleStats"
            :quality-reports="qualityReports"
            @select-doc="selectDoc"
          />

          <UtilsDocsModuleView
            v-else-if="activeDoc && !selectedFuncName"
            :key="`module-${activeDoc.key}`"
            :doc="activeDoc"
            :quality="activeDocQuality"
            :import-snippet="activeModuleImportSnippet"
            @select-overview="selectOverview"
            @select-function="selectFunction"
            @copy-import="copyImportStatement"
            @copy-source-files="copySourceFileList"
          />

          <div
            v-else-if="activeDoc && activeFunctionObj"
            :key="`fn-${activeFunctionObj.name}`"
            class="grid h-full min-h-0 w-full grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(520px,auto)] overflow-hidden xl:grid-cols-[minmax(0,1fr)_420px] xl:grid-rows-1 2xl:grid-cols-[minmax(0,1fr)_460px]"
          >
            <UtilsDocsFunctionDetail
              :doc="activeDoc"
              :function-doc="activeFunctionObj"
              :params="activeFunctionParams"
              :signature="activeFunctionSignature"
              :snippets="activeFunctionSnippets"
              :examples="activeFunctionExamples"
              :boundary-cases="activeFunctionBoundaryCases"
              @select-overview="selectOverview"
              @select-module="selectedFuncName = ''"
              @copy-import="copyImportStatement"
            />

            <UtilsDocsSandboxPanel
              v-model:param-values="paramValues"
              :params="activeFunctionParams"
              :syntax-errors="syntaxErrors"
              :disabled-reason="sandboxDisabledReason"
              :can-run="canRunSandbox"
              :is-running="isRunningSandbox"
              :result="sandboxResult"
              :error="sandboxError"
              @run="runSandbox"
              @clear="resetSandboxState"
              @copy="copySandboxResult"
            />
          </div>
        </Transition>
      </main>
    </div>
  </div>
</template>

<style scoped>
.utils-docs-page {
  border-radius: 24px;
  background: #ffffff;
  overflow: hidden;
}

.utils-docs-shell {
  border: 1px solid #cbd5e1;
  border-radius: inherit;
  background: #ffffff;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.06);
}

.utils-docs-main {
  border-left: 1px solid #cbd5e1;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.96));
}

.utils-docs-page :deep(.utils-docs-sidebar) {
  border-color: #cbd5e1;
  background: #ffffff;
}

.utils-docs-page :deep(.utils-docs-sandbox-panel) {
  border-color: #cbd5e1;
  background: #ffffff;
}

@media (min-width: 1024px) {
  .utils-docs-page :deep(.utils-docs-sidebar) {
    border-radius: 24px 0 0 24px;
  }
}

@media (min-width: 1280px) {
  .utils-docs-page :deep(.utils-docs-sandbox-panel) {
    border-left: 1px solid #cbd5e1;
    border-radius: 0 24px 24px 0;
    overflow: hidden;
  }
}

.utils-docs-page :deep(.utils-docs-panel),
.utils-docs-page :deep(.utils-docs-card) {
  border: 1px solid rgba(203, 213, 225, 0.86);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
}

.utils-docs-page :deep(.utils-docs-card:hover) {
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.1);
}

.utils-docs-page :deep(.utils-docs-action) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #ffffff;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 900;
  color: #475569;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  transition: border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.utils-docs-page :deep(.utils-docs-action:hover) {
  border-color: var(--color-primary, #2563eb);
  color: var(--color-primary, #2563eb);
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.1);
}

.utils-docs-page :deep(.utils-docs-input) {
  border-radius: 12px;
  border-color: #cbd5e1;
  background-color: #f8fafc;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.utils-docs-page :deep(.utils-docs-input:focus) {
  border-color: var(--color-primary, #2563eb);
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.utils-docs-page :deep(*) {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.75) transparent;
}

.utils-docs-page :deep(::-webkit-scrollbar) {
  height: 10px;
  width: 10px;
}

.utils-docs-page :deep(::-webkit-scrollbar-thumb) {
  border: 3px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
  background-color: rgba(148, 163, 184, 0.7);
}

.utils-docs-page :deep(::-webkit-scrollbar-thumb:hover) {
  background-color: rgba(100, 116, 139, 0.78);
}

.utils-docs-page :deep(::-webkit-scrollbar-track) {
  background: transparent;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

:global(.dark) .utils-docs-page {
  background: #0f172a;
}

:global(.dark) .utils-docs-main {
  background:
    linear-gradient(180deg, rgba(2, 6, 23, 0.98), rgba(15, 23, 42, 0.96));
}

:global(.dark) .utils-docs-shell {
  border-color: #334155;
  background: #0f172a;
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.32);
}

:global(.dark) .utils-docs-main {
  border-left-color: #334155;
}

:global(.dark) .utils-docs-page :deep(.utils-docs-sidebar) {
  border-color: #334155;
}

:global(.dark) .utils-docs-page :deep(.utils-docs-sandbox-panel) {
  border-color: #334155;
  background: #0f172a;
}

@media (min-width: 1280px) {
  :global(.dark) .utils-docs-page :deep(.utils-docs-sandbox-panel) {
    border-left-color: #334155;
  }
}

:global(.dark) .utils-docs-page :deep(.utils-docs-panel),
:global(.dark) .utils-docs-page :deep(.utils-docs-card) {
  border-color: rgba(51, 65, 85, 0.9);
  background: rgba(15, 23, 42, 0.94);
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.24);
}

:global(.dark) .utils-docs-page :deep(.utils-docs-action) {
  border-color: #334155;
  background: #0f172a;
  color: #cbd5e1;
}

:global(.dark) .utils-docs-page :deep(.utils-docs-input) {
  border-color: #334155;
  background-color: #020617;
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.08);
}

:global(.dark) .utils-docs-page :deep(.utils-docs-input:focus) {
  background-color: #0f172a;
}
</style>
