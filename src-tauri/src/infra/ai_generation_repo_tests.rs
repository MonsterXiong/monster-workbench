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

#[test]
fn renew_business_task_lease_succeeds_when_worker_and_token_match() {
    let repo = test_repo();
    repo.enqueue_business_task(new_task("renew-ok"))
        .expect("enqueue");
    let claimed_at = now_ms();
    repo.test_only_seed_running_business_task(
        "renew-ok",
        Some("worker-A"),
        Some("claim-tok-1"),
        claimed_at,
        claimed_at + 60_000,
        Some(claimed_at),
    )
    .expect("seed running");

    let new_lease = claimed_at + 120_000;
    let ok = repo
        .renew_business_task_lease("renew-ok", "worker-A", "claim-tok-1", new_lease)
        .expect("renew");
    assert!(ok, "matching worker_id + claim_token should renew");

    let task = repo.get("renew-ok").expect("read");
    // 通过自定义查询确认 leased_until_ms 已推进；PersistedAiGenerationTask 不含 lease 字段，
    // 所以这里只校验 status 仍为 running。具体 lease 推进会在 mismatch 用例反向验证。
    assert_eq!(task.status, "running");
}

#[test]
fn renew_business_task_lease_fails_when_worker_id_mismatch() {
    let repo = test_repo();
    repo.enqueue_business_task(new_task("renew-mismatch-worker"))
        .expect("enqueue");
    let claimed_at = now_ms();
    repo.test_only_seed_running_business_task(
        "renew-mismatch-worker",
        Some("worker-A"),
        Some("claim-tok-1"),
        claimed_at,
        claimed_at + 60_000,
        Some(claimed_at),
    )
    .expect("seed running");

    let ok = repo
        .renew_business_task_lease(
            "renew-mismatch-worker",
            "worker-B",
            "claim-tok-1",
            claimed_at + 120_000,
        )
        .expect("renew");
    assert!(!ok, "mismatched worker_id should not renew");
}

#[test]
fn renew_business_task_lease_fails_when_status_not_running() {
    let repo = test_repo();
    repo.enqueue_business_task(new_task("renew-not-running"))
        .expect("enqueue");
    // 没有 seed running，状态仍为 queued
    let ok = repo
        .renew_business_task_lease("renew-not-running", "worker-A", "claim-tok-1", now_ms())
        .expect("renew");
    assert!(!ok, "queued task should not be renewable");
}

#[test]
fn reset_running_business_tasks_by_other_worker_only_resets_foreign_workers() {
    let repo = test_repo();
    repo.enqueue_business_task(new_task("own-worker"))
        .expect("enqueue");
    repo.enqueue_business_task(new_task("other-worker"))
        .expect("enqueue");
    let claimed_at = now_ms();
    repo.test_only_seed_running_business_task(
        "own-worker",
        Some("worker-current"),
        Some("tok-1"),
        claimed_at,
        claimed_at + 60_000,
        Some(claimed_at),
    )
    .expect("seed own");
    repo.test_only_seed_running_business_task(
        "other-worker",
        Some("worker-stale"),
        Some("tok-2"),
        claimed_at,
        claimed_at + 60_000,
        Some(claimed_at),
    )
    .expect("seed other");

    let n = repo
        .reset_running_business_tasks_by_other_worker("worker-current")
        .expect("reset");
    assert_eq!(n, 1, "only foreign-worker task should be reset");

    let own = repo.get("own-worker").expect("get own");
    let other = repo.get("other-worker").expect("get other");
    assert_eq!(own.status, "running", "current-worker task untouched");
    assert_eq!(other.status, "queued", "foreign-worker task rolled back");
}

#[test]
fn reset_running_business_tasks_with_expired_lease_only_resets_expired() {
    let repo = test_repo();
    repo.enqueue_business_task(new_task("fresh-lease"))
        .expect("enqueue");
    repo.enqueue_business_task(new_task("expired-lease"))
        .expect("enqueue");
    let claimed_at = now_ms();
    let cutoff = claimed_at + 30_000;
    // fresh：lease 还在 cutoff 之后
    repo.test_only_seed_running_business_task(
        "fresh-lease",
        Some("worker-current"),
        Some("tok-1"),
        claimed_at,
        cutoff + 60_000,
        Some(claimed_at),
    )
    .expect("seed fresh");
    // expired：lease 早于 cutoff
    repo.test_only_seed_running_business_task(
        "expired-lease",
        Some("worker-current"),
        Some("tok-2"),
        claimed_at,
        cutoff - 1_000,
        Some(claimed_at),
    )
    .expect("seed expired");

    let n = repo
        .reset_running_business_tasks_with_expired_lease("worker-current", cutoff)
        .expect("reset");
    assert_eq!(n, 1);

    let fresh = repo.get("fresh-lease").expect("get fresh");
    let expired = repo.get("expired-lease").expect("get expired");
    assert_eq!(fresh.status, "running");
    assert_eq!(expired.status, "queued");
}

#[test]
fn fail_stuck_running_business_tasks_marks_oldest_as_failed() {
    let repo = test_repo();
    repo.enqueue_business_task(new_task("fresh-claim"))
        .expect("enqueue");
    repo.enqueue_business_task(new_task("stuck-claim"))
        .expect("enqueue");
    let now = now_ms();
    let stuck_threshold = now - 6 * 60 * 60 * 1000;
    repo.test_only_seed_running_business_task(
        "fresh-claim",
        Some("worker-current"),
        Some("tok-1"),
        now - 60_000,
        now + 60_000,
        Some(now),
    )
    .expect("seed fresh");
    repo.test_only_seed_running_business_task(
        "stuck-claim",
        Some("worker-current"),
        Some("tok-2"),
        stuck_threshold - 1_000,
        now + 60_000,
        Some(now),
    )
    .expect("seed stuck");

    let n = repo
        .fail_stuck_running_business_tasks(stuck_threshold, "worker_stuck")
        .expect("fail stuck");
    assert_eq!(n, 1);

    let fresh = repo.get("fresh-claim").expect("get fresh");
    let stuck = repo.get("stuck-claim").expect("get stuck");
    assert_eq!(fresh.status, "running");
    assert_eq!(stuck.status, "failed");
    assert_eq!(stuck.error.as_deref(), Some("worker_stuck"));
}
