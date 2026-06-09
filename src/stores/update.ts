import { defineStore } from "pinia";
import {
  checkForAppUpdate,
  downloadAndInstallPendingUpdate,
  type AppUpdateProgress,
} from "../services/app-updater";
import { updaterService } from "../services/updater.service";
import { getTranslation } from "../locales";
import { useSettingStore } from "./settings";
import { useTaskStore } from "./task";
import { createInterval, formatTemplate, getCurrentTimestampMs, stringifyErrorMessage } from "../utils";

let autoCheckInitialized = false;

export const useUpdateStore = defineStore("update", {
  state: () => ({
    checking: false,
    hasUpdate: false,
    showModal: false,
    updating: false,
    message: "",
    updateInfo: null as {
      version: string;
      body?: string;
      date?: string;
    } | null,
    appProgress: {
      downloaded: 0,
      total: 0,
      percent: 0,
    } as AppUpdateProgress,
  }),

  actions: {
    /**
     * 检查更新
     * @param silent 是否静默检查（静默检查不显示“正在检查更新”等提示，但发现更新时依然会弹窗提示）
     */
    async checkUpdate(silent = false) {
      if (this.updating) return;

      const settingsStore = useSettingStore();
      const t = (key: string) => getTranslation(key, settingsStore.locale);

      this.checking = true;
      if (!silent) {
        this.message = t("updater.checking");
      }

      try {
        const update = await checkForAppUpdate();
        if (update) {
          this.hasUpdate = true;
          this.updateInfo = {
            version: update.version,
            body: update.body,
            date: update.date,
          };
          this.showModal = true;
          if (!silent) {
            this.message = `${t("updater.newVersion")} V${update.version}`;
          }
        } else {
          this.hasUpdate = false;
          this.updateInfo = null;
          if (!silent) {
            this.message = t("updater.upToDate");
          }
        }
      } catch (error: any) {
        console.error("[ERR_UPDATE_CHECK] 检查更新失败:", error);
        if (!silent) {
          this.message = `${t("updater.failed")}: ${stringifyErrorMessage(error)}`;
        }
      } finally {
        this.checking = false;
      }
    },

    /**
     * 确认并开始更新下载与安装
     */
    async confirmUpdate() {
      if (this.updating) return;

      const settingsStore = useSettingStore();
      const t = (key: string) => getTranslation(key, settingsStore.locale);

      this.updating = true;
      this.message = t("updater.preparing");
      this.appProgress = { downloaded: 0, total: 0, percent: 0 };

      try {
        await downloadAndInstallPendingUpdate((progress) => {
          this.appProgress = progress;
          this.message = formatTemplate(t("updater.progressMsg"), { percent: progress.percent });
        });
      } catch (error: any) {
        console.error("[ERR_UPDATE_INSTALL] 应用更新安装失败:", error);
        this.message = `${t("common.error")}: ${stringifyErrorMessage(error)}`;
        this.updating = false;
      }
    },

    /**
     * 取消或推迟更新
     */
    cancelUpdate() {
      this.showModal = false;
      // 保持 hasUpdate 为 true，以便在侧边栏上保留小红点
    },

    /**
     * 触发后台模拟升级包下载（用于开发演示及任务进度联动）
     */
    async triggerDummyDownload() {
      const taskStore = useTaskStore();
      const taskId = `update-${getCurrentTimestampMs()}`;
      const taskName = "系统更新包下载";
      taskStore.addTask(taskId, taskName);
      await updaterService.triggerUpdateDownload(taskId, taskName);
    },

    /**
     * 初始化自动更新轮询
     */
    initAutoCheck() {
      if (autoCheckInitialized) return;
      autoCheckInitialized = true;

      // 1. 首次加载时进行一次静默检查
      this.checkUpdate(true);

      // 2. 每小时 (3600000ms) 自动轮询执行静默检查更新
      createInterval(() => {
        this.checkUpdate(true);
      }, 3600000);
    },
  },
});
