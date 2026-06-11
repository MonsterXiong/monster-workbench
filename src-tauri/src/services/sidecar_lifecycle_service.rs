use crate::infra::{AppError, AppResult};
use serde_json::{json, Value};
use std::collections::{HashSet, VecDeque};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, Runtime, Wry};

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
const BATCH_IMAGE_PROMPT_TASK_TYPE: &str = "image.prompt.batch";
const BATCH_IMAGE_PROMPT_WORKFLOW_TYPE: &str = "image.prompt.batch";
const BATCH_IMAGE_GENERATE_TASK_TYPE: &str = "image.generate.batch";
const BATCH_IMAGE_GENERATE_WORKFLOW_TYPE: &str = "image.generate.batch";
const SIDECAR_RECOVERY_BACKOFF_MS: u128 = 5_000;
const SIDECAR_SHUTDOWN_TIMEOUT_MS: u64 = 1_000;
const SIDECAR_STATUS_EVENT_THROTTLE_MS: u128 = 1_000;
const SIDECAR_STATUS_EVENT_NAME: &str = "creative-sidecar-status-changed";
const SIDECAR_RUNTIME_EVENT_DEDUPE_LIMIT: usize = 2_000;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarStatusSnapshot {
    pub status: String,
    pub port: Option<u16>,
    pub pid: Option<u32>,
    pub last_error: Option<String>,
    pub started_at: Option<String>,
    pub checked_at: Option<String>,
    pub recovery_failure_count: u64,
    pub last_recovery_failure_at: Option<String>,
    pub recovery_backoff_remaining_ms: Option<u64>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarStatusEventPayload {
    pub event_type: String,
    pub message: Option<String>,
    pub status: String,
    pub port: Option<u16>,
    pub pid: Option<u32>,
    pub last_error: Option<String>,
    pub started_at: Option<String>,
    pub checked_at: Option<String>,
    pub recovery_failure_count: u64,
    pub last_recovery_failure_at: Option<String>,
    pub recovery_backoff_remaining_ms: Option<u64>,
    pub created_at: String,
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

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarRuntimeEvent {
    pub id: u64,
    #[serde(default)]
    pub runtime_instance_id: Option<String>,
    #[serde(default)]
    pub runtime_started_at: Option<String>,
    pub task_id: Option<i64>,
    pub workflow_type: Option<String>,
    pub event_type: String,
    pub message: Option<String>,
    pub payload: Option<Value>,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarRuntimeEventsResponse {
    pub ok: bool,
    #[serde(default)]
    pub runtime_instance_id: Option<String>,
    #[serde(default)]
    pub runtime_started_at: Option<String>,
    pub next_cursor: u64,
    pub events: Vec<SidecarRuntimeEvent>,
}

#[derive(Debug, Clone)]
pub struct SidecarRuntimeEndpoint {
    pub port: u16,
    pub token: String,
}

pub struct SidecarLifecycleService<R: Runtime = Wry> {
    app_handle: AppHandle<R>,
    child: Option<Child>,
    runtime_token: Option<String>,
    recovery_backoff_until: Option<u128>,
    last_status_event_status: Option<String>,
    last_status_event_at: Option<u128>,
    observed_runtime_event_keys: HashSet<String>,
    observed_runtime_event_order: VecDeque<String>,
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
            recovery_backoff_until: None,
            last_status_event_status: None,
            last_status_event_at: None,
            observed_runtime_event_keys: HashSet::new(),
            observed_runtime_event_order: VecDeque::new(),
            snapshot: SidecarStatusSnapshot {
                status: "stopped".to_string(),
                port: None,
                pid: None,
                last_error: None,
                started_at: None,
                checked_at: None,
                recovery_failure_count: 0,
                last_recovery_failure_at: None,
                recovery_backoff_remaining_ms: None,
            },
        }
    }

    pub fn get_status(&mut self) -> SidecarStatusSnapshot {
        self.refresh_exit_status();
        self.snapshot_with_observability()
    }

    fn reset_recovery_circuit(&mut self) {
        self.recovery_backoff_until = None;
        self.snapshot.recovery_backoff_remaining_ms = None;
    }

    fn open_recovery_circuit(&mut self) {
        self.recovery_backoff_until =
            Some(now_millis().saturating_add(SIDECAR_RECOVERY_BACKOFF_MS));
        self.snapshot.recovery_backoff_remaining_ms = Some(SIDECAR_RECOVERY_BACKOFF_MS as u64);
    }

    fn mark_recovery_failure(&mut self, message: String) {
        let now = now_text();
        self.snapshot.status = "failed".to_string();
        self.snapshot.last_error = Some(message.clone());
        self.snapshot.checked_at = Some(now.clone());
        self.snapshot.recovery_failure_count =
            self.snapshot.recovery_failure_count.saturating_add(1);
        self.snapshot.last_recovery_failure_at = Some(now);
        self.open_recovery_circuit();
        self.emit_status_event("recovery_failed", Some(message), true);
    }

    fn recovery_circuit_remaining_ms(&self) -> Option<u128> {
        self.recovery_backoff_until
            .map(|deadline| deadline.saturating_sub(now_millis()))
    }

    fn recovery_circuit_is_open(&self) -> bool {
        self.recovery_circuit_remaining_ms()
            .map(|remaining| remaining > 0)
            .unwrap_or(false)
    }

    fn snapshot_with_observability(&self) -> SidecarStatusSnapshot {
        let mut snapshot = self.snapshot.clone();
        snapshot.recovery_backoff_remaining_ms =
            self.recovery_circuit_remaining_ms().and_then(|remaining| {
                if remaining == 0 {
                    None
                } else {
                    Some(remaining.min(u64::MAX as u128) as u64)
                }
            });
        snapshot
    }

    fn emit_status_event(&mut self, event_type: &str, message: Option<String>, force: bool) {
        let now = now_millis();
        let status_changed = self
            .last_status_event_status
            .as_deref()
            .map(|status| status != self.snapshot.status)
            .unwrap_or(true);
        let throttle_expired = self
            .last_status_event_at
            .map(|last| now.saturating_sub(last) >= SIDECAR_STATUS_EVENT_THROTTLE_MS)
            .unwrap_or(true);
        if !force && !status_changed && !throttle_expired {
            return;
        }

        let snapshot = self.snapshot_with_observability();
        let payload = SidecarStatusEventPayload {
            event_type: event_type.to_string(),
            message,
            status: snapshot.status.clone(),
            port: snapshot.port,
            pid: snapshot.pid,
            last_error: snapshot.last_error,
            started_at: snapshot.started_at,
            checked_at: snapshot.checked_at,
            recovery_failure_count: snapshot.recovery_failure_count,
            last_recovery_failure_at: snapshot.last_recovery_failure_at,
            recovery_backoff_remaining_ms: snapshot.recovery_backoff_remaining_ms,
            created_at: now_text(),
        };
        let _ = self.app_handle.emit(SIDECAR_STATUS_EVENT_NAME, payload);
        self.last_status_event_status = Some(snapshot.status);
        self.last_status_event_at = Some(now);
    }

    #[cfg(test)]
    pub(crate) fn set_test_endpoint(&mut self, port: u16, token: &str) {
        self.snapshot.status = "running".to_string();
        self.snapshot.port = Some(port);
        self.snapshot.pid = Some(42);
        self.snapshot.last_error = None;
        self.runtime_token = Some(token.to_string());
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
        self.emit_status_event("starting", Some("sidecar starting".to_string()), true);

        std::thread::sleep(Duration::from_millis(250));
        self.check_health()
    }

    pub fn check_health(&mut self) -> AppResult<SidecarStatusSnapshot> {
        self.refresh_exit_status();
        let Some(port) = self.snapshot.port else {
            return Ok(self.snapshot_with_observability());
        };
        let Some(token) = self.runtime_token.clone() else {
            return Ok(self.snapshot_with_observability());
        };

        match health_check(port, &token) {
            Ok(()) => {
                self.snapshot.status = "running".to_string();
                self.snapshot.last_error = None;
                self.snapshot.checked_at = Some(now_text());
                self.reset_recovery_circuit();
                self.emit_status_event(
                    "health_ok",
                    Some("sidecar health check ok".to_string()),
                    false,
                );
                Ok(self.snapshot_with_observability())
            }
            Err(error) => {
                if self.child.is_some() {
                    self.snapshot.status = "unhealthy".to_string();
                }
                let message = error.to_string();
                self.snapshot.last_error = Some(message.clone());
                self.snapshot.checked_at = Some(now_text());
                self.emit_status_event("health_failed", Some(message), false);
                Ok(self.snapshot_with_observability())
            }
        }
    }

    pub fn stop_dev_health_server(&mut self) -> AppResult<SidecarStatusSnapshot> {
        self.snapshot.status = "stopping".to_string();
        self.emit_status_event("stopping", Some("sidecar stopping".to_string()), true);
        if let (Some(port), Some(token)) = (self.snapshot.port, self.runtime_token.as_deref()) {
            let _ = request_shutdown(port, token);
        }
        if let Some(mut child) = self.child.take() {
            if !wait_child_exit(
                &mut child,
                Duration::from_millis(SIDECAR_SHUTDOWN_TIMEOUT_MS),
            ) {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
        self.snapshot.status = "stopped".to_string();
        self.snapshot.port = None;
        self.snapshot.pid = None;
        self.snapshot.checked_at = Some(now_text());
        self.runtime_token = None;
        self.reset_recovery_circuit();
        self.emit_status_event("stopped", Some("sidecar stopped".to_string()), true);
        Ok(self.snapshot_with_observability())
    }

    pub fn shutdown_reserved(&mut self) {
        let _ = self.stop_dev_health_server();
    }

    pub fn ensure_dev_server(&mut self) -> AppResult<SidecarStatusSnapshot> {
        self.refresh_exit_status();
        if matches!(self.snapshot.status.as_str(), "unhealthy" | "failed")
            && self.recovery_circuit_is_open()
        {
            let remaining_ms = self.recovery_circuit_remaining_ms().unwrap_or(0);
            self.emit_status_event(
                "recovery_backoff_active",
                Some(format!(
                    "sidecar recovery backoff active for {remaining_ms}ms"
                )),
                false,
            );
            return Err(AppError::Process(format!(
                "sidecar recovery circuit open for {remaining_ms}ms after {}: {}",
                self.snapshot.status,
                self.snapshot
                    .last_error
                    .clone()
                    .unwrap_or_else(|| "unknown".to_string())
            )));
        }

        let status = match self.start_dev_health_server() {
            Ok(status) => status,
            Err(error) => {
                let message = error.to_string();
                self.mark_recovery_failure(message);
                return Err(error);
            }
        };
        if status.status == "running" {
            return Ok(status);
        }

        if matches!(status.status.as_str(), "unhealthy" | "failed") {
            let previous_status = status.status.clone();
            let previous_error = status.last_error.clone();
            let _ = self.stop_dev_health_server();
            let recovered = match self.start_dev_health_server() {
                Ok(status) => status,
                Err(error) => {
                    let error_message = error.to_string();
                    self.mark_recovery_failure(error_message.clone());
                    return Err(AppError::Process(format!(
                        "sidecar recovery failed after {previous_status}: start failed: {error_message}; previous error: {}",
                        previous_error.unwrap_or_else(|| "unknown".to_string())
                    )));
                }
            };
            if recovered.status == "running" {
                self.reset_recovery_circuit();
                return Ok(self.snapshot_with_observability());
            }

            let message = format!(
                "sidecar recovery failed after {previous_status}: {}; previous error: {}",
                recovered.status,
                previous_error.unwrap_or_else(|| "unknown".to_string())
            );
            self.mark_recovery_failure(message.clone());
            return Err(AppError::Process(message));
        }

        Err(AppError::Process(format!(
            "sidecar did not reach running state: {}",
            status.status
        )))
    }

    pub fn ensure_runtime_endpoint(&mut self) -> AppResult<SidecarRuntimeEndpoint> {
        let status = self.ensure_dev_server()?;
        let port = status
            .port
            .ok_or_else(|| AppError::Process("sidecar port is missing".to_string()))?;
        let token = self
            .runtime_token
            .clone()
            .ok_or_else(|| AppError::Process("sidecar runtime token is missing".to_string()))?;

        Ok(SidecarRuntimeEndpoint { port, token })
    }

    #[allow(dead_code)]
    pub fn submit_generate_image_prompt(
        &mut self,
        request: GenerateImagePromptSidecarRequest,
    ) -> AppResult<SidecarWorkflowTaskResult> {
        let endpoint = self.ensure_runtime_endpoint()?;
        Self::submit_generate_image_prompt_to_endpoint(&endpoint, request)
    }

    pub fn submit_generate_image_prompt_to_endpoint(
        endpoint: &SidecarRuntimeEndpoint,
        request: GenerateImagePromptSidecarRequest,
    ) -> AppResult<SidecarWorkflowTaskResult> {
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
        let response = post_json(
            endpoint.port,
            &endpoint.token,
            "/tasks",
            &payload,
            read_timeout,
        )?;
        serde_json::from_str::<SidecarWorkflowTaskResult>(&response).map_err(|error| {
            AppError::Process(format!("failed to parse sidecar response: {error}"))
        })
    }

    #[allow(dead_code)]
    pub fn submit_batch_image_prompt(
        &mut self,
        request: BatchImagePromptSidecarRequest,
    ) -> AppResult<SidecarWorkflowTaskResult> {
        let endpoint = self.ensure_runtime_endpoint()?;
        Self::submit_batch_image_prompt_to_endpoint(&endpoint, request)
    }

    pub fn submit_batch_image_prompt_to_endpoint(
        endpoint: &SidecarRuntimeEndpoint,
        request: BatchImagePromptSidecarRequest,
    ) -> AppResult<SidecarWorkflowTaskResult> {
        let budget = encode_budget(request.budget)?;
        let read_timeout = budget_read_timeout(&budget);

        let payload = json!({
            "protocolVersion": 1,
            "taskId": request.task_id,
            "projectId": request.project_id,
            "taskType": BATCH_IMAGE_PROMPT_TASK_TYPE,
            "workflowType": BATCH_IMAGE_PROMPT_WORKFLOW_TYPE,
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
        let response = post_json(
            endpoint.port,
            &endpoint.token,
            "/tasks",
            &payload,
            read_timeout,
        )?;
        serde_json::from_str::<SidecarWorkflowTaskResult>(&response).map_err(|error| {
            AppError::Process(format!("failed to parse sidecar response: {error}"))
        })
    }

    #[allow(dead_code)]
    pub fn submit_batch_image_generate(
        &mut self,
        request: BatchImageGenerateSidecarRequest,
    ) -> AppResult<SidecarWorkflowTaskResult> {
        let endpoint = self.ensure_runtime_endpoint()?;
        Self::submit_batch_image_generate_to_endpoint(&endpoint, request)
    }

    pub fn submit_batch_image_generate_to_endpoint(
        endpoint: &SidecarRuntimeEndpoint,
        request: BatchImageGenerateSidecarRequest,
    ) -> AppResult<SidecarWorkflowTaskResult> {
        let budget = encode_budget(request.budget)?;
        let read_timeout = budget_read_timeout(&budget);

        let payload = json!({
            "protocolVersion": 1,
            "taskId": request.task_id,
            "projectId": request.project_id,
            "taskType": BATCH_IMAGE_GENERATE_TASK_TYPE,
            "workflowType": BATCH_IMAGE_GENERATE_WORKFLOW_TYPE,
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
        let response = post_json(
            endpoint.port,
            &endpoint.token,
            "/tasks",
            &payload,
            read_timeout,
        )?;
        serde_json::from_str::<SidecarWorkflowTaskResult>(&response).map_err(|error| {
            AppError::Process(format!("failed to parse sidecar response: {error}"))
        })
    }

    pub fn poll_runtime_events(
        &mut self,
        after: Option<u64>,
        limit: Option<u64>,
    ) -> AppResult<SidecarRuntimeEventsResponse> {
        let endpoint = self.ensure_runtime_endpoint()?;
        Self::poll_runtime_events_from_endpoint(&endpoint, after, limit)
    }

    pub fn poll_runtime_events_from_endpoint(
        endpoint: &SidecarRuntimeEndpoint,
        after: Option<u64>,
        limit: Option<u64>,
    ) -> AppResult<SidecarRuntimeEventsResponse> {
        let after = after.unwrap_or(0);
        let limit = limit.unwrap_or(100).clamp(1, 500);
        let response = get_json(
            endpoint.port,
            &endpoint.token,
            &format!("/events?after={after}&limit={limit}"),
            Duration::from_secs(5),
        )?;
        serde_json::from_str::<SidecarRuntimeEventsResponse>(&response).map_err(|error| {
            AppError::Process(format!("failed to parse sidecar events response: {error}"))
        })
    }

    pub fn take_new_runtime_events_for_diagnostics(
        &mut self,
        response: &SidecarRuntimeEventsResponse,
    ) -> Vec<SidecarRuntimeEvent> {
        let mut events = Vec::new();
        for event in &response.events {
            let Some(key) = runtime_event_source_key(response, event) else {
                continue;
            };
            if self.observed_runtime_event_keys.contains(&key) {
                continue;
            }
            self.remember_runtime_event_key(key);
            events.push(event.clone());
        }
        events
    }

    fn remember_runtime_event_key(&mut self, key: String) {
        self.observed_runtime_event_keys.insert(key.clone());
        self.observed_runtime_event_order.push_back(key);
        while self.observed_runtime_event_order.len() > SIDECAR_RUNTIME_EVENT_DEDUPE_LIMIT {
            if let Some(oldest) = self.observed_runtime_event_order.pop_front() {
                self.observed_runtime_event_keys.remove(&oldest);
            }
        }
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
            self.snapshot.checked_at = Some(now_text());
            self.emit_status_event("process_exited", self.snapshot.last_error.clone(), true);
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

fn request_shutdown(port: u16, token: &str) -> AppResult<()> {
    let mut stream = TcpStream::connect_timeout(
        &format!("127.0.0.1:{port}")
            .parse()
            .map_err(|error| AppError::Process(format!("invalid shutdown endpoint: {error}")))?,
        Duration::from_millis(500),
    )
    .map_err(|error| AppError::Process(format!("shutdown connect failed: {error}")))?;
    stream
        .set_read_timeout(Some(Duration::from_millis(500)))
        .map_err(|error| {
            AppError::Process(format!("failed to set shutdown read timeout: {error}"))
        })?;
    stream
        .set_write_timeout(Some(Duration::from_millis(500)))
        .map_err(|error| {
            AppError::Process(format!("failed to set shutdown write timeout: {error}"))
        })?;
    let request = format!(
        "POST /shutdown HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\nContent-Length: 0\r\nX-Monster-Token: {token}\r\n\r\n"
    );
    stream
        .write_all(request.as_bytes())
        .map_err(|error| AppError::Process(format!("shutdown request failed: {error}")))?;

    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .map_err(|error| AppError::Process(format!("shutdown response failed: {error}")))?;
    if response.contains("200 OK") && response.contains("shutting_down") {
        return Ok(());
    }

    Err(AppError::Process(format!(
        "unexpected shutdown response: {}",
        response.lines().next().unwrap_or("empty response")
    )))
}

fn wait_child_exit(child: &mut Child, timeout: Duration) -> bool {
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => return true,
            Ok(None) if started.elapsed() < timeout => {
                std::thread::sleep(Duration::from_millis(50));
            }
            Ok(None) => return false,
            Err(_) => return false,
        }
    }
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

fn get_json(port: u16, token: &str, path: &str, read_timeout: Duration) -> AppResult<String> {
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

    let request = format!(
        "GET {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\nAccept: application/json\r\nX-Monster-Token: {token}\r\n\r\n"
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

fn runtime_event_source_key(
    response: &SidecarRuntimeEventsResponse,
    event: &SidecarRuntimeEvent,
) -> Option<String> {
    let runtime_instance_id = event
        .runtime_instance_id
        .as_deref()
        .or(response.runtime_instance_id.as_deref())?;
    let runtime_started_at = event
        .runtime_started_at
        .as_deref()
        .or(response.runtime_started_at.as_deref())?;
    Some(format!(
        "{}|{}|{}",
        runtime_instance_id, runtime_started_at, event.id
    ))
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
    use std::sync::mpsc;

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

    #[test]
    fn recovery_failure_opens_circuit() {
        let app = tauri::test::mock_app();
        let mut service = SidecarLifecycleService::new(app.handle().clone());

        service.mark_recovery_failure("sidecar failed to start".to_string());
        let status = service.get_status();

        assert_eq!(service.snapshot.status, "failed");
        assert_eq!(
            service.snapshot.last_error.as_deref(),
            Some("sidecar failed to start")
        );
        assert!(service.recovery_circuit_is_open());
        assert_eq!(status.recovery_failure_count, 1);
        assert!(status.last_recovery_failure_at.is_some());
        assert!(status.recovery_backoff_remaining_ms.is_some());
        assert_eq!(service.last_status_event_status.as_deref(), Some("failed"));
    }

    #[test]
    fn status_events_throttle_repeated_status() {
        let app = tauri::test::mock_app();
        let mut service = SidecarLifecycleService::new(app.handle().clone());
        service.snapshot.status = "running".to_string();

        service.emit_status_event("health_ok", Some("ok".to_string()), false);
        let first_event_at = service
            .last_status_event_at
            .expect("first event should set timestamp");

        service.emit_status_event("health_ok", Some("ok again".to_string()), false);
        assert_eq!(service.last_status_event_at, Some(first_event_at));

        service.snapshot.status = "unhealthy".to_string();
        service.emit_status_event("health_failed", Some("failed".to_string()), false);
        assert_eq!(
            service.last_status_event_status.as_deref(),
            Some("unhealthy")
        );
    }

    #[test]
    fn ensure_dev_server_respects_recovery_circuit() {
        let app = tauri::test::mock_app();
        let mut service = SidecarLifecycleService::new(app.handle().clone());
        service.snapshot.status = "failed".to_string();
        service.snapshot.last_error = Some("previous recovery failed".to_string());
        service.recovery_backoff_until =
            Some(now_millis().saturating_add(SIDECAR_RECOVERY_BACKOFF_MS));

        let error = service
            .ensure_dev_server()
            .expect_err("open circuit should block recovery");

        assert!(error.to_string().contains("recovery circuit open"));
        assert_eq!(service.snapshot.status, "failed");
    }

    #[test]
    fn stop_dev_health_server_clears_recovery_circuit() {
        let app = tauri::test::mock_app();
        let mut service = SidecarLifecycleService::new(app.handle().clone());
        service.snapshot.status = "failed".to_string();
        service.recovery_backoff_until =
            Some(now_millis().saturating_add(SIDECAR_RECOVERY_BACKOFF_MS));

        let snapshot = service
            .stop_dev_health_server()
            .expect("stop should clear recovery circuit");

        assert_eq!(snapshot.status, "stopped");
        assert!(service.recovery_backoff_until.is_none());
        assert_eq!(snapshot.recovery_failure_count, 0);
        assert!(snapshot.recovery_backoff_remaining_ms.is_none());
    }

    #[test]
    fn stop_dev_health_server_requests_graceful_shutdown() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("listener should bind");
        let port = listener
            .local_addr()
            .expect("listener addr should exist")
            .port();
        let token = "sidecar-shutdown-test";
        let (request_tx, request_rx) = mpsc::channel();
        let handle = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("shutdown request should arrive");
            let request = read_test_http_request(&mut stream);
            request_tx
                .send(request.clone())
                .expect("shutdown request should send");
            write_test_json_response(&mut stream, r#"{"ok":true,"status":"shutting_down"}"#);
        });

        let app = tauri::test::mock_app();
        let mut service = SidecarLifecycleService::new(app.handle().clone());
        service.set_test_endpoint(port, token);

        let snapshot = service
            .stop_dev_health_server()
            .expect("stop should request graceful shutdown");

        handle.join().expect("shutdown server should finish");
        let request = request_rx
            .recv()
            .expect("shutdown request should be captured");

        assert!(request.starts_with("POST /shutdown "));
        assert!(request.contains(&format!("X-Monster-Token: {token}")));
        assert_eq!(snapshot.status, "stopped");
        assert!(service.recovery_backoff_until.is_none());
        assert_eq!(snapshot.recovery_failure_count, 0);
    }

    #[test]
    fn poll_runtime_events_uses_cursor_query_and_parses_events() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("listener should bind");
        let port = listener
            .local_addr()
            .expect("listener addr should exist")
            .port();
        let token = "sidecar-events-test";
        let (request_tx, request_rx) = mpsc::channel();
        let handle = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("events request should arrive");
            let request = read_test_http_request(&mut stream);
            request_tx
                .send(request.clone())
                .expect("events request should send");
            write_test_json_response(
                &mut stream,
                r#"{"ok":true,"runtimeInstanceId":"runtime-test-1","runtimeStartedAt":"2026-06-12T07:59:00Z","nextCursor":15,"events":[{"id":13,"runtimeInstanceId":"runtime-test-1","runtimeStartedAt":"2026-06-12T07:59:00Z","taskId":77,"workflowType":"image_prompt","eventType":"workflow_step_completed","message":"prompt built","payload":{"workflowType":"image_prompt"},"createdAt":"2026-06-12T08:00:00Z"}]}"#,
            );
        });

        let events = SidecarLifecycleService::<Wry>::poll_runtime_events_from_endpoint(
            &SidecarRuntimeEndpoint {
                port,
                token: token.to_string(),
            },
            Some(12),
            Some(2),
        )
        .expect("events should parse");

        handle.join().expect("events server should finish");
        let request = request_rx
            .recv()
            .expect("events request should be captured");

        assert!(request.starts_with("GET /events?after=12&limit=2 "));
        assert!(request.contains(&format!("X-Monster-Token: {token}")));
        assert!(events.ok);
        assert_eq!(
            events.runtime_instance_id.as_deref(),
            Some("runtime-test-1")
        );
        assert_eq!(
            events.runtime_started_at.as_deref(),
            Some("2026-06-12T07:59:00Z")
        );
        assert_eq!(events.next_cursor, 15);
        assert_eq!(events.events.len(), 1);
        assert_eq!(events.events[0].id, 13);
        assert_eq!(
            events.events[0].runtime_instance_id.as_deref(),
            Some("runtime-test-1")
        );
        assert_eq!(
            events.events[0].runtime_started_at.as_deref(),
            Some("2026-06-12T07:59:00Z")
        );
        assert_eq!(events.events[0].task_id, Some(77));
        assert_eq!(
            events.events[0].workflow_type.as_deref(),
            Some("image_prompt")
        );
        assert_eq!(events.events[0].event_type, "workflow_step_completed");
        assert_eq!(
            events.events[0]
                .payload
                .as_ref()
                .and_then(|value| value["workflowType"].as_str()),
            Some("image_prompt")
        );
    }

    #[test]
    fn runtime_event_diagnostics_dedupes_by_runtime_source_key() {
        let app = tauri::test::mock_app();
        let mut service = SidecarLifecycleService::new(app.handle().clone());
        let response = SidecarRuntimeEventsResponse {
            ok: true,
            runtime_instance_id: Some("runtime-a".to_string()),
            runtime_started_at: Some("2026-06-12T08:00:00Z".to_string()),
            next_cursor: 1,
            events: vec![SidecarRuntimeEvent {
                id: 1,
                runtime_instance_id: None,
                runtime_started_at: None,
                task_id: Some(77),
                workflow_type: Some("image_prompt".to_string()),
                event_type: "workflow_step_completed".to_string(),
                message: Some("prompt built".to_string()),
                payload: None,
                created_at: "2026-06-12T08:00:01Z".to_string(),
            }],
        };

        let first = service.take_new_runtime_events_for_diagnostics(&response);
        let duplicate = service.take_new_runtime_events_for_diagnostics(&response);
        let restarted_response = SidecarRuntimeEventsResponse {
            runtime_instance_id: Some("runtime-b".to_string()),
            runtime_started_at: Some("2026-06-12T08:01:00Z".to_string()),
            ..response.clone()
        };
        let after_restart = service.take_new_runtime_events_for_diagnostics(&restarted_response);

        assert_eq!(first.len(), 1);
        assert!(duplicate.is_empty());
        assert_eq!(after_restart.len(), 1);
    }

    #[test]
    fn batch_sidecar_requests_use_formal_task_and_workflow_types() {
        let prompt_payload = capture_sidecar_task_request(|endpoint| {
            SidecarLifecycleService::<Wry>::submit_batch_image_prompt_to_endpoint(
                endpoint,
                BatchImagePromptSidecarRequest {
                    task_id: 123,
                    project_id: Some("project-a".to_string()),
                    batch_job_id: 456,
                    sequence_no: Some(1),
                    prompt_request: "prompt request".to_string(),
                    provider: test_provider("chat"),
                    budget: None,
                    attempt: 1,
                    max_retries: 0,
                    cancel_checkpoint_url: None,
                    cancel_checkpoint_token: None,
                },
            )
        });
        assert_eq!(prompt_payload["taskType"], BATCH_IMAGE_PROMPT_TASK_TYPE);
        assert_eq!(
            prompt_payload["workflowType"],
            BATCH_IMAGE_PROMPT_WORKFLOW_TYPE
        );

        let image_payload = capture_sidecar_task_request(|endpoint| {
            SidecarLifecycleService::<Wry>::submit_batch_image_generate_to_endpoint(
                endpoint,
                BatchImageGenerateSidecarRequest {
                    task_id: 124,
                    project_id: Some("project-a".to_string()),
                    batch_job_id: 456,
                    sequence_no: Some(2),
                    prompt_request: "image request".to_string(),
                    image_size: "1024x1024".to_string(),
                    output_dir: "C:\\temp\\monster".to_string(),
                    provider: test_provider("image"),
                    budget: None,
                    attempt: 1,
                    max_retries: 0,
                    cancel_checkpoint_url: None,
                    cancel_checkpoint_token: None,
                },
            )
        });
        assert_eq!(image_payload["taskType"], BATCH_IMAGE_GENERATE_TASK_TYPE);
        assert_eq!(
            image_payload["workflowType"],
            BATCH_IMAGE_GENERATE_WORKFLOW_TYPE
        );
    }

    fn test_provider(request_type: &str) -> SidecarProviderConfig {
        SidecarProviderConfig {
            provider_id: Some("local-test".to_string()),
            provider_type: Some("openai-compatible".to_string()),
            display_name: Some("Local Test".to_string()),
            base_url: "http://127.0.0.1:9".to_string(),
            api_key: "test-key".to_string(),
            model: "test-model".to_string(),
            request_type: request_type.to_string(),
            timeout_ms: Some(15_000),
        }
    }

    fn capture_sidecar_task_request(
        submit: impl FnOnce(&SidecarRuntimeEndpoint) -> AppResult<SidecarWorkflowTaskResult>,
    ) -> Value {
        let listener = TcpListener::bind("127.0.0.1:0").expect("listener should bind");
        let port = listener.local_addr().expect("addr should exist").port();
        let token = "sidecar-task-contract-test";
        let (payload_tx, payload_rx) = mpsc::channel();
        let handle = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("request should arrive");
            let request = read_test_http_request(&mut stream);
            assert!(request.starts_with("POST /tasks "));
            assert!(request.contains(&format!("X-Monster-Token: {token}")));
            let body = request
                .split("\r\n\r\n")
                .nth(1)
                .expect("request body should exist");
            let payload = serde_json::from_str::<Value>(body).expect("payload should parse");
            payload_tx.send(payload).expect("payload should send");
            write_test_json_response(
                &mut stream,
                r#"{"protocolVersion":1,"taskId":123,"status":"succeeded","message":"ok","outputs":[],"modelRuns":[],"events":[],"retry":null}"#,
            );
        });

        submit(&SidecarRuntimeEndpoint {
            port,
            token: token.to_string(),
        })
        .expect("sidecar submit should succeed");
        handle.join().expect("server thread should join");
        payload_rx.recv().expect("payload should be captured")
    }

    fn read_test_http_request(stream: &mut TcpStream) -> String {
        stream
            .set_read_timeout(Some(Duration::from_secs(2)))
            .expect("read timeout should set");
        let mut buffer = [0_u8; 8192];
        let mut data = Vec::new();
        let mut header_end = None;
        let mut content_length = 0usize;

        loop {
            match stream.read(&mut buffer) {
                Ok(0) => break,
                Ok(size) => {
                    data.extend_from_slice(&buffer[..size]);
                    if header_end.is_none() {
                        if let Some(position) =
                            data.windows(4).position(|window| window == b"\r\n\r\n")
                        {
                            let end = position + 4;
                            header_end = Some(end);
                            let headers = String::from_utf8_lossy(&data[..end]).into_owned();
                            content_length = headers
                                .lines()
                                .find_map(|line| {
                                    let (name, value) = line.split_once(':')?;
                                    if name.trim().eq_ignore_ascii_case("content-length") {
                                        value.trim().parse::<usize>().ok()
                                    } else {
                                        None
                                    }
                                })
                                .unwrap_or(0);
                        }
                    }
                    if let Some(end) = header_end {
                        if data.len() >= end + content_length {
                            break;
                        }
                    }
                }
                Err(error)
                    if matches!(
                        error.kind(),
                        std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut
                    ) =>
                {
                    if let Some(end) = header_end {
                        if data.len() >= end + content_length {
                            break;
                        }
                    }
                }
                Err(error) => panic!("request read failed: {error}"),
            }
        }
        String::from_utf8_lossy(&data).into_owned()
    }

    fn write_test_json_response(stream: &mut TcpStream, body: &str) {
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
        stream
            .write_all(response.as_bytes())
            .expect("response should write");
        stream.flush().expect("response should flush");
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
