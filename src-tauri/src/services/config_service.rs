use std::fs;
use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};

pub struct ConfigService {
    path_provider: PathProvider,
}

const MAX_CONFIG_BYTES: usize = 256 * 1024;

impl ConfigService {
    pub fn new(path_provider: PathProvider) -> Self {
        Self { path_provider }
    }

    /// 读取偏好设置
    pub fn get_config(&self) -> AppResult<String> {
        let app_dir = self.path_provider.get_app_local_data_dir()?;
        let cfg_path = app_dir.join("config.json");
        if !cfg_path.exists() {
            return Ok("{}".to_string());
        }

        let content = fs::read_to_string(cfg_path)?;
        Ok(content.trim_start_matches('\u{FEFF}').to_string())
    }

    /// 写入并持久化偏好设置 JSON 字符串
    pub fn save_config(&self, json_content: &str) -> AppResult<()> {
        let content = json_content.trim_start_matches('\u{FEFF}');
        if content.len() > MAX_CONFIG_BYTES {
            return Err(AppError::Config("配置文件内容过大，已拒绝保存".to_string()));
        }

        let parsed: serde_json::Value = serde_json::from_str(content)
            .map_err(|e| AppError::Config(format!("配置 JSON 格式不合法: {}", e)))?;
        if !parsed.is_object() {
            return Err(AppError::Config("配置根节点必须是 JSON 对象".to_string()));
        }

        let app_dir = self.path_provider.get_app_local_data_dir()?;
        if !app_dir.exists() {
            fs::create_dir_all(&app_dir)?;
        }

        let cfg_path = app_dir.join("config.json");
        fs::write(cfg_path, content)?;
        Ok(())
    }
}
