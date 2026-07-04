use super::{spawn_image_task_heartbeat, HeartbeatHandle};
use crate::infra::image_workbench_repo::ImageWorkbenchRepo;
use crate::infra::image_workbench_types::NewImageWorkbenchJob;
use crate::services::ai_provider_task::ai_provider_cancel_registry;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

static TEST_DB_SEQUENCE: AtomicU64 = AtomicU64::new(1);

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|dur| dur.as_millis() as i64)
        .unwrap_or(0)
}

fn fresh_db_path() -> PathBuf {
    let seq = TEST_DB_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let db_path = std::env::temp_dir().join(format!("monster-heartbeat-{}-{}.db", now_ms(), seq));
    let _ = fs::remove_file(&db_path);
    db_path
}

fn seed_running_task(repo: &ImageWorkbenchRepo) -> (String, String, String) {
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "heartbeat".to_string(),
            negative_prompt: None,
            task_prompts: Vec::new(),
            quantity: 1,
            provider_config_id: None,
            model: None,
            size: None,
            reference_asset_ids_json: None,
            source_asset_id: None,
            source_image_path: None,
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
            generation_options_json: None,
        })
        .expect("create job");
    let task_id = snapshot.tasks[0].id.clone();
    let now = now_ms();
    repo.test_only_seed_running_task(
        &task_id,
        Some("worker-current"),
        Some("tok-1"),
        now,
        now + 60_000,
        Some(now),
    )
    .expect("seed running");
    (snapshot.job.id, task_id, "tok-1".to_string())
}

fn read_lease_until_ms(repo: &ImageWorkbenchRepo, job_id: &str, task_id: &str) -> Option<i64> {
    repo.get_snapshot(job_id)
        .ok()?
        .tasks
        .into_iter()
        .find(|t| t.id == task_id)
        .and_then(|t| t.leased_until_ms)
}

#[test]
fn heartbeat_handle_stops_cleanly_when_no_work_pending() {
    let db_path = fresh_db_path();
    let seed_repo = ImageWorkbenchRepo::new(db_path.clone());
    let (_, task_id, claim_token) = seed_running_task(&seed_repo);

    let handle: HeartbeatHandle = spawn_image_task_heartbeat(
        ImageWorkbenchRepo::new(db_path.clone()),
        task_id,
        "worker-current".to_string(),
        claim_token,
    );
    let start = std::time::Instant::now();
    handle.stop();
    assert!(
        start.elapsed() < Duration::from_secs(2),
        "stop 不应挂住超过 2s"
    );
}

#[test]
fn heartbeat_keeps_running_task_alive_in_short_window() {
    // HEARTBEAT_INTERVAL_MS=15s，500ms 窗口内不会触发首次续租；这里只验证
    // heartbeat 启动期间不会破坏状态：task 仍 running、worker_id/lease 不变。
    let db_path = fresh_db_path();
    let seed_repo = ImageWorkbenchRepo::new(db_path.clone());
    let (job_id, task_id, claim_token) = seed_running_task(&seed_repo);
    let original_lease =
        read_lease_until_ms(&seed_repo, &job_id, &task_id).expect("initial lease present");

    let handle = spawn_image_task_heartbeat(
        ImageWorkbenchRepo::new(db_path.clone()),
        task_id.clone(),
        "worker-current".to_string(),
        claim_token,
    );
    std::thread::sleep(Duration::from_millis(500));
    handle.stop();

    let snap = seed_repo.get_snapshot(&job_id).expect("snapshot");
    let task = snap.tasks.iter().find(|t| t.id == task_id).expect("task");
    assert_eq!(task.status, "running", "running 状态应保留");
    let lease = task.leased_until_ms.expect("lease");
    assert!(lease >= original_lease);
}

#[test]
fn heartbeat_uses_ai_provider_cancel_registry_for_takeover_signal() {
    // 心跳触发取消的对接面：注册 → cancel → 标志位被翻。
    // CAS 失败到 cancel 的端到端链路由 image_workbench_repo_tests 的 lease 测试
    // 与本测试组合保证。
    let token = ai_provider_cancel_registry()
        .register("heartbeat-test-rid".to_string())
        .expect("register cancel token");
    assert!(!token.is_cancelled());

    let cancelled = ai_provider_cancel_registry()
        .cancel("heartbeat-test-rid")
        .expect("cancel");
    assert!(cancelled, "registry 应能找到刚注册的 token 并取消");
    assert!(token.is_cancelled(), "cancel_token 应被翻转");

    ai_provider_cancel_registry().remove("heartbeat-test-rid");
}
