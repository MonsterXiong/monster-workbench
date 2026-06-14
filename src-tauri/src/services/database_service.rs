use crate::infra::db::DbInfra;
use crate::infra::path::PathProvider;
use crate::infra::AppResult;
use tauri::AppHandle;

pub struct DatabaseService {
    db_infra: DbInfra,
    path_provider: PathProvider,
}

impl DatabaseService {
    pub fn new(app_handle: AppHandle, path_provider: PathProvider) -> Self {
        let db_infra = DbInfra::new(app_handle, path_provider.clone());
        Self {
            db_infra,
            path_provider,
        }
    }

    pub fn export_database(&self, target_path: &str) -> AppResult<()> {
        self.db_infra.export_db(target_path)
    }

    pub fn import_database(&self, src_path: &str) -> AppResult<()> {
        self.db_infra.import_db(src_path)
    }

    pub fn reset_database(&self) -> AppResult<()> {
        self.db_infra.reset_db()
    }

    pub fn check_status(&self) -> AppResult<()> {
        self.init_runtime_schema()
    }

    fn init_test_logs_db(&self) -> AppResult<()> {
        let db_path = self.path_provider.get_db_file_path()?;
        crate::infra::db_nav::DbNavInfra::init_test_logs_db(&db_path)
    }

    pub fn init_runtime_schema(&self) -> AppResult<()> {
        self.init_test_logs_db()?;
        let db_path = self.path_provider.get_db_file_path()?;
        crate::infra::ai_generation_schema::init_ai_generation_schema(&db_path)?;
        Ok(())
    }
}
