use super::*;
use std::fs;
use std::sync::atomic::{AtomicU64, Ordering};

static TEST_DB_SEQUENCE: AtomicU64 = AtomicU64::new(1);

fn test_repo() -> AiGenerationRepo {
    let seq = TEST_DB_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let db_path =
        std::env::temp_dir().join(format!("monster-ai-generation-{}-{}.db", now_ms(), seq));
    let _ = fs::remove_file(&db_path);
    AiGenerationRepo::new(db_path)
}

fn new_task(request_id: &str) -> NewPersistedAiGenerationTask {
    NewPersistedAiGenerationTask {
        request_id: request_id.to_string(),
        capability: "chat".to_string(),
        scope: "business".to_string(),
        provider_config_id: Some("model-config-1".to_string()),
        model: Some("gpt-4.1".to_string()),
        request_json: Some(
            r#"{"capability":"chat","providerConfigId":"model-config-1","prompt":"hello","model":"gpt-4.1","requestId":"request-1","options":{"count":1}}"#
                .to_string(),
        ),
    }
}

#[test]
fn ai_generation_repo_persists_success_result() {
    let repo = test_repo();
    let task = repo
        .enqueue_business_task(new_task("request-success"))
        .expect("task should enqueue");
    assert_eq!(task.status, "queued");

    assert!(repo
        .mark_running("request-success", 12)
        .expect("task should mark running"));
    assert!(repo
        .complete(
            "request-success",
            true,
            r#"{"ok":true,"message":"ok"}"#.to_string(),
            None,
            120,
        )
        .expect("task should complete"));

    let restored = repo.get("request-success").expect("task should restore");
    assert_eq!(restored.status, "success");
    assert_eq!(restored.queue_wait_ms, Some(12));
    assert_eq!(restored.total_latency_ms, Some(120));
    assert!(restored.result_json.as_deref().unwrap_or("").contains("ok"));

    assert!(!repo
        .complete(
            "request-success",
            false,
            r#"{"ok":false,"message":"overwritten"}"#.to_string(),
            Some("overwritten".to_string()),
            240,
        )
        .expect("terminal task should not complete again"));
    let restored = repo
        .get("request-success")
        .expect("terminal task should remain stable");
    assert_eq!(restored.status, "success");
    assert_eq!(restored.total_latency_ms, Some(120));
    assert!(restored.result_json.as_deref().unwrap_or("").contains("ok"));
    assert!(!restored
        .result_json
        .as_deref()
        .unwrap_or("")
        .contains("overwritten"));
}

#[test]
fn ai_generation_repo_recovers_runnable_business_tasks() {
    let repo = test_repo();
    repo.enqueue_business_task(new_task("request-recover"))
        .expect("task should enqueue");
    repo.mark_running("request-recover", 5)
        .expect("task should mark running");

    let recovered = repo
        .recover_runnable_business_tasks()
        .expect("tasks should recover");
    assert_eq!(recovered.len(), 1);
    assert_eq!(recovered[0].request_id, "request-recover");
    assert_eq!(recovered[0].status, "queued");
    assert!(recovered[0].request_json.is_some());

    let restored = repo.get("request-recover").expect("task should restore");
    assert_eq!(restored.status, "queued");
    assert!(restored.started_at_ms.is_none());
    assert!(restored.finished_at_ms.is_none());
    assert!(restored.queue_wait_ms.is_none());
}

#[test]
fn ai_generation_repo_cancels_nonterminal_task() {
    let repo = test_repo();
    repo.enqueue_business_task(new_task("request-cancel"))
        .expect("task should enqueue");

    assert!(repo
        .cancel("request-cancel", "用户取消".to_string())
        .expect("task should cancel"));
    assert!(!repo
        .mark_running("request-cancel", 1)
        .expect("cancelled task should not run"));

    let restored = repo.get("request-cancel").expect("task should restore");
    assert_eq!(restored.status, "canceled");
    assert!(restored.error.as_deref().unwrap_or("").contains("用户取消"));
}

#[test]
fn ai_generation_repo_does_not_requeue_terminal_task() {
    let repo = test_repo();
    repo.enqueue_business_task(new_task("request-terminal-idempotent"))
        .expect("task should enqueue");
    repo.cancel("request-terminal-idempotent", "用户取消".to_string())
        .expect("task should cancel");

    let repeated = repo
        .enqueue_business_task(new_task("request-terminal-idempotent"))
        .expect("repeated enqueue should return existing terminal task");

    assert_eq!(repeated.status, "canceled");
    let restored = repo
        .get("request-terminal-idempotent")
        .expect("terminal task should remain readable");
    assert_eq!(restored.status, "canceled");
    assert!(restored.error.as_deref().unwrap_or("").contains("用户取消"));
}
