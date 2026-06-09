import { defineStore } from "pinia";
import { appService } from "../services/app.service";
import { applyObjectPatch, getStorageItem, getStorageJson, setStorageItem, setStorageJson } from "../utils";

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
        const customPath = getStorageItem("monster-workbench-custom-local-path", "", { emptyAsMissing: true });
        if (customPath) {
          this.localPath = customPath;
        } else {
          this.localPath = await appService.getAppPaths();
        }
      } catch {
        this.localPath = "Load Failed";
      }

      try {
        this.layoutPrefs = applyObjectPatch(this.layoutPrefs, getStorageJson<Partial<LayoutPrefs>>(STORAGE_KEY, {}));
      } catch {
        // ignore malformed local config
      }

      this.initialized = true;
    },

    updateLayoutPrefs(patch: Partial<LayoutPrefs>) {
      this.layoutPrefs = applyObjectPatch(this.layoutPrefs, patch);

      setStorageJson(STORAGE_KEY, this.layoutPrefs);
    },

    updateLocalPath(path: string) {
      this.localPath = path;
      setStorageItem("monster-workbench-custom-local-path", path);
    },
  },
});
