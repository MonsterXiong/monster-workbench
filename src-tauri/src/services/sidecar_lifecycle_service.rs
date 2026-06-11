use crate::infra::{AppError, AppResult};
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, Runtime, Wry};

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
];

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarStatusSnapshot {
    pub status: String,
    pub port: Option<u16>,
    pub pid: Option<u32>,
    pub last_error: Option<String>,
    pub started_at: Option<String>,
    pub checked_at: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateImagePromptSidecarRequest {
    pub task_id: i64,
    pub project_id: Option<String>,
    pub brief: String,
    pub style: Option<String>,
    pub mood: Option<String>,
    pub aspect_ratio: Option<String>,
    pub attempt: i64,
    pub max_retries: i64,
    pub cancel_checkpoint_url: Option<String>,
    pub cancel_checkpoint_token: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarProviderConfig {
    pub provider_id: Option<String>,
    pub provider_type: Option<String>,
    pub display_name: Option<String>,
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub request_type: String,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SidecarWorkflowBudget {
    pub max_duration_ms: Option<u64>,
    pub max_images: Option<u64>,
    pub max_tokens: Option<u64>,
    pub max_cost_estimate: Option<f64>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchImagePromptSidecarRequest {
    pub task_id: i64,
    pub project_id: Option<String>,
    pub batch_job_id: i64,
    pub sequence_no: Option<i64>,
    pub prompt_request: String,
    pub provider: SidecarProviderConfig,
    pub budget: Option<SidecarWorkflowBudget>,
    pub attempt: i64,
    pub max_retries: i64,
    pub cancel_checkpoint_url: Option<String>,
    pub cancel_checkpoint_token: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchImageGenerateSidecarRequest {
    pub task_id: i64,
    pub project_id: Option<String>,
    pub batch_job_id: i64,
    pub sequence_no: Option<i64>,
    pub prompt_request: String,
    pub image_size: String,
    pub output_dir: String,
    pub provider: SidecarProviderConfig,
    pub budget: Option<SidecarWorkflowBudget>,
    pub attempt: i64,
    pub max_retries: i64,
    pub cancel_checkpoint_url: Option<String>,
    pub cancel_checkpoint_token: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarWorkflowOutput {
    pub asset_type: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub file_path: Option<String>,
    pub thumbnail_path: Option<String>,
    pub metadata: Option<Value>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarWorkflowModelRun {
    pub provider_id: Option<String>,
    pub provider_type: Option<String>,
    pub model: Option<String>,
    pub request_type: String,
    pub status: String,
    pub duration_ms: Option<i64>,
    pub prompt_hash: Option<String>,
    pub prompt_version_id: Option<String>,
    pub input_token_count: Option<i64>,
    pub output_token_count: Option<i64>,
    pub cost_estimate: Option<f64>,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub metadata: Option<Value>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarWorkflowEvent {
    pub event_type: String,
    pub message: Option<String>,
    pub payload: Option<Value>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarWorkflowRetry {
    pub should_retry: bool,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarWorkflowTaskResult {
    pub protocol_version: i64,
    pub task_id: i64,
    pub status: String,
    pub message: Option<String>,
    pub outputs: Vec<SidecarWorkflowOutput>,
    pub model_runs: Vec<SidecarWorkflowModelRun>,
    pub events: Vec<SidecarWorkflowEvent>,
    pub retry: Option<SidecarWorkflowRetry>,
}

pub struct SidecarLifecycleService<R: Runtime = Wry> {
    app_handle: AppHandle<R>,
    child: Option<Child>,
    runtime_token: Option<String>,
    snapshot: SidecarStatusSnapshot,
}

impl<R: Runtime> Drop for SidecarLifecycleService<R> {
    fn drop(&mut self) {
        let _ = self.stop_dev_health_server();
    }
}

impl<R: Runtime> SidecarLifecycleService<R> {
    pub fn new(app_handle: AppHandle<R>) -> Self {
        Self {
            app_handle,
            child: None,
            runtime_token: None,
            snapshot: SidecarStatusSnapshot {
                status: "stopped".to_string(),
                port: None,
                pid: None,
                last_error: None,
                started_at: None,
                checked_at: None,
            },
        }
    }

    pub fn get_status(&mut self) -> SidecarStatusSnapshot {
        self.refresh_exit_status();
        self.snapshot.clone()
    }

    #[cfg(test)]
    pub(crate) fn set_test_status(&mut self, status: &str, pid: Option<u32>) {
        self.snapshot.status = status.to_string();
        self.snapshot.pid = pid;
    }

    pub fn start_dev_health_server(&mut self) -> AppResult<SidecarStatusSnapshot> {
        self.refresh_exit_status();
        if matches!(
            self.snapshot.status.as_str(),
            "starting" | "running" | "unhealthy"
        ) {
            return self.check_health();
        }

        let port = reserve_port()?;
        let token = format!("monster-sidecar-{}", now_millis());
        let script_path = self.resolve_sidecar_script()?;
        let child = spawn_python_sidecar(&script_path, port, &token)?;

        self.snapshot.status = "starting".to_string();
        self.snapshot.port = Some(port);
        self.snapshot.pid = Some(child.id());
        self.snapshot.last_error = None;
        self.snapshot.started_at = Some(now_text());
        self.snapshot.checked_at = None;
        self.runtime_token = Some(token);
        self.child = Some(child);

        std::thread::sleep(Duration::from_millis(250));
        self.check_health()
    }

    pub fn check_health(&mut self) -> AppResult<SidecarStatusSnapshot> {
        self.refresh_exit_status();
        let Some(port) = self.snapshot.port else {
            return Ok(self.snapshot.clone());
        };
        let Some(token) = self.runtime_token.clone() else {
            return Ok(self.snapshot.clone());
        };

        match health_check(port, &token) {
            Ok(()) => {
                self.snapshot.status = "running".to_string();
                self.snapshot.last_error = None;
                self.snapshot.checked_at = Some(now_text());
                Ok(self.snapshot.clone())
            }
            Err(error) => {
                if self.child.is_some() {
                    self.snapshot.status = "unhealthy".to_string();
                }
                self.snapshot.last_error = Some(error.to_string());
                self.snapshot.checked_at = Some(now_text());
                Ok(self.snapshot.clone())
            }
        }
    }

    pub fn stop_dev_health_server(&mut self) -> AppResult<SidecarStatusSnapshot> {
        self.snapshot.status = "stopping".to_string();
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        self.snapshot.status = "stopped".to_string();
        self.snapshot.port = None;
        self.snapshot.pid = None;
        self.snapshot.checked_at = Some(now_text());
        self.runtime_token = None;
        Ok(self.snapshot.clone())
    }

    pub fn shutdown_reserved(&mut self) {
        let _ = self.stop_dev_health_server();
    }

    pub fn ensure_dev_server(&mut self) -> AppResult<SidecarStatusSnapshot> {
        let status = self.start_dev_health_server()?;
        if status.status != "running" {
            return Err(AppError::Process(format!(
                "sidecar did not reach running state: {}",
                status.status
            )));
        }
        Ok(status)
    }

    pub fn submit_generate_image_prompt(
        &mut self,
        request: GenerateImagePromptSidecarRequest,
    ) -> AppResult<SidecarWorkflowTaskResult> {
        self.ensure_dev_server()?;
        let port = self
            .snapshot
            .port
            .ok_or_else(|| AppError::Process("sidecar port is missing".to_string()))?;
        let token = self
            .runtime_token
            .clone()
            .ok_or_else(|| AppError::Process("sidecar runtime token is missing".to_string()))?;
        let budget = encode_budget(Some(SidecarWorkflowBudget {
            max_duration_ms: Some(120_000),
            max_images: None,
            max_tokens: Some(1024),
            max_cost_estimate: None,
        }))?;
        let read_timeout = budget_read_timeout(&budget);

        let payload = json!({
            "protocolVersion": 1,
            "taskId": request.task_id,
            "projectId": request.project_id,
            "taskType": "generate_image_prompt",
            "workflowType": "image_prompt",
            "attempt": request.attempt,
            "maxRetries": request.max_retries,
            "cancelToken": format!("task-{}", request.task_id),
            "budget": budget,
            "provider": Value::Null,
            "cancelCheckpoint": request
                .cancel_checkpoint_url
                .zip(request.cancel_checkpoint_token)
                .map(|(url, token)| json!({ "url": url, "token": token }))
                .unwrap_or(Value::Null),
            "input": {
                "brief": request.brief,
                "style": request.style,
                "mood": request.mood,
                "aspectRatio": request.aspect_ratio,
            },
            "context": {
                "sourceAssetIds": [],
                "parentTaskId": Value::Null,
                "batchJobId": Value::Null,
                "goalId": Value::Null,
            },
        });
        let response = post_json(port, &token, "/tasks", &payload, read_timeout)?;
        serde_json::from_str::<SidecarWorkflowTaskResult>(&response).map_err(|error| {
            AppError::Process(format!("failed to parse sidecar response: {error}"))
        })
    }

    pub fn submit_batch_image_prompt(
        &mut self,
        request: BatchImagePromptSidecarRequest,
    ) -> AppResult<SidecarWorkflowTaskResult> {
        self.ensure_dev_server()?;
        let port = self
            .snapshot
            .port
            .ok_or_else(|| AppError::Process("sidecar port is missing".to_string()))?;
        let token = self
            .runtime_token
            .clone()
            .ok_or_else(|| AppError::Process("sidecar runtime token is missing".to_string()))?;
        let budget = encode_budget(request.budget)?;
        let read_timeout = budget_read_timeout(&budget);

        let payload = json!({
            "protocolVersion": 1,
            "taskId": request.task_id,
            "projectId": request.project_id,
            "taskType": "demo.image.prompt",
            "workflowType": "batch_image_prompt",
            "attempt": request.attempt,
            "maxRetries": request.max_retries,
            "cancelToken": format!("task-{}", request.task_id),
            "budget": budget,
            "provider": {
                "providerId": request.provider.provider_id,
                "providerType": request.provider.provider_type,
                "displayName": request.provider.display_name,
                "baseUrl": request.provider.base_url,
                "apiKey": request.provider.api_key,
                "model": request.provider.model,
                "requestType": request.provider.request_type,
                "timeoutMs": request.provider.timeout_ms,
            },
            "cancelCheckpoint": request
                .cancel_checkpoint_url
                .zip(request.cancel_checkpoint_token)
                .map(|(url, token)| json!({ "url": url, "token": token }))
                .unwrap_or(Value::Null),
            "input": {
                "promptRequest": request.prompt_request,
            },
            "context": {
                "sourceAssetIds": [],
                "parentTaskId": Value::Null,
                "batchJobId": request.batch_job_id,
                "goalId": Value::Null,
                "sequenceNo": request.sequence_no,
            },
        });
        let response = post_json(port, &token, "/tasks", &payload, read_timeout)?;
        serde_json::from_str::<SidecarWorkflowTaskResult>(&response).map_err(|error| {
            AppError::Process(format!("failed to parse sidecar response: {error}"))
        })
    }

    pub fn submit_batch_image_generate(
        &mut self,
        request: BatchImageGenerateSidecarRequest,
    ) -> AppResult<SidecarWorkflowTaskResult> {
        self.ensure_dev_server()?;
        let port = self
            .snapshot
            .port
            .ok_or_else(|| AppError::Process("sidecar port is missing".to_string()))?;
        let token = self
            .runtime_token
            .clone()
            .ok_or_else(|| AppError::Process("sidecar runtime token is missing".to_string()))?;
        let budget = encode_budget(request.budget)?;
        let read_timeout = budget_read_timeout(&budget);

        let payload = json!({
            "protocolVersion": 1,
            "taskId": request.task_id,
            "projectId": request.project_id,
            "taskType": "demo.image.generate",
            "workflowType": "batch_image_generate",
            "attempt": request.attempt,
            "maxRetries": request.max_retries,
            "cancelToken": format!("task-{}", request.task_id),
            "budget": budget,
            "provider": {
                "providerId": request.provider.provider_id,
                "providerType": request.provider.provider_type,
                "displayName": request.provider.display_name,
                "baseUrl": request.provider.base_url,
                "apiKey": request.provider.api_key,
                "model": request.provider.model,
                "requestType": request.provider.request_type,
                "timeoutMs": request.provider.timeout_ms,
            },
            "cancelCheckpoint": request
                .cancel_checkpoint_url
                .zip(request.cancel_checkpoint_token)
                .map(|(url, token)| json!({ "url": url, "token": token }))
                .unwrap_or(Value::Null),
            "input": {
                "promptRequest": request.prompt_request,
                "imageSize": request.image_size,
                "outputDir": request.output_dir,
            },
            "context": {
                "sourceAssetIds": [],
                "parentTaskId": Value::Null,
                "batchJobId": request.batch_job_id,
                "goalId": Value::Null,
                "sequenceNo": request.sequence_no,
            },
        });
        let response = post_json(port, &token, "/tasks", &payload, read_timeout)?;
        serde_json::from_str::<SidecarWorkflowTaskResult>(&response).map_err(|error| {
            AppError::Process(format!("failed to parse sidecar response: {error}"))
        })
    }

    fn refresh_exit_status(&mut self) {
        let Some(child) = self.child.as_mut() else {
            return;
        };
        let outcome = match child.try_wait() {
            Ok(Some(status)) => Some(format!("sidecar exited with status {status}")),
            Ok(None) => None,
            Err(error) => Some(format!("sidecar status check failed: {error}")),
        };

        if let Some(message) = outcome {
            self.snapshot.status = "failed".to_string();
            self.snapshot.last_error = Some(message);
            self.snapshot.pid = None;
            self.runtime_token = None;
            self.child = None;
        }
    }

    fn resolve_sidecar_script(&self) -> AppResult<PathBuf> {
        let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("sidecars")
            .join("python")
            .join("creative_health_server.py");
        if dev_path.exists() {
            return Ok(dev_path);
        }

        let resource_path = self
            .app_handle
            .path()
            .resource_dir()
            .map_err(|error| AppError::Io(format!("failed to locate resource dir: {error}")))?
            .join("sidecars")
            .join("python")
            .join("creative_health_server.py");
        if resource_path.exists() {
            return Ok(resource_path);
        }

        Err(AppError::Io(
            "creative_health_server.py was not found".to_string(),
        ))
    }
}

fn reserve_port() -> AppResult<u16> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|error| AppError::Process(format!("failed to reserve port: {error}")))?;
    listener
        .local_addr()
        .map(|addr| addr.port())
        .map_err(|error| AppError::Process(format!("failed to read reserved port: {error}")))
}

fn health_check(port: u16, token: &str) -> AppResult<()> {
    let mut stream = TcpStream::connect_timeout(
        &format!("127.0.0.1:{port}")
            .parse()
            .map_err(|error| AppError::Process(format!("invalid health endpoint: {error}")))?,
        Duration::from_secs(1),
    )
    .map_err(|error| AppError::Process(format!("health connect failed: {error}")))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(1)))
        .map_err(|error| AppError::Process(format!("failed to set read timeout: {error}")))?;
    stream
        .set_write_timeout(Some(Duration::from_secs(1)))
        .map_err(|error| AppError::Process(format!("failed to set write timeout: {error}")))?;
    let request = format!(
        "GET /health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\nX-Monster-Token: {token}\r\n\r\n"
    );
    stream
        .write_all(request.as_bytes())
        .map_err(|error| AppError::Process(format!("health request failed: {error}")))?;

    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .map_err(|error| AppError::Process(format!("health response failed: {error}")))?;
    if response.contains("200 OK") && response.contains("\"ok\"") {
        return Ok(());
    }

    Err(AppError::Process(format!(
        "unexpected health response: {}",
        response.lines().next().unwrap_or("empty response")
    )))
}

fn post_json(
    port: u16,
    token: &str,
    path: &str,
    payload: &Value,
    read_timeout: Duration,
) -> AppResult<String> {
    let mut stream = TcpStream::connect_timeout(
        &format!("127.0.0.1:{port}")
            .parse()
            .map_err(|error| AppError::Process(format!("invalid sidecar endpoint: {error}")))?,
        Duration::from_secs(2),
    )
    .map_err(|error| AppError::Process(format!("sidecar connect failed: {error}")))?;
    stream
        .set_read_timeout(Some(read_timeout))
        .map_err(|error| AppError::Process(format!("failed to set read timeout: {error}")))?;
    stream
        .set_write_timeout(Some(Duration::from_secs(2)))
        .map_err(|error| AppError::Process(format!("failed to set write timeout: {error}")))?;

    let body = serde_json::to_string(payload)
        .map_err(|error| AppError::Process(format!("failed to encode sidecar payload: {error}")))?;
    let request = format!(
        "POST {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\nContent-Type: application/json\r\nContent-Length: {}\r\nX-Monster-Token: {token}\r\n\r\n{}",
        body.len(),
        body
    );
    stream
        .write_all(request.as_bytes())
        .map_err(|error| AppError::Process(format!("sidecar request failed: {error}")))?;

    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .map_err(|error| AppError::Process(format!("sidecar response failed: {error}")))?;
    if !response.contains("200 OK") && !response.contains("202 Accepted") {
        return Err(AppError::Process(format!(
            "unexpected sidecar response: {}",
            response.lines().next().unwrap_or("empty response")
        )));
    }

    response
        .split("\r\n\r\n")
        .nth(1)
        .map(|body| body.to_string())
        .ok_or_else(|| AppError::Process("sidecar response body is missing".to_string()))
}

fn encode_budget(budget: Option<SidecarWorkflowBudget>) -> AppResult<Value> {
    budget
        .map(serde_json::to_value)
        .transpose()
        .map_err(|error| AppError::Process(format!("failed to encode sidecar budget: {error}")))
        .map(|value| value.unwrap_or(Value::Null))
}

fn budget_read_timeout(budget: &Value) -> Duration {
    let max_duration_ms = budget
        .get("maxDurationMs")
        .and_then(Value::as_u64)
        .unwrap_or(120_000);
    let timeout_ms = max_duration_ms.saturating_add(5_000).clamp(3_000, 600_000);
    Duration::from_millis(timeout_ms)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sidecar_budget_encodes_contract_and_drives_read_timeout() {
        let budget = encode_budget(Some(SidecarWorkflowBudget {
            max_duration_ms: Some(15_000),
            max_images: Some(1),
            max_tokens: Some(512),
            max_cost_estimate: Some(0.25),
        }))
        .expect("budget should encode");

        assert_eq!(budget["maxDurationMs"], 15_000);
        assert_eq!(budget["maxImages"], 1);
        assert_eq!(budget["maxTokens"], 512);
        assert_eq!(budget["maxCostEstimate"], 0.25);
        assert_eq!(budget_read_timeout(&budget), Duration::from_millis(20_000));
    }

    #[test]
    fn missing_sidecar_budget_uses_default_read_timeout() {
        let budget = encode_budget(None).expect("missing budget should encode as null");

        assert!(budget.is_null());
        assert_eq!(budget_read_timeout(&budget), Duration::from_millis(125_000));
    }
}

fn spawn_python_sidecar(script_path: &Path, port: u16, token: &str) -> AppResult<Child> {
    let args = [
        script_path.to_string_lossy().to_string(),
        "--port".to_string(),
        port.to_string(),
        "--token".to_string(),
        token.to_string(),
    ];

    let mut errors = Vec::new();
    for (program, prefix) in [
        ("python", Vec::<String>::new()),
        ("py", vec!["-3".to_string()]),
    ] {
        let mut command = Command::new(program);
        let mut full_args = prefix;
        full_args.extend(args.iter().cloned());
        configure_python_sidecar_command(&mut command, &full_args, script_path);
        match command.spawn() {
            Ok(child) => return Ok(child),
            Err(error) => errors.push(format!("{program}: {error}")),
        }
    }

    Err(AppError::Process(format!(
        "failed to start sidecar python process: {}",
        errors.join("; ")
    )))
}

fn configure_python_sidecar_command(command: &mut Command, args: &[String], script_path: &Path) {
    command.env_clear();
    for name in PYTHON_SIDECAR_ENV_ALLOWLIST {
        if let Some(value) = std::env::var_os(name) {
            command.env(name, value);
        }
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
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
}

fn now_text() -> String {
    now_millis().to_string()
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}
