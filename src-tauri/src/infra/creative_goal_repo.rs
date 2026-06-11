use crate::infra::creative_db::{
    CreateCreativeGoalInput, CreateCreativeGoalRoleInput,
    CreativeGoal, CreativeGoalRole, CreativeTask, ListCreativeGoalRolesFilter,
    ListCreativeGoalsFilter, ListCreativeTasksFilter, UpdateCreativeGoalStatusInput,
};
use crate::infra::creative_db_schema::init_schema;
use crate::infra::creative_db_support::{connect, map_creative_goal, map_creative_goal_role};
use crate::infra::creative_task_repo;
use crate::infra::{AppError, AppResult};
use rusqlite::{params, params_from_iter, types::Value, Connection, OptionalExtension};
use std::path::Path;

pub(crate) fn create_goal(
    db_path: &Path,
    input: CreateCreativeGoalInput,
) -> AppResult<CreativeGoal> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let status = input.status.unwrap_or_else(|| "draft".to_string());
    conn.execute(
        "INSERT INTO creative_goals (project_id, title, description, status, budget_json)
         VALUES (?, ?, ?, ?, ?)",
        params![
            input.project_id,
            input.title,
            input.description,
            status,
            input.budget_json,
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_goal_with_conn(&conn, id)?
        .ok_or_else(|| AppError::Database("goal created but could not be reloaded".to_string()))
}

pub(crate) fn get_goal(db_path: &Path, id: i64) -> AppResult<Option<CreativeGoal>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    get_goal_with_conn(&conn, id)
}

pub(crate) fn list_goals(
    db_path: &Path,
    filter: ListCreativeGoalsFilter,
) -> AppResult<Vec<CreativeGoal>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let mut sql = String::from(
        "SELECT id, project_id, title, description, status, budget_json,
            created_at, updated_at, started_at, finished_at, stopped_at
         FROM creative_goals
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

    sql.push_str(" ORDER BY id DESC LIMIT ? OFFSET ?");
    params.push(Value::Integer(filter.limit.unwrap_or(50).clamp(1, 200)));
    params.push(Value::Integer(filter.offset.unwrap_or(0).max(0)));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(params.iter()), map_creative_goal)?;
    let mut goals = Vec::new();
    for row in rows {
        goals.push(row?);
    }
    Ok(goals)
}

pub(crate) fn update_goal_status(
    db_path: &Path,
    input: UpdateCreativeGoalStatusInput,
) -> AppResult<CreativeGoal> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    conn.execute(
        "UPDATE creative_goals
         SET status = ?,
             updated_at = CURRENT_TIMESTAMP,
             started_at = CASE
                WHEN ? = 'running' AND started_at IS NULL THEN CURRENT_TIMESTAMP
                ELSE started_at
             END,
             finished_at = CASE
                WHEN ? IN ('succeeded', 'failed', 'cancelled', 'completed')
                     AND finished_at IS NULL THEN CURRENT_TIMESTAMP
                ELSE finished_at
             END,
             stopped_at = COALESCE(?, stopped_at)
         WHERE id = ?",
        params![
            input.status.clone(),
            input.status.clone(),
            input.status.clone(),
            input.stopped_at,
            input.id
        ],
    )?;
    get_goal_with_conn(&conn, input.id)?
        .ok_or_else(|| AppError::Database("goal updated but could not be reloaded".to_string()))
}

pub(crate) fn create_goal_role(
    db_path: &Path,
    input: CreateCreativeGoalRoleInput,
) -> AppResult<CreativeGoalRole> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    if input.role_key.trim().is_empty() {
        return Err(AppError::Config("role_key is required".to_string()));
    }
    if input.task_type.trim().is_empty() {
        return Err(AppError::Config("task_type is required".to_string()));
    }
    conn.execute(
        "INSERT INTO creative_goal_roles (goal_id, role_key, task_type, description, task_count, budget_json)
         VALUES (?, ?, ?, ?, ?, ?)",
        params![
            input.goal_id,
            input.role_key,
            input.task_type,
            input.description,
            input.task_count.unwrap_or(1).max(1),
            input.budget_json,
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_goal_role_with_conn(&conn, id)?.ok_or_else(|| {
        AppError::Database("goal role created but could not be reloaded".to_string())
    })
}

pub(crate) fn list_goal_roles(
    db_path: &Path,
    filter: ListCreativeGoalRolesFilter,
) -> AppResult<Vec<CreativeGoalRole>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let mut sql = String::from(
        "SELECT id, goal_id, role_key, task_type, description, task_count, budget_json, created_at, updated_at
         FROM creative_goal_roles
         WHERE 1 = 1",
    );
    let mut params = Vec::<Value>::new();

    if let Some(goal_id) = filter.goal_id {
        sql.push_str(" AND goal_id = ?");
        params.push(Value::Integer(goal_id));
    }
    if let Some(role_key) = non_empty_filter(filter.role_key) {
        sql.push_str(" AND role_key = ?");
        params.push(Value::Text(role_key));
    }
    if let Some(task_type) = non_empty_filter(filter.task_type) {
        sql.push_str(" AND task_type = ?");
        params.push(Value::Text(task_type));
    }

    sql.push_str(" ORDER BY id ASC LIMIT ? OFFSET ?");
    params.push(Value::Integer(filter.limit.unwrap_or(50).clamp(1, 200)));
    params.push(Value::Integer(filter.offset.unwrap_or(0).max(0)));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(params.iter()), map_creative_goal_role)?;
    let mut roles = Vec::new();
    for row in rows {
        roles.push(row?);
    }
    Ok(roles)
}

pub(crate) fn list_goal_tasks(db_path: &Path, goal_id: i64) -> AppResult<Vec<CreativeTask>> {
    creative_task_repo::list_tasks(
        db_path,
        ListCreativeTasksFilter {
            goal_id: Some(goal_id),
            ..Default::default()
        },
    )
}

fn get_goal_with_conn(conn: &Connection, id: i64) -> AppResult<Option<CreativeGoal>> {
    conn.query_row(
        "SELECT id, project_id, title, description, status, budget_json,
            created_at, updated_at, started_at, finished_at, stopped_at
         FROM creative_goals
         WHERE id = ?",
        params![id],
        map_creative_goal,
    )
    .optional()
    .map_err(Into::into)
}

fn get_goal_role_with_conn(conn: &Connection, id: i64) -> AppResult<Option<CreativeGoalRole>> {
    conn.query_row(
        "SELECT id, goal_id, role_key, task_type, description, task_count, budget_json, created_at, updated_at
         FROM creative_goal_roles
         WHERE id = ?",
        params![id],
        map_creative_goal_role,
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
