use crate::infra::path::PathProvider;
use crate::infra::sensitive::sanitize_sensitive_text;
use crate::infra::{AppError, AppResult};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;

pub struct LoggerInfra {
    path_provider: PathProvider,
}

impl LoggerInfra {
    pub fn new(path_provider: PathProvider) -> Self {
        Self { path_provider }
    }

    /// 追加写入单行日志到指定日志物理文件
    pub fn write_log(&self, file_name: &str, line: &str) -> AppResult<()> {
        if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
            return Err(AppError::Io("非法日志文件名".to_string()));
        }

        let app_dir = self.path_provider.get_app_local_data_dir()?;
        let log_dir = app_dir.join("logs");
        if !log_dir.exists() {
            fs::create_dir_all(&log_dir)?;
        }

        let log_file = log_dir.join(file_name);
        let mut file = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .write(true)
            .open(&log_file)?;

        writeln!(file, "{}", sanitize_sensitive_text(line))?;
        Ok(())
    }

    /// 读取日志文件全部内容
    pub fn read_log(&self, file_name: &str) -> AppResult<String> {
        if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
            return Err(AppError::Io("非法日志文件名".to_string()));
        }

        let app_dir = self.path_provider.get_app_local_data_dir()?;
        let log_file = app_dir.join("logs").join(file_name);
        if !log_file.exists() {
            return Ok(String::new());
        }

        let mut file = File::open(&log_file)?;
        let mut content = String::new();
        file.read_to_string(&mut content)?;
        Ok(content)
    }

    /// 一键删除并清空所有日志物理文件
    pub fn clear_logs(&self) -> AppResult<()> {
        let app_dir = self.path_provider.get_app_local_data_dir()?;
        let log_dir = app_dir.join("logs");
        if log_dir.exists() {
            fs::remove_dir_all(&log_dir)?;
        }
        Ok(())
    }

    /// 物理日志另存备份拷贝
    pub fn export_log(&self, file_name: &str, target_path: &str) -> AppResult<()> {
        if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
            return Err(AppError::Io("非法日志文件名".to_string()));
        }

        let app_dir = self.path_provider.get_app_local_data_dir()?;
        let src = app_dir.join("logs").join(file_name);
        if !src.exists() {
            return Err(AppError::Io("日志源文件不存在".to_string()));
        }

        let dest = Path::new(target_path);
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent)?;
        }

        fs::copy(&src, dest)?;
        Ok(())
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
            "monster-workbench-logger-{name}-{}-{nanos}",
            std::process::id()
        ))
    }

    #[test]
    fn write_log_sanitizes_secrets_before_persisting() {
        let root = temp_root("sanitize");
        let app_dir = root.join("app-data");
        let provider =
            PathProvider::new_for_test(app_dir.clone(), app_dir.join("monster_workbench.db"));
        let logger = LoggerInfra::new(provider);
        let raw = r#"apiKey=plain-secret Authorization: Bearer sk-live-secret {"password":"p@ss"}"#;

        let _ = std::fs::remove_dir_all(&root);
        logger
            .write_log("test.log", raw)
            .expect("log write should succeed");

        let persisted = std::fs::read_to_string(app_dir.join("logs").join("test.log"))
            .expect("persisted log should be readable");

        assert!(!persisted.contains("plain-secret"));
        assert!(!persisted.contains("sk-live-secret"));
        assert!(!persisted.contains("p@ss"));
        assert_ne!(persisted.trim(), raw);

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn write_log_rejects_path_traversal_file_names() {
        let root = temp_root("path-traversal");
        let app_dir = root.join("app-data");
        let provider =
            PathProvider::new_for_test(app_dir.clone(), app_dir.join("monster_workbench.db"));
        let logger = LoggerInfra::new(provider);

        let err = logger
            .write_log("../secret.log", "safe line")
            .expect_err("path traversal file name should fail");

        assert!(matches!(err, AppError::Io(_)));
        assert!(!app_dir.join("secret.log").exists());

        let _ = std::fs::remove_dir_all(&root);
    }
}
