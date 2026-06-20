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

use crate::infra::image_workbench_types::{
    ImageWorkbenchAsset, ImageWorkbenchAssetQuery, ImageWorkbenchGroup, ImageWorkbenchJob,
    ImageWorkbenchSnapshot, ImageWorkbenchTaskClaim, ImageWorkbenchTaskStatusPatch,
    ImageWorkbenchTemplate, NewImageWorkbenchAsset, NewImageWorkbenchGroup, NewImageWorkbenchJob,
    NewImageWorkbenchMetadata, NewImageWorkbenchModelRun, NewImageWorkbenchTemplate,
};

pub struct ImageWorkbenchRepo {
    db_path: PathBuf,
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
                 upscale_scale, fallback_policy, created_at_ms, updated_at_ms, queued_at_ms)
             VALUES (?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
                now,
                now,
                now
            ],
        )?;

        for index in 0..input.quantity {
            let task_prompt = input
                .task_prompts
                .get(index as usize)
                .cloned()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| input.prompt.clone());
            tx.execute(
                "INSERT INTO image_workbench_tasks
                    (id, job_id, queue_index, status, retry_count, max_retries, prompt, created_at_ms, updated_at_ms)
                 VALUES (?, ?, ?, 'queued', 0, 1, ?, ?, ?)",
                params![
                    next_id("iw-task"),
                    job_id,
                    index as i64,
                    task_prompt,
                    now,
                    now
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
                    upscale_scale, fallback_policy, created_at_ms, updated_at_ms, queued_at_ms,
                    started_at_ms, finished_at_ms, error
             FROM image_workbench_jobs
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

    pub fn delete_job(&self, job_id: &str) -> AppResult<()> {
        let conn = self.connect()?;
        let affected = conn.execute(
            "DELETE FROM image_workbench_jobs WHERE id = ?",
            params![job_id],
        )?;
        if affected == 0 {
            return Err(AppError::Database(format!(
                "未找到图片工作台作业: {}",
                job_id
            )));
        }
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
        for task in tasks
            .iter()
            .filter(|task| task.status == "failed" && task.retry_count < task.max_retries)
        {
            conn.execute(
                "UPDATE image_workbench_tasks
                 SET status = 'retrying',
                     error = NULL,
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

    pub fn recover_interrupted_jobs(&self, _reason: &str) -> AppResult<u32> {
        let conn = self.connect()?;
        let now = now_ms();
        let mut stmt = conn.prepare(
            "SELECT DISTINCT job_id
             FROM image_workbench_tasks
             WHERE status IN ('queued', 'running', 'validating', 'retrying')",
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
        image_workbench_query::get_job(&conn, job_id)?;
        let task = image_workbench_query::list_tasks(&conn, job_id)?.into_iter().find(|task| {
            task_ids
                .map(|ids| ids.iter().any(|id| id == &task.id))
                .unwrap_or(true)
                && is_claimable_task(task, now)
        });
        let Some(task) = task else {
            return Ok(None);
        };

        let claim_token = next_id("iw-claim");
        let leased_until_ms = now + lease_ms.max(1_000);
        let affected = conn.execute(
            "UPDATE image_workbench_tasks
             SET status = 'running',
                 error = NULL,
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
            return Ok(None);
        }

        self.recalculate_job_status(&conn, &task.job_id, now)?;
        let snapshot = self.get_snapshot(&task.job_id)?;
        Ok(Some(ImageWorkbenchTaskClaim {
            task_id: task.id,
            claim_token,
            snapshot,
        }))
    }

    /// 续租 (heartbeat)：worker 周期调用，刷新 leased_until_ms 与 last_heartbeat_ms。
    /// 仅当 task 仍处于 running、worker_id 与 claim_token 匹配时才会更新成功。
    /// 返回 false 表示 task 已被 janitor 抢回 / 被 cancel / 被另一个 worker 接手，
    /// worker 应立即终止当前执行（A2 阶段实际接入）。
    #[allow(dead_code)]
    pub fn renew_image_task_lease(
        &self,
        task_id: &str,
        worker_id: &str,
        claim_token: &str,
        new_leased_until_ms: i64,
    ) -> AppResult<bool> {
        let conn = self.connect()?;
        let now = now_ms();
        let affected = conn.execute(
            "UPDATE image_workbench_tasks
             SET leased_until_ms = ?,
                 last_heartbeat_ms = ?,
                 updated_at_ms = ?
             WHERE id = ?
               AND status = 'running'
               AND worker_id = ?
               AND claim_token = ?",
            params![new_leased_until_ms, now, now, task_id, worker_id, claim_token],
        )?;
        Ok(affected > 0)
    }

    /// janitor (1)：把所有 worker_id 不属于当前进程的 running/validating task 回滚为 queued。
    /// 用于替代 recover_interrupted_jobs 在重启时的硬重置；运行期内也可用来清理上一次进程残留。
    /// retry_count 不增（不算业务失败）。返回受影响的 task 数。
    #[allow(dead_code)]
    pub fn reset_running_image_tasks_by_other_worker(
        &self,
        current_worker_id: &str,
    ) -> AppResult<u32> {
        let conn = self.connect()?;
        let now = now_ms();
        let affected = conn.execute(
            "UPDATE image_workbench_tasks
             SET status = 'queued',
                 worker_id = NULL,
                 claim_token = NULL,
                 leased_until_ms = NULL,
                 last_heartbeat_ms = NULL,
                 claimed_at_ms = NULL,
                 started_at_ms = NULL,
                 finished_at_ms = NULL,
                 error = NULL,
                 updated_at_ms = ?
             WHERE status IN ('running', 'validating')
               AND (worker_id IS NULL OR worker_id != ?)",
            params![now, current_worker_id],
        )?;
        Ok(affected as u32)
    }

    /// janitor (2)：当前进程内的 worker thread panic / 阻塞 → lease 过期但 worker_id 仍是当前。
    /// 把 leased_until_ms <= cutoff_ms 的 running/validating task 回滚为 queued。
    /// retry_count 不增。
    #[allow(dead_code)]
    pub fn reset_running_image_tasks_with_expired_lease(
        &self,
        current_worker_id: &str,
        cutoff_ms: i64,
    ) -> AppResult<u32> {
        let conn = self.connect()?;
        let now = now_ms();
        let affected = conn.execute(
            "UPDATE image_workbench_tasks
             SET status = 'queued',
                 worker_id = NULL,
                 claim_token = NULL,
                 leased_until_ms = NULL,
                 last_heartbeat_ms = NULL,
                 claimed_at_ms = NULL,
                 started_at_ms = NULL,
                 finished_at_ms = NULL,
                 error = NULL,
                 updated_at_ms = ?
             WHERE status IN ('running', 'validating')
               AND worker_id = ?
               AND leased_until_ms IS NOT NULL
               AND leased_until_ms <= ?",
            params![now, current_worker_id, cutoff_ms],
        )?;
        Ok(affected as u32)
    }

    /// janitor (3)：兜底。心跳一直在跳但 task claim 已超过 STUCK_RUNNING_MAX_MS，
    /// 视为真挂死，标 failed 且 retry_count++。返回受影响的 task 数。
    #[allow(dead_code)]
    pub fn fail_stuck_running_image_tasks(
        &self,
        claimed_before_ms: i64,
        error_text: &str,
    ) -> AppResult<u32> {
        let conn = self.connect()?;
        let now = now_ms();
        let affected = conn.execute(
            "UPDATE image_workbench_tasks
             SET status = 'failed',
                 retry_count = retry_count + 1,
                 worker_id = NULL,
                 claim_token = NULL,
                 leased_until_ms = NULL,
                 last_heartbeat_ms = NULL,
                 finished_at_ms = ?,
                 error = ?,
                 updated_at_ms = ?
             WHERE status IN ('running', 'validating')
               AND claimed_at_ms IS NOT NULL
               AND claimed_at_ms <= ?",
            params![now, error_text, now, claimed_before_ms],
        )?;
        Ok(affected as u32)
    }

    /// 测试专用：直接把一个已存在的 task 写成 running + 指定 worker_id / claim_token / 时间戳，
    /// 用来模拟跨进程残留与心跳超时场景。生产代码请走 claim_next_runnable_task。
    #[cfg(test)]
    pub(crate) fn test_only_seed_running_task(
        &self,
        task_id: &str,
        worker_id: Option<&str>,
        claim_token: Option<&str>,
        claimed_at_ms: i64,
        leased_until_ms: i64,
        last_heartbeat_ms: Option<i64>,
    ) -> AppResult<()> {
        let conn = self.connect()?;
        conn.execute(
            "UPDATE image_workbench_tasks
             SET status = 'running',
                 worker_id = ?,
                 claim_token = ?,
                 claimed_at_ms = ?,
                 leased_until_ms = ?,
                 last_heartbeat_ms = ?,
                 started_at_ms = ?,
                 finished_at_ms = NULL,
                 error = NULL,
                 updated_at_ms = ?
             WHERE id = ?",
            params![
                worker_id,
                claim_token,
                claimed_at_ms,
                leased_until_ms,
                last_heartbeat_ms,
                claimed_at_ms,
                claimed_at_ms,
                task_id,
            ],
        )?;
        Ok(())
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

        let tx = conn.transaction()?;
        tx.execute(
            "INSERT INTO image_workbench_assets
                (id, job_id, task_id, file_path, thumbnail_path, width, height, mime_type, size_bytes, favorite, created_at_ms,
                 group_id, rating, parent_asset_id, root_asset_id, version_index)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)",
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
                asset.group_id,
                asset.rating.map(|value| value as i64),
                asset.parent_asset_id,
                asset.root_asset_id,
                asset.version_index.map(|value| value as i64)
            ],
        )?;

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
        let conn = self.connect()?;
        let asset = image_workbench_query::get_asset(&conn, asset_id)?;
        let now = now_ms();
        conn.execute(
            "UPDATE image_workbench_assets
             SET favorite = ?
             WHERE id = ?",
            params![if favorite { 1 } else { 0 }, asset_id],
        )?;
        conn.execute(
            "UPDATE image_workbench_jobs
             SET updated_at_ms = ?
             WHERE id = ?",
            params![now, asset.job_id],
        )?;
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
                 finished_at_ms = CASE WHEN ? IS NULL THEN finished_at_ms ELSE ? END
             WHERE id = ?",
            params![
                next_status,
                now,
                started_at,
                finished_at,
                finished_at,
                job_id
            ],
        )?;

        Ok(())
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
