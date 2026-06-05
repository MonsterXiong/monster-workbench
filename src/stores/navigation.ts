import { defineStore } from "pinia";
import { navigationService, type NavigationItem } from "../services/navigation.service";
import { systemService } from "../services/system.service";
import { isTauriRuntime } from "../services/runtime";
import { useAppStore } from "./app";

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
    // 系统内置的核心分类
    categories: ["常用工具", "开发社区", "技术文档", "设计资源", "日常休闲"] as string[],
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
        });
        this.items = res.items;
        this.total = res.total;
      } catch (err) {
        console.error("获取导航数据出错:", err);
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
        const defaultCats = ["常用工具", "开发社区", "技术文档", "设计资源", "日常休闲"];
        const dbCats = await navigationService.getCategories(appStore.localPath);
        const merged = [...defaultCats];
        for (const cat of dbCats) {
          if (!merged.includes(cat)) {
            merged.push(cat);
          }
        }
        this.categories = merged;
      } catch (err) {
        console.error("加载动态分类异常:", err);
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
        this.page = Math.max(1, this.page - 1);
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
        if (isTauriRuntime()) {
          await systemService.openPath(item.url);
        } else {
          window.open(item.url, "_blank", "noopener,noreferrer");
        }
      } catch (err) {
        console.error("导航跳转异常:", err);
      } finally {
        await this.fetchList();
      }
    },

    /**
     * 删除自定义分类 (将其下导航记录全数迁移归档至“常用工具”)
     */
    async deleteCategory(categoryName: string) {
      const appStore = useAppStore();
      if (!appStore.initialized) {
        await appStore.initialize();
      }
      await navigationService.migrateCategory(appStore.localPath, categoryName, "常用工具");
      // 若当前页正好选中该分类，清空当前分类筛选为“全部”
      if (this.category === categoryName) {
        this.category = "";
      }
      await this.fetchList();
    }
  }
});
