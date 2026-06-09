import { defineStore } from "pinia";
import { ref } from "vue";
import { isTauriRuntime } from "../services/runtime";
import { configService } from "../services/config.service";
import { systemService } from "../services/system.service";
import { useAppStore } from "./app";
import {
  firstOf,
  getStorageBoolean,
  getStorageEnum,
  getStorageItem,
  parseBoolean,
  parseEnum,
  removeStorageItem,
  safeJsonParseObject,
  safeJsonStringify,
  setStorageItem,
  toTrimmedString,
} from "../utils";

export type ThemeMode = "light" | "dark" | "system";
export type SettingsBackupResult = "desktop" | "browser" | "cancelled";
const DEFAULT_PRIMARY_COLOR = "37 99 235";

export const useSettingStore = defineStore("settings", () => {
  const theme = ref<ThemeMode>("system");
  const locale = ref<string>("zh-CN");
  const autoCheckUpdate = ref<boolean>(true);
  const isDesktopRuntime = ref(isTauriRuntime());
  const preferenceConfig = ref<Record<string, unknown>>({});

  // 初始化设置
  const initSettings = async () => {
    // 默认浏览器 LocalStorage 降级策略
    const localData = {
      theme: getStorageEnum("theme", ["light", "dark", "system"] as const, "light", { emptyAsMissing: true }),
      locale: getStorageItem("locale", "zh-CN", { emptyAsMissing: true }),
      autoCheckUpdate: getStorageBoolean("autoCheckUpdate", true),
    };

    if (isTauriRuntime()) {
      try {
        const remoteCfgStr = await configService.getPreferenceConfig();
        const remoteCfg = safeJsonParseObject<Record<string, unknown>>(remoteCfgStr, {});
        preferenceConfig.value = remoteCfg;
        localData.theme = parseEnum(remoteCfg.theme, ["light", "dark", "system"] as const, localData.theme as ThemeMode);
        if (typeof remoteCfg.locale === "string") localData.locale = remoteCfg.locale;
        if (remoteCfg.autoCheckUpdate !== undefined) {
          localData.autoCheckUpdate = parseBoolean(remoteCfg.autoCheckUpdate, localData.autoCheckUpdate);
        }
      } catch (err) {
        console.error("[ERR_SETTINGS_LOAD] 从后端加载偏好设置失败，已降级使用 localStorage 本地缓存:", err);
      }
    }

    theme.value = localData.theme as ThemeMode;
    locale.value = localData.locale;
    autoCheckUpdate.value = localData.autoCheckUpdate;

    setupThemeListener();
    applyTheme(theme.value);
    applyPrimaryColor();
    removeStorageItem("primaryColor");
  };

  const applyPrimaryColor = () => {
    document.documentElement.style.setProperty("--color-primary", DEFAULT_PRIMARY_COLOR);
  };

  let mediaQueryList: MediaQueryList | null = null;

  const setupThemeListener = () => {
    if (!mediaQueryList) {
      mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQueryList.addEventListener("change", () => {
        if (theme.value === "system") {
          applyTheme("system");
        }
      });
    }
  };

  const applyTheme = (val: ThemeMode) => {
    const html = document.documentElement;
    let activeTheme = val;

    if (val === "system") {
      const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      activeTheme = isSystemDark ? "dark" : "light";
    }

    html.setAttribute("data-theme", activeTheme);
    if (activeTheme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  };

  const setTheme = async (val: ThemeMode) => {
    theme.value = val;
    applyTheme(val);
    setStorageItem("theme", val);
    await syncConfig();
  };

  const setLocale = async (val: string) => {
    locale.value = val;
    setStorageItem("locale", val);
    await syncConfig();
  };

  const setAutoCheckUpdate = async (val: boolean) => {
    autoCheckUpdate.value = val;
    setStorageItem("autoCheckUpdate", val);
    await syncConfig();
  };

  const syncConfig = async () => {
    if (isDesktopRuntime.value) {
      try {
        const cfg = {
          ...preferenceConfig.value,
          theme: theme.value,
          locale: locale.value,
          autoCheckUpdate: autoCheckUpdate.value,
        };
        preferenceConfig.value = cfg;
        await configService.savePreferenceConfig(safeJsonStringify(cfg, "{}"));
      } catch (err) {
        console.error("[ERR_SETTINGS_SYNC] 偏好设置同步至后端失败:", err);
      }
    }
  };

  const updateDataDir = (newPath: string): boolean => {
    const cleanPath = toTrimmedString(newPath);
    if (!cleanPath) return false;

    const appStore = useAppStore();
    appStore.updateLocalPath(cleanPath);
    return true;
  };

  const exportBackup = async (dbBackupLabel: string): Promise<SettingsBackupResult> => {
    if (isDesktopRuntime.value) {
      const target = await systemService.saveFileDialog({
        filters: [{ name: dbBackupLabel, extensions: ["db"] }],
        defaultPath: "monster_workbench_backup.db",
      });
      if (!target) return "cancelled";

      await systemService.exportDatabase(target);
      return "desktop";
    }

    await systemService.exportDatabase("");
    return "browser";
  };

  const importBackup = async (
    dbBackupLabel: string,
    browserFailedMessage: string
  ): Promise<SettingsBackupResult> => {
    if (isDesktopRuntime.value) {
      const selected = await systemService.openFileDialog({
        multiple: false,
        filters: [{ name: dbBackupLabel, extensions: ["db"] }],
      });
      if (!selected) return "cancelled";

      const filePath = firstOf(selected);
      await systemService.importDatabase(filePath);
      return "desktop";
    }

    const fileContent = await systemService.readBrowserTextFile(".json", browserFailedMessage);
    await systemService.importDatabase(fileContent);
    return "browser";
  };

  const resetApp = async () => {
    await systemService.resetDatabase();
  };

  return {
    theme,
    locale,
    autoCheckUpdate,
    isDesktopRuntime,
    initSettings,
    setTheme,
    setLocale,
    setAutoCheckUpdate,
    updateDataDir,
    exportBackup,
    importBackup,
    resetApp,
  };
});
