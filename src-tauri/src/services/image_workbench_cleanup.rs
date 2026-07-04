use crate::infra::image_workbench_repo::ImageWorkbenchRepo;
use crate::infra::image_workbench_types::{ImageWorkbenchAssetQuery, ImageWorkbenchAssetSort};
use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};
use crate::services::image_workbench_service::{
    ImageWorkbenchService, IMAGE_WORKBENCH_ASSET_INTEGRITY_CORRUPT,
    IMAGE_WORKBENCH_ASSET_INTEGRITY_MISSING,
};
use serde::Serialize;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

const IMAGE_WORKBENCH_CLEANUP_ASSET_LIMIT: u32 = 1_000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupImageWorkbenchDeletedAssetsResult {
    pub scanned_assets: u32,
    pub removed_files: u32,
    pub removed_dirs: u32,
    pub missing_files: u32,
    pub skipped_files: u32,
    pub removed_bytes: u64,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupImageWorkbenchInvalidAssetsResult {
    pub scanned_assets: u32,
    pub removed_assets: u32,
    pub missing_assets: u32,
    pub corrupt_assets: u32,
}

impl ImageWorkbenchService {
    pub fn cleanup_invalid_assets(&self) -> AppResult<CleanupImageWorkbenchInvalidAssetsResult> {
        const PAGE_SIZE: u32 = 200;
        let mut offset = 0;
        let mut scanned_assets = 0;
        let mut missing_assets = 0;
        let mut corrupt_assets = 0;
        let mut invalid_asset_ids = Vec::new();

        loop {
            let assets = self.repo()?.query_assets(ImageWorkbenchAssetQuery {
                limit: PAGE_SIZE,
                offset,
                sort: ImageWorkbenchAssetSort::RecentFirst,
                ..Default::default()
            })?;
            if assets.is_empty() {
                break;
            }

            let page_len = assets.len() as u32;
            let checked_assets = self.refresh_asset_integrity_for_assets(assets)?;
            scanned_assets += checked_assets.len() as u32;
            for asset in checked_assets {
                match asset.integrity_status.as_str() {
                    IMAGE_WORKBENCH_ASSET_INTEGRITY_MISSING => {
                        missing_assets += 1;
                        invalid_asset_ids.push(asset.id);
                    }
                    IMAGE_WORKBENCH_ASSET_INTEGRITY_CORRUPT => {
                        corrupt_assets += 1;
                        invalid_asset_ids.push(asset.id);
                    }
                    _ => {}
                }
            }
            if page_len < PAGE_SIZE {
                break;
            }
            offset += page_len;
        }

        let removed_assets = self
            .repo()?
            .delete_invalid_assets_by_ids(&invalid_asset_ids)?;
        Ok(CleanupImageWorkbenchInvalidAssetsResult {
            scanned_assets,
            removed_assets,
            missing_assets,
            corrupt_assets,
        })
    }
}

pub(crate) fn cleanup_deleted_job_assets(
    path_provider: &PathProvider,
) -> AppResult<CleanupImageWorkbenchDeletedAssetsResult> {
    let asset_root = workbench_asset_root(path_provider)?;
    let repo = ImageWorkbenchRepo::new(path_provider.get_db_file_path()?);
    let assets = repo.list_deleted_job_assets(IMAGE_WORKBENCH_CLEANUP_ASSET_LIMIT)?;
    let mut result = CleanupImageWorkbenchDeletedAssetsResult {
        scanned_assets: assets.len() as u32,
        removed_files: 0,
        removed_dirs: 0,
        missing_files: 0,
        skipped_files: 0,
        removed_bytes: 0,
        warnings: Vec::new(),
    };
    let mut candidate_dirs = HashSet::<PathBuf>::new();

    for asset in assets {
        let raw_path = PathBuf::from(&asset.file_path);
        if !raw_path.is_absolute() {
            result.skipped_files += 1;
            push_cleanup_warning(
                &mut result.warnings,
                format!("跳过非绝对路径资产: {}", asset.id),
            );
            continue;
        }

        let metadata = match fs::metadata(&raw_path) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                result.missing_files += 1;
                continue;
            }
            Err(error) => {
                result.skipped_files += 1;
                push_cleanup_warning(
                    &mut result.warnings,
                    format!("无法读取资产文件 {}: {}", asset.id, error),
                );
                continue;
            }
        };
        if !metadata.is_file() {
            result.skipped_files += 1;
            push_cleanup_warning(
                &mut result.warnings,
                format!("跳过非文件资产: {}", asset.id),
            );
            continue;
        }

        let canonical_path = match raw_path.canonicalize() {
            Ok(path) => path,
            Err(error) => {
                result.skipped_files += 1;
                push_cleanup_warning(
                    &mut result.warnings,
                    format!("无法解析资产路径 {}: {}", asset.id, error),
                );
                continue;
            }
        };
        if !canonical_path.starts_with(&asset_root) {
            result.skipped_files += 1;
            push_cleanup_warning(
                &mut result.warnings,
                format!("跳过非受控资产目录文件: {}", asset.id),
            );
            continue;
        }

        fs::remove_file(&canonical_path).map_err(|error| {
            AppError::Io(format!(
                "清理图片工作台资产失败 ({}): {}",
                canonical_path.display(),
                error
            ))
        })?;
        result.removed_files += 1;
        result.removed_bytes = result.removed_bytes.saturating_add(metadata.len());

        if let Some(parent) = canonical_path.parent() {
            if parent != asset_root && parent.starts_with(&asset_root) {
                candidate_dirs.insert(parent.to_path_buf());
            }
        }
    }

    for dir in candidate_dirs {
        if is_empty_dir(&dir)? {
            fs::remove_dir(&dir).map_err(|error| {
                AppError::Io(format!(
                    "清理图片工作台空资产目录失败 ({}): {}",
                    dir.display(),
                    error
                ))
            })?;
            result.removed_dirs += 1;
        }
    }

    Ok(result)
}

fn workbench_asset_root(path_provider: &PathProvider) -> AppResult<PathBuf> {
    let root = path_provider
        .get_app_local_data_dir()?
        .join("ai")
        .join("image-workbench")
        .join("assets");
    fs::create_dir_all(&root).map_err(|error| {
        AppError::Io(format!(
            "创建图片工作台资产目录失败 ({}): {}",
            root.display(),
            error
        ))
    })?;
    root.canonicalize().map_err(|error| {
        AppError::Io(format!(
            "解析图片工作台资产目录失败 ({}): {}",
            root.display(),
            error
        ))
    })
}

fn is_empty_dir(path: &Path) -> AppResult<bool> {
    let mut entries = fs::read_dir(path).map_err(|error| {
        AppError::Io(format!(
            "读取图片工作台资产目录失败 ({}): {}",
            path.display(),
            error
        ))
    })?;
    Ok(entries.next().is_none())
}

fn push_cleanup_warning(warnings: &mut Vec<String>, warning: String) {
    if warnings.len() < 20 {
        warnings.push(warning);
    }
}
