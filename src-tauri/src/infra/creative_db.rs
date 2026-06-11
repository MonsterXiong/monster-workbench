use crate::infra::creative_asset_repo;
use crate::infra::creative_batch_repo;
use crate::infra::creative_db_schema;
use crate::infra::creative_goal_repo;
use crate::infra::creative_model_run_repo;
use crate::infra::creative_project_repo;
use crate::infra::creative_task_repo;
use crate::infra::AppResult;
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreativeProject {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub settings_json: Option<String>,
    pub budget_json: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub archived_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertCreativeProjectInput {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub settings_json: Option<String>,
    pub budget_json: Option<String>,
    pub archived_at: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCreativeProjectsFilter {
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
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
        creative_db_schema::init_schema(db_path)
    }

    pub fn create_task(db_path: &Path, input: CreateCreativeTaskInput) -> AppResult<CreativeTask> {
        creative_task_repo::create_task(db_path, input)
    }

    pub fn get_task(db_path: &Path, id: i64) -> AppResult<Option<CreativeTask>> {
        creative_task_repo::get_task(db_path, id)
    }

    pub fn list_tasks(
        db_path: &Path,
        filter: ListCreativeTasksFilter,
    ) -> AppResult<Vec<CreativeTask>> {
        creative_task_repo::list_tasks(db_path, filter)
    }

    pub fn update_task_status(
        db_path: &Path,
        input: UpdateCreativeTaskStatusInput,
    ) -> AppResult<CreativeTask> {
        creative_task_repo::update_task_status(db_path, input)
    }

    pub fn claim_next_queued_task(
        db_path: &Path,
        filter: ListCreativeTasksFilter,
    ) -> AppResult<Option<CreativeTask>> {
        creative_task_repo::claim_next_queued_task(db_path, filter)
    }

    pub fn append_task_event(db_path: &Path, input: CreateTaskEventInput) -> AppResult<TaskEvent> {
        creative_task_repo::append_task_event(db_path, input)
    }

    pub fn list_task_events(db_path: &Path, task_id: i64) -> AppResult<Vec<TaskEvent>> {
        creative_task_repo::list_task_events(db_path, task_id)
    }

    pub fn create_model_run(db_path: &Path, input: CreateModelRunInput) -> AppResult<ModelRun> {
        creative_model_run_repo::create_model_run(db_path, input)
    }

    pub fn list_model_runs(
        db_path: &Path,
        filter: ListModelRunsFilter,
    ) -> AppResult<Vec<ModelRun>> {
        creative_model_run_repo::list_model_runs(db_path, filter)
    }

    pub fn create_batch_job(
        db_path: &Path,
        input: CreateCreativeBatchJobInput,
    ) -> AppResult<CreativeBatchJob> {
        creative_batch_repo::create_batch_job(db_path, input)
    }

    pub fn get_batch_job(db_path: &Path, id: i64) -> AppResult<Option<CreativeBatchJob>> {
        creative_batch_repo::get_batch_job(db_path, id)
    }

    pub fn list_batch_jobs(
        db_path: &Path,
        filter: ListCreativeBatchJobsFilter,
    ) -> AppResult<Vec<CreativeBatchJob>> {
        creative_batch_repo::list_batch_jobs(db_path, filter)
    }

    pub fn update_batch_job(
        db_path: &Path,
        input: UpdateCreativeBatchJobInput,
    ) -> AppResult<CreativeBatchJob> {
        creative_batch_repo::update_batch_job(db_path, input)
    }

    pub fn list_batch_job_tasks(db_path: &Path, batch_job_id: i64) -> AppResult<Vec<CreativeTask>> {
        creative_batch_repo::list_batch_job_tasks(db_path, batch_job_id)
    }

    pub fn count_batch_job_tasks_by_status(
        db_path: &Path,
        batch_job_id: i64,
    ) -> AppResult<CreativeBatchJobStats> {
        creative_batch_repo::count_batch_job_tasks_by_status(db_path, batch_job_id)
    }

    pub fn get_batch_job_snapshot(
        db_path: &Path,
        batch_job_id: i64,
    ) -> AppResult<Option<CreativeBatchJobSnapshot>> {
        creative_batch_repo::get_batch_job_snapshot(db_path, batch_job_id)
    }

    pub fn cancel_queued_batch_tasks(db_path: &Path, batch_job_id: i64) -> AppResult<Vec<i64>> {
        creative_batch_repo::cancel_queued_batch_tasks(db_path, batch_job_id)
    }

    pub fn mark_running_batch_tasks_cancelling(
        db_path: &Path,
        batch_job_id: i64,
    ) -> AppResult<Vec<i64>> {
        creative_batch_repo::mark_running_batch_tasks_cancelling(db_path, batch_job_id)
    }

    pub fn create_asset(
        db_path: &Path,
        input: CreateCreativeAssetInput,
    ) -> AppResult<CreativeAsset> {
        creative_asset_repo::create_asset(db_path, input)
    }

    pub fn get_asset(db_path: &Path, id: i64) -> AppResult<Option<CreativeAsset>> {
        creative_asset_repo::get_asset(db_path, id)
    }

    pub fn list_assets(
        db_path: &Path,
        filter: ListCreativeAssetsFilter,
    ) -> AppResult<Vec<CreativeAsset>> {
        creative_asset_repo::list_assets(db_path, filter)
    }

    pub fn create_asset_link(db_path: &Path, input: CreateAssetLinkInput) -> AppResult<AssetLink> {
        creative_asset_repo::create_asset_link(db_path, input)
    }

    pub fn upsert_project(
        db_path: &Path,
        input: UpsertCreativeProjectInput,
    ) -> AppResult<CreativeProject> {
        creative_project_repo::upsert_project(db_path, input)
    }

    pub fn get_project(db_path: &Path, id: &str) -> AppResult<Option<CreativeProject>> {
        creative_project_repo::get_project(db_path, id)
    }

    pub fn list_projects(
        db_path: &Path,
        filter: ListCreativeProjectsFilter,
    ) -> AppResult<Vec<CreativeProject>> {
        creative_project_repo::list_projects(db_path, filter)
    }

    pub fn create_goal(db_path: &Path, input: CreateCreativeGoalInput) -> AppResult<CreativeGoal> {
        creative_goal_repo::create_goal(db_path, input)
    }

    pub fn get_goal(db_path: &Path, id: i64) -> AppResult<Option<CreativeGoal>> {
        creative_goal_repo::get_goal(db_path, id)
    }

    pub fn list_goals(
        db_path: &Path,
        filter: ListCreativeGoalsFilter,
    ) -> AppResult<Vec<CreativeGoal>> {
        creative_goal_repo::list_goals(db_path, filter)
    }

    pub fn update_goal_status(
        db_path: &Path,
        input: UpdateCreativeGoalStatusInput,
    ) -> AppResult<CreativeGoal> {
        creative_goal_repo::update_goal_status(db_path, input)
    }

    pub fn create_goal_role(
        db_path: &Path,
        input: CreateCreativeGoalRoleInput,
    ) -> AppResult<CreativeGoalRole> {
        creative_goal_repo::create_goal_role(db_path, input)
    }

    pub fn list_goal_roles(
        db_path: &Path,
        filter: ListCreativeGoalRolesFilter,
    ) -> AppResult<Vec<CreativeGoalRole>> {
        creative_goal_repo::list_goal_roles(db_path, filter)
    }

    pub fn list_goal_tasks(db_path: &Path, goal_id: i64) -> AppResult<Vec<CreativeTask>> {
        creative_goal_repo::list_goal_tasks(db_path, goal_id)
    }

    pub fn get_asset_link(db_path: &Path, id: i64) -> AppResult<Option<AssetLink>> {
        creative_asset_repo::get_asset_link(db_path, id)
    }

    pub fn list_asset_links(
        db_path: &Path,
        filter: ListAssetLinksFilter,
    ) -> AppResult<Vec<AssetLink>> {
        creative_asset_repo::list_asset_links(db_path, filter)
    }
}

pub(crate) fn non_empty_filter(value: Option<String>) -> Option<String> {
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
    use crate::infra::creative_db_support::connect;
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
                   AND name IN ('creative_tasks', 'task_events', 'model_runs', 'assets', 'asset_links', 'batch_jobs', 'creative_projects')",
                [],
                |row| row.get(0),
            )
            .expect("table count should be queryable");
        assert_eq!(table_count, 7);

        let migration_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |row| {
                row.get(0)
            })
            .expect("migration count should be queryable");
        assert_eq!(migration_count, 3);

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

        let applied_versions: Vec<i64> = {
            let mut stmt = conn
                .prepare("SELECT version FROM schema_migrations ORDER BY version ASC")
                .expect("migration query should prepare");
            stmt.query_map([], |row| row.get::<_, i64>(0))
                .expect("migration versions should query")
                .collect::<Result<Vec<_>, _>>()
                .expect("migration versions should collect")
        };
        assert_eq!(applied_versions, vec![1, 2, 3]);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn init_schema_backfills_migration_history_for_existing_current_schema() {
        let db_path = temp_db_path("creative_schema_existing");
        let conn = connect(&db_path).expect("db should connect");
        conn.execute_batch(
            "CREATE TABLE creative_tasks (
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
                finished_at TEXT
            );
            CREATE TABLE batch_jobs (
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
            CREATE TABLE creative_goals (
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
            CREATE TABLE creative_goal_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                goal_id INTEGER NOT NULL,
                role_key TEXT NOT NULL,
                task_type TEXT NOT NULL,
                description TEXT,
                task_count INTEGER NOT NULL DEFAULT 1,
                budget_json TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE task_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                message TEXT,
                payload_json TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE model_runs (
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
                finished_at TEXT
            );
            CREATE TABLE assets (
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
            CREATE TABLE asset_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_asset_id INTEGER NOT NULL,
                target_asset_id INTEGER NOT NULL,
                link_type TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE creative_projects (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                settings_json TEXT,
                budget_json TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                archived_at TEXT
            );",
        )
        .expect("existing current schema should be created");

        CreativeDbInfra::init_schema(&db_path)
            .expect("existing current schema should backfill migrations");

        let conn = connect(&db_path).expect("db should reconnect");
        let migration_names: Vec<String> = {
            let mut stmt = conn
                .prepare("SELECT name FROM schema_migrations ORDER BY version ASC")
                .expect("migration names query should prepare");
            stmt.query_map([], |row| row.get::<_, String>(0))
                .expect("migration names should query")
                .collect::<Result<Vec<_>, _>>()
                .expect("migration names should collect")
        };
        assert_eq!(
            migration_names,
            vec![
                "bootstrap_creative_schema".to_string(),
                "add_creative_task_goal_batch_columns".to_string(),
                "add_creative_projects".to_string()
            ]
        );

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
    fn can_upsert_and_list_creative_projects() {
        let db_path = temp_db_path("creative_projects");
        CreativeDbInfra::init_schema(&db_path).expect("schema should init");

        let project = CreativeDbInfra::upsert_project(
            &db_path,
            UpsertCreativeProjectInput {
                id: "creative-main-project".to_string(),
                title: "默认创作项目".to_string(),
                description: Some("承接日常提示词、审查和资产入库".to_string()),
                status: Some("active".to_string()),
                settings_json: Some(r#"{"theme":"dark"}"#.to_string()),
                budget_json: None,
                archived_at: None,
            },
        )
        .expect("project should be created");
        assert_eq!(project.id, "creative-main-project");

        let updated = CreativeDbInfra::upsert_project(
            &db_path,
            UpsertCreativeProjectInput {
                id: "creative-main-project".to_string(),
                title: "默认创作项目".to_string(),
                description: Some("更新后的描述".to_string()),
                status: Some("running".to_string()),
                settings_json: Some(r#"{"theme":"light"}"#.to_string()),
                budget_json: Some(r#"{"maxTasks":12}"#.to_string()),
                archived_at: None,
            },
        )
        .expect("project should be upserted");
        assert_eq!(updated.status, "running");
        assert_eq!(updated.description.as_deref(), Some("更新后的描述"));

        let loaded = CreativeDbInfra::get_project(&db_path, "creative-main-project")
            .expect("project query should pass")
            .expect("project should exist");
        assert_eq!(loaded.title, "默认创作项目");

        let projects = CreativeDbInfra::list_projects(
            &db_path,
            ListCreativeProjectsFilter {
                status: Some("running".to_string()),
                limit: Some(20),
                offset: Some(0),
            },
        )
        .expect("project list should pass");
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].id, "creative-main-project");

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
