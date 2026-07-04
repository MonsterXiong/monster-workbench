use crate::infra::image_workbench_types::ImageWorkbenchSnapshot;
use crate::infra::AppResult;
use crate::services::image_workbench_service::{
    cancelled_generation_model_run, normalize_required_id, ImageWorkbenchService,
    UpdateImageWorkbenchTaskStatusRequest,
};

pub(crate) fn cancel_task(
    service: &ImageWorkbenchService,
    task_id: &str,
) -> AppResult<ImageWorkbenchSnapshot> {
    let task_id = normalize_required_id("图片工作台任务 ID", task_id)?;
    let task = service.repo()?.get_task_by_id(&task_id)?;
    let before = service.get_snapshot(&task.job_id)?;
    if matches!(task.status.as_str(), "succeeded" | "failed" | "cancelled") {
        return Ok(before);
    }
    service.update_task_status(UpdateImageWorkbenchTaskStatusRequest {
        task_id,
        status: "cancelled".to_string(),
        error: Some("用户取消".to_string()),
        failure_type: Some("cancelled".to_string()),
        failure_hint: Some("用户取消".to_string()),
        model_run: Some(cancelled_generation_model_run(&before.job)),
    })
}
