use crate::infra::AppResult;
use rusqlite::Connection;
use std::path::Path;

pub fn init_ai_generation_schema(db_path: &Path) -> AppResult<()> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let conn = Connection::open(db_path)?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA busy_timeout = 5000;

         CREATE TABLE IF NOT EXISTS ai_generation_tasks (
            request_id TEXT PRIMARY KEY,
            capability TEXT NOT NULL,
            scope TEXT NOT NULL,
            status TEXT NOT NULL,
            provider_config_id TEXT,
            model TEXT,
            request_json TEXT,
            result_json TEXT,
            error TEXT,
            created_at_ms INTEGER NOT NULL,
            updated_at_ms INTEGER NOT NULL,
            started_at_ms INTEGER,
            finished_at_ms INTEGER,
            queue_wait_ms INTEGER,
            total_latency_ms INTEGER
         );

         CREATE INDEX IF NOT EXISTS idx_ai_generation_tasks_status
            ON ai_generation_tasks(status, updated_at_ms);
         CREATE INDEX IF NOT EXISTS idx_ai_generation_tasks_scope
            ON ai_generation_tasks(scope, updated_at_ms);",
    )?;

    Ok(())
}
