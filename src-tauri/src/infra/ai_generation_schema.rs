use crate::infra::AppResult;
use rusqlite::Connection;
use std::collections::HashSet;
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

    ensure_ai_generation_runtime_columns(&conn)?;

    Ok(())
}

fn ensure_ai_generation_runtime_columns(conn: &Connection) -> AppResult<()> {
    let mut stmt = conn.prepare("PRAGMA table_info(ai_generation_tasks)")?;
    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<HashSet<_>, _>>()?;

    // Worker heartbeat / lease 巡检所需的运行时列。所有列均可空，旧
    // 行保留 NULL；A1 阶段不主动写入这些列，service 接入在 A2 完成。
    for (name, sql) in [
        (
            "worker_id",
            "ALTER TABLE ai_generation_tasks ADD COLUMN worker_id TEXT",
        ),
        (
            "claim_token",
            "ALTER TABLE ai_generation_tasks ADD COLUMN claim_token TEXT",
        ),
        (
            "claimed_at_ms",
            "ALTER TABLE ai_generation_tasks ADD COLUMN claimed_at_ms INTEGER",
        ),
        (
            "leased_until_ms",
            "ALTER TABLE ai_generation_tasks ADD COLUMN leased_until_ms INTEGER",
        ),
        (
            "last_heartbeat_ms",
            "ALTER TABLE ai_generation_tasks ADD COLUMN last_heartbeat_ms INTEGER",
        ),
    ] {
        if !columns.contains(name) {
            conn.execute(sql, [])?;
        }
    }

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_ai_generation_tasks_lease
            ON ai_generation_tasks(status, leased_until_ms)",
        [],
    )?;

    Ok(())
}
