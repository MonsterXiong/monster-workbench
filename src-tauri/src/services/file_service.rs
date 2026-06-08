use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
pub use crate::infra::fs::PathItem;
use crate::infra::fs::FsInfra;
use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};

pub struct FileService {
    app_handle: AppHandle,
    path_provider: PathProvider,
    fs_infra: FsInfra,
}

const MAX_IMAGE_UPLOAD_BYTES: u64 = 20 * 1024 * 1024;
const MAX_FILE_UPLOAD_BYTES: u64 = 100 * 1024 * 1024;
const IMAGE_UPLOAD_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico"];
const DENIED_FILE_UPLOAD_EXTENSIONS: &[&str] = &[
    "bat", "cmd", "com", "dll", "exe", "jar", "js", "lnk", "msi", "ps1", "reg", "scr", "vbs",
];

impl FileService {
    pub fn new(app_handle: AppHandle, path_provider: PathProvider) -> Self {
        let fs_infra = FsInfra::new(path_provider.clone());
        Self { app_handle, path_provider, fs_infra }
    }

    /// 调起本地对话框，选择文件夹路径
    pub fn select_folder(&self) -> AppResult<Option<String>> {
        let folder = self.app_handle
            .dialog()
            .file()
            .blocking_pick_folder();

        let path_str = folder
            .and_then(|f| f.into_path().ok())
            .map(|p| p.to_string_lossy().into_owned());

        Ok(path_str)
    }

    /// 调起本地对话框，选择文件路径
    pub fn select_file(&self) -> AppResult<Option<String>> {
        let file = self.app_handle
            .dialog()
            .file()
            .blocking_pick_file();

        let path_str = file
            .and_then(|f| f.into_path().ok())
            .map(|p| p.to_string_lossy().into_owned());

        Ok(path_str)
    }

    /// 上传文件：将 src_path 文件安全拷贝到 .monster-tools/uploads/{file_type}s/YYYY/MM/{uuid_name}.{ext}
    pub fn upload_file(
        &self,
        src_path: &str,
        file_type: &str,
        year_month: &str,
        uuid_name: &str,
    ) -> AppResult<String> {
        let src_file_path = Path::new(src_path);
        if !src_file_path.exists() {
            return Err(AppError::Io("源文件不存在".to_string()));
        }
        if !src_file_path.is_file() {
            return Err(AppError::Io("源路径不是一个有效的文件".to_string()));
        }
        if file_type != "image" && file_type != "file" {
            return Err(AppError::Io("不支持的文件类型参数".to_string()));
        }
        let source_metadata = fs::metadata(src_file_path)?;
        let max_upload_size = match file_type {
            "image" => MAX_IMAGE_UPLOAD_BYTES,
            "file" => MAX_FILE_UPLOAD_BYTES,
            _ => unreachable!(),
        };
        if source_metadata.len() > max_upload_size {
            return Err(AppError::Permission("上传文件超过允许大小，已拒绝写入".to_string()));
        }
        if !is_valid_uuid_name(uuid_name) {
            return Err(AppError::Io("上传文件名参数不合法".to_string()));
        }
        if !is_valid_year_month(year_month) {
            return Err(AppError::Io("上传目录参数不合法，应为 YYYY/MM".to_string()));
        }

        let app_dir = self.path_provider.get_app_local_data_dir()?;
        let ext = src_file_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        validate_upload_extension(file_type, ext)?;

        let file_name = if ext.is_empty() {
            uuid_name.to_string()
        } else {
            format!("{}.{}", uuid_name, ext)
        };

        let sub_folder = match file_type {
            "image" => "images",
            "file" => "files",
            _ => unreachable!(),
        };

        let clean_ym = year_month.replace('\\', "/");
        let clean_ym = clean_ym.trim_matches('/');

        let relative_path = format!("uploads/{}/{}/{}", sub_folder, clean_ym, file_name);
        let absolute_path = app_dir.join(&relative_path);

        if let Some(parent) = absolute_path.parent() {
            fs::create_dir_all(parent)?;
            ensure_path_is_inside(parent, &app_dir.join("uploads"))?;
        }

        fs::copy(src_file_path, &absolute_path)?;

        Ok(relative_path)
    }

    /// 列出已上传文件的元数据列表
    pub fn list_uploaded_files(&self, file_type: Option<&str>) -> AppResult<String> {
        let app_dir = self.path_provider.get_app_local_data_dir()?;
        let base_dir = app_dir.join("uploads");

        let mut results: Vec<serde_json::Value> = Vec::new();

        let scan_targets: Vec<(&str, &str)> = match file_type {
            Some("image") => vec![("images", "image")],
            Some("file") => vec![("files", "file")],
            _ => vec![("images", "image"), ("files", "file")],
        };

        for (sub_dir, type_label) in &scan_targets {
            let dir_path = base_dir.join(sub_dir);
            if dir_path.exists() && dir_path.is_dir() {
                self.collect_files_recursive(&dir_path, &base_dir, type_label, &mut results)?;
            }
        }

        serde_json::to_string(&results).map_err(|e| AppError::Unknown(format!("序列化文件列表失败: {}", e)))
    }

    fn collect_files_recursive(
        &self,
        dir: &Path,
        uploads_dir: &Path,
        type_label: &str,
        results: &mut Vec<serde_json::Value>,
    ) -> AppResult<()> {
        let entries = fs::read_dir(dir)?;

        for entry in entries {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                self.collect_files_recursive(&path, uploads_dir, type_label, results)?;
            } else if path.is_file() {
                let rel_path = path
                    .strip_prefix(uploads_dir.parent().unwrap_or(uploads_dir))
                    .map(|p| p.to_string_lossy().replace('\\', "/"))
                    .unwrap_or_default();

                let file_name = path
                    .file_name()
                    .map(|n| n.to_string_lossy().into_owned())
                    .unwrap_or_default();

                let metadata = fs::metadata(&path)?;
                let file_size = metadata.len();

                let modified = metadata
                    .modified()
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);

                results.push(serde_json::json!({
                    "rel_path": rel_path,
                    "file_name": file_name,
                    "file_size": file_size,
                    "file_type": type_label,
                    "modified": modified,
                }));
            }
        }
        Ok(())
    }

    /// 删除已上传的文件
    pub fn delete_uploaded_file(&self, rel_path: &str) -> AppResult<()> {
        let safe_rel_path = normalize_upload_relative_path(rel_path)?;

        let app_dir = self.path_provider.get_app_local_data_dir()?;
        let absolute_path = app_dir.join(&safe_rel_path);

        if !absolute_path.exists() {
            return Err(AppError::Io("文件不存在".to_string()));
        }
        if !absolute_path.is_file() {
            return Err(AppError::Io("指定路径不是一个文件".to_string()));
        }

        ensure_path_is_inside(&absolute_path, &app_dir.join("uploads"))?;
        fs::remove_file(&absolute_path)?;
        Ok(())
    }

    pub fn write_test_file(&self, content: &str) -> AppResult<String> {
        self.fs_infra.write_test_file(content)
    }

    pub fn read_test_file(&self) -> AppResult<String> {
        self.fs_infra.read_test_file()
    }

    pub fn create_directory_structure(
        &self,
        root_path: Option<String>,
        items: Vec<PathItem>,
    ) -> AppResult<()> {
        self.fs_infra.create_directory_structure(root_path, items)
    }

    pub fn read_directory_tree(
        &self,
        dir_path: &str,
        skip_dirs: Vec<String>,
        max_depth: u32,
    ) -> AppResult<String> {
        self.fs_infra.read_directory_tree(dir_path, skip_dirs, max_depth)
    }
}

fn is_valid_uuid_name(value: &str) -> bool {
    !value.is_empty()
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-')
}

fn is_valid_year_month(value: &str) -> bool {
    let normalized = value.replace('\\', "/");
    let mut parts = normalized.split('/');
    match (parts.next(), parts.next(), parts.next()) {
        (Some(year), Some(month), None) => {
            year.len() == 4
                && year.chars().all(|c| c.is_ascii_digit())
                && month.len() == 2
                && month.chars().all(|c| c.is_ascii_digit())
                && matches!(month.parse::<u32>(), Ok(1..=12))
        }
        _ => false,
    }
}

fn validate_upload_extension(file_type: &str, ext: &str) -> AppResult<()> {
    let normalized = ext.trim().to_ascii_lowercase();
    if normalized.is_empty() {
        return Err(AppError::Permission("上传文件必须包含明确的扩展名".to_string()));
    }

    match file_type {
        "image" if IMAGE_UPLOAD_EXTENSIONS.contains(&normalized.as_str()) => Ok(()),
        "image" => Err(AppError::Permission("图片上传仅允许常见图片格式".to_string())),
        "file" if DENIED_FILE_UPLOAD_EXTENSIONS.contains(&normalized.as_str()) => {
            Err(AppError::Permission("出于安全原因，禁止上传可执行或脚本类文件".to_string()))
        }
        "file" => Ok(()),
        _ => Err(AppError::Permission("不支持的上传类型".to_string())),
    }
}

fn normalize_upload_relative_path(rel_path: &str) -> AppResult<PathBuf> {
    let normalized = rel_path.trim().replace('\\', "/");
    let path = PathBuf::from(&normalized);

    if path.components().any(|component| {
        matches!(
            component,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    }) {
        return Err(AppError::Permission("非法上传文件路径：不允许目录跳转或绝对路径".to_string()));
    }

    let mut components = normalized.split('/').filter(|part| !part.is_empty());
    match (components.next(), components.next()) {
        (Some("uploads"), Some("images" | "files")) => Ok(path),
        _ => Err(AppError::Permission("非法上传文件路径：必须位于 uploads/images 或 uploads/files".to_string())),
    }
}

fn ensure_path_is_inside(path: &Path, root: &Path) -> AppResult<()> {
    let root = root.canonicalize()?;
    let target = path.canonicalize()?;
    if target.starts_with(root) {
        Ok(())
    } else {
        Err(AppError::Permission("目标路径超出上传文件沙箱".to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_upload_relative_path_accepts_upload_subdirectories() {
        let image = normalize_upload_relative_path("uploads/images/2026/06/pic.png")
            .expect("image upload path should be accepted");
        let file = normalize_upload_relative_path("uploads/files/2026/06/doc.pdf")
            .expect("file upload path should be accepted");

        assert_eq!(image.to_string_lossy().replace('\\', "/"), "uploads/images/2026/06/pic.png");
        assert_eq!(file.to_string_lossy().replace('\\', "/"), "uploads/files/2026/06/doc.pdf");
    }

    #[test]
    fn normalize_upload_relative_path_rejects_escape_and_non_upload_roots() {
        for rel_path in [
            "../uploads/images/pic.png",
            "uploads/images/../files/doc.pdf",
            "/uploads/images/pic.png",
            "config.json",
            "logs/2026-06-08.log",
        ] {
            let err = normalize_upload_relative_path(rel_path)
                .expect_err("unsafe upload path should fail");

            assert!(matches!(err, AppError::Permission(_)));
        }
    }

    #[test]
    fn validate_upload_extension_rejects_scripts_and_requires_image_formats() {
        let script_err = validate_upload_extension("file", "ps1")
            .expect_err("script file extension should fail");
        let image_err = validate_upload_extension("image", "txt")
            .expect_err("non-image extension should fail for image uploads");

        assert!(matches!(script_err, AppError::Permission(_)));
        assert!(matches!(image_err, AppError::Permission(_)));
        assert!(validate_upload_extension("image", "PNG").is_ok());
        assert!(validate_upload_extension("file", "pdf").is_ok());
    }

    #[test]
    fn year_month_validation_rejects_traversal_like_values() {
        assert!(is_valid_year_month("2026/06"));
        assert!(is_valid_year_month("2026\\06"));
        assert!(!is_valid_year_month("../06"));
        assert!(!is_valid_year_month("2026/13"));
        assert!(!is_valid_year_month("2026/06/extra"));
    }
}
