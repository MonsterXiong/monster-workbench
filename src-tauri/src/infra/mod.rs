pub(crate) mod creative_asset_repo;
pub(crate) mod creative_batch_repo;
#[cfg(test)]
mod creative_db_tests;
pub(crate) mod creative_db_schema;
pub(crate) mod creative_db_support;
pub(crate) mod creative_types;
pub(crate) mod creative_goal_repo;
pub(crate) mod creative_model_run_repo;
pub(crate) mod creative_project_repo;
pub(crate) mod creative_task_repo;
#[allow(dead_code)]
pub mod crypto;
pub mod db;
pub mod db_nav;
pub mod fs;
#[allow(dead_code)]
pub mod http;
pub mod logger;
pub mod path;
pub mod sensitive;

use serde::Serialize;
use std::fmt;

#[derive(Debug, Serialize, Clone)]
pub struct AppErrorResponse {
    pub code: String,
    pub message: String,
    pub detail: String,
}

#[derive(Debug)]
pub enum AppError {
    Io(String),
    Database(String),
    Permission(String),
    Config(String),
    Network(String),
    Process(String),
    Unknown(String),
}

impl AppError {
    pub fn to_response(&self) -> AppErrorResponse {
        match self {
            AppError::Io(detail) => AppErrorResponse {
                code: "FILE_IO_FAILED".to_string(),
                message: "文件或路径操作失败".to_string(),
                detail: detail.clone(),
            },
            AppError::Database(detail) => AppErrorResponse {
                code: "DATABASE_ERROR".to_string(),
                message: "数据库访问异常".to_string(),
                detail: detail.clone(),
            },
            AppError::Permission(detail) => AppErrorResponse {
                code: "PERMISSION_DENIED".to_string(),
                message: "系统权限不足".to_string(),
                detail: detail.clone(),
            },
            AppError::Config(detail) => AppErrorResponse {
                code: "CONFIG_ERROR".to_string(),
                message: "配置读取或解析异常".to_string(),
                detail: detail.clone(),
            },
            AppError::Network(detail) => AppErrorResponse {
                code: "NETWORK_ERROR".to_string(),
                message: "网络请求失败".to_string(),
                detail: detail.clone(),
            },
            AppError::Process(detail) => AppErrorResponse {
                code: "PROCESS_ERROR".to_string(),
                message: "进程管理异常".to_string(),
                detail: detail.clone(),
            },
            AppError::Unknown(detail) => AppErrorResponse {
                code: "UNKNOWN_ERROR".to_string(),
                message: "未知系统错误".to_string(),
                detail: detail.clone(),
            },
        }
    }

    pub fn to_json_string(&self) -> String {
        serde_json::to_string(&self.to_response()).unwrap_or_else(|_| {
            r#"{"code":"UNKNOWN_ERROR","message":"未知系统错误","detail":"序列化异常"}"#.to_string()
        })
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let resp = self.to_response();
        write!(f, "[{}]: {} ({})", resp.code, resp.message, resp.detail)
    }
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::Database(err.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
