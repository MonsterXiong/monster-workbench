use crate::infra::image_workbench_prompt::{
    build_image_workbench_task_prompt, ImageWorkbenchPromptBuildContext,
};
use crate::infra::image_workbench_query;
use crate::infra::image_workbench_row_mapper::{collect_rows, map_job, map_template};
use crate::infra::image_workbench_schema::init_image_workbench_schema;
use crate::infra::image_workbench_task_transition::{
    is_claimable_task, is_job_terminal_status, is_terminal_status, validate_task_status_transition,
};
use crate::infra::{AppError, AppResult};
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

static ID_SEQUENCE: AtomicU64 = AtomicU64::new(1);

#[path = "image_workbench_repo_cleanup.rs"]
mod image_workbench_repo_cleanup;
#[path = "image_workbench_repo_runtime.rs"]
mod image_workbench_repo_runtime;
#[path = "image_workbench_repo_storyboard.rs"]
mod image_workbench_repo_storyboard;

use self::image_workbench_repo_storyboard::{
    build_storyboard_replan_agent_ids_json, build_storyboard_replan_base_prompt,
    build_storyboard_replan_task_prompt, resolve_task_groups_for_job,
};

use crate::infra::image_workbench_types::{
    ImageWorkbenchAsset, ImageWorkbenchAssetQuery, ImageWorkbenchGroup, ImageWorkbenchJob,
    ImageWorkbenchSnapshot, ImageWorkbenchTask, ImageWorkbenchTaskClaim,
    ImageWorkbenchTaskStatusPatch, ImageWorkbenchTemplate, NewImageWorkbenchAsset,
    NewImageWorkbenchGroup, NewImageWorkbenchJob, NewImageWorkbenchMetadata,
    NewImageWorkbenchModelRun, NewImageWorkbenchTemplate,
    ReplanImageWorkbenchStoryboardGroupInput,
    TagImageWorkbenchAssetsGroupInput, TagImageWorkbenchAssetsGroupResult,
};
use std::collections::HashMap;

pub struct ImageWorkbenchRepo {
    db_path: PathBuf,
}

fn truncate_chars(value: &str, max_chars: usize) -> String {
    value.trim().chars().take(max_chars).collect::<String>()
}

impl ImageWorkbenchRepo {
    pub fn new(db_path: PathBuf) -> Self {
        Self { db_path }
    }

    fn connect(&self) -> AppResult<Connection> {
        init_image_workbench_schema(&self.db_path)?;
        let conn = Connection::open(&self.db_path)?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA busy_timeout = 5000;
             PRAGMA foreign_keys = ON;",
        )?;
        Ok(conn)
    }

    pub fn create_job(&self, input: NewImageWorkbenchJob) -> AppResult<ImageWorkbenchSnapshot> {
        let mut conn = self.connect()?;
        let now = now_ms();
        let job_id = next_id("iw-job");

        let tx = conn.transaction()?;
        tx.execute(
            "INSERT INTO image_workbench_jobs
                (id, mode, status, prompt, negative_prompt, quantity, provider_config_id, model, size,
                 reference_asset_ids_json, source_asset_id, source_image_path, mask_path, person_context_json,
                 upscale_scale, fallback_policy, generation_options_json, created_at_ms, updated_at_ms, queued_at_ms)
             VALUES (?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                job_id,
                input.mode,
                input.prompt,
                input.negative_prompt,
                input.quantity as i64,
                input.provider_config_id,
                input.model,
                input.size,
                input.reference_asset_ids_json,
                input.source_asset_id,
                input.source_image_path,
                input.mask_path,
                input.person_context_json,
                input.upscale_scale.map(|value| value as i64),
                input.fallback_policy,
                input.generation_options_json,
                now,
                now,
                now
            ],
        )?;

        let task_groups = resolve_task_groups_for_job(&input, &job_id);
        for group in task_groups.groups.iter() {
            tx.execute(
                "INSERT INTO image_workbench_groups
                    (id, job_id, source_id, name, type, agent_preset, agent_ids_json, base_prompt,
                     count, created_at_ms, updated_at_ms)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    group.id.as_str(),
                    job_id.as_str(),
                    group.source_id.as_deref(),
                    group.name.as_deref(),
                    group.r#type.as_str(),
                    group.agent_preset.as_deref(),
                    group.agent_ids_json.as_deref(),
                    group.base_prompt.as_str(),
                    group.count as i64,
                    now,
                    now
                ],
            )?;
        }

        let reference_count = count_reference_assets(input.reference_asset_ids_json.as_deref());
        let prompt_context = ImageWorkbenchPromptBuildContext {
            mode: input.mode.as_str(),
            reference_count,
            has_source: input.source_asset_id.is_some() || input.source_image_path.is_some(),
            person_context_json: input.person_context_json.as_deref(),
        };

        for index in 0..input.quantity {
            let task_prompt = input
                .task_prompts
                .get(index as usize)
                .cloned()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| {
                    build_image_workbench_task_prompt(&input.prompt, index, &prompt_context)
                });
            tx.execute(
                "INSERT INTO image_workbench_tasks
                    (id, job_id, queue_index, status, retry_count, max_retries, prompt, created_at_ms, updated_at_ms,
                     group_id, variant_index)
                 VALUES (?, ?, ?, 'queued', 0, 1, ?, ?, ?, ?, ?)",
                params![
                    next_id("iw-task"),
                    job_id,
                    index as i64,
                    task_prompt,
                    now,
                    now,
                    task_groups.task_group_id(index),
                    task_groups.task_variant_index(index) as i64
                ],
            )?;
        }

        tx.commit()?;
        self.get_snapshot(&job_id)
    }

    pub fn get_snapshot(&self, job_id: &str) -> AppResult<ImageWorkbenchSnapshot> {
        let conn = self.connect()?;
        let job = image_workbench_query::get_job(&conn, job_id)?;
        let tasks = image_workbench_query::list_tasks(&conn, job_id)?;
        let assets = image_workbench_query::list_assets(&conn, job_id)?;
        let metadata = image_workbench_query::list_metadata(&conn, job_id)?;
        let model_runs = image_workbench_query::list_model_runs(&conn, job_id)?;
        Ok(ImageWorkbenchSnapshot {
            job,
            tasks,
            assets,
            metadata,
            model_runs,
        })
    }

    pub fn list_jobs(&self, limit: u32) -> AppResult<Vec<ImageWorkbenchJob>> {
        let conn = self.connect()?;
        let limit = limit.clamp(1, 100) as i64;
        let mut stmt = conn.prepare(
            "SELECT id, mode, status, prompt, negative_prompt, quantity, provider_config_id, model, size,
                    reference_asset_ids_json, source_asset_id, source_image_path, mask_path, person_context_json,
                    upscale_scale, fallback_policy, generation_options_json, created_at_ms, updated_at_ms, queued_at_ms,
                    started_at_ms, finished_at_ms, error, archived_at_ms, deleted_at_ms
             FROM image_workbench_jobs
             WHERE archived_at_ms IS NULL
               AND deleted_at_ms IS NULL
             ORDER BY updated_at_ms DESC, created_at_ms DESC
             LIMIT ?",
        )?;
        let rows = stmt.query_map(params![limit], map_job)?;
        collect_rows(rows)
    }

    pub fn list_recent_assets(&self, limit: u32) -> AppResult<Vec<ImageWorkbenchAsset>> {
        self.query_assets(ImageWorkbenchAssetQuery {
            limit,
            ..Default::default()
        })
    }

    pub fn list_deleted_job_assets(&self, limit: u32) -> AppResult<Vec<ImageWorkbenchAsset>> {
        let conn = self.connect()?;
        image_workbench_query::list_deleted_job_assets(&conn, limit)
    }

    /// 跨作业资产库查询：支持 group_id / min_rating 筛选、分页与排序。
    /// 默认条件等价于历史 `list_recent_assets`。command 层本轮仍只暴露 limit。
    pub fn query_assets(
        &self,
        query: ImageWorkbenchAssetQuery,
    ) -> AppResult<Vec<ImageWorkbenchAsset>> {
        let conn = self.connect()?;
        image_workbench_query::query_assets(&conn, &query)
    }

    pub fn get_asset_by_id(&self, asset_id: &str) -> AppResult<ImageWorkbenchAsset> {
        let conn = self.connect()?;
        image_workbench_query::get_asset(&conn, asset_id)
    }

    pub fn get_task_by_id(&self, task_id: &str) -> AppResult<ImageWorkbenchTask> {
        let conn = self.connect()?;
        image_workbench_query::get_task(&conn, task_id)
    }

    pub fn get_asset_by_import_fingerprint(
        &self,
        fingerprint: &str,
    ) -> AppResult<Option<ImageWorkbenchAsset>> {
        let conn = self.connect()?;
        image_workbench_query::get_asset_by_import_fingerprint(&conn, fingerprint)
    }

    pub fn update_asset_integrity_many(
        &self,
        patches: &[(String, String, Option<String>, i64)],
    ) -> AppResult<()> {
        if patches.is_empty() {
            return Ok(());
        }
        let mut conn = self.connect()?;
        let tx = conn.transaction()?;
        for (asset_id, status, error, checked_at_ms) in patches {
            tx.execute(
                "UPDATE image_workbench_assets
                 SET integrity_status = ?,
                     integrity_error = ?,
                     integrity_checked_at_ms = ?
                 WHERE id = ?",
                params![status, error, checked_at_ms, asset_id],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn delete_job(&self, job_id: &str) -> AppResult<()> {
        let mut conn = self.connect()?;
        let job = image_workbench_query::get_job(&conn, job_id)?;
        if job.deleted_at_ms.is_some() {
            return Ok(());
        }
        let now = now_ms();
        let tx = conn.transaction()?;
        tx.execute(
            "UPDATE image_workbench_jobs
             SET deleted_at_ms = COALESCE(deleted_at_ms, ?),
                 updated_at_ms = ?
             WHERE id = ?",
            params![now, now, job_id],
        )?;
        tx.execute(
            "UPDATE image_workbench_tasks
             SET status = 'cancelled',
                 error = COALESCE(error, '作业已删除'),
                 failure_type = 'cancelled',
                 failure_hint = '作业已删除',
                 claim_token = NULL,
                 leased_until_ms = NULL,
                 finished_at_ms = COALESCE(finished_at_ms, ?),
                 updated_at_ms = ?
             WHERE job_id = ?
               AND status IN ('queued', 'running', 'validating', 'retrying')",
            params![now, now, job_id],
        )?;
        tx.commit()?;
        Ok(())
    }

    pub fn remove_job_from_queue(&self, job_id: &str) -> AppResult<()> {
        let mut conn = self.connect()?;
        let job = image_workbench_query::get_job(&conn, job_id)?;
        if job.deleted_at_ms.is_some() || job.archived_at_ms.is_some() {
            return Ok(());
        }
        let now = now_ms();
        let tx = conn.transaction()?;
        tx.execute(
            "UPDATE image_workbench_jobs
             SET archived_at_ms = COALESCE(archived_at_ms, ?),
                 updated_at_ms = ?
             WHERE id = ?",
            params![now, now, job_id],
        )?;
        tx.execute(
            "UPDATE image_workbench_tasks
             SET status = 'cancelled',
                 error = COALESCE(error, 'job removed from queue'),
                 failure_type = 'cancelled',
                 failure_hint = 'job removed from queue',
                 claim_token = NULL,
                 leased_until_ms = NULL,
                 finished_at_ms = COALESCE(finished_at_ms, ?),
                 updated_at_ms = ?
             WHERE job_id = ?
               AND status IN ('queued', 'running', 'validating', 'retrying')",
            params![now, now, job_id],
        )?;
        tx.commit()?;
        Ok(())
    }

    pub fn delete_assets_by_ids(&self, asset_ids: &[String]) -> AppResult<u32> {
        if asset_ids.is_empty() {
            return Ok(0);
        }

        let mut conn = self.connect()?;
        let mut assets = Vec::new();
        for asset_id in asset_ids {
            if let Ok(asset) = image_workbench_query::get_asset(&conn, asset_id) {
                assets.push(asset);
            }
        }
        if assets.is_empty() {
            return Ok(0);
        }

        let now = now_ms();
        let tx = conn.transaction()?;
        for asset in &assets {
            tx.execute(
                "UPDATE image_workbench_assets
                 SET parent_asset_id = NULL,
                     root_asset_id = NULL,
                     delivery_status = NULL
                 WHERE parent_asset_id = ?
                    OR root_asset_id = ?",
                params![asset.id, asset.id],
            )?;
        }
        for asset in &assets {
            tx.execute(
                "DELETE FROM image_workbench_assets WHERE id = ?",
                params![asset.id],
            )?;
            tx.execute(
                "UPDATE image_workbench_jobs
                 SET updated_at_ms = ?
                 WHERE id = ?",
                params![now, asset.job_id],
            )?;
            if let Some(parent_asset_id) = &asset.parent_asset_id {
                refresh_asset_delivery_status(&tx, parent_asset_id)?;
            }
        }
        tx.commit()?;
        Ok(assets.len() as u32)
    }

    #[allow(dead_code)]
    pub fn set_job_archived(&self, job_id: &str, archived: bool) -> AppResult<()> {
        let conn = self.connect()?;
        let job = image_workbench_query::get_job(&conn, job_id)?;
        if job.deleted_at_ms.is_some() {
            return Err(AppError::Config(
                "已删除的图片工作台作业不能归档或取消归档".to_string(),
            ));
        }
        let now = now_ms();
        conn.execute(
            "UPDATE image_workbench_jobs
             SET archived_at_ms = ?,
                 updated_at_ms = ?
             WHERE id = ?",
            params![if archived { Some(now) } else { None }, now, job_id],
        )?;
        Ok(())
    }

    pub fn cancel_job(&self, job_id: &str) -> AppResult<ImageWorkbenchSnapshot> {
        let conn = self.connect()?;
        let now = now_ms();
        image_workbench_query::get_job(&conn, job_id)?;
        conn.execute(
            "UPDATE image_workbench_tasks
             SET status = 'cancelled',
                 error = COALESCE(error, '用户取消'),
                 failure_type = 'cancelled',
                 failure_hint = '用户取消',
                 claim_token = NULL,
                 leased_until_ms = NULL,
                 finished_at_ms = COALESCE(finished_at_ms, ?),
                 updated_at_ms = ?
             WHERE job_id = ?
               AND status IN ('queued', 'running', 'validating', 'retrying')",
            params![now, now, job_id],
        )?;
        self.recalculate_job_status(&conn, job_id, now)?;
        self.get_snapshot(job_id)
    }

    pub fn record_model_run(
        &self,
        job_id: &str,
        task_id: Option<&str>,
        model_run: NewImageWorkbenchModelRun,
    ) -> AppResult<()> {
        let conn = self.connect()?;
        image_workbench_query::get_job(&conn, job_id)?;
        if let Some(task_id) = task_id {
            let task = image_workbench_query::get_task(&conn, task_id)?;
            if task.job_id != job_id {
                return Err(AppError::Database(format!(
                    "图片工作台任务不属于作业: {}",
                    task_id
                )));
            }
        }
        self.insert_model_run(&conn, job_id, task_id, model_run, now_ms())
    }

    pub fn retry_failed_tasks(&self, job_id: &str) -> AppResult<ImageWorkbenchSnapshot> {
        let conn = self.connect()?;
        let now = now_ms();
        image_workbench_query::get_job(&conn, job_id)?;
        let tasks = image_workbench_query::list_tasks(&conn, job_id)?;
        let mut updated = 0;
        for task in tasks.iter().filter(|task| task.status == "failed") {
            conn.execute(
                "UPDATE image_workbench_tasks
                 SET status = 'retrying',
                     error = NULL,
                     failure_type = NULL,
                     failure_hint = NULL,
                     claim_token = NULL,
                     leased_until_ms = NULL,
                     retry_count = retry_count + 1,
                     finished_at_ms = NULL,
                     updated_at_ms = ?
                 WHERE id = ?",
                params![now, task.id],
            )?;
            updated += 1;
        }
        if updated == 0 {
            return Err(AppError::Config("没有可重试的图片工作台任务".to_string()));
        }
        self.recalculate_job_status(&conn, job_id, now)?;
        self.get_snapshot(job_id)
    }

    pub fn replan_storyboard_group(
        &self,
        input: ReplanImageWorkbenchStoryboardGroupInput,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let mut conn = self.connect()?;
        let now = now_ms();
        let job_id = {
            let tx = conn.transaction()?;
            let group = image_workbench_query::get_group(&tx, &input.group_id)?;
            let job = image_workbench_query::get_job(&tx, &group.job_id)?;
            if job.deleted_at_ms.is_some() || job.archived_at_ms.is_some() {
                return Err(AppError::Config(
                    "图片工作台作业已移除，不能重新规划分镜".to_string(),
                ));
            }
            let is_storyboard_group = group.r#type.as_deref() == Some("storyboard")
                || group.agent_preset.as_deref() == Some("storyboard");
            if !is_storyboard_group {
                return Err(AppError::Config("只能重新规划分镜任务组".to_string()));
            }

            let tasks = image_workbench_query::list_tasks(&tx, &job.id)?;
            let source_tasks = tasks
                .iter()
                .filter(|task| task.group_id.as_deref() == Some(group.id.as_str()))
                .collect::<Vec<_>>();
            let fallback_count = if group.count > 0 {
                group.count
            } else if !source_tasks.is_empty() {
                source_tasks.len() as u32
            } else {
                4
            };
            let variants = input
                .variants_per_scene
                .unwrap_or(fallback_count)
                .clamp(1, 8);
            let next_quantity = job.quantity.checked_add(variants).ok_or_else(|| {
                AppError::Config("图片工作台任务数量过大，无法继续追加分镜".to_string())
            })?;
            let next_queue_index = tasks
                .iter()
                .map(|task| task.queue_index)
                .max()
                .map(|index| index.saturating_add(1))
                .unwrap_or(0);
            let source_base_prompt = group
                .base_prompt
                .clone()
                .filter(|value| !value.trim().is_empty())
                .or_else(|| source_tasks.first().and_then(|task| task.prompt.clone()))
                .unwrap_or_else(|| job.prompt.clone());
            let replan_batch_id = next_id("iw-replan");
            let replan_group_id = next_id("iw-group");
            let replan_base_prompt = build_storyboard_replan_base_prompt(
                &source_base_prompt,
                group.name.as_deref(),
                &replan_batch_id,
            );
            let source_id_base = group.source_id.as_deref().unwrap_or(group.id.as_str());
            let group_name = group
                .name
                .clone()
                .map(|name| format!("{} · 重新规划", name))
                .or_else(|| Some("分镜 · 重新规划".to_string()));
            let agent_ids_json = build_storyboard_replan_agent_ids_json(
                group.agent_ids_json.as_deref(),
                &group.id,
                &replan_batch_id,
                now,
            );

            tx.execute(
                "INSERT INTO image_workbench_groups
                    (id, job_id, source_id, name, type, agent_preset, agent_ids_json, base_prompt,
                     count, created_at_ms, updated_at_ms)
                 VALUES (?, ?, ?, ?, 'storyboard', 'storyboard', ?, ?, ?, ?, ?)",
                params![
                    replan_group_id.as_str(),
                    job.id.as_str(),
                    format!("{}-replan-{}", source_id_base, replan_batch_id),
                    group_name.as_deref(),
                    agent_ids_json.as_deref(),
                    replan_base_prompt.as_str(),
                    variants as i64,
                    now,
                    now
                ],
            )?;

            for offset in 0..variants {
                let task_prompt =
                    build_storyboard_replan_task_prompt(&replan_base_prompt, offset + 1, variants);
                tx.execute(
                    "INSERT INTO image_workbench_tasks
                        (id, job_id, queue_index, status, retry_count, max_retries, prompt,
                         created_at_ms, updated_at_ms, group_id, variant_index)
                     VALUES (?, ?, ?, 'queued', 0, 1, ?, ?, ?, ?, ?)",
                    params![
                        next_id("iw-task"),
                        job.id.as_str(),
                        next_queue_index.saturating_add(offset) as i64,
                        task_prompt,
                        now,
                        now,
                        replan_group_id.as_str(),
                        offset as i64
                    ],
                )?;
            }

            tx.execute(
                "UPDATE image_workbench_jobs
                 SET quantity = ?,
                     queued_at_ms = COALESCE(queued_at_ms, ?),
                     finished_at_ms = NULL,
                     updated_at_ms = ?
                 WHERE id = ?",
                params![next_quantity as i64, now, now, job.id.as_str()],
            )?;
            tx.commit()?;
            job.id
        };
        self.recalculate_job_status(&conn, &job_id, now)?;
        self.get_snapshot(&job_id)
    }

    pub fn recover_interrupted_jobs(&self, _reason: &str) -> AppResult<u32> {
        let conn = self.connect()?;
        let now = now_ms();
        let mut stmt = conn.prepare(
            "SELECT DISTINCT t.job_id
             FROM image_workbench_tasks t
             INNER JOIN image_workbench_jobs j ON j.id = t.job_id
             WHERE t.status IN ('queued', 'running', 'validating', 'retrying')
               AND j.deleted_at_ms IS NULL
               AND j.archived_at_ms IS NULL",
        )?;
        let job_ids = collect_rows(stmt.query_map([], |row| row.get::<_, String>(0))?)?;

        for job_id in &job_ids {
            conn.execute(
                "UPDATE image_workbench_tasks
                 SET status = CASE
                         WHEN status IN ('running', 'validating') THEN 'queued'
                         ELSE status
                     END,
                     error = NULL,
                     failure_type = NULL,
                     failure_hint = NULL,
                     claim_token = NULL,
                     leased_until_ms = NULL,
                     finished_at_ms = NULL,
                     updated_at_ms = ?
                 WHERE job_id = ?
                   AND status IN ('queued', 'running', 'validating', 'retrying')",
                params![now, job_id],
            )?;
            self.recalculate_job_status(&conn, job_id, now)?;
        }

        Ok(job_ids.len() as u32)
    }

    pub fn update_task_status(
        &self,
        patch: ImageWorkbenchTaskStatusPatch,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let conn = self.connect()?;
        let now = now_ms();
        let task = image_workbench_query::get_task(&conn, &patch.task_id)?;
        validate_task_status_transition(&task, &patch.status)?;
        let retry_count = if task.status == "failed" && patch.status == "retrying" {
            task.retry_count + 1
        } else {
            task.retry_count
        };
        let started_at = if matches!(patch.status.as_str(), "running" | "validating" | "retrying")
            && task.started_at_ms.is_none()
        {
            Some(now)
        } else {
            task.started_at_ms
        };
        let finished_at = if is_terminal_status(&patch.status) {
            Some(now)
        } else if patch.status == "retrying" {
            None
        } else {
            task.finished_at_ms
        };
        let clear_claim = if matches!(
            patch.status.as_str(),
            "queued" | "retrying" | "succeeded" | "failed" | "cancelled"
        ) {
            1
        } else {
            0
        };

        conn.execute(
            "UPDATE image_workbench_tasks
             SET status = ?,
                 error = ?,
                 failure_type = ?,
                 failure_hint = ?,
                 retry_count = ?,
                 claim_token = CASE WHEN ? = 1 THEN NULL ELSE claim_token END,
                 leased_until_ms = CASE WHEN ? = 1 THEN NULL ELSE leased_until_ms END,
                 started_at_ms = ?,
                 finished_at_ms = ?,
                 updated_at_ms = ?
             WHERE id = ?",
            params![
                patch.status,
                patch.error,
                patch.failure_type,
                patch.failure_hint,
                retry_count as i64,
                clear_claim,
                clear_claim,
                started_at,
                finished_at,
                now,
                patch.task_id
            ],
        )?;

        if let Some(model_run) = patch.model_run {
            self.insert_model_run(&conn, &task.job_id, Some(&task.id), model_run, now)?;
        }

        self.recalculate_job_status(&conn, &task.job_id, now)?;
        self.get_snapshot(&task.job_id)
    }

    /// claim 时可选写入 worker_id：A2 阶段 service 透传当前进程 worker_id，
    /// janitor 据此区分跨进程残留 vs 本进程当前任务。worker_id=None 时保持
    /// 旧行为，列写为 NULL，janitor (1) 仍会按"非当前 worker"回收。
    pub fn claim_next_runnable_task_for_worker(
        &self,
        job_id: &str,
        task_ids: Option<&[String]>,
        lease_ms: i64,
        worker_id: Option<&str>,
    ) -> AppResult<Option<ImageWorkbenchTaskClaim>> {
        let conn = self.connect()?;
        let now = now_ms();
        let job = image_workbench_query::get_job(&conn, job_id)?;
        if job.deleted_at_ms.is_some() || job.archived_at_ms.is_some() {
            return Ok(None);
        }
        let candidates = image_workbench_query::list_tasks(&conn, job_id)?
            .into_iter()
            .filter(|task| {
                task_ids
                    .map(|ids| ids.iter().any(|id| id == &task.id))
                    .unwrap_or(true)
                    && is_claimable_task(task, now)
            })
            .collect::<Vec<_>>();

        for task in candidates {
            let claim_token = next_id("iw-claim");
            let leased_until_ms = now + lease_ms.max(1_000);
            let affected = conn.execute(
                "UPDATE image_workbench_tasks
                 SET status = 'running',
                     error = NULL,
                     failure_type = NULL,
                     failure_hint = NULL,
                     worker_id = ?,
                     claim_token = ?,
                     claimed_at_ms = ?,
                     leased_until_ms = ?,
                     last_heartbeat_ms = ?,
                     started_at_ms = COALESCE(started_at_ms, ?),
                     finished_at_ms = NULL,
                     updated_at_ms = ?
                 WHERE id = ?
                   AND job_id = ?
                   AND (
                        status IN ('queued', 'retrying')
                        OR (
                            status IN ('running', 'validating')
                            AND (leased_until_ms IS NULL OR leased_until_ms <= ?)
                        )
                   )",
                params![
                    worker_id,
                    claim_token,
                    now,
                    leased_until_ms,
                    now,
                    now,
                    now,
                    task.id,
                    job_id,
                    now
                ],
            )?;
            if affected == 0 {
                continue;
            }

            self.recalculate_job_status(&conn, &task.job_id, now)?;
            let snapshot = self.get_snapshot(&task.job_id)?;
            return Ok(Some(ImageWorkbenchTaskClaim {
                task_id: task.id,
                claim_token,
                snapshot,
            }));
        }

        Ok(None)
    }

    pub fn record_asset(
        &self,
        asset: NewImageWorkbenchAsset,
        metadata: Option<NewImageWorkbenchMetadata>,
        model_run: Option<NewImageWorkbenchModelRun>,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let mut conn = self.connect()?;
        let now = now_ms();
        let task = image_workbench_query::get_task(&conn, &asset.task_id)?;
        let asset_id = next_id("iw-asset");
        let job_id = task.job_id.clone();

        // 派生资产组与版本链：显式传入值优先（测试/导入场景），否则从 task 的
        // group_id 与 job 的 source_asset_id 推导（生产路径走这条）。
        let job = image_workbench_query::get_job(&conn, &job_id)?;
        let lineage = image_workbench_query::resolve_lineage(&conn, &job)?;
        let group_id = asset.group_id.clone().or(task.group_id.clone());
        let parent_asset_id = asset.parent_asset_id.clone().or(lineage.parent_asset_id);
        let root_asset_id = asset.root_asset_id.clone().or(lineage.root_asset_id);
        let version_index = asset.version_index.or(lineage.version_index);
        let parent_asset_id_for_delivery = parent_asset_id.clone();

        let tx = conn.transaction()?;
        tx.execute(
            "INSERT INTO image_workbench_assets
                (id, job_id, task_id, file_path, thumbnail_path, width, height, mime_type, size_bytes, favorite, created_at_ms,
                 group_id, rating, parent_asset_id, root_asset_id, version_index, delivery_status, quality_issues_json, integrity_status, integrity_error, integrity_checked_at_ms,
                 import_fingerprint, import_source_path)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, NULL, NULL, 'ok', NULL, ?, ?, ?)",
            params![
                asset_id,
                job_id,
                asset.task_id,
                asset.file_path,
                asset.thumbnail_path,
                asset.width.map(|value| value as i64),
                asset.height.map(|value| value as i64),
                asset.mime_type,
                asset.size_bytes.map(|value| value as i64),
                now,
                group_id,
                asset.rating.map(|value| value as i64),
                parent_asset_id,
                root_asset_id,
                version_index.map(|value| value as i64),
                now,
                asset.import_fingerprint,
                asset.import_source_path
            ],
        )?;

        if let Some(parent_asset_id) = parent_asset_id_for_delivery {
            refresh_asset_delivery_status(&tx, &parent_asset_id)?;
        }

        if let Some(metadata) = metadata {
            tx.execute(
                "INSERT INTO image_workbench_metadata
                    (id, asset_id, task_id, original_prompt, expanded_prompt, negative_prompt, seed, model, mode, provider, reference_asset_ids_json, mask_path, person_context_json, created_at_ms)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    next_id("iw-meta"),
                    asset_id,
                    asset.task_id,
                    metadata.original_prompt,
                    metadata.expanded_prompt,
                    metadata.negative_prompt,
                    metadata.seed,
                    metadata.model,
                    metadata.mode,
                    metadata.provider,
                    metadata.reference_asset_ids_json,
                    metadata.mask_path,
                    metadata.person_context_json,
                    now
                ],
            )?;
        }

        if let Some(model_run) = model_run {
            tx.execute(
                "INSERT INTO image_workbench_model_runs
                    (id, job_id, task_id, provider, model, capability, status, latency_ms, request_json, response_preview, error, created_at_ms, finished_at_ms)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    next_id("iw-run"),
                    job_id,
                    asset.task_id,
                    model_run.provider,
                    model_run.model,
                    model_run.capability,
                    model_run.status.unwrap_or_else(|| "succeeded".to_string()),
                    model_run.latency_ms.map(|value| value as i64),
                    model_run.request_json,
                    model_run.response_preview,
                    model_run.error,
                    now,
                    Some(now)
                ],
            )?;
        }
        tx.commit()?;

        self.get_snapshot(&job_id)
    }

    pub fn set_asset_favorite(
        &self,
        asset_id: &str,
        favorite: bool,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let mut conn = self.connect()?;
        let asset = image_workbench_query::get_asset(&conn, asset_id)?;
        let now = now_ms();
        let tx = conn.transaction()?;
        tx.execute(
            "UPDATE image_workbench_assets
             SET favorite = ?
             WHERE id = ?",
            params![if favorite { 1 } else { 0 }, asset_id],
        )?;
        refresh_asset_delivery_status(&tx, asset_id)?;
        tx.execute(
            "UPDATE image_workbench_jobs
             SET updated_at_ms = ?
             WHERE id = ?",
            params![now, asset.job_id],
        )?;
        tx.commit()?;
        self.get_snapshot(&asset.job_id)
    }

    /// 设置资产评分（0..5）。与 favorite 并存、互不影响；rating=None 表示清除评分。
    /// command 接入留后续轮次，本轮由 repo 单测覆盖。
    #[allow(dead_code)]
    pub fn set_asset_rating(
        &self,
        asset_id: &str,
        rating: Option<u32>,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let conn = self.connect()?;
        let asset = image_workbench_query::get_asset(&conn, asset_id)?;
        let now = now_ms();
        conn.execute(
            "UPDATE image_workbench_assets
             SET rating = ?
             WHERE id = ?",
            params![rating.map(|value| value as i64), asset_id],
        )?;
        conn.execute(
            "UPDATE image_workbench_jobs
             SET updated_at_ms = ?
             WHERE id = ?",
            params![now, asset.job_id],
        )?;
        self.get_snapshot(&asset.job_id)
    }

    pub fn set_asset_quality_issues(
        &self,
        asset_id: &str,
        quality_issues: &[String],
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let conn = self.connect()?;
        let asset = image_workbench_query::get_asset(&conn, asset_id)?;
        let now = now_ms();
        let quality_issues_json = if quality_issues.is_empty() {
            None
        } else {
            Some(serde_json::to_string(quality_issues).map_err(|error| {
                AppError::Database(format!("图片质检标签序列化失败: {}", error))
            })?)
        };
        conn.execute(
            "UPDATE image_workbench_assets
             SET quality_issues_json = ?
             WHERE id = ?",
            params![quality_issues_json, asset_id],
        )?;
        conn.execute(
            "UPDATE image_workbench_jobs
             SET updated_at_ms = ?
             WHERE id = ?",
            params![now, asset.job_id],
        )?;
        self.get_snapshot(&asset.job_id)
    }

    /// 创建资产组。本轮仅落存储与读写，grouped job 业务编排留后续轮次。
    /// command 接入留后续轮次，本轮由 repo 单测覆盖。
    #[allow(dead_code)]
    pub fn create_group(&self, input: NewImageWorkbenchGroup) -> AppResult<ImageWorkbenchGroup> {
        let conn = self.connect()?;
        image_workbench_query::get_job(&conn, &input.job_id)?;
        let now = now_ms();
        let group_id = next_id("iw-group");
        conn.execute(
            "INSERT INTO image_workbench_groups
                (id, job_id, source_id, name, type, agent_preset, agent_ids_json, base_prompt,
                 count, created_at_ms, updated_at_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                group_id,
                input.job_id,
                input.source_id,
                input.name,
                input.r#type,
                input.agent_preset,
                input.agent_ids_json,
                input.base_prompt,
                input.count as i64,
                now,
                now
            ],
        )?;
        image_workbench_query::get_group(&conn, &group_id)
    }

    pub fn tag_assets_group(
        &self,
        input: TagImageWorkbenchAssetsGroupInput,
    ) -> AppResult<TagImageWorkbenchAssetsGroupResult> {
        if input.asset_ids.is_empty() {
            return Ok(TagImageWorkbenchAssetsGroupResult {
                tagged_assets: 0,
                groups: Vec::new(),
            });
        }

        let mut conn = self.connect()?;
        let mut assets = Vec::new();
        for asset_id in input.asset_ids {
            if assets.iter().any(|asset: &ImageWorkbenchAsset| asset.id == asset_id) {
                continue;
            }
            if let Ok(asset) = image_workbench_query::get_asset(&conn, &asset_id) {
                assets.push(asset);
            }
        }
        if assets.is_empty() {
            return Ok(TagImageWorkbenchAssetsGroupResult {
                tagged_assets: 0,
                groups: Vec::new(),
            });
        }

        let now = now_ms();
        let tx = conn.transaction()?;
        let mut target_group_by_job = HashMap::<String, String>::new();
        if let Some(group_id) = input.group_id.filter(|value| !value.trim().is_empty()) {
            let group = image_workbench_query::get_group(&tx, group_id.trim())?;
            for asset in &assets {
                if asset.job_id != group.job_id {
                    return Err(AppError::Config(
                        "Cannot move assets from different jobs into one existing group".to_string(),
                    ));
                }
            }
            target_group_by_job.insert(group.job_id, group.id);
        } else {
            let group_name = input
                .group_name
                .map(|value| truncate_chars(&value, 80))
                .filter(|value| !value.trim().is_empty())
                .ok_or_else(|| AppError::Config("Image group name cannot be empty".to_string()))?;
            for asset in &assets {
                if target_group_by_job.contains_key(&asset.job_id) {
                    continue;
                }
                let group_id = next_id("iw-group");
                tx.execute(
                    "INSERT INTO image_workbench_groups
                        (id, job_id, source_id, name, type, agent_preset, agent_ids_json, base_prompt,
                         count, created_at_ms, updated_at_ms)
                     VALUES (?, ?, NULL, ?, 'manual', NULL, NULL, NULL, 0, ?, ?)",
                    params![group_id, asset.job_id, group_name, now, now],
                )?;
                target_group_by_job.insert(asset.job_id.clone(), group_id);
            }
        }

        for asset in &assets {
            let Some(group_id) = target_group_by_job.get(&asset.job_id) else {
                continue;
            };
            tx.execute(
                "UPDATE image_workbench_assets
                 SET group_id = ?
                 WHERE id = ?",
                params![group_id, asset.id],
            )?;
            tx.execute(
                "UPDATE image_workbench_jobs
                 SET updated_at_ms = ?
                 WHERE id = ?",
                params![now, asset.job_id],
            )?;
        }

        for group_id in target_group_by_job.values() {
            tx.execute(
                "UPDATE image_workbench_groups
                 SET count = (
                         SELECT COUNT(*)
                         FROM image_workbench_assets
                         WHERE group_id = ?
                     ),
                     updated_at_ms = ?
                 WHERE id = ?",
                params![group_id, now, group_id],
            )?;
        }

        let groups = target_group_by_job
            .values()
            .filter_map(|group_id| image_workbench_query::get_group(&tx, group_id).ok())
            .collect::<Vec<_>>();
        tx.commit()?;
        Ok(TagImageWorkbenchAssetsGroupResult {
            tagged_assets: assets.len() as u32,
            groups,
        })
    }

    #[allow(dead_code)]
    pub fn list_groups(&self, job_id: &str) -> AppResult<Vec<ImageWorkbenchGroup>> {
        let conn = self.connect()?;
        image_workbench_query::list_groups(&conn, job_id)
    }

    #[allow(dead_code)]
    pub fn get_group_by_id(&self, group_id: &str) -> AppResult<ImageWorkbenchGroup> {
        let conn = self.connect()?;
        image_workbench_query::get_group(&conn, group_id)
    }

    pub fn list_assets_by_group_marker(
        &self,
        group_id: Option<&str>,
        group_name: Option<&str>,
    ) -> AppResult<Vec<ImageWorkbenchAsset>> {
        let conn = self.connect()?;
        image_workbench_query::list_assets_by_group_marker(&conn, group_id, group_name)
    }

    pub fn list_groups_by_marker(
        &self,
        group_id: Option<&str>,
        group_name: Option<&str>,
    ) -> AppResult<Vec<ImageWorkbenchGroup>> {
        let conn = self.connect()?;
        image_workbench_query::list_groups_by_marker(&conn, group_id, group_name)
    }

    pub fn list_templates(&self) -> AppResult<Vec<ImageWorkbenchTemplate>> {
        let conn = self.connect()?;
        let mut stmt = conn.prepare(
            "SELECT id, name, prompt, negative_prompt, mode, is_system, created_at_ms, updated_at_ms
             FROM image_workbench_templates
             ORDER BY is_system DESC, updated_at_ms DESC, name ASC",
        )?;
        let rows = stmt.query_map([], map_template)?;
        collect_rows(rows)
    }

    pub fn save_template(
        &self,
        input: NewImageWorkbenchTemplate,
    ) -> AppResult<ImageWorkbenchTemplate> {
        let conn = self.connect()?;
        let now = now_ms();
        let id = input.id.unwrap_or_else(|| next_id("iw-template"));
        let existing = image_workbench_query::get_template_optional(&conn, &id)?;
        if existing.as_ref().is_some_and(|template| template.is_system) {
            return Err(AppError::Permission("系统模板不能被覆盖".to_string()));
        }

        if existing.is_some() {
            conn.execute(
                "UPDATE image_workbench_templates
                 SET name = ?, prompt = ?, negative_prompt = ?, mode = ?, updated_at_ms = ?
                 WHERE id = ?",
                params![
                    input.name,
                    input.prompt,
                    input.negative_prompt,
                    input.mode,
                    now,
                    id
                ],
            )?;
        } else {
            conn.execute(
                "INSERT INTO image_workbench_templates
                    (id, name, prompt, negative_prompt, mode, is_system, created_at_ms, updated_at_ms)
                 VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
                params![
                    id,
                    input.name,
                    input.prompt,
                    input.negative_prompt,
                    input.mode,
                    now,
                    now
                ],
            )?;
        }

        image_workbench_query::get_template(&conn, &id)
    }

    pub fn delete_template(&self, template_id: &str) -> AppResult<()> {
        let conn = self.connect()?;
        let template = image_workbench_query::get_template(&conn, template_id)?;
        if template.is_system {
            return Err(AppError::Permission("系统模板不能删除".to_string()));
        }
        conn.execute(
            "DELETE FROM image_workbench_templates WHERE id = ?",
            params![template_id],
        )?;
        Ok(())
    }

    fn insert_model_run(
        &self,
        conn: &Connection,
        job_id: &str,
        task_id: Option<&str>,
        model_run: NewImageWorkbenchModelRun,
        now: i64,
    ) -> AppResult<()> {
        conn.execute(
            "INSERT INTO image_workbench_model_runs
                (id, job_id, task_id, provider, model, capability, status, latency_ms, request_json, response_preview, error, created_at_ms, finished_at_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                next_id("iw-run"),
                job_id,
                task_id,
                model_run.provider,
                model_run.model,
                model_run.capability,
                model_run.status.unwrap_or_else(|| "succeeded".to_string()),
                model_run.latency_ms.map(|value| value as i64),
                model_run.request_json,
                model_run.response_preview,
                model_run.error,
                now,
                Some(now)
            ],
        )?;
        Ok(())
    }

    fn recalculate_job_status(&self, conn: &Connection, job_id: &str, now: i64) -> AppResult<()> {
        let tasks = image_workbench_query::list_tasks(conn, job_id)?;
        if tasks.is_empty() {
            return Ok(());
        }

        let has_running = tasks.iter().any(|task| task.status == "running");
        let has_validating = tasks.iter().any(|task| task.status == "validating");
        let has_retrying = tasks.iter().any(|task| task.status == "retrying");
        let has_queued = tasks.iter().any(|task| task.status == "queued");
        let has_succeeded = tasks.iter().any(|task| task.status == "succeeded");
        let all_queued = tasks.iter().all(|task| task.status == "queued");
        let all_terminal = tasks
            .iter()
            .all(|task| is_terminal_status(task.status.as_str()));
        let all_succeeded = tasks.iter().all(|task| task.status == "succeeded");
        let all_cancelled = tasks.iter().all(|task| task.status == "cancelled");
        let all_failed = tasks.iter().all(|task| task.status == "failed");

        let next_status = if all_queued {
            "queued"
        } else if has_running || has_retrying {
            "running"
        } else if has_validating {
            "validating"
        } else if all_succeeded {
            "succeeded"
        } else if all_cancelled {
            "cancelled"
        } else if all_failed {
            "failed"
        } else if all_terminal && has_succeeded {
            "partial_succeeded"
        } else if has_queued {
            "queued"
        } else {
            "running"
        };

        let started_at = if next_status == "running" || next_status == "validating" {
            Some(now)
        } else {
            None
        };
        let finished_at = if is_job_terminal_status(next_status) {
            Some(now)
        } else {
            None
        };

        conn.execute(
            "UPDATE image_workbench_jobs
             SET status = ?,
                 updated_at_ms = ?,
                 started_at_ms = COALESCE(started_at_ms, ?),
                 finished_at_ms = ?
             WHERE id = ?",
            params![next_status, now, started_at, finished_at, job_id],
        )?;

        Ok(())
    }
}

fn refresh_asset_delivery_status(conn: &Connection, asset_id: &str) -> AppResult<()> {
    conn.execute(
        "UPDATE image_workbench_assets
         SET delivery_status = CASE
             WHEN favorite = 1
                  AND parent_asset_id IS NOT NULL
                  AND EXISTS (
                      SELECT 1
                      FROM image_workbench_assets parent
                      WHERE parent.id = image_workbench_assets.parent_asset_id
                  )
                  AND NOT EXISTS (
                      SELECT 1
                      FROM image_workbench_assets child
                      WHERE child.parent_asset_id = image_workbench_assets.id
                  )
             THEN 'ready'
             ELSE NULL
         END
         WHERE id = ?",
        params![asset_id],
    )?;
    Ok(())
}

fn count_reference_assets(value: Option<&str>) -> usize {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return 0;
    };
    match serde_json::from_str::<serde_json::Value>(value) {
        Ok(serde_json::Value::Array(items)) => items
            .iter()
            .filter(|item| item.as_str().is_some_and(|text| !text.trim().is_empty()))
            .count(),
        Ok(serde_json::Value::String(text)) if !text.trim().is_empty() => 1,
        Ok(_) => 0,
        Err(_) => 1,
    }
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

fn next_id(prefix: &str) -> String {
    let seq = ID_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    format!("{}-{}-{}", prefix, now_ms(), seq)
}

#[cfg(test)]
#[path = "image_workbench_repo_tests.rs"]
mod tests;
