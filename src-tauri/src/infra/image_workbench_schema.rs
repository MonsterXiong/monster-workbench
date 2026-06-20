use crate::infra::AppResult;
use rusqlite::Connection;
use std::collections::HashSet;
use std::path::Path;

pub fn init_image_workbench_schema(db_path: &Path) -> AppResult<()> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let conn = Connection::open(db_path)?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA busy_timeout = 5000;

         CREATE TABLE IF NOT EXISTS image_workbench_jobs (
            id TEXT PRIMARY KEY,
            mode TEXT NOT NULL,
            status TEXT NOT NULL,
            prompt TEXT NOT NULL,
            negative_prompt TEXT,
            quantity INTEGER NOT NULL,
            provider_config_id TEXT,
            model TEXT,
            size TEXT,
            created_at_ms INTEGER NOT NULL,
            updated_at_ms INTEGER NOT NULL,
            queued_at_ms INTEGER,
            started_at_ms INTEGER,
            finished_at_ms INTEGER,
            error TEXT
         );

         CREATE TABLE IF NOT EXISTS image_workbench_tasks (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            queue_index INTEGER NOT NULL,
            status TEXT NOT NULL,
            retry_count INTEGER NOT NULL DEFAULT 0,
            max_retries INTEGER NOT NULL DEFAULT 1,
            claim_token TEXT,
            leased_until_ms INTEGER,
            prompt TEXT,
            created_at_ms INTEGER NOT NULL,
            updated_at_ms INTEGER NOT NULL,
            started_at_ms INTEGER,
            finished_at_ms INTEGER,
            error TEXT,
            FOREIGN KEY(job_id) REFERENCES image_workbench_jobs(id) ON DELETE CASCADE
         );

         CREATE TABLE IF NOT EXISTS image_workbench_assets (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            file_path TEXT NOT NULL,
            thumbnail_path TEXT,
            width INTEGER,
            height INTEGER,
            mime_type TEXT,
            size_bytes INTEGER,
            favorite INTEGER NOT NULL DEFAULT 0,
            created_at_ms INTEGER NOT NULL,
            FOREIGN KEY(job_id) REFERENCES image_workbench_jobs(id) ON DELETE CASCADE,
            FOREIGN KEY(task_id) REFERENCES image_workbench_tasks(id) ON DELETE CASCADE
         );

         CREATE TABLE IF NOT EXISTS image_workbench_metadata (
            id TEXT PRIMARY KEY,
            asset_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            original_prompt TEXT,
            expanded_prompt TEXT,
            negative_prompt TEXT,
            seed TEXT,
            model TEXT,
            mode TEXT,
            provider TEXT,
            reference_asset_ids_json TEXT,
            mask_path TEXT,
            person_context_json TEXT,
            created_at_ms INTEGER NOT NULL,
            FOREIGN KEY(asset_id) REFERENCES image_workbench_assets(id) ON DELETE CASCADE,
            FOREIGN KEY(task_id) REFERENCES image_workbench_tasks(id) ON DELETE CASCADE
         );

         CREATE TABLE IF NOT EXISTS image_workbench_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            prompt TEXT NOT NULL,
            negative_prompt TEXT,
            mode TEXT NOT NULL,
            is_system INTEGER NOT NULL DEFAULT 0,
            created_at_ms INTEGER NOT NULL,
            updated_at_ms INTEGER NOT NULL
         );

         CREATE TABLE IF NOT EXISTS image_workbench_groups (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            source_id TEXT,
            name TEXT,
            type TEXT,
            agent_preset TEXT,
            agent_ids_json TEXT,
            base_prompt TEXT,
            count INTEGER NOT NULL DEFAULT 0,
            created_at_ms INTEGER NOT NULL,
            updated_at_ms INTEGER NOT NULL,
            FOREIGN KEY(job_id) REFERENCES image_workbench_jobs(id) ON DELETE CASCADE
         );

         CREATE TABLE IF NOT EXISTS image_workbench_model_runs (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            task_id TEXT,
            provider TEXT,
            model TEXT,
            capability TEXT,
            status TEXT NOT NULL,
            latency_ms INTEGER,
            request_json TEXT,
            response_preview TEXT,
            error TEXT,
            created_at_ms INTEGER NOT NULL,
            finished_at_ms INTEGER,
            FOREIGN KEY(job_id) REFERENCES image_workbench_jobs(id) ON DELETE CASCADE,
            FOREIGN KEY(task_id) REFERENCES image_workbench_tasks(id) ON DELETE SET NULL
         );

         CREATE INDEX IF NOT EXISTS idx_image_workbench_tasks_job
            ON image_workbench_tasks(job_id, queue_index);
         CREATE INDEX IF NOT EXISTS idx_image_workbench_tasks_status
            ON image_workbench_tasks(status, updated_at_ms);
         CREATE INDEX IF NOT EXISTS idx_image_workbench_assets_job
            ON image_workbench_assets(job_id, created_at_ms);
         CREATE INDEX IF NOT EXISTS idx_image_workbench_metadata_asset
            ON image_workbench_metadata(asset_id);
         CREATE INDEX IF NOT EXISTS idx_image_workbench_model_runs_job
            ON image_workbench_model_runs(job_id, created_at_ms);

         CREATE INDEX IF NOT EXISTS idx_image_workbench_groups_job
            ON image_workbench_groups(job_id);",
    )?;
    ensure_image_workbench_job_columns(&conn)?;
    ensure_image_workbench_task_runtime_columns(&conn)?;
    ensure_image_workbench_asset_columns(&conn)?;

    Ok(())
}

fn ensure_image_workbench_task_runtime_columns(conn: &Connection) -> AppResult<()> {
    let mut stmt = conn.prepare("PRAGMA table_info(image_workbench_tasks)")?;
    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<HashSet<_>, _>>()?;

    // Worker heartbeat / lease 巡检所需的运行时列，以及资产组 / 变体 / 失败分类列。
    // 所有列均可空，旧行保留 NULL。group_id/variant_index 用于把同一作业的 N 张变体
    // 归入资产组；failure_type/failure_hint 承载结构化失败枚举（业务写入留后续轮次）。
    for (name, sql) in [
        (
            "worker_id",
            "ALTER TABLE image_workbench_tasks ADD COLUMN worker_id TEXT",
        ),
        (
            "claimed_at_ms",
            "ALTER TABLE image_workbench_tasks ADD COLUMN claimed_at_ms INTEGER",
        ),
        (
            "last_heartbeat_ms",
            "ALTER TABLE image_workbench_tasks ADD COLUMN last_heartbeat_ms INTEGER",
        ),
        (
            "group_id",
            "ALTER TABLE image_workbench_tasks ADD COLUMN group_id TEXT",
        ),
        (
            "variant_index",
            "ALTER TABLE image_workbench_tasks ADD COLUMN variant_index INTEGER",
        ),
        (
            "failure_type",
            "ALTER TABLE image_workbench_tasks ADD COLUMN failure_type TEXT",
        ),
        (
            "failure_hint",
            "ALTER TABLE image_workbench_tasks ADD COLUMN failure_hint TEXT",
        ),
    ] {
        if !columns.contains(name) {
            conn.execute(sql, [])?;
        }
    }

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_image_workbench_tasks_lease
            ON image_workbench_tasks(status, leased_until_ms)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_image_workbench_tasks_group
            ON image_workbench_tasks(job_id, group_id, variant_index)",
        [],
    )?;

    Ok(())
}

/// 资产组 / 评分 / 版本链所需的列。所有列均可空，旧行保留 NULL：
/// group_id 把资产归入资产组，rating 是 0..5 评分（与既有 favorite 布尔并存，
/// 不替换），parent_asset_id/root_asset_id/version_index 承载同源复跑的版本链。
/// 业务写入逻辑留后续轮次，本轮只保证列就位、可读写。
fn ensure_image_workbench_asset_columns(conn: &Connection) -> AppResult<()> {
    let mut stmt = conn.prepare("PRAGMA table_info(image_workbench_assets)")?;
    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<HashSet<_>, _>>()?;

    for (name, sql) in [
        (
            "group_id",
            "ALTER TABLE image_workbench_assets ADD COLUMN group_id TEXT",
        ),
        (
            "rating",
            "ALTER TABLE image_workbench_assets ADD COLUMN rating INTEGER",
        ),
        (
            "parent_asset_id",
            "ALTER TABLE image_workbench_assets ADD COLUMN parent_asset_id TEXT",
        ),
        (
            "root_asset_id",
            "ALTER TABLE image_workbench_assets ADD COLUMN root_asset_id TEXT",
        ),
        (
            "version_index",
            "ALTER TABLE image_workbench_assets ADD COLUMN version_index INTEGER",
        ),
    ] {
        if !columns.contains(name) {
            conn.execute(sql, [])?;
        }
    }

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_image_workbench_assets_group
            ON image_workbench_assets(group_id)",
        [],
    )?;

    Ok(())
}

fn ensure_image_workbench_job_columns(conn: &Connection) -> AppResult<()> {
    let mut stmt = conn.prepare("PRAGMA table_info(image_workbench_jobs)")?;
    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<HashSet<_>, _>>()?;

    for (name, sql) in [
        (
            "reference_asset_ids_json",
            "ALTER TABLE image_workbench_jobs ADD COLUMN reference_asset_ids_json TEXT",
        ),
        (
            "source_asset_id",
            "ALTER TABLE image_workbench_jobs ADD COLUMN source_asset_id TEXT",
        ),
        (
            "source_image_path",
            "ALTER TABLE image_workbench_jobs ADD COLUMN source_image_path TEXT",
        ),
        (
            "mask_path",
            "ALTER TABLE image_workbench_jobs ADD COLUMN mask_path TEXT",
        ),
        (
            "person_context_json",
            "ALTER TABLE image_workbench_jobs ADD COLUMN person_context_json TEXT",
        ),
        (
            "upscale_scale",
            "ALTER TABLE image_workbench_jobs ADD COLUMN upscale_scale INTEGER",
        ),
        (
            "fallback_policy",
            "ALTER TABLE image_workbench_jobs ADD COLUMN fallback_policy TEXT",
        ),
    ] {
        if !columns.contains(name) {
            conn.execute(sql, [])?;
        }
    }

    Ok(())
}
