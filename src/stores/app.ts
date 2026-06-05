import { getVersion } from "@tauri-apps/api/app";
import { defineStore } from "pinia";
import { systemService } from "../services/system.service";

export type LayoutPrefs = {
  sidebarCollapsed: boolean;
  density: "comfortable" | "compact";
  fontScale: "normal" | "large";
  showStatusFooter: boolean;
};

const STORAGE_KEY = "monster-workbench-layout-prefs";

export const useAppStore = defineStore("app", {
  state: () => ({
    version: "开发版",
    localPath: "加载中...",
    initialized: false,
    layoutPrefs: {
      sidebarCollapsed: false,
      density: "compact",
      fontScale: "normal",
      showStatusFooter: false,
    } as LayoutPrefs,
  }),

  actions: {
    async initialize() {
      if (this.initialized) {
        return;
      }

      try {
        this.version = await getVersion();
      } catch {
        this.version = "开发版";
      }

      try {
        const customPath = localStorage.getItem("monster-workbench-custom-local-path");
        if (customPath) {
          this.localPath = customPath;
        } else {
          this.localPath = await systemService.getAppDataDir();
        }
      } catch {
        this.localPath = "加载失败";
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.layoutPrefs = {
            ...this.layoutPrefs,
            ...JSON.parse(raw),
          };
        }
      } catch {
        // ignore malformed local config
      }

      this.initialized = true;
    },

    updateLayoutPrefs(patch: Partial<LayoutPrefs>) {
      this.layoutPrefs = {
        ...this.layoutPrefs,
        ...patch,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.layoutPrefs));
    },

    updateLocalPath(path: string) {
      this.localPath = path;
      localStorage.setItem("monster-workbench-custom-local-path", path);
    },
  },
});
