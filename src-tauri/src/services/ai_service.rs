use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};
use crate::services::ai_provider_output::cleanup_generated_output_dir;
use crate::services::ai_provider_process::{
    configure_python_sidecar_command, join_output_reader, parse_sidecar_result, sanitize_secret,
    spawn_limited_output_reader, terminate_child, truncate_output, SIDECAR_STDERR_MAX_BYTES,
    SIDECAR_STDOUT_MAX_BYTES,
};
pub use crate::services::ai_provider_types::{AiProviderConfig, AiProviderTestResult};
use serde::Serialize;
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet, VecDeque};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Child, Command, ExitStatus};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Condvar, Mutex, OnceLock,
};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, Runtime, Wry};

const AI_PROVIDER_DISPLAY_NAME_MAX_CHARS: usize = 128;
const AI_PROVIDER_BASE_URL_MAX_CHARS: usize = 2_048;
const AI_PROVIDER_API_KEY_MAX_CHARS: usize = 4_096;
const AI_PROVIDER_MODEL_MAX_CHARS: usize = 256;
const AI_PROVIDER_PROMPT_MAX_CHARS: usize = 8_192;
const AI_PROVIDER_REGISTRY_JSON: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../src/config/ai-provider-registry.json"
));
const SUPPORTED_IMAGE_SIZES: &[&str] = &[
    "1008x1792",
    "1008x1344",
    "1536x864",
    "1344x1008",
    "1024x1024",
    "2048x2048",
    "1152x2048",
    "2048x1152",
    "1536x2048",
    "2048x1536",
    "1344x2016",
    "2016x1344",
    "2000x1600",
    "1600x2000",
    "2000x1200",
    "1200x2000",
    "2048x1024",
    "1024x2048",
    "2880x2880",
    "2160x3840",
    "3840x2160",
    "2160x2880",
    "2880x2160",
    "2304x3456",
    "3456x2304",
    "2880x2304",
    "2304x2880",
    "3600x2160",
    "2160x3600",
    "3840x1920",
    "1920x3840",
    "3840x1280",
    "1280x3840",
];
pub struct AiProviderService<R: Runtime = Wry> {
    app_handle: AppHandle<R>,
}

#[derive(Clone, Default)]
pub struct AiProviderCancelToken {
    cancelled: Arc<AtomicBool>,
}

impl AiProviderCancelToken {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }
}

impl<R: Runtime> AiProviderService<R> {
    pub fn new(app_handle: AppHandle<R>) -> Self {
        Self { app_handle }
    }

    pub fn spawn_direct_provider_test(
        &self,
        config: AiProviderConfig,
        action: String,
    ) -> tauri::async_runtime::JoinHandle<Result<AiProviderTestResult, String>> {
        let app_handle = self.app_handle.clone();
        let total_started = Instant::now();
        let request_id = format!("ai-direct-{}", now_ms());
        tauri::async_runtime::spawn_blocking(move || {
            let queue_config = provider_test_queue_config(&action, &config);
            let wait_timeout = provider_test_queue_wait_timeout(&action, &config);
            let permit = ai_provider_test_queue().enter_with_config(
                action.clone(),
                request_id.clone(),
                wait_timeout,
                queue_config,
            )?;
            let service = AiProviderService::new(app_handle);
            let mut result = service
                .test_provider(config, action, Some(request_id), None)
                .map_err(|error| error.to_json_string())?;
            result.queue_wait_ms = Some(permit.queue_wait_ms());
            result.total_latency_ms = Some(total_started.elapsed().as_millis() as u64);
            Ok(result)
        })
    }

    pub fn enqueue_provider_test(
        &self,
        config: AiProviderConfig,
        action: String,
    ) -> Result<AiProviderTestTask, String> {
        let task = ai_provider_task_registry().enqueue(action.clone())?;
        let app_handle = self.app_handle.clone();
        let request_id = task.request_id.clone();
        let queue_config = provider_test_queue_config(&action, &config);
        let wait_timeout = provider_test_queue_wait_timeout(&action, &config);
        let ticket = match ai_provider_test_queue().enqueue_with_config(
            action.clone(),
            request_id.clone(),
            wait_timeout,
            queue_config,
        ) {
            Ok(ticket) => ticket,
            Err(error) => {
                ai_provider_task_registry().remove(&request_id);
                return Err(error);
            }
        };
        let cancel_token = match ai_provider_cancel_registry().register(request_id.clone()) {
            Ok(token) => token,
            Err(error) => {
                let _ = ai_provider_test_queue().cancel_queued_request(&request_id);
                ai_provider_task_registry().remove(&request_id);
                return Err(error);
            }
        };
        tauri::async_runtime::spawn_blocking(move || {
            let total_started = Instant::now();
            match ai_provider_test_queue().wait_for_turn(ticket) {
                Ok(permit) => {
                    ai_provider_task_registry().mark_running(&request_id, permit.queue_wait_ms());
                    let service = AiProviderService::new(app_handle);
                    match service.test_provider(
                        config,
                        action,
                        Some(request_id.clone()),
                        Some(cancel_token),
                    ) {
                        Ok(mut result) => {
                            result.queue_wait_ms = Some(permit.queue_wait_ms());
                            ai_provider_task_registry().complete(
                                &request_id,
                                result,
                                total_started.elapsed().as_millis() as u64,
                            );
                        }
                        Err(error) => ai_provider_task_registry().fail(
                            &request_id,
                            error.to_json_string(),
                            total_started.elapsed().as_millis() as u64,
                        ),
                    }
                }
                Err(error) => ai_provider_task_registry().fail(
                    &request_id,
                    error,
                    total_started.elapsed().as_millis() as u64,
                ),
            }
            ai_provider_cancel_registry().remove(&request_id);
        });
        Ok(task)
    }

    pub fn get_provider_test_task(&self, request_id: &str) -> Result<AiProviderTestTask, String> {
        ai_provider_task_registry().get(request_id)
    }

    pub fn list_provider_test_tasks(&self) -> Result<Vec<AiProviderTestTask>, String> {
        ai_provider_task_registry().list_recent(AI_PROVIDER_FINISHED_TASK_LIMIT)
    }

    pub fn get_provider_queue_status(&self) -> Result<AiProviderQueueStatus, String> {
        ai_provider_test_queue().status()
    }

    pub fn cancel_provider_queued_tests(&self) -> Result<usize, String> {
        let cancelled_request_ids = ai_provider_test_queue().cancel_queued()?;
        let cancelled_count = cancelled_request_ids.len();
        for request_id in cancelled_request_ids {
            ai_provider_cancel_registry().remove(&request_id);
            ai_provider_task_registry().fail(&request_id, "AI 模型连接测试已取消".to_string(), 0);
        }
        Ok(cancelled_count)
    }

    pub fn cancel_provider_test_task(&self, request_id: &str) -> Result<bool, String> {
        let cancelled = ai_provider_test_queue().cancel_queued_request(request_id)?;
        if cancelled {
            ai_provider_cancel_registry().remove(request_id);
            ai_provider_task_registry().fail(request_id, "AI 模型连接测试已取消".to_string(), 0);
            return Ok(true);
        }

        ai_provider_cancel_registry().cancel(request_id)
    }

    pub fn test_provider(
        &self,
        config: AiProviderConfig,
        action: String,
        request_id: Option<String>,
        cancel_token: Option<AiProviderCancelToken>,
    ) -> AppResult<AiProviderTestResult> {
        validate_provider_config(&config, &action)?;

        let started = Instant::now();
        let output_dir = if should_prepare_output_dir(&action) {
            self.resolve_generated_output_dir()?
                .to_string_lossy()
                .to_string()
        } else {
            String::new()
        };
        let input = build_sidecar_input(&config, &action, request_id.as_deref(), &output_dir)?;

        let script_path = self.resolve_sidecar_script()?;
        let mut child = self.spawn_python_child(&script_path)?;

        if let Some(stdin) = child.stdin.as_mut() {
            stdin.write_all(input.as_bytes()).map_err(|error| {
                AppError::Process(format!("写入 AI sidecar 测试参数失败: {}", error))
            })?;
        }
        drop(child.stdin.take());

        let stdout_reader = child
            .stdout
            .take()
            .map(|stdout| spawn_limited_output_reader(stdout, SIDECAR_STDOUT_MAX_BYTES, "stdout"));
        let stderr_reader = child
            .stderr
            .take()
            .map(|stderr| spawn_limited_output_reader(stderr, SIDECAR_STDERR_MAX_BYTES, "stderr"));

        let request_timeout_ms = if action == "image" {
            config.timeout_ms.clamp(
                AI_PROVIDER_IMAGE_REQUEST_TIMEOUT_MS_MIN,
                AI_PROVIDER_IMAGE_REQUEST_TIMEOUT_MS_MAX,
            )
        } else {
            config.timeout_ms.clamp(3_000, 60_000)
        };
        let timeout_ms = if action == "image" {
            request_timeout_ms + AI_PROVIDER_IMAGE_SIDECAR_TIMEOUT_SLACK_MS
        } else {
            request_timeout_ms
        };
        let timeout = Duration::from_millis(timeout_ms);
        let exit_status: ExitStatus;

        loop {
            if cancel_token
                .as_ref()
                .map(|token| token.is_cancelled())
                .unwrap_or(false)
            {
                terminate_child(&mut child);
                let _ = join_output_reader(stdout_reader);
                let _ = join_output_reader(stderr_reader);
                return Err(AppError::Process("AI 模型测试任务已被中止".to_string()));
            }

            if let Some(status) = child.try_wait().map_err(|error| {
                AppError::Process(format!("读取 AI sidecar 状态失败: {}", error))
            })? {
                exit_status = status;
                break;
            }

            if started.elapsed() > timeout {
                terminate_child(&mut child);
                let _ = join_output_reader(stdout_reader);
                let _ = join_output_reader(stderr_reader);
                return Err(AppError::Process(format!(
                    "AI 模型连接测试超时，{} 秒内未收到 sidecar 返回",
                    timeout_ms / 1000
                )));
            }

            std::thread::sleep(Duration::from_millis(80));
        }

        let stdout_bytes = join_output_reader(stdout_reader)?;
        let stderr_bytes = join_output_reader(stderr_reader)?;
        let stdout = String::from_utf8_lossy(&stdout_bytes);
        let stderr = String::from_utf8_lossy(&stderr_bytes);
        let stderr_preview = truncate_output(&stderr);

        if !exit_status.success() {
            return Err(AppError::Process(format!(
                "AI sidecar 执行失败: {}",
                sanitize_secret(&stderr_preview)
            )));
        }

        let mut result = parse_sidecar_result(&stdout, &stderr)?;
        result.latency_ms = started.elapsed().as_millis() as u64;
        Ok(result)
    }

    fn resolve_sidecar_script(&self) -> AppResult<PathBuf> {
        let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("sidecars")
            .join("python")
            .join("ai_provider_tester.py");
        if dev_path.exists() {
            return Ok(dev_path);
        }

        let resource_path = self
            .app_handle
            .path()
            .resource_dir()
            .map_err(|error| AppError::Io(format!("定位资源目录失败: {}", error)))?
            .join("sidecars")
            .join("python")
            .join("ai_provider_tester.py");
        if resource_path.exists() {
            return Ok(resource_path);
        }

        Err(AppError::Io("未找到 Python AI sidecar 脚本".to_string()))
    }

    fn resolve_generated_output_dir(&self) -> AppResult<PathBuf> {
        #[cfg(test)]
        if let Some(test_path) = std::env::var_os("MONSTER_TOOLS_TEST_OUTPUT_DIR") {
            let output_dir = PathBuf::from(test_path);
            if !output_dir.exists() {
                fs::create_dir_all(&output_dir).map_err(|error| {
                    AppError::Io(format!("鍒涘缓 AI 鐢熷浘杈撳嚭鐩綍澶辫触: {}", error))
                })?;
            }
            cleanup_generated_output_dir(&output_dir)?;
            return Ok(output_dir);
        }

        let path_provider = PathProvider::new(self.app_handle.clone());
        let output_dir = path_provider
            .get_app_local_data_dir()?
            .join("ai")
            .join("generated");

        if !output_dir.exists() {
            fs::create_dir_all(&output_dir)
                .map_err(|error| AppError::Io(format!("创建 AI 生图输出目录失败: {}", error)))?;
        }

        cleanup_generated_output_dir(&output_dir)?;
        Ok(output_dir)
    }

    fn spawn_python_child(&self, script_path: &PathBuf) -> AppResult<Child> {
        let mut errors = Vec::new();
        for (program, args) in [
            ("python", vec![script_path.to_string_lossy().to_string()]),
            (
                "py",
                vec!["-3".to_string(), script_path.to_string_lossy().to_string()],
            ),
        ] {
            let mut command = Command::new(program);
            configure_python_sidecar_command(&mut command, &args, script_path);

            match command.spawn() {
                Ok(child) => return Ok(child),
                Err(error) => errors.push(format!("{}: {}", program, error)),
            }
        }

        Err(AppError::Process(format!(
            "启动 Python AI sidecar 失败，请确认已安装 Python 3 并加入 PATH。{}",
            errors.join("; ")
        )))
    }
}

static AI_PROVIDER_TEST_QUEUE: OnceLock<AiProviderTestQueue> = OnceLock::new();
static AI_PROVIDER_TEST_TASKS: OnceLock<AiProviderTaskRegistry> = OnceLock::new();
static AI_PROVIDER_TEST_CANCELS: OnceLock<AiProviderCancelRegistry> = OnceLock::new();
const AI_PROVIDER_TEST_QUEUE_LIMIT: usize = 16;
const AI_PROVIDER_TEST_RUNNING_LIMIT: usize = 6;
const AI_PROVIDER_TEST_MAX_CONFIG_CONCURRENCY: usize = 6;
const AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT: Duration = Duration::from_secs(90);
const AI_PROVIDER_FINISHED_TASK_LIMIT: usize = 40;
const AI_PROVIDER_IMAGE_REQUEST_TIMEOUT_MS_MIN: u64 = 60_000;
const AI_PROVIDER_IMAGE_REQUEST_TIMEOUT_MS_MAX: u64 = 900_000;
const AI_PROVIDER_IMAGE_SIDECAR_TIMEOUT_SLACK_MS: u64 = 30_000;

#[derive(Debug, Clone)]
struct AiProviderQueueConfig {
    queue_key: String,
    queue_mode: String,
    concurrency_limit: usize,
}

impl AiProviderQueueConfig {
    fn serial_global() -> Self {
        Self {
            queue_key: "__global__".to_string(),
            queue_mode: "serial".to_string(),
            concurrency_limit: 1,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderQueueItem {
    id: u64,
    request_id: String,
    action: String,
    created_at_ms: u128,
    started_at_ms: Option<u128>,
    wait_ms: u128,
    remaining_wait_ms: u128,
    wait_timeout_ms: u128,
    queue_mode: String,
    concurrency_limit: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderQueueStatus {
    running: Option<AiProviderQueueItem>,
    running_items: Vec<AiProviderQueueItem>,
    queued: Vec<AiProviderQueueItem>,
    pending_count: usize,
    queue_limit: usize,
    running_count: usize,
    running_limit: usize,
    available_running_slots: usize,
    available_slots: usize,
    is_saturated: bool,
    wait_timeout_ms: u128,
}

struct AiProviderTestQueue {
    state: Mutex<AiProviderQueueState>,
    ready: Condvar,
}

#[derive(Default)]
struct AiProviderQueueState {
    next_id: u64,
    running: Option<AiProviderQueueItem>,
    extra_running: Vec<AiProviderQueueItem>,
    queued: VecDeque<AiProviderQueueItem>,
    cancelled_ids: HashSet<u64>,
    metadata_by_id: HashMap<u64, AiProviderQueueConfig>,
}

#[derive(Debug)]
struct AiProviderQueuePermit {
    id: u64,
    created_at_ms: u128,
    started_at_ms: u128,
}

#[derive(Debug)]
struct AiProviderQueueTicket {
    id: u64,
    created_at_ms: u128,
    wait_timeout: Duration,
}

impl AiProviderQueuePermit {
    fn queue_wait_ms(&self) -> u64 {
        self.started_at_ms.saturating_sub(self.created_at_ms) as u64
    }
}

impl AiProviderTestQueue {
    fn new() -> Self {
        Self {
            state: Mutex::new(AiProviderQueueState {
                next_id: 1,
                running: None,
                extra_running: Vec::new(),
                queued: VecDeque::new(),
                cancelled_ids: HashSet::new(),
                metadata_by_id: HashMap::new(),
            }),
            ready: Condvar::new(),
        }
    }

    #[cfg(test)]
    fn enter(
        &self,
        action: String,
        request_id: String,
        wait_timeout: Duration,
    ) -> Result<AiProviderQueuePermit, String> {
        self.enter_with_config(
            action,
            request_id,
            wait_timeout,
            AiProviderQueueConfig::serial_global(),
        )
    }

    fn enter_with_config(
        &self,
        action: String,
        request_id: String,
        wait_timeout: Duration,
        queue_config: AiProviderQueueConfig,
    ) -> Result<AiProviderQueuePermit, String> {
        let ticket = self.enqueue_with_config(action, request_id, wait_timeout, queue_config)?;
        self.wait_for_turn(ticket)
    }

    #[cfg(test)]
    fn enqueue(
        &self,
        action: String,
        request_id: String,
        wait_timeout: Duration,
    ) -> Result<AiProviderQueueTicket, String> {
        self.enqueue_with_config(
            action,
            request_id,
            wait_timeout,
            AiProviderQueueConfig::serial_global(),
        )
    }

    fn enqueue_with_config(
        &self,
        action: String,
        request_id: String,
        wait_timeout: Duration,
        queue_config: AiProviderQueueConfig,
    ) -> Result<AiProviderQueueTicket, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试队列状态异常".to_string())?;
        let pending_count = state.queued.len() + running_items_len(&state);
        if pending_count >= AI_PROVIDER_TEST_QUEUE_LIMIT {
            return Err(format!(
                "AI 模型测试队列已满，最多允许 {} 个任务同时排队，请稍后再试",
                AI_PROVIDER_TEST_QUEUE_LIMIT
            ));
        }

        let id = state.next_id;
        state.next_id += 1;
        let created_at_ms = now_ms();
        state.queued.push_back(AiProviderQueueItem {
            id,
            request_id,
            action,
            created_at_ms,
            started_at_ms: None,
            wait_ms: 0,
            remaining_wait_ms: wait_timeout.as_millis(),
            wait_timeout_ms: wait_timeout.as_millis(),
            queue_mode: queue_config.queue_mode.clone(),
            concurrency_limit: queue_config.concurrency_limit,
        });
        state.metadata_by_id.insert(id, queue_config);

        self.ready.notify_all();
        Ok(AiProviderQueueTicket {
            id,
            created_at_ms,
            wait_timeout,
        })
    }

    fn wait_for_turn(
        &self,
        ticket: AiProviderQueueTicket,
    ) -> Result<AiProviderQueuePermit, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试队列状态异常".to_string())?;

        loop {
            if state.cancelled_ids.remove(&ticket.id) {
                return Err("AI 模型测试排队任务已被取消".to_string());
            }

            if !ticket.wait_timeout.is_zero()
                && now_ms().saturating_sub(ticket.created_at_ms) > ticket.wait_timeout.as_millis()
            {
                if let Some(index) = state.queued.iter().position(|item| item.id == ticket.id) {
                    state.queued.remove(index);
                }
                state.metadata_by_id.remove(&ticket.id);
                self.ready.notify_all();
                return Err(format!(
                    "AI 模型测试排队超过 {} 秒，已自动取消，请稍后重试",
                    ticket.wait_timeout.as_secs()
                ));
            }

            let runnable_index = next_runnable_queue_index(&state);
            if runnable_index
                .and_then(|index| state.queued.get(index))
                .map(|item| item.id == ticket.id)
                .unwrap_or(false)
            {
                let index = runnable_index.ok_or_else(|| "AI 模型测试队列状态异常".to_string())?;
                let mut item = state
                    .queued
                    .remove(index)
                    .ok_or_else(|| "AI 模型测试队列状态异常".to_string())?;
                let started_at_ms = now_ms();
                item.started_at_ms = Some(started_at_ms);
                item.wait_ms = started_at_ms.saturating_sub(ticket.created_at_ms);
                item.remaining_wait_ms = 0;
                if state.running.is_none() {
                    state.running = Some(item);
                } else {
                    state.extra_running.push(item);
                }
                return Ok(AiProviderQueuePermit {
                    id: ticket.id,
                    created_at_ms: ticket.created_at_ms,
                    started_at_ms,
                });
            }

            let (next_state, _) = self
                .ready
                .wait_timeout(state, Duration::from_millis(250))
                .map_err(|_| "AI 模型测试队列等待异常".to_string())?;
            state = next_state;
        }
    }

    fn leave(&self, id: u64) {
        if let Ok(mut state) = self.state.lock() {
            if state
                .running
                .as_ref()
                .map(|item| item.id == id)
                .unwrap_or(false)
            {
                state.running = None;
            } else if let Some(index) = state.extra_running.iter().position(|item| item.id == id) {
                state.extra_running.remove(index);
            }
            state.metadata_by_id.remove(&id);
            self.ready.notify_all();
        }
    }

    fn status(&self) -> Result<AiProviderQueueStatus, String> {
        let state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试队列状态异常".to_string())?;
        let now = now_ms();
        let wait_timeout_ms = AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis();
        let running_items = collect_running_items(&state)
            .into_iter()
            .map(|item| annotate_queue_item(item, now))
            .collect::<Vec<_>>();
        let running = running_items.first().cloned();
        let queued = state
            .queued
            .iter()
            .cloned()
            .map(|item| annotate_queue_item(item, now))
            .collect::<Vec<_>>();
        let running_count = running_items.len();
        let pending_count = queued.len() + running_count;
        let available_slots = AI_PROVIDER_TEST_QUEUE_LIMIT.saturating_sub(pending_count);
        let available_running_slots = AI_PROVIDER_TEST_RUNNING_LIMIT.saturating_sub(running_count);
        Ok(AiProviderQueueStatus {
            running,
            running_items,
            queued,
            pending_count,
            queue_limit: AI_PROVIDER_TEST_QUEUE_LIMIT,
            running_count,
            running_limit: AI_PROVIDER_TEST_RUNNING_LIMIT,
            available_running_slots,
            available_slots,
            is_saturated: available_slots == 0,
            wait_timeout_ms,
        })
    }

    fn cancel_queued(&self) -> Result<Vec<String>, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试队列状态异常".to_string())?;
        let cancelled_ids = state.queued.iter().map(|item| item.id).collect::<Vec<_>>();
        let cancelled_request_ids = state
            .queued
            .iter()
            .map(|item| item.request_id.clone())
            .collect::<Vec<_>>();
        state.queued.clear();
        for id in &cancelled_ids {
            state.metadata_by_id.remove(id);
        }
        state.cancelled_ids.extend(cancelled_ids);
        self.ready.notify_all();
        Ok(cancelled_request_ids)
    }

    fn cancel_queued_request(&self, request_id: &str) -> Result<bool, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试队列状态异常".to_string())?;
        let Some(index) = state
            .queued
            .iter()
            .position(|item| item.request_id == request_id)
        else {
            return Ok(false);
        };
        let Some(item) = state.queued.remove(index) else {
            return Ok(false);
        };
        state.cancelled_ids.insert(item.id);
        state.metadata_by_id.remove(&item.id);
        self.ready.notify_all();
        Ok(true)
    }
}

fn running_items_len(state: &AiProviderQueueState) -> usize {
    usize::from(state.running.is_some()) + state.extra_running.len()
}

fn collect_running_items(state: &AiProviderQueueState) -> Vec<AiProviderQueueItem> {
    let mut items = Vec::with_capacity(running_items_len(state));
    if let Some(item) = &state.running {
        items.push(item.clone());
    }
    items.extend(state.extra_running.iter().cloned());
    items
}

fn queue_config_for_item(
    state: &AiProviderQueueState,
    item: &AiProviderQueueItem,
) -> AiProviderQueueConfig {
    state
        .metadata_by_id
        .get(&item.id)
        .cloned()
        .unwrap_or_else(AiProviderQueueConfig::serial_global)
}

fn running_count_for_queue_key(state: &AiProviderQueueState, queue_key: &str) -> usize {
    collect_running_items(state)
        .iter()
        .filter(|item| queue_config_for_item(state, item).queue_key == queue_key)
        .count()
}

fn can_run_queue_item(state: &AiProviderQueueState, item: &AiProviderQueueItem) -> bool {
    if running_items_len(state) >= AI_PROVIDER_TEST_RUNNING_LIMIT {
        return false;
    }

    let queue_config = queue_config_for_item(state, item);
    running_count_for_queue_key(state, &queue_config.queue_key) < queue_config.concurrency_limit
}

fn next_runnable_queue_index(state: &AiProviderQueueState) -> Option<usize> {
    state
        .queued
        .iter()
        .position(|item| can_run_queue_item(state, item))
}

fn annotate_queue_item(mut item: AiProviderQueueItem, now_ms: u128) -> AiProviderQueueItem {
    item.wait_ms = item
        .started_at_ms
        .unwrap_or(now_ms)
        .saturating_sub(item.created_at_ms);
    item.remaining_wait_ms = if item.started_at_ms.is_some() || item.wait_timeout_ms == 0 {
        0
    } else {
        item.wait_timeout_ms.saturating_sub(item.wait_ms)
    };
    item
}

fn provider_test_queue_config(action: &str, config: &AiProviderConfig) -> AiProviderQueueConfig {
    let queue_mode = if config.queue_mode == "concurrent" {
        "concurrent"
    } else {
        "serial"
    };
    let concurrency_limit = if queue_mode == "concurrent" {
        config
            .max_concurrency
            .clamp(2, AI_PROVIDER_TEST_MAX_CONFIG_CONCURRENCY)
    } else {
        1
    };
    let queue_key = normalize_queue_key(action, config);

    AiProviderQueueConfig {
        queue_key,
        queue_mode: queue_mode.to_string(),
        concurrency_limit,
    }
}

fn normalize_queue_key(action: &str, config: &AiProviderConfig) -> String {
    let candidate = config.queue_key.trim();
    if !candidate.is_empty() {
        return candidate.chars().take(128).collect();
    }

    let model = if action == "image" {
        config.image_model.trim()
    } else {
        config.model.trim()
    };

    format!(
        "{}:{}:{}",
        config.provider.trim(),
        config.base_url.trim(),
        model
    )
    .chars()
    .take(512)
    .collect()
}

fn provider_test_queue_wait_timeout(action: &str, _config: &AiProviderConfig) -> Duration {
    if action == "image" {
        return Duration::ZERO;
    }

    AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT
}

impl Drop for AiProviderQueuePermit {
    fn drop(&mut self) {
        ai_provider_test_queue().leave(self.id);
    }
}

fn ai_provider_test_queue() -> &'static AiProviderTestQueue {
    AI_PROVIDER_TEST_QUEUE.get_or_init(AiProviderTestQueue::new)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderTestTask {
    request_id: String,
    action: String,
    status: String,
    created_at_ms: u128,
    started_at_ms: Option<u128>,
    finished_at_ms: Option<u128>,
    queue_wait_ms: Option<u64>,
    total_latency_ms: Option<u64>,
    result: Option<AiProviderTestResult>,
    error: Option<String>,
}

struct AiProviderTaskRegistry {
    state: Mutex<AiProviderTaskState>,
}

#[derive(Default)]
struct AiProviderTaskState {
    next_id: u64,
    tasks: HashMap<String, AiProviderTestTask>,
}

impl AiProviderTaskRegistry {
    fn new() -> Self {
        Self {
            state: Mutex::new(AiProviderTaskState {
                next_id: 1,
                tasks: HashMap::new(),
            }),
        }
    }

    fn enqueue(&self, action: String) -> Result<AiProviderTestTask, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试任务状态异常".to_string())?;
        let request_id = format!("ai-test-{}", state.next_id);
        state.next_id += 1;
        let task = AiProviderTestTask {
            request_id: request_id.clone(),
            action,
            status: "queued".to_string(),
            created_at_ms: now_ms(),
            started_at_ms: None,
            finished_at_ms: None,
            queue_wait_ms: None,
            total_latency_ms: None,
            result: None,
            error: None,
        };
        state.tasks.insert(request_id, task.clone());
        Ok(task)
    }

    fn mark_running(&self, request_id: &str, queue_wait_ms: u64) {
        if let Ok(mut state) = self.state.lock() {
            if let Some(task) = state.tasks.get_mut(request_id) {
                task.status = "running".to_string();
                task.started_at_ms = Some(now_ms());
                task.queue_wait_ms = Some(queue_wait_ms);
            }
        }
    }

    fn complete(&self, request_id: &str, mut result: AiProviderTestResult, total_latency_ms: u64) {
        if let Ok(mut state) = self.state.lock() {
            if let Some(task) = state.tasks.get_mut(request_id) {
                result.total_latency_ms = Some(total_latency_ms);
                task.status = if result.ok { "success" } else { "failed" }.to_string();
                task.finished_at_ms = Some(now_ms());
                task.total_latency_ms = Some(total_latency_ms);
                task.error = if result.ok {
                    None
                } else {
                    Some(result.message.clone())
                };
                task.result = Some(result);
            }
            trim_finished_tasks(&mut state);
        }
    }

    fn fail(&self, request_id: &str, error: String, total_latency_ms: u64) {
        if let Ok(mut state) = self.state.lock() {
            if let Some(task) = state.tasks.get_mut(request_id) {
                task.status = "failed".to_string();
                task.finished_at_ms = Some(now_ms());
                task.total_latency_ms = Some(total_latency_ms);
                task.error = Some(error);
            }
            trim_finished_tasks(&mut state);
        }
    }

    fn remove(&self, request_id: &str) {
        if let Ok(mut state) = self.state.lock() {
            state.tasks.remove(request_id);
        }
    }

    fn get(&self, request_id: &str) -> Result<AiProviderTestTask, String> {
        let state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试任务状态异常".to_string())?;
        state
            .tasks
            .get(request_id)
            .cloned()
            .ok_or_else(|| "未找到 AI 模型测试任务".to_string())
    }

    fn list_recent(&self, limit: usize) -> Result<Vec<AiProviderTestTask>, String> {
        let state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试任务状态异常".to_string())?;
        let mut active = state
            .tasks
            .values()
            .filter(|task| task.finished_at_ms.is_none())
            .cloned()
            .collect::<Vec<_>>();
        let mut finished = state
            .tasks
            .values()
            .filter(|task| task.finished_at_ms.is_some())
            .cloned()
            .collect::<Vec<_>>();

        active.sort_by(|left, right| right.created_at_ms.cmp(&left.created_at_ms));
        finished.sort_by(|left, right| right.created_at_ms.cmp(&left.created_at_ms));
        finished.truncate(limit);
        active.extend(finished);
        Ok(active)
    }
}

fn trim_finished_tasks(state: &mut AiProviderTaskState) {
    let mut finished = state
        .tasks
        .values()
        .filter(|task| task.finished_at_ms.is_some())
        .map(|task| {
            (
                task.request_id.clone(),
                task.finished_at_ms.unwrap_or(task.created_at_ms),
            )
        })
        .collect::<Vec<_>>();
    if finished.len() <= AI_PROVIDER_FINISHED_TASK_LIMIT {
        return;
    }

    finished.sort_by(|left, right| right.1.cmp(&left.1));
    for (request_id, _) in finished.into_iter().skip(AI_PROVIDER_FINISHED_TASK_LIMIT) {
        state.tasks.remove(&request_id);
    }
}

fn ai_provider_task_registry() -> &'static AiProviderTaskRegistry {
    AI_PROVIDER_TEST_TASKS.get_or_init(AiProviderTaskRegistry::new)
}

struct AiProviderCancelRegistry {
    state: Mutex<HashMap<String, AiProviderCancelToken>>,
}

impl AiProviderCancelRegistry {
    fn new() -> Self {
        Self {
            state: Mutex::new(HashMap::new()),
        }
    }

    fn register(&self, request_id: String) -> Result<AiProviderCancelToken, String> {
        let token = AiProviderCancelToken::new();
        let mut state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试中止状态异常".to_string())?;
        state.insert(request_id, token.clone());
        Ok(token)
    }

    fn cancel(&self, request_id: &str) -> Result<bool, String> {
        let state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试中止状态异常".to_string())?;
        let Some(token) = state.get(request_id) else {
            return Ok(false);
        };
        token.cancel();
        Ok(true)
    }

    fn remove(&self, request_id: &str) {
        if let Ok(mut state) = self.state.lock() {
            state.remove(request_id);
        }
    }
}

fn ai_provider_cancel_registry() -> &'static AiProviderCancelRegistry {
    AI_PROVIDER_TEST_CANCELS.get_or_init(AiProviderCancelRegistry::new)
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

#[cfg(test)]
mod queue_tests {
    use super::*;
    use std::sync::{mpsc, Arc};
    use std::thread;

    fn test_config(timeout_ms: u64) -> AiProviderConfig {
        AiProviderConfig {
            provider: "custom".to_string(),
            adapter_id: "openai-compatible".to_string(),
            display_name: "Mock".to_string(),
            base_url: "https://example.com/v1".to_string(),
            api_key: "secret".to_string(),
            remember_api_key: false,
            model: "chat-test".to_string(),
            test_prompt: "ping".to_string(),
            image_model: "image-test".to_string(),
            image_prompt: "blue robot".to_string(),
            image_size: "1024x1024".to_string(),
            image_count: 1,
            timeout_ms,
            queue_mode: "serial".to_string(),
            max_concurrency: 3,
            queue_key: String::new(),
        }
    }

    fn test_queue_config(key: &str, concurrency_limit: usize) -> AiProviderQueueConfig {
        AiProviderQueueConfig {
            queue_key: key.to_string(),
            queue_mode: if concurrency_limit > 1 {
                "concurrent".to_string()
            } else {
                "serial".to_string()
            },
            concurrency_limit,
        }
    }

    fn test_result(request_id: &str) -> AiProviderTestResult {
        AiProviderTestResult {
            request_id: Some(request_id.to_string()),
            ok: true,
            action: "chat".to_string(),
            provider: "custom".to_string(),
            model: "chat-test".to_string(),
            base_url: "https://example.com/v1".to_string(),
            latency_ms: 100,
            queue_wait_ms: None,
            total_latency_ms: None,
            message: "ok".to_string(),
            status_code: Some(200),
            models: None,
            text: Some("pong".to_string()),
            image_urls: None,
            image_paths: None,
            saved_files: None,
            api_image_size: None,
            requested_image_size: None,
            actual_image_size: None,
            fallback_image_size: None,
            image_attempts: None,
            failure_kind: None,
            raw_preview: None,
        }
    }

    #[test]
    fn task_registry_recovers_finished_result_by_request_id() {
        let registry = AiProviderTaskRegistry::new();
        let task = registry
            .enqueue("chat".to_string())
            .expect("task should enqueue");

        registry.mark_running(&task.request_id, 12);
        registry.complete(&task.request_id, test_result(&task.request_id), 140);

        let restored = registry
            .get(&task.request_id)
            .expect("finished task should be readable");
        assert_eq!(restored.status, "success");
        assert_eq!(restored.queue_wait_ms, Some(12));
        assert_eq!(restored.total_latency_ms, Some(140));
        assert_eq!(
            restored.result.expect("result should exist").text,
            Some("pong".to_string())
        );
    }

    #[test]
    fn task_registry_recovers_failed_task_by_request_id() {
        let registry = AiProviderTaskRegistry::new();
        let task = registry
            .enqueue("image".to_string())
            .expect("task should enqueue");

        registry.fail(
            &task.request_id,
            "AI 模型测试排队任务已被取消".to_string(),
            0,
        );

        let restored = registry
            .get(&task.request_id)
            .expect("failed task should be readable");
        assert_eq!(restored.status, "failed");
        assert_eq!(
            restored.error,
            Some("AI 模型测试排队任务已被取消".to_string())
        );
        assert!(restored.finished_at_ms.is_some());
        assert!(restored.result.is_none());
    }

    #[test]
    fn task_registry_remove_drops_unpublished_task() {
        let registry = AiProviderTaskRegistry::new();
        let task = registry
            .enqueue("image".to_string())
            .expect("task should enqueue");

        registry.remove(&task.request_id);

        assert!(registry.get(&task.request_id).is_err());
        assert!(registry
            .list_recent(10)
            .expect("recent tasks should be readable")
            .is_empty());
    }

    #[test]
    fn task_registry_lists_recent_tasks_newest_first() {
        let registry = AiProviderTaskRegistry::new();
        let first = registry
            .enqueue("models".to_string())
            .expect("first task should enqueue");
        registry.complete(&first.request_id, test_result(&first.request_id), 100);
        std::thread::sleep(Duration::from_millis(2));
        let second = registry
            .enqueue("chat".to_string())
            .expect("second task should enqueue");
        registry.complete(&second.request_id, test_result(&second.request_id), 100);

        let recent = registry
            .list_recent(1)
            .expect("recent tasks should be readable");

        assert_eq!(recent.len(), 1);
        assert_eq!(recent[0].request_id, second.request_id);
        assert_ne!(recent[0].request_id, first.request_id);
    }

    #[test]
    fn task_registry_trim_keeps_active_tasks() {
        let registry = AiProviderTaskRegistry::new();
        let queued = registry
            .enqueue("image".to_string())
            .expect("queued task should enqueue");
        let running = registry
            .enqueue("chat".to_string())
            .expect("running task should enqueue");
        registry.mark_running(&running.request_id, 20);

        for index in 0..(AI_PROVIDER_FINISHED_TASK_LIMIT + 5) {
            let task = registry
                .enqueue("models".to_string())
                .expect("finished task should enqueue");
            registry.complete(
                &task.request_id,
                test_result(&task.request_id),
                index as u64,
            );
            std::thread::sleep(Duration::from_millis(1));
        }

        let restored_queued = registry
            .get(&queued.request_id)
            .expect("queued task should survive finished trim");
        let restored_running = registry
            .get(&running.request_id)
            .expect("running task should survive finished trim");
        let recent = registry
            .list_recent(AI_PROVIDER_FINISHED_TASK_LIMIT)
            .expect("recent tasks should be readable");

        assert_eq!(restored_queued.status, "queued");
        assert_eq!(restored_running.status, "running");
        assert_eq!(restored_running.queue_wait_ms, Some(20));
        assert!(recent
            .iter()
            .any(|task| task.request_id == queued.request_id));
        assert!(recent
            .iter()
            .any(|task| task.request_id == running.request_id));
    }

    #[test]
    fn cancel_registry_signals_registered_running_task() {
        let registry = AiProviderCancelRegistry::new();
        let token = registry
            .register("running-request".to_string())
            .expect("token should register");

        assert!(!token.is_cancelled());
        assert!(registry
            .cancel("running-request")
            .expect("registered request should cancel"));
        assert!(token.is_cancelled());
    }

    #[test]
    fn cancel_registry_remove_drops_registered_running_task() {
        let registry = AiProviderCancelRegistry::new();
        let token = registry
            .register("running-request".to_string())
            .expect("token should register");

        registry.remove("running-request");

        assert!(!registry
            .cancel("running-request")
            .expect("removed request should not cancel"));
        assert!(!token.is_cancelled());
        assert!(registry
            .state
            .lock()
            .expect("cancel registry state should lock")
            .is_empty());
    }

    #[test]
    fn cancel_registry_remove_after_cancel_prevents_repeated_cancel() {
        let registry = AiProviderCancelRegistry::new();
        let token = registry
            .register("running-request".to_string())
            .expect("token should register");

        assert!(registry
            .cancel("running-request")
            .expect("registered request should cancel"));
        registry.remove("running-request");

        assert!(token.is_cancelled());
        assert!(!registry
            .cancel("running-request")
            .expect("removed request should not cancel again"));
        assert!(registry
            .state
            .lock()
            .expect("cancel registry state should lock")
            .is_empty());
    }

    #[test]
    fn cancel_registry_ignores_unknown_request() {
        let registry = AiProviderCancelRegistry::new();

        assert!(!registry
            .cancel("missing-request")
            .expect("unknown request should not error"));
    }

    #[test]
    fn image_queue_wait_timeout_does_not_auto_cancel_queueing() {
        let config = test_config(720_000);
        let wait_timeout = provider_test_queue_wait_timeout("image", &config);

        assert_eq!(wait_timeout, Duration::ZERO);
    }

    #[test]
    fn non_image_queue_wait_timeout_uses_short_default() {
        let config = test_config(180_000);

        assert_eq!(
            provider_test_queue_wait_timeout("models", &config),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT
        );
        assert_eq!(
            provider_test_queue_wait_timeout("chat", &config),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT
        );
    }

    #[test]
    fn queue_allows_different_serial_configs_to_run_together() {
        let queue = AiProviderTestQueue::new();
        let first = queue
            .enter_with_config(
                "image".to_string(),
                "image-a".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
                test_queue_config("config-a", 1),
            )
            .expect("first config should run");
        let second = queue
            .enter_with_config(
                "image".to_string(),
                "image-b".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
                test_queue_config("config-b", 1),
            )
            .expect("different serial config should run in another slot");

        let status = queue.status().expect("queue status should be readable");
        assert_eq!(status.running_count, 2);
        assert_eq!(status.running_items.len(), 2);
        assert_eq!(
            status.available_running_slots,
            AI_PROVIDER_TEST_RUNNING_LIMIT - 2
        );

        queue.leave(first.id);
        queue.leave(second.id);
    }

    #[test]
    fn queue_allows_same_config_when_concurrency_limit_has_capacity() {
        let queue = AiProviderTestQueue::new();
        let first = queue
            .enter_with_config(
                "image".to_string(),
                "image-a".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
                test_queue_config("config-a", 2),
            )
            .expect("first high-concurrency item should run");
        let second = queue
            .enter_with_config(
                "image".to_string(),
                "image-b".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
                test_queue_config("config-a", 2),
            )
            .expect("same config should use second high-concurrency slot");

        let status = queue.status().expect("queue status should be readable");
        assert_eq!(status.running_count, 2);
        assert!(status.queued.is_empty());
        assert!(status
            .running_items
            .iter()
            .all(|item| item.concurrency_limit == 2));

        queue.leave(first.id);
        queue.leave(second.id);
    }

    #[test]
    fn queue_keeps_same_serial_config_waiting_until_slot_leaves() {
        let queue = Arc::new(AiProviderTestQueue::new());
        let running = queue
            .enter_with_config(
                "image".to_string(),
                "image-a".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
                test_queue_config("config-a", 1),
            )
            .expect("first serial config item should run");
        let waiting_queue = Arc::clone(&queue);
        let (ready_tx, ready_rx) = mpsc::channel();
        let (result_tx, result_rx) = mpsc::channel();

        let handle = thread::spawn(move || {
            ready_tx.send(()).expect("ready signal should send");
            let result = waiting_queue.enter_with_config(
                "image".to_string(),
                "image-b".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
                test_queue_config("config-a", 1),
            );
            result_tx
                .send(result.map(|permit| permit.id))
                .expect("queue result should send");
        });

        ready_rx.recv().expect("waiting thread should start");
        for _ in 0..20 {
            if queue.status().expect("queue status").queued.len() == 1 {
                break;
            }
            thread::sleep(Duration::from_millis(10));
        }
        assert_eq!(
            queue
                .status()
                .expect("queue status should be readable")
                .queued
                .len(),
            1
        );

        queue.leave(running.id);
        let next_id = result_rx
            .recv_timeout(Duration::from_secs(1))
            .expect("waiting request should wake after running leaves")
            .expect("queued request should enter running slot");

        queue.leave(next_id);
        handle.join().expect("waiting thread should join");
        assert!(queue
            .status()
            .expect("queue status should be readable")
            .queued
            .is_empty());
    }

    #[test]
    fn queue_limits_pending_items() {
        let queue = AiProviderTestQueue::new();
        let _running = queue
            .enter(
                "image".to_string(),
                "test-image".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            )
            .expect("first item should run");
        for _ in 1..AI_PROVIDER_TEST_QUEUE_LIMIT {
            let mut state = queue.state.lock().expect("queue state should lock");
            let id = state.next_id;
            state.next_id += 1;
            state.queued.push_back(AiProviderQueueItem {
                id,
                request_id: format!("queued-image-{id}"),
                action: "image".to_string(),
                created_at_ms: now_ms(),
                started_at_ms: None,
                wait_ms: 0,
                remaining_wait_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                wait_timeout_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                queue_mode: "serial".to_string(),
                concurrency_limit: 1,
            });
        }

        let error = queue
            .enter(
                "image".to_string(),
                "test-image".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            )
            .expect_err("queue should reject items over limit");
        assert!(error.contains("队列已满"));
    }

    #[test]
    fn queue_enqueue_reserves_capacity_before_worker_waits() {
        let queue = AiProviderTestQueue::new();
        for index in 0..AI_PROVIDER_TEST_QUEUE_LIMIT {
            queue
                .enqueue(
                    "image".to_string(),
                    format!("queued-before-worker-{index}"),
                    AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
                )
                .expect("queue slot should reserve");
        }

        let error = queue
            .enqueue(
                "image".to_string(),
                "overflow-before-worker".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            )
            .expect_err("reserved queue should reject overflow before workers wait");

        assert!(error.contains("队列已满"));
        assert_eq!(
            queue.status().expect("queue status").pending_count,
            AI_PROVIDER_TEST_QUEUE_LIMIT
        );
    }

    #[test]
    fn queue_status_reports_running_and_queued_items() {
        let queue = AiProviderTestQueue::new();
        let running = queue
            .enter(
                "models".to_string(),
                "test-models".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            )
            .expect("first item should run");
        {
            let mut state = queue.state.lock().expect("queue state should lock");
            let id = state.next_id;
            state.next_id += 1;
            state.queued.push_back(AiProviderQueueItem {
                id,
                request_id: format!("queued-chat-{id}"),
                action: "chat".to_string(),
                created_at_ms: now_ms(),
                started_at_ms: None,
                wait_ms: 0,
                remaining_wait_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                wait_timeout_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                queue_mode: "serial".to_string(),
                concurrency_limit: 1,
            });
        }

        let status = queue.status().expect("queue status should be readable");
        assert_eq!(status.pending_count, 2);
        assert_eq!(status.queue_limit, AI_PROVIDER_TEST_QUEUE_LIMIT);
        assert_eq!(status.available_slots, AI_PROVIDER_TEST_QUEUE_LIMIT - 2);
        assert_eq!(
            status.wait_timeout_ms,
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis()
        );
        assert!(!status.is_saturated);
        assert_eq!(status.running.expect("running item").action, "models");
        assert_eq!(status.queued.len(), 1);
        assert_eq!(status.queued[0].action, "chat");
        assert!(status.queued[0].remaining_wait_ms <= status.wait_timeout_ms);

        queue.leave(running.id);
        let status = queue.status().expect("queue status should be readable");
        assert_eq!(status.pending_count, 1);
        assert_eq!(status.available_slots, AI_PROVIDER_TEST_QUEUE_LIMIT - 1);
        assert!(status.running.is_none());
    }

    #[test]
    fn queue_cancel_queued_items_keeps_running_item() {
        let queue = AiProviderTestQueue::new();
        let running = queue
            .enter(
                "models".to_string(),
                "test-models".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            )
            .expect("first item should run");
        {
            let mut state = queue.state.lock().expect("queue state should lock");
            for action in ["chat", "image"] {
                let id = state.next_id;
                state.next_id += 1;
                state.queued.push_back(AiProviderQueueItem {
                    id,
                    request_id: format!("queued-{id}"),
                    action: action.to_string(),
                    created_at_ms: now_ms(),
                    started_at_ms: None,
                    wait_ms: 0,
                    remaining_wait_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                    wait_timeout_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                    queue_mode: "serial".to_string(),
                    concurrency_limit: 1,
                });
            }
        }

        let cancelled = queue.cancel_queued().expect("queued items should cancel");
        assert_eq!(cancelled.len(), 2);

        let status = queue.status().expect("queue status should be readable");
        assert_eq!(status.pending_count, 1);
        assert_eq!(status.available_slots, AI_PROVIDER_TEST_QUEUE_LIMIT - 1);
        assert!(!status.is_saturated);
        assert_eq!(status.running.expect("running item").id, running.id);
        assert!(status.queued.is_empty());
    }

    #[test]
    fn queue_leave_wakes_next_waiting_request() {
        let queue = Arc::new(AiProviderTestQueue::new());
        let running = queue
            .enter(
                "models".to_string(),
                "running-request".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            )
            .expect("first item should run");
        let waiting_queue = Arc::clone(&queue);
        let (ready_tx, ready_rx) = mpsc::channel();
        let (result_tx, result_rx) = mpsc::channel();

        let handle = thread::spawn(move || {
            let ticket = waiting_queue
                .enqueue(
                    "chat".to_string(),
                    "queued-request".to_string(),
                    AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
                )
                .expect("queued item should enqueue");
            ready_tx.send(()).expect("ready signal should send");
            let result = waiting_queue.wait_for_turn(ticket).map(|permit| {
                let status = waiting_queue
                    .status()
                    .expect("queue status should be readable");
                let running_request_id = status
                    .running
                    .expect("queued item should become running")
                    .request_id;
                (permit.id, running_request_id)
            });
            result_tx.send(result).expect("queue result should send");
        });

        ready_rx.recv().expect("waiting thread should start");
        for _ in 0..20 {
            if queue.status().expect("queue status").queued.len() == 1 {
                break;
            }
            thread::sleep(Duration::from_millis(10));
        }

        queue.leave(running.id);
        let (next_id, running_request_id) = result_rx
            .recv_timeout(Duration::from_secs(1))
            .expect("waiting request should wake after running leaves")
            .expect("queued request should enter running slot");

        assert_eq!(running_request_id, "queued-request");
        queue.leave(next_id);
        handle.join().expect("waiting thread should join");

        let status = queue.status().expect("queue status should be readable");
        assert!(status.running.is_none());
        assert!(status.queued.is_empty());
        assert_eq!(status.pending_count, 0);
    }

    #[test]
    fn queue_cancel_returns_only_queued_request_ids() {
        let queue = AiProviderTestQueue::new();
        let _running = queue
            .enter(
                "models".to_string(),
                "running-request".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            )
            .expect("first item should run");
        {
            let mut state = queue.state.lock().expect("queue state should lock");
            let id = state.next_id;
            state.next_id += 1;
            state.queued.push_back(AiProviderQueueItem {
                id,
                request_id: "queued-request".to_string(),
                action: "image".to_string(),
                created_at_ms: now_ms(),
                started_at_ms: None,
                wait_ms: 0,
                remaining_wait_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                wait_timeout_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                queue_mode: "serial".to_string(),
                concurrency_limit: 1,
            });
        }

        let cancelled = queue.cancel_queued().expect("queued item should cancel");

        assert_eq!(cancelled, vec!["queued-request".to_string()]);
    }

    #[test]
    fn queue_cancel_single_queued_request_keeps_others() {
        let queue = AiProviderTestQueue::new();
        let _running = queue
            .enter(
                "models".to_string(),
                "running-request".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            )
            .expect("first item should run");
        {
            let mut state = queue.state.lock().expect("queue state should lock");
            for request_id in ["queued-one", "queued-two"] {
                let id = state.next_id;
                state.next_id += 1;
                state.queued.push_back(AiProviderQueueItem {
                    id,
                    request_id: request_id.to_string(),
                    action: "image".to_string(),
                    created_at_ms: now_ms(),
                    started_at_ms: None,
                    wait_ms: 0,
                    remaining_wait_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                    wait_timeout_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                    queue_mode: "serial".to_string(),
                    concurrency_limit: 1,
                });
            }
        }

        let cancelled = queue
            .cancel_queued_request("queued-one")
            .expect("queued request should cancel");
        let status = queue.status().expect("queue status should be readable");

        assert!(cancelled);
        assert_eq!(status.pending_count, 2);
        assert_eq!(
            status.running.expect("running item").request_id,
            "running-request"
        );
        assert_eq!(status.queued.len(), 1);
        assert_eq!(status.queued[0].request_id, "queued-two");
        assert!(!queue
            .cancel_queued_request("running-request")
            .expect("running request should not cancel as queued"));
    }

    #[test]
    fn queue_status_marks_saturated_when_full() {
        let queue = AiProviderTestQueue::new();
        let _running = queue
            .enter(
                "models".to_string(),
                "test-models".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            )
            .expect("first item should run");
        {
            let mut state = queue.state.lock().expect("queue state should lock");
            while state.queued.len() + 1 < AI_PROVIDER_TEST_QUEUE_LIMIT {
                let id = state.next_id;
                state.next_id += 1;
                state.queued.push_back(AiProviderQueueItem {
                    id,
                    request_id: format!("queued-chat-{id}"),
                    action: "chat".to_string(),
                    created_at_ms: now_ms(),
                    started_at_ms: None,
                    wait_ms: 0,
                    remaining_wait_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                    wait_timeout_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                    queue_mode: "serial".to_string(),
                    concurrency_limit: 1,
                });
            }
        }

        let status = queue.status().expect("queue status should be readable");
        assert_eq!(status.pending_count, AI_PROVIDER_TEST_QUEUE_LIMIT);
        assert_eq!(status.available_slots, 0);
        assert!(status.is_saturated);
    }

    #[test]
    fn queue_cancel_wakes_waiting_request() {
        let queue = Arc::new(AiProviderTestQueue::new());
        let _running = queue
            .enter(
                "models".to_string(),
                "test-models".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            )
            .expect("first item should run");
        let waiting_queue = Arc::clone(&queue);
        let (ready_tx, ready_rx) = mpsc::channel();
        let (result_tx, result_rx) = mpsc::channel();

        let handle = thread::spawn(move || {
            ready_tx.send(()).expect("ready signal should send");
            let result = waiting_queue.enter(
                "image".to_string(),
                "test-image".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            );
            result_tx
                .send(result.map(|permit| permit.id))
                .expect("queue result should send");
        });

        ready_rx.recv().expect("waiting thread should start");
        for _ in 0..20 {
            if queue.status().expect("queue status").queued.len() == 1 {
                break;
            }
            thread::sleep(Duration::from_millis(10));
        }

        let cancelled = queue.cancel_queued().expect("queued item should cancel");
        assert_eq!(cancelled.len(), 1);
        let result = result_rx
            .recv_timeout(Duration::from_secs(1))
            .expect("waiting request should wake after cancellation");
        assert!(result
            .expect_err("waiting request should be cancelled")
            .contains("已被取消"));
        handle.join().expect("waiting thread should join");
    }

    #[test]
    fn queue_wait_timeout_removes_stale_request() {
        let queue = Arc::new(AiProviderTestQueue::new());
        let _running = queue
            .enter(
                "models".to_string(),
                "test-models".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            )
            .expect("first item should run");
        let waiting_queue = Arc::clone(&queue);
        let (ready_tx, ready_rx) = mpsc::channel();
        let (result_tx, result_rx) = mpsc::channel();

        let handle = thread::spawn(move || {
            ready_tx.send(()).expect("ready signal should send");
            let result = waiting_queue
                .enqueue(
                    "image".to_string(),
                    "test-timeout-image".to_string(),
                    Duration::from_millis(50),
                )
                .and_then(|ticket| waiting_queue.wait_for_turn(ticket));
            result_tx
                .send(result.map(|permit| permit.id))
                .expect("queue result should send");
        });

        ready_rx.recv().expect("waiting thread should start");
        for _ in 0..20 {
            if queue.status().expect("queue status").queued.len() == 1 {
                break;
            }
            thread::sleep(Duration::from_millis(10));
        }

        let result = result_rx
            .recv_timeout(Duration::from_secs(2))
            .expect("waiting request should wake after timeout");
        assert!(result
            .expect_err("waiting request should time out")
            .contains("自动取消"));

        let status = queue.status().expect("queue status should be readable");
        assert!(status.queued.is_empty());
        handle.join().expect("waiting thread should join");
    }
}

fn validate_provider_config(config: &AiProviderConfig, action: &str) -> AppResult<()> {
    if !matches!(action, "models" | "chat" | "image") {
        return Err(AppError::Config("不支持的 AI 测试动作".to_string()));
    }

    if !is_supported_provider_id(&config.provider) {
        return Err(AppError::Config("不支持的 AI 模型提供商".to_string()));
    }

    if !provider_supports_test_action(config, action) {
        return Err(AppError::Config(
            "当前 AI 模型配置不支持该测试动作".to_string(),
        ));
    }

    if !matches!(config.queue_mode.as_str(), "serial" | "concurrent") {
        return Err(AppError::Config("不支持的 AI 队列模式".to_string()));
    }

    if config.max_concurrency == 0
        || config.max_concurrency > AI_PROVIDER_TEST_MAX_CONFIG_CONCURRENCY
    {
        return Err(AppError::Config(format!(
            "AI 并发槽位必须在 1 到 {} 之间",
            AI_PROVIDER_TEST_MAX_CONFIG_CONCURRENCY
        )));
    }

    if action == "image" && (config.image_count == 0 || config.image_count > 4) {
        return Err(AppError::Config(
            "生图测试一次仅支持 1 到 4 张图片".to_string(),
        ));
    }

    validate_text_len(
        "提供商显示名称",
        &config.display_name,
        AI_PROVIDER_DISPLAY_NAME_MAX_CHARS,
    )?;
    validate_text_len("Base URL", &config.base_url, AI_PROVIDER_BASE_URL_MAX_CHARS)?;
    validate_text_len("API Key", &config.api_key, AI_PROVIDER_API_KEY_MAX_CHARS)?;
    validate_text_len("模型名称", &config.model, AI_PROVIDER_MODEL_MAX_CHARS)?;
    validate_text_len(
        "测试提示词",
        &config.test_prompt,
        AI_PROVIDER_PROMPT_MAX_CHARS,
    )?;
    validate_text_len(
        "生图模型名称",
        &config.image_model,
        AI_PROVIDER_MODEL_MAX_CHARS,
    )?;
    validate_text_len(
        "生图提示词",
        &config.image_prompt,
        AI_PROVIDER_PROMPT_MAX_CHARS,
    )?;

    if config.base_url.trim().is_empty() {
        return Err(AppError::Config("模型提供商 Base URL 不能为空".to_string()));
    }

    let base_url = config.base_url.trim().to_lowercase();
    let is_local =
        base_url.starts_with("http://127.0.0.1") || base_url.starts_with("http://localhost");
    if !base_url.starts_with("https://") && !is_local {
        return Err(AppError::Config(
            "Base URL 仅允许 https，或本机 localhost/127.0.0.1 调试地址".to_string(),
        ));
    }

    if action == "chat" && config.model.trim().is_empty() {
        return Err(AppError::Config("模型名称不能为空".to_string()));
    }

    if action == "image" {
        if config.image_model.trim().is_empty() {
            return Err(AppError::Config("生图模型名称不能为空".to_string()));
        }

        if config.image_prompt.trim().is_empty() {
            return Err(AppError::Config("生图提示词不能为空".to_string()));
        }

        if !SUPPORTED_IMAGE_SIZES.contains(&config.image_size.as_str()) {
            return Err(AppError::Config("不支持的生图尺寸".to_string()));
        }
    }

    if config.api_key.trim().is_empty() && !is_local {
        return Err(AppError::Config("API Key 不能为空".to_string()));
    }

    Ok(())
}

fn is_supported_provider_id(provider: &str) -> bool {
    let registry = ai_provider_registry();
    registry_provider(&registry, provider).is_some() || provider.trim() == "anthropic"
}

fn ai_provider_registry() -> Value {
    serde_json::from_str(AI_PROVIDER_REGISTRY_JSON).unwrap_or_else(|_| json!({}))
}

fn registry_provider<'a>(registry: &'a Value, provider: &str) -> Option<&'a Value> {
    registry.get("providers")?.get(provider.trim())
}

fn registry_adapter<'a>(registry: &'a Value, adapter_id: &str) -> Option<&'a Value> {
    registry.get("adapters")?.get(adapter_id.trim())
}

fn registry_text(value: &Value, key: &str) -> String {
    value
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}

fn registry_default_adapter_id(registry: &Value) -> String {
    registry
        .get("defaultAdapterId")
        .and_then(Value::as_str)
        .unwrap_or("openai-compatible")
        .to_string()
}

fn registry_provider_adapter_id(registry: &Value, provider: &str) -> String {
    registry_provider(registry, provider)
        .map(|record| registry_text(record, "adapterId"))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| {
            if provider.trim() == "anthropic" {
                "anthropic-messages".to_string()
            } else {
                registry_default_adapter_id(registry)
            }
        })
}

fn registry_record_has_capability(record: &Value, capability: &str) -> bool {
    record
        .get("capabilities")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .any(|item| item.as_str().is_some_and(|value| value == capability))
        })
        .unwrap_or(false)
}

fn registry_record_declares_capabilities(record: &Value) -> bool {
    record
        .get("capabilities")
        .and_then(Value::as_array)
        .is_some()
}

fn base_url_matches_adapter_record(adapter: &Value, base_url: &str) -> bool {
    let clean_base_url = base_url.trim().to_ascii_lowercase();
    adapter
        .get("baseUrlHostPatterns")
        .and_then(Value::as_array)
        .map(|patterns| {
            patterns.iter().any(|pattern| {
                pattern
                    .as_str()
                    .map(|value| clean_base_url.contains(&value.to_ascii_lowercase()))
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

fn base_url_matches_adapter(registry: &Value, adapter_id: &str, base_url: &str) -> bool {
    registry_adapter(registry, adapter_id)
        .map(|adapter| base_url_matches_adapter_record(adapter, base_url))
        .unwrap_or(false)
}

fn resolve_provider_adapter_id(registry: &Value, config: &AiProviderConfig) -> String {
    if let Some(adapters) = registry.get("adapters").and_then(Value::as_object) {
        for (adapter_id, adapter) in adapters {
            if base_url_matches_adapter_record(adapter, &config.base_url) {
                return adapter_id.to_string();
            }
        }
    }

    let explicit_adapter = config.adapter_id.trim();
    if !explicit_adapter.is_empty() && registry_adapter(registry, explicit_adapter).is_some() {
        return explicit_adapter.to_string();
    }

    registry_provider_adapter_id(registry, &config.provider)
}

fn provider_supports_test_action(config: &AiProviderConfig, action: &str) -> bool {
    let registry = ai_provider_registry();
    let adapter_id = resolve_provider_adapter_id(&registry, config);
    let provider_adapter_id = registry_provider_adapter_id(&registry, &config.provider);
    let has_adapter_override =
        !config.adapter_id.trim().is_empty() && config.adapter_id.trim() != provider_adapter_id;
    let has_base_url_override = adapter_id != provider_adapter_id
        && base_url_matches_adapter(&registry, &adapter_id, &config.base_url);

    if !has_adapter_override && !has_base_url_override {
        if let Some(provider) = registry_provider(&registry, &config.provider) {
            if registry_record_declares_capabilities(provider) {
                return registry_record_has_capability(provider, action);
            }
        }
    }

    registry_adapter(&registry, &adapter_id)
        .map(|adapter| registry_record_has_capability(adapter, action))
        .unwrap_or(false)
}

fn validate_text_len(label: &str, value: &str, max_chars: usize) -> AppResult<()> {
    if value.chars().count() > max_chars {
        return Err(AppError::Config(format!(
            "{} 不能超过 {} 个字符",
            label, max_chars
        )));
    }

    Ok(())
}

fn build_sidecar_input(
    config: &AiProviderConfig,
    action: &str,
    request_id: Option<&str>,
    output_dir: &str,
) -> AppResult<String> {
    serde_json::to_string(&json!({
        "config": config,
        "action": action,
        "outputDir": if should_prepare_output_dir(action) { output_dir } else { "" },
        "requestId": request_id,
    }))
    .map_err(|error| AppError::Config(format!("AI 测试参数序列化失败: {}", error)))
}

fn should_prepare_output_dir(action: &str) -> bool {
    action == "image"
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_config() -> AiProviderConfig {
        AiProviderConfig {
            provider: "custom".to_string(),
            adapter_id: "openai-compatible".to_string(),
            display_name: "Mock".to_string(),
            base_url: "https://example.com/v1".to_string(),
            api_key: "secret".to_string(),
            remember_api_key: false,
            model: "chat-test".to_string(),
            test_prompt: "ping".to_string(),
            image_model: "image-test".to_string(),
            image_prompt: "blue robot".to_string(),
            image_size: "1024x1024".to_string(),
            image_count: 1,
            timeout_ms: 5_000,
            queue_mode: "serial".to_string(),
            max_concurrency: 3,
            queue_key: String::new(),
        }
    }

    fn validation_detail(config: &AiProviderConfig, action: &str) -> String {
        validate_provider_config(config, action)
            .expect_err("config should be rejected")
            .to_response()
            .detail
    }

    #[test]
    fn non_image_action_does_not_require_generated_output_dir() {
        assert!(!should_prepare_output_dir("chat"));
        assert!(!should_prepare_output_dir("models"));
        assert!(should_prepare_output_dir("image"));
    }

    #[test]
    fn build_sidecar_input_omits_output_dir_for_non_image_actions() {
        let config = make_config();

        let raw = build_sidecar_input(&config, "chat", Some("req-1"), "C:/tmp/output")
            .expect("input should serialize");
        let parsed: serde_json::Value = serde_json::from_str(&raw).expect("json should parse");
        assert_eq!(parsed["action"], "chat");
        assert_eq!(parsed["requestId"], "req-1");
        assert_eq!(parsed["outputDir"], "");
    }

    #[test]
    fn validate_provider_config_accepts_mainstream_openai_compatible_presets() {
        for provider in [
            "openai",
            "deepseek",
            "siliconflow",
            "kimi",
            "minimax",
            "glm",
            "ollama",
            "custom",
        ] {
            let mut config = make_config();
            config.provider = provider.to_string();

            validate_provider_config(&config, "chat")
                .unwrap_or_else(|error| panic!("{provider} should be accepted: {error:?}"));
        }
    }

    #[test]
    fn validate_provider_config_rejects_unsupported_provider_action() {
        let mut config = make_config();
        config.provider = "deepseek".to_string();

        assert!(validation_detail(&config, "image").contains("不支持该测试动作"));
    }

    #[test]
    fn validate_provider_config_treats_anthropic_native_as_chat_only() {
        let mut config = make_config();
        config.base_url = "https://api.anthropic.com".to_string();

        validate_provider_config(&config, "chat")
            .expect("anthropic native chat should be accepted");
        assert!(validation_detail(&config, "models").contains("不支持该测试动作"));
        assert!(validation_detail(&config, "image").contains("不支持该测试动作"));
    }

    #[test]
    fn validate_provider_config_accepts_third_party_anthropic_adapter_as_chat_only() {
        let mut config = make_config();
        config.provider = "custom".to_string();
        config.adapter_id = "anthropic-messages".to_string();
        config.base_url = "https://anthropic-gateway.example.com".to_string();

        validate_provider_config(&config, "chat")
            .expect("third-party anthropic adapter chat should be accepted");
        assert!(validation_detail(&config, "models").contains("不支持该测试动作"));
        assert!(validation_detail(&config, "image").contains("不支持该测试动作"));
    }

    #[test]
    fn validate_provider_config_rejects_overlong_base_url() {
        let mut config = make_config();
        config.base_url = format!(
            "https://example.com/{}",
            "a".repeat(AI_PROVIDER_BASE_URL_MAX_CHARS)
        );

        assert!(validation_detail(&config, "models").contains("Base URL 不能超过"));
    }

    #[test]
    fn validate_provider_config_rejects_overlong_api_key() {
        let mut config = make_config();
        config.api_key = "k".repeat(AI_PROVIDER_API_KEY_MAX_CHARS + 1);

        assert!(validation_detail(&config, "models").contains("API Key 不能超过"));
    }

    #[test]
    fn validate_provider_config_rejects_overlong_chat_prompt() {
        let mut config = make_config();
        config.test_prompt = "你".repeat(AI_PROVIDER_PROMPT_MAX_CHARS + 1);

        assert!(validation_detail(&config, "chat").contains("测试提示词 不能超过"));
    }

    #[test]
    fn validate_provider_config_rejects_overlong_chat_model() {
        let mut config = make_config();
        config.model = "m".repeat(AI_PROVIDER_MODEL_MAX_CHARS + 1);

        assert!(validation_detail(&config, "chat").contains("模型名称 不能超过"));
    }

    #[test]
    fn validate_provider_config_rejects_overlong_image_model() {
        let mut config = make_config();
        config.image_model = "m".repeat(AI_PROVIDER_MODEL_MAX_CHARS + 1);

        assert!(validation_detail(&config, "image").contains("生图模型名称 不能超过"));
    }

    #[test]
    fn validate_provider_config_rejects_overlong_image_prompt() {
        let mut config = make_config();
        config.image_prompt = "图".repeat(AI_PROVIDER_PROMPT_MAX_CHARS + 1);

        assert!(validation_detail(&config, "image").contains("生图提示词 不能超过"));
    }

    #[test]
    fn validate_provider_config_accepts_verified_image_sizes() {
        for size in SUPPORTED_IMAGE_SIZES {
            let mut config = make_config();
            config.image_size = (*size).to_string();

            validate_provider_config(&config, "image")
                .unwrap_or_else(|error| panic!("{size} should be accepted: {error:?}"));
        }
    }

    #[test]
    fn validate_provider_config_rejects_unverified_image_sizes() {
        for size in [
            "512x512",
            "1792x1008",
            "3840x960",
            "960x3840",
            "7680x4320",
            "4320x7680",
            "7680x960",
            "7680x160",
            "8192x8192",
            "bad-size",
        ] {
            let mut config = make_config();
            config.image_size = size.to_string();

            assert!(
                validation_detail(&config, "image").contains("不支持的生图尺寸"),
                "{size} should be rejected until a real generation run verifies it"
            );
        }
    }

    #[test]
    fn cancel_token_can_be_shared_and_observed() {
        let token = AiProviderCancelToken::new();
        let cloned = token.clone();

        assert!(!token.is_cancelled());
        cloned.cancel();

        assert!(token.is_cancelled());
    }
}
