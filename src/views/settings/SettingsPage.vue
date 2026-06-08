<script setup lang="ts">
import { ref, computed } from "vue";
import { SlidersHorizontal, LayoutPanelLeft, Database, Activity } from "lucide-vue-next";
import { useAppStore } from "../../stores/app";
import type { LayoutPrefs } from "../../stores/app";
import { useSettingStore } from "../../stores/settings";
import { useToast } from "../../composables/useToast";
import { useConfirm } from "../../composables/useConfirm";
import { useLoading } from "../../composables/useLoading";
import { useI18n } from "../../composables/useI18n";

// 引入局部拆分出来的子面板组件
import SettingsAppearancePanel from "./components/SettingsAppearancePanel.vue";
import SettingsDataPanel from "./components/SettingsDataPanel.vue";
import SettingsDiagnosticsPanel from "./components/SettingsDiagnosticsPanel.vue";

const appStore = useAppStore();
const settingStore = useSettingStore();
const { triggerToast } = useToast();
const { confirm } = useConfirm();
const { showLoading, hideLoading } = useLoading();
const { t } = useI18n();

const activeTab = ref<"appearance" | "data" | "diagnostics">("appearance");

const model = computed({
  get: () => appStore.layoutPrefs,
  set: (value: LayoutPrefs) => appStore.updateLayoutPrefs(value),
});

async function handleUpdateDataDir(newPath: string) {
  if (settingStore.updateDataDir(newPath)) {
    triggerToast(t('settings.data.dataDirSuccess'), "success");
  }
}

// 导出数据库备份
async function handleExportBackup() {
  showLoading(t('settings.data.exportBtn') + "...");
  try {
    const result = await settingStore.exportBackup(t('settings.data.dbBackupLabel'));
    if (result === "cancelled") return;

    triggerToast(
      result === "browser"
        ? t('settings.data.browserBackupSuccess')
        : t('settings.data.dbBackupSuccess'),
      "success"
    );
  } catch (err) {
    triggerToast(
      err instanceof Error
        ? err.message
        : settingStore.isDesktopRuntime
          ? t('settings.data.dbBackupFailed')
          : t('settings.data.browserBackupFailed'),
      "error"
    );
  } finally {
    hideLoading();
  }
}

// 导入数据库备份并热重启
async function handleImportBackup() {
  const isTauri = settingStore.isDesktopRuntime;
  const ok = await confirm({
    title: isTauri ? t('settings.data.restoreTitle') : t('settings.data.restoreTitleBrowser'),
    message: isTauri ? t('settings.data.restoreMsg') : t('settings.data.restoreMsgBrowser'),
    confirmText: t('settings.data.restoreConfirmBtn'),
    danger: true,
  });
  if (!ok) return;

  showLoading(t('settings.data.restoreConfirmBtn') + "...");
  try {
    const result = await settingStore.importBackup(
      t('settings.data.dbBackupLabel'),
      t('settings.data.restoreFailedBrowser')
    );
    if (result === "cancelled") return;
  } catch (err) {
    triggerToast(
      err instanceof Error
        ? err.message
        : isTauri
          ? t('settings.data.restoreFailed')
          : t('settings.data.restoreFailedBrowser'),
      "error"
    );
  } finally {
    hideLoading();
  }
}

// 一键恢复出厂设置并重启
async function handleResetApp() {
  const isTauri = settingStore.isDesktopRuntime;
  const ok = await confirm({
    title: t('settings.data.resetConfirmTitle'),
    message: isTauri ? t('settings.data.resetConfirmMsg') : t('settings.data.resetConfirmMsgBrowser'),
    confirmText: t('settings.data.resetConfirmBtn'),
    danger: true,
  });
  if (!ok) return;

  showLoading(t('settings.data.resetBtn') + "...");
  try {
    await settingStore.resetApp();
  } catch (err) {
    triggerToast(err instanceof Error ? err.message : t('settings.data.resetFailed'), "error");
  } finally {
    hideLoading();
  }
}

</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm min-h-0">
    <!-- 顶栏标题 -->
    <div class="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-5 shrink-0">
      <div class="h-9 w-9 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-inner">
        <SlidersHorizontal class="h-5 w-5" />
      </div>
      <div>
        <h2 class="text-sm font-black text-slate-800 dark:text-slate-100 tracking-wide">{{ t('settings.title') }}</h2>
      </div>
    </div>

    <!-- 主体：侧边 Tab 与 右侧内容区域的左右布局 -->
    <div class="flex-1 flex min-h-0 mt-5 gap-6">
      <!-- 左侧 Tab 侧边栏 -->
      <div class="w-44 shrink-0 flex flex-col gap-1.5 border-r border-slate-100 dark:border-slate-800 pr-4 select-none">
        <button
          class="tab-btn"
          :class="activeTab === 'appearance' ? 'active-tab' : 'inactive-tab'"
          @click="activeTab = 'appearance'"
        >
          <LayoutPanelLeft class="h-4 w-4" />
          <span>{{ t('settings.tabs.appearance') }}</span>
        </button>
        <button
          class="tab-btn"
          :class="activeTab === 'data' ? 'active-tab' : 'inactive-tab'"
          @click="activeTab = 'data'"
        >
          <Database class="h-4 w-4" />
          <span>{{ t('settings.tabs.data') }}</span>
        </button>
        <button
          class="tab-btn"
          :class="activeTab === 'diagnostics' ? 'active-tab' : 'inactive-tab'"
          @click="activeTab = 'diagnostics'"
        >
          <Activity class="h-4 w-4" />
          <span>{{ t('settings.tabs.diagnostics') || '系统诊断' }}</span>
        </button>
      </div>

      <!-- 右侧设置项内容面板 -->
      <div class="flex-1 overflow-y-auto no-scrollbar pr-1">
        <transition name="fade-fast" mode="out-in">
          <!-- 界面外观面板 -->
          <SettingsAppearancePanel
            v-if="activeTab === 'appearance'"
            v-model="model"
          />
          <!-- 数据管理面板 -->
          <SettingsDataPanel
            v-else-if="activeTab === 'data'"
            :local-path="appStore.localPath"
            @update-data-dir="handleUpdateDataDir"
            @export-backup="handleExportBackup"
            @import-backup="handleImportBackup"
            @reset-app="handleResetApp"
          />
          <!-- 系统诊断面板 -->
          <SettingsDiagnosticsPanel
            v-else-if="activeTab === 'diagnostics'"
          />
          <!-- AI 模型提供商面板 -->
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-btn {
  @apply flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer w-full text-left;
}
.active-tab {
  @apply bg-primary/10 text-primary font-black shadow-inner;
}
.inactive-tab {
  @apply bg-transparent text-slate-500 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-slate-300;
}
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.15s ease;
}
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}
</style>
