use crate::infra::creative_db_schema::init_schema;
use crate::infra::creative_db_support::{connect, map_creative_task, map_task_event};
use crate::infra::creative_types::{
    CreateCreativeTaskInput, CreateTaskEventInput, CreativeTask, ListCreativeTasksFilter,
    TaskEvent, UpdateCreativeTaskStatusInput,
};
use crate::infra::{AppError, AppResult};
use rusqlite::{params, params_from_iter, types::Value, Connection, OptionalExtension};
use std::path::Path;

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub(crate) struct ClaimTaskLeaseInput {
    pub filter: ListCreativeTasksFilter,
    pub worker_id: String,
    pub runtime_instance_id: String,
    pub claim_token: String,
    pub claimed_at: String,
    pub lease_expires_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub(crate) struct ClaimedTaskLease {
    pub task: CreativeTask,
    pub worker_id: String,
    pub runtime_instance_id: String,
    pub claim_token: String,
    pub lease_expires_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub(crate) struct HeartbeatTaskLeaseInput {
    pub task_id: i64,
    pub worker_id: String,
    pub runtime_instance_id: String,
    pub claim_token: String,
    pub now: String,
    pub heartbeat_at: String,
    pub lease_expires_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub(crate) struct TaskLeaseHeartbeat {
    pub task: CreativeTask,
    pub lease_expires_at: String,
    pub lease_renewal_count: i64,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub(crate) struct CheckpointTaskLeaseInput {
    pub task_id: i64,
    pub worker_id: String,
    pub runtime_instance_id: String,
    pub claim_token: String,
    pub now: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub(crate) struct CompleteTaskLeaseInput {
    pub task_id: i64,
    pub worker_id: String,
    pub runtime_instance_id: String,
    pub claim_token: String,
    pub now: String,
    pub status: String,
    pub result_json: Option<String>,
    pub error_message: Option<String>,
    pub asset_id: Option<i64>,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub(crate) struct RetryTaskLeaseInput {
    pub task_id: i64,
    pub worker_id: String,
    pub runtime_instance_id: String,
    pub claim_token: String,
    pub now: String,
    pub error_message: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub(crate) struct RecoverExpiredTaskLeasesInput {
    pub now: String,
    pub limit: i64,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RecoverExpiredTaskLeasesSummary {
    pub requeued_tasks: Vec<i64>,
    pub failed_tasks: Vec<i64>,
    pub cancelled_tasks: Vec<i64>,
}

pub(crate) fn create_task(
    db_path: &Path,
    input: CreateCreativeTaskInput,
) -> AppResult<CreativeTask> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let status = input.status.unwrap_or_else(|| "draft".to_string());
    conn.execute(
        "INSERT INTO creative_tasks (
            project_id, goal_id, batch_job_id, task_type, status, priority, payload_json,
            max_retries, parent_task_id, asset_id, sequence_no
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            input.project_id,
            input.goal_id,
            input.batch_job_id,
            input.task_type,
            status,
            input.priority.unwrap_or(0),
            input.payload_json,
            input.max_retries.unwrap_or(0),
            input.parent_task_id,
            input.asset_id,
            input.sequence_no
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_task_with_conn(&conn, id)?
        .ok_or_else(|| AppError::Database("鍒涗綔浠诲姟宸插啓鍏ヤ絾鏃犳硶绔嬪嵆璇诲彇".to_string()))
}

pub(crate) fn get_task(db_path: &Path, id: i64) -> AppResult<Option<CreativeTask>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    get_task_with_conn(&conn, id)
}

pub(crate) fn list_tasks(
    db_path: &Path,
    filter: ListCreativeTasksFilter,
) -> AppResult<Vec<CreativeTask>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let mut sql = String::from(
        "SELECT id, project_id, goal_id, batch_job_id, task_type, status, priority,
            payload_json, result_json, error_message, retry_count, max_retries,
            parent_task_id, asset_id, sequence_no, created_at, updated_at, started_at,
            finished_at
         FROM creative_tasks
         WHERE 1 = 1",
    );
    let mut params = Vec::<Value>::new();

    if let Some(project_id) = non_empty_filter(filter.project_id) {
        sql.push_str(" AND project_id = ?");
        params.push(Value::Text(project_id));
    }
    if let Some(status) = non_empty_filter(filter.status) {
        sql.push_str(" AND status = ?");
        params.push(Value::Text(status));
    }
    if let Some(task_type) = non_empty_filter(filter.task_type) {
        sql.push_str(" AND task_type = ?");
        params.push(Value::Text(task_type));
    }
    if let Some(goal_id) = filter.goal_id {
        sql.push_str(" AND goal_id = ?");
        params.push(Value::Integer(goal_id));
    }
    if let Some(batch_job_id) = filter.batch_job_id {
        sql.push_str(" AND batch_job_id = ?");
        params.push(Value::Integer(batch_job_id));
    }

    sql.push_str(" ORDER BY COALESCE(sequence_no, id) ASC, id ASC LIMIT ? OFFSET ?");
    params.push(Value::Integer(filter.limit.unwrap_or(50).clamp(1, 200)));
    params.push(Value::Integer(filter.offset.unwrap_or(0).max(0)));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(params.iter()), map_creative_task)?;
    let mut tasks = Vec::new();
    for row in rows {
        tasks.push(row?);
    }
    Ok(tasks)
}

pub(crate) fn update_task_status(
    db_path: &Path,
    input: UpdateCreativeTaskStatusInput,
) -> AppResult<CreativeTask> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let status = input.status;
    let result_json = input.result_json;
    let error_message = input.error_message;
    let asset_id = input.asset_id;
    let retry_count_increment = input.retry_count_increment.unwrap_or(0);
    let id = input.id;
    conn.execute(
        "UPDATE creative_tasks
         SET status = ?,
             result_json = ?,
             error_message = ?,
             asset_id = COALESCE(?, asset_id),
             retry_count = retry_count + ?,
             updated_at = CURRENT_TIMESTAMP,
             started_at = CASE
                 WHEN ? = 'running' AND started_at IS NULL THEN CURRENT_TIMESTAMP
                 ELSE started_at
             END,
             finished_at = CASE
                 WHEN ? IN ('succeeded', 'failed', 'cancelled', 'completed', 'done')
                      AND finished_at IS NULL THEN CURRENT_TIMESTAMP
                 WHEN ? NOT IN ('succeeded', 'failed', 'cancelled', 'completed', 'done')
                      THEN NULL
                 ELSE finished_at
             END
         WHERE id = ?",
        params![
            status.clone(),
            result_json,
            error_message,
            asset_id,
            retry_count_increment,
            status.clone(),
            status.clone(),
            status,
            id
        ],
    )?;
    get_task_with_conn(&conn, id)?.ok_or_else(|| {
        AppError::Database("creative task updated but could not be reloaded".to_string())
    })
}

pub(crate) fn claim_next_queued_task(
    db_path: &Path,
    filter: ListCreativeTasksFilter,
) -> AppResult<Option<CreativeTask>> {
    init_schema(db_path)?;
    let mut conn = connect(db_path)?;
    let tx = conn.transaction()?;

    let mut sql = String::from(
        "SELECT id
         FROM creative_tasks
         WHERE status = 'queued'
           AND (
               batch_job_id IS NULL
               OR EXISTS (
                   SELECT 1
                   FROM batch_jobs
                   WHERE batch_jobs.id = creative_tasks.batch_job_id
                     AND batch_jobs.status = 'running'
                     AND (
                         SELECT COUNT(*)
                         FROM creative_tasks AS running_tasks
                         WHERE running_tasks.batch_job_id = creative_tasks.batch_job_id
                           AND running_tasks.status = 'running'
                     ) < batch_jobs.concurrency
               )
           )",
    );
    let mut params = Vec::<Value>::new();

    if let Some(project_id) = non_empty_filter(filter.project_id) {
        sql.push_str(" AND project_id = ?");
        params.push(Value::Text(project_id));
    }
    if let Some(task_type) = non_empty_filter(filter.task_type) {
        sql.push_str(" AND task_type = ?");
        params.push(Value::Text(task_type));
    }
    if let Some(batch_job_id) = filter.batch_job_id {
        sql.push_str(" AND batch_job_id = ?");
        params.push(Value::Integer(batch_job_id));
    }

    sql.push_str(" ORDER BY priority DESC, COALESCE(sequence_no, id) ASC, id ASC LIMIT 1");

    let claimed_id = {
        let mut stmt = tx.prepare(&sql)?;
        stmt.query_row(params_from_iter(params.iter()), |row| row.get::<_, i64>(0))
            .optional()?
    };

    let Some(task_id) = claimed_id else {
        tx.commit()?;
        return Ok(None);
    };

    let affected = tx.execute(
        "UPDATE creative_tasks
         SET status = 'running',
             updated_at = CURRENT_TIMESTAMP,
             started_at = CASE
                 WHEN started_at IS NULL THEN CURRENT_TIMESTAMP
             ELSE started_at
         END,
         finished_at = NULL
         WHERE id = ?
           AND status = 'queued'
           AND (
               batch_job_id IS NULL
               OR EXISTS (
                   SELECT 1
                   FROM batch_jobs
                   WHERE batch_jobs.id = creative_tasks.batch_job_id
                     AND batch_jobs.status = 'running'
                     AND (
                         SELECT COUNT(*)
                         FROM creative_tasks AS running_tasks
                         WHERE running_tasks.batch_job_id = creative_tasks.batch_job_id
                           AND running_tasks.status = 'running'
                     ) < batch_jobs.concurrency
               )
           )",
        params![task_id],
    )?;

    if affected == 0 {
        tx.commit()?;
        return Ok(None);
    }

    let task = get_task_with_conn(&tx, task_id)?;
    tx.commit()?;
    Ok(task)
}

#[allow(dead_code)]
pub(crate) fn claim_next_queued_task_with_lease(
    db_path: &Path,
    input: ClaimTaskLeaseInput,
) -> AppResult<Option<ClaimedTaskLease>> {
    validate_worker_lease_identity(
        &input.worker_id,
        &input.runtime_instance_id,
        &input.claim_token,
    )?;
    init_schema(db_path)?;
    let mut conn = connect(db_path)?;
    let tx = conn.transaction()?;

    let mut sql = String::from(
        "SELECT id
         FROM creative_tasks
         WHERE status = 'queued'
           AND (
               batch_job_id IS NULL
               OR EXISTS (
                   SELECT 1
                   FROM batch_jobs
                   WHERE batch_jobs.id = creative_tasks.batch_job_id
                     AND batch_jobs.status = 'running'
                     AND (
                         SELECT COUNT(*)
                         FROM creative_tasks AS running_tasks
                         WHERE running_tasks.batch_job_id = creative_tasks.batch_job_id
                           AND running_tasks.status = 'running'
                     ) < batch_jobs.concurrency
               )
           )",
    );
    let mut params = Vec::<Value>::new();

    if let Some(project_id) = non_empty_filter(input.filter.project_id.clone()) {
        sql.push_str(" AND project_id = ?");
        params.push(Value::Text(project_id));
    }
    if let Some(task_type) = non_empty_filter(input.filter.task_type.clone()) {
        sql.push_str(" AND task_type = ?");
        params.push(Value::Text(task_type));
    }
    if let Some(batch_job_id) = input.filter.batch_job_id {
        sql.push_str(" AND batch_job_id = ?");
        params.push(Value::Integer(batch_job_id));
    }

    sql.push_str(" ORDER BY priority DESC, COALESCE(sequence_no, id) ASC, id ASC LIMIT 1");

    let claimed_id = {
        let mut stmt = tx.prepare(&sql)?;
        stmt.query_row(params_from_iter(params.iter()), |row| row.get::<_, i64>(0))
            .optional()?
    };

    let Some(task_id) = claimed_id else {
        tx.commit()?;
        return Ok(None);
    };

    let affected = tx.execute(
        "UPDATE creative_tasks
         SET status = 'running',
             worker_id = ?,
             worker_runtime_instance_id = ?,
             worker_claim_token = ?,
             worker_claimed_at = ?,
             worker_heartbeat_at = ?,
             lease_expires_at = ?,
             lease_renewal_count = 0,
             updated_at = CURRENT_TIMESTAMP,
             started_at = CASE
                 WHEN started_at IS NULL THEN CURRENT_TIMESTAMP
                 ELSE started_at
             END,
             finished_at = NULL
         WHERE id = ?
           AND status = 'queued'
           AND (
               batch_job_id IS NULL
               OR EXISTS (
                   SELECT 1
                   FROM batch_jobs
                   WHERE batch_jobs.id = creative_tasks.batch_job_id
                     AND batch_jobs.status = 'running'
                     AND (
                         SELECT COUNT(*)
                         FROM creative_tasks AS running_tasks
                         WHERE running_tasks.batch_job_id = creative_tasks.batch_job_id
                           AND running_tasks.status = 'running'
                     ) < batch_jobs.concurrency
               )
           )",
        params![
            input.worker_id,
            input.runtime_instance_id,
            input.claim_token,
            input.claimed_at,
            input.claimed_at,
            input.lease_expires_at,
            task_id
        ],
    )?;

    if affected == 0 {
        tx.commit()?;
        return Ok(None);
    }

    let task = get_task_with_conn(&tx, task_id)?;
    tx.commit()?;

    Ok(task.map(|task| ClaimedTaskLease {
        task,
        worker_id: input.worker_id,
        runtime_instance_id: input.runtime_instance_id,
        claim_token: input.claim_token,
        lease_expires_at: input.lease_expires_at,
    }))
}

#[allow(dead_code)]
pub(crate) fn heartbeat_task_lease(
    db_path: &Path,
    input: HeartbeatTaskLeaseInput,
) -> AppResult<Option<TaskLeaseHeartbeat>> {
    validate_worker_lease_identity(
        &input.worker_id,
        &input.runtime_instance_id,
        &input.claim_token,
    )?;
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let affected = conn.execute(
        "UPDATE creative_tasks
         SET worker_heartbeat_at = ?,
             lease_expires_at = ?,
             lease_renewal_count = lease_renewal_count + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND status IN ('running', 'cancelling')
           AND worker_id = ?
           AND worker_runtime_instance_id = ?
           AND worker_claim_token = ?
           AND lease_expires_at IS NOT NULL
           AND lease_expires_at > ?",
        params![
            input.heartbeat_at,
            input.lease_expires_at,
            input.task_id,
            input.worker_id,
            input.runtime_instance_id,
            input.claim_token,
            input.now
        ],
    )?;

    if affected == 0 {
        return Ok(None);
    }

    let task = get_task_with_conn(&conn, input.task_id)?.ok_or_else(|| {
        AppError::Database("leased task updated but could not be reloaded".to_string())
    })?;
    let lease_renewal_count = get_lease_renewal_count_with_conn(&conn, input.task_id)?;
    Ok(Some(TaskLeaseHeartbeat {
        task,
        lease_expires_at: input.lease_expires_at,
        lease_renewal_count,
    }))
}

#[allow(dead_code)]
pub(crate) fn is_task_lease_current(
    db_path: &Path,
    input: CheckpointTaskLeaseInput,
) -> AppResult<bool> {
    validate_worker_lease_identity(
        &input.worker_id,
        &input.runtime_instance_id,
        &input.claim_token,
    )?;
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let matched = conn.query_row(
        "SELECT EXISTS(
            SELECT 1
            FROM creative_tasks
            WHERE id = ?
              AND status IN ('running', 'cancelling')
              AND worker_id = ?
              AND worker_runtime_instance_id = ?
              AND worker_claim_token = ?
              AND lease_expires_at IS NOT NULL
              AND lease_expires_at > ?
        )",
        params![
            input.task_id,
            input.worker_id,
            input.runtime_instance_id,
            input.claim_token,
            input.now
        ],
        |row| row.get::<_, i64>(0),
    )?;
    Ok(matched != 0)
}

#[allow(dead_code)]
pub(crate) fn complete_task_with_lease(
    db_path: &Path,
    input: CompleteTaskLeaseInput,
) -> AppResult<Option<CreativeTask>> {
    validate_worker_lease_identity(
        &input.worker_id,
        &input.runtime_instance_id,
        &input.claim_token,
    )?;
    let status = normalize_lease_complete_status(&input.status)?;
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let affected = conn.execute(
        "UPDATE creative_tasks
         SET status = ?,
             result_json = ?,
             error_message = ?,
             asset_id = COALESCE(?, asset_id),
             updated_at = CURRENT_TIMESTAMP,
             finished_at = CASE
                 WHEN ? IN ('succeeded', 'failed', 'cancelled', 'blocked') THEN CURRENT_TIMESTAMP
                 ELSE finished_at
             END
         WHERE id = ?
           AND status IN ('running', 'cancelling')
           AND worker_id = ?
           AND worker_runtime_instance_id = ?
           AND worker_claim_token = ?
           AND lease_expires_at IS NOT NULL
           AND lease_expires_at > ?",
        params![
            status.clone(),
            input.result_json,
            input.error_message,
            input.asset_id,
            status,
            input.task_id,
            input.worker_id,
            input.runtime_instance_id,
            input.claim_token,
            input.now
        ],
    )?;

    if affected == 0 {
        return Ok(None);
    }

    get_task_with_conn(&conn, input.task_id)
}

#[allow(dead_code)]
pub(crate) fn retry_task_with_lease(
    db_path: &Path,
    input: RetryTaskLeaseInput,
) -> AppResult<Option<CreativeTask>> {
    validate_worker_lease_identity(
        &input.worker_id,
        &input.runtime_instance_id,
        &input.claim_token,
    )?;
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let affected = conn.execute(
        "UPDATE creative_tasks
         SET status = 'queued',
             result_json = NULL,
             error_message = ?,
             retry_count = retry_count + 1,
             worker_id = NULL,
             worker_runtime_instance_id = NULL,
             worker_claim_token = NULL,
             worker_heartbeat_at = NULL,
             lease_expires_at = NULL,
             lease_renewal_count = 0,
             updated_at = CURRENT_TIMESTAMP,
             finished_at = NULL
         WHERE id = ?
           AND status = 'running'
           AND retry_count < max_retries
           AND worker_id = ?
           AND worker_runtime_instance_id = ?
           AND worker_claim_token = ?
           AND lease_expires_at IS NOT NULL
           AND lease_expires_at > ?",
        params![
            input.error_message,
            input.task_id,
            input.worker_id,
            input.runtime_instance_id,
            input.claim_token,
            input.now
        ],
    )?;

    if affected == 0 {
        return Ok(None);
    }

    get_task_with_conn(&conn, input.task_id)
}

#[allow(dead_code)]
pub(crate) fn recover_expired_task_leases(
    db_path: &Path,
    input: RecoverExpiredTaskLeasesInput,
) -> AppResult<RecoverExpiredTaskLeasesSummary> {
    init_schema(db_path)?;
    let mut conn = connect(db_path)?;
    let tx = conn.transaction()?;
    let limit = input.limit.clamp(1, 500);

    let expired_tasks: Vec<(i64, String, i64, i64)> = {
        let mut stmt = tx.prepare(
            "SELECT id, status, retry_count, max_retries
             FROM creative_tasks
             WHERE status IN ('running', 'cancelling')
               AND lease_expires_at IS NOT NULL
               AND lease_expires_at <= ?
             ORDER BY lease_expires_at ASC, id ASC
             LIMIT ?",
        )?;
        let rows = stmt.query_map(params![input.now, limit], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, i64>(3)?,
            ))
        })?;
        rows.collect::<Result<Vec<_>, _>>()?
    };

    let mut summary = RecoverExpiredTaskLeasesSummary::default();
    for (task_id, status, retry_count, max_retries) in expired_tasks {
        if status == "cancelling" {
            tx.execute(
                "UPDATE creative_tasks
                 SET status = 'cancelled',
                     result_json = NULL,
                     error_message = 'task lease expired while cancelling',
                     worker_id = NULL,
                     worker_runtime_instance_id = NULL,
                     worker_claim_token = NULL,
                     worker_heartbeat_at = NULL,
                     lease_expires_at = NULL,
                     lease_renewal_count = 0,
                     updated_at = CURRENT_TIMESTAMP,
                     finished_at = CURRENT_TIMESTAMP
                 WHERE id = ?",
                params![task_id],
            )?;
            summary.cancelled_tasks.push(task_id);
        } else if retry_count < max_retries {
            tx.execute(
                "UPDATE creative_tasks
                 SET status = 'queued',
                     result_json = NULL,
                     error_message = 'task lease expired and was requeued',
                     retry_count = retry_count + 1,
                     worker_id = NULL,
                     worker_runtime_instance_id = NULL,
                     worker_claim_token = NULL,
                     worker_heartbeat_at = NULL,
                     lease_expires_at = NULL,
                     lease_renewal_count = 0,
                     updated_at = CURRENT_TIMESTAMP,
                     started_at = NULL,
                     finished_at = NULL
                 WHERE id = ?",
                params![task_id],
            )?;
            summary.requeued_tasks.push(task_id);
        } else {
            tx.execute(
                "UPDATE creative_tasks
                 SET status = 'failed',
                     result_json = NULL,
                     error_message = 'task lease expired and retry limit was reached',
                     worker_id = NULL,
                     worker_runtime_instance_id = NULL,
                     worker_claim_token = NULL,
                     worker_heartbeat_at = NULL,
                     lease_expires_at = NULL,
                     lease_renewal_count = 0,
                     updated_at = CURRENT_TIMESTAMP,
                     finished_at = CURRENT_TIMESTAMP
                 WHERE id = ?",
                params![task_id],
            )?;
            summary.failed_tasks.push(task_id);
        }
    }

    tx.commit()?;
    Ok(summary)
}

pub(crate) fn append_task_event(
    db_path: &Path,
    input: CreateTaskEventInput,
) -> AppResult<TaskEvent> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    conn.execute(
        "INSERT INTO task_events (task_id, event_type, message, payload_json)
         VALUES (?, ?, ?, ?)",
        params![
            input.task_id,
            input.event_type,
            input.message,
            input.payload_json
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_task_event_with_conn(&conn, id)?
        .ok_or_else(|| AppError::Database("浠诲姟浜嬩欢宸插啓鍏ヤ絾鏃犳硶绔嬪嵆璇诲彇".to_string()))
}

#[cfg(test)]
pub(crate) fn list_task_events(db_path: &Path, task_id: i64) -> AppResult<Vec<TaskEvent>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let mut stmt = conn.prepare(
        "SELECT id, task_id, event_type, message, payload_json, created_at
         FROM task_events
         WHERE task_id = ?
         ORDER BY id ASC",
    )?;
    let rows = stmt.query_map(params![task_id], map_task_event)?;
    let mut events = Vec::new();
    for row in rows {
        events.push(row?);
    }
    Ok(events)
}

pub(crate) fn cancel_queued_batch_tasks(db_path: &Path, batch_job_id: i64) -> AppResult<Vec<i64>> {
    let queued_tasks = list_tasks(
        db_path,
        ListCreativeTasksFilter {
            batch_job_id: Some(batch_job_id),
            status: Some("queued".to_string()),
            limit: Some(2000),
            offset: Some(0),
            ..Default::default()
        },
    )?;
    let mut cancelled_ids = Vec::new();
    for task in queued_tasks {
        update_task_status(
            db_path,
            UpdateCreativeTaskStatusInput {
                id: task.id,
                status: "cancelled".to_string(),
                result_json: None,
                error_message: Some("batch cancelled".to_string()),
                asset_id: task.asset_id,
                retry_count_increment: None,
            },
        )?;
        cancelled_ids.push(task.id);
    }
    Ok(cancelled_ids)
}

pub(crate) fn mark_running_batch_tasks_cancelling(
    db_path: &Path,
    batch_job_id: i64,
) -> AppResult<Vec<i64>> {
    let running_tasks = list_tasks(
        db_path,
        ListCreativeTasksFilter {
            batch_job_id: Some(batch_job_id),
            status: Some("running".to_string()),
            limit: Some(2000),
            offset: Some(0),
            ..Default::default()
        },
    )?;
    let mut cancelling_ids = Vec::new();
    for task in running_tasks {
        update_task_status(
            db_path,
            UpdateCreativeTaskStatusInput {
                id: task.id,
                status: "cancelling".to_string(),
                result_json: None,
                error_message: Some("batch cancelling".to_string()),
                asset_id: task.asset_id,
                retry_count_increment: None,
            },
        )?;
        cancelling_ids.push(task.id);
    }
    Ok(cancelling_ids)
}

fn get_task_with_conn(conn: &Connection, id: i64) -> AppResult<Option<CreativeTask>> {
    conn.query_row(
        "SELECT id, project_id, goal_id, batch_job_id, task_type, status, priority,
            payload_json, result_json, error_message, retry_count, max_retries,
            parent_task_id, asset_id, sequence_no, created_at, updated_at, started_at,
            finished_at
         FROM creative_tasks
         WHERE id = ?",
        params![id],
        map_creative_task,
    )
    .optional()
    .map_err(Into::into)
}

fn get_task_event_with_conn(conn: &Connection, id: i64) -> AppResult<Option<TaskEvent>> {
    conn.query_row(
        "SELECT id, task_id, event_type, message, payload_json, created_at
         FROM task_events
         WHERE id = ?",
        params![id],
        map_task_event,
    )
    .optional()
    .map_err(Into::into)
}

fn non_empty_filter(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let trimmed = item.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

#[allow(dead_code)]
fn validate_worker_lease_identity(
    worker_id: &str,
    runtime_instance_id: &str,
    claim_token: &str,
) -> AppResult<()> {
    if worker_id.trim().is_empty()
        || runtime_instance_id.trim().is_empty()
        || claim_token.trim().is_empty()
    {
        return Err(AppError::Config(
            "worker id, runtime instance id, and claim token are required".to_string(),
        ));
    }
    Ok(())
}

#[allow(dead_code)]
fn normalize_lease_complete_status(status: &str) -> AppResult<String> {
    let value = status.trim().to_ascii_lowercase();
    match value.as_str() {
        "succeeded" | "failed" | "cancelled" | "blocked" => Ok(value),
        _ => Err(AppError::Config(
            "leased task completion status must be succeeded, failed, cancelled, or blocked"
                .to_string(),
        )),
    }
}

#[allow(dead_code)]
fn get_lease_renewal_count_with_conn(conn: &Connection, id: i64) -> AppResult<i64> {
    conn.query_row(
        "SELECT lease_renewal_count FROM creative_tasks WHERE id = ?",
        params![id],
        |row| row.get::<_, i64>(0),
    )
    .map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infra::creative_batch_repo;
    use crate::infra::creative_types::{CreateCreativeBatchJobInput, UpdateCreativeBatchJobInput};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_db_path(name: &str) -> std::path::PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "monster_workbench_{}_{}_{}.db",
            name,
            std::process::id(),
            stamp
        ))
    }

    fn queued_task_input(task_type: &str) -> CreateCreativeTaskInput {
        CreateCreativeTaskInput {
            project_id: Some("project-a".to_string()),
            goal_id: None,
            batch_job_id: None,
            task_type: task_type.to_string(),
            status: Some("queued".to_string()),
            priority: Some(10),
            payload_json: Some(r#"{"brief":"poster"}"#.to_string()),
            max_retries: Some(2),
            parent_task_id: None,
            asset_id: None,
            sequence_no: None,
        }
    }

    #[test]
    fn can_create_update_and_list_tasks_with_events() {
        let db_path = temp_db_path("creative_tasks");
        init_schema(&db_path).expect("schema should init");

        let task = create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "generate_image_prompt".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: Some(r#"{"brief":"poster"}"#.to_string()),
                max_retries: Some(2),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )
        .expect("task should be created");
        assert_eq!(task.status, "queued");

        let loaded_task = get_task(&db_path, task.id)
            .expect("task query should pass")
            .expect("task should exist");
        assert_eq!(loaded_task.task_type, "generate_image_prompt");

        let event = append_task_event(
            &db_path,
            CreateTaskEventInput {
                task_id: task.id,
                event_type: "status_changed".to_string(),
                message: Some("draft -> queued".to_string()),
                payload_json: Some(r#"{"from":"draft","to":"queued"}"#.to_string()),
            },
        )
        .expect("event should be created");
        assert_eq!(event.task_id, task.id);

        let updated = update_task_status(
            &db_path,
            UpdateCreativeTaskStatusInput {
                id: task.id,
                status: "succeeded".to_string(),
                result_json: Some(r#"{"assetId":1}"#.to_string()),
                error_message: None,
                asset_id: None,
                retry_count_increment: Some(1),
            },
        )
        .expect("task should update");
        assert_eq!(updated.status, "succeeded");
        assert_eq!(updated.retry_count, 1);

        let events = list_task_events(&db_path, task.id).expect("events should be queryable");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event_type, "status_changed");

        let tasks = list_tasks(
            &db_path,
            ListCreativeTasksFilter {
                project_id: Some("project-a".to_string()),
                status: Some("succeeded".to_string()),
                ..Default::default()
            },
        )
        .expect("tasks should list");
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].id, task.id);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn claim_next_queued_task_with_lease_sets_worker_ownership() {
        let db_path = temp_db_path("creative_task_lease_claim");
        init_schema(&db_path).expect("schema should init");
        let created = create_task(&db_path, queued_task_input("image.prompt.batch"))
            .expect("task should be created");

        let claimed = claim_next_queued_task_with_lease(
            &db_path,
            ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    project_id: Some("project-a".to_string()),
                    task_type: Some("image.prompt.batch".to_string()),
                    limit: Some(1),
                    offset: Some(0),
                    ..Default::default()
                },
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-token-a".to_string(),
                claimed_at: "2026-06-13 10:00:00".to_string(),
                lease_expires_at: "2026-06-13 10:05:00".to_string(),
            },
        )
        .expect("claim should pass")
        .expect("queued task should be claimed");

        assert_eq!(claimed.task.id, created.id);
        assert_eq!(claimed.task.status, "running");
        assert_eq!(claimed.worker_id, "worker-a");
        assert_eq!(claimed.runtime_instance_id, "runtime-a");
        assert_eq!(claimed.claim_token, "claim-token-a");
        assert_eq!(claimed.lease_expires_at, "2026-06-13 10:05:00");

        let conn = connect(&db_path).expect("db should connect");
        let lease_row: (String, String, String, String, String, i64) = conn
            .query_row(
                "SELECT worker_id,
                        worker_runtime_instance_id,
                        worker_claim_token,
                        worker_claimed_at,
                        lease_expires_at,
                        lease_renewal_count
                 FROM creative_tasks
                 WHERE id = ?",
                params![created.id],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                    ))
                },
            )
            .expect("lease row should query");
        assert_eq!(
            lease_row,
            (
                "worker-a".to_string(),
                "runtime-a".to_string(),
                "claim-token-a".to_string(),
                "2026-06-13 10:00:00".to_string(),
                "2026-06-13 10:05:00".to_string(),
                0
            )
        );

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn legacy_claim_only_picks_batch_tasks_when_batch_is_running() {
        let db_path = temp_db_path("creative_task_legacy_batch_status");
        init_schema(&db_path).expect("schema should init");
        let job = creative_batch_repo::create_batch_job(
            &db_path,
            CreateCreativeBatchJobInput {
                project_id: Some("project-a".to_string()),
                name: "Prompt batch".to_string(),
                batch_type: "image.prompt.batch".to_string(),
                status: Some("draft".to_string()),
                total_count: Some(1),
                concurrency: Some(1),
                max_retries: Some(1),
                prompt_template: Some("Render {{sequenceNo}}".to_string()),
                provider_id: None,
                model: None,
                image_size: None,
                budget_json: None,
            },
        )
        .expect("batch job should create");
        let task = create_task(
            &db_path,
            CreateCreativeTaskInput {
                batch_job_id: Some(job.id),
                sequence_no: Some(1),
                ..queued_task_input("image.prompt.batch")
            },
        )
        .expect("task should create");

        let draft_claim = claim_next_queued_task(
            &db_path,
            ListCreativeTasksFilter {
                project_id: Some("project-a".to_string()),
                task_type: Some("image.prompt.batch".to_string()),
                limit: Some(1),
                offset: Some(0),
                ..Default::default()
            },
        )
        .expect("draft claim should not error");
        assert!(draft_claim.is_none());

        creative_batch_repo::update_batch_job(
            &db_path,
            UpdateCreativeBatchJobInput {
                id: job.id,
                status: Some("running".to_string()),
                concurrency: None,
                max_retries: None,
                prompt_template: None,
                provider_id: None,
                model: None,
                image_size: None,
                budget_json: None,
                started_at: Some("2026-06-13 10:00:00".to_string()),
                finished_at: None,
            },
        )
        .expect("batch should update");

        let running_claim = claim_next_queued_task(
            &db_path,
            ListCreativeTasksFilter {
                project_id: Some("project-a".to_string()),
                task_type: Some("image.prompt.batch".to_string()),
                limit: Some(1),
                offset: Some(0),
                ..Default::default()
            },
        )
        .expect("running claim should pass")
        .expect("running batch task should claim");
        assert_eq!(running_claim.id, task.id);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn legacy_claim_respects_batch_concurrency_with_leased_workers() {
        let db_path = temp_db_path("creative_task_legacy_batch_concurrency");
        init_schema(&db_path).expect("schema should init");
        let job = creative_batch_repo::create_batch_job(
            &db_path,
            CreateCreativeBatchJobInput {
                project_id: Some("project-a".to_string()),
                name: "Prompt batch".to_string(),
                batch_type: "image.prompt.batch".to_string(),
                status: Some("running".to_string()),
                total_count: Some(2),
                concurrency: Some(1),
                max_retries: Some(1),
                prompt_template: Some("Render {{sequenceNo}}".to_string()),
                provider_id: None,
                model: None,
                image_size: None,
                budget_json: None,
            },
        )
        .expect("batch job should create");
        let first_task = create_task(
            &db_path,
            CreateCreativeTaskInput {
                batch_job_id: Some(job.id),
                sequence_no: Some(1),
                ..queued_task_input("image.prompt.batch")
            },
        )
        .expect("first task should create");
        let second_task = create_task(
            &db_path,
            CreateCreativeTaskInput {
                batch_job_id: Some(job.id),
                sequence_no: Some(2),
                ..queued_task_input("image.prompt.batch")
            },
        )
        .expect("second task should create");

        let first_claim = claim_next_queued_task_with_lease(
            &db_path,
            ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    project_id: Some("project-a".to_string()),
                    task_type: Some("image.prompt.batch".to_string()),
                    limit: Some(1),
                    offset: Some(0),
                    ..Default::default()
                },
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-a".to_string(),
                claimed_at: "2026-06-13 10:00:00".to_string(),
                lease_expires_at: "2026-06-13 10:05:00".to_string(),
            },
        )
        .expect("lease claim should pass")
        .expect("first task should claim");
        assert_eq!(first_claim.task.id, first_task.id);

        let blocked_legacy_claim = claim_next_queued_task(
            &db_path,
            ListCreativeTasksFilter {
                project_id: Some("project-a".to_string()),
                task_type: Some("image.prompt.batch".to_string()),
                limit: Some(1),
                offset: Some(0),
                ..Default::default()
            },
        )
        .expect("legacy claim should not error");
        assert!(blocked_legacy_claim.is_none());

        complete_task_with_lease(
            &db_path,
            CompleteTaskLeaseInput {
                task_id: first_task.id,
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: first_claim.claim_token,
                now: "2026-06-13 10:01:00".to_string(),
                status: "succeeded".to_string(),
                result_json: Some(r#"{"ok":true}"#.to_string()),
                error_message: None,
                asset_id: None,
            },
        )
        .expect("completion should pass")
        .expect("first task should complete");

        let second_claim = claim_next_queued_task(
            &db_path,
            ListCreativeTasksFilter {
                project_id: Some("project-a".to_string()),
                task_type: Some("image.prompt.batch".to_string()),
                limit: Some(1),
                offset: Some(0),
                ..Default::default()
            },
        )
        .expect("second legacy claim should pass")
        .expect("second task should claim after slot frees");
        assert_eq!(second_claim.id, second_task.id);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn lease_claim_only_picks_batch_tasks_when_batch_is_running() {
        let db_path = temp_db_path("creative_task_lease_batch_status");
        init_schema(&db_path).expect("schema should init");
        let job = creative_batch_repo::create_batch_job(
            &db_path,
            CreateCreativeBatchJobInput {
                project_id: Some("project-a".to_string()),
                name: "Prompt batch".to_string(),
                batch_type: "image.prompt.batch".to_string(),
                status: Some("draft".to_string()),
                total_count: Some(1),
                concurrency: Some(1),
                max_retries: Some(1),
                prompt_template: Some("Render {{sequenceNo}}".to_string()),
                provider_id: None,
                model: None,
                image_size: None,
                budget_json: None,
            },
        )
        .expect("batch job should create");
        let task = create_task(
            &db_path,
            CreateCreativeTaskInput {
                batch_job_id: Some(job.id),
                sequence_no: Some(1),
                ..queued_task_input("image.prompt.batch")
            },
        )
        .expect("task should create");

        let draft_claim = claim_next_queued_task_with_lease(
            &db_path,
            ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    project_id: Some("project-a".to_string()),
                    task_type: Some("image.prompt.batch".to_string()),
                    limit: Some(1),
                    offset: Some(0),
                    ..Default::default()
                },
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-a".to_string(),
                claimed_at: "2026-06-13 10:00:00".to_string(),
                lease_expires_at: "2026-06-13 10:05:00".to_string(),
            },
        )
        .expect("draft claim should be handled");
        assert!(draft_claim.is_none());

        creative_batch_repo::update_batch_job(
            &db_path,
            UpdateCreativeBatchJobInput {
                id: job.id,
                status: Some("running".to_string()),
                concurrency: None,
                max_retries: None,
                prompt_template: None,
                provider_id: None,
                model: None,
                image_size: None,
                budget_json: None,
                started_at: Some("2026-06-13 10:00:00".to_string()),
                finished_at: None,
            },
        )
        .expect("batch should update");

        let running_claim = claim_next_queued_task_with_lease(
            &db_path,
            ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    project_id: Some("project-a".to_string()),
                    task_type: Some("image.prompt.batch".to_string()),
                    limit: Some(1),
                    offset: Some(0),
                    ..Default::default()
                },
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-b".to_string(),
                claimed_at: "2026-06-13 10:00:00".to_string(),
                lease_expires_at: "2026-06-13 10:05:00".to_string(),
            },
        )
        .expect("running claim should pass")
        .expect("running batch task should claim");
        assert_eq!(running_claim.task.id, task.id);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn lease_claim_respects_batch_concurrency() {
        let db_path = temp_db_path("creative_task_lease_batch_concurrency");
        init_schema(&db_path).expect("schema should init");
        let job = creative_batch_repo::create_batch_job(
            &db_path,
            CreateCreativeBatchJobInput {
                project_id: Some("project-a".to_string()),
                name: "Prompt batch".to_string(),
                batch_type: "image.prompt.batch".to_string(),
                status: Some("running".to_string()),
                total_count: Some(2),
                concurrency: Some(1),
                max_retries: Some(1),
                prompt_template: Some("Render {{sequenceNo}}".to_string()),
                provider_id: None,
                model: None,
                image_size: None,
                budget_json: None,
            },
        )
        .expect("batch job should create");
        let first_task = create_task(
            &db_path,
            CreateCreativeTaskInput {
                batch_job_id: Some(job.id),
                sequence_no: Some(1),
                ..queued_task_input("image.prompt.batch")
            },
        )
        .expect("first task should create");
        let second_task = create_task(
            &db_path,
            CreateCreativeTaskInput {
                batch_job_id: Some(job.id),
                sequence_no: Some(2),
                ..queued_task_input("image.prompt.batch")
            },
        )
        .expect("second task should create");

        let first_claim = claim_next_queued_task_with_lease(
            &db_path,
            ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    project_id: Some("project-a".to_string()),
                    task_type: Some("image.prompt.batch".to_string()),
                    limit: Some(1),
                    offset: Some(0),
                    ..Default::default()
                },
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-a".to_string(),
                claimed_at: "2026-06-13 10:00:00".to_string(),
                lease_expires_at: "2026-06-13 10:05:00".to_string(),
            },
        )
        .expect("first claim should pass")
        .expect("first task should claim");
        assert_eq!(first_claim.task.id, first_task.id);

        let blocked_claim = claim_next_queued_task_with_lease(
            &db_path,
            ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    project_id: Some("project-a".to_string()),
                    task_type: Some("image.prompt.batch".to_string()),
                    limit: Some(1),
                    offset: Some(0),
                    ..Default::default()
                },
                worker_id: "worker-b".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-b".to_string(),
                claimed_at: "2026-06-13 10:01:00".to_string(),
                lease_expires_at: "2026-06-13 10:06:00".to_string(),
            },
        )
        .expect("blocked claim should not error");
        assert!(blocked_claim.is_none());

        complete_task_with_lease(
            &db_path,
            CompleteTaskLeaseInput {
                task_id: first_task.id,
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: first_claim.claim_token,
                now: "2026-06-13 10:01:30".to_string(),
                status: "succeeded".to_string(),
                result_json: Some(r#"{"ok":true}"#.to_string()),
                error_message: None,
                asset_id: None,
            },
        )
        .expect("complete should pass")
        .expect("first task should complete");

        let second_claim = claim_next_queued_task_with_lease(
            &db_path,
            ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    project_id: Some("project-a".to_string()),
                    task_type: Some("image.prompt.batch".to_string()),
                    limit: Some(1),
                    offset: Some(0),
                    ..Default::default()
                },
                worker_id: "worker-b".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-c".to_string(),
                claimed_at: "2026-06-13 10:02:00".to_string(),
                lease_expires_at: "2026-06-13 10:07:00".to_string(),
            },
        )
        .expect("second claim should pass")
        .expect("second task should claim after slot frees");
        assert_eq!(second_claim.task.id, second_task.id);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn heartbeat_task_lease_requires_current_owner_and_unexpired_lease() {
        let db_path = temp_db_path("creative_task_lease_heartbeat");
        init_schema(&db_path).expect("schema should init");
        let created = create_task(&db_path, queued_task_input("image.generate.batch"))
            .expect("task should be created");
        claim_next_queued_task_with_lease(
            &db_path,
            ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter::default(),
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-token-a".to_string(),
                claimed_at: "2026-06-13 10:00:00".to_string(),
                lease_expires_at: "2026-06-13 10:05:00".to_string(),
            },
        )
        .expect("claim should pass")
        .expect("task should be claimed");

        let wrong_token = heartbeat_task_lease(
            &db_path,
            HeartbeatTaskLeaseInput {
                task_id: created.id,
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "wrong-token".to_string(),
                now: "2026-06-13 10:01:00".to_string(),
                heartbeat_at: "2026-06-13 10:01:00".to_string(),
                lease_expires_at: "2026-06-13 10:06:00".to_string(),
            },
        )
        .expect("heartbeat should not error");
        assert!(wrong_token.is_none());

        let heartbeat = heartbeat_task_lease(
            &db_path,
            HeartbeatTaskLeaseInput {
                task_id: created.id,
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-token-a".to_string(),
                now: "2026-06-13 10:01:00".to_string(),
                heartbeat_at: "2026-06-13 10:01:00".to_string(),
                lease_expires_at: "2026-06-13 10:06:00".to_string(),
            },
        )
        .expect("heartbeat should pass")
        .expect("lease should renew");
        assert_eq!(heartbeat.task.id, created.id);
        assert_eq!(heartbeat.lease_expires_at, "2026-06-13 10:06:00");
        assert_eq!(heartbeat.lease_renewal_count, 1);

        let expired = heartbeat_task_lease(
            &db_path,
            HeartbeatTaskLeaseInput {
                task_id: created.id,
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-token-a".to_string(),
                now: "2026-06-13 10:07:00".to_string(),
                heartbeat_at: "2026-06-13 10:07:00".to_string(),
                lease_expires_at: "2026-06-13 10:12:00".to_string(),
            },
        )
        .expect("expired heartbeat should not error");
        assert!(expired.is_none());

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn complete_task_with_lease_rejects_wrong_or_expired_owner() {
        let db_path = temp_db_path("creative_task_lease_complete");
        init_schema(&db_path).expect("schema should init");
        let created = create_task(&db_path, queued_task_input("image.prompt.batch"))
            .expect("task should be created");
        claim_next_queued_task_with_lease(
            &db_path,
            ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter::default(),
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-token-a".to_string(),
                claimed_at: "2026-06-13 10:00:00".to_string(),
                lease_expires_at: "2026-06-13 10:05:00".to_string(),
            },
        )
        .expect("claim should pass")
        .expect("task should be claimed");

        let wrong_token = complete_task_with_lease(
            &db_path,
            CompleteTaskLeaseInput {
                task_id: created.id,
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "wrong-token".to_string(),
                now: "2026-06-13 10:01:00".to_string(),
                status: "succeeded".to_string(),
                result_json: Some(r#"{"ok":true}"#.to_string()),
                error_message: None,
                asset_id: None,
            },
        )
        .expect("wrong owner should not error");
        assert!(wrong_token.is_none());

        let expired = complete_task_with_lease(
            &db_path,
            CompleteTaskLeaseInput {
                task_id: created.id,
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-token-a".to_string(),
                now: "2026-06-13 10:06:00".to_string(),
                status: "succeeded".to_string(),
                result_json: Some(r#"{"ok":true}"#.to_string()),
                error_message: None,
                asset_id: None,
            },
        )
        .expect("expired owner should not error");
        assert!(expired.is_none());

        let completed = complete_task_with_lease(
            &db_path,
            CompleteTaskLeaseInput {
                task_id: created.id,
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-token-a".to_string(),
                now: "2026-06-13 10:02:00".to_string(),
                status: "succeeded".to_string(),
                result_json: Some(r#"{"ok":true}"#.to_string()),
                error_message: None,
                asset_id: None,
            },
        )
        .expect("completion should pass")
        .expect("task should complete");
        assert_eq!(completed.status, "succeeded");
        assert_eq!(completed.result_json, Some(r#"{"ok":true}"#.to_string()));

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn recover_expired_task_leases_requeues_fails_and_cancels_by_state() {
        let db_path = temp_db_path("creative_task_lease_recover");
        init_schema(&db_path).expect("schema should init");

        let requeue_task = create_task(&db_path, queued_task_input("image.prompt.batch"))
            .expect("requeue task should create");
        claim_next_queued_task_with_lease(
            &db_path,
            ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    task_type: Some("image.prompt.batch".to_string()),
                    ..Default::default()
                },
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-token-a".to_string(),
                claimed_at: "2026-06-13 10:00:00".to_string(),
                lease_expires_at: "2026-06-13 10:05:00".to_string(),
            },
        )
        .expect("requeue claim should pass")
        .expect("requeue task should claim");

        let fail_task = create_task(
            &db_path,
            CreateCreativeTaskInput {
                max_retries: Some(0),
                ..queued_task_input("image.generate.batch")
            },
        )
        .expect("fail task should create");
        claim_next_queued_task_with_lease(
            &db_path,
            ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    task_type: Some("image.generate.batch".to_string()),
                    ..Default::default()
                },
                worker_id: "worker-b".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-token-b".to_string(),
                claimed_at: "2026-06-13 10:00:00".to_string(),
                lease_expires_at: "2026-06-13 10:05:00".to_string(),
            },
        )
        .expect("fail claim should pass")
        .expect("fail task should claim");

        let cancel_task = create_task(&db_path, queued_task_input("review.asset"))
            .expect("cancel task should create");
        claim_next_queued_task_with_lease(
            &db_path,
            ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    task_type: Some("review.asset".to_string()),
                    ..Default::default()
                },
                worker_id: "worker-c".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-token-c".to_string(),
                claimed_at: "2026-06-13 10:00:00".to_string(),
                lease_expires_at: "2026-06-13 10:05:00".to_string(),
            },
        )
        .expect("cancel claim should pass")
        .expect("cancel task should claim");
        update_task_status(
            &db_path,
            UpdateCreativeTaskStatusInput {
                id: cancel_task.id,
                status: "cancelling".to_string(),
                result_json: None,
                error_message: Some("cancel requested".to_string()),
                asset_id: None,
                retry_count_increment: None,
            },
        )
        .expect("task should become cancelling");

        let summary = recover_expired_task_leases(
            &db_path,
            RecoverExpiredTaskLeasesInput {
                now: "2026-06-13 10:06:00".to_string(),
                limit: 10,
            },
        )
        .expect("expired leases should recover");
        assert_eq!(summary.requeued_tasks, vec![requeue_task.id]);
        assert_eq!(summary.failed_tasks, vec![fail_task.id]);
        assert_eq!(summary.cancelled_tasks, vec![cancel_task.id]);

        let requeued = get_task(&db_path, requeue_task.id)
            .expect("requeued task should query")
            .expect("requeued task should exist");
        assert_eq!(requeued.status, "queued");
        assert_eq!(requeued.retry_count, 1);

        let failed = get_task(&db_path, fail_task.id)
            .expect("failed task should query")
            .expect("failed task should exist");
        assert_eq!(failed.status, "failed");

        let cancelled = get_task(&db_path, cancel_task.id)
            .expect("cancelled task should query")
            .expect("cancelled task should exist");
        assert_eq!(cancelled.status, "cancelled");

        let conn = connect(&db_path).expect("db should connect");
        let remaining_leases: i64 = conn
            .query_row(
                "SELECT COUNT(*)
                 FROM creative_tasks
                 WHERE worker_claim_token IS NOT NULL
                    OR lease_expires_at IS NOT NULL",
                [],
                |row| row.get(0),
            )
            .expect("remaining leases should query");
        assert_eq!(remaining_leases, 0);

        let _ = std::fs::remove_file(db_path);
    }
}
