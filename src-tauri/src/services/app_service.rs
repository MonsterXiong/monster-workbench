use tauri::AppHandle;
use crate::infra::path::PathProvider;
use crate::infra::AppResult;

pub struct AppService {
    app_handle: AppHandle,
    path_provider: PathProvider,
}

impl AppService {
    pub fn new(app_handle: AppHandle, path_provider: PathProvider) -> Self {
        Self { app_handle, path_provider }
    }

    /// 获取当前应用版本号
    pub fn get_version(&self) -> String {
        self.app_handle.package_info().version.to_string()
    }

    /// 获取本地 ~/.monster-tools 数据存放物理路径
    pub fn get_local_data_dir(&self) -> AppResult<String> {
        let path = self.path_provider.get_app_local_data_dir()?;
        Ok(path.to_string_lossy().into_owned())
    }
}
