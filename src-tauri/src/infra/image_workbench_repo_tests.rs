use super::*;
use std::fs;

fn test_repo() -> ImageWorkbenchRepo {
    let db_path = std::env::temp_dir().join(format!("monster-iw-test-{}.db", next_id("db")));
    let _ = fs::remove_file(&db_path);
    ImageWorkbenchRepo::new(db_path)
}

#[test]
fn image_workbench_create_job_splits_tasks() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "测试图片".to_string(),
            negative_prompt: None,
            task_prompts: Vec::new(),
            quantity: 3,
            provider_config_id: Some("model-1".to_string()),
            model: Some("gpt-image-2".to_string()),
            size: Some("1024x1024".to_string()),
            reference_asset_ids_json: None,
            source_asset_id: None,
            source_image_path: None,
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
        })
        .expect("create job");

    assert_eq!(snapshot.job.status, "queued");
    assert_eq!(snapshot.job.quantity, 3);
    assert_eq!(snapshot.tasks.len(), 3);
    assert!(snapshot.tasks.iter().all(|task| task.status == "queued"));
}

#[test]
fn image_workbench_create_job_uses_task_prompts() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "雨夜森林小屋".to_string(),
            negative_prompt: None,
            task_prompts: vec![
                "雨夜森林小屋，近景".to_string(),
                "雨夜森林小屋，远景".to_string(),
            ],
            quantity: 2,
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
        })
        .expect("create job");

    assert_eq!(
        snapshot.tasks[0].prompt.as_deref(),
        Some("雨夜森林小屋，近景")
    );
    assert_eq!(
        snapshot.tasks[1].prompt.as_deref(),
        Some("雨夜森林小屋，远景")
    );
}

#[test]
fn image_workbench_task_status_updates_job_status() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "测试图片".to_string(),
            negative_prompt: None,
            task_prompts: Vec::new(),
            quantity: 2,
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
        })
        .expect("create job");

    let first = snapshot.tasks[0].id.clone();
    let second = snapshot.tasks[1].id.clone();
    let running = repo
        .update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id: first.clone(),
            status: "running".to_string(),
            error: None,
            model_run: None,
        })
        .expect("mark running");
    assert_eq!(running.job.status, "running");

    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: first,
        status: "succeeded".to_string(),
        error: None,
        model_run: None,
    })
    .expect("mark first success");

    let partial = repo
        .update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id: second,
            status: "failed".to_string(),
            error: Some("模拟失败".to_string()),
            model_run: None,
        })
        .expect("mark second failed");
    assert_eq!(partial.job.status, "partial_succeeded");
}

#[test]
fn image_workbench_task_running_claim_is_single_owner() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "claim once".to_string(),
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
        })
        .expect("create job");
    let task_id = snapshot.tasks[0].id.clone();
    let task_ids = vec![task_id.clone()];

    let claimed = repo
        .claim_next_runnable_task_for_worker(&snapshot.job.id, Some(&task_ids), 60_000, None)
        .expect("first claim should not error");
    assert!(claimed.is_some());
    let claimed_snapshot = claimed.unwrap().snapshot;
    assert_eq!(claimed_snapshot.tasks[0].status, "running");
    assert!(claimed_snapshot.tasks[0].claim_token.is_some());
    assert!(claimed_snapshot.tasks[0].leased_until_ms.is_some());

    let duplicate = repo
        .claim_next_runnable_task_for_worker(&snapshot.job.id, Some(&task_ids), 60_000, None)
        .expect("second claim should not error");
    assert!(duplicate.is_none());
}

#[test]
fn image_workbench_task_status_rejects_terminal_reopen_and_tracks_retry() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "测试图片".to_string(),
            negative_prompt: None,
            task_prompts: Vec::new(),
            quantity: 2,
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
        })
        .expect("create job");

    let success_task = snapshot.tasks[0].id.clone();
    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: success_task.clone(),
        status: "running".to_string(),
        error: None,
        model_run: None,
    })
    .expect("mark running");
    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: success_task.clone(),
        status: "succeeded".to_string(),
        error: None,
        model_run: None,
    })
    .expect("mark succeeded");
    let reopen_error = repo
        .update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id: success_task,
            status: "running".to_string(),
            error: None,
            model_run: None,
        })
        .expect_err("terminal task should not reopen");
    assert!(matches!(reopen_error, AppError::Config(_)));

    let retry_task = snapshot.tasks[1].id.clone();
    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: retry_task.clone(),
        status: "failed".to_string(),
        error: Some("provider failed".to_string()),
        model_run: None,
    })
    .expect("mark failed");
    let retrying = repo
        .update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id: retry_task.clone(),
            status: "retrying".to_string(),
            error: None,
            model_run: None,
        })
        .expect("mark retrying");
    let task = retrying
        .tasks
        .iter()
        .find(|task| task.id == retry_task)
        .expect("retry task should exist");
    assert_eq!(task.retry_count, 1);
    assert_eq!(task.status, "retrying");
    assert!(task.finished_at_ms.is_none());
}

#[test]
fn image_workbench_task_status_records_failed_model_run() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "失败审计".to_string(),
            negative_prompt: None,
            task_prompts: Vec::new(),
            quantity: 1,
            provider_config_id: Some("model-1".to_string()),
            model: Some("gpt-image-2".to_string()),
            size: Some("1024x1024".to_string()),
            reference_asset_ids_json: None,
            source_asset_id: None,
            source_image_path: None,
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
        })
        .expect("create job");
    let task_id = snapshot.tasks[0].id.clone();

    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: task_id.clone(),
        status: "running".to_string(),
        error: None,
        model_run: None,
    })
    .expect("mark running");

    let failed = repo
        .update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id,
            status: "failed".to_string(),
            error: Some("provider failed".to_string()),
            model_run: Some(NewImageWorkbenchModelRun {
                provider: Some("custom".to_string()),
                model: Some("gpt-image-2".to_string()),
                capability: Some("txt2img".to_string()),
                status: Some("failed".to_string()),
                error: Some("provider failed".to_string()),
                request_json: Some(r#"{"requestId":"task"}"#.to_string()),
                ..Default::default()
            }),
        })
        .expect("mark failed");

    assert_eq!(failed.model_runs.len(), 1);
    let run = &failed.model_runs[0];
    assert_eq!(run.status, "failed");
    assert_eq!(run.task_id.as_deref(), Some(failed.tasks[0].id.as_str()));
    assert!(run
        .request_json
        .as_deref()
        .unwrap_or_default()
        .contains("requestId"));
}

#[test]
fn image_workbench_records_asset_metadata_and_model_run() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "测试图片".to_string(),
            negative_prompt: Some("低清晰度".to_string()),
            task_prompts: Vec::new(),
            quantity: 1,
            provider_config_id: None,
            model: Some("gpt-image-2".to_string()),
            size: Some("1024x1024".to_string()),
            reference_asset_ids_json: None,
            source_asset_id: None,
            source_image_path: None,
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
        })
        .expect("create job");
    let task_id = snapshot.tasks[0].id.clone();

    let snapshot = repo
        .record_asset(
            NewImageWorkbenchAsset {
                task_id,
                file_path: "C:/mock/image.png".to_string(),
                thumbnail_path: None,
                width: Some(1024),
                height: Some(1024),
                mime_type: Some("image/png".to_string()),
                size_bytes: Some(2048),
            },
            Some(NewImageWorkbenchMetadata {
                original_prompt: Some("测试图片".to_string()),
                expanded_prompt: Some("测试图片，高清".to_string()),
                negative_prompt: Some("低清晰度".to_string()),
                seed: Some("42".to_string()),
                model: Some("gpt-image-2".to_string()),
                mode: Some("txt2img".to_string()),
                provider: Some("custom".to_string()),
                ..Default::default()
            }),
            Some(NewImageWorkbenchModelRun {
                provider: Some("custom".to_string()),
                model: Some("gpt-image-2".to_string()),
                capability: Some("txt2img".to_string()),
                status: Some("succeeded".to_string()),
                latency_ms: Some(1200),
                ..Default::default()
            }),
        )
        .expect("record asset");

    assert_eq!(snapshot.assets.len(), 1);
    assert_eq!(snapshot.metadata.len(), 1);
    assert_eq!(snapshot.model_runs.len(), 1);
}

#[test]
fn image_workbench_lists_jobs_and_recent_assets() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "资产列表".to_string(),
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
        })
        .expect("create job");
    let task_id = snapshot.tasks[0].id.clone();

    repo.record_asset(
        NewImageWorkbenchAsset {
            task_id,
            file_path: "C:/mock/list.png".to_string(),
            thumbnail_path: None,
            width: Some(512),
            height: Some(512),
            mime_type: Some("image/png".to_string()),
            size_bytes: Some(1024),
        },
        None,
        None,
    )
    .expect("record asset");

    let jobs = repo.list_jobs(10).expect("jobs should list");
    let assets = repo.list_recent_assets(10).expect("assets should list");
    assert_eq!(jobs.len(), 1);
    assert_eq!(assets.len(), 1);
    assert_eq!(assets[0].file_path, "C:/mock/list.png");
}

#[test]
fn image_workbench_cancels_and_retries_job_tasks() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "取消重试".to_string(),
            negative_prompt: None,
            task_prompts: Vec::new(),
            quantity: 2,
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
        })
        .expect("create job");
    let job_id = snapshot.job.id.clone();
    let failed_task = snapshot.tasks[0].id.clone();

    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: failed_task,
        status: "failed".to_string(),
        error: Some("provider failed".to_string()),
        model_run: None,
    })
    .expect("mark failed");

    let retrying = repo.retry_failed_tasks(&job_id).expect("retry failed task");
    assert!(retrying
        .tasks
        .iter()
        .any(|task| task.status == "retrying" && task.retry_count == 1));

    let cancelled = repo.cancel_job(&job_id).expect("cancel job");
    assert!(cancelled
        .tasks
        .iter()
        .all(|task| task.status == "cancelled" || task.status == "failed"));
}

#[test]
fn image_workbench_recovers_interrupted_jobs() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "恢复中断".to_string(),
            negative_prompt: None,
            task_prompts: Vec::new(),
            quantity: 2,
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
        })
        .expect("create job");
    let job_id = snapshot.job.id.clone();
    let running_task = snapshot.tasks[0].id.clone();

    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: running_task,
        status: "running".to_string(),
        error: None,
        model_run: None,
    })
    .expect("mark running");

    let recovered = repo
        .recover_interrupted_jobs("应用重启后，未完成的图片工作台任务已中止")
        .expect("recover interrupted jobs");
    let snapshot = repo.get_snapshot(&job_id).expect("snapshot should load");

    assert_eq!(recovered, 1);
    assert_eq!(snapshot.job.status, "queued");
    assert!(snapshot.tasks.iter().all(|task| task.status == "queued"));
    assert!(snapshot.tasks.iter().all(|task| task.error.is_none()));
    assert!(snapshot.tasks.iter().all(|task| task.claim_token.is_none()));
    assert!(snapshot
        .tasks
        .iter()
        .all(|task| task.leased_until_ms.is_none()));

    let claimed = repo
        .claim_next_runnable_task_for_worker(&job_id, None, 60_000, None)
        .expect("recovered task should be claimable")
        .expect("recovered task should claim");
    assert_eq!(claimed.snapshot.job.status, "running");
}

#[test]
fn image_workbench_updates_asset_favorite_and_templates() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "模板收藏".to_string(),
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
        })
        .expect("create job");
    let task_id = snapshot.tasks[0].id.clone();
    let snapshot = repo
        .record_asset(
            NewImageWorkbenchAsset {
                task_id,
                file_path: "C:/mock/favorite.png".to_string(),
                thumbnail_path: None,
                width: None,
                height: None,
                mime_type: None,
                size_bytes: None,
            },
            None,
            None,
        )
        .expect("record asset");
    let asset_id = snapshot.assets[0].id.clone();

    let favorited = repo
        .set_asset_favorite(&asset_id, true)
        .expect("favorite asset");
    assert!(favorited.assets[0].favorite);

    let template = repo
        .save_template(NewImageWorkbenchTemplate {
            id: None,
            name: "模板".to_string(),
            prompt: "提示词".to_string(),
            negative_prompt: Some("负向".to_string()),
            mode: "txt2img".to_string(),
        })
        .expect("template should save");
    assert_eq!(template.name, "模板");
    assert_eq!(repo.list_templates().expect("templates").len(), 1);
    repo.delete_template(&template.id)
        .expect("template should delete");
    assert!(repo.list_templates().expect("templates").is_empty());
}

fn seed_single_task_repo() -> (ImageWorkbenchRepo, String) {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "心跳测试".to_string(),
            negative_prompt: None,
            task_prompts: Vec::new(),
            quantity: 1,
            provider_config_id: Some("model-1".to_string()),
            model: Some("gpt-image-2".to_string()),
            size: Some("1024x1024".to_string()),
            reference_asset_ids_json: None,
            source_asset_id: None,
            source_image_path: None,
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
        })
        .expect("create job");
    let task_id = snapshot.tasks[0].id.clone();
    (repo, task_id)
}

fn now_ms_for_test() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|dur| dur.as_millis() as i64)
        .unwrap_or(0)
}

#[test]
fn renew_image_task_lease_succeeds_when_worker_and_token_match() {
    let (repo, task_id) = seed_single_task_repo();
    let claimed_at = now_ms_for_test();
    repo.test_only_seed_running_task(
        &task_id,
        Some("worker-A"),
        Some("claim-tok-1"),
        claimed_at,
        claimed_at + 60_000,
        Some(claimed_at),
    )
    .expect("seed running");

    let ok = repo
        .renew_image_task_lease(&task_id, "worker-A", "claim-tok-1", claimed_at + 120_000)
        .expect("renew");
    assert!(ok, "matching worker_id + claim_token should renew");
}

#[test]
fn renew_image_task_lease_fails_when_worker_id_mismatch() {
    let (repo, task_id) = seed_single_task_repo();
    let claimed_at = now_ms_for_test();
    repo.test_only_seed_running_task(
        &task_id,
        Some("worker-A"),
        Some("claim-tok-1"),
        claimed_at,
        claimed_at + 60_000,
        Some(claimed_at),
    )
    .expect("seed running");

    let ok = repo
        .renew_image_task_lease(&task_id, "worker-B", "claim-tok-1", claimed_at + 120_000)
        .expect("renew");
    assert!(!ok);
}

#[test]
fn renew_image_task_lease_fails_when_claim_token_mismatch() {
    let (repo, task_id) = seed_single_task_repo();
    let claimed_at = now_ms_for_test();
    repo.test_only_seed_running_task(
        &task_id,
        Some("worker-A"),
        Some("claim-tok-1"),
        claimed_at,
        claimed_at + 60_000,
        Some(claimed_at),
    )
    .expect("seed running");

    let ok = repo
        .renew_image_task_lease(&task_id, "worker-A", "claim-tok-other", claimed_at + 120_000)
        .expect("renew");
    assert!(!ok);
}

#[test]
fn reset_running_image_tasks_by_other_worker_only_resets_foreign_workers() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "并行".to_string(),
            negative_prompt: None,
            task_prompts: Vec::new(),
            quantity: 2,
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
        })
        .expect("create job");
    let own_task = snapshot.tasks[0].id.clone();
    let foreign_task = snapshot.tasks[1].id.clone();
    let claimed_at = now_ms_for_test();

    repo.test_only_seed_running_task(
        &own_task,
        Some("worker-current"),
        Some("tok-own"),
        claimed_at,
        claimed_at + 60_000,
        Some(claimed_at),
    )
    .expect("seed own");
    repo.test_only_seed_running_task(
        &foreign_task,
        Some("worker-stale"),
        Some("tok-foreign"),
        claimed_at,
        claimed_at + 60_000,
        Some(claimed_at),
    )
    .expect("seed foreign");

    let n = repo
        .reset_running_image_tasks_by_other_worker("worker-current")
        .expect("reset");
    assert_eq!(n, 1);

    let snap = repo.get_snapshot(&snapshot.job.id).expect("snapshot");
    let own = snap.tasks.iter().find(|t| t.id == own_task).unwrap();
    let foreign = snap.tasks.iter().find(|t| t.id == foreign_task).unwrap();
    assert_eq!(own.status, "running");
    assert_eq!(foreign.status, "queued");
    assert!(foreign.claim_token.is_none());
    assert!(foreign.leased_until_ms.is_none());
}

#[test]
fn reset_running_image_tasks_with_expired_lease_only_resets_expired() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "lease".to_string(),
            negative_prompt: None,
            task_prompts: Vec::new(),
            quantity: 2,
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
        })
        .expect("create job");
    let fresh_task = snapshot.tasks[0].id.clone();
    let expired_task = snapshot.tasks[1].id.clone();
    let claimed_at = now_ms_for_test();
    let cutoff = claimed_at + 30_000;

    repo.test_only_seed_running_task(
        &fresh_task,
        Some("worker-current"),
        Some("tok-fresh"),
        claimed_at,
        cutoff + 60_000,
        Some(claimed_at),
    )
    .expect("seed fresh");
    repo.test_only_seed_running_task(
        &expired_task,
        Some("worker-current"),
        Some("tok-expired"),
        claimed_at,
        cutoff - 1_000,
        Some(claimed_at),
    )
    .expect("seed expired");

    let n = repo
        .reset_running_image_tasks_with_expired_lease("worker-current", cutoff)
        .expect("reset");
    assert_eq!(n, 1);

    let snap = repo.get_snapshot(&snapshot.job.id).expect("snapshot");
    let fresh = snap.tasks.iter().find(|t| t.id == fresh_task).unwrap();
    let expired = snap.tasks.iter().find(|t| t.id == expired_task).unwrap();
    assert_eq!(fresh.status, "running");
    assert_eq!(expired.status, "queued");
}

#[test]
fn fail_stuck_running_image_tasks_marks_oldest_as_failed_and_increments_retry() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "stuck".to_string(),
            negative_prompt: None,
            task_prompts: Vec::new(),
            quantity: 2,
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
        })
        .expect("create job");
    let fresh_task = snapshot.tasks[0].id.clone();
    let stuck_task = snapshot.tasks[1].id.clone();
    let now = now_ms_for_test();
    let stuck_threshold = now - 6 * 60 * 60 * 1000;

    repo.test_only_seed_running_task(
        &fresh_task,
        Some("worker-current"),
        Some("tok-fresh"),
        now - 60_000,
        now + 60_000,
        Some(now),
    )
    .expect("seed fresh");
    repo.test_only_seed_running_task(
        &stuck_task,
        Some("worker-current"),
        Some("tok-stuck"),
        stuck_threshold - 1_000,
        now + 60_000,
        Some(now),
    )
    .expect("seed stuck");

    let n = repo
        .fail_stuck_running_image_tasks(stuck_threshold, "worker_stuck")
        .expect("fail stuck");
    assert_eq!(n, 1);

    let snap = repo.get_snapshot(&snapshot.job.id).expect("snapshot");
    let fresh = snap.tasks.iter().find(|t| t.id == fresh_task).unwrap();
    let stuck = snap.tasks.iter().find(|t| t.id == stuck_task).unwrap();
    assert_eq!(fresh.status, "running");
    assert_eq!(stuck.status, "failed");
    assert_eq!(stuck.error.as_deref(), Some("worker_stuck"));
    assert_eq!(stuck.retry_count, 1, "retry_count should increment");
}
