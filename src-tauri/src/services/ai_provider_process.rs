use crate::infra::sensitive::sanitize_sensitive_text;
use crate::infra::{AppError, AppResult};
use crate::services::ai_provider_types::AiProviderTestResult;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::thread::JoinHandle;

pub(super) const SIDECAR_STDOUT_MAX_BYTES: usize = 1024 * 1024;
pub(super) const SIDECAR_STDERR_MAX_BYTES: usize = 64 * 1024;

const SIDECAR_STDIO_PREVIEW_CHARS: usize = 16_384;
const PYTHON_SIDECAR_ENV_ALLOWLIST: &[&str] = &[
    "PATH",
    "Path",
    "PATHEXT",
    "SystemRoot",
    "WINDIR",
    "COMSPEC",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "HOME",
    "SSL_CERT_FILE",
    "SSL_CERT_DIR",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "NO_PROXY",
    "http_proxy",
    "https_proxy",
    "no_proxy",
];

pub(super) fn truncate_output(value: &str) -> String {
    value.chars().take(SIDECAR_STDIO_PREVIEW_CHARS).collect()
}

pub(super) fn configure_python_sidecar_command(
    command: &mut Command,
    args: &[String],
    script_path: &Path,
) {
    command.env_clear();
    preserve_python_sidecar_env(command);
    if let Some(registry_path) = resolve_provider_registry_path_for_sidecar(script_path) {
        command.env("MONSTER_AI_PROVIDER_REGISTRY_PATH", registry_path);
    }
    command
        .args(args)
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUTF8", "1")
        .env("PYTHONDONTWRITEBYTECODE", "1")
        .env("PYTHONNOUSERSITE", "1")
        .env_remove("PYTHONHOME")
        .env_remove("PYTHONPATH")
        .current_dir(script_path.parent().unwrap_or_else(|| Path::new(".")))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
}

fn resolve_provider_registry_path_for_sidecar(script_path: &Path) -> Option<PathBuf> {
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("src")
        .join("config")
        .join("ai-provider-registry.json");
    if dev_path.exists() {
        return Some(dev_path);
    }

    for ancestor in script_path.ancestors() {
        for candidate in [
            ancestor
                .join("src")
                .join("config")
                .join("ai-provider-registry.json"),
            ancestor.join("shared").join("ai-provider-registry.json"),
            ancestor.join("ai-provider-registry.json"),
        ] {
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }

    None
}

fn preserve_python_sidecar_env(command: &mut Command) {
    for name in PYTHON_SIDECAR_ENV_ALLOWLIST {
        if let Some(value) = std::env::var_os(name) {
            command.env(name, value);
        }
    }
}

pub(super) fn spawn_limited_output_reader<R>(
    mut reader: R,
    max_bytes: usize,
    label: &'static str,
) -> JoinHandle<AppResult<Vec<u8>>>
where
    R: Read + Send + 'static,
{
    std::thread::spawn(move || read_limited_output(&mut reader, max_bytes, label))
}

fn read_limited_output<R: Read>(
    reader: &mut R,
    max_bytes: usize,
    label: &str,
) -> AppResult<Vec<u8>> {
    let mut output = Vec::new();
    let mut buffer = [0_u8; 8192];

    loop {
        let read = reader
            .read(&mut buffer)
            .map_err(|error| AppError::Process(format!("读取 AI sidecar {label} 失败: {error}")))?;
        if read == 0 {
            return Ok(output);
        }

        if output.len().saturating_add(read) > max_bytes {
            return Err(AppError::Process(format!(
                "AI sidecar {label} 输出超过 {} KB，已停止读取",
                max_bytes / 1024
            )));
        }

        output.extend_from_slice(&buffer[..read]);
    }
}

pub(super) fn join_output_reader(
    handle: Option<JoinHandle<AppResult<Vec<u8>>>>,
) -> AppResult<Vec<u8>> {
    let Some(handle) = handle else {
        return Ok(Vec::new());
    };

    handle
        .join()
        .map_err(|_| AppError::Process("AI sidecar 输出读取线程异常".to_string()))?
}

pub(super) fn parse_sidecar_result(stdout: &str, stderr: &str) -> AppResult<AiProviderTestResult> {
    let stdout_preview = truncate_output(stdout);
    let stderr_preview = truncate_output(stderr);
    if stdout.as_bytes().len() > SIDECAR_STDOUT_MAX_BYTES {
        return Err(AppError::Process(format!(
            "AI sidecar 输出超过 {} MB，已拒绝解析；stdout={}; stderr={}",
            SIDECAR_STDOUT_MAX_BYTES / 1024 / 1024,
            sanitize_secret(&stdout_preview),
            sanitize_secret(&stderr_preview)
        )));
    }

    serde_json::from_str(stdout).map_err(|error| {
        AppError::Process(format!(
            "AI sidecar 输出格式异常: {}; stdout={}; stderr={}",
            error,
            sanitize_secret(&stdout_preview),
            sanitize_secret(&stderr_preview)
        ))
    })
}

pub(super) fn sanitize_secret(value: &str) -> String {
    sanitize_sensitive_text(value)
}

pub(super) fn terminate_child(child: &mut Child) {
    if matches!(child.try_wait(), Ok(Some(_))) {
        return;
    }

    let _ = child.kill();
    let _ = child.wait();
}

#[cfg(test)]
fn command_has_env(command: &Command, key: &str) -> bool {
    command
        .get_envs()
        .any(|(name, value)| name == std::ffi::OsStr::new(key) && value.is_some())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_result() -> AiProviderTestResult {
        AiProviderTestResult {
            request_id: Some("large-stdout".to_string()),
            ok: true,
            action: "models".to_string(),
            provider: "custom".to_string(),
            model: "chat-test".to_string(),
            base_url: "https://example.com/v1".to_string(),
            latency_ms: 100,
            queue_wait_ms: None,
            total_latency_ms: None,
            message: "模型列表查询成功".to_string(),
            status_code: Some(200),
            models: None,
            text: None,
            image_urls: None,
            image_paths: None,
            saved_files: None,
            api_image_size: None,
            requested_image_size: None,
            actual_image_size: None,
            fallback_image_size: None,
            image_attempts: None,
            failure_kind: None,
            raw_preview: Some("{}".to_string()),
        }
    }

    #[test]
    fn sanitize_secret_masks_common_token_markers() {
        let raw = "Authorization: Bearer sk-live-secret token=AIzaSySecretValue";
        let sanitized = sanitize_secret(raw);

        assert!(!sanitized.contains("sk-live-secret"));
        assert!(!sanitized.contains("AIzaSySecretValue"));
        assert!(sanitized.contains("["));
        assert_ne!(sanitized, raw);
    }

    #[test]
    fn sanitize_secret_masks_json_like_secret_values() {
        let raw = r#"{"apiKey":"plain-secret","password":"p@ss","authorization":"Basic abc"}"#;
        let sanitized = sanitize_secret(raw);

        assert!(!sanitized.contains("plain-secret"));
        assert!(!sanitized.contains("p@ss"));
        assert!(!sanitized.contains("Basic abc"));
        assert!(sanitized.contains(r#""apiKey":"[已脱敏]""#));
        assert!(sanitized.contains(r#""password":"[已脱敏]""#));
        assert!(sanitized.contains(r#""authorization":"[已脱敏]""#));
    }

    #[test]
    fn parse_sidecar_result_accepts_stdout_larger_than_preview_limit() {
        let models = (0..200)
            .map(|index| format!("model-{index}-{}", "x".repeat(180)))
            .collect::<Vec<_>>();
        let mut result = make_result();
        result.models = Some(models);
        let stdout = serde_json::to_string(&result).expect("result should serialize");

        assert!(stdout.chars().count() > SIDECAR_STDIO_PREVIEW_CHARS);
        let parsed = parse_sidecar_result(&stdout, "").expect("large stdout should parse");
        assert_eq!(parsed.request_id, Some("large-stdout".to_string()));
        assert_eq!(parsed.models.expect("models should exist").len(), 200);
    }

    #[test]
    fn parse_sidecar_result_rejects_oversized_stdout() {
        let stdout = format!(
            r#"{{"apiKey":"sk-should-not-leak","ok":true,"rawPreview":"{}"}}"#,
            "x".repeat(SIDECAR_STDOUT_MAX_BYTES + 1)
        );
        let error = parse_sidecar_result(&stdout, "")
            .expect_err("oversized stdout should be rejected")
            .to_response()
            .detail;

        assert!(error.contains("AI sidecar 输出超过"));
        assert!(!error.contains("sk-should-not-leak"));
        assert!(error.contains(r#""apiKey":"[已脱敏]""#));
    }

    #[test]
    fn read_limited_output_rejects_stream_over_limit() {
        let data = vec![b'x'; SIDECAR_STDERR_MAX_BYTES + 1];
        let mut reader = std::io::Cursor::new(data);
        let error = read_limited_output(&mut reader, SIDECAR_STDERR_MAX_BYTES, "stderr")
            .expect_err("oversized stream should be rejected")
            .to_response()
            .detail;

        assert!(error.contains("AI sidecar stderr 输出超过"));
    }

    #[test]
    fn terminate_child_reaps_finished_process_without_error() {
        let mut child = if cfg!(windows) {
            Command::new("cmd")
                .args(["/C", "exit", "0"])
                .spawn()
                .expect("cmd child should spawn")
        } else {
            Command::new("sh")
                .args(["-c", "exit 0"])
                .spawn()
                .expect("sh child should spawn")
        };

        child.wait().expect("child should finish");
        terminate_child(&mut child);
    }

    #[test]
    fn python_sidecar_command_uses_isolated_runtime_env() {
        let script_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("sidecars")
            .join("python")
            .join("ai_provider_tester.py");
        let args = vec![script_path.to_string_lossy().to_string()];
        let mut command = Command::new("python");

        configure_python_sidecar_command(&mut command, &args, &script_path);

        assert!(command_has_env(&command, "PYTHONIOENCODING"));
        assert!(command_has_env(&command, "PYTHONUTF8"));
        assert!(command_has_env(&command, "PYTHONDONTWRITEBYTECODE"));
        assert!(command_has_env(&command, "PYTHONNOUSERSITE"));
        assert!(!command_has_env(&command, "PYTHONPATH"));
        assert!(!command_has_env(&command, "PYTHONHOME"));
        assert_eq!(command.get_current_dir(), script_path.parent());
        assert_eq!(
            command.get_args().collect::<Vec<_>>(),
            vec![std::ffi::OsStr::new(args[0].as_str())]
        );
    }
}
