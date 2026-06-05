import { defineStore } from "pinia";
import {
  checkForAppUpdate,
  downloadAndInstallPendingUpdate,
  type AppUpdateProgress,
} from "../services/app-updater";

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

      this.checking = true;
      if (!silent) {
        this.message = "正在检查更新...";
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
            this.message = `发现新版本 V${update.version}`;
          }
        } else {
          this.hasUpdate = false;
          this.updateInfo = null;
          if (!silent) {
            this.message = "当前已是最新版本";
          }
        }
      } catch (error: any) {
        console.error("检查更新失败:", error);
        if (!silent) {
          this.message = `检查更新失败: ${error.message || error}`;
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

      this.updating = true;
      this.message = "准备下载...";
      this.appProgress = { downloaded: 0, total: 0, percent: 0 };

      try {
        await downloadAndInstallPendingUpdate((progress) => {
          this.appProgress = progress;
          this.message = `正在下载更新: ${progress.percent}%`;
        });
      } catch (error: any) {
        console.error("升级应用失败:", error);
        this.message = `升级失败: ${error.message || error}`;
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
     * 初始化自动更新轮询
     */
    initAutoCheck() {
      // 1. 首次加载时进行一次静默检查
      this.checkUpdate(true);

      // 2. 每小时 (3600000ms) 自动轮询执行静默检查更新
      setInterval(() => {
        this.checkUpdate(true);
      }, 3600000);
    },
  },
});

