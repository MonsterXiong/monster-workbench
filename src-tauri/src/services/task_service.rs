use crate::infra::creative_asset_repo;
use crate::infra::creative_task_repo;
use crate::infra::creative_types::{
    CreateAssetLinkInput, CreateCreativeAssetInput, CreateCreativeTaskInput, CreateTaskEventInput,
    CreativeAsset, CreativeTask, ListAssetLinksFilter, ListCreativeAssetsFilter,
    ListCreativeTasksFilter, TaskEvent, UpdateCreativeTaskStatusInput,
};
use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};
use crate::services::cancel_checkpoint_service::start_cancel_checkpoint_server;
use crate::services::sidecar_lifecycle_service::{
    GenerateImagePromptSidecarRequest, SidecarLifecycleService, SidecarRuntimeEndpoint,
    SidecarWorkflowTaskResult,
};
use crate::services::workflow_settle_service::{
    append_sidecar_result_events, create_ready_sidecar_asset, persist_cancelled_sidecar_model_runs,
    persist_sidecar_model_runs, validate_sidecar_task_result,
};
use serde_json::json;
use tauri::{AppHandle, Emitter, Runtime, Wry};

#[derive(serde::Serialize, Clone)]
pub struct TaskProgressPayload {
    pub task_id: String,
    pub task_name: String,
    pub progress: f32,  // 0.0 - 100.0
    pub status: String, // "running", "success", "failed"
    pub message: String,
}

pub struct TaskService<R: Runtime = Wry> {
    app_handle: AppHandle<R>,
    path_provider: PathProvider,
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreativeTaskEventPayload {
    pub task_id: i64,
    pub project_id: Option<String>,
    pub status: String,
    pub message: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateImagePromptWorkflowInput {
    pub project_id: Option<String>,
    pub brief: String,
    pub style: Option<String>,
    pub mood: Option<String>,
    pub aspect_ratio: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateImagePromptWorkflowResult {
    pub task: CreativeTask,
    pub asset: CreativeAsset,
    pub events: Vec<TaskEvent>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewAssetQualityStubInput {
    pub project_id: Option<String>,
    pub source_asset_id: i64,
    pub source_task_id: Option<i64>,
    pub review_kind: Option<String>,
    pub content_hint: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewAssetQualityStubResult {
    pub task: CreativeTask,
    pub review_asset: CreativeAsset,
    pub revise_task: Option<CreativeTask>,
    pub events: Vec<TaskEvent>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewResultPayload {
    pub pass: bool,
    pub quality_score: i64,
    pub problems: Vec<String>,
    pub revision_instruction: String,
    pub manual_approval_status: String,
    pub review_kind: String,
    pub source_asset_id: i64,
    pub source_task_id: Option<i64>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCreativeAssetServiceInput {
    pub project_id: Option<String>,
    pub asset_type: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub file_path: Option<String>,
    pub thumbnail_path: Option<String>,
    pub metadata_json: Option<String>,
    pub status: Option<String>,
}

impl<R: Runtime> TaskService<R> {
    pub fn new(app_handle: AppHandle<R>, path_provider: PathProvider) -> Self {
        Self {
            app_handle,
            path_provider,
        }
    }

    /// 寮€鍚竴涓ā鎷熺殑鍚庡彴闀夸换鍔★紝鐢ㄤ互娴嬭瘯杩涘害閫氱煡鏈哄埗
    pub fn start_dummy_task(&self, task_id: String, task_name: String) -> AppResult<()> {
        let handle = self.app_handle.clone();
        std::thread::spawn(move || {
            let total_steps = 10;
            for i in 1..=total_steps {
                std::thread::sleep(std::time::Duration::from_millis(400));
                let progress = (i as f32 / total_steps as f32) * 100.0;
                let status = if i == total_steps {
                    "success".to_string()
                } else {
                    "running".to_string()
                };
                let message = if i == total_steps {
                    "浠诲姟鎵ц瀹屾瘯".to_string()
                } else {
                    format!("姝ｅ湪澶勭悊绗?{}/{} 閮ㄥ垎...", i, total_steps)
                };

                let payload = TaskProgressPayload {
                    task_id: task_id.clone(),
                    task_name: task_name.clone(),
                    progress,
                    status,
                    message,
                };
                let _ = handle.emit("task-progress", payload);
            }
        });
        Ok(())
    }

    pub fn create_creative_task(&self, input: CreateCreativeTaskInput) -> AppResult<CreativeTask> {
        validate_create_task_input(&input)?;
        let task = creative_task_repo::create_task(&self.db_path()?, input)?;
        self.emit_task_event(
            "creative-task-created",
            CreativeTaskEventPayload {
                task_id: task.id,
                project_id: task.project_id.clone(),
                status: task.status.clone(),
                message: Some(format!("task created: {}", task.task_type)),
                created_at: task.created_at.clone(),
            },
        )?;
        Ok(task)
    }

    pub fn get_creative_task(&self, id: i64) -> AppResult<Option<CreativeTask>> {
        if id <= 0 {
            return Err(AppError::Config("task id must be positive".to_string()));
        }
        creative_task_repo::get_task(&self.db_path()?, id)
    }

    pub fn list_creative_tasks(
        &self,
        filter: ListCreativeTasksFilter,
    ) -> AppResult<Vec<CreativeTask>> {
        creative_task_repo::list_tasks(&self.db_path()?, filter)
    }

    pub fn create_creative_asset(
        &self,
        input: CreateCreativeAssetServiceInput,
    ) -> AppResult<CreativeAsset> {
        validate_creative_asset_input(&input)?;
        creative_asset_repo::create_asset(
            &self.db_path()?,
            CreateCreativeAssetInput {
                project_id: input.project_id,
                asset_type: input.asset_type,
                title: input.title,
                content: input.content,
                file_path: input.file_path,
                thumbnail_path: input.thumbnail_path,
                metadata_json: input.metadata_json,
                status: input.status,
            },
        )
    }

    pub fn list_creative_assets(
        &self,
        filter: ListCreativeAssetsFilter,
    ) -> AppResult<Vec<CreativeAsset>> {
        creative_asset_repo::list_assets(&self.db_path()?, filter)
    }

    pub fn create_asset_link(
        &self,
        input: CreateAssetLinkInput,
    ) -> AppResult<crate::infra::creative_types::AssetLink> {
        validate_asset_link_input(&input)?;
        creative_asset_repo::create_asset_link(&self.db_path()?, input)
    }

    pub fn list_asset_links(
        &self,
        filter: ListAssetLinksFilter,
    ) -> AppResult<Vec<crate::infra::creative_types::AssetLink>> {
        creative_asset_repo::list_asset_links(&self.db_path()?, filter)
    }

    pub fn update_creative_task_status(
        &self,
        input: UpdateCreativeTaskStatusInput,
    ) -> AppResult<CreativeTask> {
        validate_status_input(&input)?;
        let task = creative_task_repo::update_task_status(&self.db_path()?, input)?;
        self.emit_task_event(
            "creative-task-status-changed",
            CreativeTaskEventPayload {
                task_id: task.id,
                project_id: task.project_id.clone(),
                status: task.status.clone(),
                message: Some(format!("status changed to {}", task.status)),
                created_at: task.updated_at.clone(),
            },
        )?;
        Ok(task)
    }

    pub fn append_task_event(&self, input: CreateTaskEventInput) -> AppResult<TaskEvent> {
        validate_task_event_input(&input)?;
        let event = creative_task_repo::append_task_event(&self.db_path()?, input)?;
        let task = creative_task_repo::get_task(&self.db_path()?, event.task_id)?
            .ok_or_else(|| AppError::Database("task not found for appended event".to_string()))?;
        self.emit_task_event(
            "creative-task-event",
            CreativeTaskEventPayload {
                task_id: event.task_id,
                project_id: task.project_id,
                status: task.status,
                message: event.message.clone(),
                created_at: event.created_at.clone(),
            },
        )?;
        Ok(event)
    }

    pub fn run_generate_image_prompt_workflow_with_endpoint_provider(
        &self,
        input: GenerateImagePromptWorkflowInput,
        ensure_endpoint: impl FnOnce() -> AppResult<SidecarRuntimeEndpoint>,
    ) -> AppResult<GenerateImagePromptWorkflowResult> {
        validate_generate_image_prompt_input(&input)?;
        let db_path = self.db_path()?;
        let task_payload_json = serde_json::to_string(&input).map_err(|error| {
            AppError::Config(format!("failed to encode workflow input payload: {error}"))
        })?;
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: input.project_id.clone(),
                goal_id: None,
                batch_job_id: None,
                task_type: "generate_image_prompt".to_string(),
                status: Some("queued".to_string()),
                priority: Some(0),
                payload_json: Some(task_payload_json),
                max_retries: Some(0),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )?;

        let result = self.run_generate_image_prompt_workflow_after_task(
            &db_path,
            &task,
            input,
            ensure_endpoint,
        );

        match result {
            Ok(result) => Ok(result),
            Err(error) => {
                if let Some(current_task) = creative_task_repo::get_task(&db_path, task.id)
                    .ok()
                    .flatten()
                {
                    if !matches!(current_task.status.as_str(), "queued" | "running") {
                        let _ = self.emit_task_event(
                            "creative-task-status-changed",
                            CreativeTaskEventPayload {
                                task_id: current_task.id,
                                project_id: current_task.project_id.clone(),
                                status: current_task.status.clone(),
                                message: Some(error.to_string()),
                                created_at: current_task.updated_at.clone(),
                            },
                        );
                        return Err(error);
                    }
                }
                let _ = creative_task_repo::append_task_event(
                    &db_path,
                    CreateTaskEventInput {
                        task_id: task.id,
                        event_type: "workflow_failed".to_string(),
                        message: Some(error.to_string()),
                        payload_json: None,
                    },
                );
                let _ = creative_task_repo::update_task_status(
                    &db_path,
                    UpdateCreativeTaskStatusInput {
                        id: task.id,
                        status: "failed".to_string(),
                        result_json: None,
                        error_message: Some(error.to_string()),
                        asset_id: None,
                        retry_count_increment: None,
                    },
                );
                let _ = self.emit_task_event(
                    "creative-task-status-changed",
                    CreativeTaskEventPayload {
                        task_id: task.id,
                        project_id: task.project_id.clone(),
                        status: "failed".to_string(),
                        message: Some(error.to_string()),
                        created_at: task.updated_at.clone(),
                    },
                );
                Err(error)
            }
        }
    }

    fn db_path(&self) -> AppResult<std::path::PathBuf> {
        self.path_provider.get_db_file_path()
    }

    fn emit_task_event(
        &self,
        event_name: &str,
        payload: CreativeTaskEventPayload,
    ) -> AppResult<()> {
        self.app_handle
            .emit(event_name, payload)
            .map_err(|error| AppError::Process(format!("failed to emit {event_name}: {error}")))
    }

    fn run_generate_image_prompt_workflow_after_task(
        &self,
        db_path: &std::path::Path,
        task: &CreativeTask,
        input: GenerateImagePromptWorkflowInput,
        ensure_endpoint: impl FnOnce() -> AppResult<SidecarRuntimeEndpoint>,
    ) -> AppResult<GenerateImagePromptWorkflowResult> {
        let mut events = Vec::new();

        events.push(self.append_task_event(CreateTaskEventInput {
            task_id: task.id,
            event_type: "queued".to_string(),
            message: Some("workflow queued".to_string()),
            payload_json: None,
        })?);

        self.update_creative_task_status(UpdateCreativeTaskStatusInput {
            id: task.id,
            status: "running".to_string(),
            result_json: None,
            error_message: None,
            asset_id: None,
            retry_count_increment: None,
        })?;
        events.push(self.append_task_event(CreateTaskEventInput {
            task_id: task.id,
            event_type: "workflow_started".to_string(),
            message: Some("generate_image_prompt workflow started".to_string()),
            payload_json: None,
        })?);

        let sidecar_endpoint = ensure_endpoint()?;
        events.push(self.append_task_event(CreateTaskEventInput {
            task_id: task.id,
            event_type: "sidecar_ready".to_string(),
            message: Some(format!("sidecar ready on port {}", sidecar_endpoint.port)),
            payload_json: None,
        })?);

        let checkpoint_server = start_cancel_checkpoint_server(db_path.to_path_buf(), task.id)?;
        let sidecar_response =
            SidecarLifecycleService::<R>::submit_generate_image_prompt_to_endpoint(
                &sidecar_endpoint,
                GenerateImagePromptSidecarRequest {
                    task_id: task.id,
                    project_id: input.project_id.clone(),
                    brief: input.brief.clone(),
                    style: input.style.clone(),
                    mood: input.mood.clone(),
                    aspect_ratio: input.aspect_ratio.clone(),
                    attempt: task.retry_count + 1,
                    max_retries: task.max_retries,
                    cancel_checkpoint_url: Some(checkpoint_server.url.clone()),
                    cancel_checkpoint_token: Some(checkpoint_server.token.clone()),
                },
            )?;
        validate_sidecar_task_result(task, &sidecar_response)?;
        events.push(self.append_task_event(CreateTaskEventInput {
            task_id: task.id,
            event_type: "sidecar_completed".to_string(),
            message: sidecar_response.message.clone(),
            payload_json: None,
        })?);
        events.extend(append_sidecar_result_events(
            db_path,
            task.id,
            &sidecar_response,
        )?);
        if sidecar_response.status != "succeeded" {
            self.settle_sidecar_non_success(db_path, task, &sidecar_response)?;
            return Err(AppError::Process(format!(
                "sidecar workflow returned status {}",
                sidecar_response.status
            )));
        }

        let output =
            sidecar_response.outputs.first().cloned().ok_or_else(|| {
                AppError::Process("sidecar workflow returned no outputs".to_string())
            })?;
        let asset = create_ready_sidecar_asset(
            db_path,
            input.project_id.clone(),
            &output,
            None,
            "sidecar output metadata",
        )?;
        events.push(self.append_task_event(CreateTaskEventInput {
            task_id: task.id,
            event_type: "asset_created".to_string(),
            message: Some(format!("prompt asset created: {}", asset.id)),
            payload_json: Some(json!({ "assetId": asset.id }).to_string()),
        })?);

        let model_run_ids = persist_sidecar_model_runs(
            db_path,
            task,
            Some(asset.id),
            &sidecar_response.model_runs,
            None,
            "sidecar model run metadata",
        )?;

        let result_json = json!({
            "assetId": asset.id,
            "assetType": asset.asset_type,
            "title": asset.title,
            "status": sidecar_response.status,
            "modelRunIds": model_run_ids,
        })
        .to_string();
        let task = self.update_creative_task_status(UpdateCreativeTaskStatusInput {
            id: task.id,
            status: "succeeded".to_string(),
            result_json: Some(result_json),
            error_message: None,
            asset_id: Some(asset.id),
            retry_count_increment: None,
        })?;
        events.push(self.append_task_event(CreateTaskEventInput {
            task_id: task.id,
            event_type: "workflow_succeeded".to_string(),
            message: Some("generate_image_prompt workflow completed".to_string()),
            payload_json: Some(json!({ "assetId": asset.id }).to_string()),
        })?);

        Ok(GenerateImagePromptWorkflowResult {
            task,
            asset,
            events,
        })
    }

    fn settle_sidecar_non_success(
        &self,
        db_path: &std::path::Path,
        task: &CreativeTask,
        sidecar_response: &SidecarWorkflowTaskResult,
    ) -> AppResult<()> {
        let next_status = resolve_sidecar_failure_status(task, sidecar_response);
        let model_run_ids = if next_status == "cancelled" {
            persist_cancelled_sidecar_model_runs(
                db_path,
                task,
                None,
                &sidecar_response.model_runs,
                None,
                "sidecar model run metadata",
            )?
        } else {
            persist_sidecar_model_runs(
                db_path,
                task,
                None,
                &sidecar_response.model_runs,
                None,
                "sidecar model run metadata",
            )?
        };
        let retry_increment = if next_status == "retrying" {
            Some(1)
        } else {
            None
        };
        let result_json = json!({
            "status": sidecar_response.status.clone(),
            "message": sidecar_response.message.clone(),
            "modelRunIds": model_run_ids.clone(),
            "retry": sidecar_response.retry.clone(),
        })
        .to_string();
        let updated_task = self.update_creative_task_status(UpdateCreativeTaskStatusInput {
            id: task.id,
            status: next_status.clone(),
            result_json: Some(result_json),
            error_message: sidecar_response.message.clone(),
            asset_id: task.asset_id,
            retry_count_increment: retry_increment,
        })?;
        let event_type = match next_status.as_str() {
            "cancelled" => "workflow_cancelled",
            "retrying" => "workflow_retrying",
            "blocked" => "workflow_blocked",
            _ => "workflow_failed",
        };
        self.append_task_event(CreateTaskEventInput {
            task_id: task.id,
            event_type: event_type.to_string(),
            message: sidecar_response.message.clone(),
            payload_json: Some(
                json!({
                    "sidecarStatus": sidecar_response.status.clone(),
                    "taskStatus": next_status,
                    "modelRunIds": model_run_ids,
                })
                .to_string(),
            ),
        })?;
        self.emit_task_event(
            "creative-task-status-changed",
            CreativeTaskEventPayload {
                task_id: updated_task.id,
                project_id: updated_task.project_id,
                status: updated_task.status,
                message: sidecar_response.message.clone(),
                created_at: updated_task.updated_at,
            },
        )
    }

    pub fn run_review_asset_quality_stub(
        &self,
        input: ReviewAssetQualityStubInput,
    ) -> AppResult<ReviewAssetQualityStubResult> {
        validate_review_asset_quality_input(&input)?;
        let db_path = self.db_path()?;
        let source_asset = creative_asset_repo::get_asset(&db_path, input.source_asset_id)?
            .ok_or_else(|| AppError::Database("source asset not found".to_string()))?;
        let source_task = match input.source_task_id {
            Some(task_id) => creative_task_repo::get_task(&db_path, task_id)?,
            None => None,
        };
        let review_kind = input
            .review_kind
            .clone()
            .unwrap_or_else(|| "review_asset_quality".to_string());
        let review_task = self.create_creative_task(CreateCreativeTaskInput {
            project_id: input.project_id.clone().or(source_asset.project_id.clone()),
            goal_id: None,
            batch_job_id: None,
            task_type: review_kind.clone(),
            status: Some("queued".to_string()),
            priority: Some(0),
            payload_json: Some(serde_json::to_string(&input).map_err(|error| {
                AppError::Config(format!("failed to encode review input: {error}"))
            })?),
            max_retries: Some(0),
            parent_task_id: input.source_task_id,
            asset_id: Some(source_asset.id),
            sequence_no: None,
        })?;

        let mut events = Vec::new();
        events.push(self.append_task_event(CreateTaskEventInput {
            task_id: review_task.id,
            event_type: "queued".to_string(),
            message: Some("review task queued".to_string()),
            payload_json: None,
        })?);

        let review_result = build_review_result(&source_asset, source_task.as_ref(), &input);
        let review_result_json = serde_json::to_string(&review_result).map_err(|error| {
            AppError::Config(format!("failed to encode review result: {error}"))
        })?;
        let review_asset = creative_asset_repo::create_asset(
            &db_path,
            CreateCreativeAssetInput {
                project_id: input.project_id.clone().or(source_asset.project_id.clone()),
                asset_type: "review_result".to_string(),
                title: Some(format!("Review result for asset {}", source_asset.id)),
                content: Some(review_result_json.clone()),
                file_path: None,
                thumbnail_path: None,
                metadata_json: Some(
                    serde_json::json!({
                        "sourceAssetId": source_asset.id,
                        "sourceTaskId": input.source_task_id,
                        "reviewKind": review_kind,
                        "reviewResult": review_result,
                    })
                    .to_string(),
                ),
                status: Some("ready".to_string()),
            },
        )?;
        let _ = creative_asset_repo::create_asset_link(
            &db_path,
            crate::infra::creative_types::CreateAssetLinkInput {
                source_asset_id: review_asset.id,
                target_asset_id: source_asset.id,
                link_type: "review_of".to_string(),
            },
        )?;
        events.push(self.append_task_event(CreateTaskEventInput {
            task_id: review_task.id,
            event_type: "review_result_saved".to_string(),
            message: Some(format!("review asset created: {}", review_asset.id)),
            payload_json: Some(serde_json::json!({ "reviewAssetId": review_asset.id }).to_string()),
        })?);

        let mut revise_task = None;
        let mut task_status = "succeeded".to_string();
        let mut review_event_type = "review_passed".to_string();
        let mut review_event_message = "review passed".to_string();
        if !review_result.pass {
            let created_revise_task = self.create_creative_task(CreateCreativeTaskInput {
                project_id: input.project_id.clone().or(source_asset.project_id.clone()),
                goal_id: None,
                batch_job_id: None,
                task_type: "revise_asset_quality".to_string(),
                status: Some("draft".to_string()),
                priority: Some(0),
                payload_json: Some(
                    serde_json::json!({
                        "sourceAssetId": source_asset.id,
                        "reviewAssetId": review_asset.id,
                        "revisionInstruction": review_result.revision_instruction,
                    })
                    .to_string(),
                ),
                max_retries: Some(0),
                parent_task_id: Some(review_task.id),
                asset_id: Some(source_asset.id),
                sequence_no: None,
            })?;
            revise_task = Some(created_revise_task);
            task_status = "manual_approval".to_string();
            review_event_type = "manual_approval_required".to_string();
            review_event_message = "manual approval required".to_string();
        }

        let updated_task = self.update_creative_task_status(UpdateCreativeTaskStatusInput {
            id: review_task.id,
            status: task_status.clone(),
            result_json: Some(review_result_json),
            error_message: None,
            asset_id: Some(review_asset.id),
            retry_count_increment: None,
        })?;
        events.push(
            self.append_task_event(CreateTaskEventInput {
                task_id: review_task.id,
                event_type: review_event_type,
                message: Some(review_event_message),
                payload_json: Some(
                    serde_json::json!({
                        "reviewAssetId": review_asset.id,
                        "manualApprovalStatus": review_result.manual_approval_status,
                    })
                    .to_string(),
                ),
            })?,
        );

        Ok(ReviewAssetQualityStubResult {
            task: updated_task,
            review_asset,
            revise_task,
            events,
        })
    }
}

fn resolve_sidecar_failure_status(
    task: &CreativeTask,
    sidecar_response: &SidecarWorkflowTaskResult,
) -> String {
    match sidecar_response.status.as_str() {
        "cancelled" => "cancelled".to_string(),
        "blocked" => "blocked".to_string(),
        "retrying" if task.retry_count < task.max_retries => "retrying".to_string(),
        "failed"
            if sidecar_response
                .retry
                .as_ref()
                .map(|retry| retry.should_retry)
                .unwrap_or(false)
                && task.retry_count < task.max_retries =>
        {
            "retrying".to_string()
        }
        _ => "failed".to_string(),
    }
}

fn validate_create_task_input(input: &CreateCreativeTaskInput) -> AppResult<()> {
    if input.task_type.trim().is_empty() {
        return Err(AppError::Config("task_type is required".to_string()));
    }
    if let Some(status) = &input.status {
        if status.trim().is_empty() {
            return Err(AppError::Config("status cannot be empty".to_string()));
        }
    }
    Ok(())
}

fn validate_status_input(input: &UpdateCreativeTaskStatusInput) -> AppResult<()> {
    if input.id <= 0 {
        return Err(AppError::Config("task id must be positive".to_string()));
    }
    if input.status.trim().is_empty() {
        return Err(AppError::Config("status is required".to_string()));
    }
    Ok(())
}

fn validate_task_event_input(input: &CreateTaskEventInput) -> AppResult<()> {
    if input.task_id <= 0 {
        return Err(AppError::Config("task id must be positive".to_string()));
    }
    if input.event_type.trim().is_empty() {
        return Err(AppError::Config("event_type is required".to_string()));
    }
    Ok(())
}

fn validate_generate_image_prompt_input(input: &GenerateImagePromptWorkflowInput) -> AppResult<()> {
    if input.brief.trim().is_empty() {
        return Err(AppError::Config("brief is required".to_string()));
    }
    Ok(())
}

fn validate_creative_asset_input(input: &CreateCreativeAssetServiceInput) -> AppResult<()> {
    if input.asset_type.trim().is_empty() {
        return Err(AppError::Config("asset_type is required".to_string()));
    }
    if !is_supported_asset_type(&input.asset_type) {
        return Err(AppError::Config(format!(
            "unsupported creative asset type: {}",
            input.asset_type
        )));
    }
    Ok(())
}

fn validate_asset_link_input(input: &CreateAssetLinkInput) -> AppResult<()> {
    if input.source_asset_id <= 0 || input.target_asset_id <= 0 {
        return Err(AppError::Config("asset ids must be positive".to_string()));
    }
    if input.link_type.trim().is_empty() {
        return Err(AppError::Config("link_type is required".to_string()));
    }
    if !is_supported_asset_link_type(&input.link_type) {
        return Err(AppError::Config(format!(
            "unsupported asset link type: {}",
            input.link_type
        )));
    }
    Ok(())
}

fn is_supported_asset_type(asset_type: &str) -> bool {
    matches!(
        asset_type,
        "image_prompt"
            | "review_result"
            | "character"
            | "scene"
            | "prop"
            | "storyboard"
            | "novel_chapter"
            | "script_scene"
            | "bible"
            | "style_bible"
            | "world_bible"
            | "demo_image"
            | "demo_image_prompt"
    )
}

fn is_supported_asset_link_type(link_type: &str) -> bool {
    matches!(
        link_type,
        "derived_from"
            | "revision_of"
            | "review_of"
            | "summary_of"
            | "uses_character"
            | "uses_scene"
            | "uses_prop"
            | "part_of"
            | "depends_on"
            | "visualizes"
            | "describes"
    )
}

fn validate_review_asset_quality_input(input: &ReviewAssetQualityStubInput) -> AppResult<()> {
    if input.source_asset_id <= 0 {
        return Err(AppError::Config(
            "source_asset_id must be positive".to_string(),
        ));
    }
    Ok(())
}

fn build_review_result(
    source_asset: &CreativeAsset,
    source_task: Option<&CreativeTask>,
    input: &ReviewAssetQualityStubInput,
) -> ReviewResultPayload {
    let content_hint = input
        .content_hint
        .clone()
        .or_else(|| source_asset.content.clone())
        .unwrap_or_default();
    let trimmed = content_hint.trim();
    let pass = trimmed.len() >= 24;
    let quality_score = if pass { 82 } else { 48 };
    let problems = if pass {
        Vec::new()
    } else {
        vec!["content is too short for a stable revision stub".to_string()]
    };
    ReviewResultPayload {
        pass,
        quality_score,
        problems: problems.clone(),
        revision_instruction: if pass {
            "No revision required; keep the current asset as-is.".to_string()
        } else {
            "Revise the asset with clearer subject focus and richer descriptive detail.".to_string()
        },
        manual_approval_status: if pass {
            "not_required".to_string()
        } else {
            "pending_manual_approval".to_string()
        },
        review_kind: input
            .review_kind
            .clone()
            .unwrap_or_else(|| "review_asset_quality".to_string()),
        source_asset_id: source_asset.id,
        source_task_id: source_task.map(|task| task.id),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infra::creative_asset_repo;
    use crate::infra::creative_db_schema::init_schema;
    use crate::infra::creative_model_run_repo;
    use crate::infra::creative_task_repo;
    use crate::infra::creative_types::{ListCreativeTasksFilter, ListModelRunsFilter};
    use crate::infra::path::PathProvider;
    use crate::services::sidecar_lifecycle_service::{
        SidecarWorkflowEvent, SidecarWorkflowModelRun, SidecarWorkflowOutput, SidecarWorkflowRetry,
        SidecarWorkflowTaskResult,
    };
    use std::io::{Read, Write};
    use std::net::{TcpListener, TcpStream};
    use std::path::PathBuf;
    use std::thread::JoinHandle;
    use std::time::Duration;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_root(name: &str) -> PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "monster-workbench-task-service-{name}-{}-{stamp}",
            std::process::id()
        ))
    }

    fn task_with_retry_budget(retry_count: i64, max_retries: i64) -> CreativeTask {
        CreativeTask {
            id: 1,
            project_id: Some("project-test".to_string()),
            goal_id: None,
            batch_job_id: None,
            task_type: "generate_image_prompt".to_string(),
            status: "running".to_string(),
            priority: 0,
            payload_json: None,
            result_json: None,
            error_message: None,
            retry_count,
            max_retries,
            parent_task_id: None,
            asset_id: None,
            sequence_no: None,
            created_at: "0".to_string(),
            updated_at: "0".to_string(),
            started_at: None,
            finished_at: None,
        }
    }

    fn sidecar_result(status: &str, should_retry: bool) -> SidecarWorkflowTaskResult {
        SidecarWorkflowTaskResult {
            protocol_version: 1,
            task_id: 1,
            status: status.to_string(),
            message: Some(format!("sidecar {status}")),
            outputs: Vec::new(),
            model_runs: Vec::new(),
            events: Vec::new(),
            retry: Some(SidecarWorkflowRetry {
                should_retry,
                reason: None,
            }),
        }
    }

    fn start_generate_prompt_sidecar_server(
        status: &'static str,
    ) -> (SidecarRuntimeEndpoint, JoinHandle<()>) {
        let listener = TcpListener::bind("127.0.0.1:0").expect("sidecar listener should bind");
        let port = listener
            .local_addr()
            .expect("sidecar listener addr should exist")
            .port();
        let token = "task-service-test-token".to_string();
        let expected_token = token.clone();
        let handle = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("sidecar request should arrive");
            let request = read_http_request(&mut stream);
            assert!(request.starts_with("POST /tasks "));
            assert!(request.contains(&format!("X-Monster-Token: {expected_token}")));
            let payload = parse_http_json_body(&request);
            let task_id = payload
                .get("taskId")
                .and_then(serde_json::Value::as_i64)
                .expect("request should include taskId");
            let brief = payload
                .get("input")
                .and_then(|input| input.get("brief"))
                .and_then(serde_json::Value::as_str)
                .unwrap_or_default()
                .to_string();

            let response = if status == "succeeded" {
                SidecarWorkflowTaskResult {
                    protocol_version: 1,
                    task_id,
                    status: "succeeded".to_string(),
                    message: Some("sidecar succeeded".to_string()),
                    outputs: vec![SidecarWorkflowOutput {
                        asset_type: "image_prompt".to_string(),
                        title: Some("Generated image prompt".to_string()),
                        content: Some(format!("Prompt for {brief}")),
                        file_path: None,
                        thumbnail_path: None,
                        metadata: Some(json!({ "source": "test-sidecar" })),
                    }],
                    model_runs: vec![SidecarWorkflowModelRun {
                        provider_id: Some("test-sidecar".to_string()),
                        provider_type: Some("python-sidecar".to_string()),
                        model: Some("test-model".to_string()),
                        request_type: "image_prompt".to_string(),
                        status: "succeeded".to_string(),
                        duration_ms: Some(25),
                        prompt_hash: None,
                        prompt_version_id: None,
                        input_token_count: Some(10),
                        output_token_count: Some(20),
                        cost_estimate: Some(0.0),
                        error_code: None,
                        error_message: None,
                        metadata: Some(json!({ "source": "test-sidecar" })),
                    }],
                    events: vec![SidecarWorkflowEvent {
                        event_type: "sidecar_test_event".to_string(),
                        message: Some("sidecar emitted test event".to_string()),
                        payload: None,
                    }],
                    retry: Some(SidecarWorkflowRetry {
                        should_retry: false,
                        reason: None,
                    }),
                }
            } else {
                SidecarWorkflowTaskResult {
                    protocol_version: 1,
                    task_id,
                    status: "failed".to_string(),
                    message: Some("forced sidecar failed".to_string()),
                    outputs: Vec::new(),
                    model_runs: vec![SidecarWorkflowModelRun {
                        provider_id: Some("test-sidecar".to_string()),
                        provider_type: Some("python-sidecar".to_string()),
                        model: Some("test-model".to_string()),
                        request_type: "image_prompt".to_string(),
                        status: "failed".to_string(),
                        duration_ms: Some(10),
                        prompt_hash: None,
                        prompt_version_id: None,
                        input_token_count: Some(10),
                        output_token_count: Some(0),
                        cost_estimate: Some(0.0),
                        error_code: Some("forced_failure".to_string()),
                        error_message: Some("forced sidecar failed".to_string()),
                        metadata: Some(json!({ "source": "test-sidecar" })),
                    }],
                    events: vec![SidecarWorkflowEvent {
                        event_type: "sidecar_test_failure".to_string(),
                        message: Some("sidecar emitted failure event".to_string()),
                        payload: None,
                    }],
                    retry: Some(SidecarWorkflowRetry {
                        should_retry: false,
                        reason: Some("forced".to_string()),
                    }),
                }
            };

            let body = serde_json::to_string(&response).expect("response should encode");
            write_json_response(&mut stream, 200, &body);
        });
        (SidecarRuntimeEndpoint { port, token }, handle)
    }

    fn read_http_request(stream: &mut TcpStream) -> String {
        stream
            .set_read_timeout(Some(Duration::from_secs(2)))
            .expect("read timeout should set");
        let mut buffer = [0_u8; 8192];
        let mut data = Vec::new();
        let mut header_end = None;
        let mut content_length = 0usize;
        let deadline = std::time::Instant::now() + Duration::from_secs(5);
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
                            if data.len() >= end + content_length {
                                break;
                            }
                        }
                    } else if let Some(end) = header_end {
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
                    if std::time::Instant::now() >= deadline {
                        break;
                    }
                }
                Err(error) => panic!("request read failed: {error}"),
            }
        }
        String::from_utf8_lossy(&data).into_owned()
    }

    fn parse_http_json_body(request: &str) -> serde_json::Value {
        let body = request
            .split_once("\r\n\r\n")
            .map(|(_, body)| body)
            .unwrap_or_default();
        serde_json::from_str(body).expect("request body should be JSON")
    }

    fn write_json_response(stream: &mut TcpStream, status: u16, body: &str) {
        let response = format!(
            "HTTP/1.1 {status} OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
        stream
            .write_all(response.as_bytes())
            .expect("response should write");
        stream.flush().expect("response should flush");
    }

    fn read_checkpoint_cancel_requested(url: &str, token: &str) -> bool {
        let endpoint = url.trim_start_matches("http://");
        let (host, path) = endpoint
            .split_once('/')
            .expect("checkpoint url should include a path");
        let mut stream = TcpStream::connect(host).expect("checkpoint should accept connections");
        let request = format!(
            "GET /{path} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\nX-Monster-Token: {token}\r\n\r\n"
        );
        stream
            .write_all(request.as_bytes())
            .expect("checkpoint request should write");
        let mut response = String::new();
        stream
            .read_to_string(&mut response)
            .expect("checkpoint response should read");
        response.contains("\"cancelRequested\":true")
    }

    #[test]
    fn generate_image_prompt_workflow_persists_task_asset_and_events() {
        let app = tauri::test::mock_app();
        let root = temp_root("generate_prompt");
        let db_path = root.join("monster_workbench.db");
        let path_provider = PathProvider::new_for_test(root.clone(), db_path.clone());
        let task_service = TaskService::new(app.handle().clone(), path_provider.clone());
        let (endpoint, sidecar_handle) = start_generate_prompt_sidecar_server("succeeded");

        init_schema(&db_path).expect("schema should init");

        let result = task_service
            .run_generate_image_prompt_workflow_with_endpoint_provider(
                GenerateImagePromptWorkflowInput {
                    project_id: Some("project-test".to_string()),
                    brief: "A clean cinematic product poster".to_string(),
                    style: Some("editorial illustration".to_string()),
                    mood: Some("focused".to_string()),
                    aspect_ratio: Some("16:9".to_string()),
                },
                || Ok(endpoint),
            )
            .expect("workflow should complete");
        sidecar_handle
            .join()
            .expect("sidecar test server should finish");

        assert_eq!(result.task.task_type, "generate_image_prompt");
        assert_eq!(result.task.status, "succeeded");
        assert_eq!(result.asset.asset_type, "image_prompt");
        assert!(
            result
                .asset
                .content
                .as_deref()
                .unwrap_or_default()
                .contains("product poster"),
            "prompt asset should contain the brief"
        );
        assert!(
            result
                .events
                .iter()
                .any(|event| event.event_type == "workflow_started"),
            "workflow should emit a start event"
        );
        assert!(
            result
                .events
                .iter()
                .any(|event| event.event_type == "asset_created"),
            "workflow should emit an asset creation event"
        );
        assert!(
            result
                .events
                .iter()
                .any(|event| event.event_type == "workflow_succeeded"),
            "workflow should emit a completion event"
        );

        let persisted_task = creative_task_repo::get_task(&db_path, result.task.id)
            .expect("task query should succeed")
            .expect("task should exist");
        assert_eq!(persisted_task.status, "succeeded");
        assert_eq!(persisted_task.asset_id, Some(result.asset.id));

        let persisted_events = creative_task_repo::list_task_events(&db_path, result.task.id)
            .expect("event query should succeed");
        assert!(
            persisted_events
                .iter()
                .any(|event| event.event_type == "workflow_succeeded"),
            "persisted events should include completion"
        );

        let persisted_asset = creative_asset_repo::get_asset(&db_path, result.asset.id)
            .expect("asset query should succeed")
            .expect("asset should exist");
        assert_eq!(persisted_asset.asset_type, "image_prompt");

        let model_runs = creative_model_run_repo::list_model_runs(
            &db_path,
            ListModelRunsFilter {
                task_id: Some(result.task.id),
                ..Default::default()
            },
        )
        .expect("model runs should list");
        assert_eq!(model_runs.len(), 1);
        assert_eq!(model_runs[0].asset_id, Some(result.asset.id));
        assert_eq!(
            model_runs[0].provider_type.as_deref(),
            Some("python-sidecar")
        );

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn sidecar_failure_status_respects_retry_budget() {
        assert_eq!(
            resolve_sidecar_failure_status(
                &task_with_retry_budget(0, 2),
                &sidecar_result("failed", true)
            ),
            "retrying"
        );
        assert_eq!(
            resolve_sidecar_failure_status(
                &task_with_retry_budget(2, 2),
                &sidecar_result("failed", true)
            ),
            "failed"
        );
        assert_eq!(
            resolve_sidecar_failure_status(
                &task_with_retry_budget(0, 2),
                &sidecar_result("cancelled", false)
            ),
            "cancelled"
        );
        assert_eq!(
            resolve_sidecar_failure_status(
                &task_with_retry_budget(0, 2),
                &sidecar_result("blocked", false)
            ),
            "blocked"
        );
    }

    #[test]
    fn cancel_checkpoint_server_reads_task_cancel_status() {
        let root = temp_root("cancel_checkpoint");
        let db_path = root.join("monster_workbench.db");
        init_schema(&db_path).expect("schema should init");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-cancel".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "generate_image_prompt".to_string(),
                status: Some("running".to_string()),
                priority: Some(0),
                payload_json: None,
                max_retries: Some(0),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )
        .expect("task should create");
        let checkpoint =
            start_cancel_checkpoint_server(db_path.clone(), task.id).expect("checkpoint starts");

        assert!(!read_checkpoint_cancel_requested(
            &checkpoint.url,
            &checkpoint.token
        ));

        creative_task_repo::update_task_status(
            &db_path,
            UpdateCreativeTaskStatusInput {
                id: task.id,
                status: "cancelling".to_string(),
                result_json: None,
                error_message: Some("test cancel".to_string()),
                asset_id: None,
                retry_count_increment: None,
            },
        )
        .expect("task should update");

        assert!(read_checkpoint_cancel_requested(
            &checkpoint.url,
            &checkpoint.token
        ));

        drop(checkpoint);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn generate_image_prompt_workflow_maps_sidecar_failure_result() {
        let app = tauri::test::mock_app();
        let root = temp_root("generate_prompt_failure");
        let db_path = root.join("monster_workbench.db");
        let path_provider = PathProvider::new_for_test(root.clone(), db_path.clone());
        let task_service = TaskService::new(app.handle().clone(), path_provider.clone());
        let (endpoint, sidecar_handle) = start_generate_prompt_sidecar_server("failed");

        init_schema(&db_path).expect("schema should init");

        let result = task_service.run_generate_image_prompt_workflow_with_endpoint_provider(
            GenerateImagePromptWorkflowInput {
                project_id: Some("project-failure".to_string()),
                brief: "__sidecar_status:failed".to_string(),
                style: Some("test".to_string()),
                mood: Some("test".to_string()),
                aspect_ratio: Some("1:1".to_string()),
            },
            || Ok(endpoint),
        );
        sidecar_handle
            .join()
            .expect("sidecar test server should finish");
        assert!(
            result.is_err(),
            "forced sidecar failure should return an error"
        );

        let tasks = creative_task_repo::list_tasks(
            &db_path,
            ListCreativeTasksFilter {
                project_id: Some("project-failure".to_string()),
                task_type: Some("generate_image_prompt".to_string()),
                limit: Some(10),
                offset: Some(0),
                ..Default::default()
            },
        )
        .expect("tasks should list");
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].status, "failed");
        assert_eq!(tasks[0].asset_id, None);
        assert!(tasks[0]
            .error_message
            .as_deref()
            .unwrap_or_default()
            .contains("forced sidecar failed"));

        let events = creative_task_repo::list_task_events(&db_path, tasks[0].id)
            .expect("events should list");
        assert!(
            events
                .iter()
                .any(|event| event.event_type == "workflow_failed"),
            "failure mapping should persist workflow_failed event"
        );

        let model_runs = creative_model_run_repo::list_model_runs(
            &db_path,
            ListModelRunsFilter {
                task_id: Some(tasks[0].id),
                ..Default::default()
            },
        )
        .expect("model runs should list");
        assert_eq!(model_runs.len(), 1);
        assert_eq!(model_runs[0].status, "failed");
        assert_eq!(model_runs[0].asset_id, None);
        assert_eq!(
            model_runs[0].provider_type.as_deref(),
            Some("python-sidecar")
        );

        let _ = std::fs::remove_dir_all(root);
    }
}
