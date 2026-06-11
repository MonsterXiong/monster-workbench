use crate::infra::creative_types::{
    CreateCreativeTaskInput, CreateTaskEventInput, CreativeTask,
    ListCreativeTasksFilter, TaskEvent, UpdateCreativeTaskStatusInput,
};
use crate::infra::creative_db_schema::init_schema;
use crate::infra::creative_db_support::{connect, map_creative_task, map_task_event};
use crate::infra::{AppError, AppResult};
use rusqlite::{params, params_from_iter, types::Value, Connection, OptionalExtension};
use std::path::Path;

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
         WHERE status = 'queued'",
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
         WHERE id = ? AND status = 'queued'",
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

#[cfg(test)]
mod tests {
    use super::*;
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
}

