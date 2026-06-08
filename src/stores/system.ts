import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { systemService } from "../services/system.service";
import { logger } from "../services/logger";
import { isTauriRuntime } from "../services/runtime";
import { useErrorMonitorStore } from "./error-monitor";
import { compactArray, hasLogLevel, splitLines, takeRight, toReversedArray } from "../utils";

export type SystemTab = "terminal" | "errors";
export type SystemLogFilter = "all" | "debug" | "info" | "warn" | "error";
export type SystemDbStatus = "checking" | "normal" | "offline";

export const useSystemStore = defineStore("system", () => {
  const activeTab = ref<SystemTab>("terminal");
  const activeFilter = ref<SystemLogFilter>("all");
  const dbStatus = ref<SystemDbStatus>("checking");
  const localPath = ref("");
  const logLines = ref<string[]>([]);
  const logLoading = ref(false);
  const isDesktopRuntime = ref(isTauriRuntime());

  const isDbOnline = computed(() => dbStatus.value === "normal");
  const todayLogFileName = computed(() => logger.getTodayLogFileName());

  const filteredLogLines = computed(() => {
    if (activeFilter.value === "all") return logLines.value;
    return logLines.value.filter((line) => hasLogLevel(line, activeFilter.value));
  });

  const recentLogLines = computed(() => toReversedArray(takeRight(compactArray(logLines.value), 10)));

  async function loadDiagnostics(fallbackPath: string) {
    try {
      localPath.value = await systemService.getAppDataDir();
    } catch (err: any) {
      localPath.value = err?.message || fallbackPath;
    }

    dbStatus.value = "checking";
    try {
      await systemService.checkDbStatus();
      dbStatus.value = "normal";
    } catch {
      dbStatus.value = "offline";
    }
  }

  async function fetchLogs() {
    const errorMonitorStore = useErrorMonitorStore();
    logLoading.value = true;
    try {
      const fileName = logger.getTodayLogFileName();
      const raw = await systemService.readLogFile(fileName);
      logLines.value = splitLines(raw, { keepEmpty: false });
      errorMonitorStore.syncFromLogLines(logLines.value);
    } finally {
      logLoading.value = false;
    }
  }

  async function clearLogs() {
    const errorMonitorStore = useErrorMonitorStore();
    await systemService.clearAllLogs();
    logLines.value = [];
    errorMonitorStore.syncFromLogLines([]);
    errorMonitorStore.resetReviewState();
  }

  async function exportLogs(logFileLabel: string): Promise<"desktop" | "browser" | "cancelled"> {
    const fileName = todayLogFileName.value;

    if (isDesktopRuntime.value) {
      const target = await systemService.saveFileDialog({
        filters: [{ name: logFileLabel, extensions: ["log"] }],
        defaultPath: fileName,
      });
      if (!target) return "cancelled";

      await systemService.exportLogFile(fileName, target);
      return "desktop";
    }

    await systemService.exportLogFile(fileName, "");
    return "browser";
  }

  async function exportDiagnostics(reportFileLabel: string): Promise<"desktop" | "browser" | "cancelled"> {
    if (isDesktopRuntime.value) {
      const target = await systemService.saveFileDialog({
        filters: [{ name: reportFileLabel, extensions: ["txt"] }],
        defaultPath: "monster_workbench_diagnostics.txt",
      });
      if (!target) return "cancelled";

      await systemService.exportSystemDiagnostics(target);
      return "desktop";
    }

    await systemService.exportSystemDiagnostics("");
    return "browser";
  }

  async function selectPath(type: "folder" | "file"): Promise<string | null> {
    if (!isDesktopRuntime.value) return null;
    return type === "folder"
      ? systemService.selectFolder()
      : systemService.selectFile();
  }

  async function reportLogs() {
    await new Promise(resolve => window.setTimeout(resolve, 900));
  }

  return {
    activeTab,
    activeFilter,
    dbStatus,
    localPath,
    logLines,
    logLoading,
    isDesktopRuntime,
    isDbOnline,
    todayLogFileName,
    filteredLogLines,
    recentLogLines,
    loadDiagnostics,
    fetchLogs,
    clearLogs,
    exportLogs,
    exportDiagnostics,
    selectPath,
    reportLogs,
  };
});
