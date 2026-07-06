use super::*;
use crate::infra::image_workbench_types::ImageWorkbenchAssetSort;
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
            generation_options_json: None,
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
            generation_options_json: None,
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
fn image_workbench_storyboard_job_builds_scene_groups_and_variant_indexes() {
    let repo = test_repo();
    let task_prompts = vec![
        "分镜一候选 1".to_string(),
        "分镜一候选 2".to_string(),
        "分镜一候选 3".to_string(),
        "分镜一候选 4".to_string(),
        "分镜二候选 1".to_string(),
        "分镜二候选 2".to_string(),
        "分镜二候选 3".to_string(),
        "分镜二候选 4".to_string(),
    ];
    let generation_options_json = serde_json::json!({
        "storyboard": {
            "version": 1,
            "type": "storyboard",
            "variantsPerScene": 4,
            "sceneCount": 2,
            "scenes": [
                {
                    "index": 1,
                    "title": "初见",
                    "taskStartIndex": 0,
                    "taskCount": 4,
                    "referencePrompt": "人物参考图为主，场景参考为江南水岸。"
                },
                {
                    "index": 2,
                    "title": "宫宴",
                    "taskStartIndex": 4,
                    "taskCount": 4,
                    "referencePrompt": "人物参考图为主，服装参考为深红宫装。"
                }
            ]
        }
    })
    .to_string();

    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "person_consistency".to_string(),
            prompt: "古风女主视觉分镜批量生成".to_string(),
            negative_prompt: Some("不要换脸".to_string()),
            task_prompts: task_prompts.clone(),
            quantity: 8,
            provider_config_id: None,
            model: None,
            size: None,
            reference_asset_ids_json: Some("[\"iw-asset-person\"]".to_string()),
            source_asset_id: None,
            source_image_path: None,
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
            generation_options_json: Some(generation_options_json),
        })
        .expect("create storyboard job");

    let groups = repo.list_groups(&snapshot.job.id).expect("list groups");
    assert_eq!(groups.len(), 2);
    let first_group = groups
        .iter()
        .find(|group| group.source_id.as_deref() == Some("storyboard-scene-1"))
        .expect("first storyboard group");
    let second_group = groups
        .iter()
        .find(|group| group.source_id.as_deref() == Some("storyboard-scene-2"))
        .expect("second storyboard group");

    assert_eq!(first_group.name.as_deref(), Some("分镜 01｜初见"));
    assert_eq!(first_group.r#type.as_deref(), Some("storyboard"));
    assert_eq!(first_group.agent_preset.as_deref(), Some("storyboard"));
    assert_eq!(first_group.count, 4);
    assert_eq!(first_group.base_prompt.as_deref(), Some("分镜一候选 1"));
    assert!(first_group
        .agent_ids_json
        .as_deref()
        .unwrap_or_default()
        .contains("江南水岸"));
    assert_eq!(second_group.name.as_deref(), Some("分镜 02｜宫宴"));
    assert_eq!(second_group.count, 4);
    assert_eq!(second_group.base_prompt.as_deref(), Some("分镜二候选 1"));

    let mut tasks = snapshot.tasks.clone();
    tasks.sort_by_key(|task| task.queue_index);
    for (index, task) in tasks.iter().enumerate() {
        assert_eq!(task.prompt.as_deref(), Some(task_prompts[index].as_str()));
        if index < 4 {
            assert_eq!(task.group_id.as_deref(), Some(first_group.id.as_str()));
            assert_eq!(task.variant_index, Some(index as u32));
        } else {
            assert_eq!(task.group_id.as_deref(), Some(second_group.id.as_str()));
            assert_eq!(task.variant_index, Some((index - 4) as u32));
        }
    }
}

#[test]
fn image_workbench_replan_storyboard_group_appends_fresh_tasks() {
    let repo = test_repo();
    let task_prompts = vec![
        "scene one candidate 1".to_string(),
        "scene one candidate 2".to_string(),
        "scene one candidate 3".to_string(),
        "scene one candidate 4".to_string(),
    ];
    let generation_options_json = serde_json::json!({
        "storyboard": {
            "version": 1,
            "type": "storyboard",
            "variantsPerScene": 4,
            "sceneCount": 1,
            "scenes": [
                {
                    "index": 1,
                    "title": "初见",
                    "taskStartIndex": 0,
                    "taskCount": 4,
                    "referencePrompt": "person reference"
                }
            ]
        }
    })
    .to_string();

    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "person_consistency".to_string(),
            prompt: "storyboard batch".to_string(),
            negative_prompt: Some("no face swap".to_string()),
            task_prompts: task_prompts.clone(),
            quantity: 4,
            provider_config_id: None,
            model: None,
            size: None,
            reference_asset_ids_json: Some("[\"iw-asset-person\"]".to_string()),
            source_asset_id: None,
            source_image_path: None,
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
            generation_options_json: Some(generation_options_json),
        })
        .expect("create storyboard job");
    let group = repo
        .list_groups(&snapshot.job.id)
        .expect("list groups")
        .into_iter()
        .find(|group| group.agent_preset.as_deref() == Some("storyboard"))
        .expect("storyboard group");

    for task in &snapshot.tasks {
        repo.update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id: task.id.clone(),
            status: "failed".to_string(),
            error: Some("upstream failed".to_string()),
            failure_type: Some("upstream".to_string()),
            failure_hint: Some("upstream failed".to_string()),
            model_run: None,
        })
        .expect("mark failed");
    }

    let replanned = repo
        .replan_storyboard_group(ReplanImageWorkbenchStoryboardGroupInput {
            group_id: group.id.clone(),
            variants_per_scene: None,
        })
        .expect("replan storyboard group");

    assert_eq!(replanned.job.id, snapshot.job.id);
    assert_eq!(replanned.job.quantity, 8);
    assert_eq!(replanned.job.status, "queued");
    assert_eq!(replanned.tasks.len(), 8);
    let groups = repo.list_groups(&snapshot.job.id).expect("list groups");
    assert_eq!(groups.len(), 2);
    let replan_group = groups
        .iter()
        .find(|item| item.id != group.id)
        .expect("replan group");
    assert_eq!(replan_group.r#type.as_deref(), Some("storyboard"));
    assert_eq!(replan_group.agent_preset.as_deref(), Some("storyboard"));
    assert_eq!(replan_group.count, 4);
    assert!(replan_group
        .source_id
        .as_deref()
        .unwrap_or_default()
        .contains("replan"));
    assert!(replan_group
        .base_prompt
        .as_deref()
        .unwrap_or_default()
        .contains("分镜重规划批次"));
    assert!(replan_group
        .base_prompt
        .as_deref()
        .unwrap_or_default()
        .contains("不要复制参考图或上一轮的固定表情"));
    assert!(replan_group
        .base_prompt
        .as_deref()
        .unwrap_or_default()
        .contains("镜头景别、拍摄手法"));

    let fresh_tasks = replanned
        .tasks
        .iter()
        .filter(|task| task.group_id.as_deref() == Some(replan_group.id.as_str()))
        .collect::<Vec<_>>();
    assert_eq!(fresh_tasks.len(), 4);
    assert!(fresh_tasks.iter().all(|task| task.status == "queued"));
    assert!(fresh_tasks.iter().all(|task| task.retry_count == 0));
    assert_eq!(
        fresh_tasks
            .iter()
            .map(|task| task.variant_index)
            .collect::<Vec<_>>(),
        vec![Some(0), Some(1), Some(2), Some(3)]
    );
    assert!(fresh_tasks.iter().all(|task| task
        .prompt
        .as_deref()
        .unwrap_or_default()
        .contains("不要锁定参考图表情")));
    assert!(fresh_tasks.iter().all(|task| task
        .prompt
        .as_deref()
        .unwrap_or_default()
        .contains("服装细节、场景道具、景别")));
    for old_task in &snapshot.tasks {
        assert!(fresh_tasks.iter().all(|fresh| fresh.id != old_task.id));
    }
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
            generation_options_json: None,
        })
        .expect("create job");

    let first = snapshot.tasks[0].id.clone();
    let second = snapshot.tasks[1].id.clone();
    let running = repo
        .update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id: first.clone(),
            status: "running".to_string(),
            error: None,
            failure_type: None,
            failure_hint: None,
            model_run: None,
        })
        .expect("mark running");
    assert_eq!(running.job.status, "running");

    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: first,
        status: "succeeded".to_string(),
        error: None,
        failure_type: None,
        failure_hint: None,
        model_run: None,
    })
    .expect("mark first success");

    let partial = repo
        .update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id: second,
            status: "failed".to_string(),
            error: Some("模拟失败".to_string()),
            failure_type: Some("unknown".to_string()),
            failure_hint: Some("模拟失败".to_string()),
            model_run: None,
        })
        .expect("mark second failed");
    assert_eq!(partial.job.status, "partial_succeeded");
    let failed_task = partial
        .tasks
        .iter()
        .find(|task| task.status == "failed")
        .expect("failed task should exist");
    assert_eq!(failed_task.failure_type.as_deref(), Some("unknown"));
    assert_eq!(failed_task.failure_hint.as_deref(), Some("模拟失败"));
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
            generation_options_json: None,
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
fn image_workbench_claims_distinct_tasks_for_parallel_workers() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "parallel claim".to_string(),
            negative_prompt: None,
            task_prompts: Vec::new(),
            quantity: 3,
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

    let first = repo
        .claim_next_runnable_task_for_worker(&snapshot.job.id, None, 60_000, Some("worker"))
        .expect("first claim")
        .expect("first task");
    let second = repo
        .claim_next_runnable_task_for_worker(&snapshot.job.id, None, 60_000, Some("worker"))
        .expect("second claim")
        .expect("second task");

    assert_ne!(first.task_id, second.task_id);
    let claimed = repo.get_snapshot(&snapshot.job.id).expect("snapshot");
    assert_eq!(
        claimed
            .tasks
            .iter()
            .filter(|task| task.status == "running")
            .count(),
        2
    );
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
            generation_options_json: None,
        })
        .expect("create job");

    let success_task = snapshot.tasks[0].id.clone();
    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: success_task.clone(),
        status: "running".to_string(),
        error: None,
        failure_type: None,
        failure_hint: None,
        model_run: None,
    })
    .expect("mark running");
    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: success_task.clone(),
        status: "succeeded".to_string(),
        error: None,
        failure_type: None,
        failure_hint: None,
        model_run: None,
    })
    .expect("mark succeeded");
    let reopen_error = repo
        .update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id: success_task,
            status: "running".to_string(),
            error: None,
            failure_type: None,
            failure_hint: None,
            model_run: None,
        })
        .expect_err("terminal task should not reopen");
    assert!(matches!(reopen_error, AppError::Config(_)));

    let retry_task = snapshot.tasks[1].id.clone();
    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: retry_task.clone(),
        status: "failed".to_string(),
        error: Some("provider failed".to_string()),
        failure_type: Some("unknown".to_string()),
        failure_hint: Some("provider failed".to_string()),
        model_run: None,
    })
    .expect("mark failed");
    let retrying = repo
        .update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id: retry_task.clone(),
            status: "retrying".to_string(),
            error: None,
            failure_type: None,
            failure_hint: None,
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
    assert_eq!(task.failure_type, None);
    assert_eq!(task.failure_hint, None);

    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: retry_task.clone(),
        status: "failed".to_string(),
        error: Some("provider failed again".to_string()),
        failure_type: Some("unknown".to_string()),
        failure_hint: Some("provider failed again".to_string()),
        model_run: None,
    })
    .expect("mark failed again");
    let retried_again = repo
        .update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id: retry_task.clone(),
            status: "retrying".to_string(),
            error: None,
            failure_type: None,
            failure_hint: None,
            model_run: None,
        })
        .expect("retry should not be capped by max_retries");
    let task = retried_again
        .tasks
        .iter()
        .find(|task| task.id == retry_task)
        .expect("retried task should exist");
    assert_eq!(task.retry_count, 2);
    assert_eq!(task.status, "retrying");
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
            generation_options_json: None,
        })
        .expect("create job");
    let task_id = snapshot.tasks[0].id.clone();

    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: task_id.clone(),
        status: "running".to_string(),
        error: None,
        failure_type: None,
        failure_hint: None,
        model_run: None,
    })
    .expect("mark running");

    let failed = repo
        .update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id,
            status: "failed".to_string(),
            error: Some("provider failed".to_string()),
            failure_type: Some("model".to_string()),
            failure_hint: Some("provider failed".to_string()),
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
    assert_eq!(failed.tasks[0].failure_type.as_deref(), Some("model"));
    assert_eq!(
        failed.tasks[0].failure_hint.as_deref(),
        Some("provider failed")
    );
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
            generation_options_json: None,
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
                ..Default::default()
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
            generation_options_json: None,
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
            ..Default::default()
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

    repo.delete_job(&snapshot.job.id).expect("soft delete job");
    let deleted_snapshot = repo
        .get_snapshot(&snapshot.job.id)
        .expect("deleted job snapshot should remain addressable");
    assert!(deleted_snapshot.job.deleted_at_ms.is_some());
    assert!(repo.list_jobs(10).expect("jobs after delete").is_empty());
    assert!(repo
        .list_recent_assets(10)
        .expect("assets after delete")
        .is_empty());
}

#[test]
fn image_workbench_reads_legacy_extended_windows_paths_as_displayable_paths() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "img2img".to_string(),
            prompt: "legacy paths".to_string(),
            negative_prompt: None,
            task_prompts: Vec::new(),
            quantity: 1,
            provider_config_id: None,
            model: None,
            size: None,
            reference_asset_ids_json: None,
            source_asset_id: None,
            source_image_path: Some(r"\\?\C:\mock\source.png".to_string()),
            mask_path: Some(r"\\?\C:\mock\mask.svg".to_string()),
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
            generation_options_json: None,
        })
        .expect("create job");
    let task_id = snapshot.tasks[0].id.clone();

    let recorded = repo
        .record_asset(
            NewImageWorkbenchAsset {
                task_id,
                file_path: r"\\?\C:\mock\asset.png".to_string(),
                thumbnail_path: Some(r"\\?\C:\mock\thumb.png".to_string()),
                ..Default::default()
            },
            Some(NewImageWorkbenchMetadata {
                mask_path: Some(r"\\?\C:\mock\mask.svg".to_string()),
                ..Default::default()
            }),
            None,
        )
        .expect("record asset");

    assert_eq!(
        recorded.job.source_image_path.as_deref(),
        Some(r"C:\mock\source.png")
    );
    assert_eq!(recorded.job.mask_path.as_deref(), Some(r"C:\mock\mask.svg"));
    assert_eq!(recorded.assets[0].file_path, r"C:\mock\asset.png");
    assert_eq!(
        recorded.assets[0].thumbnail_path.as_deref(),
        Some(r"C:\mock\thumb.png")
    );
    assert_eq!(
        recorded.metadata[0].mask_path.as_deref(),
        Some(r"C:\mock\mask.svg")
    );
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
            generation_options_json: None,
        })
        .expect("create job");
    let job_id = snapshot.job.id.clone();
    let failed_task = snapshot.tasks[0].id.clone();

    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: failed_task.clone(),
        status: "failed".to_string(),
        error: Some("provider failed".to_string()),
        failure_type: Some("unknown".to_string()),
        failure_hint: Some("provider failed".to_string()),
        model_run: None,
    })
    .expect("mark failed");

    let retrying = repo.retry_failed_tasks(&job_id).expect("retry failed task");
    assert!(retrying.tasks.iter().any(|task| task.status == "retrying"
        && task.retry_count == 1
        && task.failure_type.is_none()
        && task.failure_hint.is_none()));

    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: failed_task,
        status: "failed".to_string(),
        error: Some("provider failed again".to_string()),
        failure_type: Some("unknown".to_string()),
        failure_hint: Some("provider failed again".to_string()),
        model_run: None,
    })
    .expect("mark failed again");

    let retrying_again = repo
        .retry_failed_tasks(&job_id)
        .expect("retry should ignore legacy max_retries");
    assert!(retrying_again
        .tasks
        .iter()
        .any(|task| task.status == "retrying" && task.retry_count == 2));

    let cancelled = repo.cancel_job(&job_id).expect("cancel job");
    assert!(cancelled
        .tasks
        .iter()
        .all(|task| task.status == "cancelled" || task.status == "failed"));
    assert!(cancelled.tasks.iter().any(|task| task.status == "cancelled"
        && task.failure_type.as_deref() == Some("cancelled")
        && task.failure_hint.as_deref() == Some("用户取消")));
}

#[test]
fn image_workbench_retry_clears_job_finished_at() {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "重试清理完成时间".to_string(),
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

    let failed = repo
        .update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id,
            status: "failed".to_string(),
            error: Some("provider failed".to_string()),
            failure_type: Some("unknown".to_string()),
            failure_hint: Some("provider failed".to_string()),
            model_run: None,
        })
        .expect("mark failed");
    assert_eq!(failed.job.status, "failed");
    assert!(failed.job.finished_at_ms.is_some());

    let retrying = repo.retry_failed_tasks(&job_id).expect("retry failed task");
    assert_eq!(retrying.job.status, "running");
    assert!(
        retrying.job.finished_at_ms.is_none(),
        "retrying job should not keep stale finished_at_ms"
    );
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
            generation_options_json: None,
        })
        .expect("create job");
    let job_id = snapshot.job.id.clone();
    let running_task = snapshot.tasks[0].id.clone();

    repo.update_task_status(ImageWorkbenchTaskStatusPatch {
        task_id: running_task,
        status: "running".to_string(),
        error: None,
        failure_type: None,
        failure_hint: None,
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
            generation_options_json: None,
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
                ..Default::default()
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
            generation_options_json: None,
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
        .renew_image_task_lease(
            &task_id,
            "worker-A",
            "claim-tok-other",
            claimed_at + 120_000,
        )
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
            generation_options_json: None,
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
            generation_options_json: None,
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
            generation_options_json: None,
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
    assert_eq!(stuck.failure_type.as_deref(), Some("timeout"));
    assert_eq!(stuck.failure_hint.as_deref(), Some("worker_stuck"));
    assert_eq!(stuck.retry_count, 1, "retry_count should increment");
}

/// 建一个 quantity=1 的 job 并返回 (repo, job_id, task_id)，供资产组 / 版本链 / 评分测试复用。
fn seed_job_with_task() -> (ImageWorkbenchRepo, String, String) {
    let repo = test_repo();
    let snapshot = repo
        .create_job(NewImageWorkbenchJob {
            mode: "txt2img".to_string(),
            prompt: "资产组测试".to_string(),
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
    (repo, job_id, task_id)
}

#[test]
fn image_workbench_schema_migration_is_idempotent_and_backfills_columns() {
    // 同一个 db_path 反复初始化不应报错（connect() 内部每次都调 init schema）。
    let (repo, _job_id, _task_id) = seed_job_with_task();
    let snapshot = repo.get_snapshot(&_job_id).expect("snapshot");
    let task = &snapshot.tasks[0];
    // create_job 现在会建 group 并给 task 写 group_id/variant_index。
    assert!(task.group_id.is_some());
    assert_eq!(task.variant_index, Some(0));
    // 失败分类列本轮仍不写入，保持 None。
    assert_eq!(task.failure_type, None);
    assert_eq!(task.failure_hint, None);
    assert_eq!(snapshot.job.archived_at_ms, None);
    assert_eq!(snapshot.job.deleted_at_ms, None);
    // create_job 已建一个资产组。
    assert_eq!(repo.list_groups(&_job_id).expect("groups").len(), 1);
}

#[test]
fn image_workbench_create_and_list_groups_round_trip() {
    let (repo, job_id, _task_id) = seed_job_with_task();
    let group = repo
        .create_group(NewImageWorkbenchGroup {
            job_id: job_id.clone(),
            source_id: Some("iw-asset-src".to_string()),
            name: Some("雨夜森林".to_string()),
            r#type: Some("style_continuation".to_string()),
            agent_preset: Some("默认预设".to_string()),
            agent_ids_json: Some("[\"agent-1\"]".to_string()),
            base_prompt: Some("雨夜森林小屋".to_string()),
            count: 4,
        })
        .expect("create group");
    assert_eq!(group.name.as_deref(), Some("雨夜森林"));
    assert_eq!(group.r#type.as_deref(), Some("style_continuation"));
    assert_eq!(group.count, 4);

    // create_job 已自动建一个 group，这里再手动建一个 → 共 2 个，按 id 定位手建组。
    let groups = repo.list_groups(&job_id).expect("list groups");
    assert!(groups.iter().any(|g| g.id == group.id));

    let fetched = repo.get_group_by_id(&group.id).expect("get group");
    assert_eq!(fetched.base_prompt.as_deref(), Some("雨夜森林小屋"));
    assert_eq!(fetched.agent_ids_json.as_deref(), Some("[\"agent-1\"]"));

    // delete_job 现在是软删除：历史列表隐藏，但组关系保留给后续恢复/审计/文件清理使用。
    repo.delete_job(&job_id).expect("delete job");
    assert!(repo
        .get_snapshot(&job_id)
        .expect("snapshot")
        .job
        .deleted_at_ms
        .is_some());
    assert!(repo.get_group_by_id(&group.id).is_ok());
    assert!(repo
        .list_groups(&job_id)
        .expect("groups")
        .iter()
        .any(|g| g.id == group.id));
}

#[test]
fn image_workbench_tag_assets_group_reuses_manual_group_for_batch() {
    let (repo, job_id, task_id) = seed_job_with_task();
    let first = repo
        .record_asset(
            NewImageWorkbenchAsset {
                task_id: task_id.clone(),
                file_path: "C:/mock/manual-a.png".to_string(),
                ..Default::default()
            },
            None,
            None,
        )
        .expect("record first asset")
        .assets[0]
        .id
        .clone();
    let second = repo
        .record_asset(
            NewImageWorkbenchAsset {
                task_id,
                file_path: "C:/mock/manual-b.png".to_string(),
                ..Default::default()
            },
            None,
            None,
        )
        .expect("record second asset")
        .assets
        .into_iter()
        .find(|asset| asset.file_path.ends_with("manual-b.png"))
        .expect("second asset")
        .id;

    let result = repo
        .tag_assets_group(TagImageWorkbenchAssetsGroupInput {
            asset_ids: vec![first.clone(), second.clone()],
            group_id: None,
            group_name: Some("manual-group".to_string()),
        })
        .expect("tag selected assets");

    assert_eq!(result.tagged_assets, 2);
    assert_eq!(result.groups.len(), 1);
    let manual_group = &result.groups[0];
    assert_eq!(manual_group.name.as_deref(), Some("manual-group"));
    assert_eq!(manual_group.r#type.as_deref(), Some("manual"));
    assert_eq!(manual_group.count, 2);
    assert_eq!(
        repo.get_asset_by_id(&first)
            .expect("first asset")
            .group_id
            .as_deref(),
        Some(manual_group.id.as_str())
    );
    assert_eq!(
        repo.get_asset_by_id(&second)
            .expect("second asset")
            .group_id
            .as_deref(),
        Some(manual_group.id.as_str())
    );

    let manual_groups = repo
        .list_groups(&job_id)
        .expect("groups")
        .into_iter()
        .filter(|group| group.r#type.as_deref() == Some("manual") && group.name.as_deref() == Some("manual-group"))
        .collect::<Vec<_>>();
    assert_eq!(manual_groups.len(), 1);
}

#[test]
fn image_workbench_record_asset_persists_group_rating_and_version_chain() {
    let (repo, _job_id, task_id) = seed_job_with_task();
    let snapshot = repo
        .record_asset(
            NewImageWorkbenchAsset {
                task_id,
                file_path: "C:/mock/versioned.png".to_string(),
                thumbnail_path: None,
                width: Some(768),
                height: Some(768),
                mime_type: Some("image/png".to_string()),
                size_bytes: Some(4096),
                group_id: Some("iw-group-1".to_string()),
                rating: Some(4),
                parent_asset_id: Some("iw-asset-parent".to_string()),
                root_asset_id: Some("iw-asset-root".to_string()),
                version_index: Some(2),
                import_fingerprint: None,
                import_source_path: None,
            },
            None,
            None,
        )
        .expect("record asset");
    let asset_id = snapshot.assets[0].id.clone();

    let fetched = repo.get_asset_by_id(&asset_id).expect("get asset");
    assert_eq!(fetched.group_id.as_deref(), Some("iw-group-1"));
    assert_eq!(fetched.rating, Some(4));
    assert_eq!(fetched.parent_asset_id.as_deref(), Some("iw-asset-parent"));
    assert_eq!(fetched.root_asset_id.as_deref(), Some("iw-asset-root"));
    assert_eq!(fetched.version_index, Some(2));
    assert_eq!(fetched.delivery_status, None);
    assert_eq!(fetched.integrity_status, "ok");
    assert_eq!(fetched.integrity_error, None);
    assert!(fetched.integrity_checked_at_ms.is_some());
    // favorite 默认仍为 false，与 rating 并存互不影响。
    assert!(!fetched.favorite);
}

#[test]
fn image_workbench_asset_integrity_can_be_updated() {
    let (repo, _job_id, task_id) = seed_job_with_task();
    let snapshot = repo
        .record_asset(
            NewImageWorkbenchAsset {
                task_id,
                file_path: "C:/mock/missing.png".to_string(),
                ..Default::default()
            },
            None,
            None,
        )
        .expect("record asset");
    let asset_id = snapshot.assets[0].id.clone();

    repo.update_asset_integrity_many(&[(
        asset_id.clone(),
        "missing".to_string(),
        Some("资产文件不存在".to_string()),
        42,
    )])
    .expect("integrity should update");

    let fetched = repo.get_asset_by_id(&asset_id).expect("get asset");
    assert_eq!(fetched.integrity_status, "missing");
    assert_eq!(fetched.integrity_error.as_deref(), Some("资产文件不存在"));
    assert_eq!(fetched.integrity_checked_at_ms, Some(42));
}

#[test]
fn image_workbench_delete_invalid_assets_removes_records() {
    let (repo, _job_id, task_id) = seed_job_with_task();
    let missing = repo
        .record_asset(
            NewImageWorkbenchAsset {
                task_id: task_id.clone(),
                file_path: "C:/mock/missing.png".to_string(),
                ..Default::default()
            },
            None,
            None,
        )
        .expect("record missing")
        .assets[0]
        .id
        .clone();
    let corrupt = repo
        .record_asset(
            NewImageWorkbenchAsset {
                task_id,
                file_path: "C:/mock/corrupt.png".to_string(),
                ..Default::default()
            },
            None,
            None,
        )
        .expect("record corrupt")
        .assets
        .last()
        .expect("corrupt asset")
        .id
        .clone();

    repo.update_asset_integrity_many(&[
        (
            missing.clone(),
            "missing".to_string(),
            Some("不存在".to_string()),
            1,
        ),
        (
            corrupt.clone(),
            "corrupt".to_string(),
            Some("损坏".to_string()),
            1,
        ),
    ])
    .expect("mark invalid");

    let removed = repo
        .delete_invalid_assets_by_ids(&[missing.clone(), corrupt.clone()])
        .expect("delete invalid");
    assert_eq!(removed, 2);
    assert!(repo.get_asset_by_id(&missing).is_err());
    assert!(repo.get_asset_by_id(&corrupt).is_err());
}

#[test]
fn image_workbench_set_asset_rating_coexists_with_favorite() {
    let (repo, _job_id, task_id) = seed_job_with_task();
    let snapshot = repo
        .record_asset(
            NewImageWorkbenchAsset {
                task_id,
                file_path: "C:/mock/rating.png".to_string(),
                ..Default::default()
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

    let rated = repo
        .set_asset_rating(&asset_id, Some(5))
        .expect("rate asset");
    assert_eq!(rated.assets[0].rating, Some(5));
    // 评分后收藏标志不应被改写。
    assert!(rated.assets[0].favorite);

    let cleared = repo
        .set_asset_rating(&asset_id, None)
        .expect("clear rating");
    assert_eq!(cleared.assets[0].rating, None);
    assert!(cleared.assets[0].favorite);
}

#[test]
fn image_workbench_set_asset_quality_issues_persists_and_clears() {
    let (repo, _job_id, task_id) = seed_job_with_task();
    let snapshot = repo
        .record_asset(
            NewImageWorkbenchAsset {
                task_id,
                file_path: "C:/mock/quality.png".to_string(),
                ..Default::default()
            },
            None,
            None,
        )
        .expect("record asset");
    let asset_id = snapshot.assets[0].id.clone();
    assert!(snapshot.assets[0].quality_issues.is_empty());

    let tagged = repo
        .set_asset_quality_issues(&asset_id, &["hands".to_string(), "scene".to_string()])
        .expect("set quality issues");
    let tagged_asset = tagged
        .assets
        .iter()
        .find(|asset| asset.id == asset_id)
        .expect("tagged asset");
    assert_eq!(tagged_asset.quality_issues, vec!["hands", "scene"]);

    let fetched = repo.get_asset_by_id(&asset_id).expect("get tagged asset");
    assert_eq!(fetched.quality_issues, vec!["hands", "scene"]);

    let cleared = repo
        .set_asset_quality_issues(&asset_id, &[])
        .expect("clear quality issues");
    let cleared_asset = cleared
        .assets
        .iter()
        .find(|asset| asset.id == asset_id)
        .expect("cleared asset");
    assert!(cleared_asset.quality_issues.is_empty());
}

#[test]
fn image_workbench_query_assets_filters_paginates_and_sorts() {
    let (repo, _job_id, task_id) = seed_job_with_task();
    // 录入 3 张资产：A(group-1, rating 5)、B(group-1, rating 2)、C(group-2, 无评分)。
    let record = |path: &str, group: &str, rating: Option<u32>| {
        repo.record_asset(
            NewImageWorkbenchAsset {
                task_id: task_id.clone(),
                file_path: path.to_string(),
                group_id: Some(group.to_string()),
                rating,
                ..Default::default()
            },
            None,
            None,
        )
        .expect("record asset");
    };
    record("C:/mock/a.png", "group-1", Some(5));
    record("C:/mock/b.png", "group-1", Some(2));
    record("C:/mock/c.png", "group-2", None);

    // 按 group_id 筛选。
    let group1 = repo
        .query_assets(ImageWorkbenchAssetQuery {
            group_id: Some("group-1".to_string()),
            ..Default::default()
        })
        .expect("query group-1");
    assert_eq!(group1.len(), 2);
    assert!(group1
        .iter()
        .all(|a| a.group_id.as_deref() == Some("group-1")));

    // 按 min_rating 筛选（排除无评分与低评分）。
    let high = repo
        .query_assets(ImageWorkbenchAssetQuery {
            min_rating: Some(3),
            ..Default::default()
        })
        .expect("query min_rating");
    assert_eq!(high.len(), 1);
    assert_eq!(high[0].rating, Some(5));

    // RatingDesc 排序：评分高者在前。
    let by_rating = repo
        .query_assets(ImageWorkbenchAssetQuery {
            group_id: Some("group-1".to_string()),
            sort: ImageWorkbenchAssetSort::RatingDesc,
            ..Default::default()
        })
        .expect("query rating desc");
    assert_eq!(by_rating[0].rating, Some(5));
    assert_eq!(by_rating[1].rating, Some(2));

    // 分页：limit=1 + offset=1 取第二条。
    let page = repo
        .query_assets(ImageWorkbenchAssetQuery {
            group_id: Some("group-1".to_string()),
            sort: ImageWorkbenchAssetSort::RatingDesc,
            limit: 1,
            offset: 1,
            ..Default::default()
        })
        .expect("query page");
    assert_eq!(page.len(), 1);
    assert_eq!(page[0].rating, Some(2));

    // 默认查询（FavoriteThenRecent）覆盖全部 3 条，等价于历史 list_recent_assets。
    let all = repo.list_recent_assets(50).expect("list recent");
    assert_eq!(all.len(), 3);
}

/// 建一个指定 mode / source_asset_id / quantity 的 job，返回快照。
fn create_job_with(
    repo: &ImageWorkbenchRepo,
    mode: &str,
    prompt: &str,
    quantity: u32,
    source_asset_id: Option<String>,
) -> ImageWorkbenchSnapshot {
    repo.create_job(NewImageWorkbenchJob {
        mode: mode.to_string(),
        prompt: prompt.to_string(),
        negative_prompt: None,
        task_prompts: Vec::new(),
        quantity,
        provider_config_id: None,
        model: None,
        size: None,
        reference_asset_ids_json: None,
        source_asset_id,
        source_image_path: None,
        mask_path: None,
        person_context_json: None,
        upscale_scale: None,
        fallback_policy: None,
        generation_options_json: None,
    })
    .expect("create job")
}

/// 在指定 task 上录入一张资产，返回 asset id。
fn record_asset_on(repo: &ImageWorkbenchRepo, task_id: &str, file_path: &str) -> String {
    let snapshot = repo
        .record_asset(
            NewImageWorkbenchAsset {
                task_id: task_id.to_string(),
                file_path: file_path.to_string(),
                ..Default::default()
            },
            None,
            None,
        )
        .expect("record asset");
    snapshot
        .assets
        .iter()
        .find(|asset| asset.task_id == task_id)
        .expect("recorded asset present")
        .id
        .clone()
}

#[test]
fn image_workbench_create_job_builds_group_and_tags_variants() {
    let repo = test_repo();
    let snapshot = create_job_with(&repo, "txt2img", "雨夜森林", 3, None);
    let job_id = snapshot.job.id.clone();

    // 一 job 一 group：恰好一个组，count=quantity，全新生成 type=fresh。
    let groups = repo.list_groups(&job_id).expect("list groups");
    assert_eq!(groups.len(), 1);
    assert_eq!(groups[0].count, 3);
    assert_eq!(groups[0].r#type.as_deref(), Some("fresh"));
    assert_eq!(groups[0].source_id, None);
    assert_eq!(groups[0].base_prompt.as_deref(), Some("雨夜森林"));

    // N 个 task 全挂同一 group，variant_index = 0..N。
    let group_id = groups[0].id.clone();
    assert!(snapshot
        .tasks
        .iter()
        .all(|task| task.group_id.as_deref() == Some(group_id.as_str())));
    let mut variants: Vec<u32> = snapshot
        .tasks
        .iter()
        .map(|task| task.variant_index.expect("variant index"))
        .collect();
    variants.sort_unstable();
    assert_eq!(variants, vec![0, 1, 2]);
}

#[test]
fn image_workbench_rerun_job_group_marks_source() {
    let repo = test_repo();
    let snapshot = create_job_with(
        &repo,
        "img2img",
        "继续风格",
        1,
        Some("iw-asset-source".to_string()),
    );
    let groups = repo.list_groups(&snapshot.job.id).expect("list groups");
    assert_eq!(groups.len(), 1);
    // 带 source_asset_id 视为复跑：type=rerun，source_id 落库。
    assert_eq!(groups[0].r#type.as_deref(), Some("rerun"));
    assert_eq!(groups[0].source_id.as_deref(), Some("iw-asset-source"));
}

#[test]
fn image_workbench_fresh_job_asset_has_no_version_chain() {
    let repo = test_repo();
    let snapshot = create_job_with(&repo, "txt2img", "全新生成", 1, None);
    let task_id = snapshot.tasks[0].id.clone();
    let group_id = snapshot.tasks[0].group_id.clone();
    let asset_id = record_asset_on(&repo, &task_id, "C:/mock/fresh.png");

    let asset = repo.get_asset_by_id(&asset_id).expect("get asset");
    // 全新 job：无父 / 无链根 / 无版本号，但跟随 task 的 group。
    assert_eq!(asset.parent_asset_id, None);
    assert_eq!(asset.root_asset_id, None);
    assert_eq!(asset.version_index, None);
    assert_eq!(asset.group_id, group_id);
}

#[test]
fn image_workbench_rerun_chain_derives_parent_root_and_version() {
    let repo = test_repo();

    // α：全新 job 的资产，作为链根。
    let job_a = create_job_with(&repo, "txt2img", "初版", 1, None);
    let alpha = record_asset_on(&repo, &job_a.tasks[0].id, "C:/mock/alpha.png");

    // β：以 α 为源复跑 → parent=α, root=α, version=1。
    let job_b = create_job_with(&repo, "img2img", "复跑一", 1, Some(alpha.clone()));
    let beta = record_asset_on(&repo, &job_b.tasks[0].id, "C:/mock/beta.png");
    let beta_asset = repo.get_asset_by_id(&beta).expect("get beta");
    assert_eq!(beta_asset.parent_asset_id.as_deref(), Some(alpha.as_str()));
    assert_eq!(beta_asset.root_asset_id.as_deref(), Some(alpha.as_str()));
    assert_eq!(beta_asset.version_index, Some(1));

    // γ：以 β 为源复跑 → parent=β, root 收敛到 α, version=2。
    let job_c = create_job_with(&repo, "img2img", "复跑二", 1, Some(beta.clone()));
    let gamma = record_asset_on(&repo, &job_c.tasks[0].id, "C:/mock/gamma.png");
    let gamma_asset = repo.get_asset_by_id(&gamma).expect("get gamma");
    assert_eq!(gamma_asset.parent_asset_id.as_deref(), Some(beta.as_str()));
    assert_eq!(
        gamma_asset.root_asset_id.as_deref(),
        Some(alpha.as_str()),
        "链根应稳定收敛到 α"
    );
    assert_eq!(gamma_asset.version_index, Some(2));
}

#[test]
fn image_workbench_delivery_status_tracks_favorite_leaf() {
    let repo = test_repo();

    let job_a = create_job_with(&repo, "txt2img", "初版", 1, None);
    let alpha = record_asset_on(&repo, &job_a.tasks[0].id, "C:/mock/alpha.png");
    repo.set_asset_favorite(&alpha, true)
        .expect("favorite root asset");
    let alpha_asset = repo.get_asset_by_id(&alpha).expect("get alpha");
    assert_eq!(alpha_asset.delivery_status, None);

    let job_b = create_job_with(&repo, "img2img", "复跑一", 1, Some(alpha.clone()));
    let beta = record_asset_on(&repo, &job_b.tasks[0].id, "C:/mock/beta.png");
    repo.set_asset_favorite(&beta, true)
        .expect("favorite leaf asset");
    let beta_asset = repo.get_asset_by_id(&beta).expect("get beta");
    assert_eq!(beta_asset.delivery_status.as_deref(), Some("ready"));

    let job_c = create_job_with(&repo, "img2img", "复跑二", 1, Some(beta.clone()));
    let gamma = record_asset_on(&repo, &job_c.tasks[0].id, "C:/mock/gamma.png");
    let beta_after_branch = repo.get_asset_by_id(&beta).expect("get beta after branch");
    assert_eq!(beta_after_branch.delivery_status, None);

    repo.set_asset_favorite(&gamma, true)
        .expect("favorite new leaf asset");
    let gamma_asset = repo.get_asset_by_id(&gamma).expect("get gamma");
    assert_eq!(gamma_asset.delivery_status.as_deref(), Some("ready"));

    repo.set_asset_favorite(&gamma, false)
        .expect("unfavorite new leaf asset");
    let gamma_after_clear = repo.get_asset_by_id(&gamma).expect("get gamma after clear");
    assert_eq!(gamma_after_clear.delivery_status, None);
}
