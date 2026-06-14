import { ensureBrowserMessage } from "./runtime";
import { clearAiProviderMockTasks, handleAiProviderMock } from "./mocks/ai-provider.mock";
import { request } from "./request";
import {
  filterByOptionalValues,
  filterBySearchTextFields,
  findByValue,
  findIndexByValue,
  formatCurrentIsoDateTime,
  getNextNumberBy,
  joinLines,
  paginateArray,
  pushLimitedItem,
  redactSensitiveObjectDeep,
  removeByValue,
  removeByValues,
  safeJsonStringify,
  sortByMany,
  tryJsonParse,
  tryJsonParseObject,
  uniqueMappedValues,
} from "../utils";

const mockNavigations = [
  {
    id: 1,
    title: "Google Search",
    url: "https://www.google.com",
    description: "全球最大的搜索引擎，技术排障利器",
    category: "研发常用",
    is_featured: 1,
    is_hot: 1,
    clicks: 120,
    created_at: "2026-06-07 10:00:00",
    logo_path: null,
    bg_path: null,
    sort_order: 1,
  },
  {
    id: 2,
    title: "GitHub Portal",
    url: "https://github.com",
    description: "开源代码托管平台，全球开发者协作社区",
    category: "研发常用",
    is_featured: 1,
    is_hot: 0,
    clicks: 95,
    created_at: "2026-06-07 10:05:00",
    logo_path: null,
    bg_path: null,
    sort_order: 2,
  },
  {
    id: 3,
    title: "Element Plus Docs",
    url: "https://element-plus.org",
    description: "基于 Vue 3 的桌面端组件库，极佳的 UI 资产开发伴侣",
    category: "前端框架",
    is_featured: 0,
    is_hot: 1,
    clicks: 45,
    created_at: "2026-06-07 10:10:00",
    logo_path: null,
    bg_path: null,
    sort_order: 3,
  },
];

let navigationsStore = [...mockNavigations];

const APP_CONFIG_STORE_KEY = "monsterWorkbench.mock.preferenceConfig";
const APP_CONFIG_SEED_URL = "/mock/preference-config.json";
const defaultAppConfigStore = {
  theme: "light",
  language: "zh-CN",
  logLevel: "info",
  autoUpdate: true,
};

let appConfigStore = loadMockPreferenceConfig();
let appConfigStoreSeedPromise: Promise<void> | null = null;

const mockLogs = [
  "[2026-06-07 13:00:01] [INFO] [Mock] Monster Workbench 离线预览版引擎挂载成功",
  "[2026-06-07 13:02:15] [WARN] [Mock] 拦截到 tauri_invoke 调用，自动开启开发沙箱安全路由保护",
];

function readMockStorageItem(key: string) {
  try {
    return typeof localStorage === "undefined" ? "" : localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeMockStorageItem(key: string, value: string) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn("[WARN_IPC_MOCK_CONFIG] Mock 偏好配置写入浏览器存储失败:", error);
  }
}

function loadMockPreferenceConfig() {
  const raw = readMockStorageItem(APP_CONFIG_STORE_KEY);
  if (!raw) {
    return { ...defaultAppConfigStore };
  }
  const parsed = tryJsonParseObject(raw);
  return parsed.ok && parsed.data ? { ...defaultAppConfigStore, ...parsed.data } : { ...defaultAppConfigStore };
}

async function ensureMockPreferenceConfigSeedLoaded() {
  if (readMockStorageItem(APP_CONFIG_STORE_KEY)) {
    return;
  }
  if (!appConfigStoreSeedPromise) {
    appConfigStoreSeedPromise = loadMockPreferenceConfigSeed().finally(() => {
      appConfigStoreSeedPromise = null;
    });
  }
  await appConfigStoreSeedPromise;
}

async function loadMockPreferenceConfigSeed() {
  try {
    const seedUrl =
      typeof window === "undefined"
        ? APP_CONFIG_SEED_URL
        : `${window.location.origin}${APP_CONFIG_SEED_URL}`;
    const response = await request.get<unknown>(seedUrl, undefined, {
      timeout: 2_000,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
    if (!response.success) {
      return;
    }
    const parsed =
      typeof response.data === "string"
        ? tryJsonParseObject(response.data)
        : { ok: true, data: response.data };
    if (!parsed.ok || !parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
      console.warn("[WARN_IPC_MOCK_CONFIG] 浏览器 Mock 配置 seed 不是合法 JSON，已忽略");
      return;
    }
    appConfigStore = { ...defaultAppConfigStore, ...parsed.data };
    writeMockStorageItem(APP_CONFIG_STORE_KEY, safeJsonStringify(appConfigStore, "{}"));
  } catch (error) {
    console.warn("[WARN_IPC_MOCK_CONFIG] 读取浏览器 Mock 配置 seed 失败，已使用默认配置:", error);
  }
}

export async function mockCallTauri<T = unknown>(
  command: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  if (import.meta.env.DEV) {
    console.debug(`[MOCK_IPC] ${command}`, redactSensitiveObjectDeep(args));
  }

  const aiProviderResult = handleAiProviderMock(command, args);
  if (aiProviderResult.handled) {
    return aiProviderResult.value as T;
  }

  switch (command) {
    case "get_app_version":
      return "0.0.3-mock" as T;

    case "get_app_paths":
      return {
        appLocalDataDir: "C:\\Users\\MockUser\\.monster-tools",
        dbFilePath: "C:\\Users\\MockUser\\AppData\\Roaming\\monster_workbench.db",
      } as T;

    case "get_preference_config":
      await ensureMockPreferenceConfigSeedLoaded();
      return safeJsonStringify(appConfigStore, "{}") as T;

    case "save_preference_config":
      try {
        const parsed = tryJsonParseObject(String(args.content || args.configJson || "{}"));
        if (!parsed.ok || !parsed.data) {
          throw parsed.error ?? new Error("Invalid config JSON");
        }
        appConfigStore = { ...appConfigStore, ...parsed.data };
        writeMockStorageItem(APP_CONFIG_STORE_KEY, safeJsonStringify(appConfigStore, "{}"));
      } catch (e) {
        console.error("[ERR_IPC_MOCK_CONFIG] Mock 偏好配置保存失败:", e);
      }
      return null as T;

    case "verify_admin_password":
      return true as T;

    case "init_navigation_db":
      return null as T;

    case "get_navigation_list": {
      const keyword = args.keyword as string | undefined;
      const category = args.category as string | undefined;
      const isFeatured = args.isFeatured as number | undefined;
      const isHot = args.isHot as number | undefined;
      const page = (args.page as number) || 1;
      const pageSize = (args.pageSize as number) || 20;

      let filtered = filterBySearchTextFields(navigationsStore, keyword ?? "", [
        (item) => item.title,
        (item) => item.description,
        (item) => item.url,
      ]);
      filtered = filterByOptionalValues(filtered, [
        { getValue: (item) => item.category, value: category },
        { getValue: (item) => item.is_featured, value: isFeatured },
        { getValue: (item) => item.is_hot, value: isHot },
      ]);

      filtered = sortByMany(filtered, [
        { getValue: (item) => item.sort_order },
        { getValue: (item) => item.clicks, direction: "desc" },
      ]);

      const pageResult = paginateArray(filtered, page, pageSize);

      return {
        items: pageResult.items,
        total: pageResult.total,
        page,
        page_size: pageSize,
      } as T;
    }

    case "get_all_navigation_list":
      return [...navigationsStore] as T;

    case "add_navigation": {
      const newItem = args.item as any;
      const nextId = getNextNumberBy(navigationsStore, (item) => item.id);
      const nextSortOrder = getNextNumberBy(navigationsStore, (item) => item.sort_order || 0);
      navigationsStore.push({
        id: nextId,
        title: newItem.title || "未命名导航",
        url: newItem.url || "",
        description: newItem.description || "",
        category: newItem.category || "研发常用",
        is_featured: newItem.is_featured || 0,
        is_hot: newItem.is_hot || 0,
        clicks: 0,
        created_at: formatCurrentIsoDateTime(" "),
        logo_path: newItem.logo_path || null,
        bg_path: newItem.bg_path || null,
        sort_order: nextSortOrder,
      });
      return null as T;
    }

    case "update_navigation": {
      const updateItem = args.item as any;
      const idx = findIndexByValue(navigationsStore, (item) => item.id, updateItem.id);
      if (idx !== -1) {
        navigationsStore[idx] = {
          ...navigationsStore[idx],
          ...updateItem,
        };
      }
      return null as T;
    }

    case "delete_navigation":
      navigationsStore = removeByValue(navigationsStore, (item) => item.id, args.id as number);
      return null as T;

    case "batch_delete_navigation":
      navigationsStore = removeByValues(navigationsStore, (item) => item.id, args.ids as number[]);
      return null as T;

    case "increment_navigation_clicks": {
      const item = findByValue(navigationsStore, (navigation) => navigation.id, args.id as number);
      if (item) {
        item.clicks += 1;
      }
      return null as T;
    }

    case "get_navigation_categories":
      return uniqueMappedValues(navigationsStore, (item) => item.category) as T;

    case "migrate_navigation_category":
      navigationsStore.forEach((item) => {
        if (item.category === args.fromCat) {
          item.category = String(args.toCat || item.category);
        }
      });
      return null as T;

    case "clear_navigation_file_references":
      navigationsStore.forEach((item) => {
        if (item.logo_path === args.relPath) item.logo_path = null;
        if (item.bg_path === args.relPath) item.bg_path = null;
      });
      return null as T;

    case "check_navigation_file_references":
      return navigationsStore
        .filter((item) => item.logo_path === args.relPath || item.bg_path === args.relPath)
        .map((item) => item.title) as T;

    case "save_navigation_sort_order": {
      const orders = args.orders as any[];
      orders.forEach((order) => {
        const item = findByValue(navigationsStore, (navigation) => navigation.id, order.id);
        if (item) {
          item.sort_order = order.sort_order;
        }
      });
      return null as T;
    }

    case "import_navigation_list": {
      const items = Array.isArray(args.items) ? args.items as any[] : [];
      let imported = 0;
      const existingUrls = new Set(navigationsStore.map((item) => String(item.url).trim().toLowerCase()));
      let nextSortOrder = getNextNumberBy(navigationsStore, (item) => item.sort_order || 0);
      for (const item of items) {
        const url = String(item.url || "").trim();
        if (!url || existingUrls.has(url.toLowerCase())) continue;
        navigationsStore.push({
          id: getNextNumberBy(navigationsStore, (navigation) => navigation.id),
          title: item.title || url,
          url,
          description: item.description || "",
          category: item.category || "研发常用",
          is_featured: item.is_featured || 0,
          is_hot: item.is_hot || 0,
          clicks: 0,
          created_at: item.created_at || formatCurrentIsoDateTime(" "),
          logo_path: item.logo_path || null,
          bg_path: item.bg_path || null,
          sort_order: nextSortOrder,
        });
        nextSortOrder += 1;
        existingUrls.add(url.toLowerCase());
        imported += 1;
      }
      return imported as T;
    }

    case "check_db_status":
      return true as T;

    case "reset_database":
      navigationsStore = [...mockNavigations];
      clearAiProviderMockTasks();
      return null as T;

    case "export_database":
    case "import_database":
      if (typeof args.srcPath === "string" && args.srcPath.startsWith("[")) {
        try {
          const result = tryJsonParse<unknown>(args.srcPath);
          if (result.ok && Array.isArray(result.data)) {
            navigationsStore = result.data as typeof navigationsStore;
          }
        } catch {}
      }
      return null as T;

    case "select_folder":
    case "select_file":
      return null as T;

    case "upload_file":
      return `uploads/mock/${String(args.uuidName || "mock-file")}` as T;

    case "list_uploaded_files":
      return "[]" as T;

    case "delete_uploaded_file":
    case "create_directory_structure":
    case "write_text_file":
      return null as T;

    case "write_file_data":
      writeMockStorageItem("monsterWorkbench.mock.fileData", String(args.content || ""));
      return "Browser Preview Cache" as T;

    case "read_file_data":
      return readMockStorageItem("monsterWorkbench.mock.fileData") as T;

    case "read_directory_tree":
      return "MockRoot/\n├── child_dir/\n│   └── file.txt\n└── test.html" as T;

    case "find_port_process":
      return [] as T;

    case "find_process_by_name":
      return "[]" as T;

    case "kill_process_by_pid":
    case "kill_process_by_name":
    case "control_window":
      return null as T;

    case "is_process_running":
      return false as T;

    case "write_log_entry":
      pushLimitedItem(mockLogs, String(args.line || ""), 200);
      return null as T;

    case "read_log_file":
      return joinLines(mockLogs) as T;

    case "clear_all_logs":
      mockLogs.length = 0;
      return null as T;

    case "export_log_file":
    case "export_system_diagnostics":
      return null as T;

    case "open_system_path":
      alert(ensureBrowserMessage(`打开本地系统路径 [${args.path}]`));
      return null as T;

    case "read_text_file":
      return "" as T;

    case "trigger_update_download":
      return null as T;

    default:
      throw new Error(`[ERR_IPC_BROWSER] 未拦截且不支持的 Mock 接口: ${command}`);
  }
}
