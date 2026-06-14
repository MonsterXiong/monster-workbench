use crate::services::ai_provider_task::now_ms;
use crate::services::ai_provider_types::AiGenerationResult;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

static AI_GENERATION_TASKS: OnceLock<AiGenerationTaskRegistry> = OnceLock::new();
const AI_GENERATION_FINISHED_TASK_LIMIT: usize = 80;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiGenerationTask {
    pub request_id: String,
    pub capability: String,
    pub scope: String,
    pub status: String,
    pub provider_config_id: Option<String>,
    pub model: Option<String>,
    pub created_at_ms: u128,
    pub started_at_ms: Option<u128>,
    pub finished_at_ms: Option<u128>,
    pub queue_wait_ms: Option<u64>,
    pub total_latency_ms: Option<u64>,
    pub result: Option<AiGenerationResult>,
    pub error: Option<String>,
}

pub(crate) struct AiGenerationTaskRegistry {
    state: Mutex<AiGenerationTaskState>,
}

#[derive(Default)]
struct AiGenerationTaskState {
    tasks: HashMap<String, AiGenerationTask>,
}

impl AiGenerationTaskRegistry {
    pub(crate) fn new() -> Self {
        Self {
            state: Mutex::new(AiGenerationTaskState {
                tasks: HashMap::new(),
            }),
        }
    }

    pub(crate) fn enqueue(
        &self,
        request_id: String,
        capability: String,
        scope: String,
        provider_config_id: Option<String>,
        model: Option<String>,
    ) -> Result<AiGenerationTask, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "AI 生成任务状态异常".to_string())?;
        if let Some(task) = state.tasks.get(&request_id) {
            return Ok(task.clone());
        }

        let task = AiGenerationTask {
            request_id: request_id.clone(),
            capability,
            scope,
            status: "queued".to_string(),
            provider_config_id,
            model,
            created_at_ms: now_ms(),
            started_at_ms: None,
            finished_at_ms: None,
            queue_wait_ms: None,
            total_latency_ms: None,
            result: None,
            error: None,
        };
        state.tasks.insert(request_id, task.clone());
        trim_finished_tasks(&mut state);
        Ok(task)
    }

    pub(crate) fn ensure_queued(
        &self,
        request_id: String,
        capability: String,
        scope: String,
        model: Option<String>,
    ) -> Result<AiGenerationTask, String> {
        self.enqueue(request_id, capability, scope, None, model)
    }

    pub(crate) fn mark_running(&self, request_id: &str, queue_wait_ms: u64) {
        if let Ok(mut state) = self.state.lock() {
            if let Some(task) = state.tasks.get_mut(request_id) {
                if is_terminal_status(&task.status) {
                    return;
                }
                task.status = "running".to_string();
                task.started_at_ms = Some(now_ms());
                task.queue_wait_ms = Some(queue_wait_ms);
                task.error = None;
            }
        }
    }

    pub(crate) fn complete(
        &self,
        request_id: &str,
        mut result: AiGenerationResult,
        total_latency_ms: u64,
    ) {
        if let Ok(mut state) = self.state.lock() {
            if let Some(task) = state.tasks.get_mut(request_id) {
                if task.status == "canceled" {
                    return;
                }
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

    pub(crate) fn fail(&self, request_id: &str, error: String, total_latency_ms: u64) {
        if is_cancel_error(&error) {
            self.cancel(request_id, error, Some(total_latency_ms));
            return;
        }

        if let Ok(mut state) = self.state.lock() {
            if let Some(task) = state.tasks.get_mut(request_id) {
                if is_terminal_status(&task.status) {
                    return;
                }
                task.status = "failed".to_string();
                task.finished_at_ms = Some(now_ms());
                task.total_latency_ms = Some(total_latency_ms);
                task.error = Some(error);
            }
            trim_finished_tasks(&mut state);
        }
    }

    pub(crate) fn cancel(
        &self,
        request_id: &str,
        reason: String,
        total_latency_ms: Option<u64>,
    ) -> bool {
        if let Ok(mut state) = self.state.lock() {
            let Some(task) = state.tasks.get_mut(request_id) else {
                return false;
            };
            if is_terminal_status(&task.status) {
                return false;
            }
            task.status = "canceled".to_string();
            task.finished_at_ms = Some(now_ms());
            task.total_latency_ms = total_latency_ms.or(task.total_latency_ms);
            task.error = Some(reason);
            trim_finished_tasks(&mut state);
            return true;
        }
        false
    }

    pub(crate) fn get(&self, request_id: &str) -> Result<AiGenerationTask, String> {
        let state = self
            .state
            .lock()
            .map_err(|_| "AI 生成任务状态异常".to_string())?;
        state
            .tasks
            .get(request_id)
            .cloned()
            .ok_or_else(|| "未找到 AI 生成任务".to_string())
    }

    pub(crate) fn list_recent(&self, limit: usize) -> Result<Vec<AiGenerationTask>, String> {
        let state = self
            .state
            .lock()
            .map_err(|_| "AI 生成任务状态异常".to_string())?;
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

fn is_terminal_status(status: &str) -> bool {
    matches!(status, "success" | "failed" | "canceled")
}

fn is_cancel_error(error: &str) -> bool {
    error.contains("取消") || error.contains("中止") || error.contains("cancel")
}

fn trim_finished_tasks(state: &mut AiGenerationTaskState) {
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
    if finished.len() <= AI_GENERATION_FINISHED_TASK_LIMIT {
        return;
    }

    finished.sort_by(|left, right| right.1.cmp(&left.1));
    for (request_id, _) in finished.into_iter().skip(AI_GENERATION_FINISHED_TASK_LIMIT) {
        state.tasks.remove(&request_id);
    }
}

pub(crate) fn ai_generation_task_registry() -> &'static AiGenerationTaskRegistry {
    AI_GENERATION_TASKS.get_or_init(AiGenerationTaskRegistry::new)
}

pub(crate) fn list_recent_generation_tasks() -> Result<Vec<AiGenerationTask>, String> {
    ai_generation_task_registry().list_recent(AI_GENERATION_FINISHED_TASK_LIMIT)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn generation_result(request_id: &str) -> AiGenerationResult {
        AiGenerationResult {
            request_id: Some(request_id.to_string()),
            ok: true,
            capability: "chat".to_string(),
            provider: "custom".to_string(),
            model: "chat-test".to_string(),
            base_url: "https://example.com/v1".to_string(),
            latency_ms: 100,
            queue_wait_ms: None,
            total_latency_ms: None,
            message: "ok".to_string(),
            status_code: Some(200),
            text: Some("pong".to_string()),
            artifacts: Vec::new(),
            failure_kind: None,
            raw_preview: None,
        }
    }

    #[test]
    fn generation_registry_tracks_success() {
        let registry = AiGenerationTaskRegistry::new();
        let task = registry
            .enqueue(
                "generation-1".to_string(),
                "chat".to_string(),
                "business".to_string(),
                Some("model-config-1".to_string()),
                Some("chat-test".to_string()),
            )
            .expect("task should enqueue");

        registry.mark_running(&task.request_id, 15);
        registry.complete(&task.request_id, generation_result(&task.request_id), 120);

        let restored = registry
            .get(&task.request_id)
            .expect("finished task should be readable");
        assert_eq!(restored.status, "success");
        assert_eq!(restored.queue_wait_ms, Some(15));
        assert_eq!(restored.total_latency_ms, Some(120));
        assert_eq!(
            restored.result.expect("result should exist").text,
            Some("pong".to_string())
        );
    }

    #[test]
    fn generation_registry_does_not_overwrite_cancelled_task() {
        let registry = AiGenerationTaskRegistry::new();
        registry
            .enqueue(
                "generation-cancelled".to_string(),
                "image".to_string(),
                "business".to_string(),
                None,
                None,
            )
            .expect("task should enqueue");

        assert!(registry.cancel(
            "generation-cancelled",
            "AI 生成任务已取消".to_string(),
            None
        ));
        registry.fail(
            "generation-cancelled",
            "AI 模型测试排队任务已被取消".to_string(),
            0,
        );

        let restored = registry
            .get("generation-cancelled")
            .expect("cancelled task should remain readable");
        assert_eq!(restored.status, "canceled");
        assert!(restored.result.is_none());

        let repeated = registry
            .enqueue(
                "generation-cancelled".to_string(),
                "image".to_string(),
                "business".to_string(),
                None,
                None,
            )
            .expect("repeated enqueue should be idempotent");
        assert_eq!(repeated.status, "canceled");
    }
}
