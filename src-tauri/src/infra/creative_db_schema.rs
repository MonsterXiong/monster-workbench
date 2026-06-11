use crate::infra::creative_db_support::{connect, ensure_column};
use crate::infra::AppResult;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;

pub(crate) fn init_schema(db_path: &Path) -> AppResult<()> {
    let mut conn = connect(db_path)?;
    run_migrations(&mut conn)
}

struct Migration {
    version: i64,
    name: &'static str,
    apply: fn(&Connection) -> AppResult<()>,
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "bootstrap_creative_schema",
        apply: apply_bootstrap_creative_schema,
    },
    Migration {
        version: 2,
        name: "add_creative_task_goal_batch_columns",
        apply: apply_creative_task_goal_batch_columns,
    },
    Migration {
        version: 3,
        name: "add_creative_projects",
        apply: apply_creative_projects,
    },
];

fn run_migrations(conn: &mut Connection) -> AppResult<()> {
    ensure_schema_migrations_table(conn)?;

    for migration in MIGRATIONS {
        if is_migration_applied(conn, migration.version)? {
            continue;
        }

        let tx = conn.transaction()?;
        (migration.apply)(&tx)?;
        tx.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
            params![migration.version, migration.name],
        )?;
        tx.commit()?;
    }

    Ok(())
}

fn ensure_schema_migrations_table(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_schema_migrations_name
            ON schema_migrations(name);",
    )?;
    Ok(())
}

fn is_migration_applied(conn: &Connection, version: i64) -> AppResult<bool> {
    let applied = conn
        .query_row(
            "SELECT version FROM schema_migrations WHERE version = ? LIMIT 1",
            params![version],
            |row| row.get::<_, i64>(0),
        )
        .optional()?;
    Ok(applied.is_some())
}

fn apply_bootstrap_creative_schema(conn: &Connection) -> AppResult<()> {
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
    Ok(())
}

fn apply_creative_task_goal_batch_columns(conn: &Connection) -> AppResult<()> {
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

fn apply_creative_projects(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS creative_projects (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            settings_json TEXT,
            budget_json TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            archived_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_creative_projects_status ON creative_projects(status);
        CREATE INDEX IF NOT EXISTS idx_creative_projects_updated_at ON creative_projects(updated_at);",
    )?;
    Ok(())
}
