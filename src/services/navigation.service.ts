import { isTauriRuntime } from "./runtime";
import { callTauri, convertFileSrc } from "./tauri";
import { systemService } from "./system.service";
import {
  buildUrlWithQuery,
  filterByOptionalValues,
  firstOf,
  getCurrentIsoString,
  getNextNumberBy,
  findByValue,
  findIndexByValue,
  keySetBy,
  matchesSearchTextFields,
  normalizeStringKey,
  paginateArray,
  removeByValue,
  removeByValues,
  safeJsonStringifyPretty,
  sortByMany,
  tryJsonParse,
  uniqueMappedValues,
} from "../utils";

export interface NavigationItem {
  id?: number;
  title: string;
  url: string;
  description: string;
  category: string;
  is_featured: number; // 0 或 1
  is_hot: number;      // 0 或 1
  clicks: number;
  created_at?: string;
  logo_path?: string;
  bg_path?: string;
  sort_order?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type NavigationBackupSaveResult = "empty" | "desktop" | "browser" | "cancelled";
export type NavigationBackupValidationCode =
  | "empty"
  | "invalid_json"
  | "not_array"
  | "missing_fields";

export class NavigationBackupValidationError extends Error {
  code: NavigationBackupValidationCode;

  constructor(code: NavigationBackupValidationCode) {
    super(code);
    this.name = "NavigationBackupValidationError";
    this.code = code;
  }
}

const NAVIGATION_BACKUP_FILE_NAME = "monster_navigation_backup.json";

// Mock 内存数据（浏览器降级模式下使用）
let mockDb: NavigationItem[] = [
  { id: 1, title: "Baidu", url: "https://www.baidu.com", description: "A popular Chinese search engine to find web resources.", category: "Utility", is_featured: 1, is_hot: 1, clicks: 120 },
  { id: 2, title: "GitHub", url: "https://github.com", description: "The world's largest open-source development and collaboration platform.", category: "Community", is_featured: 1, is_hot: 1, clicks: 350 },
  { id: 3, title: "Vue.js", url: "https://vuejs.org", description: "The Progressive JavaScript Framework for building user interfaces.", category: "Documentation", is_featured: 1, is_hot: 0, clicks: 88 },
  { id: 4, title: "Tailwind CSS", url: "https://tailwindcss.com", description: "A utility-first CSS framework for rapid UI development.", category: "Documentation", is_featured: 0, is_hot: 0, clicks: 45 },
  { id: 5, title: "Tauri", url: "https://tauri.app", description: "Build smaller, faster, and more secure desktop applications with web technologies.", category: "Documentation", is_featured: 1, is_hot: 1, clicks: 200 },
  { id: 6, title: "Dribbble", url: "https://dribbble.com", description: "The world's leading community for creative designers to share work and get inspired.", category: "Design", is_featured: 1, is_hot: 0, clicks: 76 },
  { id: 7, title: "Unsplash", url: "https://unsplash.com", description: "Free high-resolution, copyright-free photography and stock photos.", category: "Design", is_featured: 0, is_hot: 1, clicks: 110 },
  { id: 8, title: "Bilibili", url: "https://www.bilibili.com", description: "A popular video sharing and anime streaming community.", category: "Leisure", is_featured: 0, is_hot: 0, clicks: 95 }
];

function downloadTextFile(fileName: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function readBrowserTextFile(accept: string, readFailedMessage: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (readerEvent: ProgressEvent<FileReader>) => {
        resolve(String(readerEvent.target?.result ?? ""));
      };
      reader.onerror = () => reject(new Error(readFailedMessage));
      reader.readAsText(file);
    };
    input.click();
  });
}

function assertNavigationBackupItem(item: unknown): item is NavigationItem {
  return Boolean(
    item &&
    typeof item === "object" &&
    "title" in item &&
    "url" in item
  );
}

function parseNavigationBackup(rawContent: string): NavigationItem[] {
  if (!rawContent.trim()) {
    throw new NavigationBackupValidationError("empty");
  }

  const parseResult = tryJsonParse<unknown>(rawContent);
  if (!parseResult.ok) {
    throw new NavigationBackupValidationError("invalid_json");
  }
  const parsedData = parseResult.data;

  if (!Array.isArray(parsedData)) {
    throw new NavigationBackupValidationError("not_array");
  }

  if (!parsedData.every(assertNavigationBackupItem)) {
    throw new NavigationBackupValidationError("missing_fields");
  }

  return parsedData;
}

async function saveNavigationBackupFile(
  items: NavigationItem[],
  backupFileLabel: string
): Promise<NavigationBackupSaveResult> {
  if (items.length === 0) return "empty";

  const jsonStr = safeJsonStringifyPretty(items, "[]");
  if (isTauriRuntime()) {
    const filePath = await systemService.saveFileDialog({
      filters: [{ name: backupFileLabel, extensions: ["json"] }],
      defaultPath: NAVIGATION_BACKUP_FILE_NAME,
    });
    if (!filePath) return "cancelled";

    await systemService.writeTextFile(filePath, jsonStr);
    return "desktop";
  }

  downloadTextFile(NAVIGATION_BACKUP_FILE_NAME, jsonStr, "application/json");
  return "browser";
}

async function readNavigationBackupFile(
  backupFileLabel: string,
  readFailedMessage: string
): Promise<NavigationItem[] | null> {
  let jsonContent = "";

  if (isTauriRuntime()) {
    const selected = await systemService.openFileDialog({
      multiple: false,
      filters: [{ name: backupFileLabel, extensions: ["json"] }],
    });
    if (!selected) return null;

    const filePath = firstOf(selected);
    jsonContent = await systemService.readTextFile(filePath);
  } else {
    jsonContent = await readBrowserTextFile(".json", readFailedMessage);
  }

  return parseNavigationBackup(jsonContent);
}

function buildNavigationImageUrl(appDataPath: string, relPath: string): string {
  if (!relPath) return "";
  if (!isTauriRuntime()) {
    return buildUrlWithQuery("https://api.dicebear.com/7.x/identicon/svg", { params: { seed: relPath } });
  }
  return convertFileSrc(`${appDataPath}/${relPath}`);
}

async function openNavigationUrl(url: string): Promise<void> {
  if (isTauriRuntime()) {
    await systemService.openPath(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export const navigationService = {
  /**
   * 初始化数据库连接（底座层代理）
   */
  async getDb(appDataPath: string): Promise<void> {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      await callTauri<void>("init_navigation_db", { dbPath: appDataPath });
    } catch (err) {
      console.error("[ERR_SQLITE_INIT] SQLite 数据库初始化失败:", err);
      throw err;
    }
  },

  /**
   * 分页条件查询
   */
  async getNavigationList(
    appDataPath: string,
    params: {
      page: number;
      pageSize: number;
      keyword?: string;
      category?: string;
      isFeatured?: number;
      isHot?: number;
    }
  ): Promise<PagedResult<NavigationItem>> {
    const { page, pageSize, keyword, category, isFeatured, isHot } = params;
    if (!isTauriRuntime()) {
      // 浏览器降级 Mock 过滤与分页
      let filtered = [...mockDb];
      if (keyword) {
        filtered = filtered.filter((item) => matchesSearchTextFields(item, keyword, [
          (navigation) => navigation.title,
          (navigation) => navigation.description,
          (navigation) => navigation.url,
        ]));
      }
      filtered = filterByOptionalValues(filtered, [
        { getValue: (item) => item.category, value: category },
        { getValue: (item) => item.is_featured, value: isFeatured, isActive: (value) => value !== undefined },
        { getValue: (item) => item.is_hot, value: isHot, isActive: (value) => value !== undefined },
      ]);

      // 默认排序：优先按 sort_order 升序，而后点击量降序
      filtered = sortByMany(filtered, [
        { getValue: (item) => item.sort_order ?? 0 },
        { getValue: (item) => item.clicks, direction: "desc" },
      ]);

      const pageResult = paginateArray(filtered, page, pageSize);
      return {
        items: pageResult.items,
        total: pageResult.total,
        page,
        pageSize
      };
    }

    // 调用底座 Command
    return callTauri<PagedResult<NavigationItem>>("get_navigation_list", {
      dbPath: appDataPath,
      keyword: keyword || null,
      category: category || null,
      isFeatured: isFeatured !== undefined ? isFeatured : null,
      isHot: isHot !== undefined ? isHot : null,
      page,
      pageSize
    });
  },

  /**
   * 新增导航
   */
  async addNavigation(appDataPath: string, item: Omit<NavigationItem, "id" | "clicks">): Promise<void> {
    if (!isTauriRuntime()) {
      const nextId = getNextNumberBy(mockDb, (navigation) => navigation.id);
      const newItem: NavigationItem = {
        ...item,
        id: nextId,
        clicks: 0,
        created_at: getCurrentIsoString()
      };
      mockDb.push(newItem);
      return;
    }

    await callTauri<void>("add_navigation", {
      dbPath: appDataPath,
      item: {
        ...item,
        clicks: 0,
        id: null,
        created_at: null,
        sort_order: null
      }
    });
  },

  /**
   * 修改导航
   */
  async updateNavigation(appDataPath: string, item: NavigationItem): Promise<void> {
    if (!isTauriRuntime()) {
      const index = findIndexByValue(mockDb, (navigation) => navigation.id, item.id);
      if (index !== -1) {
        mockDb[index] = { ...mockDb[index], ...item };
      }
      return;
    }

    await callTauri<void>("update_navigation", {
      dbPath: appDataPath,
      item
    });
  },

  /**
   * 删除单条导航
   */
  async deleteNavigation(appDataPath: string, id: number): Promise<void> {
    if (!isTauriRuntime()) {
      mockDb = removeByValue(mockDb, (item) => item.id, id);
      return;
    }

    await callTauri<void>("delete_navigation", {
      dbPath: appDataPath,
      id
    });
  },

  /**
   * 批量删除导航
   */
  async batchDeleteNavigation(appDataPath: string, ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    if (!isTauriRuntime()) {
      mockDb = removeByValues(mockDb, (item) => item.id || 0, ids);
      return;
    }

    await callTauri<void>("batch_delete_navigation", {
      dbPath: appDataPath,
      ids
    });
  },

  /**
   * 增加点击量计数
   */
  async incrementClicks(appDataPath: string, id: number): Promise<void> {
    if (!isTauriRuntime()) {
      const item = findByValue(mockDb, (navigation) => navigation.id, id);
      if (item) {
        item.clicks += 1;
      }
      return;
    }

    await callTauri<void>("increment_navigation_clicks", {
      dbPath: appDataPath,
      id
    });
  },

  /**
   * 获取所有已录入的分类
   */
  async getCategories(appDataPath: string): Promise<string[]> {
    if (!isTauriRuntime()) {
      return uniqueMappedValues(mockDb, (item) => item.category);
    }

    return callTauri<string[]>("get_navigation_categories", {
      dbPath: appDataPath
    });
  },

  /**
   * 迁移/合并分类 (删除分类的核心逻辑)
   */
  async migrateCategory(appDataPath: string, fromCat: string, toCat: string): Promise<void> {
    if (!isTauriRuntime()) {
      mockDb.forEach(item => {
        if (item.category === fromCat) {
          item.category = toCat;
        }
      });
      return;
    }

    await callTauri<void>("migrate_navigation_category", {
      dbPath: appDataPath,
      fromCat,
      toCat
    });
  },

  /**
   * 清除引用了指定相对路径的 logo_path / bg_path
   */
  async clearFileReferences(appDataPath: string, relPath: string): Promise<void> {
    if (!isTauriRuntime()) {
      // 浏览器环境清除 Mock 数据中的引用
      mockDb.forEach(item => {
        if (item.logo_path === relPath) item.logo_path = undefined;
        if (item.bg_path === relPath) item.bg_path = undefined;
      });
      return;
    }

    await callTauri<void>("clear_navigation_file_references", {
      dbPath: appDataPath,
      relPath
    });
  },

  /**
   * 批量保存排序权重
   */
  async saveSortOrder(appDataPath: string, orders: { id: number; sort_order: number }[]): Promise<void> {
    if (!isTauriRuntime()) {
      orders.forEach(o => {
        const item = findByValue(mockDb, (navigation) => navigation.id, o.id);
        if (item) {
          item.sort_order = o.sort_order;
        }
      });
      return;
    }

    await callTauri<void>("save_navigation_sort_order", {
      dbPath: appDataPath,
      orders
    });
  },

  /**
   * 获取所有网址列表（不分页，用于备份导出）
   */
  async getAllNavigationList(appDataPath: string): Promise<NavigationItem[]> {
    if (!isTauriRuntime()) {
      return sortByMany(mockDb, [
        { getValue: (item) => item.sort_order ?? 0 },
        { getValue: (item) => item.clicks, direction: "desc" },
      ]);
    }

    return callTauri<NavigationItem[]>("get_all_navigation_list", {
      dbPath: appDataPath
    });
  },

  /**
   * 批量导入网址导航（根据 URL 智能去重）
   * @returns 实际导入的新条数
   */
  async importNavigationList(appDataPath: string, items: NavigationItem[]): Promise<number> {
    if (!isTauriRuntime()) {
      const existing = await this.getAllNavigationList(appDataPath);
      const existingUrls = keySetBy(existing, (item) => normalizeStringKey(item.url));

      let maxSortOrder = getNextNumberBy(existing, (navigation) => navigation.sort_order ?? 0) - 1;

      let importedCount = 0;

      items.forEach(item => {
        const cleanUrl = normalizeStringKey(item.url);
        if (!existingUrls.has(cleanUrl)) {
          maxSortOrder += 1;
          mockDb.push({
            title: item.title,
            url: item.url,
            description: item.description || "",
            category: item.category || "Utility",
            is_featured: item.is_featured ?? 0,
            is_hot: item.is_hot ?? 0,
            clicks: 0,
            logo_path: item.logo_path || undefined,
            bg_path: item.bg_path || undefined,
            sort_order: maxSortOrder,
            created_at: getCurrentIsoString()
          });
          importedCount += 1;
        }
      });
      return importedCount;
    }

    // Tauri 底座模式下导入并返回实际新增条数
    return callTauri<number>("import_navigation_list", {
      dbPath: appDataPath,
      items: items.map(item => ({
        ...item,
        id: item.id || null,
        created_at: item.created_at || null,
        sort_order: item.sort_order || null
      }))
    });
  },

  saveNavigationBackupFile,
  readNavigationBackupFile,
  buildNavigationImageUrl,
  openNavigationUrl,
};
