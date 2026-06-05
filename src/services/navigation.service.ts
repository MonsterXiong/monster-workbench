import Database from "@tauri-apps/plugin-sql";
import { isTauriRuntime } from "./runtime";

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
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

let dbInstance: any = null;

// Mock 内存数据（浏览器降级模式下使用）
let mockDb: NavigationItem[] = [
  { id: 1, title: "百度一下", url: "https://www.baidu.com", description: "国内常用的搜索引擎，快速搜索海量网络资源。", category: "常用工具", is_featured: 1, is_hot: 1, clicks: 120 },
  { id: 2, title: "GitHub", url: "https://github.com", description: "全球最大的开源代码托管与协作开发社区平台。", category: "开发社区", is_featured: 1, is_hot: 1, clicks: 350 },
  { id: 3, title: "Vue.js 官网", url: "https://vuejs.org", description: "用于构建用户界面的渐进式 JavaScript 框架。", category: "技术文档", is_featured: 1, is_hot: 0, clicks: 88 },
  { id: 4, title: "Tailwind CSS", url: "https://tailwindcss.com", description: "现代化实用程序优先（Utility-First）的 CSS 框架。", category: "技术文档", is_featured: 0, is_hot: 0, clicks: 45 },
  { id: 5, title: "Tauri 官网", url: "https://tauri.app", description: "使用 Web 技术构建小巧、快速、安全的桌面应用程序。", category: "技术文档", is_featured: 1, is_hot: 1, clicks: 200 },
  { id: 6, title: "Dribbble", url: "https://dribbble.com", description: "全球领先的创意设计作品分享与寻找灵感平台。", category: "设计资源", is_featured: 1, is_hot: 0, clicks: 76 },
  { id: 7, title: "Unsplash", url: "https://unsplash.com", description: "免费高画质无版权限制摄影图片素材库。", category: "设计资源", is_featured: 0, is_hot: 1, clicks: 110 },
  { id: 8, title: "Bilibili", url: "https://www.bilibili.com", description: "国内知名的年轻一代潮流视频与弹幕互动娱乐社区。", category: "日常休闲", is_featured: 0, is_hot: 0, clicks: 95 }
];

export const navigationService = {
  /**
   * 初始化数据库连接
   */
  async getDb(appDataPath: string) {
    if (!isTauriRuntime()) {
      return null;
    }
    if (dbInstance) {
      return dbInstance;
    }

    try {
      // 路径转换以适应 SQLite 物理路径加载
      const cleanPath = appDataPath.replace(/\\/g, "/");
      const dbPath = `sqlite:${cleanPath}/navigation.db`;
      dbInstance = await Database.load(dbPath);
      
      // 执行初始化建表
      await dbInstance.execute(`
        CREATE TABLE IF NOT EXISTS navigation (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          description TEXT,
          category TEXT,
          is_featured INTEGER DEFAULT 0,
          is_hot INTEGER DEFAULT 0,
          clicks INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 自动增加可能缺失的新增列（自愈式数据库迁移）
      try {
        await dbInstance.execute("ALTER TABLE navigation ADD COLUMN logo_path TEXT;");
      } catch (e) {
        // 忽略异常，说明列已经存在
      }
      try {
        await dbInstance.execute("ALTER TABLE navigation ADD COLUMN bg_path TEXT;");
      } catch (e) {
        // 忽略异常，说明列已经存在
      }

      return dbInstance;
    } catch (err) {
      console.error("SQLite 初始化失败:", err);
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
    const offset = (page - 1) * pageSize;

    if (!isTauriRuntime()) {
      // 浏览器降级 Mock 过滤与分页
      let filtered = [...mockDb];
      if (keyword) {
        const kw = keyword.toLowerCase();
        filtered = filtered.filter(
          item =>
            item.title.toLowerCase().includes(kw) ||
            item.description.toLowerCase().includes(kw) ||
            item.url.toLowerCase().includes(kw)
        );
      }
      if (category) {
        filtered = filtered.filter(item => item.category === category);
      }
      if (isFeatured !== undefined) {
        filtered = filtered.filter(item => item.is_featured === isFeatured);
      }
      if (isHot !== undefined) {
        filtered = filtered.filter(item => item.is_hot === isHot);
      }
      
      // 默认排序：按点击量降序
      filtered.sort((a, b) => b.clicks - a.clicks);

      const items = filtered.slice(offset, offset + pageSize);
      return {
        items,
        total: filtered.length,
        page,
        pageSize
      };
    }

    const db = await this.getDb(appDataPath);
    let querySql = `SELECT * FROM navigation WHERE 1=1`;
    let countSql = `SELECT COUNT(*) as total FROM navigation WHERE 1=1`;
    const bindParams: any[] = [];

    if (keyword) {
      const kw = `%${keyword}%`;
      querySql += ` AND (title LIKE ? OR description LIKE ? OR url LIKE ?)`;
      countSql += ` AND (title LIKE ? OR description LIKE ? OR url LIKE ?)`;
      bindParams.push(kw, kw, kw);
    }

    if (category) {
      querySql += ` AND category = ?`;
      countSql += ` AND category = ?`;
      bindParams.push(category);
    }

    if (isFeatured !== undefined) {
      querySql += ` AND is_featured = ?`;
      countSql += ` AND is_featured = ?`;
      bindParams.push(isFeatured);
    }

    if (isHot !== undefined) {
      querySql += ` AND is_hot = ?`;
      countSql += ` AND is_hot = ?`;
      bindParams.push(isHot);
    }

    // 执行总数查询
    const countRes = (await db.select(countSql, bindParams)) as { total: number }[];
    const total = countRes[0]?.total ?? 0;

    // 默认排版：点击量降序，而后 ID 降序
    querySql += ` ORDER BY clicks DESC, id DESC LIMIT ? OFFSET ?`;
    const items = (await db.select(querySql, [...bindParams, pageSize, offset])) as NavigationItem[];

    return {
      items,
      total,
      page,
      pageSize
    };
  },

  /**
   * 新增导航
   */
  async addNavigation(appDataPath: string, item: Omit<NavigationItem, "id" | "clicks">): Promise<void> {
    if (!isTauriRuntime()) {
      const nextId = mockDb.length > 0 ? Math.max(...mockDb.map(i => i.id || 0)) + 1 : 1;
      const newItem: NavigationItem = {
        ...item,
        id: nextId,
        clicks: 0,
        created_at: new Date().toISOString()
      };
      mockDb.push(newItem);
      return;
    }

    const db = await this.getDb(appDataPath);
    await db.execute(
      `INSERT INTO navigation (title, url, description, category, is_featured, is_hot, clicks, logo_path, bg_path) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [item.title, item.url, item.description, item.category, item.is_featured, item.is_hot, item.logo_path || null, item.bg_path || null]
    );
  },

  /**
   * 修改导航
   */
  async updateNavigation(appDataPath: string, item: NavigationItem): Promise<void> {
    if (!isTauriRuntime()) {
      const index = mockDb.findIndex(i => i.id === item.id);
      if (index !== -1) {
        mockDb[index] = { ...mockDb[index], ...item };
      }
      return;
    }

    const db = await this.getDb(appDataPath);
    await db.execute(
      `UPDATE navigation SET title = ?, url = ?, description = ?, category = ?, is_featured = ?, is_hot = ?, logo_path = ?, bg_path = ? WHERE id = ?`,
      [item.title, item.url, item.description, item.category, item.is_featured, item.is_hot, item.logo_path || null, item.bg_path || null, item.id]
    );
  },

  /**
   * 删除单条导航
   */
  async deleteNavigation(appDataPath: string, id: number): Promise<void> {
    if (!isTauriRuntime()) {
      mockDb = mockDb.filter(i => i.id !== id);
      return;
    }

    const db = await this.getDb(appDataPath);
    await db.execute(`DELETE FROM navigation WHERE id = ?`, [id]);
  },

  /**
   * 批量删除导航
   */
  async batchDeleteNavigation(appDataPath: string, ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    if (!isTauriRuntime()) {
      mockDb = mockDb.filter(i => !ids.includes(i.id || 0));
      return;
    }

    const db = await this.getDb(appDataPath);
    const placeholders = ids.map(() => "?").join(",");
    await db.execute(`DELETE FROM navigation WHERE id IN (${placeholders})`, ids);
  },

  /**
   * 增加点击量计数
   */
  async incrementClicks(appDataPath: string, id: number): Promise<void> {
    if (!isTauriRuntime()) {
      const item = mockDb.find(i => i.id === id);
      if (item) {
        item.clicks += 1;
      }
      return;
    }

    const db = await this.getDb(appDataPath);
    await db.execute(`UPDATE navigation SET clicks = clicks + 1 WHERE id = ?`, [id]);
  },

  /**
   * 获取所有已录入的分类
   */
  async getCategories(appDataPath: string): Promise<string[]> {
    if (!isTauriRuntime()) {
      const cats = mockDb.map(i => i.category);
      return Array.from(new Set(cats));
    }

    const db = await this.getDb(appDataPath);
    const res = (await db.select("SELECT DISTINCT category FROM navigation")) as { category: string }[];
    return res.map(r => r.category).filter(Boolean);
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

    const db = await this.getDb(appDataPath);
    await db.execute(`UPDATE navigation SET category = ? WHERE category = ?`, [toCat, fromCat]);
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

    const db = await this.getDb(appDataPath);
    await db.execute(
      "UPDATE navigation SET logo_path = NULL WHERE logo_path = ?",
      [relPath]
    );
    await db.execute(
      "UPDATE navigation SET bg_path = NULL WHERE bg_path = ?",
      [relPath]
    );
  }
};
