import { ensureBrowserMessage } from "./runtime";
import {
  pushLimitedItem,
  drop,
  filterByOptionalValues,
  filterBySearchTextFields,
  findByValue,
  findIndexByValue,
  formatCurrentIsoDateTime,
  createTimeout,
  getCurrentTimestampMs,
  getNextNumberBy,
  joinLines,
  mapValuesToArray,
  paginateArray,
  redactSensitiveObjectDeep,
  removeByValue,
  removeByValues,
  safeJsonStringify,
  sortByMany,
  take,
  tryJsonParse,
  tryJsonParseObject,
  uniqueMappedValues,
} from "../utils";

// 内存式模拟数据库，支持基础的新增、列表、删除功能，实现高度自治的浏览器离线体验
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
    sort_order: 1
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
    sort_order: 2
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
    sort_order: 3
  }
];

let navigationsStore = [...mockNavigations];
const APP_CONFIG_STORE_KEY = "monsterWorkbench.mock.preferenceConfig";
const defaultAppConfigStore = {
  theme: "light",
  language: "zh-CN",
  logLevel: "info",
  autoUpdate: true
};
let appConfigStore = loadMockPreferenceConfig();

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

const mockLogs = [
  "[2026-06-07 13:00:01] [INFO] [Mock] Monster Workbench 离线预览版引擎挂载成功",
  "[2026-06-07 13:02:15] [WARN] [Mock] 拦截到 tauri_invoke 调用，自动开启开发沙箱安全路由保护",
  "[2026-06-07 13:05:44] [ERROR] [DATABASE] [Mock] SQLite 初始化失败: Open connection refused (OS Error 5). 系统启动虚拟自愈链路",
  "[2026-06-07 13:06:10] [INFO] [Mock] 浏览器模拟持久化事务正常启动，内存缓存上限 50MB"
];

const mockAiQueueStatus = {
  running: null,
  runningItems: [],
  queued: [],
  pendingCount: 0,
  queueLimit: 16,
  runningCount: 0,
  runningLimit: 6,
  availableRunningSlots: 6,
  availableSlots: 16,
  isSaturated: false,
  waitTimeoutMs: 90000
};

const mockAiTasks = new Map<string, any>();
const MOCK_AI_TASK_LIMIT = 40;
const MOCK_IMAGE_DATA_URL =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201024%201024%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20x2%3D%221%22%20y1%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%2310b981%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%232563eb%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width%3D%221024%22%20height%3D%221024%22%20rx%3D%2280%22%20fill%3D%22url(%23g)%22/%3E%3Ccircle%20cx%3D%22512%22%20cy%3D%22440%22%20r%3D%22140%22%20fill%3D%22white%22%20opacity%3D%22.88%22/%3E%3Crect%20x%3D%22272%22%20y%3D%22616%22%20width%3D%22480%22%20height%3D%2272%22%20rx%3D%2236%22%20fill%3D%22white%22%20opacity%3D%22.88%22/%3E%3Ctext%20x%3D%22512%22%20y%3D%22804%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2256%22%20font-weight%3D%22700%22%20fill%3D%22white%22%3EMock%20Image%3C/text%3E%3C/svg%3E";
const MOCK_IMAGE_DATA_URL_ALT =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201024%201024%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%221%22%20x2%3D%220%22%20y1%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23f59e0b%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%238b5cf6%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width%3D%221024%22%20height%3D%221024%22%20rx%3D%2280%22%20fill%3D%22url(%23g)%22/%3E%3Ccircle%20cx%3D%22512%22%20cy%3D%22388%22%20r%3D%22118%22%20fill%3D%22white%22%20opacity%3D%22.9%22/%3E%3Crect%20x%3D%22304%22%20y%3D%22572%22%20width%3D%22416%22%20height%3D%22104%22%20rx%3D%2252%22%20fill%3D%22white%22%20opacity%3D%22.9%22/%3E%3Ctext%20x%3D%22512%22%20y%3D%22804%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2256%22%20font-weight%3D%22700%22%20fill%3D%22white%22%3EMock%202%3C/text%3E%3C/svg%3E";

function trimMockAiTasks() {
  const tasks = sortByMany(mapValuesToArray(mockAiTasks), [
    { getValue: (task) => task.createdAtMs, direction: "desc" },
  ]);
  for (const task of drop(tasks, MOCK_AI_TASK_LIMIT)) {
    mockAiTasks.delete(task.requestId);
  }
}

function createMockAiResultBase(args: Record<string, unknown>, action: string) {
  const config = args.config as any;
  return {
    requestId: `mock-ai-${getCurrentTimestampMs()}`,
    action,
    provider: config?.provider || "custom",
    baseUrl: config?.baseUrl || "https://mock.local/v1",
    latencyMs: 100,
    queueWaitMs: 0,
    totalLatencyMs: 100,
    statusCode: 200,
    savedFiles: null
  };
}

function createMockAiResult(args: Record<string, unknown>, action: string) {
  if (action === "models") {
    return {
      ...createMockAiResultBase(args, "models"),
      ok: true,
      model: (args.config as any)?.model || "mock-model",
      latencyMs: 86,
      totalLatencyMs: 86,
      message: "浏览器 Mock 已返回 3 个模型",
      models: ["gpt-5.5", "gpt-5.4", "mock-image-1"],
      rawPreview: "{\"data\":[{\"id\":\"gpt-5.5\"},{\"id\":\"gpt-5.4\"},{\"id\":\"mock-image-1\"}]}"
    };
  }

  if (action === "image") {
    const prompt = String((args.config as any)?.imagePrompt || "").toLowerCase();
    const requestedImageSize = (args.config as any)?.imageSize || "1024x1024";
    const shouldMockUnsupportedSize = prompt.includes("unsupported size");
    const shouldMockMultiImage = prompt.includes("multi");
    if (shouldMockUnsupportedSize) {
      return {
        ...createMockAiResultBase(args, "image"),
        ok: false,
        model: (args.config as any)?.imageModel || "mock-image-1",
        latencyMs: 260,
        totalLatencyMs: 260,
        message: `浏览器 Mock 生图失败：模型不支持尺寸 ${requestedImageSize}`,
        imageUrls: [],
        imagePaths: [],
        savedFiles: [],
        apiImageSize: requestedImageSize,
        requestedImageSize,
        actualImageSize: null,
        fallbackImageSize: null,
        imageAttempts: 1,
        failureKind: "unsupported_size",
        rawPreview: "{\"error\":{\"message\":\"unsupported image size\"}}"
      };
    }
    return {
      ...createMockAiResultBase(args, "image"),
      ok: true,
      model: (args.config as any)?.imageModel || "mock-image-1",
      latencyMs: 260,
      totalLatencyMs: 260,
      message: "浏览器 Mock 生图测试成功",
      imageUrls: shouldMockMultiImage ? [MOCK_IMAGE_DATA_URL, MOCK_IMAGE_DATA_URL_ALT] : [MOCK_IMAGE_DATA_URL],
      imagePaths: [],
      savedFiles: [],
      apiImageSize: requestedImageSize,
      requestedImageSize,
      actualImageSize: requestedImageSize,
      fallbackImageSize: null,
      imageAttempts: 1,
      failureKind: null,
      rawPreview: "{\"data\":[{\"url\":\"mock://image\"}]}"
    };
  }

  return {
    ...createMockAiResultBase(args, "chat"),
    ok: true,
    model: (args.config as any)?.model || "mock-model",
    latencyMs: 128,
    totalLatencyMs: 128,
    message: "浏览器 Mock 模型连接测试成功",
    text: "连接测试成功。",
    rawPreview: "{\"choices\":[{\"message\":{\"content\":\"连接测试成功。\"}}]}"
  };
}

export async function mockCallTauri<T = unknown>(
  command: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  if (import.meta.env.DEV) {
    console.debug(`[MOCK_IPC] ${command}`, redactSensitiveObjectDeep(args));
  }

  switch (command) {
    case "get_app_version":
      return "0.0.3-mock" as T;

    case "get_app_paths":
      return {
        appLocalDataDir: "C:\\Users\\MockUser\\.monster-tools",
        dbFilePath: "C:\\Users\\MockUser\\AppData\\Roaming\\monster_workbench.db"
      } as T;

    case "get_preference_config":
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

    case "test_ai_provider":
      return createMockAiResult(args, String(args.action || "chat")) as T;

    case "enqueue_ai_provider_test": {
      const action = String(args.action || "chat");
      const now = getCurrentTimestampMs();
      const requestId = `mock-ai-task-${now}`;
      const result = {
        ...createMockAiResult(args, action),
        requestId
      };
      const isImageTask = action === "image";
      const task = {
        requestId,
        action,
        status: isImageTask ? "running" : "success",
        createdAtMs: now,
        startedAtMs: now,
        finishedAtMs: isImageTask ? null : now,
        queueWaitMs: 0,
        totalLatencyMs: isImageTask ? null : result.totalLatencyMs,
        result: isImageTask ? null : result,
        error: null
      };
      mockAiTasks.set(requestId, task);
      if (isImageTask) {
        createTimeout(() => {
          const currentTask = mockAiTasks.get(requestId);
          if (!currentTask || currentTask.status !== "running") {
            return;
          }
          const finishedAt = getCurrentTimestampMs();
          mockAiTasks.set(requestId, {
            ...currentTask,
            status: "success",
            finishedAtMs: finishedAt,
            totalLatencyMs: finishedAt - now,
            result: {
              ...result,
              latencyMs: finishedAt - now,
              totalLatencyMs: finishedAt - now,
            },
          });
          trimMockAiTasks();
        }, 1400);
      }
      trimMockAiTasks();
      return task as T;
    }

    case "get_ai_provider_test_task": {
      const now = getCurrentTimestampMs();
      return (mockAiTasks.get(args.requestId as string) || {
        requestId: args.requestId,
        action: "chat",
        status: "failed",
        createdAtMs: now,
        finishedAtMs: now,
        error: "浏览器 Mock 未找到该 AI 测试任务"
      }) as T;
    }

    case "list_ai_provider_test_tasks":
      return take(sortByMany(mapValuesToArray(mockAiTasks), [
        { getValue: (task) => task.createdAtMs, direction: "desc" },
      ]), MOCK_AI_TASK_LIMIT) as T;

    case "get_ai_provider_queue_status":
      return mockAiQueueStatus as T;

    case "cancel_ai_provider_queued_tests":
      return 0 as T;

    case "cancel_ai_provider_test_task": {
      const task = mockAiTasks.get(args.requestId as string);
      if (!task || (task.status !== "queued" && task.status !== "running")) {
        return false as T;
      }
      task.status = "failed";
      task.finishedAtMs = getCurrentTimestampMs();
      task.error = "浏览器 Mock 已取消 AI 测试任务";
      return true as T;
    }

    // 导航系列
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

      // 排序：sort_order 升序，clicks 降序
      filtered = sortByMany(filtered, [
        { getValue: (item) => item.sort_order },
        { getValue: (item) => item.clicks, direction: "desc" },
      ]);

      const pageResult = paginateArray(filtered, page, pageSize);

      return {
        items: pageResult.items,
        total: pageResult.total,
        page,
        page_size: pageSize
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
        sort_order: nextSortOrder
      });
      return null as T;
    }

    case "update_navigation": {
      const updateItem = args.item as any;
      const idx = findIndexByValue(navigationsStore, (item) => item.id, updateItem.id);
      if (idx !== -1) {
        navigationsStore[idx] = {
          ...navigationsStore[idx],
          title: updateItem.title,
          url: updateItem.url,
          description: updateItem.description,
          category: updateItem.category,
          is_featured: updateItem.is_featured,
          is_hot: updateItem.is_hot,
          logo_path: updateItem.logo_path,
          bg_path: updateItem.bg_path
        };
      }
      return null as T;
    }

    case "delete_navigation": {
      const deleteId = args.id as number;
      navigationsStore = removeByValue(navigationsStore, (item) => item.id, deleteId);
      return null as T;
    }

    case "batch_delete_navigation": {
      const deleteIds = args.ids as number[];
      navigationsStore = removeByValues(navigationsStore, (item) => item.id, deleteIds);
      return null as T;
    }

    case "increment_navigation_clicks": {
      const clickId = args.id as number;
      const item = findByValue(navigationsStore, (navigation) => navigation.id, clickId);
      if (item) {
        item.clicks += 1;
      }
      return null as T;
    }

    case "get_navigation_categories": {
      return uniqueMappedValues(navigationsStore, (item) => item.category) as T;
    }

    case "migrate_navigation_category": {
      const fromCat = args.fromCat as string;
      const toCat = args.toCat as string;
      navigationsStore.forEach(item => {
        if (item.category === fromCat) {
          item.category = toCat;
        }
      });
      return null as T;
    }

    case "save_navigation_sort_order": {
      const orders = args.orders as any[];
      orders.forEach(o => {
        const item = findByValue(navigationsStore, (navigation) => navigation.id, o.id);
        if (item) {
          item.sort_order = o.sort_order;
        }
      });
      return null as T;
    }

    case "check_db_status":
      return true as T;

    case "reset_database":
      navigationsStore = [...mockNavigations];
      return null as T;

    case "export_database":
      return null as T;

    case "import_database":
      // 浏览器端支持文本的简单还原
      if (typeof args.srcPath === "string" && args.srcPath.startsWith("[")) {
        try {
          const result = tryJsonParse<unknown>(args.srcPath);
          if (result.ok && Array.isArray(result.data)) {
            navigationsStore = result.data as typeof navigationsStore;
          }
        } catch {}
      }
      return null as T;

    // 系统能力
    case "find_port_process":
      return [] as T;

    case "is_process_running":
      return false as T;

    // 日志系统
    case "write_log_entry": {
      const line = args.line as string;
      pushLimitedItem(mockLogs, line, 200);
      return null as T;
    }

    case "read_log_file":
      return joinLines(mockLogs) as T;

    case "clear_all_logs":
      mockLogs.length = 0;
      return null as T;

    case "export_log_file":
      return null as T;

    case "export_system_diagnostics":
      // 模拟诊断导出逻辑，不执行真实 IO
      return null as T;

    case "open_system_path":
      alert(ensureBrowserMessage(`打开本地系统路径 [${args.path}]`));
      return null as T;

    default:
      throw new Error(`[ERR_IPC_BROWSER] 未拦截且不支持的 Mock 接口: ${command}`);
  }
}
