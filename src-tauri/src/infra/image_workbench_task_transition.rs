use crate::infra::image_workbench_types::ImageWorkbenchTask;
use crate::infra::{AppError, AppResult};

/// task 终态：不可再切换为非终态。
pub(crate) fn is_terminal_status(status: &str) -> bool {
    matches!(status, "succeeded" | "failed" | "cancelled")
}

/// job 终态：partial_succeeded 也是 job 的终态，但 task 没有这个枚举。
pub(crate) fn is_job_terminal_status(status: &str) -> bool {
    matches!(
        status,
        "succeeded" | "failed" | "cancelled" | "partial_succeeded"
    )
}

/// 当前 task 是否可被 worker 抢占：queued / retrying 直接可领；
/// running / validating 只有在 lease 过期或为空时才允许重新领。
pub(crate) fn is_claimable_task(task: &ImageWorkbenchTask, now: i64) -> bool {
    matches!(task.status.as_str(), "queued" | "retrying")
        || matches!(task.status.as_str(), "running" | "validating")
            && task
                .leased_until_ms
                .map(|until| until <= now)
                .unwrap_or(true)
}

/// 校验 task 状态机迁移合法性。允许的迁移见正文注释。
pub(crate) fn validate_task_status_transition(
    task: &ImageWorkbenchTask,
    next_status: &str,
) -> AppResult<()> {
    if task.status == next_status {
        return Ok(());
    }

    let allowed = match task.status.as_str() {
        "queued" => matches!(next_status, "running" | "failed" | "cancelled"),
        "running" => matches!(
            next_status,
            "validating" | "succeeded" | "failed" | "cancelled" | "retrying"
        ),
        "validating" => matches!(next_status, "succeeded" | "failed" | "cancelled"),
        "retrying" => matches!(next_status, "running" | "failed" | "cancelled"),
        "failed" => next_status == "retrying" && task.retry_count < task.max_retries,
        "succeeded" | "cancelled" => false,
        _ => false,
    };

    if allowed {
        Ok(())
    } else {
        Err(AppError::Config(format!(
            "图片工作台任务状态不能从 {} 切换到 {}",
            task.status, next_status
        )))
    }
}
