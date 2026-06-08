import { defineStore } from "pinia";
import { appService } from "../services/app.service";
import { safeJsonParse, safeJsonStringify } from "../utils";

export type LayoutPrefs = {
  sidebarCollapsed: boolean;
  density: "comfortable" | "compact";
  fontScale: "normal" | "large";
  showStatusFooter: boolean;
};

const STORAGE_KEY = "monster-workbench-layout-prefs";

export const useAppStore = defineStore("app", {
  state: () => ({
    version: "Development",
    localPath: "Loading...",
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
        this.version = await appService.getAppVersion();
      } catch {
        this.version = "Development";
      }

      try {
        const customPath = localStorage.getItem("monster-workbench-custom-local-path");
        if (customPath) {
          this.localPath = customPath;
        } else {
          this.localPath = await appService.getAppPaths();
        }
      } catch {
        this.localPath = "Load Failed";
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.layoutPrefs = {
            ...this.layoutPrefs,
            ...safeJsonParse<Partial<LayoutPrefs>>(raw, {}),
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

      localStorage.setItem(STORAGE_KEY, safeJsonStringify(this.layoutPrefs));
    },

    updateLocalPath(path: string) {
      this.localPath = path;
      localStorage.setItem("monster-workbench-custom-local-path", path);
    },
  },
});
