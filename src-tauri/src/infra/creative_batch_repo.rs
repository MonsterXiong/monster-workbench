use crate::infra::creative_db::{
    CreateCreativeBatchJobInput, CreativeBatchJob, CreativeBatchJobSnapshot,
    CreativeBatchJobStats, CreativeTask, ListCreativeBatchJobsFilter, ListCreativeTasksFilter,
    UpdateCreativeBatchJobInput,
};
use crate::infra::creative_db_schema::init_schema;
use crate::infra::creative_db_support::{connect, map_creative_batch_job};
use crate::infra::creative_task_repo;
use crate::infra::{AppError, AppResult};
use rusqlite::{params, params_from_iter, types::Value, Connection, OptionalExtension};
use std::path::Path;

pub(crate) fn create_batch_job(
    db_path: &Path,
    input: CreateCreativeBatchJobInput,
) -> AppResult<CreativeBatchJob> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let status = input.status.unwrap_or_else(|| "draft".to_string());
    conn.execute(
        "INSERT INTO batch_jobs (
            project_id, name, batch_type, status, total_count, concurrency,
            max_retries, prompt_template, provider_id, model, image_size, budget_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            input.project_id,
            input.name,
            input.batch_type,
            status,
            input.total_count.unwrap_or(0).max(0),
            input.concurrency.unwrap_or(1).max(1),
            input.max_retries.unwrap_or(0).max(0),
            input.prompt_template,
            input.provider_id,
            input.model,
            input.image_size,
            input.budget_json,
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_batch_job_with_conn(&conn, id)?.ok_or_else(|| {
        AppError::Database("batch job created but could not be reloaded".to_string())
    })
}

pub(crate) fn get_batch_job(db_path: &Path, id: i64) -> AppResult<Option<CreativeBatchJob>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    get_batch_job_with_conn(&conn, id)
}

pub(crate) fn list_batch_jobs(
    db_path: &Path,
    filter: ListCreativeBatchJobsFilter,
) -> AppResult<Vec<CreativeBatchJob>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let mut sql = String::from(
        "SELECT id, project_id, name, batch_type, status, total_count, concurrency,
            max_retries, prompt_template, provider_id, model, image_size, budget_json,
            created_at, updated_at, started_at, finished_at
         FROM batch_jobs
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
    if let Some(batch_type) = non_empty_filter(filter.batch_type) {
        sql.push_str(" AND batch_type = ?");
        params.push(Value::Text(batch_type));
    }

    sql.push_str(" ORDER BY id DESC LIMIT ? OFFSET ?");
    params.push(Value::Integer(filter.limit.unwrap_or(50).clamp(1, 200)));
    params.push(Value::Integer(filter.offset.unwrap_or(0).max(0)));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(params.iter()), map_creative_batch_job)?;
    let mut jobs = Vec::new();
    for row in rows {
        jobs.push(row?);
    }
    Ok(jobs)
}

pub(crate) fn update_batch_job(
    db_path: &Path,
    input: UpdateCreativeBatchJobInput,
) -> AppResult<CreativeBatchJob> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    conn.execute(
        "UPDATE batch_jobs
         SET status = COALESCE(?, status),
             concurrency = COALESCE(?, concurrency),
             max_retries = COALESCE(?, max_retries),
             prompt_template = COALESCE(?, prompt_template),
             provider_id = COALESCE(?, provider_id),
             model = COALESCE(?, model),
             image_size = COALESCE(?, image_size),
             budget_json = COALESCE(?, budget_json),
             started_at = CASE
                 WHEN ? IS NOT NULL THEN ?
                 WHEN COALESCE(?, status) = 'running' AND started_at IS NULL THEN CURRENT_TIMESTAMP
                 ELSE started_at
             END,
             finished_at = CASE
                 WHEN ? IS NOT NULL THEN ?
                 WHEN COALESCE(?, status) IN ('completed', 'cancelled', 'failed', 'blocked')
                      AND finished_at IS NULL THEN CURRENT_TIMESTAMP
                 ELSE finished_at
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?",
        params![
            input.status,
            input.concurrency,
            input.max_retries,
            input.prompt_template,
            input.provider_id,
            input.model,
            input.image_size,
            input.budget_json,
            input.started_at,
            input.started_at,
            input.status,
            input.finished_at,
            input.finished_at,
            input.status,
            input.id,
        ],
    )?;
    get_batch_job_with_conn(&conn, input.id)?.ok_or_else(|| {
        AppError::Database("batch job updated but could not be reloaded".to_string())
    })
}

pub(crate) fn list_batch_job_tasks(
    db_path: &Path,
    batch_job_id: i64,
) -> AppResult<Vec<CreativeTask>> {
    creative_task_repo::list_tasks(
        db_path,
        ListCreativeTasksFilter {
            batch_job_id: Some(batch_job_id),
            limit: Some(200),
            offset: Some(0),
            ..Default::default()
        },
    )
}

pub(crate) fn count_batch_job_tasks_by_status(
    db_path: &Path,
    batch_job_id: i64,
) -> AppResult<CreativeBatchJobStats> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let mut stmt = conn.prepare(
        "SELECT status, COUNT(*)
         FROM creative_tasks
         WHERE batch_job_id = ?
         GROUP BY status",
    )?;
    let rows = stmt.query_map(params![batch_job_id], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
    })?;

    let mut stats = CreativeBatchJobStats {
        total_tasks: 0,
        draft_tasks: 0,
        queued_tasks: 0,
        running_tasks: 0,
        succeeded_tasks: 0,
        failed_tasks: 0,
        cancelled_tasks: 0,
        cancelling_tasks: 0,
        paused: false,
        completion_ratio: 0.0,
    };

    for row in rows {
        let (status, count) = row?;
        stats.total_tasks += count;
        match status.as_str() {
            "draft" => stats.draft_tasks += count,
            "queued" | "retrying" => stats.queued_tasks += count,
            "running" => stats.running_tasks += count,
            "succeeded" | "completed" | "done" => stats.succeeded_tasks += count,
            "failed" => stats.failed_tasks += count,
            "cancelled" => stats.cancelled_tasks += count,
            "cancelling" => stats.cancelling_tasks += count,
            _ => {}
        }
    }

    if stats.total_tasks > 0 {
        stats.completion_ratio =
            (stats.succeeded_tasks + stats.failed_tasks + stats.cancelled_tasks) as f64
                / stats.total_tasks as f64;
    }

    Ok(stats)
}

pub(crate) fn get_batch_job_snapshot(
    db_path: &Path,
    batch_job_id: i64,
) -> AppResult<Option<CreativeBatchJobSnapshot>> {
    let Some(job) = get_batch_job(db_path, batch_job_id)? else {
        return Ok(None);
    };
    let mut stats = count_batch_job_tasks_by_status(db_path, batch_job_id)?;
    stats.paused = job.status == "paused";
    Ok(Some(CreativeBatchJobSnapshot { job, stats }))
}

pub(crate) fn cancel_queued_batch_tasks(db_path: &Path, batch_job_id: i64) -> AppResult<Vec<i64>> {
    creative_task_repo::cancel_queued_batch_tasks(db_path, batch_job_id)
}

pub(crate) fn mark_running_batch_tasks_cancelling(
    db_path: &Path,
    batch_job_id: i64,
) -> AppResult<Vec<i64>> {
    creative_task_repo::mark_running_batch_tasks_cancelling(db_path, batch_job_id)
}

fn get_batch_job_with_conn(conn: &Connection, id: i64) -> AppResult<Option<CreativeBatchJob>> {
    conn.query_row(
        "SELECT id, project_id, name, batch_type, status, total_count, concurrency,
            max_retries, prompt_template, provider_id, model, image_size, budget_json,
            created_at, updated_at, started_at, finished_at
         FROM batch_jobs
         WHERE id = ?",
        params![id],
        map_creative_batch_job,
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
