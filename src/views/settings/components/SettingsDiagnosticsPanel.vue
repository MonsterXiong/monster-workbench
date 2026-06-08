<script setup lang="ts">
import { computed, onMounted } from "vue";
import { Terminal, ShieldCheck, FileText, Download, Trash2, RefreshCw } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useToast } from "../../../composables/useToast";
import { useConfirm } from "../../../composables/useConfirm";
import { useLoading } from "../../../composables/useLoading";
import { useSystemStore } from "../../../stores/system";
import { getLogLevelFromText } from "../../../utils";

const { triggerToast } = useToast();
const { confirm } = useConfirm();
const { showLoading, hideLoading } = useLoading();
const systemStore = useSystemStore();
const {
  localPath,
  dbStatus,
  isDesktopRuntime,
  todayLogFileName,
  recentLogLines,
} = storeToRefs(systemStore);

const appVersion = computed(() => isDesktopRuntime.value ? "V0.0.3-Native" : "V0.0.3-Browser (Mock)");
const platform = computed(() => {
  if (!isDesktopRuntime.value) return "Chrome / WebView2 (浏览器预览)";
  return window.navigator.userAgent.includes("Windows") ? "Windows 桌面客户端" : "其他桌面端";
});
const dbPath = computed(() => isDesktopRuntime.value ? localPath.value : "localStorage::database");
const dbStatusText = computed(() => {
  if (!isDesktopRuntime.value) return "虚拟内存就绪";
  if (dbStatus.value === "normal") return "连接正常";
  if (dbStatus.value === "checking") return "检查中";
  return "离线";
});

// 加载日志
function getDiagnosticLogClass(log: string) {
  const level = getLogLevelFromText(log);

  return {
    "text-red-600 dark:text-red-400 bg-red-500/5": level === "ERROR",
    "text-amber-600 dark:text-amber-400 bg-amber-500/5": level === "WARN",
    "text-blue-600 dark:text-blue-400 bg-blue-500/5": level === "DEBUG",
    "text-slate-600 dark:text-slate-300 hover:bg-slate-200/40 dark:hover:bg-slate-900": level !== "ERROR" && level !== "WARN" && level !== "DEBUG",
  };
}

async function loadLogs() {
  try {
    await systemStore.fetchLogs();
  } catch (err) {
    console.error("加载日志失败", err);
  }
}

// 清除物理日志
async function handleClearLogs() {
  const ok = await confirm({
    title: "警告",
    message: "确认清空所有物理日志文件吗？此操作无法撤销。",
    confirmText: "清空",
    danger: true
  });
  if (!ok) return;

  showLoading("清空日志中...");
  try {
    await systemStore.clearLogs();
    triggerToast("成功清除所有物理日志", "success");
  } catch (err) {
    triggerToast(err instanceof Error ? err.message : "清空失败", "error");
  } finally {
    hideLoading();
  }
}

// 导出诊断包
async function handleExportDiagnostics() {
  showLoading("汇总并导出诊断日志中...");
  try {
    const result = await systemStore.exportDiagnostics("诊断报告 (.txt)");
    if (result === "cancelled") return;
    triggerToast("一键诊断导出成功", "success");
  } catch (err) {
    triggerToast(err instanceof Error ? err.message : "导出失败", "error");
  } finally {
    hideLoading();
  }
}

onMounted(async () => {
  await systemStore.loadDiagnostics("未找到");
  await loadLogs();
});
</script>

<template>
  <div class="space-y-4 select-none">
    <div>
      <h3 class="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
        客户端环境与系统诊断
      </h3>
    </div>

    <!-- 诊断元数据表格 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <div class="flex items-center gap-2.5 mb-3">
          <div class="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck class="h-3.5 w-3.5" />
          </div>
          <span class="text-[11px] font-black text-slate-800 dark:text-slate-200">系统信息摘要</span>
        </div>
        <div class="space-y-2 text-[10px] font-bold text-slate-600 dark:text-slate-400">
          <div class="flex justify-between">
            <span>主版本号</span>
            <span class="text-slate-800 dark:text-slate-200">{{ appVersion }}</span>
          </div>
          <div class="flex justify-between">
            <span>运行平台</span>
            <span class="text-slate-800 dark:text-slate-200">{{ platform }}</span>
          </div>
          <div class="flex justify-between">
            <span>数据库状态</span>
            <span class="text-success">{{ dbStatusText }}</span>
          </div>
        </div>
      </div>

      <div class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <div class="flex items-center gap-2.5 mb-3">
          <div class="h-6 w-6 rounded bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <FileText class="h-3.5 w-3.5" />
          </div>
          <span class="text-[11px] font-black text-slate-800 dark:text-slate-200">本地持久化路径</span>
        </div>
        <div class="space-y-2 text-[10px] font-bold text-slate-600 dark:text-slate-400">
          <div class="flex flex-col gap-1">
            <span>SQLite 数据库路径</span>
            <span class="text-slate-800 dark:text-slate-200 break-all select-text bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-lg mt-0.5 leading-normal font-semibold">
              {{ dbPath }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 一键诊断导出卡片 -->
    <div class="p-4 rounded-2xl bg-gradient-to-tr from-blue-500/5 to-indigo-500/5 border border-blue-500/15 dark:border-blue-400/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Terminal class="h-4.5 w-4.5" />
        </div>
        <div>
          <h4 class="text-xs font-black text-slate-800 dark:text-slate-200">一键导出系统诊断报告</h4>
          <p class="text-[10px] text-slate-600 dark:text-slate-400 font-semibold leading-relaxed mt-1">
            该操作将自动整合系统配置、硬件架构、主数据库状态以及近 7 天内的本地日志，生成一份格式化的文本诊断报告，极速定位崩溃原因。为了您的隐私，敏感口令及凭据已被自动脱敏过滤。
          </p>
        </div>
      </div>
      <BaseButton
        type="primary"
        size="sm"
        class="shrink-0 font-bold"
        @click="handleExportDiagnostics"
      >
        <template #icon><Download class="h-3.5 w-3.5" /></template>
        导出诊断包
      </BaseButton>
    </div>

    <!-- 日志流追踪审计看板 -->
    <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-200 flex flex-col min-h-0">
      <div class="flex items-center justify-between border-b border-slate-250 dark:border-slate-800 pb-3 mb-3">
        <div class="flex items-center gap-2">
          <span class="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
          <span class="text-[10px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
            最近日志记录 (最近 10 条) - {{ todayLogFileName }}
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            class="action-btn text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800"
            title="刷新日志"
            @click="loadLogs"
          >
            <RefreshCw class="h-3.5 w-3.5" />
          </button>
          <button
            class="action-btn text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
            title="清除物理日志"
            @click="handleClearLogs"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div class="overflow-y-auto no-scrollbar font-mono text-[9px] leading-relaxed space-y-1.5 max-h-48 select-text">
        <div v-if="recentLogLines.length === 0" class="text-slate-500 text-center py-4 font-bold">
          暂无任何异常或提示日志
        </div>
        <div
          v-for="(log, idx) in recentLogLines"
          :key="idx"
          class="p-1 rounded transition-colors whitespace-pre-wrap leading-normal"
          :class="getDiagnosticLogClass(log)"
        >
          {{ log }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.action-btn {
  @apply p-1.5 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center;
}
.no-scrollbar {
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
