use std::path::PathBuf;
use crate::infra::{AppError, AppResult};
use tauri::{AppHandle, Manager};

#[derive(Clone)]
pub struct PathProvider {
    #[cfg(not(test))]
    app_handle: AppHandle,
    #[cfg(test)]
    app_handle: Option<AppHandle>,
    #[cfg(test)]
    app_local_data_dir: Option<PathBuf>,
    #[cfg(test)]
    db_file_path: Option<PathBuf>,
}

impl PathProvider {
    pub fn new(app_handle: AppHandle) -> Self {
        #[cfg(not(test))]
        {
            Self { app_handle }
        }

        #[cfg(test)]
        {
            Self {
                app_handle: Some(app_handle),
                app_local_data_dir: None,
                db_file_path: None,
            }
        }
    }

    #[cfg(test)]
    pub fn new_for_test(app_local_data_dir: PathBuf, db_file_path: PathBuf) -> Self {
        Self {
            app_handle: None,
            app_local_data_dir: Some(app_local_data_dir),
            db_file_path: Some(db_file_path),
        }
    }

    /// 获取本地 ~/.monster-tools 应用专属数据根目录
    pub fn get_app_local_data_dir(&self) -> AppResult<PathBuf> {
        #[cfg(test)]
        if let Some(path) = &self.app_local_data_dir {
            return Ok(path.clone());
        }

        #[cfg(not(test))]
        let app_handle = &self.app_handle;

        #[cfg(test)]
        let app_handle = self
            .app_handle
            .as_ref()
            .ok_or_else(|| AppError::Io("missing AppHandle in test PathProvider".to_string()))?;

        app_handle
            .path()
            .home_dir()
            .map(|p| p.join(".monster-tools"))
            .map_err(|e| AppError::Io(format!("定位 Home 路径异常: {}", e)))
    }

    /// 获取数据库的实际物理路径定位
    pub fn get_db_file_path(&self) -> AppResult<PathBuf> {
        #[cfg(test)]
        if let Some(path) = &self.db_file_path {
            return Ok(path.clone());
        }

        #[cfg(not(test))]
        let app_handle = &self.app_handle;

        #[cfg(test)]
        let app_handle = self
            .app_handle
            .as_ref()
            .ok_or_else(|| AppError::Io("missing AppHandle in test PathProvider".to_string()))?;

        if let Ok(roaming_dir) = app_handle.path().app_data_dir() {
            let roaming_db = roaming_dir.join("monster_workbench.db");
            if roaming_db.exists() {
                return Ok(roaming_db);
            }
        }

        if let Ok(local_dir) = app_handle.path().app_local_data_dir() {
            let local_db = local_dir.join("monster_workbench.db");
            if local_db.exists() {
                return Ok(local_db);
            }
        }

        let db_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Io(format!("定位 AppData 路径异常: {}", e)))?;

        Ok(db_dir.join("monster_workbench.db"))
    }
}
