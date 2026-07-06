import { ensureBrowserMessage, isTauriRuntime } from "./runtime";
import { callTauri, convertFileSrc } from "./tauri";
import { canUseDevBridgeRuntime, resolveDevBridgeAssetSrc } from "./tauri.dev-bridge";
import { systemService } from "./system.service";
import {
  buildUrlWithQuery,
  downloadTextFile,
  firstOf,
  isBlank,
  joinPathIfPresent,
  keySetBy,
  normalizeStringKey,
  openExternalUrl,
  readBrowserTextFile,
  safeJsonStringifyPretty,
  toTrimmedString,
  tryJsonParse,
  uniqueMappedValues,
} from "../utils";

export interface NavigationItem {
  id?: number;
  title: string;
  url: string;
  description: string;
  category: string;
  is_featured: number;
  is_hot: number;
  clicks: number;
  created_at?: string;
  logo_path?: string;
  bg_path?: string;
  sort_order?: number;
  last_visited_at?: string;
  tags?: string[];
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type NavigationBackupSaveResult = "empty" | "desktop" | "browser" | "cancelled";
export type NavigationView = "all" | "recent" | "frequent" | "featured" | "common";
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

function canUseNavigationDataRuntime() {
  return isTauriRuntime() || canUseDevBridgeRuntime();
}

function assertNavigationDataRuntime() {
  if (!canUseNavigationDataRuntime()) {
    throw new Error("[ERR_NAV_BROWSER_UNSUPPORTED] " + ensureBrowserMessage("导航菜单真实数据"));
  }
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
  if (isBlank(rawContent)) {
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

  return parsedData.map(normalizeNavigationItem);
}

function normalizeNavigationItem(item: NavigationItem): NavigationItem {
  return {
    ...item,
    title: String(item.title || ""),
    url: String(item.url || ""),
    description: item.description || "",
    category: item.category || "Utility",
    is_featured: item.is_featured ?? 0,
    is_hot: item.is_hot ?? 0,
    clicks: item.clicks ?? 0,
    tags: normalizeNavigationTags(item.tags),
    last_visited_at: item.last_visited_at || undefined,
  };
}

function normalizeNavigationTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return uniqueMappedValues(
    tags
      .map((tag) => toTrimmedString(tag))
      .filter((tag) => tag.length > 0),
    (tag) => tag.toLowerCase()
  );
}

function parseTagsText(raw: string): string[] {
  return normalizeNavigationTags(raw.split(/[,，\s#]+/));
}

function normalizeUrlForCompare(url: string): string {
  return normalizeStringKey(url).replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getDomainTitle(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || url;
  }
}

function buildNavigationSuggestion(url: string): Pick<NavigationItem, "title" | "description" | "category" | "tags"> {
  const ensuredUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
  const domain = getDomainTitle(ensuredUrl);
  const lowered = domain.toLowerCase();
  const tags = parseTagsText(domain.replace(/\./g, " "));
  let category = "Utility";
  if (/(github|gitlab|stackoverflow|npmjs)/.test(lowered)) category = "Community";
  if (/(docs|developer|vue|react|tauri|tailwind|mdn)/.test(lowered)) category = "Documentation";
  if (/(figma|dribbble|behance|unsplash|icon|design)/.test(lowered)) category = "Design";
  return {
    title: domain,
    description: `${domain} personal resource shortcut.`,
    category,
    tags,
  };
}

function createItemsFromText(rawText: string, defaultCategory: string): NavigationItem[] {
  const seen = new Set<string>();
  const items: NavigationItem[] = [];
  rawText
    .split(/\r?\n/)
    .map((line) => toTrimmedString(line))
    .filter(Boolean)
    .forEach((line) => {
      const [urlPart, ...rest] = line.split(/\s+/);
      const url = urlPart.startsWith("http://") || urlPart.startsWith("https://") ? urlPart : `https://${urlPart}`;
      const normalized = normalizeUrlForCompare(url);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      const suggestion = buildNavigationSuggestion(url);
      items.push({
        title: rest.join(" ") || suggestion.title,
        url,
        description: suggestion.description,
        category: defaultCategory || suggestion.category,
        is_featured: 0,
        is_hot: 0,
        clicks: 0,
        tags: suggestion.tags,
      });
    });
  return items;
}

function getImportPreview(existingItems: NavigationItem[], incomingItems: NavigationItem[]) {
  const existingUrls = keySetBy(existingItems, (item) => normalizeUrlForCompare(item.url));
  let validCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;
  const seenIncoming = new Set<string>();

  incomingItems.forEach((item) => {
    const urlKey = normalizeUrlForCompare(item.url || "");
    if (!item.title || !item.url || !urlKey) {
      invalidCount += 1;
      return;
    }
    if (existingUrls.has(urlKey) || seenIncoming.has(urlKey)) {
      duplicateCount += 1;
      return;
    }
    seenIncoming.add(urlKey);
    validCount += 1;
  });

  return {
    total: incomingItems.length,
    validCount,
    duplicateCount,
    invalidCount,
  };
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
    return resolveDevBridgeAssetSrc(joinPathIfPresent(appDataPath, relPath)) ||
      buildUrlWithQuery("https://api.dicebear.com/7.x/identicon/svg", { params: { seed: relPath } });
  }
  return convertFileSrc(joinPathIfPresent(appDataPath, relPath));
}

async function openNavigationUrl(url: string): Promise<void> {
  if (isTauriRuntime()) {
    await systemService.openPath(url);
    return;
  }

  openExternalUrl(url);
}

export const navigationService = {
  async getDb(appDataPath: string): Promise<void> {
    assertNavigationDataRuntime();
    await callTauri<void>("init_navigation_db", { dbPath: appDataPath });
  },

  async getNavigationList(
    appDataPath: string,
    params: {
      page: number;
      pageSize: number;
      keyword?: string;
      category?: string;
      isFeatured?: number;
      isHot?: number;
      view?: NavigationView;
      tag?: string;
    }
  ): Promise<PagedResult<NavigationItem>> {
    assertNavigationDataRuntime();
    const { page, pageSize, keyword, category, isFeatured, isHot, view = "all", tag } = params;
    return callTauri<PagedResult<NavigationItem>>("get_navigation_list", {
      dbPath: appDataPath,
      keyword: keyword || null,
      category: category || null,
      isFeatured: isFeatured !== undefined ? isFeatured : null,
      isHot: isHot !== undefined ? isHot : null,
      view,
      tag: tag || null,
      page,
      pageSize,
    });
  },

  async addNavigation(appDataPath: string, item: Omit<NavigationItem, "id" | "clicks">): Promise<void> {
    assertNavigationDataRuntime();
    await callTauri<void>("add_navigation", {
      dbPath: appDataPath,
      item: {
        ...item,
        clicks: 0,
        id: null,
        created_at: null,
        sort_order: null,
        last_visited_at: item.last_visited_at || null,
        tags: normalizeNavigationTags(item.tags),
      },
    });
  },

  async updateNavigation(appDataPath: string, item: NavigationItem): Promise<void> {
    assertNavigationDataRuntime();
    await callTauri<void>("update_navigation", {
      dbPath: appDataPath,
      item: {
        ...item,
        tags: normalizeNavigationTags(item.tags),
      },
    });
  },

  async batchUpdateNavigation(appDataPath: string, items: NavigationItem[]): Promise<void> {
    assertNavigationDataRuntime();
    if (items.length === 0) return;
    await callTauri<void>("batch_update_navigation", {
      dbPath: appDataPath,
      items: items.map((item) => ({
        ...item,
        tags: normalizeNavigationTags(item.tags),
      })),
    });
  },

  async deleteNavigation(appDataPath: string, id: number): Promise<void> {
    assertNavigationDataRuntime();
    await callTauri<void>("delete_navigation", { dbPath: appDataPath, id });
  },

  async batchDeleteNavigation(appDataPath: string, ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    assertNavigationDataRuntime();
    await callTauri<void>("batch_delete_navigation", { dbPath: appDataPath, ids });
  },

  async incrementClicks(appDataPath: string, id: number): Promise<void> {
    assertNavigationDataRuntime();
    await callTauri<void>("increment_navigation_clicks", { dbPath: appDataPath, id });
  },

  async getCategories(appDataPath: string): Promise<string[]> {
    assertNavigationDataRuntime();
    return callTauri<string[]>("get_navigation_categories", { dbPath: appDataPath });
  },

  async migrateCategory(appDataPath: string, fromCat: string, toCat: string): Promise<void> {
    assertNavigationDataRuntime();
    await callTauri<void>("migrate_navigation_category", { dbPath: appDataPath, fromCat, toCat });
  },

  async clearFileReferences(appDataPath: string, relPath: string): Promise<void> {
    assertNavigationDataRuntime();
    await callTauri<void>("clear_navigation_file_references", { dbPath: appDataPath, relPath });
  },

  async saveSortOrder(appDataPath: string, orders: { id: number; sort_order: number }[]): Promise<void> {
    assertNavigationDataRuntime();
    await callTauri<void>("save_navigation_sort_order", { dbPath: appDataPath, orders });
  },

  async getAllNavigationList(appDataPath: string): Promise<NavigationItem[]> {
    assertNavigationDataRuntime();
    return callTauri<NavigationItem[]>("get_all_navigation_list", { dbPath: appDataPath });
  },

  async importNavigationList(appDataPath: string, items: NavigationItem[]): Promise<number> {
    assertNavigationDataRuntime();
    return callTauri<number>("import_navigation_list", {
      dbPath: appDataPath,
      items: items.map((item) => ({
        ...item,
        id: item.id || null,
        created_at: item.created_at || null,
        sort_order: item.sort_order || null,
        last_visited_at: item.last_visited_at || null,
        tags: normalizeNavigationTags(item.tags),
      })),
    });
  },

  saveNavigationBackupFile,
  readNavigationBackupFile,
  buildNavigationImageUrl,
  openNavigationUrl,
  buildNavigationSuggestion,
  createItemsFromText,
  getImportPreview,
  parseTagsText,
  normalizeNavigationTags,
};
