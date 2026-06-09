use crate::infra::AppResult;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NavigationItem {
    pub id: Option<i32>,
    pub title: String,
    pub url: String,
    pub description: String,
    pub category: String,
    pub is_featured: i32,
    pub is_hot: i32,
    pub clicks: i32,
    pub created_at: Option<String>,
    pub logo_path: Option<String>,
    pub bg_path: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PagedResult<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: u32,
    pub page_size: u32,
}

pub struct DbNavInfra;

impl DbNavInfra {
    /// 连接并初始化 navigation.db
    fn connect_nav_db(db_dir: &str) -> AppResult<Connection> {
        let path = Path::new(db_dir).join("navigation.db");
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(&path)?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA busy_timeout = 5000;",
        )?;

        // 初始化建表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS navigation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                description TEXT,
                category TEXT,
                is_featured INTEGER DEFAULT 0,
                is_hot INTEGER DEFAULT 0,
                clicks INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            [],
        )?;

        // 自动增加可能缺失的新增列（自愈式数据库迁移）
        let _ = conn.execute("ALTER TABLE navigation ADD COLUMN logo_path TEXT;", []);
        let _ = conn.execute("ALTER TABLE navigation ADD COLUMN bg_path TEXT;", []);
        let _ = conn.execute(
            "ALTER TABLE navigation ADD COLUMN sort_order INTEGER DEFAULT 0;",
            [],
        );

        Ok(conn)
    }

    /// 初始化 test_logs 所在数据库并建表
    pub fn init_test_logs_db(db_path: &Path) -> AppResult<()> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(db_path)?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA busy_timeout = 5000;",
        )?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS test_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                detail TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );",
            [],
        )?;
        Ok(())
    }

    pub fn init_navigation_db(db_dir: &str) -> AppResult<()> {
        let _conn = Self::connect_nav_db(db_dir)?;
        Ok(())
    }

    pub fn get_navigation_list(
        db_dir: &str,
        keyword: Option<String>,
        category: Option<String>,
        is_featured: Option<i32>,
        is_hot: Option<i32>,
        page: u32,
        page_size: u32,
    ) -> AppResult<PagedResult<NavigationItem>> {
        let conn = Self::connect_nav_db(db_dir)?;
        let offset = (page.saturating_sub(1)) * page_size;

        let mut query_sql = "SELECT id, title, url, description, category, is_featured, is_hot, clicks, datetime(created_at), logo_path, bg_path, sort_order FROM navigation WHERE 1=1".to_string();
        let mut count_sql = "SELECT COUNT(*) FROM navigation WHERE 1=1".to_string();

        let mut filter_sql = String::new();
        let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(ref kw) = keyword {
            if !kw.trim().is_empty() {
                filter_sql.push_str(" AND (title LIKE ? OR description LIKE ? OR url LIKE ?)");
                let val = format!("%{}%", kw);
                params_vec.push(rusqlite::types::Value::Text(val.clone()));
                params_vec.push(rusqlite::types::Value::Text(val.clone()));
                params_vec.push(rusqlite::types::Value::Text(val));
            }
        }

        if let Some(ref cat) = category {
            if !cat.trim().is_empty() {
                filter_sql.push_str(" AND category = ?");
                params_vec.push(rusqlite::types::Value::Text(cat.clone()));
            }
        }

        if let Some(feat) = is_featured {
            filter_sql.push_str(" AND is_featured = ?");
            params_vec.push(rusqlite::types::Value::Integer(feat as i64));
        }

        if let Some(hot) = is_hot {
            filter_sql.push_str(" AND is_hot = ?");
            params_vec.push(rusqlite::types::Value::Integer(hot as i64));
        }

        query_sql.push_str(&filter_sql);
        count_sql.push_str(&filter_sql);

        // 先查总数
        let total: i64 = conn.query_row(
            &count_sql,
            rusqlite::params_from_iter(params_vec.iter()),
            |row| row.get(0),
        )?;

        // 拼接排序和分页
        query_sql.push_str(" ORDER BY sort_order ASC, clicks DESC, id DESC LIMIT ? OFFSET ?");
        params_vec.push(rusqlite::types::Value::Integer(page_size as i64));
        params_vec.push(rusqlite::types::Value::Integer(offset as i64));

        let mut stmt = conn.prepare(&query_sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
            Ok(NavigationItem {
                id: row.get(0)?,
                title: row.get(1)?,
                url: row.get(2)?,
                description: row.get(3).unwrap_or_default(),
                category: row.get(4).unwrap_or_default(),
                is_featured: row.get(5).unwrap_or(0),
                is_hot: row.get(6).unwrap_or(0),
                clicks: row.get(7).unwrap_or(0),
                created_at: row.get(8).ok(),
                logo_path: row.get(9).ok(),
                bg_path: row.get(10).ok(),
                sort_order: row.get(11).ok(),
            })
        })?;

        let mut items = Vec::new();
        for r in rows {
            items.push(r?);
        }

        Ok(PagedResult {
            items,
            total,
            page,
            page_size,
        })
    }

    pub fn add_navigation(db_dir: &str, item: NavigationItem) -> AppResult<()> {
        let conn = Self::connect_nav_db(db_dir)?;

        // 查询当前最大的 sort_order，加 1
        let max_order: Option<i32> = conn
            .query_row("SELECT MAX(sort_order) FROM navigation", [], |row| {
                row.get(0)
            })
            .unwrap_or(Some(0));
        let next_order = max_order.unwrap_or(0) + 1;

        conn.execute(
            "INSERT INTO navigation (title, url, description, category, is_featured, is_hot, clicks, logo_path, bg_path, sort_order) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)",
            params![
                item.title,
                item.url,
                item.description,
                item.category,
                item.is_featured,
                item.is_hot,
                item.logo_path,
                item.bg_path,
                next_order
            ],
        )?;
        Ok(())
    }

    pub fn update_navigation(db_dir: &str, item: NavigationItem) -> AppResult<()> {
        let conn = Self::connect_nav_db(db_dir)?;
        conn.execute(
            "UPDATE navigation SET title = ?, url = ?, description = ?, category = ?, is_featured = ?, is_hot = ?, logo_path = ?, bg_path = ? WHERE id = ?",
            params![
                item.title,
                item.url,
                item.description,
                item.category,
                item.is_featured,
                item.is_hot,
                item.logo_path,
                item.bg_path,
                item.id
            ],
        )?;
        Ok(())
    }

    pub fn delete_navigation(db_dir: &str, id: i32) -> AppResult<()> {
        let conn = Self::connect_nav_db(db_dir)?;
        conn.execute("DELETE FROM navigation WHERE id = ?", params![id])?;
        Ok(())
    }

    pub fn batch_delete_navigation(db_dir: &str, ids: Vec<i32>) -> AppResult<()> {
        if ids.is_empty() {
            return Ok(());
        }
        let conn = Self::connect_nav_db(db_dir)?;
        let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let sql = format!("DELETE FROM navigation WHERE id IN ({})", placeholders);
        let mut stmt = conn.prepare(&sql)?;
        let params_vec: Vec<rusqlite::types::Value> = ids
            .into_iter()
            .map(|id| rusqlite::types::Value::Integer(id as i64))
            .collect();
        stmt.execute(rusqlite::params_from_iter(params_vec.iter()))?;
        Ok(())
    }

    pub fn increment_clicks(db_dir: &str, id: i32) -> AppResult<()> {
        let conn = Self::connect_nav_db(db_dir)?;
        conn.execute(
            "UPDATE navigation SET clicks = clicks + 1 WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn get_categories(db_dir: &str) -> AppResult<Vec<String>> {
        let conn = Self::connect_nav_db(db_dir)?;
        let mut stmt = conn.prepare("SELECT DISTINCT category FROM navigation WHERE category IS NOT NULL AND category != ''")?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        let mut cats = Vec::new();
        for r in rows {
            cats.push(r?);
        }
        Ok(cats)
    }

    pub fn migrate_category(db_dir: &str, from_cat: &str, to_cat: &str) -> AppResult<()> {
        let conn = Self::connect_nav_db(db_dir)?;
        conn.execute(
            "UPDATE navigation SET category = ? WHERE category = ?",
            params![to_cat, from_cat],
        )?;
        Ok(())
    }

    pub fn clear_file_references(db_dir: &str, rel_path: &str) -> AppResult<()> {
        let conn = Self::connect_nav_db(db_dir)?;
        conn.execute(
            "UPDATE navigation SET logo_path = NULL WHERE logo_path = ?",
            params![rel_path],
        )?;
        conn.execute(
            "UPDATE navigation SET bg_path = NULL WHERE bg_path = ?",
            params![rel_path],
        )?;
        Ok(())
    }

    pub fn check_file_references(db_dir: &str, rel_path: &str) -> AppResult<Vec<String>> {
        let conn = Self::connect_nav_db(db_dir)?;
        let mut stmt = conn.prepare(
            "SELECT title, logo_path, bg_path FROM navigation WHERE logo_path = ? OR bg_path = ?",
        )?;
        let rows = stmt.query_map(params![rel_path, rel_path], |row| {
            let title: String = row.get(0)?;
            let logo_path: Option<String> = row.get(1)?;
            let bg_path: Option<String> = row.get(2)?;
            Ok((title, logo_path, bg_path))
        })?;

        let mut usage = Vec::new();
        for r in rows {
            let (title, logo, bg) = r?;
            let mut types = Vec::new();
            if logo.as_deref() == Some(rel_path) {
                types.push("Logo");
            }
            if bg.as_deref() == Some(rel_path) {
                types.push("封面背景");
            }
            usage.push(format!("\"{}\" ({})", title, types.join("/")));
        }
        Ok(usage)
    }

    pub fn save_sort_order(db_dir: &str, orders: Vec<SortOrderItem>) -> AppResult<()> {
        let mut conn = Self::connect_nav_db(db_dir)?;
        let tx = conn.transaction()?;
        {
            let mut stmt = tx.prepare("UPDATE navigation SET sort_order = ? WHERE id = ?")?;
            for o in orders {
                stmt.execute(params![o.sort_order, o.id])?;
            }
        }
        tx.commit()?;
        Ok(())
    }

    pub fn get_all_navigation_list(db_dir: &str) -> AppResult<Vec<NavigationItem>> {
        let conn = Self::connect_nav_db(db_dir)?;
        let mut stmt = conn.prepare("SELECT id, title, url, description, category, is_featured, is_hot, clicks, datetime(created_at), logo_path, bg_path, sort_order FROM navigation ORDER BY sort_order ASC, clicks DESC, id DESC")?;
        let rows = stmt.query_map([], |row| {
            Ok(NavigationItem {
                id: row.get(0)?,
                title: row.get(1)?,
                url: row.get(2)?,
                description: row.get(3).unwrap_or_default(),
                category: row.get(4).unwrap_or_default(),
                is_featured: row.get(5).unwrap_or(0),
                is_hot: row.get(6).unwrap_or(0),
                clicks: row.get(7).unwrap_or(0),
                created_at: row.get(8).ok(),
                logo_path: row.get(9).ok(),
                bg_path: row.get(10).ok(),
                sort_order: row.get(11).ok(),
            })
        })?;
        let mut items = Vec::new();
        for r in rows {
            items.push(r?);
        }
        Ok(items)
    }

    pub fn import_navigation_list(db_dir: &str, items: Vec<NavigationItem>) -> AppResult<u32> {
        let mut conn = Self::connect_nav_db(db_dir)?;

        // 获取现有的 URL 集合以实现去重
        let existing = Self::get_all_navigation_list(db_dir)?;
        let existing_urls: std::collections::HashSet<String> = existing
            .into_iter()
            .map(|e| e.url.to_lowercase().trim().to_string())
            .collect();

        // 查找最大的 sort_order
        let max_order: Option<i32> = conn
            .query_row("SELECT MAX(sort_order) FROM navigation", [], |row| {
                row.get(0)
            })
            .unwrap_or(Some(0));
        let mut current_max_order = max_order.unwrap_or(0);

        let tx = conn.transaction()?;
        let mut imported_count = 0;
        {
            let mut stmt = tx.prepare(
                "INSERT INTO navigation (title, url, description, category, is_featured, is_hot, clicks, logo_path, bg_path, sort_order) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)"
            )?;
            for item in items {
                let clean_url = item.url.to_lowercase().trim().to_string();
                if !existing_urls.contains(&clean_url) {
                    current_max_order += 1;
                    stmt.execute(params![
                        item.title,
                        item.url,
                        item.description,
                        item.category,
                        item.is_featured,
                        item.is_hot,
                        item.logo_path,
                        item.bg_path,
                        current_max_order
                    ])?;
                    imported_count += 1;
                }
            }
        }
        tx.commit()?;
        Ok(imported_count)
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SortOrderItem {
    pub id: i32,
    pub sort_order: i32,
}
