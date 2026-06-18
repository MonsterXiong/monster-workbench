use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const REFERENCE_IMAGE_EXTENSIONS: &[&str] =
    &["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico"];

pub(crate) struct ImageWorkbenchAssetPathPolicy {
    path_provider: PathProvider,
}

pub(crate) struct ImportedImageWorkbenchReference {
    pub(crate) file_path: String,
    pub(crate) original_path: String,
    pub(crate) mime_type: Option<String>,
    pub(crate) size_bytes: u64,
    pub(crate) created_at_ms: i64,
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

    pub(crate) fn import_reference_image(
        &self,
        label: &str,
        value: &str,
    ) -> AppResult<ImportedImageWorkbenchReference> {
        let source_path = self.resolve_reference_source_path(label, value)?;
        validate_reference_image_extension(label, &source_path)?;
        let metadata = fs::metadata(&source_path).map_err(|error| {
            AppError::Io(format!(
                "Resolve Image Workbench reference metadata failed ({}): {}",
                source_path.display(),
                error
            ))
        })?;
        if !metadata.is_file() {
            return Err(AppError::Permission(format!(
                "{} must point to a local image file",
                label
            )));
        }

        let reference_root = self.workbench_reference_root()?;
        let canonical_reference_root =
            canonicalize_existing_dir(&reference_root, "Image Workbench reference directory")?;
        let asset_root = self.workbench_asset_root()?;
        let canonical_asset_root =
            canonicalize_existing_dir(&asset_root, "Image Workbench asset directory")?;

        if source_path.starts_with(&canonical_reference_root)
            || source_path.starts_with(&canonical_asset_root)
        {
            return Ok(reference_import_result(source_path, metadata.len()));
        }

        let upload_root = self.upload_image_root()?;
        let canonical_upload_root =
            canonicalize_existing_dir(&upload_root, "Image upload directory")?;
        if !source_path.starts_with(&canonical_upload_root) {
            return Err(AppError::Permission(format!(
                "{} must come from uploads/images or Image Workbench controlled directories",
                label
            )));
        }

        let dest_path = canonical_reference_root.join(unique_asset_file_name(&source_path));
        fs::copy(&source_path, &dest_path).map_err(|error| {
            AppError::Io(format!(
                "Copy Image Workbench reference failed ({} -> {}): {}",
                source_path.display(),
                dest_path.display(),
                error
            ))
        })?;
        let dest_metadata = fs::metadata(&dest_path).map_err(|error| {
            AppError::Io(format!(
                "Resolve imported Image Workbench reference failed ({}): {}",
                dest_path.display(),
                error
            ))
        })?;
        let canonical_dest = dest_path.canonicalize().map_err(|error| {
            AppError::Io(format!(
                "Canonicalize imported Image Workbench reference failed: {}",
                error
            ))
        })?;

        let mut result = reference_import_result(canonical_dest, dest_metadata.len());
        result.original_path = source_path.to_string_lossy().to_string();
        Ok(result)
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

    fn workbench_reference_root(&self) -> AppResult<PathBuf> {
        let root = self
            .path_provider
            .get_app_local_data_dir()?
            .join("ai")
            .join("image-workbench")
            .join("references");
        if !root.exists() {
            fs::create_dir_all(&root).map_err(|error| {
                AppError::Io(format!(
                    "Create Image Workbench reference directory failed: {}",
                    error
                ))
            })?;
        }
        Ok(root)
    }

    fn upload_image_root(&self) -> AppResult<PathBuf> {
        let root = self
            .path_provider
            .get_app_local_data_dir()?
            .join("uploads")
            .join("images");
        if !root.exists() {
            fs::create_dir_all(&root).map_err(|error| {
                AppError::Io(format!("Create image upload directory failed: {}", error))
            })?;
        }
        Ok(root)
    }

    fn resolve_reference_source_path(&self, label: &str, value: &str) -> AppResult<PathBuf> {
        let trimmed = value.trim();
        let lowered = trimmed.to_ascii_lowercase();
        if lowered.starts_with("data:")
            || lowered.starts_with("http://")
            || lowered.starts_with("https://")
            || lowered.starts_with("asset:")
        {
            return Err(AppError::Permission(format!(
                "{} must be a controlled local file path, not URL or data URL",
                label
            )));
        }

        let raw_path = PathBuf::from(trimmed);
        let candidate = if raw_path.is_absolute() {
            raw_path
        } else {
            let relative_path = normalize_upload_image_relative_path(label, trimmed)?;
            self.path_provider
                .get_app_local_data_dir()?
                .join(relative_path)
        };

        candidate.canonicalize().map_err(|error| {
            AppError::Io(format!(
                "Resolve {} failed ({}): {}",
                label,
                candidate.display(),
                error
            ))
        })
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

fn normalize_upload_image_relative_path(label: &str, value: &str) -> AppResult<PathBuf> {
    let normalized = value.trim().replace('\\', "/");
    let path = PathBuf::from(&normalized);

    if path.components().any(|component| {
        matches!(
            component,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    }) {
        return Err(AppError::Permission(format!(
            "{} must not contain traversal or absolute path segments",
            label
        )));
    }

    let mut components = normalized.split('/').filter(|part| !part.is_empty());
    match (components.next(), components.next()) {
        (Some("uploads"), Some("images")) => Ok(path),
        _ => Err(AppError::Permission(format!(
            "{} must be under uploads/images",
            label
        ))),
    }
}

fn validate_reference_image_extension(label: &str, path: &Path) -> AppResult<()> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            AppError::Permission(format!("{} must include an image file extension", label))
        })?;
    if REFERENCE_IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        Ok(())
    } else {
        Err(AppError::Permission(format!(
            "{} only supports common image file formats",
            label
        )))
    }
}

fn reference_import_result(path: PathBuf, size_bytes: u64) -> ImportedImageWorkbenchReference {
    ImportedImageWorkbenchReference {
        mime_type: mime_type_for_image_path(&path),
        file_path: path.to_string_lossy().to_string(),
        original_path: path.to_string_lossy().to_string(),
        size_bytes,
        created_at_ms: now_millis(),
    }
}

fn mime_type_for_image_path(path: &Path) -> Option<String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.trim().to_ascii_lowercase())?;
    let mime_type = match extension.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        _ => return None,
    };
    Some(mime_type.to_string())
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

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}
