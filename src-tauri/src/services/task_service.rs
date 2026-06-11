use crate::infra::creative_db::{
    CreateAssetLinkInput, CreateCreativeAssetInput, CreateCreativeTaskInput, CreateTaskEventInput,
    CreativeAsset, CreativeTask, ListAssetLinksFilter, ListCreativeAssetsFilter,
    ListCreativeTasksFilter, TaskEvent, UpdateCreativeTaskStatusInput,
};
use crate::infra::creative_asset_repo;
use crate::infra::path::PathProvider;
use crate::infra::creative_task_repo;
use crate::infra::{AppError, AppResult};
use crate::services::sidecar_lifecycle_service::{
    GenerateImagePromptSidecarRequest, SidecarLifecycleService,
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

    /// 开启一个模拟的后台长任务，用以测试进度通知机制
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
                    "任务执行完毕".to_string()
                } else {
                    format!("正在处理第 {}/{} 部分...", i, total_steps)
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
    ) -> AppResult<crate::infra::creative_db::AssetLink> {
        validate_asset_link_input(&input)?;
        creative_asset_repo::create_asset_link(&self.db_path()?, input)
    }

    pub fn list_asset_links(
        &self,
        filter: ListAssetLinksFilter,
    ) -> AppResult<Vec<crate::infra::creative_db::AssetLink>> {
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

    pub fn run_generate_image_prompt_workflow(
        &self,
        input: GenerateImagePromptWorkflowInput,
        sidecar_service: &mut SidecarLifecycleService<R>,
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
            sidecar_service,
        );

        match result {
            Ok(result) => Ok(result),
            Err(error) => {
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
        sidecar_service: &mut SidecarLifecycleService<R>,
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

        let sidecar_status = sidecar_service.ensure_dev_server()?;
        events.push(self.append_task_event(CreateTaskEventInput {
            task_id: task.id,
            event_type: "sidecar_ready".to_string(),
            message: Some(format!(
                "sidecar ready on port {}",
                sidecar_status.port.unwrap_or_default()
            )),
            payload_json: None,
        })?);

        let sidecar_response =
            sidecar_service.submit_generate_image_prompt(GenerateImagePromptSidecarRequest {
                project_id: input.project_id.clone(),
                brief: input.brief.clone(),
                style: input.style.clone(),
                mood: input.mood.clone(),
                aspect_ratio: input.aspect_ratio.clone(),
            })?;
        events.push(self.append_task_event(CreateTaskEventInput {
            task_id: task.id,
            event_type: "sidecar_completed".to_string(),
            message: sidecar_response.message.clone(),
            payload_json: None,
        })?);

        let asset = creative_asset_repo::create_asset(
            db_path,
            CreateCreativeAssetInput {
                project_id: input.project_id.clone(),
                asset_type: sidecar_response.asset.asset_type,
                title: Some(sidecar_response.asset.title),
                content: Some(sidecar_response.asset.content),
                file_path: None,
                thumbnail_path: None,
                metadata_json: sidecar_response.asset.metadata_json,
                status: Some("ready".to_string()),
            },
        )?;
        events.push(self.append_task_event(CreateTaskEventInput {
            task_id: task.id,
            event_type: "asset_created".to_string(),
            message: Some(format!("prompt asset created: {}", asset.id)),
            payload_json: Some(json!({ "assetId": asset.id }).to_string()),
        })?);

        let result_json = json!({
            "assetId": asset.id,
            "assetType": asset.asset_type,
            "title": asset.title,
            "status": sidecar_response.status,
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
            crate::infra::creative_db::CreateAssetLinkInput {
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
    use crate::infra::path::PathProvider;
    use crate::infra::creative_task_repo;
    use crate::services::sidecar_lifecycle_service::SidecarLifecycleService;
    use std::path::PathBuf;
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

    #[test]
    fn generate_image_prompt_workflow_persists_task_asset_and_events() {
        let app = tauri::test::mock_app();
        let root = temp_root("generate_prompt");
        let db_path = root.join("monster_workbench.db");
        let path_provider = PathProvider::new_for_test(root.clone(), db_path.clone());
        let task_service = TaskService::new(app.handle().clone(), path_provider.clone());
        let mut sidecar_service = SidecarLifecycleService::new(app.handle().clone());

        init_schema(&db_path).expect("schema should init");

        let result = task_service
            .run_generate_image_prompt_workflow(
                GenerateImagePromptWorkflowInput {
                    project_id: Some("project-test".to_string()),
                    brief: "A clean cinematic product poster".to_string(),
                    style: Some("editorial illustration".to_string()),
                    mood: Some("focused".to_string()),
                    aspect_ratio: Some("16:9".to_string()),
                },
                &mut sidecar_service,
            )
            .expect("workflow should complete");

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

        let _ = std::fs::remove_dir_all(root);
    }
}
