use super::{run_janitor_sweep, WorkerIdentity};
use crate::infra::ai_generation_repo::{AiGenerationRepo, NewPersistedAiGenerationTask};
use crate::infra::image_workbench_repo::ImageWorkbenchRepo;
use crate::infra::image_workbench_types::NewImageWorkbenchJob;
use std::fs;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

static TEST_DB_SEQUENCE: AtomicU64 = AtomicU64::new(1);

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|dur| dur.as_millis() as i64)
        .unwrap_or(0)
}

fn shared_db() -> std::path::PathBuf {
    // 两个 repo 共用同一个 sqlite 文件（实际生产也是如此），便于一次扫到底。
    let seq = TEST_DB_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let db_path = std::env::temp_dir().join(format!("monster-janitor-{}-{}.db", now_ms(), seq));
    let _ = fs::remove_file(&db_path);
    db_path
}

fn fresh_business_task(repo: &AiGenerationRepo, request_id: &str) {
    repo.enqueue_business_task(NewPersistedAiGenerationTask {
        request_id: request_id.to_string(),
        capability: "chat".to_string(),
        scope: "business".to_string(),
        provider_config_id: Some("model-config-1".to_string()),
        model: Some("gpt-4.1".to_string()),
        request_json: Some(
            r#"{"capability":"chat","providerConfigId":"model-config-1","prompt":"hi","model":"gpt-4.1","requestId":"r","options":{"count":1}}"#
                .to_string(),
        ),
    })
    .expect("enqueue business task");
}

fn fresh_image_job(repo: &ImageWorkbenchRepo, prompt: &str) -> (String, String) {
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: prompt.to_string(),
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
    let job_id = snapshot.job.id.clone();
    let task_id = snapshot.tasks[0].id.clone();
    (job_id, task_id)
}

#[test]
fn worker_identity_generates_unique_ids_per_call() {
    let a = WorkerIdentity::new();
    let b = WorkerIdentity::new();
    assert_ne!(a.worker_id, b.worker_id);
    assert!(a.worker_id.starts_with("mw-"));
}

#[test]
fn janitor_sweep_recovers_other_worker_running_tasks() {
    let db_path = shared_db();
    let image_repo = ImageWorkbenchRepo::new(db_path.clone());
    let ai_repo = AiGenerationRepo::new(db_path.clone());

    // 模拟上次进程残留：两表各一条 running，worker_id 是上次的 ID。
    let (image_job, image_task) = fresh_image_job(&image_repo, "stale-iw");
    let stale_now = now_ms();
    image_repo
        .test_only_seed_running_task(
            &image_task,
            Some("worker-stale"),
            Some("tok-iw"),
            stale_now,
            stale_now + 60_000,
            Some(stale_now),
        )
        .expect("seed iw running");

    fresh_business_task(&ai_repo, "stale-ai");
    ai_repo
        .test_only_seed_running_business_task(
            "stale-ai",
            Some("worker-stale"),
            Some("tok-ai"),
            stale_now,
            stale_now + 60_000,
            Some(stale_now),
        )
        .expect("seed ai running");

    let counts = run_janitor_sweep(&image_repo, &ai_repo, "worker-current");
    assert_eq!(counts.iw_other_worker, 1);
    assert_eq!(counts.ai_other_worker, 1);

    // 确认两表都已回到 queued。
    let iw_snap = image_repo.get_snapshot(&image_job).expect("iw snapshot");
    let iw_task = iw_snap
        .tasks
        .iter()
        .find(|t| t.id == image_task)
        .expect("iw task");
    assert_eq!(iw_task.status, "queued");

    let ai_task = ai_repo.get("stale-ai").expect("ai task");
    assert_eq!(ai_task.status, "queued");
}

#[test]
fn janitor_sweep_leaves_current_worker_running_alone() {
    let db_path = shared_db();
    let image_repo = ImageWorkbenchRepo::new(db_path.clone());
    let ai_repo = AiGenerationRepo::new(db_path.clone());

    // 当前进程的活任务（lease 还在窗口内）：janitor 不应触碰。
    let (_, image_task) = fresh_image_job(&image_repo, "live-iw");
    let now = now_ms();
    image_repo
        .test_only_seed_running_task(
            &image_task,
            Some("worker-current"),
            Some("tok-iw"),
            now,
            now + 60_000,
            Some(now),
        )
        .expect("seed iw running");

    fresh_business_task(&ai_repo, "live-ai");
    ai_repo
        .test_only_seed_running_business_task(
            "live-ai",
            Some("worker-current"),
            Some("tok-ai"),
            now,
            now + 60_000,
            Some(now),
        )
        .expect("seed ai running");

    let counts = run_janitor_sweep(&image_repo, &ai_repo, "worker-current");
    assert_eq!(counts.iw_other_worker, 0);
    assert_eq!(counts.iw_expired_lease, 0);
    assert_eq!(counts.iw_stuck, 0);
    assert_eq!(counts.ai_other_worker, 0);
    assert_eq!(counts.ai_expired_lease, 0);
    assert_eq!(counts.ai_stuck, 0);
}

#[test]
fn janitor_sweep_recovers_expired_lease_in_current_worker() {
    let db_path = shared_db();
    let image_repo = ImageWorkbenchRepo::new(db_path.clone());
    let ai_repo = AiGenerationRepo::new(db_path.clone());

    // 当前进程的任务但 lease 已过期 + grace 之外：janitor (2) 应回收。
    let (_, image_task) = fresh_image_job(&image_repo, "expired-iw");
    let now = now_ms();
    image_repo
        .test_only_seed_running_task(
            &image_task,
            Some("worker-current"),
            Some("tok-iw"),
            now - 120_000,
            now - 60_000, // lease 已过期 60s，远超 5s grace
            Some(now - 90_000),
        )
        .expect("seed iw expired");

    let counts = run_janitor_sweep(&image_repo, &ai_repo, "worker-current");
    assert!(counts.iw_expired_lease >= 1);
}
