use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};
use crate::services::ai_generation_support::*;
pub use crate::services::ai_generation_task::AiGenerationTask;
use crate::services::ai_generation_task::{
    ai_generation_task_registry, list_recent_generation_tasks,
};
use crate::services::ai_provider_config::{
    build_generation_sidecar_input, build_sidecar_input, should_prepare_output_dir,
    validate_generation_config, validate_provider_config,
};
use crate::services::ai_provider_output::cleanup_generated_output_dir;
use crate::services::ai_provider_process::{
    configure_python_sidecar_command, join_output_reader, parse_sidecar_result, sanitize_secret,
    spawn_limited_output_reader, terminate_child, truncate_output, SIDECAR_STDERR_MAX_BYTES,
    SIDECAR_STDOUT_MAX_BYTES,
};
pub use crate::services::ai_provider_queue::AiProviderQueueStatus;
use crate::services::ai_provider_queue::{
    ai_provider_test_queue, provider_test_queue_config, provider_test_queue_wait_timeout,
};
use crate::services::ai_provider_task::{
    ai_provider_cancel_registry, ai_provider_task_registry, list_recent_provider_tasks, now_ms,
};
pub use crate::services::ai_provider_task::{AiProviderCancelToken, AiProviderTestTask};
pub use crate::services::ai_provider_types::{
    AiBusinessGenerationRequest, AiGenerationOptions, AiGenerationRequest, AiGenerationResult,
    AiProviderConfig, AiProviderTestResult,
};
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Child, Command, ExitStatus};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant, SystemTime};
use tauri::{AppHandle, Manager, Runtime, Wry};

pub struct AiProviderService<R: Runtime = Wry> {
    app_handle: AppHandle<R>,
}

struct AiSidecarGenerationInput {
    capability: String,
    prompt: String,
    model: String,
    options: AiGenerationOptions,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedAiModelConfig {
    #[serde(default)]
    id: String,
    #[serde(flatten)]
    config: AiProviderConfig,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AiPreferenceState {
    #[serde(default, rename = "aiModelConfigs")]
    model_configs: Vec<PersistedAiModelConfig>,
    #[serde(default, rename = "aiProvider")]
    legacy_provider_config: Option<AiProviderConfig>,
    #[serde(default, rename = "aiActiveModelConfigs")]
    active_model_config_ids: HashMap<String, String>,
}

#[derive(Debug, Clone)]
struct CachedAiPreferenceState {
    modified_at: Option<SystemTime>,
    file_len: u64,
    state: AiPreferenceState,
}

static AI_PREFERENCE_STATE_CACHE: OnceLock<Mutex<HashMap<PathBuf, CachedAiPreferenceState>>> =
    OnceLock::new();

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

    pub fn spawn_direct_generation(
        &self,
        mut request: AiGenerationRequest,
    ) -> tauri::async_runtime::JoinHandle<Result<AiGenerationResult, String>> {
        ensure_generation_request_id(&mut request);
        let app_handle = self.app_handle.clone();
        let total_started = Instant::now();
        tauri::async_runtime::spawn_blocking(move || {
            Self::run_generation_request_blocking(app_handle, request, total_started, "direct")
        })
    }

    pub fn spawn_business_generation(
        &self,
        mut request: AiBusinessGenerationRequest,
    ) -> tauri::async_runtime::JoinHandle<Result<AiGenerationResult, String>> {
        ensure_business_generation_request_id(&mut request);
        let app_handle = self.app_handle.clone();
        let total_started = Instant::now();
        tauri::async_runtime::spawn_blocking(move || {
            Self::run_business_generation_request_blocking(app_handle, request, total_started)
        })
    }

    pub fn enqueue_business_generation(
        &self,
        mut request: AiBusinessGenerationRequest,
    ) -> Result<AiGenerationTask, String> {
        let request_id = ensure_business_generation_request_id(&mut request);
        let capability = normalize_generation_capability(&request.capability)?;
        if should_persist_business_generation(&request_id) {
            let persisted = persist_business_generation_task(
                &self.app_handle,
                &request_id,
                &capability,
                &request,
            )?;
            if is_generation_terminal_status(&persisted.status) {
                return persisted_task_to_generation_task(persisted);
            }
        }
        let was_active_in_memory = ai_generation_task_registry()
            .get(&request_id)
            .map(|task| !is_generation_terminal_status(&task.status))
            .unwrap_or(false);
        let task = ai_generation_task_registry().enqueue(
            request_id.clone(),
            capability.clone(),
            "business".to_string(),
            normalize_optional_id(request.provider_config_id.as_deref()),
            normalize_optional_id(request.model.as_deref()),
        )?;
        let app_handle = self.app_handle.clone();
        let total_started = Instant::now();
        if !was_active_in_memory {
            tauri::async_runtime::spawn_blocking(move || {
                let _ = Self::run_business_generation_request_blocking(
                    app_handle,
                    request,
                    total_started,
                );
            });
        }
        Ok(task)
    }

    pub fn run_business_generation_blocking(
        &self,
        request: AiBusinessGenerationRequest,
    ) -> Result<AiGenerationResult, String> {
        let app_handle = self.app_handle.clone();
        let total_started = Instant::now();
        Self::run_business_generation_request_blocking(app_handle, request, total_started)
    }

    pub fn get_generation_task(&self, request_id: &str) -> Result<AiGenerationTask, String> {
        match ai_generation_task_registry().get(request_id) {
            Ok(task) => Ok(task),
            Err(memory_error) => persisted_generation_repo(&self.app_handle)
                .and_then(|repo| repo.get(request_id).map_err(|error| error.to_json_string()))
                .map_err(|_| memory_error)
                .and_then(persisted_task_to_generation_task),
        }
    }

    pub fn list_generation_tasks(&self) -> Result<Vec<AiGenerationTask>, String> {
        let mut seen = HashSet::new();
        let mut tasks = Vec::new();

        if let Ok(repo) = persisted_generation_repo(&self.app_handle) {
            for task in repo
                .list_recent(80)
                .map_err(|error| error.to_json_string())?
            {
                let task = persisted_task_to_generation_task(task)?;
                seen.insert(task.request_id.clone());
                tasks.push(task);
            }
        }

        for task in list_recent_generation_tasks()? {
            if seen.insert(task.request_id.clone()) {
                tasks.push(task);
            }
        }

        tasks.sort_by(|left, right| right.created_at_ms.cmp(&left.created_at_ms));
        Ok(tasks)
    }

    pub fn cancel_generation_task(&self, request_id: &str) -> Result<bool, String> {
        let cancelled_queued = ai_provider_test_queue().cancel_queued_request(request_id)?;
        if cancelled_queued {
            ai_provider_cancel_registry().remove(request_id);
            ai_generation_task_registry().cancel(
                request_id,
                "AI 生成排队任务已取消".to_string(),
                None,
            );
            let _ = cancel_persisted_generation_task(
                &self.app_handle,
                request_id,
                "AI 生成排队任务已取消".to_string(),
            );
            return Ok(true);
        }

        let cancelled_running = ai_provider_cancel_registry().cancel(request_id)?;
        if cancelled_running {
            ai_generation_task_registry().cancel(request_id, "AI 生成任务已取消".to_string(), None);
            let _ = cancel_persisted_generation_task(
                &self.app_handle,
                request_id,
                "AI 生成任务已取消".to_string(),
            );
            return Ok(true);
        }

        let cancelled_memory =
            ai_generation_task_registry().cancel(request_id, "AI 生成任务已取消".to_string(), None);
        let cancelled_persisted = cancel_persisted_generation_task(
            &self.app_handle,
            request_id,
            "AI 生成任务已取消".to_string(),
        )?;
        Ok(cancelled_memory || cancelled_persisted)
    }

    pub fn resume_persisted_business_generations(&self) -> Result<u32, String> {
        let repo = persisted_generation_repo(&self.app_handle)?;
        let tasks = repo
            .recover_runnable_business_tasks()
            .map_err(|error| error.to_json_string())?;
        let mut resumed = 0;
        for task in tasks {
            let Some(mut request) = persisted_task_to_business_request(&task)? else {
                continue;
            };
            request.request_id = Some(task.request_id.clone());
            if !should_persist_business_generation(&task.request_id) {
                continue;
            }
            let already_active = ai_generation_task_registry()
                .get(&task.request_id)
                .map(|task| !is_generation_terminal_status(&task.status))
                .unwrap_or(false);
            ai_generation_task_registry().enqueue(
                task.request_id.clone(),
                task.capability.clone(),
                task.scope.clone(),
                task.provider_config_id.clone(),
                task.model.clone(),
            )?;
            if already_active {
                continue;
            }

            let app_handle = self.app_handle.clone();
            tauri::async_runtime::spawn_blocking(move || {
                let _ = Self::run_business_generation_request_blocking(
                    app_handle,
                    request,
                    Instant::now(),
                );
            });
            resumed += 1;
        }
        Ok(resumed)
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
        list_recent_provider_tasks()
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

        self.run_provider_sidecar(config, action, request_id, cancel_token, None)
    }

    fn run_generation_request_blocking(
        app_handle: AppHandle<R>,
        mut request: AiGenerationRequest,
        total_started: Instant,
        scope: &str,
    ) -> Result<AiGenerationResult, String> {
        let capability = normalize_generation_capability(&request.capability)?;
        let request_id = ensure_generation_request_id(&mut request);
        let existing_task = ai_generation_task_registry().ensure_queued(
            request_id.clone(),
            capability.clone(),
            scope.to_string(),
            normalize_optional_id(request.model.as_deref()),
        )?;
        if is_generation_terminal_status(&existing_task.status) {
            return generation_task_to_blocking_result(existing_task);
        }
        let provider_action = provider_action_for_generation_capability(&capability);
        let queue_config = provider_test_queue_config(provider_action, &request.config);
        let wait_timeout = provider_test_queue_wait_timeout(provider_action, &request.config);
        let cancel_token = ai_provider_cancel_registry().register(request_id.clone())?;
        let permit = ai_provider_test_queue().enter_with_config(
            capability.clone(),
            request_id.clone(),
            wait_timeout,
            queue_config,
        );
        if permit.is_err() {
            ai_provider_cancel_registry().remove(&request_id);
        }
        let permit = match permit {
            Ok(permit) => permit,
            Err(error) => {
                ai_generation_task_registry().fail(
                    &request_id,
                    error.clone(),
                    total_started.elapsed().as_millis() as u64,
                );
                let _ = fail_persisted_generation_task(
                    &app_handle,
                    &request_id,
                    error.clone(),
                    total_started.elapsed().as_millis() as u64,
                );
                return Err(error);
            }
        };
        ai_generation_task_registry().mark_running(&request_id, permit.queue_wait_ms());
        let _ = mark_persisted_generation_running(&app_handle, &request_id, permit.queue_wait_ms());
        let service = AiProviderService::new(app_handle.clone());
        let request_id_for_cancel = request_id.clone();
        request.request_id = Some(request_id);
        let result = service
            .generate_content_with_cancel_token(request, Some(cancel_token))
            .map_err(|error| error.to_json_string());
        ai_provider_cancel_registry().remove(&request_id_for_cancel);
        let total_latency_ms = total_started.elapsed().as_millis() as u64;
        match result {
            Ok(mut result) => {
                result.queue_wait_ms = Some(permit.queue_wait_ms());
                result.total_latency_ms = Some(total_latency_ms);
                let _ = complete_persisted_generation_task(
                    &app_handle,
                    &request_id_for_cancel,
                    &result,
                    total_latency_ms,
                );
                ai_generation_task_registry().complete(
                    &request_id_for_cancel,
                    result.clone(),
                    total_latency_ms,
                );
                Ok(result)
            }
            Err(error) => {
                let _ = fail_persisted_generation_task(
                    &app_handle,
                    &request_id_for_cancel,
                    error.clone(),
                    total_latency_ms,
                );
                ai_generation_task_registry().fail(
                    &request_id_for_cancel,
                    error.clone(),
                    total_latency_ms,
                );
                Err(error)
            }
        }
    }

    fn run_business_generation_request_blocking(
        app_handle: AppHandle<R>,
        mut request: AiBusinessGenerationRequest,
        total_started: Instant,
    ) -> Result<AiGenerationResult, String> {
        let request_id = ensure_business_generation_request_id(&mut request);
        let capability = normalize_generation_capability(&request.capability)?;
        if should_persist_business_generation(&request_id) {
            let persisted =
                persist_business_generation_task(&app_handle, &request_id, &capability, &request)?;
            if is_generation_terminal_status(&persisted.status) {
                return generation_task_to_blocking_result(persisted_task_to_generation_task(
                    persisted,
                )?);
            }
        }
        let existing_task = ai_generation_task_registry().ensure_queued(
            request_id.clone(),
            capability,
            "business".to_string(),
            normalize_optional_id(request.model.as_deref()),
        )?;
        if is_generation_terminal_status(&existing_task.status) {
            return generation_task_to_blocking_result(existing_task);
        }
        let service = AiProviderService::new(app_handle.clone());
        let request = match service.build_business_generation_request(request) {
            Ok(request) => request,
            Err(error) => {
                let error_message = error.to_json_string();
                let _ = fail_persisted_generation_task(
                    &app_handle,
                    &request_id,
                    error_message.clone(),
                    total_started.elapsed().as_millis() as u64,
                );
                ai_generation_task_registry().fail(
                    &request_id,
                    error_message.clone(),
                    total_started.elapsed().as_millis() as u64,
                );
                return Err(error_message);
            }
        };
        Self::run_generation_request_blocking(app_handle, request, total_started, "business")
    }

    fn build_business_generation_request(
        &self,
        request: AiBusinessGenerationRequest,
    ) -> AppResult<AiGenerationRequest> {
        let capability =
            normalize_generation_capability(&request.capability).map_err(AppError::Config)?;
        let selected =
            self.resolve_business_model_config(&capability, request.provider_config_id)?;
        let mut config = selected.config;
        config.queue_key = selected.id;

        Ok(AiGenerationRequest {
            capability,
            config,
            prompt: request.prompt,
            model: request.model,
            request_id: request.request_id,
            options: request.options,
        })
    }

    fn resolve_business_model_config(
        &self,
        capability: &str,
        provider_config_id: Option<String>,
    ) -> AppResult<PersistedAiModelConfig> {
        let preferences = self.read_ai_preference_state()?;
        let mut model_configs = preferences.model_configs;
        if model_configs.is_empty() {
            if let Some(config) = preferences.legacy_provider_config {
                model_configs.push(PersistedAiModelConfig {
                    id: "legacy-ai-provider".to_string(),
                    config,
                });
            }
        }
        if model_configs.is_empty() {
            return Err(AppError::Config("未找到可用的 AI 模型配置".to_string()));
        }

        if let Some(config_id) = provider_config_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            return model_configs
                .into_iter()
                .find(|config| config.id == config_id)
                .ok_or_else(|| AppError::Config("指定的 AI 模型配置不存在".to_string()));
        }

        for key in business_active_config_keys(capability) {
            if let Some(config_id) = preferences.active_model_config_ids.get(*key) {
                if let Some(config) = model_configs
                    .iter()
                    .find(|config| config.id == *config_id)
                    .cloned()
                {
                    return Ok(config);
                }
            }
        }

        model_configs
            .into_iter()
            .next()
            .ok_or_else(|| AppError::Config("未找到可用的 AI 模型配置".to_string()))
    }

    fn read_ai_preference_state(&self) -> AppResult<AiPreferenceState> {
        #[cfg(test)]
        let app_dir = std::env::var_os("MONSTER_TOOLS_TEST_APP_DIR")
            .map(PathBuf::from)
            .map(Ok)
            .unwrap_or_else(|| {
                PathProvider::new(self.app_handle.clone()).get_app_local_data_dir()
            })?;

        #[cfg(not(test))]
        let app_dir = PathProvider::new(self.app_handle.clone()).get_app_local_data_dir()?;
        let cfg_path = app_dir.join("config.json");
        read_cached_ai_preference_state(cfg_path)
    }

    #[cfg(test)]
    pub fn generate_content(&self, request: AiGenerationRequest) -> AppResult<AiGenerationResult> {
        self.generate_content_with_cancel_token(request, None)
    }

    fn generate_content_with_cancel_token(
        &self,
        request: AiGenerationRequest,
        cancel_token: Option<AiProviderCancelToken>,
    ) -> AppResult<AiGenerationResult> {
        let capability =
            normalize_generation_capability(&request.capability).map_err(AppError::Config)?;
        let mut config = request.config.clone();
        let prompt = request.prompt.trim().to_string();
        let options = normalize_generation_options(request.options);
        let request_id = request.request_id.clone();

        match capability.as_str() {
            "chat" => {
                config.test_prompt = prompt.clone();
                if let Some(model) = request
                    .model
                    .as_deref()
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                {
                    config.model = model.to_string();
                }
                validate_generation_config(&config, "chat", &prompt, &config.model)?;
                let result = self.run_provider_sidecar(
                    config.clone(),
                    "chat".to_string(),
                    request_id,
                    cancel_token,
                    Some(AiSidecarGenerationInput {
                        capability: "chat".to_string(),
                        prompt,
                        model: config.model.clone(),
                        options,
                    }),
                )?;
                Ok(provider_result_to_generation("chat", result))
            }
            capability if is_image_generation_capability(capability) => {
                config.image_prompt = build_image_generation_prompt(capability, &prompt, &options);
                if let Some(model) = request
                    .model
                    .as_deref()
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                {
                    config.image_model = model.to_string();
                }
                if let Some(size) = options
                    .size
                    .as_deref()
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                {
                    config.image_size = size.to_string();
                }
                config.image_count = options.count.clamp(1, 4);
                validate_generation_config(
                    &config,
                    capability,
                    &config.image_prompt,
                    &config.image_model,
                )?;
                let result = self.run_provider_sidecar(
                    config.clone(),
                    "image".to_string(),
                    request_id,
                    cancel_token,
                    Some(AiSidecarGenerationInput {
                        capability: capability.to_string(),
                        prompt: config.image_prompt.clone(),
                        model: config.image_model.clone(),
                        options,
                    }),
                )?;
                Ok(provider_result_to_generation(capability, result))
            }
            "audio" | "video" => {
                if let Some(model) = request
                    .model
                    .as_deref()
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                {
                    config.model = model.to_string();
                }
                validate_generation_config(&config, &capability, &prompt, &config.model)?;
                let result = self.run_provider_sidecar(
                    config.clone(),
                    capability.clone(),
                    request_id,
                    cancel_token,
                    Some(AiSidecarGenerationInput {
                        capability: capability.clone(),
                        prompt,
                        model: config.model.clone(),
                        options,
                    }),
                )?;
                Ok(provider_result_to_generation(&capability, result))
            }
            _ => Err(AppError::Config("不支持的 AI 原子能力".to_string())),
        }
    }

    fn run_provider_sidecar(
        &self,
        config: AiProviderConfig,
        action: String,
        request_id: Option<String>,
        cancel_token: Option<AiProviderCancelToken>,
        generation: Option<AiSidecarGenerationInput>,
    ) -> AppResult<AiProviderTestResult> {
        let started = Instant::now();
        let output_dir = if should_prepare_output_dir(&action) {
            self.resolve_generated_output_dir()?
                .to_string_lossy()
                .to_string()
        } else {
            String::new()
        };
        let input = if let Some(generation) = generation.as_ref() {
            build_generation_sidecar_input(
                &config,
                &action,
                request_id.as_deref(),
                &output_dir,
                &generation.capability,
                &generation.prompt,
                &generation.model,
                &generation.options,
            )?
        } else {
            build_sidecar_input(&config, &action, request_id.as_deref(), &output_dir)?
        };

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

        let request_timeout_ms = provider_request_timeout_ms(&action, &config);
        let timeout_ms = provider_sidecar_timeout_ms(&action, request_timeout_ms);
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
                    AppError::Io(format!("创建 AI 生成输出目录失败: {}", error))
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

fn read_cached_ai_preference_state(cfg_path: PathBuf) -> AppResult<AiPreferenceState> {
    if !cfg_path.exists() {
        if let Some(cache) = AI_PREFERENCE_STATE_CACHE.get() {
            if let Ok(mut cache) = cache.lock() {
                cache.remove(&cfg_path);
            }
        }
        return Ok(AiPreferenceState::default());
    }

    let metadata = fs::metadata(&cfg_path)
        .map_err(|error| AppError::Io(format!("读取 AI 偏好配置状态失败: {}", error)))?;
    let modified_at = metadata.modified().ok();
    let file_len = metadata.len();

    let cache = AI_PREFERENCE_STATE_CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    if let Ok(cache_guard) = cache.lock() {
        if let Some(cached) = cache_guard.get(&cfg_path) {
            if cached.modified_at == modified_at && cached.file_len == file_len {
                return Ok(cached.state.clone());
            }
        }
    }

    let content = fs::read_to_string(&cfg_path)
        .map_err(|error| AppError::Io(format!("读取 AI 偏好配置失败: {}", error)))?;
    let clean_content = content.trim_start_matches('\u{FEFF}');
    let state: AiPreferenceState = serde_json::from_str(clean_content)
        .map_err(|error| AppError::Config(format!("AI 偏好配置 JSON 格式不合法: {}", error)))?;

    if let Ok(mut cache_guard) = cache.lock() {
        cache_guard.insert(
            cfg_path,
            CachedAiPreferenceState {
                modified_at,
                file_len,
                state: state.clone(),
            },
        );
    }

    Ok(state)
}
