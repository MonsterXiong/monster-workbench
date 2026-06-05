use std::fs::{self, File};
use std::io::{Read, Write};
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

pub struct SystemService {
    app_handle: AppHandle,
}

impl SystemService {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    // 获取本地 AppData 物理路径
    pub fn get_app_local_data_dir(&self) -> Result<String, String> {
        self.app_handle
            .path()
            .home_dir()
            .map(|p| p.join(".monster-tools").to_string_lossy().into_owned())
            .map_err(|e| format!("获取应用路径异常: {}", e))
    }

    // 写入测试文件并返回物理路径
    pub fn write_test_file(&self, content: &str) -> Result<String, String> {
        let mut path = self.app_handle
            .path()
            .app_local_data_dir()
            .map_err(|e| format!("获取应用路径异常: {}", e))?;

        if !path.exists() {
            let _ = fs::create_dir_all(&path);
        }

        path.push("monster_test_file.txt");
        let file_path_str = path.to_string_lossy().into_owned();

        let mut file = File::create(&path)
            .map_err(|e| format!("创建测试文件失败: {}", e))?;

        file.write_all(content.as_bytes())
            .map_err(|e| format!("写入数据失败: {}", e))?;

        Ok(file_path_str)
    }

    // 读取测试文件内容
    pub fn read_test_file(&self) -> Result<String, String> {
        let mut path = self.app_handle
            .path()
            .app_local_data_dir()
            .map_err(|e| format!("获取应用路径异常: {}", e))?;

        path.push("monster_test_file.txt");

        if !path.exists() {
            return Err("文件尚未写入，请先点击写入".to_string());
        }

        let mut file = File::open(&path)
            .map_err(|e| format!("打开测试文件失败: {}", e))?;

        let mut content = String::new();
        file.read_to_string(&mut content)
            .map_err(|e| format!("读取数据失败: {}", e))?;

        Ok(content)
    }

    // 调用默认应用打开路径或网页
    pub fn open_path(&self, path_str: &str) -> Result<(), String> {
        self.app_handle
            .opener()
            .open_path(path_str, None::<&str>)
            .map_err(|e| format!("系统拉起失败: {}", e))
    }

    // 调起本地对话框，选择文件夹路径
    pub fn select_folder(&self) -> Result<Option<String>, String> {
        use tauri_plugin_dialog::DialogExt;
        let folder = self.app_handle
            .dialog()
            .file()
            .blocking_pick_folder();
        
        let path_str = folder
            .and_then(|f| f.into_path().ok())
            .map(|p| p.to_string_lossy().into_owned());
        
        Ok(path_str)
    }

    // 调起本地对话框，选择文件路径
    pub fn select_file(&self) -> Result<Option<String>, String> {
        use tauri_plugin_dialog::DialogExt;
        let file = self.app_handle
            .dialog()
            .file()
            .blocking_pick_file();

        let path_str = file
            .and_then(|f| f.into_path().ok())
            .map(|p| p.to_string_lossy().into_owned());

        Ok(path_str)
    }

    // 批量物理创建目录与文件结构
    pub fn create_directory_structure(&self, root_path: Option<String>, items: Vec<PathItem>) -> Result<(), String> {
        let base_path = match root_path {
            Some(ref r) if !r.trim().is_empty() => std::path::PathBuf::from(r),
            _ => {
                self.app_handle
                    .path()
                    .home_dir()
                    .map(|p| p.join(".monster-tools"))
                    .map_err(|e| format!("获取应用路径异常: {}", e))?
            }
        };

        for item in items {
            let clean_path = item.path.trim_start_matches('/').trim_start_matches('\\');
            let full_path = base_path.join(clean_path);
            if item.is_file {
                if let Some(parent) = full_path.parent() {
                    fs::create_dir_all(parent)
                        .map_err(|e| format!("创建目录失败 ({}): {}", parent.display(), e))?;
                }
                if !full_path.exists() {
                    File::create(&full_path)
                        .map_err(|e| format!("创建文件失败 ({}): {}", full_path.display(), e))?;
                }
            } else {
                fs::create_dir_all(&full_path)
                    .map_err(|e| format!("创建目录失败 ({}): {}", full_path.display(), e))?;
            }
        }
        Ok(())
    }

    // 查询占用特定端口的进程 PID 与名字
    pub fn find_port_process(&self, port: u16) -> Result<Vec<PortProcessInfo>, String> {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            let output = Command::new("cmd")
                .args(&["/C", "netstat -ano"])
                .output()
                .map_err(|e| format!("运行 netstat 失败: {}", e))?;

            let stdout_str = String::from_utf8_lossy(&output.stdout);
            let mut list = Vec::new();
            let port_suffix = format!(":{}", port);

            for line in stdout_str.lines() {
                let tokens: Vec<&str> = line.split_whitespace().collect();
                if tokens.len() < 4 {
                    continue;
                }
                let proto = tokens[0];
                if proto != "TCP" && proto != "UDP" {
                    continue;
                }
                let local_addr = tokens[1];
                let has_port = if let Some(pos) = local_addr.rfind(':') {
                    local_addr[pos..] == port_suffix
                } else {
                    false
                };

                if has_port {
                    let pid_str = tokens[tokens.len() - 1];
                    if let Ok(pid) = pid_str.parse::<u32>() {
                        if list.iter().any(|item: &PortProcessInfo| item.pid == pid) {
                            continue;
                        }
                        let state = if proto == "TCP" && tokens.len() >= 5 {
                            tokens[3].to_string()
                        } else {
                            "N/A".to_string()
                        };

                        let mut name = "Unknown".to_string();
                        if let Ok(task_out) = Command::new("cmd")
                            .args(&["/C", &format!("tasklist /FI \"PID eq {}\" /FO CSV /NH", pid)])
                            .output()
                        {
                            let task_str = String::from_utf8_lossy(&task_out.stdout);
                            if let Some(first_line) = task_str.lines().next() {
                                let parts: Vec<&str> = first_line.split(',').collect();
                                if !parts.is_empty() {
                                    name = parts[0].trim_matches('"').to_string();
                                }
                            }
                        }

                        list.push(PortProcessInfo {
                            proto: proto.to_string(),
                            local_addr: local_addr.to_string(),
                            state,
                            pid,
                            name,
                        });
                    }
                }
            }
            Ok(list)
        }

        #[cfg(not(target_os = "windows"))]
        {
            let _ = port;
            Ok(Vec::new())
        }
    }

    // 强杀特定 PID 的进程
    pub fn kill_process_by_pid(&self, pid: u32) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            let output = Command::new("cmd")
                .args(&["/C", &format!("taskkill /F /PID {}", pid)])
                .output()
                .map_err(|e| format!("执行 taskkill 异常: {}", e))?;

            if output.status.success() {
                Ok(())
            } else {
                let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
                Err(if err_msg.is_empty() {
                    String::from_utf8_lossy(&output.stdout).to_string()
                } else {
                    err_msg
                })
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            let _ = pid;
            Err("仅支持 Windows 平台进程强杀".to_string())
        }
    }

    // 读取物理目录并生成对应的树形结构字符串
    pub fn read_directory_tree(&self, dir_path: &str, skip_dirs: Vec<String>, max_depth: u32) -> Result<String, String> {
        let root = std::path::Path::new(dir_path);
        if !root.exists() {
            return Err("选择的文件夹路径不存在".to_string());
        }
        if !root.is_dir() {
            return Err("选择的路径不是一个有效的文件夹".to_string());
        }

        let root_name = root.file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "Root".to_string());

        let mut output = String::new();
        // 顶级目录
        output.push_str(&root_name);
        output.push('/');
        output.push('\n');

        // 开始递归遍历子项，初始深度为 0
        self.build_tree_string(root, &mut output, "", &skip_dirs, max_depth, 0)?;

        Ok(output)
    }

    fn build_tree_string(
        &self,
        dir: &std::path::Path,
        output: &mut String,
        prefix: &str,
        skip_dirs: &[String],
        max_depth: u32,
        current_depth: u32,
    ) -> Result<(), String> {
        // 深度限制拦截
        if current_depth >= max_depth {
            return Ok(());
        }

        let entries = fs::read_dir(dir)
            .map_err(|e| format!("无法读取目录 {}: {}", dir.display(), e))?;

        let mut paths: Vec<_> = entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .collect();

        // 排序：文件夹排在前，文件排在后；然后再按名称排序
        paths.sort_by(|a, b| {
            let a_is_dir = a.is_dir();
            let b_is_dir = b.is_dir();
            if a_is_dir != b_is_dir {
                b_is_dir.cmp(&a_is_dir)
            } else {
                a.file_name().cmp(&b.file_name())
            }
        });

        let count = paths.len();
        for (index, path) in paths.iter().enumerate() {
            let is_last = index == count - 1;
            let name = path.file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default();

            if name.is_empty() {
                continue;
            }

            // 输出当前项前缀
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
                // 判断当前目录是否在“跳过不递归的文件夹”列表中
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

#[derive(serde::Serialize)]
pub struct PortProcessInfo {
    pub proto: String,
    pub local_addr: String,
    pub state: String,
    pub pid: u32,
    pub name: String,
}

