pub use crate::infra::db_nav::{NavigationItem, PagedResult, SortOrderItem};
use crate::infra::db_nav::DbNavInfra;
use crate::infra::path::PathProvider;
use crate::infra::AppResult;

pub struct NavigationService {
    path_provider: PathProvider,
}

impl NavigationService {
    pub fn new(path_provider: PathProvider) -> Self {
        Self { path_provider }
    }

    fn navigation_db_dir(&self) -> AppResult<String> {
        Ok(self
            .path_provider
            .get_app_local_data_dir()?
            .to_string_lossy()
            .into_owned())
    }

    pub fn init_navigation_db(&self, _db_dir: &str) -> AppResult<()> {
        let db_dir = self.navigation_db_dir()?;
        DbNavInfra::init_navigation_db(&db_dir)
    }

    pub fn get_navigation_list(
        &self,
        _db_dir: &str,
        keyword: Option<String>,
        category: Option<String>,
        is_featured: Option<i32>,
        is_hot: Option<i32>,
        page: u32,
        page_size: u32,
    ) -> AppResult<PagedResult<NavigationItem>> {
        let db_dir = self.navigation_db_dir()?;
        DbNavInfra::get_navigation_list(
            &db_dir,
            keyword,
            category,
            is_featured,
            is_hot,
            page,
            page_size,
        )
    }

    pub fn add_navigation(&self, _db_dir: &str, item: NavigationItem) -> AppResult<()> {
        let db_dir = self.navigation_db_dir()?;
        DbNavInfra::add_navigation(&db_dir, item)
    }

    pub fn update_navigation(&self, _db_dir: &str, item: NavigationItem) -> AppResult<()> {
        let db_dir = self.navigation_db_dir()?;
        DbNavInfra::update_navigation(&db_dir, item)
    }

    pub fn delete_navigation(&self, _db_dir: &str, id: i32) -> AppResult<()> {
        let db_dir = self.navigation_db_dir()?;
        DbNavInfra::delete_navigation(&db_dir, id)
    }

    pub fn batch_delete_navigation(&self, _db_dir: &str, ids: Vec<i32>) -> AppResult<()> {
        let db_dir = self.navigation_db_dir()?;
        DbNavInfra::batch_delete_navigation(&db_dir, ids)
    }

    pub fn increment_clicks(&self, _db_dir: &str, id: i32) -> AppResult<()> {
        let db_dir = self.navigation_db_dir()?;
        DbNavInfra::increment_clicks(&db_dir, id)
    }

    pub fn get_categories(&self, _db_dir: &str) -> AppResult<Vec<String>> {
        let db_dir = self.navigation_db_dir()?;
        DbNavInfra::get_categories(&db_dir)
    }

    pub fn migrate_category(&self, _db_dir: &str, from_cat: &str, to_cat: &str) -> AppResult<()> {
        let db_dir = self.navigation_db_dir()?;
        DbNavInfra::migrate_category(&db_dir, from_cat, to_cat)
    }

    pub fn clear_file_references(&self, _db_dir: &str, rel_path: &str) -> AppResult<()> {
        let db_dir = self.navigation_db_dir()?;
        DbNavInfra::clear_file_references(&db_dir, rel_path)
    }

    pub fn check_file_references(
        &self,
        _db_dir: &str,
        rel_path: &str,
    ) -> AppResult<Vec<String>> {
        let db_dir = self.navigation_db_dir()?;
        DbNavInfra::check_file_references(&db_dir, rel_path)
    }

    pub fn save_sort_order(&self, _db_dir: &str, orders: Vec<SortOrderItem>) -> AppResult<()> {
        let db_dir = self.navigation_db_dir()?;
        DbNavInfra::save_sort_order(&db_dir, orders)
    }

    pub fn get_all_navigation_list(&self, _db_dir: &str) -> AppResult<Vec<NavigationItem>> {
        let db_dir = self.navigation_db_dir()?;
        DbNavInfra::get_all_navigation_list(&db_dir)
    }

    pub fn import_navigation_list(
        &self,
        _db_dir: &str,
        items: Vec<NavigationItem>,
    ) -> AppResult<u32> {
        let db_dir = self.navigation_db_dir()?;
        DbNavInfra::import_navigation_list(&db_dir, items)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_root(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be valid")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "monster-workbench-navigation-{name}-{}-{nanos}",
            std::process::id()
        ))
    }

    fn nav_item(title: &str, url: &str) -> NavigationItem {
        NavigationItem {
            id: None,
            title: title.to_string(),
            url: url.to_string(),
            description: "test item".to_string(),
            category: "test".to_string(),
            is_featured: 0,
            is_hot: 0,
            clicks: 0,
            created_at: None,
            logo_path: None,
            bg_path: None,
            sort_order: None,
        }
    }

    #[test]
    fn service_ignores_untrusted_db_path_argument() {
        let root = temp_root("ignored-db-path");
        let app_dir = root.join("app-data");
        let requested_dir = root.join("untrusted-input");
        let provider =
            PathProvider::new_for_test(app_dir.clone(), app_dir.join("monster_workbench.db"));
        let service = NavigationService::new(provider);
        let requested = requested_dir.to_string_lossy().into_owned();

        let _ = std::fs::remove_dir_all(&root);
        service
            .init_navigation_db(&requested)
            .expect("navigation db should initialize in app dir");
        service
            .add_navigation(&requested, nav_item("Example", "https://example.test"))
            .expect("navigation item should write in app dir");

        let items = service
            .get_all_navigation_list("")
            .expect("navigation items should read from app dir");

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].url, "https://example.test");
        assert!(app_dir.join("navigation.db").exists());
        assert!(!requested_dir.join("navigation.db").exists());

        let _ = std::fs::remove_dir_all(&root);
    }
}
