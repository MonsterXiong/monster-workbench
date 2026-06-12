use crate::infra::creative_db_schema::init_schema;
use crate::infra::creative_db_support::{connect, map_creative_goal, map_creative_goal_role};
use crate::infra::creative_task_repo;
use crate::infra::creative_types::{
    CreateCreativeGoalInput, CreateCreativeGoalRoleInput, CreativeGoal, CreativeGoalRole,
    CreativeTask, ListCreativeGoalRolesFilter, ListCreativeGoalsFilter, ListCreativeTasksFilter,
    UpdateCreativeGoalStatusInput,
};
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infra::creative_types::CreateCreativeTaskInput;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_db_path(name: &str) -> std::path::PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "monster_workbench_goal_{}_{}_{}.db",
            name,
            std::process::id(),
            stamp
        ))
    }

    #[test]
    fn can_create_filter_update_goals_and_roles() {
        let db_path = temp_db_path("goal_repo");
        init_schema(&db_path).expect("schema should init");

        let goal = create_goal(
            &db_path,
            CreateCreativeGoalInput {
                project_id: Some("project-a".to_string()),
                title: "Story bible".to_string(),
                description: Some("Prepare a story bible".to_string()),
                status: None,
                budget_json: Some(r#"{"maxTasks":4}"#.to_string()),
            },
        )
        .expect("goal should create");
        assert_eq!(goal.status, "draft");
        assert_eq!(goal.project_id.as_deref(), Some("project-a"));

        let other_goal = create_goal(
            &db_path,
            CreateCreativeGoalInput {
                project_id: Some("project-b".to_string()),
                title: "Other project goal".to_string(),
                description: None,
                status: Some("running".to_string()),
                budget_json: None,
            },
        )
        .expect("other goal should create");

        let loaded = get_goal(&db_path, goal.id)
            .expect("goal query should pass")
            .expect("goal should exist");
        assert_eq!(loaded.title, "Story bible");

        let project_goals = list_goals(
            &db_path,
            ListCreativeGoalsFilter {
                project_id: Some(" project-a ".to_string()),
                status: Some(" draft ".to_string()),
                limit: Some(10),
                offset: Some(0),
            },
        )
        .expect("goals should list");
        assert_eq!(project_goals.len(), 1);
        assert_eq!(project_goals[0].id, goal.id);

        let running = update_goal_status(
            &db_path,
            UpdateCreativeGoalStatusInput {
                id: goal.id,
                status: "running".to_string(),
                stopped_at: None,
            },
        )
        .expect("goal should update to running");
        assert_eq!(running.status, "running");
        assert!(running.started_at.is_some());
        assert!(running.finished_at.is_none());

        let completed = update_goal_status(
            &db_path,
            UpdateCreativeGoalStatusInput {
                id: goal.id,
                status: "completed".to_string(),
                stopped_at: Some("manual_complete".to_string()),
            },
        )
        .expect("goal should complete");
        assert_eq!(completed.status, "completed");
        assert!(completed.finished_at.is_some());
        assert_eq!(completed.stopped_at.as_deref(), Some("manual_complete"));

        let role = create_goal_role(
            &db_path,
            CreateCreativeGoalRoleInput {
                goal_id: goal.id,
                role_key: "writer".to_string(),
                task_type: "goal.writer.stub".to_string(),
                description: Some("Draft story bible".to_string()),
                task_count: Some(0),
                budget_json: Some(r#"{"maxTokens":2048}"#.to_string()),
            },
        )
        .expect("goal role should create");
        assert_eq!(role.task_count, 1);

        let second_role = create_goal_role(
            &db_path,
            CreateCreativeGoalRoleInput {
                goal_id: other_goal.id,
                role_key: "reviewer".to_string(),
                task_type: "goal.review.stub".to_string(),
                description: None,
                task_count: Some(2),
                budget_json: None,
            },
        )
        .expect("second role should create");

        let roles = list_goal_roles(
            &db_path,
            ListCreativeGoalRolesFilter {
                goal_id: Some(goal.id),
                role_key: Some(" writer ".to_string()),
                task_type: Some(" goal.writer.stub ".to_string()),
                limit: Some(10),
                offset: Some(0),
            },
        )
        .expect("roles should list");
        assert_eq!(roles.len(), 1);
        assert_eq!(roles[0].id, role.id);

        let all_roles = list_goal_roles(
            &db_path,
            ListCreativeGoalRolesFilter {
                limit: Some(10),
                offset: Some(0),
                ..Default::default()
            },
        )
        .expect("all roles should list");
        assert_eq!(all_roles.len(), 2);
        assert!(all_roles.iter().any(|item| item.id == second_role.id));

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn can_list_goal_tasks_without_expanding_goal_repo_api() {
        let db_path = temp_db_path("goal_tasks");
        init_schema(&db_path).expect("schema should init");

        let goal = create_goal(
            &db_path,
            CreateCreativeGoalInput {
                project_id: Some("project-task".to_string()),
                title: "Task owner goal".to_string(),
                description: None,
                status: Some("running".to_string()),
                budget_json: None,
            },
        )
        .expect("goal should create");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-task".to_string()),
                goal_id: Some(goal.id),
                batch_job_id: None,
                task_type: "goal.writer.stub".to_string(),
                status: Some("queued".to_string()),
                priority: Some(0),
                payload_json: Some(r#"{"goal":"task"}"#.to_string()),
                max_retries: Some(0),
                parent_task_id: None,
                asset_id: None,
                sequence_no: Some(1),
            },
        )
        .expect("goal task should create");
        let unrelated_task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-task".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "standalone".to_string(),
                status: Some("queued".to_string()),
                priority: Some(0),
                payload_json: None,
                max_retries: Some(0),
                parent_task_id: None,
                asset_id: None,
                sequence_no: Some(2),
            },
        )
        .expect("unrelated task should create");

        let tasks = list_goal_tasks(&db_path, goal.id).expect("goal tasks should list");
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].id, task.id);
        assert_ne!(tasks[0].id, unrelated_task.id);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn role_creation_rejects_empty_key_fields() {
        let db_path = temp_db_path("goal_role_validation");
        init_schema(&db_path).expect("schema should init");

        let blank_key = create_goal_role(
            &db_path,
            CreateCreativeGoalRoleInput {
                goal_id: 1,
                role_key: " ".to_string(),
                task_type: "goal.writer.stub".to_string(),
                description: None,
                task_count: Some(1),
                budget_json: None,
            },
        );
        assert!(blank_key.is_err());

        let blank_task_type = create_goal_role(
            &db_path,
            CreateCreativeGoalRoleInput {
                goal_id: 1,
                role_key: "writer".to_string(),
                task_type: " ".to_string(),
                description: None,
                task_count: Some(1),
                budget_json: None,
            },
        );
        assert!(blank_task_type.is_err());

        let _ = std::fs::remove_file(db_path);
    }
}
