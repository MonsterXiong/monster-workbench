use crate::infra::creative_db::{
    CreativeProject, ListCreativeProjectsFilter, UpsertCreativeProjectInput,
};
use crate::infra::creative_db_schema::init_schema;
use crate::infra::creative_db_support::{connect, map_creative_project};
use crate::infra::{AppError, AppResult};
use rusqlite::{params, params_from_iter, types::Value, Connection, OptionalExtension};
use std::path::Path;

pub(crate) fn upsert_project(
    db_path: &Path,
    input: UpsertCreativeProjectInput,
) -> AppResult<CreativeProject> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let id = normalize_project_id(&input.id)?;
    let title = normalize_project_title(&input.title)?;
    let status = input.status.unwrap_or_else(|| "active".to_string());
    let archived_at = input.archived_at;

    conn.execute(
        "INSERT INTO creative_projects (
            id, title, description, status, settings_json, budget_json, created_at, updated_at, archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            status = excluded.status,
            settings_json = excluded.settings_json,
            budget_json = excluded.budget_json,
            archived_at = excluded.archived_at,
            updated_at = CURRENT_TIMESTAMP",
        params![
            id,
            title,
            input.description,
            status,
            input.settings_json,
            input.budget_json,
            archived_at
        ],
    )?;

    get_project_with_conn(&conn, &id)?
        .ok_or_else(|| AppError::Database("project upserted but could not be reloaded".to_string()))
}

pub(crate) fn get_project(db_path: &Path, id: &str) -> AppResult<Option<CreativeProject>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let id = normalize_project_id(id)?;
    get_project_with_conn(&conn, &id)
}

pub(crate) fn list_projects(
    db_path: &Path,
    filter: ListCreativeProjectsFilter,
) -> AppResult<Vec<CreativeProject>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let mut sql = String::from(
        "SELECT id, title, description, status, settings_json, budget_json, created_at, updated_at, archived_at
         FROM creative_projects
         WHERE 1 = 1",
    );
    let mut params = Vec::<Value>::new();

    if let Some(status) = non_empty_filter(filter.status) {
        sql.push_str(" AND status = ?");
        params.push(Value::Text(status));
    }

    sql.push_str(" ORDER BY updated_at DESC, id ASC LIMIT ? OFFSET ?");
    params.push(Value::Integer(filter.limit.unwrap_or(50).clamp(1, 200)));
    params.push(Value::Integer(filter.offset.unwrap_or(0).max(0)));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(params.iter()), map_creative_project)?;
    let mut projects = Vec::new();
    for row in rows {
        projects.push(row?);
    }
    Ok(projects)
}

fn normalize_project_id(id: &str) -> AppResult<String> {
    let trimmed = id.trim();
    if trimmed.is_empty() {
        return Err(AppError::Config("project id is required".to_string()));
    }
    Ok(trimmed.to_string())
}

fn normalize_project_title(title: &str) -> AppResult<String> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err(AppError::Config("project title is required".to_string()));
    }
    Ok(trimmed.to_string())
}

fn get_project_with_conn(conn: &Connection, id: &str) -> AppResult<Option<CreativeProject>> {
    conn.query_row(
        "SELECT id, title, description, status, settings_json, budget_json, created_at, updated_at, archived_at
         FROM creative_projects
         WHERE id = ?",
        params![id],
        map_creative_project,
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
