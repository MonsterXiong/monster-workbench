use crate::infra::creative_db_schema;
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

    creative_db_schema::init_schema(&db_path).expect("first init should pass");
    creative_db_schema::init_schema(&db_path).expect("second init should pass");

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
    assert_eq!(migration_count, 4);

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

    creative_db_schema::init_schema(&db_path).expect("legacy schema should migrate");

    let conn = connect(&db_path).expect("db should reconnect");
    let column_count: i64 = conn
        .query_row(
            "SELECT COUNT(*)
             FROM pragma_table_info('creative_tasks')
             WHERE name IN (
                'goal_id',
                'batch_job_id',
                'sequence_no',
                'worker_id',
                'worker_runtime_instance_id',
                'worker_claim_token',
                'worker_claimed_at',
                'worker_heartbeat_at',
                'lease_expires_at',
                'lease_renewal_count'
             )",
            [],
            |row| row.get(0),
        )
        .expect("column count should be queryable");
    assert_eq!(column_count, 10);

    let applied_versions: Vec<i64> = {
        let mut stmt = conn
            .prepare("SELECT version FROM schema_migrations ORDER BY version ASC")
            .expect("migration query should prepare");
        stmt.query_map([], |row| row.get::<_, i64>(0))
            .expect("migration versions should query")
            .collect::<Result<Vec<_>, _>>()
            .expect("migration versions should collect")
    };
    assert_eq!(applied_versions, vec![1, 2, 3, 4]);

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

    creative_db_schema::init_schema(&db_path)
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
            "add_creative_projects".to_string(),
            "add_creative_task_worker_lease_columns".to_string()
        ]
    );

    let _ = std::fs::remove_file(db_path);
}

#[test]
fn init_schema_adds_worker_lease_columns_to_existing_schema() {
    let db_path = temp_db_path("creative_schema_existing_without_lease");
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
        INSERT INTO creative_tasks (
            project_id, task_type, status, priority, max_retries
        ) VALUES ('project-a', 'image.prompt.batch', 'running', 10, 2);
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
    .expect("existing schema should be created");

    creative_db_schema::init_schema(&db_path).expect("schema should add lease columns");

    let conn = connect(&db_path).expect("db should reconnect");
    let column_count: i64 = conn
        .query_row(
            "SELECT COUNT(*)
             FROM pragma_table_info('creative_tasks')
             WHERE name IN (
                'worker_id',
                'worker_runtime_instance_id',
                'worker_claim_token',
                'worker_claimed_at',
                'worker_heartbeat_at',
                'lease_expires_at',
                'lease_renewal_count'
             )",
            [],
            |row| row.get(0),
        )
        .expect("lease column count should be queryable");
    assert_eq!(column_count, 7);

    let task_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM creative_tasks", [], |row| row.get(0))
        .expect("task count should query");
    assert_eq!(task_count, 1);

    let renewal_count: i64 = conn
        .query_row(
            "SELECT lease_renewal_count FROM creative_tasks LIMIT 1",
            [],
            |row| row.get(0),
        )
        .expect("default renewal count should query");
    assert_eq!(renewal_count, 0);

    let index_count: i64 = conn
        .query_row(
            "SELECT COUNT(*)
             FROM sqlite_master
             WHERE type = 'index'
               AND name IN (
                'idx_creative_tasks_status_lease_expires_at',
                'idx_creative_tasks_worker_claim',
                'idx_creative_tasks_worker_runtime_instance_id'
               )",
            [],
            |row| row.get(0),
        )
        .expect("lease index count should query");
    assert_eq!(index_count, 3);

    let _ = std::fs::remove_file(db_path);
}
