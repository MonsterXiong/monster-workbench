use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};
use std::path::{Component, Path};
use tauri::{AppHandle, Window};

const MAX_BACKUP_TEXT_BYTES: u64 = 5 * 1024 * 1024;
const MAX_DIAGNOSTICS_BYTES: usize = 5 * 1024 * 1024;

pub struct SystemService {
    app_handle: AppHandle,
    path_provider: PathProvider,
}

#[derive(serde::Serialize)]
pub struct PortProcessInfo {
    pub proto: String,
    pub local_addr: String,
    pub state: String,
    pub pid: u32,
    pub name: String,
}

#[derive(serde::Serialize)]
pub struct ProcessInstanceInfo {
    pub name: String,
    pub pid: u32,
    pub session_name: String,
    pub session_num: u32,
    pub mem_usage: String,
}

impl SystemService {
    pub fn new(app_handle: AppHandle, path_provider: PathProvider) -> Self {
        Self {
            app_handle,
            path_provider,
        }
    }

    pub fn open_system_path(&self, path: &str) -> AppResult<()> {
        use tauri_plugin_opener::OpenerExt;
        self.app_handle
            .opener()
            .open_path(path, None::<&str>)
            .map_err(|e| AppError::Io(format!("系统拉起失败: {}", e)))
    }

    pub fn control_window(&self, action: &str, window: Window) -> AppResult<()> {
        match action {
            "minimize" => window
                .minimize()
                .map_err(|e| AppError::Io(format!("最小化失败: {}", e)))?,
            "maximize" => {
                let is_max = window.is_maximized().unwrap_or(false);
                if is_max {
                    window
                        .unmaximize()
                        .map_err(|e| AppError::Io(format!("取消最大化失败: {}", e)))?;
                } else {
                    window
                        .maximize()
                        .map_err(|e| AppError::Io(format!("最大化失败: {}", e)))?;
                }
            }
            "hide" => window
                .hide()
                .map_err(|e| AppError::Io(format!("隐藏窗口失败: {}", e)))?,
            "close" => window
                .close()
                .map_err(|e| AppError::Io(format!("关闭窗口失败: {}", e)))?,
            _ => {
                return Err(AppError::Config(format!(
                    "未识别的窗口控制指令: {}",
                    action
                )))
            }
        }
        Ok(())
    }

    pub fn find_port_process(&self, port: u16) -> AppResult<Vec<PortProcessInfo>> {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;

            let output = Command::new("cmd")
                .args(["/C", "netstat -ano"])
                .output()
                .map_err(|e| AppError::Process(format!("运行 netstat 失败: {}", e)))?;

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
                let has_port = local_addr
                    .rfind(':')
                    .map(|pos| local_addr[pos..] == port_suffix)
                    .unwrap_or(false);

                if !has_port {
                    continue;
                }

                let pid_str = tokens[tokens.len() - 1];
                let Ok(pid) = pid_str.parse::<u32>() else {
                    continue;
                };
                if list.iter().any(|item: &PortProcessInfo| item.pid == pid) {
                    continue;
                }

                let state = if proto == "TCP" && tokens.len() >= 5 {
                    tokens[3].to_string()
                } else {
                    "N/A".to_string()
                };

                let name = process_name_by_pid(pid).unwrap_or_else(|| "Unknown".to_string());
                list.push(PortProcessInfo {
                    proto: proto.to_string(),
                    local_addr: local_addr.to_string(),
                    state,
                    pid,
                    name,
                });
            }
            Ok(list)
        }

        #[cfg(not(target_os = "windows"))]
        {
            let _ = port;
            Ok(Vec::new())
        }
    }

    pub fn kill_process_by_pid(&self, pid: u32) -> AppResult<()> {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;

            let output = Command::new("cmd")
                .args(["/C", &format!("taskkill /F /PID {}", pid)])
                .output()
                .map_err(|e| AppError::Process(format!("执行 taskkill 异常: {}", e)))?;
            process_command_result(output)
        }

        #[cfg(not(target_os = "windows"))]
        {
            let _ = pid;
            Err(AppError::Process("仅支持 Windows 平台进程强杀".to_string()))
        }
    }

    pub fn kill_process_by_name(&self, name: &str) -> AppResult<()> {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;

            if !is_valid_process_name(name) {
                return Err(AppError::Process(
                    "进程名格式不正确（仅允许字母、数字、点、下划线及横线）".to_string(),
                ));
            }

            let output = Command::new("cmd")
                .args(["/C", &format!("taskkill /F /IM {}", name)])
                .output()
                .map_err(|e| AppError::Process(format!("执行 taskkill IM 异常: {}", e)))?;
            process_command_result(output)
        }

        #[cfg(not(target_os = "windows"))]
        {
            let _ = name;
            Err(AppError::Process("仅支持 Windows 平台进程强杀".to_string()))
        }
    }

    pub fn is_process_running(&self, name: &str) -> AppResult<bool> {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;

            if !is_valid_process_name(name) {
                return Err(AppError::Process("进程名格式不正确".to_string()));
            }

            let output = Command::new("cmd")
                .args(["/C", &format!("tasklist /FI \"IMAGENAME eq {}\" /NH", name)])
                .output()
                .map_err(|e| AppError::Process(format!("运行 tasklist 异常: {}", e)))?;

            let stdout_str = String::from_utf8_lossy(&output.stdout);
            Ok(stdout_str.to_lowercase().contains(&name.to_lowercase()))
        }

        #[cfg(not(target_os = "windows"))]
        {
            let _ = name;
            Ok(false)
        }
    }

    pub fn find_process_by_name(&self, name: &str) -> AppResult<String> {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;

            if !is_valid_process_name(name) {
                return Err(AppError::Process("进程名格式不正确".to_string()));
            }

            let output = Command::new("cmd")
                .args([
                    "/C",
                    &format!("tasklist /FI \"IMAGENAME eq {}\" /FO CSV /NH", name),
                ])
                .output()
                .map_err(|e| AppError::Process(format!("运行 tasklist 异常: {}", e)))?;

            let stdout_str = String::from_utf8_lossy(&output.stdout);
            let mut list = Vec::new();

            for line in stdout_str.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() || trimmed.starts_with("INFO:") {
                    continue;
                }

                let parts: Vec<&str> = trimmed.split("\",\"").collect();
                if parts.len() < 5 {
                    continue;
                }

                let Ok(pid) = parts[1].trim_matches('"').parse::<u32>() else {
                    continue;
                };
                let session_num = parts[3].trim_matches('"').parse::<u32>().unwrap_or(0);

                list.push(ProcessInstanceInfo {
                    name: parts[0].trim_matches('"').to_string(),
                    pid,
                    session_name: parts[2].trim_matches('"').to_string(),
                    session_num,
                    mem_usage: parts[4].trim_matches('"').to_string(),
                });
            }

            serde_json::to_string(&list)
                .map_err(|e| AppError::Unknown(format!("序列化进程实例列表失败: {}", e)))
        }

        #[cfg(not(target_os = "windows"))]
        {
            let _ = name;
            Ok("[]".to_string())
        }
    }

    pub fn write_text_file(&self, path: &str, contents: &str) -> AppResult<()> {
        let target = ensure_json_backup_path(path)?;
        if contents.len() as u64 > MAX_BACKUP_TEXT_BYTES {
            return Err(AppError::Permission(
                "备份文件内容过大，已拒绝写入".to_string(),
            ));
        }

        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent)?;
        }

        std::fs::write(target, contents)?;
        Ok(())
    }

    pub fn read_text_file(&self, path: &str) -> AppResult<String> {
        let target = ensure_json_backup_path(path)?;
        let metadata = std::fs::metadata(target)?;

        if metadata.len() > MAX_BACKUP_TEXT_BYTES {
            return Err(AppError::Permission("备份文件过大，已拒绝读取".to_string()));
        }

        std::fs::read_to_string(target).map_err(AppError::from)
    }

    pub fn export_system_diagnostics(
        &self,
        target_path: &str,
        current_time: &str,
    ) -> AppResult<()> {
        use std::fs::{self, File};
        use std::io::Write;

        let dest_path = ensure_diagnostics_export_path(target_path)?;
        let app_dir = self.path_provider.get_app_local_data_dir()?;
        let log_dir = app_dir.join("logs");

        let mut report = String::new();
        report.push_str("==================================================\n");
        report.push_str("        MONSTER WORKBENCH SYSTEM DIAGNOSTICS      \n");
        report.push_str("==================================================\n\n");
        report.push_str(&format!("Generated Time: {}\n", current_time));
        report.push_str(&format!(
            "App Version: {}\n",
            self.app_handle.package_info().version
        ));
        report.push_str(&format!("OS Platform: {}\n", std::env::consts::OS));
        report.push_str(&format!("CPU Architecture: {}\n", std::env::consts::ARCH));

        if let Ok(db_path) = self.path_provider.get_db_file_path() {
            report.push_str(&format!("Database Path: {}\n", db_path.to_string_lossy()));
            if let Ok(meta) = fs::metadata(&db_path) {
                report.push_str(&format!("Database Size: {} bytes\n", meta.len()));
            } else {
                report.push_str("Database Size: Unknown (File not found)\n");
            }
        }

        report.push_str("\n\n==================================================\n");
        report.push_str("              CLIENT EXCEPTION LOGS               \n");
        report.push_str("==================================================\n\n");

        append_recent_logs(&log_dir, &mut report);

        if let Some(parent) = dest_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let mut file = File::create(dest_path)?;
        file.write_all(report.as_bytes())?;
        Ok(())
    }
}

fn ensure_json_backup_path(path: &str) -> AppResult<&Path> {
    let target = Path::new(path);
    if !target.is_absolute() {
        return Err(AppError::Permission(
            "备份文件路径必须是绝对路径".to_string(),
        ));
    }
    if target
        .components()
        .any(|component| matches!(component, Component::ParentDir))
    {
        return Err(AppError::Permission(
            "备份文件路径不能包含上级目录跳转".to_string(),
        ));
    }
    if target.file_name().is_none() {
        return Err(AppError::Permission(
            "备份文件路径必须指向具体文件".to_string(),
        ));
    }
    let is_json = target
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("json"))
        .unwrap_or(false);
    if !is_json {
        return Err(AppError::Permission("仅允许读写 JSON 备份文件".to_string()));
    }
    Ok(target)
}

fn ensure_diagnostics_export_path(path: &str) -> AppResult<&Path> {
    let target = Path::new(path);
    if !target.is_absolute() {
        return Err(AppError::Permission(
            "诊断导出路径必须是绝对路径".to_string(),
        ));
    }
    if target
        .components()
        .any(|component| matches!(component, Component::ParentDir))
    {
        return Err(AppError::Permission(
            "诊断导出路径不能包含上级目录跳转".to_string(),
        ));
    }
    if target.file_name().is_none() {
        return Err(AppError::Permission(
            "诊断导出路径必须指向具体文件".to_string(),
        ));
    }
    let allowed = target
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| matches!(ext.to_ascii_lowercase().as_str(), "txt" | "log"))
        .unwrap_or(false);
    if !allowed {
        return Err(AppError::Permission(
            "诊断导出仅允许写入 .txt 或 .log 文件".to_string(),
        ));
    }
    Ok(target)
}

fn is_valid_process_name(name: &str) -> bool {
    name.chars()
        .all(|c| c.is_alphanumeric() || c == '.' || c == '-' || c == '_')
}

#[cfg(target_os = "windows")]
fn process_name_by_pid(pid: u32) -> Option<String> {
    use std::process::Command;

    let task_out = Command::new("cmd")
        .args([
            "/C",
            &format!("tasklist /FI \"PID eq {}\" /FO CSV /NH", pid),
        ])
        .output()
        .ok()?;
    let task_str = String::from_utf8_lossy(&task_out.stdout);
    let first_line = task_str.lines().next()?;
    let parts: Vec<&str> = first_line.split(',').collect();
    parts.first().map(|part| part.trim_matches('"').to_string())
}

#[cfg(target_os = "windows")]
fn process_command_result(output: std::process::Output) -> AppResult<()> {
    if output.status.success() {
        Ok(())
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        Err(AppError::Process(if err_msg.is_empty() {
            String::from_utf8_lossy(&output.stdout).to_string()
        } else {
            err_msg
        }))
    }
}

fn append_recent_logs(log_dir: &Path, report: &mut String) {
    use std::fs;

    if !log_dir.exists() || !log_dir.is_dir() {
        report.push_str("Logs directory does not exist.\n");
        return;
    }

    let Ok(entries) = fs::read_dir(log_dir) else {
        report.push_str("Failed to read logs directory.\n");
        return;
    };

    let mut log_files = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file()
            && path
                .extension()
                .map(|ext| ext.to_string_lossy().eq_ignore_ascii_case("log"))
                .unwrap_or(false)
        {
            log_files.push(path);
        }
    }

    log_files.sort_by(|a, b| b.cmp(a));
    let target_files = if log_files.len() > 7 {
        &log_files[0..7]
    } else {
        &log_files[..]
    };

    if target_files.is_empty() {
        report.push_str("No log files found in logs directory.\n");
        return;
    }

    for path in target_files {
        let file_name = path
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default();
        report.push_str(&format!("--- FILE: {} ---\n", file_name));

        if let Ok(content) = fs::read_to_string(path) {
            for line in content.lines() {
                report.push_str(&crate::infra::sensitive::sanitize_sensitive_text(line));
                report.push('\n');
                if report.len() > MAX_DIAGNOSTICS_BYTES {
                    report.push_str("\n[诊断报告过大，后续日志已截断]\n");
                    return;
                }
            }
        } else {
            report.push_str("<Failed to read log file content>\n");
        }
        report.push('\n');
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_root(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be valid")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "monster-workbench-system-{name}-{}-{nanos}",
            std::process::id()
        ))
    }

    fn path_string(path: PathBuf) -> String {
        path.to_string_lossy().into_owned()
    }

    #[test]
    fn json_backup_path_accepts_only_absolute_json_files() {
        let root = temp_root("json-backup");
        let accepted = path_string(root.join("backup.json"));
        let non_json = path_string(root.join("backup.txt"));
        let traversal = path_string(root.join("nested").join("..").join("backup.json"));

        assert!(ensure_json_backup_path(&accepted).is_ok());
        assert!(matches!(
            ensure_json_backup_path("backup.json").expect_err("relative path should fail"),
            AppError::Permission(_)
        ));
        assert!(matches!(
            ensure_json_backup_path(&non_json).expect_err("non-json path should fail"),
            AppError::Permission(_)
        ));
        assert!(matches!(
            ensure_json_backup_path(&traversal).expect_err("parent dir path should fail"),
            AppError::Permission(_)
        ));
    }

    #[test]
    fn diagnostics_export_path_accepts_only_absolute_txt_or_log_files() {
        let root = temp_root("diagnostics-path");
        let txt = path_string(root.join("diagnostics.txt"));
        let log = path_string(root.join("diagnostics.log"));
        let json = path_string(root.join("diagnostics.json"));

        assert!(ensure_diagnostics_export_path(&txt).is_ok());
        assert!(ensure_diagnostics_export_path(&log).is_ok());
        assert!(matches!(
            ensure_diagnostics_export_path("diagnostics.txt")
                .expect_err("relative path should fail"),
            AppError::Permission(_)
        ));
        assert!(matches!(
            ensure_diagnostics_export_path(&json).expect_err("json path should fail"),
            AppError::Permission(_)
        ));
    }

    #[test]
    fn append_recent_logs_sanitizes_historical_secret_lines() {
        let root = temp_root("sanitize-logs");
        let log_dir = root.join("logs");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&log_dir).expect("log dir should create");
        std::fs::write(
            log_dir.join("2026-06-08.log"),
            r#"apiKey=plain-secret Authorization: Bearer sk-live-secret {"password":"p@ss"}"#,
        )
        .expect("log file should write");

        let mut report = String::new();
        append_recent_logs(&log_dir, &mut report);

        assert!(!report.contains("plain-secret"));
        assert!(!report.contains("sk-live-secret"));
        assert!(!report.contains("p@ss"));
        assert!(report.contains("2026-06-08.log"));

        let _ = std::fs::remove_dir_all(&root);
    }
}
