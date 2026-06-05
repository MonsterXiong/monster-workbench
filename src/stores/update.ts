import { defineStore } from "pinia";
import {
  checkAndInstallAppUpdate,
  type AppUpdateProgress
} from "../services/app-updater";

export const useUpdateStore = defineStore("update", {
  state: () => ({
    checking: false,
    message: "",
    appProgress: {
      downloaded: 0,
      total: 0,
      percent: 0
    } as AppUpdateProgress
  }),

  actions: {
    async checkAppUpdate() {
      this.checking = true;
      this.message = "正在检查应用更新...";
      this.appProgress = { downloaded: 0, total: 0, percent: 0 };

      try {
        const result = await checkAndInstallAppUpdate((progress) => {
          this.appProgress = progress;
          this.message = `正在下载更新 ${progress.percent}%`;
        });

        if (!result.hasUpdate) {
          this.message = "当前已是最新版本";
        }
      } catch (error) {
        let errMsg = String(error);
        if (errMsg.includes("Could not fetch a valid release JSON")) {
          errMsg = "未能获取更新数据（请检查 tauri.conf.json 中的 OWNER/REPO 及 pubkey 是否已配置为您真实的 GitHub 仓库与更新公钥）";
        }
        this.message = `检查更新失败：${errMsg}`;
      } finally {
        this.checking = false;
      }
    }
  }
});
