use crate::infra::ai_generation_schema::init_ai_generation_schema;
use crate::infra::{AppError, AppResult};
use rusqlite::{params, Connection, OptionalExtension};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone)]
pub struct PersistedAiGenerationTask {
    pub request_id: String,
    pub capability: String,
    pub scope: String,
    pub status: String,
    pub provider_config_id: Option<String>,
    pub model: Option<String>,
    pub request_json: Option<String>,
    pub result_json: Option<String>,
    pub error: Option<String>,
    pub created_at_ms: i64,
    pub started_at_ms: Option<i64>,
    pub finished_at_ms: Option<i64>,
    pub queue_wait_ms: Option<u64>,
    pub total_latency_ms: Option<u64>,
}

#[derive(Debug, Clone)]
pub struct NewPersistedAiGenerationTask {
    pub request_id: String,
    pub capability: String,
    pub scope: String,
    pub provider_config_id: Option<String>,
    pub model: Option<String>,
    pub request_json: Option<String>,
}

pub struct AiGenerationRepo {
    db_path: PathBuf,
}

impl AiGenerationRepo {
    pub fn new(db_path: PathBuf) -> Self {
        Self { db_path }
    }

    fn connect(&self) -> AppResult<Connection> {
        init_ai_generation_schema(&self.db_path)?;
        let conn = Connection::open(&self.db_path)?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA busy_timeout = 5000;
             PRAGMA foreign_keys = ON;",
        )?;
        Ok(conn)
    }

    pub fn enqueue_business_task(
        &self,
        input: NewPersistedAiGenerationTask,
    ) -> AppResult<PersistedAiGenerationTask> {
        let conn = self.connect()?;
        let now = now_ms();
        if let Some(task) = self.get_optional(&conn, &input.request_id)? {
            return Ok(task);
        }

        conn.execute(
            "INSERT OR REPLACE INTO ai_generation_tasks
                (request_id, capability, scope, status, provider_config_id, model, request_json,
                 result_json, error, created_at_ms, updated_at_ms, started_at_ms, finished_at_ms,
                 queue_wait_ms, total_latency_ms)
             VALUES (?, ?, ?, 'queued', ?, ?, ?, NULL, NULL, ?, ?, NULL, NULL, NULL, NULL)",
            params![
                input.request_id,
                input.capability,
                input.scope,
                input.provider_config_id,
                input.model,
                input.request_json,
                now,
                now
            ],
        )?;
        self.get(&input.request_id)
    }

    pub fn mark_running(&self, request_id: &str, queue_wait_ms: u64) -> AppResult<bool> {
        let conn = self.connect()?;
        let now = now_ms();
        let affected = conn.execute(
            "UPDATE ai_generation_tasks
             SET status = 'running',
                 error = NULL,
                 started_at_ms = COALESCE(started_at_ms, ?),
                 queue_wait_ms = ?,
                 updated_at_ms = ?
             WHERE request_id = ?
               AND status NOT IN ('success', 'failed', 'canceled')",
            params![now, queue_wait_ms as i64, now, request_id],
        )?;
        Ok(affected > 0)
    }

    pub fn complete(
        &self,
        request_id: &str,
        ok: bool,
        result_json: String,
        error: Option<String>,
        total_latency_ms: u64,
    ) -> AppResult<bool> {
        let conn = self.connect()?;
        let now = now_ms();
        let affected = conn.execute(
            "UPDATE ai_generation_tasks
             SET status = ?,
                 result_json = ?,
                 error = ?,
                 total_latency_ms = ?,
                 finished_at_ms = ?,
                 updated_at_ms = ?
             WHERE request_id = ?
               AND status NOT IN ('success', 'failed', 'canceled')",
            params![
                if ok { "success" } else { "failed" },
                result_json,
                error,
                total_latency_ms as i64,
                now,
                now,
                request_id
            ],
        )?;
        Ok(affected > 0)
    }

    pub fn fail(&self, request_id: &str, error: String, total_latency_ms: u64) -> AppResult<bool> {
        let conn = self.connect()?;
        let now = now_ms();
        let affected = conn.execute(
            "UPDATE ai_generation_tasks
             SET status = 'failed',
                 error = ?,
                 total_latency_ms = ?,
                 finished_at_ms = ?,
                 updated_at_ms = ?
             WHERE request_id = ?
               AND status NOT IN ('success', 'failed', 'canceled')",
            params![error, total_latency_ms as i64, now, now, request_id],
        )?;
        Ok(affected > 0)
    }

    pub fn cancel(&self, request_id: &str, reason: String) -> AppResult<bool> {
        let conn = self.connect()?;
        let now = now_ms();
        let affected = conn.execute(
            "UPDATE ai_generation_tasks
             SET status = 'canceled',
                 error = ?,
                 finished_at_ms = COALESCE(finished_at_ms, ?),
                 updated_at_ms = ?
             WHERE request_id = ?
               AND status NOT IN ('success', 'failed', 'canceled')",
            params![reason, now, now, request_id],
        )?;
        Ok(affected > 0)
    }

    pub fn get(&self, request_id: &str) -> AppResult<PersistedAiGenerationTask> {
        let conn = self.connect()?;
        self.get_optional(&conn, request_id)?
            .ok_or_else(|| AppError::Database(format!("未找到 AI 生成任务: {}", request_id)))
    }

    pub fn list_recent(&self, limit: usize) -> AppResult<Vec<PersistedAiGenerationTask>> {
        let conn = self.connect()?;
        let limit = limit.clamp(1, 200) as i64;
        let mut stmt = conn.prepare(
            "SELECT request_id, capability, scope, status, provider_config_id, model,
                    request_json, result_json, error, created_at_ms, started_at_ms, finished_at_ms,
                    queue_wait_ms, total_latency_ms
             FROM ai_generation_tasks
             ORDER BY
                CASE WHEN finished_at_ms IS NULL THEN 0 ELSE 1 END ASC,
                updated_at_ms DESC,
                created_at_ms DESC
             LIMIT ?",
        )?;
        let rows = stmt.query_map(params![limit], map_task)?;
        collect_rows(rows)
    }

    pub fn recover_runnable_business_tasks(&self) -> AppResult<Vec<PersistedAiGenerationTask>> {
        let conn = self.connect()?;
        let now = now_ms();
        conn.execute(
            "UPDATE ai_generation_tasks
             SET status = 'queued',
                 error = NULL,
                 result_json = NULL,
                 started_at_ms = NULL,
                 finished_at_ms = NULL,
                 queue_wait_ms = NULL,
                 total_latency_ms = NULL,
                 updated_at_ms = ?
             WHERE scope = 'business'
               AND request_json IS NOT NULL
               AND status IN ('queued', 'running')",
            params![now],
        )?;

        let mut stmt = conn.prepare(
            "SELECT request_id, capability, scope, status, provider_config_id, model,
                    request_json, result_json, error, created_at_ms, started_at_ms, finished_at_ms,
                    queue_wait_ms, total_latency_ms
             FROM ai_generation_tasks
             WHERE scope = 'business'
               AND request_json IS NOT NULL
               AND status = 'queued'
             ORDER BY created_at_ms ASC",
        )?;
        let rows = stmt.query_map([], map_task)?;
        collect_rows(rows)
    }

    /// 续租 (heartbeat)：worker 周期调用，刷新 leased_until_ms 与 last_heartbeat_ms。
    /// 仅当 task 仍处于 running、worker_id 与 claim_token 匹配时才会更新成功。
    /// 返回 false 表示 task 已被 janitor 抢回 / 被 cancel / 被另一个 worker 接手，
    /// worker 应立即终止当前执行（A2 阶段实际接入）。
    #[allow(dead_code)]
    pub fn renew_business_task_lease(
        &self,
        request_id: &str,
        worker_id: &str,
        claim_token: &str,
        new_leased_until_ms: i64,
    ) -> AppResult<bool> {
        let conn = self.connect()?;
        let now = now_ms();
        let affected = conn.execute(
            "UPDATE ai_generation_tasks
             SET leased_until_ms = ?,
                 last_heartbeat_ms = ?,
                 updated_at_ms = ?
             WHERE request_id = ?
               AND status = 'running'
               AND worker_id = ?
               AND claim_token = ?",
            params![
                new_leased_until_ms,
                now,
                now,
                request_id,
                worker_id,
                claim_token
            ],
        )?;
        Ok(affected > 0)
    }

    /// janitor (1)：把所有 worker_id 不属于当前进程的 running business task 回滚为 queued。
    /// 用于替代 recover_runnable_business_tasks 在重启时的硬重置；运行期内也可清理上一次进程残留。
    /// 返回受影响的 task 数。
    #[allow(dead_code)]
    pub fn reset_running_business_tasks_by_other_worker(
        &self,
        current_worker_id: &str,
    ) -> AppResult<u32> {
        let conn = self.connect()?;
        let now = now_ms();
        let affected = conn.execute(
            "UPDATE ai_generation_tasks
             SET status = 'queued',
                 worker_id = NULL,
                 claim_token = NULL,
                 leased_until_ms = NULL,
                 last_heartbeat_ms = NULL,
                 claimed_at_ms = NULL,
                 started_at_ms = NULL,
                 finished_at_ms = NULL,
                 queue_wait_ms = NULL,
                 total_latency_ms = NULL,
                 result_json = NULL,
                 error = NULL,
                 updated_at_ms = ?
             WHERE scope = 'business'
               AND status = 'running'
               AND (worker_id IS NULL OR worker_id != ?)",
            params![now, current_worker_id],
        )?;
        Ok(affected as u32)
    }

    /// janitor (2)：当前进程内的 worker thread panic / 阻塞 → lease 过期但 worker_id 仍是当前。
    /// 把 leased_until_ms <= cutoff_ms 的 running business task 回滚为 queued。
    #[allow(dead_code)]
    pub fn reset_running_business_tasks_with_expired_lease(
        &self,
        current_worker_id: &str,
        cutoff_ms: i64,
    ) -> AppResult<u32> {
        let conn = self.connect()?;
        let now = now_ms();
        let affected = conn.execute(
            "UPDATE ai_generation_tasks
             SET status = 'queued',
                 worker_id = NULL,
                 claim_token = NULL,
                 leased_until_ms = NULL,
                 last_heartbeat_ms = NULL,
                 claimed_at_ms = NULL,
                 started_at_ms = NULL,
                 finished_at_ms = NULL,
                 queue_wait_ms = NULL,
                 total_latency_ms = NULL,
                 result_json = NULL,
                 error = NULL,
                 updated_at_ms = ?
             WHERE scope = 'business'
               AND status = 'running'
               AND worker_id = ?
               AND leased_until_ms IS NOT NULL
               AND leased_until_ms <= ?",
            params![now, current_worker_id, cutoff_ms],
        )?;
        Ok(affected as u32)
    }

    /// janitor (3)：兜底。心跳一直在跳但 task claim 已超过 STUCK_RUNNING_MAX_MS，
    /// 视为真挂死，标 failed。返回受影响的 task 数。
    #[allow(dead_code)]
    pub fn fail_stuck_running_business_tasks(
        &self,
        claimed_before_ms: i64,
        error_text: &str,
    ) -> AppResult<u32> {
        let conn = self.connect()?;
        let now = now_ms();
        let affected = conn.execute(
            "UPDATE ai_generation_tasks
             SET status = 'failed',
                 worker_id = NULL,
                 claim_token = NULL,
                 leased_until_ms = NULL,
                 last_heartbeat_ms = NULL,
                 finished_at_ms = ?,
                 error = ?,
                 updated_at_ms = ?
             WHERE scope = 'business'
               AND status = 'running'
               AND claimed_at_ms IS NOT NULL
               AND claimed_at_ms <= ?",
            params![now, error_text, now, claimed_before_ms],
        )?;
        Ok(affected as u32)
    }

    /// 测试专用：直接把一个已存在的 business task 写成 running + 指定 worker_id / claim_token /
    /// 时间戳，用来模拟跨进程残留与心跳超时场景。生产代码不应使用。
    #[cfg(test)]
    pub(crate) fn test_only_seed_running_business_task(
        &self,
        request_id: &str,
        worker_id: Option<&str>,
        claim_token: Option<&str>,
        claimed_at_ms: i64,
        leased_until_ms: i64,
        last_heartbeat_ms: Option<i64>,
    ) -> AppResult<()> {
        let conn = self.connect()?;
        conn.execute(
            "UPDATE ai_generation_tasks
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
             WHERE request_id = ?
               AND scope = 'business'",
            params![
                worker_id,
                claim_token,
                claimed_at_ms,
                leased_until_ms,
                last_heartbeat_ms,
                claimed_at_ms,
                claimed_at_ms,
                request_id,
            ],
        )?;
        Ok(())
    }

    fn get_optional(
        &self,
        conn: &Connection,
        request_id: &str,
    ) -> AppResult<Option<PersistedAiGenerationTask>> {
        conn.query_row(
            "SELECT request_id, capability, scope, status, provider_config_id, model,
                    request_json, result_json, error, created_at_ms, started_at_ms, finished_at_ms,
                    queue_wait_ms, total_latency_ms
             FROM ai_generation_tasks
             WHERE request_id = ?",
            params![request_id],
            map_task,
        )
        .optional()
        .map_err(AppError::from)
    }
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

fn collect_rows<T>(
    rows: rusqlite::MappedRows<'_, impl FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<T>>,
) -> AppResult<Vec<T>> {
    let mut items = Vec::new();
    for row in rows {
        items.push(row?);
    }
    Ok(items)
}

fn map_task(row: &rusqlite::Row<'_>) -> rusqlite::Result<PersistedAiGenerationTask> {
    Ok(PersistedAiGenerationTask {
        request_id: row.get(0)?,
        capability: row.get(1)?,
        scope: row.get(2)?,
        status: row.get(3)?,
        provider_config_id: row.get(4)?,
        model: row.get(5)?,
        request_json: row.get(6)?,
        result_json: row.get(7)?,
        error: row.get(8)?,
        created_at_ms: row.get(9)?,
        started_at_ms: row.get(10)?,
        finished_at_ms: row.get(11)?,
        queue_wait_ms: row.get::<_, Option<i64>>(12)?.map(|value| value as u64),
        total_latency_ms: row.get::<_, Option<i64>>(13)?.map(|value| value as u64),
    })
}

#[cfg(test)]
#[path = "ai_generation_repo_tests.rs"]
mod tests;
