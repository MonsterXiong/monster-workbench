<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Activity } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useToast } from "../../composables/useToast";
import { useConfirm } from "../../composables/useConfirm";
import { useLoading } from "../../composables/useLoading";
import { useClipboard } from "../../composables/useClipboard";
import { useI18n } from "../../composables/useI18n";
import {
  type ErrorMonitorEntry,
  type ErrorReviewStatus,
} from "../../stores/error-monitor";
import { useErrorMonitorStore } from "../../stores/error-monitor";
import { useSystemStore } from "../../stores/system";
import { formatTemplate, getErrorMessage } from "../../utils";

// 引入局部拆分的组件
import SystemStatusSidebar from "./components/SystemStatusSidebar.vue";
import SystemLogTerminal from "./components/SystemLogTerminal.vue";
import SystemErrorMonitor from "./components/SystemErrorMonitor.vue";

const { t } = useI18n();
const { triggerToast } = useToast();
const { confirm } = useConfirm();
const { showLoading, hideLoading } = useLoading();
const { copyText } = useClipboard();
const errorMonitorStore = useErrorMonitorStore();
const systemStore = useSystemStore();
const {
  activeTab,
  activeFilter,
  dbStatus,
  localPath,
  logLoading,
  isDesktopRuntime,
  isDbOnline,
  filteredLogLines,
} = storeToRefs(systemStore);

const appMode = computed(() => isDesktopRuntime.value ? t('system.appModeTauri') : t('system.appModeBrowser'));
const dbStatusText = computed(() => {
  if (dbStatus.value === "normal") return t("system.dbStatusNormal");
  if (dbStatus.value === "offline") return t("system.dbStatusOffline");
  return t("system.dbStatusChecking");
});

// 错误堆栈弹窗状态
const selectedError = ref<ErrorMonitorEntry | null>(null);
const isErrorDialogVisible = ref(false);

onMounted(async () => {
  await systemStore.loadDiagnostics(t('system.getPathFailed'));
  await fetchLogs();
});

// 刷新读取日志文件
async function fetchLogs() {
  try {
    await systemStore.fetchLogs();
  } catch (err) {
    triggerToast(t('system.readLogFailed'), "error");
  }
}

// 物理日志清空
async function handleClearLogs() {
  const ok = await confirm({
    title: t('system.clearLogsTitle'),
    message: t('system.clearLogsMsg'),
    confirmText: t('system.clearLogsConfirm'),
    danger: true,
  });
  if (!ok) return;

  showLoading(t('system.clear') + '...');
  try {
    await systemStore.clearLogs();
    triggerToast(t('system.clearLogsSuccess'), "success");
  } catch (err: any) {
    triggerToast(getErrorMessage(err, t('system.clearLogsFailed')), "error");
  } finally {
    hideLoading();
  }
}

// 导出另存日志
async function handleExportLogs() {
  try {
    if (isDesktopRuntime.value) {
      showLoading(t('system.export') + '...');
    }
    const result = await systemStore.exportLogs(t('system.logFileLabel'));
    if (result === "cancelled") return;
    triggerToast(
      result === "browser" ? t('system.exportLogsSuccessBrowser') : t('system.exportLogsSuccess'),
      "success"
    );
  } catch (err: any) {
    triggerToast(getErrorMessage(err, t('system.exportLogsFailed')), "error");
  } finally {
    hideLoading();
  }
}

// 日志打包上报
async function handleReportLogs() {
  showLoading(t('system.reportLogsProgress'));
  try {
    await systemStore.reportLogs();
    triggerToast(t('system.reportLogsSuccess'), "success");
  } finally {
    hideLoading();
  }
}

// 显示堆栈详情
const showStackDetail = (err: ErrorMonitorEntry) => {
  selectedError.value = err;
  isErrorDialogVisible.value = true;
};

const markErrorStatus = (fingerprint: string, status: ErrorReviewStatus) => {
  errorMonitorStore.updateEntryStatus(fingerprint, status);

  if (status === "resolved") {
    triggerToast(t('system.markResolvedSuccess'), "success");
    return;
  }

  if (status === "needs_review") {
    triggerToast(t('system.markNeedsReviewSuccess'), "success");
    return;
  }

  triggerToast(t('system.markPendingSuccess'), "success");
};

// 复制堆栈代码
const copyStackCode = async () => {
  if (!selectedError.value) return;
  await copyText(selectedError.value.details, t('system.copiedStack'));
};
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm min-h-0 select-none">
    <!-- 顶部状态栏 -->
    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 shrink-0">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-inner">
          <Activity class="h-5.5 w-5.5" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-wide">{{ t('system.title') }}</h2>
          <p class="text-xs text-slate-400 mt-0.5">{{ t('system.subTitle') }}</p>
        </div>
      </div>

      <!-- Tab 切换 -->
      <BaseTab
        v-model="activeTab"
        :tabs="[
          { key: 'terminal', title: t('system.terminalTab'), icon: 'Terminal' },
          {
            key: 'errors',
            title: t('system.errorsTab'),
            icon: 'AlertCircle',
            badge: errorMonitorStore.actionableCount > 0 ? errorMonitorStore.actionableCount : undefined,
            badgeColor: 'bg-amber-500 text-white'
          }
        ]"
      />
    </div>

    <!-- 左右布局 -->
    <div class="flex-1 flex flex-col lg:flex-row min-h-0 mt-5 gap-6">
      <!-- 1. 左侧状态看板 -->
      <SystemStatusSidebar
        :app-mode="appMode"
        :db-status="dbStatusText"
        :is-db-online="isDbOnline"
        :local-path="localPath"
      />

      <!-- 2. 右侧 Tab 主内容 -->
      <div class="flex-1 flex flex-col min-h-0">
        <!-- Tab 1: 实时日志 -->
        <SystemLogTerminal
          v-if="activeTab === 'terminal'"
          v-model:active-filter="activeFilter"
          :filtered-lines="filteredLogLines"
          :loading="logLoading"
          @refresh="fetchLogs"
          @export="handleExportLogs"
          @report="handleReportLogs"
          @clear="handleClearLogs"
        />

        <!-- Tab 2: 错误监控 -->
        <SystemErrorMonitor
          v-else-if="activeTab === 'errors'"
          :error-cards="errorMonitorStore.filteredEntries"
          :total-count="errorMonitorStore.entries.length"
          :pending-count="errorMonitorStore.pendingCount"
          :needs-review-count="errorMonitorStore.needsReviewCount"
          :resolved-count="errorMonitorStore.resolvedCount"
          :status-filter="errorMonitorStore.statusFilter"
          @trace="showStackDetail"
          @update:status-filter="errorMonitorStore.setStatusFilter"
          @mark-resolved="markErrorStatus($event, 'resolved')"
          @mark-needs-review="markErrorStatus($event, 'needs_review')"
          @mark-pending="markErrorStatus($event, 'pending')"
        />
      </div>
    </div>

    <!-- 错误 Trace 详情 Dialog -->
    <BaseDialog v-model="isErrorDialogVisible" :title="selectedError ? formatTemplate(t('system.logDetailTitle'), { type: selectedError.errorType }) : ''" width="max-w-xl">
      <div v-if="selectedError" class="space-y-4">
        <div class="flex items-center justify-between text-xs text-slate-550 border-b border-slate-100 dark:border-slate-800 pb-2">
          <span>{{ formatTemplate(t('system.logDetailTime'), { time: selectedError.time }) }}</span>
          <span class="font-mono">{{ selectedError.errorType }} / {{ selectedError.errorCode }}</span>
        </div>
        <div>
          <label class="text-[11px] font-bold text-slate-400 block mb-1">{{ t('system.logMsgTitle') }}</label>
          <div class="p-3 border border-red-100/50 dark:border-red-950 bg-red-50/20 dark:bg-red-955/20 text-red-650 dark:text-red-400 text-xs rounded-xl break-all leading-relaxed font-bold">
            {{ selectedError.message }}
          </div>
        </div>
        <div>
          <label class="text-[11px] font-bold text-slate-400 block mb-1">{{ t('system.logStackTitle') }}</label>
          <pre class="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-[10px] rounded-xl overflow-x-auto max-h-60 leading-relaxed select-all font-mono whitespace-pre-wrap">{{ selectedError.details || t('system.noStackDetails') }}</pre>
        </div>
      </div>
      <template #footer>
        <BaseButton size="sm" type="ghost" @click="isErrorDialogVisible = false">
          {{ t('system.closeBtn') }}
        </BaseButton>
        <BaseButton size="sm" @click="copyStackCode">
          {{ t('system.copyStackBtn') }}
        </BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<style scoped>
/* 无 */
</style>
