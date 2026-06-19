import { defineStore } from "pinia";
import {
  navigationService,
  NavigationBackupValidationError,
  type NavigationBackupSaveResult,
  type NavigationItem,
  type NavigationView,
} from "../services/navigation.service";
import { useAppStore } from "./app";
import { normalizePage, uniqueArray } from "../utils";

export { NavigationBackupValidationError };
export type { NavigationBackupSaveResult, NavigationItem, NavigationView };

export const useNavigationStore = defineStore("navigation", {
  state: () => ({
    loading: false,
    items: [] as NavigationItem[],
    total: 0,
    page: 1,
    pageSize: 12,
    keyword: "",
    category: "",
    isFeatured: undefined as number | undefined,
    isHot: undefined as number | undefined,
    view: "all" as NavigationView,
    tag: "",
    // 系统内置的核心分类
    categories: ["Utility", "Community", "Documentation", "Design", "Leisure"] as string[],
  }),

  actions: {
    /**
     * 获取导航分页列表
     */
    async fetchList() {
      const appStore = useAppStore();
      if (!appStore.initialized) {
        await appStore.initialize();
      }
      this.loading = true;
      try {
        // 先刷新并加载动态分类
        await this.fetchCategories();

        const res = await navigationService.getNavigationList(appStore.localPath, {
          page: this.page,
          pageSize: this.pageSize,
          keyword: this.keyword,
          category: this.category || undefined,
          isFeatured: this.isFeatured,
          isHot: this.isHot,
          view: this.view,
          tag: this.tag || undefined,
        });
        this.items = res.items;
        this.total = res.total;
      } catch (err) {
        console.error("[ERR_STORE_NAV_LIST] 获取导航数据出错:", err);
      } finally {
        this.loading = false;
      }
    },

    /**
     * 动态获取去重后的分类列表并刷新
     */
    async fetchCategories() {
      const appStore = useAppStore();
      if (!appStore.initialized) {
        await appStore.initialize();
      }
      try {
        const defaultCats = ["Utility", "Community", "Documentation", "Design", "Leisure"];
        const dbCats = await navigationService.getCategories(appStore.localPath);
        this.categories = uniqueArray([...defaultCats, ...dbCats]);
      } catch (err) {
        console.error("[ERR_STORE_NAV_CATS] 加载动态分类异常:", err);
      }
    },

    /**
     * 新增导航
     */
    async add(item: Omit<NavigationItem, "id" | "clicks">) {
      const appStore = useAppStore();
      if (!appStore.initialized) {
        await appStore.initialize();
      }
      await navigationService.addNavigation(appStore.localPath, item);
      await this.fetchList();
    },

    /**
     * 修改导航
     */
    async update(item: NavigationItem) {
      const appStore = useAppStore();
      if (!appStore.initialized) {
        await appStore.initialize();
      }
      await navigationService.updateNavigation(appStore.localPath, item);
      await this.fetchList();
    },

    /**
     * 一次事务批量更新多条导航；用于整理建议面板的"标常用 / 补描述"
     * 等批量动作。空数组直接返回。
     */
    async updateMany(items: NavigationItem[]) {
      if (items.length === 0) return;
      const appStore = useAppStore();
      if (!appStore.initialized) {
        await appStore.initialize();
      }
      await navigationService.batchUpdateNavigation(appStore.localPath, items);
      await this.fetchList();
    },

    /**
     * 删除单条导航
     */
    async delete(id: number) {
      const appStore = useAppStore();
      if (!appStore.initialized) {
        await appStore.initialize();
      }
      await navigationService.deleteNavigation(appStore.localPath, id);
      // 如果删除后当前页没有数据了且不为第一页，则倒退一页
      if (this.items.length <= 1 && this.page > 1) {
        this.page -= 1;
      }
      await this.fetchList();
    },

    /**
     * 批量删除导航
     */
    async batchDelete(ids: number[]) {
      const appStore = useAppStore();
      if (!appStore.initialized) {
        await appStore.initialize();
      }
      await navigationService.batchDeleteNavigation(appStore.localPath, ids);
      // 检查分页边界
      const deletedCount = ids.length;
      if (this.items.length <= deletedCount && this.page > 1) {
        this.page = normalizePage(this.page - 1, this.page);
      }
      await this.fetchList();
    },

    /**
     * 点击访问卡片，增加点击次数并跳转打开
     */
    async clickItem(item: NavigationItem) {
      const appStore = useAppStore();
      if (!appStore.initialized) {
        await appStore.initialize();
      }
      if (!item.id) return;

      try {
        // 1. 触发点击量增加
        await navigationService.incrementClicks(appStore.localPath, item.id);

        // 2. 调起打开动作
        await navigationService.openNavigationUrl(item.url);
      } catch (err) {
        console.error("[ERR_STORE_NAV_CLICK] 导航跳转异常:", err);
      } finally {
        await this.fetchList();
      }
    },

    /**
     * 删除自定义分类 (将其下导航记录全数迁移归档至“Utility”)
     */
    async deleteCategory(categoryName: string) {
      const appStore = useAppStore();
      if (!appStore.initialized) {
        await appStore.initialize();
      }
      await navigationService.migrateCategory(appStore.localPath, categoryName, "Utility");
      // 若当前页正好选中该分类，清空当前分类筛选为“全部”
      if (this.category === categoryName) {
        this.category = "";
      }
      await this.fetchList();
    },

    /**
     * 批量保存排序权重
     */
    async saveSort(orders: { id: number; sort_order: number }[]) {
      const appStore = useAppStore();
      if (!appStore.initialized) {
        await appStore.initialize();
      }
      await navigationService.saveSortOrder(appStore.localPath, orders);
      await this.fetchList();
    },

    /**
     * 导出全量导航数据 (不分页)
     */
    async exportData(): Promise<NavigationItem[]> {
      const appStore = useAppStore();
      if (!appStore.initialized) {
        await appStore.initialize();
      }
      return navigationService.getAllNavigationList(appStore.localPath);
    },

    async exportBackup(backupFileLabel: string): Promise<NavigationBackupSaveResult> {
      const list = await this.exportData();
      return navigationService.saveNavigationBackupFile(list, backupFileLabel);
    },

    async readBackup(
      backupFileLabel: string,
      readFailedMessage: string
    ): Promise<NavigationItem[] | null> {
      return navigationService.readNavigationBackupFile(backupFileLabel, readFailedMessage);
    },

    /**
     * 批量导入导航数据 (按 URL 智能去重)
     * @returns 实际写入的新条目数量
     */
    async importData(items: NavigationItem[]): Promise<number> {
      const appStore = useAppStore();
      if (!appStore.initialized) {
        await appStore.initialize();
      }
      const count = await navigationService.importNavigationList(appStore.localPath, items);
      await this.fetchList();
      return count;
    },

    async addMany(items: NavigationItem[]): Promise<number> {
      if (items.length === 0) return 0;
      return this.importData(items);
    },

    async previewImport(items: NavigationItem[]) {
      const existing = await this.exportData();
      return navigationService.getImportPreview(existing, items);
    },

    createItemsFromText(rawText: string): NavigationItem[] {
      return navigationService.createItemsFromText(rawText, this.category || "Utility");
    },

    suggestFromUrl(url: string) {
      return navigationService.buildNavigationSuggestion(url);
    },

    parseTagsText(rawText: string): string[] {
      return navigationService.parseTagsText(rawText);
    },

    getImgUrl(relPath: string): string {
      const appStore = useAppStore();
      return navigationService.buildNavigationImageUrl(appStore.localPath, relPath);
    },
  }
});
