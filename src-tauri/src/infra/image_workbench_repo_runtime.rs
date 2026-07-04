use super::*;

impl ImageWorkbenchRepo {
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
            params![
                new_leased_until_ms,
                now,
                now,
                task_id,
                worker_id,
                claim_token
            ],
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
                 failure_type = NULL,
                 failure_hint = NULL,
                 updated_at_ms = ?
             WHERE status IN ('running', 'validating')
               AND (worker_id IS NULL OR worker_id != ?)
               AND job_id IN (
                    SELECT id
                    FROM image_workbench_jobs
                    WHERE deleted_at_ms IS NULL
                      AND archived_at_ms IS NULL
               )",
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
                 failure_type = NULL,
                 failure_hint = NULL,
                 updated_at_ms = ?
             WHERE status IN ('running', 'validating')
               AND worker_id = ?
               AND leased_until_ms IS NOT NULL
               AND leased_until_ms <= ?
               AND job_id IN (
                    SELECT id
                    FROM image_workbench_jobs
                    WHERE deleted_at_ms IS NULL
                      AND archived_at_ms IS NULL
               )",
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
                 failure_type = 'timeout',
                 failure_hint = ?,
                 updated_at_ms = ?
             WHERE status IN ('running', 'validating')
               AND claimed_at_ms IS NOT NULL
               AND claimed_at_ms <= ?
               AND job_id IN (
                    SELECT id
                    FROM image_workbench_jobs
                    WHERE deleted_at_ms IS NULL
                      AND archived_at_ms IS NULL
               )",
            params![now, error_text, error_text, now, claimed_before_ms],
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
                 failure_type = NULL,
                 failure_hint = NULL,
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
}
