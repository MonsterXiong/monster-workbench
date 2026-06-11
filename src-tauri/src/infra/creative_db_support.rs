use crate::infra::creative_types::{
    AssetLink, CreativeAsset, CreativeBatchJob, CreativeGoal, CreativeGoalRole, CreativeProject,
    CreativeTask, ModelRun, TaskEvent,
};
use crate::infra::AppResult;
use rusqlite::{params, Connection};
use std::path::Path;

pub(crate) fn connect(db_path: &Path) -> AppResult<Connection> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(db_path)?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA busy_timeout = 5000;
         PRAGMA foreign_keys = ON;",
    )?;
    Ok(conn)
}

pub(crate) fn ensure_column(
    conn: &Connection,
    table: &str,
    column: &str,
    column_def: &str,
) -> AppResult<()> {
    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info(?) WHERE name = ?",
        params![table, column],
        |row| row.get(0),
    )?;
    if exists == 0 {
        conn.execute(
            &format!("ALTER TABLE {table} ADD COLUMN {column} {column_def}"),
            [],
        )?;
    }
    Ok(())
}

pub(crate) fn map_creative_task(row: &rusqlite::Row<'_>) -> rusqlite::Result<CreativeTask> {
    Ok(CreativeTask {
        id: row.get(0)?,
        project_id: row.get(1)?,
        goal_id: row.get(2)?,
        batch_job_id: row.get(3)?,
        task_type: row.get(4)?,
        status: row.get(5)?,
        priority: row.get(6)?,
        payload_json: row.get(7)?,
        result_json: row.get(8)?,
        error_message: row.get(9)?,
        retry_count: row.get(10)?,
        max_retries: row.get(11)?,
        parent_task_id: row.get(12)?,
        asset_id: row.get(13)?,
        sequence_no: row.get(14)?,
        created_at: row.get(15)?,
        updated_at: row.get(16)?,
        started_at: row.get(17)?,
        finished_at: row.get(18)?,
    })
}

pub(crate) fn map_task_event(row: &rusqlite::Row<'_>) -> rusqlite::Result<TaskEvent> {
    Ok(TaskEvent {
        id: row.get(0)?,
        task_id: row.get(1)?,
        event_type: row.get(2)?,
        message: row.get(3)?,
        payload_json: row.get(4)?,
        created_at: row.get(5)?,
    })
}

pub(crate) fn map_creative_asset(row: &rusqlite::Row<'_>) -> rusqlite::Result<CreativeAsset> {
    Ok(CreativeAsset {
        id: row.get(0)?,
        project_id: row.get(1)?,
        asset_type: row.get(2)?,
        title: row.get(3)?,
        content: row.get(4)?,
        file_path: row.get(5)?,
        thumbnail_path: row.get(6)?,
        metadata_json: row.get(7)?,
        status: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
    })
}

pub(crate) fn map_creative_goal(row: &rusqlite::Row<'_>) -> rusqlite::Result<CreativeGoal> {
    Ok(CreativeGoal {
        id: row.get(0)?,
        project_id: row.get(1)?,
        title: row.get(2)?,
        description: row.get(3)?,
        status: row.get(4)?,
        budget_json: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
        started_at: row.get(8)?,
        finished_at: row.get(9)?,
        stopped_at: row.get(10)?,
    })
}

pub(crate) fn map_creative_batch_job(
    row: &rusqlite::Row<'_>,
) -> rusqlite::Result<CreativeBatchJob> {
    Ok(CreativeBatchJob {
        id: row.get(0)?,
        project_id: row.get(1)?,
        name: row.get(2)?,
        batch_type: row.get(3)?,
        status: row.get(4)?,
        total_count: row.get(5)?,
        concurrency: row.get(6)?,
        max_retries: row.get(7)?,
        prompt_template: row.get(8)?,
        provider_id: row.get(9)?,
        model: row.get(10)?,
        image_size: row.get(11)?,
        budget_json: row.get(12)?,
        created_at: row.get(13)?,
        updated_at: row.get(14)?,
        started_at: row.get(15)?,
        finished_at: row.get(16)?,
    })
}

pub(crate) fn map_creative_goal_role(
    row: &rusqlite::Row<'_>,
) -> rusqlite::Result<CreativeGoalRole> {
    Ok(CreativeGoalRole {
        id: row.get(0)?,
        goal_id: row.get(1)?,
        role_key: row.get(2)?,
        task_type: row.get(3)?,
        description: row.get(4)?,
        task_count: row.get(5)?,
        budget_json: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

pub(crate) fn map_asset_link(row: &rusqlite::Row<'_>) -> rusqlite::Result<AssetLink> {
    Ok(AssetLink {
        id: row.get(0)?,
        source_asset_id: row.get(1)?,
        target_asset_id: row.get(2)?,
        link_type: row.get(3)?,
        created_at: row.get(4)?,
    })
}

pub(crate) fn map_model_run(row: &rusqlite::Row<'_>) -> rusqlite::Result<ModelRun> {
    Ok(ModelRun {
        id: row.get(0)?,
        project_id: row.get(1)?,
        task_id: row.get(2)?,
        asset_id: row.get(3)?,
        provider_id: row.get(4)?,
        provider_type: row.get(5)?,
        model: row.get(6)?,
        request_type: row.get(7)?,
        status: row.get(8)?,
        duration_ms: row.get(9)?,
        prompt_hash: row.get(10)?,
        prompt_version_id: row.get(11)?,
        input_token_count: row.get(12)?,
        output_token_count: row.get(13)?,
        cost_estimate: row.get(14)?,
        error_code: row.get(15)?,
        error_message: row.get(16)?,
        metadata_json: row.get(17)?,
        created_at: row.get(18)?,
        finished_at: row.get(19)?,
    })
}

pub(crate) fn map_creative_project(row: &rusqlite::Row<'_>) -> rusqlite::Result<CreativeProject> {
    Ok(CreativeProject {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        status: row.get(3)?,
        settings_json: row.get(4)?,
        budget_json: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
        archived_at: row.get(8)?,
    })
}

