use crate::services::ai_provider_types::AiProviderTestResult;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex, OnceLock,
};
use std::time::{SystemTime, UNIX_EPOCH};

static AI_PROVIDER_TEST_TASKS: OnceLock<AiProviderTaskRegistry> = OnceLock::new();
static AI_PROVIDER_TEST_CANCELS: OnceLock<AiProviderCancelRegistry> = OnceLock::new();
const AI_PROVIDER_FINISHED_TASK_LIMIT: usize = 40;

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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderTestTask {
    pub request_id: String,
    pub action: String,
    pub status: String,
    pub created_at_ms: u128,
    pub started_at_ms: Option<u128>,
    pub finished_at_ms: Option<u128>,
    pub queue_wait_ms: Option<u64>,
    pub total_latency_ms: Option<u64>,
    pub result: Option<AiProviderTestResult>,
    pub error: Option<String>,
}

pub(crate) struct AiProviderTaskRegistry {
    state: Mutex<AiProviderTaskState>,
}

#[derive(Default)]
struct AiProviderTaskState {
    next_id: u64,
    tasks: HashMap<String, AiProviderTestTask>,
}

impl AiProviderTaskRegistry {
    pub(crate) fn new() -> Self {
        Self {
            state: Mutex::new(AiProviderTaskState {
                next_id: 1,
                tasks: HashMap::new(),
            }),
        }
    }

    pub(crate) fn enqueue(&self, action: String) -> Result<AiProviderTestTask, String> {
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

    pub(crate) fn mark_running(&self, request_id: &str, queue_wait_ms: u64) {
        if let Ok(mut state) = self.state.lock() {
            if let Some(task) = state.tasks.get_mut(request_id) {
                task.status = "running".to_string();
                task.started_at_ms = Some(now_ms());
                task.queue_wait_ms = Some(queue_wait_ms);
            }
        }
    }

    pub(crate) fn complete(
        &self,
        request_id: &str,
        mut result: AiProviderTestResult,
        total_latency_ms: u64,
    ) {
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

    pub(crate) fn fail(&self, request_id: &str, error: String, total_latency_ms: u64) {
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

    pub(crate) fn remove(&self, request_id: &str) {
        if let Ok(mut state) = self.state.lock() {
            state.tasks.remove(request_id);
        }
    }

    pub(crate) fn get(&self, request_id: &str) -> Result<AiProviderTestTask, String> {
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

    pub(crate) fn list_recent(&self, limit: usize) -> Result<Vec<AiProviderTestTask>, String> {
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

pub(crate) fn ai_provider_task_registry() -> &'static AiProviderTaskRegistry {
    AI_PROVIDER_TEST_TASKS.get_or_init(AiProviderTaskRegistry::new)
}

pub(crate) fn list_recent_provider_tasks() -> Result<Vec<AiProviderTestTask>, String> {
    ai_provider_task_registry().list_recent(AI_PROVIDER_FINISHED_TASK_LIMIT)
}

pub(crate) struct AiProviderCancelRegistry {
    state: Mutex<HashMap<String, AiProviderCancelToken>>,
}

impl AiProviderCancelRegistry {
    pub(crate) fn new() -> Self {
        Self {
            state: Mutex::new(HashMap::new()),
        }
    }

    pub(crate) fn register(&self, request_id: String) -> Result<AiProviderCancelToken, String> {
        let token = AiProviderCancelToken::new();
        let mut state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试中止状态异常".to_string())?;
        state.insert(request_id, token.clone());
        Ok(token)
    }

    pub(crate) fn cancel(&self, request_id: &str) -> Result<bool, String> {
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

    pub(crate) fn remove(&self, request_id: &str) {
        if let Ok(mut state) = self.state.lock() {
            state.remove(request_id);
        }
    }
}

pub(crate) fn ai_provider_cancel_registry() -> &'static AiProviderCancelRegistry {
    AI_PROVIDER_TEST_CANCELS.get_or_init(AiProviderCancelRegistry::new)
}

pub(crate) fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

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
            artifacts: None,
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
    fn cancel_token_can_be_shared_and_observed() {
        let token = AiProviderCancelToken::new();
        let cloned = token.clone();

        assert!(!token.is_cancelled());
        cloned.cancel();

        assert!(token.is_cancelled());
    }
}
