use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};
use std::fs;
use std::io::Read;
use std::path::Path;
use tauri::AppHandle;

pub struct DbInfra {
    path_provider: PathProvider,
    app_handle: AppHandle,
}

const MAX_DB_IMPORT_BYTES: u64 = 128 * 1024 * 1024;
const SQLITE_HEADER: &[u8; 16] = b"SQLite format 3\0";

impl DbInfra {
    pub fn new(app_handle: AppHandle, path_provider: PathProvider) -> Self {
        Self {
            app_handle,
            path_provider,
        }
    }

    /// 备份导出数据库物理文件到指定位置
    pub fn export_db(&self, target_path: &str) -> AppResult<()> {
        let src_db = self.path_provider.get_db_file_path()?;
        if !src_db.exists() {
            return Err(AppError::Database(
                "本地 SQLite 数据库文件尚未创建".to_string(),
            ));
        }

        let dest = Path::new(target_path);
        if dest
            .components()
            .any(|c| matches!(c, std::path::Component::ParentDir))
        {
            return Err(AppError::Database(
                "非法的备份目标路径包含 '..'".to_string(),
            ));
        }
        if dest.extension().map(|e| e.to_string_lossy().to_lowercase()) != Some("db".into()) {
            return Err(AppError::Database(
                "备份目标文件必须以 '.db' 为后缀".to_string(),
            ));
        }

        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent)?;
        }

        fs::copy(&src_db, dest)?;
        Ok(())
    }

    /// 从备份覆盖数据库物理文件，自动安全重启以释放连接
    pub fn import_db(&self, src_path: &str) -> AppResult<()> {
        let backup = Path::new(src_path);
        if backup
            .components()
            .any(|c| matches!(c, std::path::Component::ParentDir))
        {
            return Err(AppError::Database("非法的备份源路径包含 '..'".to_string()));
        }
        if backup
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            != Some("db".into())
        {
            return Err(AppError::Database(
                "备份源文件必须以 '.db' 为后缀".to_string(),
            ));
        }

        if !backup.exists() {
            return Err(AppError::Database("选择的备份数据库文件不存在".to_string()));
        }

        if !backup.is_file() {
            return Err(AppError::Database(
                "选择的数据库备份路径不是文件".to_string(),
            ));
        }
        let metadata = fs::metadata(backup)?;
        if metadata.len() > MAX_DB_IMPORT_BYTES {
            return Err(AppError::Database(
                "数据库备份文件过大，已拒绝导入".to_string(),
            ));
        }
        ensure_sqlite_file(backup)?;

        let dest = self.path_provider.get_db_file_path()?;
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent)?;
        }

        fs::copy(backup, &dest)?;

        // 重启程序
        let handle = self.app_handle.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(300));
            handle.restart();
        });

        Ok(())
    }

    /// 一键清除 SQLite 数据库及上传的物理文件并重启客户端
    pub fn reset_db(&self) -> AppResult<()> {
        let db = self.path_provider.get_db_file_path()?;
        if db.exists() {
            let _ = fs::remove_file(db);
        }

        let app_dir = self.path_provider.get_app_local_data_dir()?;
        let uploads = app_dir.join("uploads");
        if uploads.exists() {
            fs::remove_dir_all(uploads)?;
        }

        // 重启程序
        let handle = self.app_handle.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(300));
            handle.restart();
        });

        Ok(())
    }
}

fn ensure_sqlite_file(path: &Path) -> AppResult<()> {
    let mut file = fs::File::open(path)?;
    let mut header = [0_u8; 16];
    file.read_exact(&mut header)?;
    if &header == SQLITE_HEADER {
        Ok(())
    } else {
        Err(AppError::Database("数据库备份文件格式不合法".to_string()))
    }
}
