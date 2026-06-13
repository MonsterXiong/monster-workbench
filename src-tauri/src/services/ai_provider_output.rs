use crate::infra::{AppError, AppResult};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

const GENERATED_IMAGE_MAX_FILES: usize = 40;
const GENERATED_IMAGE_MAX_AGE: Duration = Duration::from_secs(7 * 24 * 60 * 60);

pub(super) fn cleanup_generated_output_dir(output_dir: &Path) -> AppResult<()> {
    let now = SystemTime::now();
    let mut files = collect_generated_files(output_dir)?;

    for file in files
        .iter()
        .filter(|file| is_file_expired(now, file.modified_at))
    {
        fs::remove_file(&file.path).map_err(|error| {
            AppError::Io(format!(
                "删除过期 AI 生图缓存失败 ({}): {}",
                file.path.display(),
                error
            ))
        })?;
    }

    files = collect_generated_files(output_dir)?;
    if files.len() <= GENERATED_IMAGE_MAX_FILES {
        return Ok(());
    }

    files.sort_by(|left, right| right.modified_at.cmp(&left.modified_at));
    for file in files.into_iter().skip(GENERATED_IMAGE_MAX_FILES) {
        fs::remove_file(&file.path).map_err(|error| {
            AppError::Io(format!(
                "裁剪 AI 生图缓存数量失败 ({}): {}",
                file.path.display(),
                error
            ))
        })?;
    }

    Ok(())
}

fn is_file_expired(now: SystemTime, modified_at: SystemTime) -> bool {
    now.duration_since(modified_at)
        .map(|elapsed| elapsed >= GENERATED_IMAGE_MAX_AGE)
        .unwrap_or(false)
}

fn collect_generated_files(output_dir: &Path) -> AppResult<Vec<GeneratedFileMeta>> {
    let mut files = Vec::new();
    let entries = fs::read_dir(output_dir)
        .map_err(|error| AppError::Io(format!("读取 AI 生图缓存目录失败: {}", error)))?;

    for entry in entries {
        let entry =
            entry.map_err(|error| AppError::Io(format!("遍历 AI 生图缓存目录失败: {}", error)))?;
        let file_type = entry
            .file_type()
            .map_err(|error| AppError::Io(format!("读取 AI 生图缓存文件类型失败: {}", error)))?;
        if !file_type.is_file() {
            continue;
        }

        let metadata = entry
            .metadata()
            .map_err(|error| AppError::Io(format!("读取 AI 生图缓存元数据失败: {}", error)))?;
        files.push(GeneratedFileMeta {
            path: entry.path(),
            modified_at: metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH),
        });
    }

    Ok(files)
}

struct GeneratedFileMeta {
    path: PathBuf,
    modified_at: SystemTime,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "monster-workbench-{}-{}",
            name,
            SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .expect("system time should be available")
                .as_nanos()
        ));
        fs::create_dir_all(&dir).expect("temp dir should create");
        dir
    }

    fn write_temp_file(path: &Path, contents: &[u8]) {
        fs::write(path, contents).expect("temp file should write");
    }

    #[test]
    fn cleanup_generated_output_dir_trims_excess_files() {
        let dir = make_temp_dir("ai-generated-trim");
        for index in 0..(GENERATED_IMAGE_MAX_FILES + 3) {
            write_temp_file(&dir.join(format!("file-{index:02}.png")), b"png");
            std::thread::sleep(Duration::from_millis(5));
        }

        cleanup_generated_output_dir(&dir).expect("cleanup should succeed");

        let remaining = collect_generated_files(&dir).expect("files should be readable");
        assert_eq!(remaining.len(), GENERATED_IMAGE_MAX_FILES);
        assert!(!dir.join("file-00.png").exists());
        assert!(dir
            .join(format!("file-{:02}.png", GENERATED_IMAGE_MAX_FILES + 2))
            .exists());

        fs::remove_dir_all(&dir).expect("temp dir should clean");
    }

    #[test]
    fn is_file_expired_uses_generated_image_max_age_boundary() {
        let now = SystemTime::now();
        let expired = now - GENERATED_IMAGE_MAX_AGE - Duration::from_secs(1);
        let fresh = now - Duration::from_secs(60);

        assert!(is_file_expired(now, expired));
        assert!(!is_file_expired(now, fresh));
    }
}
