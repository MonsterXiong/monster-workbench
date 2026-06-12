use crate::infra::creative_db_schema::init_schema;
use crate::infra::creative_db_support::{connect, map_model_run};
#[cfg(test)]
use crate::infra::creative_types::ListModelRunsFilter;
use crate::infra::creative_types::{CreateModelRunInput, ModelRun};
use crate::infra::{AppError, AppResult};
use rusqlite::{params, Connection, OptionalExtension};
#[cfg(test)]
use rusqlite::{params_from_iter, types::Value};
use std::path::Path;

pub(crate) fn create_model_run(db_path: &Path, input: CreateModelRunInput) -> AppResult<ModelRun> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    conn.execute(
        "INSERT INTO model_runs (
            project_id, task_id, asset_id, provider_id, provider_type, model,
            request_type, status, duration_ms, prompt_hash, prompt_version_id,
            input_token_count, output_token_count, cost_estimate, error_code,
            error_message, metadata_json, finished_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            input.project_id,
            input.task_id,
            input.asset_id,
            input.provider_id,
            input.provider_type,
            input.model,
            input.request_type,
            input.status,
            input.duration_ms,
            input.prompt_hash,
            input.prompt_version_id,
            input.input_token_count,
            input.output_token_count,
            input.cost_estimate,
            input.error_code,
            input.error_message,
            input.metadata_json,
            input.finished_at,
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_model_run_with_conn(&conn, id)?.ok_or_else(|| {
        AppError::Database("model run created but could not be reloaded".to_string())
    })
}

#[cfg(test)]
pub(crate) fn list_model_runs(
    db_path: &Path,
    filter: ListModelRunsFilter,
) -> AppResult<Vec<ModelRun>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let mut sql = String::from(
        "SELECT id, project_id, task_id, asset_id, provider_id, provider_type, model,
            request_type, status, duration_ms, prompt_hash, prompt_version_id,
            input_token_count, output_token_count, cost_estimate, error_code,
            error_message, metadata_json, created_at, finished_at
         FROM model_runs
         WHERE 1 = 1",
    );
    let mut params = Vec::<Value>::new();

    if let Some(project_id) = non_empty_filter(filter.project_id) {
        sql.push_str(" AND project_id = ?");
        params.push(Value::Text(project_id));
    }
    if let Some(task_id) = filter.task_id {
        sql.push_str(" AND task_id = ?");
        params.push(Value::Integer(task_id));
    }
    if let Some(asset_id) = filter.asset_id {
        sql.push_str(" AND asset_id = ?");
        params.push(Value::Integer(asset_id));
    }
    if let Some(request_type) = non_empty_filter(filter.request_type) {
        sql.push_str(" AND request_type = ?");
        params.push(Value::Text(request_type));
    }
    if let Some(status) = non_empty_filter(filter.status) {
        sql.push_str(" AND status = ?");
        params.push(Value::Text(status));
    }

    sql.push_str(" ORDER BY id DESC LIMIT ? OFFSET ?");
    params.push(Value::Integer(filter.limit.unwrap_or(50).clamp(1, 200)));
    params.push(Value::Integer(filter.offset.unwrap_or(0).max(0)));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(params.iter()), map_model_run)?;
    let mut runs = Vec::new();
    for row in rows {
        runs.push(row?);
    }
    Ok(runs)
}

fn get_model_run_with_conn(conn: &Connection, id: i64) -> AppResult<Option<ModelRun>> {
    conn.query_row(
        "SELECT id, project_id, task_id, asset_id, provider_id, provider_type, model,
            request_type, status, duration_ms, prompt_hash, prompt_version_id,
            input_token_count, output_token_count, cost_estimate, error_code,
            error_message, metadata_json, created_at, finished_at
         FROM model_runs
         WHERE id = ?",
        params![id],
        map_model_run,
    )
    .optional()
    .map_err(Into::into)
}

#[cfg(test)]
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
    use crate::infra::creative_task_repo;
    use crate::infra::creative_types::CreateCreativeTaskInput;
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
    fn can_create_and_list_model_runs() {
        let db_path = temp_db_path("creative_model_runs");
        init_schema(&db_path).expect("schema should init");

        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-model".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "demo.image.prompt".to_string(),
                status: Some("queued".to_string()),
                priority: Some(0),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )
        .expect("task should create");

        let run = create_model_run(
            &db_path,
            CreateModelRunInput {
                project_id: Some("project-model".to_string()),
                task_id: Some(task.id),
                asset_id: None,
                provider_id: Some("demo-provider".to_string()),
                provider_type: Some("custom".to_string()),
                model: Some("chat-test".to_string()),
                request_type: "chat".to_string(),
                status: "succeeded".to_string(),
                duration_ms: Some(420),
                prompt_hash: Some("abc".to_string()),
                prompt_version_id: None,
                input_token_count: None,
                output_token_count: None,
                cost_estimate: None,
                error_code: None,
                error_message: None,
                metadata_json: Some(r#"{"demo":true}"#.to_string()),
                finished_at: None,
            },
        )
        .expect("model run should create");
        assert_eq!(run.request_type, "chat");

        let runs = list_model_runs(
            &db_path,
            ListModelRunsFilter {
                task_id: Some(task.id),
                ..Default::default()
            },
        )
        .expect("model runs should list");
        assert_eq!(runs.len(), 1);
        assert_eq!(runs[0].id, run.id);

        let _ = std::fs::remove_file(db_path);
    }
}
