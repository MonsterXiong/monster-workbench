use crate::infra::creative_db_support::{
    connect, ensure_column, map_asset_link, map_creative_asset, map_creative_batch_job,
    map_creative_goal, map_creative_goal_role, map_creative_task, map_model_run, map_task_event,
};
use crate::infra::{AppError, AppResult};
use rusqlite::{params, params_from_iter, types::Value, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreativeTask {
    pub id: i64,
    pub project_id: Option<String>,
    pub goal_id: Option<i64>,
    pub batch_job_id: Option<i64>,
    pub task_type: String,
    pub status: String,
    pub priority: i64,
    pub payload_json: Option<String>,
    pub result_json: Option<String>,
    pub error_message: Option<String>,
    pub retry_count: i64,
    pub max_retries: i64,
    pub parent_task_id: Option<i64>,
    pub asset_id: Option<i64>,
    pub sequence_no: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCreativeTaskInput {
    pub project_id: Option<String>,
    pub goal_id: Option<i64>,
    pub batch_job_id: Option<i64>,
    pub task_type: String,
    pub status: Option<String>,
    pub priority: Option<i64>,
    pub payload_json: Option<String>,
    pub max_retries: Option<i64>,
    pub parent_task_id: Option<i64>,
    pub asset_id: Option<i64>,
    pub sequence_no: Option<i64>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCreativeTasksFilter {
    pub project_id: Option<String>,
    pub status: Option<String>,
    pub task_type: Option<String>,
    pub goal_id: Option<i64>,
    pub batch_job_id: Option<i64>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCreativeTaskStatusInput {
    pub id: i64,
    pub status: String,
    pub result_json: Option<String>,
    pub error_message: Option<String>,
    pub asset_id: Option<i64>,
    pub retry_count_increment: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreativeBatchJob {
    pub id: i64,
    pub project_id: Option<String>,
    pub name: String,
    pub batch_type: String,
    pub status: String,
    pub total_count: i64,
    pub concurrency: i64,
    pub max_retries: i64,
    pub prompt_template: Option<String>,
    pub provider_id: Option<String>,
    pub model: Option<String>,
    pub image_size: Option<String>,
    pub budget_json: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCreativeBatchJobInput {
    pub project_id: Option<String>,
    pub name: String,
    pub batch_type: String,
    pub status: Option<String>,
    pub total_count: Option<i64>,
    pub concurrency: Option<i64>,
    pub max_retries: Option<i64>,
    pub prompt_template: Option<String>,
    pub provider_id: Option<String>,
    pub model: Option<String>,
    pub image_size: Option<String>,
    pub budget_json: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCreativeBatchJobInput {
    pub id: i64,
    pub status: Option<String>,
    pub concurrency: Option<i64>,
    pub max_retries: Option<i64>,
    pub prompt_template: Option<String>,
    pub provider_id: Option<String>,
    pub model: Option<String>,
    pub image_size: Option<String>,
    pub budget_json: Option<String>,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCreativeBatchJobsFilter {
    pub project_id: Option<String>,
    pub status: Option<String>,
    pub batch_type: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreativeBatchJobStats {
    pub total_tasks: i64,
    pub draft_tasks: i64,
    pub queued_tasks: i64,
    pub running_tasks: i64,
    pub succeeded_tasks: i64,
    pub failed_tasks: i64,
    pub cancelled_tasks: i64,
    pub cancelling_tasks: i64,
    pub paused: bool,
    pub completion_ratio: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreativeBatchJobSnapshot {
    pub job: CreativeBatchJob,
    pub stats: CreativeBatchJobStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelRun {
    pub id: i64,
    pub project_id: Option<String>,
    pub task_id: Option<i64>,
    pub asset_id: Option<i64>,
    pub provider_id: Option<String>,
    pub provider_type: Option<String>,
    pub model: Option<String>,
    pub request_type: String,
    pub status: String,
    pub duration_ms: Option<i64>,
    pub prompt_hash: Option<String>,
    pub prompt_version_id: Option<String>,
    pub input_token_count: Option<i64>,
    pub output_token_count: Option<i64>,
    pub cost_estimate: Option<f64>,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub metadata_json: Option<String>,
    pub created_at: String,
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateModelRunInput {
    pub project_id: Option<String>,
    pub task_id: Option<i64>,
    pub asset_id: Option<i64>,
    pub provider_id: Option<String>,
    pub provider_type: Option<String>,
    pub model: Option<String>,
    pub request_type: String,
    pub status: String,
    pub duration_ms: Option<i64>,
    pub prompt_hash: Option<String>,
    pub prompt_version_id: Option<String>,
    pub input_token_count: Option<i64>,
    pub output_token_count: Option<i64>,
    pub cost_estimate: Option<f64>,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub metadata_json: Option<String>,
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListModelRunsFilter {
    pub project_id: Option<String>,
    pub task_id: Option<i64>,
    pub asset_id: Option<i64>,
    pub request_type: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskEvent {
    pub id: i64,
    pub task_id: i64,
    pub event_type: String,
    pub message: Option<String>,
    pub payload_json: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskEventInput {
    pub task_id: i64,
    pub event_type: String,
    pub message: Option<String>,
    pub payload_json: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreativeAsset {
    pub id: i64,
    pub project_id: Option<String>,
    pub asset_type: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub file_path: Option<String>,
    pub thumbnail_path: Option<String>,
    pub metadata_json: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCreativeAssetInput {
    pub project_id: Option<String>,
    pub asset_type: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub file_path: Option<String>,
    pub thumbnail_path: Option<String>,
    pub metadata_json: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreativeGoal {
    pub id: i64,
    pub project_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub budget_json: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub stopped_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCreativeGoalInput {
    pub project_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub budget_json: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCreativeGoalStatusInput {
    pub id: i64,
    pub status: String,
    pub stopped_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreativeGoalRole {
    pub id: i64,
    pub goal_id: i64,
    pub role_key: String,
    pub task_type: String,
    pub description: Option<String>,
    pub task_count: i64,
    pub budget_json: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCreativeGoalRoleInput {
    pub goal_id: i64,
    pub role_key: String,
    pub task_type: String,
    pub description: Option<String>,
    pub task_count: Option<i64>,
    pub budget_json: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCreativeGoalsFilter {
    pub project_id: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCreativeGoalRolesFilter {
    pub goal_id: Option<i64>,
    pub role_key: Option<String>,
    pub task_type: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCreativeAssetsFilter {
    pub project_id: Option<String>,
    pub asset_type: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetLink {
    pub id: i64,
    pub source_asset_id: i64,
    pub target_asset_id: i64,
    pub link_type: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAssetLinkInput {
    pub source_asset_id: i64,
    pub target_asset_id: i64,
    pub link_type: String,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListAssetLinksFilter {
    pub source_asset_id: Option<i64>,
    pub target_asset_id: Option<i64>,
    pub link_type: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub struct CreativeDbInfra;

impl CreativeDbInfra {
    pub fn init_schema(db_path: &Path) -> AppResult<()> {
        let conn = connect(db_path)?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS creative_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT,
                goal_id INTEGER,
                batch_job_id INTEGER,
                task_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                priority INTEGER NOT NULL DEFAULT 0,
                payload_json TEXT,
                result_json TEXT,
                error_message TEXT,
                retry_count INTEGER NOT NULL DEFAULT 0,
                max_retries INTEGER NOT NULL DEFAULT 0,
                parent_task_id INTEGER,
                asset_id INTEGER,
                sequence_no INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                started_at TEXT,
                finished_at TEXT,
                FOREIGN KEY(parent_task_id) REFERENCES creative_tasks(id) ON DELETE SET NULL,
                FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE SET NULL,
                FOREIGN KEY(batch_job_id) REFERENCES batch_jobs(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS batch_jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT,
                name TEXT NOT NULL,
                batch_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                total_count INTEGER NOT NULL DEFAULT 0,
                concurrency INTEGER NOT NULL DEFAULT 1,
                max_retries INTEGER NOT NULL DEFAULT 0,
                prompt_template TEXT,
                provider_id TEXT,
                model TEXT,
                image_size TEXT,
                budget_json TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                started_at TEXT,
                finished_at TEXT
            );

            CREATE TABLE IF NOT EXISTS creative_goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'draft',
                budget_json TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                started_at TEXT,
                finished_at TEXT,
                stopped_at TEXT
            );

            CREATE TABLE IF NOT EXISTS creative_goal_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                goal_id INTEGER NOT NULL,
                role_key TEXT NOT NULL,
                task_type TEXT NOT NULL,
                description TEXT,
                task_count INTEGER NOT NULL DEFAULT 1,
                budget_json TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(goal_id) REFERENCES creative_goals(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS task_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                message TEXT,
                payload_json TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(task_id) REFERENCES creative_tasks(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS model_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT,
                task_id INTEGER,
                asset_id INTEGER,
                provider_id TEXT,
                provider_type TEXT,
                model TEXT,
                request_type TEXT NOT NULL,
                status TEXT NOT NULL,
                duration_ms INTEGER,
                prompt_hash TEXT,
                prompt_version_id TEXT,
                input_token_count INTEGER,
                output_token_count INTEGER,
                cost_estimate REAL,
                error_code TEXT,
                error_message TEXT,
                metadata_json TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                finished_at TEXT,
                FOREIGN KEY(task_id) REFERENCES creative_tasks(id) ON DELETE SET NULL,
                FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT,
                asset_type TEXT NOT NULL,
                title TEXT,
                content TEXT,
                file_path TEXT,
                thumbnail_path TEXT,
                metadata_json TEXT,
                status TEXT NOT NULL DEFAULT 'draft',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS asset_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_asset_id INTEGER NOT NULL,
                target_asset_id INTEGER NOT NULL,
                link_type TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(source_asset_id) REFERENCES assets(id) ON DELETE CASCADE,
                FOREIGN KEY(target_asset_id) REFERENCES assets(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_creative_tasks_project_id ON creative_tasks(project_id);
            CREATE INDEX IF NOT EXISTS idx_creative_tasks_status ON creative_tasks(status);
            CREATE INDEX IF NOT EXISTS idx_creative_tasks_task_type ON creative_tasks(task_type);
            CREATE INDEX IF NOT EXISTS idx_creative_tasks_asset_id ON creative_tasks(asset_id);
            CREATE INDEX IF NOT EXISTS idx_creative_tasks_created_at ON creative_tasks(created_at);
            CREATE INDEX IF NOT EXISTS idx_batch_jobs_project_id ON batch_jobs(project_id);
            CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
            CREATE INDEX IF NOT EXISTS idx_batch_jobs_batch_type ON batch_jobs(batch_type);
            CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at ON batch_jobs(created_at);
            CREATE INDEX IF NOT EXISTS idx_creative_goals_project_id ON creative_goals(project_id);
            CREATE INDEX IF NOT EXISTS idx_creative_goals_status ON creative_goals(status);
            CREATE INDEX IF NOT EXISTS idx_creative_goals_created_at ON creative_goals(created_at);
            CREATE INDEX IF NOT EXISTS idx_creative_goal_roles_goal_id ON creative_goal_roles(goal_id);
            CREATE INDEX IF NOT EXISTS idx_creative_goal_roles_task_type ON creative_goal_roles(task_type);
            CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id);
            CREATE INDEX IF NOT EXISTS idx_task_events_created_at ON task_events(created_at);
            CREATE INDEX IF NOT EXISTS idx_model_runs_project_id ON model_runs(project_id);
            CREATE INDEX IF NOT EXISTS idx_model_runs_task_id ON model_runs(task_id);
            CREATE INDEX IF NOT EXISTS idx_model_runs_asset_id ON model_runs(asset_id);
            CREATE INDEX IF NOT EXISTS idx_model_runs_request_type ON model_runs(request_type);
            CREATE INDEX IF NOT EXISTS idx_model_runs_status ON model_runs(status);
            CREATE INDEX IF NOT EXISTS idx_model_runs_created_at ON model_runs(created_at);
            CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
            CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);
            CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
            CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);
            CREATE INDEX IF NOT EXISTS idx_asset_links_source ON asset_links(source_asset_id);
            CREATE INDEX IF NOT EXISTS idx_asset_links_target ON asset_links(target_asset_id);
            CREATE INDEX IF NOT EXISTS idx_asset_links_type ON asset_links(link_type);",
        )?;
        ensure_column(&conn, "creative_tasks", "goal_id", "INTEGER")?;
        ensure_column(&conn, "creative_tasks", "batch_job_id", "INTEGER")?;
        ensure_column(&conn, "creative_tasks", "sequence_no", "INTEGER")?;
        conn.execute_batch(
            "CREATE INDEX IF NOT EXISTS idx_creative_tasks_goal_id ON creative_tasks(goal_id);
            CREATE INDEX IF NOT EXISTS idx_creative_tasks_batch_job_id ON creative_tasks(batch_job_id);
            CREATE INDEX IF NOT EXISTS idx_creative_tasks_sequence_no ON creative_tasks(sequence_no);",
        )?;
        Ok(())
    }

    pub fn create_task(db_path: &Path, input: CreateCreativeTaskInput) -> AppResult<CreativeTask> {
        Self::init_schema(db_path)?;
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
        Self::get_task_with_conn(&conn, id)?
            .ok_or_else(|| AppError::Database("创作任务已写入但无法立即读取".to_string()))
    }

    pub fn get_task(db_path: &Path, id: i64) -> AppResult<Option<CreativeTask>> {
        Self::init_schema(db_path)?;
        let conn = connect(db_path)?;
        Self::get_task_with_conn(&conn, id)
    }

    pub fn list_tasks(
        db_path: &Path,
        filter: ListCreativeTasksFilter,
    ) -> AppResult<Vec<CreativeTask>> {
        Self::init_schema(db_path)?;
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

    pub fn update_task_status(
        db_path: &Path,
        input: UpdateCreativeTaskStatusInput,
    ) -> AppResult<CreativeTask> {
        Self::init_schema(db_path)?;
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
        Self::get_task_with_conn(&conn, id)?.ok_or_else(|| {
            AppError::Database("creative task updated but could not be reloaded".to_string())
        })
    }

    pub fn claim_next_queued_task(
        db_path: &Path,
        filter: ListCreativeTasksFilter,
    ) -> AppResult<Option<CreativeTask>> {
        Self::init_schema(db_path)?;
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

        let task = Self::get_task_with_conn(&tx, task_id)?;
        tx.commit()?;
        Ok(task)
    }

    pub fn append_task_event(db_path: &Path, input: CreateTaskEventInput) -> AppResult<TaskEvent> {
        Self::init_schema(db_path)?;
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
        Self::get_task_event_with_conn(&conn, id)?
            .ok_or_else(|| AppError::Database("任务事件已写入但无法立即读取".to_string()))
    }

    pub fn list_task_events(db_path: &Path, task_id: i64) -> AppResult<Vec<TaskEvent>> {
        Self::init_schema(db_path)?;
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

    pub fn create_model_run(db_path: &Path, input: CreateModelRunInput) -> AppResult<ModelRun> {
        Self::init_schema(db_path)?;
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
        Self::get_model_run_with_conn(&conn, id)?.ok_or_else(|| {
            AppError::Database("model run created but could not be reloaded".to_string())
        })
    }

    pub fn list_model_runs(
        db_path: &Path,
        filter: ListModelRunsFilter,
    ) -> AppResult<Vec<ModelRun>> {
        Self::init_schema(db_path)?;
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

    pub fn create_batch_job(
        db_path: &Path,
        input: CreateCreativeBatchJobInput,
    ) -> AppResult<CreativeBatchJob> {
        Self::init_schema(db_path)?;
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
        Self::get_batch_job_with_conn(&conn, id)?.ok_or_else(|| {
            AppError::Database("batch job created but could not be reloaded".to_string())
        })
    }

    pub fn get_batch_job(db_path: &Path, id: i64) -> AppResult<Option<CreativeBatchJob>> {
        Self::init_schema(db_path)?;
        let conn = connect(db_path)?;
        Self::get_batch_job_with_conn(&conn, id)
    }

    pub fn list_batch_jobs(
        db_path: &Path,
        filter: ListCreativeBatchJobsFilter,
    ) -> AppResult<Vec<CreativeBatchJob>> {
        Self::init_schema(db_path)?;
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

    pub fn update_batch_job(
        db_path: &Path,
        input: UpdateCreativeBatchJobInput,
    ) -> AppResult<CreativeBatchJob> {
        Self::init_schema(db_path)?;
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
        Self::get_batch_job_with_conn(&conn, input.id)?.ok_or_else(|| {
            AppError::Database("batch job updated but could not be reloaded".to_string())
        })
    }

    pub fn list_batch_job_tasks(db_path: &Path, batch_job_id: i64) -> AppResult<Vec<CreativeTask>> {
        Self::list_tasks(
            db_path,
            ListCreativeTasksFilter {
                batch_job_id: Some(batch_job_id),
                limit: Some(200),
                offset: Some(0),
                ..Default::default()
            },
        )
    }

    pub fn count_batch_job_tasks_by_status(
        db_path: &Path,
        batch_job_id: i64,
    ) -> AppResult<CreativeBatchJobStats> {
        Self::init_schema(db_path)?;
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

    pub fn get_batch_job_snapshot(
        db_path: &Path,
        batch_job_id: i64,
    ) -> AppResult<Option<CreativeBatchJobSnapshot>> {
        let Some(job) = Self::get_batch_job(db_path, batch_job_id)? else {
            return Ok(None);
        };
        let mut stats = Self::count_batch_job_tasks_by_status(db_path, batch_job_id)?;
        stats.paused = job.status == "paused";
        Ok(Some(CreativeBatchJobSnapshot { job, stats }))
    }

    pub fn cancel_queued_batch_tasks(db_path: &Path, batch_job_id: i64) -> AppResult<Vec<i64>> {
        let queued_tasks = Self::list_tasks(
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
            Self::update_task_status(
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

    pub fn mark_running_batch_tasks_cancelling(
        db_path: &Path,
        batch_job_id: i64,
    ) -> AppResult<Vec<i64>> {
        let running_tasks = Self::list_tasks(
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
            Self::update_task_status(
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

    pub fn create_asset(
        db_path: &Path,
        input: CreateCreativeAssetInput,
    ) -> AppResult<CreativeAsset> {
        Self::init_schema(db_path)?;
        let conn = connect(db_path)?;
        let status = input.status.unwrap_or_else(|| "draft".to_string());
        conn.execute(
            "INSERT INTO assets (
                project_id, asset_type, title, content, file_path,
                thumbnail_path, metadata_json, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                input.project_id,
                input.asset_type,
                input.title,
                input.content,
                input.file_path,
                input.thumbnail_path,
                input.metadata_json,
                status
            ],
        )?;
        let id = conn.last_insert_rowid();
        Self::get_asset_with_conn(&conn, id)?
            .ok_or_else(|| AppError::Database("资产已写入但无法立即读取".to_string()))
    }

    pub fn get_asset(db_path: &Path, id: i64) -> AppResult<Option<CreativeAsset>> {
        Self::init_schema(db_path)?;
        let conn = connect(db_path)?;
        Self::get_asset_with_conn(&conn, id)
    }

    pub fn list_assets(
        db_path: &Path,
        filter: ListCreativeAssetsFilter,
    ) -> AppResult<Vec<CreativeAsset>> {
        Self::init_schema(db_path)?;
        let conn = connect(db_path)?;
        let mut sql = String::from(
            "SELECT id, project_id, asset_type, title, content, file_path,
                thumbnail_path, metadata_json, status, created_at, updated_at
             FROM assets
             WHERE 1 = 1",
        );
        let mut params = Vec::<Value>::new();

        if let Some(project_id) = non_empty_filter(filter.project_id) {
            sql.push_str(" AND project_id = ?");
            params.push(Value::Text(project_id));
        }
        if let Some(asset_type) = non_empty_filter(filter.asset_type) {
            sql.push_str(" AND asset_type = ?");
            params.push(Value::Text(asset_type));
        }
        if let Some(status) = non_empty_filter(filter.status) {
            sql.push_str(" AND status = ?");
            params.push(Value::Text(status));
        }

        sql.push_str(" ORDER BY id DESC LIMIT ? OFFSET ?");
        params.push(Value::Integer(filter.limit.unwrap_or(50).clamp(1, 200)));
        params.push(Value::Integer(filter.offset.unwrap_or(0).max(0)));

        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(params_from_iter(params.iter()), map_creative_asset)?;
        let mut assets = Vec::new();
        for row in rows {
            assets.push(row?);
        }
        Ok(assets)
    }

    pub fn create_asset_link(db_path: &Path, input: CreateAssetLinkInput) -> AppResult<AssetLink> {
        Self::init_schema(db_path)?;
        let conn = connect(db_path)?;
        conn.execute(
            "INSERT INTO asset_links (source_asset_id, target_asset_id, link_type)
             VALUES (?, ?, ?)",
            params![
                input.source_asset_id,
                input.target_asset_id,
                input.link_type
            ],
        )?;
        let id = conn.last_insert_rowid();
        Self::get_asset_link_with_conn(&conn, id)?
            .ok_or_else(|| AppError::Database("资产关系已写入但无法立即读取".to_string()))
    }

    pub fn create_goal(db_path: &Path, input: CreateCreativeGoalInput) -> AppResult<CreativeGoal> {
        Self::init_schema(db_path)?;
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
        Self::get_goal_with_conn(&conn, id)?
            .ok_or_else(|| AppError::Database("goal created but could not be reloaded".to_string()))
    }

    pub fn get_goal(db_path: &Path, id: i64) -> AppResult<Option<CreativeGoal>> {
        Self::init_schema(db_path)?;
        let conn = connect(db_path)?;
        Self::get_goal_with_conn(&conn, id)
    }

    pub fn list_goals(
        db_path: &Path,
        filter: ListCreativeGoalsFilter,
    ) -> AppResult<Vec<CreativeGoal>> {
        Self::init_schema(db_path)?;
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

    pub fn update_goal_status(
        db_path: &Path,
        input: UpdateCreativeGoalStatusInput,
    ) -> AppResult<CreativeGoal> {
        Self::init_schema(db_path)?;
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
        Self::get_goal_with_conn(&conn, input.id)?
            .ok_or_else(|| AppError::Database("goal updated but could not be reloaded".to_string()))
    }

    pub fn create_goal_role(
        db_path: &Path,
        input: CreateCreativeGoalRoleInput,
    ) -> AppResult<CreativeGoalRole> {
        Self::init_schema(db_path)?;
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
        Self::get_goal_role_with_conn(&conn, id)?.ok_or_else(|| {
            AppError::Database("goal role created but could not be reloaded".to_string())
        })
    }

    pub fn list_goal_roles(
        db_path: &Path,
        filter: ListCreativeGoalRolesFilter,
    ) -> AppResult<Vec<CreativeGoalRole>> {
        Self::init_schema(db_path)?;
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

    pub fn list_goal_tasks(db_path: &Path, goal_id: i64) -> AppResult<Vec<CreativeTask>> {
        Self::list_tasks(
            db_path,
            ListCreativeTasksFilter {
                goal_id: Some(goal_id),
                ..Default::default()
            },
        )
    }

    pub fn get_asset_link(db_path: &Path, id: i64) -> AppResult<Option<AssetLink>> {
        Self::init_schema(db_path)?;
        let conn = connect(db_path)?;
        Self::get_asset_link_with_conn(&conn, id)
    }

    pub fn list_asset_links(
        db_path: &Path,
        filter: ListAssetLinksFilter,
    ) -> AppResult<Vec<AssetLink>> {
        Self::init_schema(db_path)?;
        let conn = connect(db_path)?;
        let mut sql = String::from(
            "SELECT id, source_asset_id, target_asset_id, link_type, created_at
             FROM asset_links
             WHERE 1 = 1",
        );
        let mut params = Vec::<Value>::new();

        if let Some(source_asset_id) = filter.source_asset_id {
            sql.push_str(" AND source_asset_id = ?");
            params.push(Value::Integer(source_asset_id));
        }
        if let Some(target_asset_id) = filter.target_asset_id {
            sql.push_str(" AND target_asset_id = ?");
            params.push(Value::Integer(target_asset_id));
        }
        if let Some(link_type) = non_empty_filter(filter.link_type) {
            sql.push_str(" AND link_type = ?");
            params.push(Value::Text(link_type));
        }

        sql.push_str(" ORDER BY id DESC LIMIT ? OFFSET ?");
        params.push(Value::Integer(filter.limit.unwrap_or(50).clamp(1, 200)));
        params.push(Value::Integer(filter.offset.unwrap_or(0).max(0)));

        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(params_from_iter(params.iter()), map_asset_link)?;
        let mut links = Vec::new();
        for row in rows {
            links.push(row?);
        }
        Ok(links)
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

    fn get_asset_with_conn(conn: &Connection, id: i64) -> AppResult<Option<CreativeAsset>> {
        conn.query_row(
            "SELECT id, project_id, asset_type, title, content, file_path,
                thumbnail_path, metadata_json, status, created_at, updated_at
             FROM assets
             WHERE id = ?",
            params![id],
            map_creative_asset,
        )
        .optional()
        .map_err(Into::into)
    }

    fn get_asset_link_with_conn(conn: &Connection, id: i64) -> AppResult<Option<AssetLink>> {
        conn.query_row(
            "SELECT id, source_asset_id, target_asset_id, link_type, created_at
             FROM asset_links
             WHERE id = ?",
            params![id],
            map_asset_link,
        )
        .optional()
        .map_err(Into::into)
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
}

fn non_empty_filter(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let trimmed = item.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
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
    fn init_schema_is_idempotent() {
        let db_path = temp_db_path("creative_schema");

        CreativeDbInfra::init_schema(&db_path).expect("first init should pass");
        CreativeDbInfra::init_schema(&db_path).expect("second init should pass");

        let conn = connect(&db_path).expect("db should connect");
        let table_count: i64 = conn
            .query_row(
                "SELECT COUNT(*)
                 FROM sqlite_master
                 WHERE type = 'table'
                   AND name IN ('creative_tasks', 'task_events', 'model_runs', 'assets', 'asset_links', 'batch_jobs')",
                [],
                |row| row.get(0),
            )
            .expect("table count should be queryable");
        assert_eq!(table_count, 6);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn init_schema_migrates_legacy_creative_tasks_without_goal_columns() {
        let db_path = temp_db_path("creative_schema_legacy");
        let conn = connect(&db_path).expect("db should connect");
        conn.execute_batch(
            "CREATE TABLE creative_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT,
                task_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                priority INTEGER NOT NULL DEFAULT 0,
                payload_json TEXT,
                result_json TEXT,
                error_message TEXT,
                retry_count INTEGER NOT NULL DEFAULT 0,
                max_retries INTEGER NOT NULL DEFAULT 0,
                parent_task_id INTEGER,
                asset_id INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                started_at TEXT,
                finished_at TEXT
            );",
        )
        .expect("legacy schema should be created");

        CreativeDbInfra::init_schema(&db_path).expect("legacy schema should migrate");

        let conn = connect(&db_path).expect("db should reconnect");
        let column_count: i64 = conn
            .query_row(
                "SELECT COUNT(*)
                 FROM pragma_table_info('creative_tasks')
                 WHERE name IN ('goal_id', 'batch_job_id', 'sequence_no')",
                [],
                |row| row.get(0),
            )
            .expect("column count should be queryable");
        assert_eq!(column_count, 3);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn can_create_and_query_minimal_creative_records() {
        let db_path = temp_db_path("creative_records");
        CreativeDbInfra::init_schema(&db_path).expect("schema should init");

        let task = CreativeDbInfra::create_task(
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

        let loaded_task = CreativeDbInfra::get_task(&db_path, task.id)
            .expect("task query should pass")
            .expect("task should exist");
        assert_eq!(loaded_task.task_type, "generate_image_prompt");

        let event = CreativeDbInfra::append_task_event(
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

        let events = CreativeDbInfra::list_task_events(&db_path, task.id)
            .expect("events should be queryable");
        assert_eq!(events.len(), 1);

        let source_asset = CreativeDbInfra::create_asset(
            &db_path,
            CreateCreativeAssetInput {
                project_id: Some("project-a".to_string()),
                asset_type: "image_prompt".to_string(),
                title: Some("Poster prompt".to_string()),
                content: Some("A clean product poster".to_string()),
                file_path: None,
                thumbnail_path: None,
                metadata_json: Some(r#"{"source":"test"}"#.to_string()),
                status: Some("draft".to_string()),
            },
        )
        .expect("source asset should be created");
        let target_asset = CreativeDbInfra::create_asset(
            &db_path,
            CreateCreativeAssetInput {
                project_id: Some("project-a".to_string()),
                asset_type: "demo_image".to_string(),
                title: Some("Generated image".to_string()),
                content: None,
                file_path: Some("generated/image.png".to_string()),
                thumbnail_path: Some("generated/thumb.png".to_string()),
                metadata_json: None,
                status: Some("ready".to_string()),
            },
        )
        .expect("target asset should be created");

        let loaded_asset = CreativeDbInfra::get_asset(&db_path, source_asset.id)
            .expect("asset query should pass")
            .expect("asset should exist");
        assert_eq!(loaded_asset.asset_type, "image_prompt");

        let link = CreativeDbInfra::create_asset_link(
            &db_path,
            CreateAssetLinkInput {
                source_asset_id: target_asset.id,
                target_asset_id: source_asset.id,
                link_type: "derived_from".to_string(),
            },
        )
        .expect("asset link should be created");
        let loaded_link = CreativeDbInfra::get_asset_link(&db_path, link.id)
            .expect("asset link query should pass")
            .expect("asset link should exist");
        assert_eq!(loaded_link.link_type, "derived_from");

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn can_create_and_list_model_runs() {
        let db_path = temp_db_path("creative_model_runs");
        CreativeDbInfra::init_schema(&db_path).expect("schema should init");

        let task = CreativeDbInfra::create_task(
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

        let run = CreativeDbInfra::create_model_run(
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

        let runs = CreativeDbInfra::list_model_runs(
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

    #[test]
    fn can_create_batch_job_and_query_snapshot() {
        let db_path = temp_db_path("creative_batch_job");
        CreativeDbInfra::init_schema(&db_path).expect("schema should init");

        let job = CreativeDbInfra::create_batch_job(
            &db_path,
            CreateCreativeBatchJobInput {
                project_id: Some("batch-project".to_string()),
                name: "Mock Batch".to_string(),
                batch_type: "demo.image.mock".to_string(),
                status: Some("draft".to_string()),
                total_count: Some(3),
                concurrency: Some(2),
                max_retries: Some(0),
                prompt_template: None,
                provider_id: None,
                model: None,
                image_size: None,
                budget_json: None,
            },
        )
        .expect("batch job should create");

        for sequence_no in 1..=3 {
            CreativeDbInfra::create_task(
                &db_path,
                CreateCreativeTaskInput {
                    project_id: Some("batch-project".to_string()),
                    goal_id: None,
                    batch_job_id: Some(job.id),
                    task_type: "demo.image.mock".to_string(),
                    status: Some(if sequence_no == 3 {
                        "running".to_string()
                    } else {
                        "queued".to_string()
                    }),
                    priority: Some(0),
                    payload_json: None,
                    max_retries: Some(0),
                    parent_task_id: None,
                    asset_id: None,
                    sequence_no: Some(sequence_no),
                },
            )
            .expect("batch task should create");
        }

        let snapshot = CreativeDbInfra::get_batch_job_snapshot(&db_path, job.id)
            .expect("snapshot query should pass")
            .expect("snapshot should exist");
        assert_eq!(snapshot.job.batch_type, "demo.image.mock");
        assert_eq!(snapshot.stats.total_tasks, 3);
        assert_eq!(snapshot.stats.queued_tasks, 2);
        assert_eq!(snapshot.stats.running_tasks, 1);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn can_list_domain_assets_and_links() {
        let db_path = temp_db_path("creative_domain_assets");
        CreativeDbInfra::init_schema(&db_path).expect("schema should init");

        let character = CreativeDbInfra::create_asset(
            &db_path,
            CreateCreativeAssetInput {
                project_id: Some("project-domain".to_string()),
                asset_type: "character".to_string(),
                title: Some("Lead Character".to_string()),
                content: Some("Character asset".to_string()),
                file_path: None,
                thumbnail_path: None,
                metadata_json: None,
                status: Some("ready".to_string()),
            },
        )
        .expect("character asset should create");

        let scene = CreativeDbInfra::create_asset(
            &db_path,
            CreateCreativeAssetInput {
                project_id: Some("project-domain".to_string()),
                asset_type: "scene".to_string(),
                title: Some("Opening Scene".to_string()),
                content: Some("Scene asset".to_string()),
                file_path: None,
                thumbnail_path: None,
                metadata_json: None,
                status: Some("ready".to_string()),
            },
        )
        .expect("scene asset should create");

        let storyboard = CreativeDbInfra::create_asset(
            &db_path,
            CreateCreativeAssetInput {
                project_id: Some("project-domain".to_string()),
                asset_type: "storyboard".to_string(),
                title: Some("Opening Storyboard".to_string()),
                content: Some("Storyboard asset".to_string()),
                file_path: None,
                thumbnail_path: None,
                metadata_json: None,
                status: Some("ready".to_string()),
            },
        )
        .expect("storyboard asset should create");

        let uses_character = CreativeDbInfra::create_asset_link(
            &db_path,
            CreateAssetLinkInput {
                source_asset_id: storyboard.id,
                target_asset_id: character.id,
                link_type: "uses_character".to_string(),
            },
        )
        .expect("character link should create");

        let uses_scene = CreativeDbInfra::create_asset_link(
            &db_path,
            CreateAssetLinkInput {
                source_asset_id: storyboard.id,
                target_asset_id: scene.id,
                link_type: "uses_scene".to_string(),
            },
        )
        .expect("scene link should create");

        let assets = CreativeDbInfra::list_assets(
            &db_path,
            ListCreativeAssetsFilter {
                project_id: Some("project-domain".to_string()),
                status: Some("ready".to_string()),
                ..Default::default()
            },
        )
        .expect("assets should list");
        assert_eq!(assets.len(), 3);

        let storyboard_assets = CreativeDbInfra::list_assets(
            &db_path,
            ListCreativeAssetsFilter {
                asset_type: Some("storyboard".to_string()),
                ..Default::default()
            },
        )
        .expect("storyboard assets should list");
        assert_eq!(storyboard_assets.len(), 1);
        assert_eq!(storyboard_assets[0].id, storyboard.id);

        let character_links = CreativeDbInfra::list_asset_links(
            &db_path,
            ListAssetLinksFilter {
                source_asset_id: Some(storyboard.id),
                link_type: Some("uses_character".to_string()),
                ..Default::default()
            },
        )
        .expect("character links should list");
        assert_eq!(character_links.len(), 1);
        assert_eq!(character_links[0].id, uses_character.id);

        let scene_links = CreativeDbInfra::list_asset_links(
            &db_path,
            ListAssetLinksFilter {
                target_asset_id: Some(scene.id),
                link_type: Some("uses_scene".to_string()),
                ..Default::default()
            },
        )
        .expect("scene links should list");
        assert_eq!(scene_links.len(), 1);
        assert_eq!(scene_links[0].id, uses_scene.id);

        let _ = std::fs::remove_file(db_path);
    }
}
