//! 图片工作台 worker 串行循环。
//!
//! 历史上这条循环（claim → spawn heartbeat → generate → stop heartbeat →
//! 写终态）住在 image_workbench_service 主文件内，已偏大；阶段 B2a 抽出
//! 独立模块为 B2b dispatcher 接入腾出体量预算。**零行为变化**：仍然
//! 是"每个 job 一条 spawn_blocking 串行循环"，只是位置变了。
//!
//! 调用方仍是 `ImageWorkbenchService::start_job_runner`；本模块复用
//! service 的几个 pub(super) 方法（`record_asset` / `update_task_status` /
//! `fail_generation_task` / `repo`）。设计文档：
//! `agent/worker-heartbeat-design.md`。

use crate::infra::image_workbench_types::ImageWorkbenchSnapshot;
use crate::infra::AppResult;
use crate::services::ai_provider_types::{AiBusinessGenerationRequest, AiGenerationResult};
use crate::services::image_workbench_service::{
    is_cancel_error, parse_artifact_dimensions, pick_image_artifact, validate_workbench_mode,
    ImageWorkbenchService, RecordImageWorkbenchAssetRequest, RecordImageWorkbenchMetadataInput,
    UpdateImageWorkbenchTaskStatusRequest, IMAGE_WORKBENCH_TASK_LEASE_MS,
};
use crate::services::image_workbench_service::{
    generation_options_for_job, generation_result_model_run,
};
use crate::services::runtime_heartbeat::spawn_image_task_heartbeat;

/// Worker 循环主体；接受由 service 注入的实际 `generate` 闭包，与 ai_service
/// 实质生成解耦，便于在测试里替换成 mock 生成器（service_tests 走的就是这条路）。
pub(crate) fn run_image_tasks_with_generator<F>(
    service: &ImageWorkbenchService,
    job_id: &str,
    task_ids: Option<&[String]>,
    worker_id: Option<&str>,
    mut generate: F,
) -> AppResult<ImageWorkbenchSnapshot>
where
    F: FnMut(AiBusinessGenerationRequest) -> Result<AiGenerationResult, String>,
{
    let mut latest = service.get_snapshot(job_id)?;
    validate_workbench_mode(&latest.job.mode, false)?;

    loop {
        let Some(claim) = service.repo()?.claim_next_runnable_task_for_worker(
            job_id,
            task_ids,
            IMAGE_WORKBENCH_TASK_LEASE_MS,
            worker_id,
        )?
        else {
            break;
        };
        latest = claim.snapshot;
        let task_id = claim.task_id;
        let claim_token = claim.claim_token;

        if latest.assets.iter().any(|asset| asset.task_id == task_id) {
            latest = service.update_task_status(UpdateImageWorkbenchTaskStatusRequest {
                task_id: task_id.clone(),
                status: "succeeded".to_string(),
                error: None,
                model_run: None,
            })?;
            continue;
        }

        let job = latest.job.clone();
        let Some(task) = latest.tasks.iter().find(|task| task.id == task_id) else {
            continue;
        };
        let prompt = task
            .prompt
            .clone()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| job.prompt.clone());
        let target_size = job.size.clone();
        let request = AiBusinessGenerationRequest {
            capability: job.mode.clone(),
            provider_config_id: job.provider_config_id.clone(),
            prompt: prompt.clone(),
            model: job.model.clone(),
            request_id: Some(task_id.clone()),
            options: generation_options_for_job(&job, target_size.clone()),
        };

        // 阶段 B1：worker 阻塞 generate 期间起独立心跳线程续租，避免视频 / 高清放大
        // 等长任务被 60s lease 误回收。心跳触发取消时通过 ai_provider_cancel_registry
        // 翻转 generate 的 cancel_token，generate 80ms try_wait 循环立即 terminate sidecar。
        // 终态写入前必须先 stop()——见设计文档 §4.3 race-condition 防护。
        let heartbeat = match worker_id {
            Some(wid) => match service.repo() {
                Ok(repo) => Some(spawn_image_task_heartbeat(
                    repo,
                    task_id.clone(),
                    wid.to_string(),
                    claim_token.clone(),
                )),
                Err(_) => None,
            },
            None => None,
        };

        let generation_result = generate(request);
        if let Some(handle) = heartbeat {
            handle.stop();
        }
        let current = service.get_snapshot(job_id)?;
        let Some(current_task) = current.tasks.iter().find(|task| task.id == task_id) else {
            latest = current;
            continue;
        };
        if matches!(
            current_task.status.as_str(),
            "succeeded" | "failed" | "cancelled"
        ) {
            latest = current;
            continue;
        }

        match generation_result {
            Ok(result) => {
                if !result.ok {
                    latest = service.fail_generation_task(
                        job_id,
                        &task_id,
                        &job,
                        "failed",
                        result.message.clone(),
                        Some(&result),
                    )?;
                    continue;
                }

                let Some(artifact) = pick_image_artifact(&result.artifacts) else {
                    latest = service.fail_generation_task(
                        job_id,
                        &task_id,
                        &job,
                        "failed",
                        "AI 生成结果缺少本地图片路径".to_string(),
                        Some(&result),
                    )?;
                    continue;
                };
                let Some(artifact_path) = artifact.path.clone() else {
                    latest = service.fail_generation_task(
                        job_id,
                        &task_id,
                        &job,
                        "failed",
                        "AI 生成结果缺少本地图片路径".to_string(),
                        Some(&result),
                    )?;
                    continue;
                };

                service.record_asset(RecordImageWorkbenchAssetRequest {
                    task_id: task_id.clone(),
                    file_path: artifact_path,
                    thumbnail_path: None,
                    width: parse_artifact_dimensions(artifact.dimensions.as_deref()).0,
                    height: parse_artifact_dimensions(artifact.dimensions.as_deref()).1,
                    mime_type: artifact
                        .mime_type
                        .clone()
                        .or_else(|| Some("image/png".to_string())),
                    size_bytes: artifact.size_bytes,
                    metadata: Some(RecordImageWorkbenchMetadataInput {
                        original_prompt: Some(job.prompt.clone()),
                        expanded_prompt: Some(prompt.clone()),
                        negative_prompt: job.negative_prompt.clone(),
                        seed: None,
                        model: Some(result.model.clone()),
                        mode: Some(job.mode.clone()),
                        provider: Some(result.provider.clone()),
                        reference_asset_ids_json: job.reference_asset_ids_json.clone(),
                        mask_path: job.mask_path.clone(),
                        person_context_json: job.person_context_json.clone(),
                    }),
                    model_run: Some(generation_result_model_run(
                        &job,
                        "succeeded",
                        Some(&result),
                        None,
                    )),
                })?;
                latest = service.update_task_status(UpdateImageWorkbenchTaskStatusRequest {
                    task_id: task_id.clone(),
                    status: "succeeded".to_string(),
                    error: None,
                    model_run: None,
                })?;
            }
            Err(error) => {
                let status = if is_cancel_error(&error) {
                    "cancelled"
                } else {
                    "failed"
                };
                latest =
                    service.fail_generation_task(job_id, &task_id, &job, status, error, None)?;
            }
        }
    }

    Ok(latest)
}
