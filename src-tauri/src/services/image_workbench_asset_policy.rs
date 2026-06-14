use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub(crate) struct ImageWorkbenchAssetPathPolicy {
    path_provider: PathProvider,
}

impl ImageWorkbenchAssetPathPolicy {
    pub(crate) fn new(path_provider: PathProvider) -> Self {
        Self { path_provider }
    }

    pub(crate) fn normalize_optional_asset_path(
        &self,
        label: &str,
        value: Option<String>,
        task_id: &str,
    ) -> AppResult<Option<String>> {
        match normalize_optional_string(value) {
            Some(path) => Ok(Some(
                self.persist_workbench_asset_path(label, &path, task_id)?,
            )),
            None => Ok(None),
        }
    }

    pub(crate) fn persist_workbench_asset_path(
        &self,
        label: &str,
        value: &str,
        task_id: &str,
    ) -> AppResult<String> {
        let source_path = validate_local_asset_path(label, value)?;
        let workbench_root = self.workbench_asset_root()?;
        let canonical_workbench_root =
            canonicalize_existing_dir(&workbench_root, "图片工作台资产目录")?;
        if source_path.starts_with(&canonical_workbench_root) {
            return Ok(source_path.to_string_lossy().to_string());
        }

        let generated_root = self.generated_asset_root()?;
        let canonical_generated_root =
            canonicalize_existing_dir(&generated_root, "AI 生成资产目录")?;
        if !source_path.starts_with(&canonical_generated_root) {
            return Err(AppError::Permission(format!(
                "{} 必须位于 AI 生成资产目录内",
                label
            )));
        }

        let dest_dir = canonical_workbench_root.join(sanitize_path_segment(task_id));
        fs::create_dir_all(&dest_dir)
            .map_err(|error| AppError::Io(format!("创建图片工作台资产目录失败: {}", error)))?;
        let dest_path = dest_dir.join(unique_asset_file_name(&source_path));
        fs::copy(&source_path, &dest_path).map_err(|error| {
            AppError::Io(format!(
                "复制图片工作台资产失败 ({} -> {}): {}",
                source_path.display(),
                dest_path.display(),
                error
            ))
        })?;
        dest_path
            .canonicalize()
            .map(|path| path.to_string_lossy().to_string())
            .map_err(|error| AppError::Io(format!("解析图片工作台资产路径失败: {}", error)))
    }

    fn generated_asset_root(&self) -> AppResult<PathBuf> {
        let root = self
            .path_provider
            .get_app_local_data_dir()?
            .join("ai")
            .join("generated");
        if !root.exists() {
            fs::create_dir_all(&root)
                .map_err(|error| AppError::Io(format!("创建 AI 生成资产目录失败: {}", error)))?;
        }
        Ok(root)
    }

    fn workbench_asset_root(&self) -> AppResult<PathBuf> {
        let root = self
            .path_provider
            .get_app_local_data_dir()?
            .join("ai")
            .join("image-workbench")
            .join("assets");
        if !root.exists() {
            fs::create_dir_all(&root)
                .map_err(|error| AppError::Io(format!("创建图片工作台资产目录失败: {}", error)))?;
        }
        Ok(root)
    }
}

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}

fn validate_local_asset_path(label: &str, value: &str) -> AppResult<PathBuf> {
    let trimmed = value.trim();
    let lowered = trimmed.to_ascii_lowercase();
    if lowered.starts_with("data:")
        || lowered.starts_with("http://")
        || lowered.starts_with("https://")
        || lowered.starts_with("asset:")
    {
        return Err(AppError::Permission(format!(
            "{} 必须是受控本地文件路径，不能使用 URL 或 data URL",
            label
        )));
    }

    let raw_path = PathBuf::from(trimmed);
    if !raw_path.is_absolute() {
        return Err(AppError::Permission(format!("{} 必须是绝对路径", label)));
    }

    raw_path.canonicalize().map_err(|error| {
        AppError::Io(format!(
            "解析{}失败 ({}): {}",
            label,
            raw_path.display(),
            error
        ))
    })
}

fn canonicalize_existing_dir(path: &Path, label: &str) -> AppResult<PathBuf> {
    path.canonicalize()
        .map_err(|error| AppError::Io(format!("解析{}失败 ({}): {}", label, path.display(), error)))
}

fn unique_asset_file_name(source_path: &Path) -> String {
    let source_name = source_path
        .file_name()
        .and_then(|value| value.to_str())
        .map(sanitize_path_segment)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "asset.bin".to_string());
    format!("{}-{}", now_nanos(), source_name)
}

fn sanitize_path_segment(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.') {
                ch
            } else {
                '_'
            }
        })
        .collect::<String>()
        .trim_matches('.')
        .to_string()
}

fn now_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0)
}
