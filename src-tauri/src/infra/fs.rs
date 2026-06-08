use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use crate::infra::{AppError, AppResult};
use crate::infra::path::PathProvider;

pub struct FsInfra {
    path_provider: PathProvider,
}

const DEFAULT_SKIP_DIRS: &[&str] = &[".git", "node_modules", "target", "dist"];
const MAX_DIRECTORY_TREE_DEPTH: u32 = 20;
const MAX_DIRECTORY_ENTRIES_PER_DIR: usize = 1_000;
const MAX_DIRECTORY_TREE_BYTES: usize = 1024 * 1024;

impl FsInfra {
    pub fn new(path_provider: PathProvider) -> Self {
        Self { path_provider }
    }

    /// 写入测试文件并返回物理路径
    pub fn write_test_file(&self, content: &str) -> AppResult<String> {
        let app_dir = self.path_provider.get_app_local_data_dir()?;
        if !app_dir.exists() {
            fs::create_dir_all(&app_dir)?;
        }

        let test_file = app_dir.join("monster_test_file.txt");
        let test_file_str = test_file.to_string_lossy().into_owned();

        let mut file = File::create(&test_file)?;
        file.write_all(content.as_bytes())?;

        Ok(test_file_str)
    }

    /// 读取测试文件内容
    pub fn read_test_file(&self) -> AppResult<String> {
        let app_dir = self.path_provider.get_app_local_data_dir()?;
        let test_file = app_dir.join("monster_test_file.txt");

        if !test_file.exists() {
            return Err(AppError::Io("文件尚未写入，请先点击写入".to_string()));
        }

        let mut file = File::open(&test_file)?;
        let mut content = String::new();
        file.read_to_string(&mut content)?;

        Ok(content)
    }

    /// 批量物理创建目录与文件结构
    pub fn create_directory_structure(&self, root_path: Option<String>, items: Vec<PathItem>) -> AppResult<()> {
        let base_path = match root_path {
            Some(ref r) if !r.trim().is_empty() => PathBuf::from(r),
            _ => self.path_provider.get_app_local_data_dir()?,
        };

        for item in items {
            let clean_path = item.path.trim_start_matches('/').trim_start_matches('\\');
            let path_buf = PathBuf::from(clean_path);
            if path_buf.components().any(|c| matches!(c, std::path::Component::ParentDir | std::path::Component::RootDir)) {
                return Err(AppError::Io("检测到非法路径遍历组件 (.. 或根路径)".to_string()));
            }
            let full_path = base_path.join(path_buf);
            if item.is_file {
                if let Some(parent) = full_path.parent() {
                    fs::create_dir_all(parent)?;
                }
                if !full_path.exists() {
                    File::create(&full_path)?;
                }
            } else {
                fs::create_dir_all(&full_path)?;
            }
        }
        Ok(())
    }

    /// 读取物理目录并生成对应的树形结构字符串
    pub fn read_directory_tree(&self, dir_path: &str, skip_dirs: Vec<String>, max_depth: u32) -> AppResult<String> {
        let root = Path::new(dir_path);
        if !root.exists() {
            return Err(AppError::Io("选择的文件夹路径不存在".to_string()));
        }
        if !root.is_dir() {
            return Err(AppError::Io("选择的路径不是一个有效的文件夹".to_string()));
        }

        let root_name = root.file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "Root".to_string());

        let mut output = String::new();
        output.push_str(&root_name);
        output.push('/');
        output.push('\n');

        let mut effective_skip_dirs = skip_dirs;
        for default_dir in DEFAULT_SKIP_DIRS {
            if !effective_skip_dirs
                .iter()
                .any(|dir| dir.trim().eq_ignore_ascii_case(default_dir))
            {
                effective_skip_dirs.push((*default_dir).to_string());
            }
        }
        let safe_max_depth = max_depth.min(MAX_DIRECTORY_TREE_DEPTH);

        self.build_tree_string(root, &mut output, "", &effective_skip_dirs, safe_max_depth, 0)?;

        Ok(output)
    }

    fn build_tree_string(
        &self,
        dir: &Path,
        output: &mut String,
        prefix: &str,
        skip_dirs: &[String],
        max_depth: u32,
        current_depth: u32,
    ) -> AppResult<()> {
        if current_depth >= max_depth {
            return Ok(());
        }

        let entries = fs::read_dir(dir)?;
        let mut paths: Vec<_> = entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .collect();

        paths.sort_by(|a, b| {
            let a_is_dir = a.is_dir();
            let b_is_dir = b.is_dir();
            if a_is_dir != b_is_dir {
                b_is_dir.cmp(&a_is_dir)
            } else {
                a.file_name().cmp(&b.file_name())
            }
        });

        if paths.len() > MAX_DIRECTORY_ENTRIES_PER_DIR {
            output.push_str(prefix);
            output.push_str("[目录条目过多，已截断]\n");
            paths.truncate(MAX_DIRECTORY_ENTRIES_PER_DIR);
        }

        let count = paths.len();
        for (index, path) in paths.iter().enumerate() {
            if output.len() > MAX_DIRECTORY_TREE_BYTES {
                return Err(AppError::Io("目录树输出过大，已停止读取".to_string()));
            }

            let is_last = index == count - 1;
            let name = path.file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default();

            if name.is_empty() {
                continue;
            }

            output.push_str(prefix);
            if is_last {
                output.push_str("└── ");
            } else {
                output.push_str("├── ");
            }

            output.push_str(&name);
            let is_dir = path.is_dir();
            if is_dir {
                output.push('/');
            }
            output.push('\n');

            if is_dir {
                let should_skip = skip_dirs.iter().any(|d| d.trim().eq_ignore_ascii_case(&name));
                if !should_skip {
                    let next_prefix = if is_last {
                        format!("{}    ", prefix)
                    } else {
                        format!("{}│   ", prefix)
                    };
                    self.build_tree_string(path, output, &next_prefix, skip_dirs, max_depth, current_depth + 1)?;
                }
            }
        }

        Ok(())
    }
}

#[derive(serde::Deserialize)]
pub struct PathItem {
    pub path: String,
    pub is_file: bool,
}
