use crate::infra::{AppError, AppResult};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreativeTask {
    pub id: i64,
    pub project_id: Option<String>,
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
    pub created_at: String,
    pub updated_at: String,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateCreativeTaskInput {
    pub project_id: Option<String>,
    pub task_type: String,
    pub status: Option<String>,
    pub priority: Option<i64>,
    pub payload_json: Option<String>,
    pub max_retries: Option<i64>,
    pub parent_task_id: Option<i64>,
    pub asset_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskEvent {
    pub id: i64,
    pub task_id: i64,
    pub event_type: String,
    pub message: Option<String>,
    pub payload_json: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateTaskEventInput {
    pub task_id: i64,
    pub event_type: String,
    pub message: Option<String>,
    pub payload_json: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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
pub struct AssetLink {
    pub id: i64,
    pub source_asset_id: i64,
    pub target_asset_id: i64,
    pub link_type: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateAssetLinkInput {
    pub source_asset_id: i64,
    pub target_asset_id: i64,
    pub link_type: String,
}

pub struct CreativeDbInfra;

impl CreativeDbInfra {
    pub fn init_schema(db_path: &Path) -> AppResult<()> {
        let conn = connect(db_path)?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS creative_tasks (
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
                finished_at TEXT,
                FOREIGN KEY(parent_task_id) REFERENCES creative_tasks(id) ON DELETE SET NULL,
                FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE SET NULL
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
            CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id);
            CREATE INDEX IF NOT EXISTS idx_task_events_created_at ON task_events(created_at);
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

    pub fn create_task(db_path: &Path, input: CreateCreativeTaskInput) -> AppResult<CreativeTask> {
        Self::init_schema(db_path)?;
        let conn = connect(db_path)?;
        let status = input.status.unwrap_or_else(|| "draft".to_string());
        conn.execute(
            "INSERT INTO creative_tasks (
                project_id, task_type, status, priority, payload_json, max_retries,
                parent_task_id, asset_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                input.project_id,
                input.task_type,
                status,
                input.priority.unwrap_or(0),
                input.payload_json,
                input.max_retries.unwrap_or(0),
                input.parent_task_id,
                input.asset_id
            ],
        )?;
        let id = conn.last_insert_rowid();
        Self::get_task_with_conn(&conn, id)?.ok_or_else(|| {
            AppError::Database("创作任务已写入但无法立即读取".to_string())
        })
    }

    pub fn get_task(db_path: &Path, id: i64) -> AppResult<Option<CreativeTask>> {
        Self::init_schema(db_path)?;
        let conn = connect(db_path)?;
        Self::get_task_with_conn(&conn, id)
    }

    pub fn append_task_event(
        db_path: &Path,
        input: CreateTaskEventInput,
    ) -> AppResult<TaskEvent> {
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
        Self::get_task_event_with_conn(&conn, id)?.ok_or_else(|| {
            AppError::Database("任务事件已写入但无法立即读取".to_string())
        })
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

    pub fn create_asset_link(db_path: &Path, input: CreateAssetLinkInput) -> AppResult<AssetLink> {
        Self::init_schema(db_path)?;
        let conn = connect(db_path)?;
        conn.execute(
            "INSERT INTO asset_links (source_asset_id, target_asset_id, link_type)
             VALUES (?, ?, ?)",
            params![input.source_asset_id, input.target_asset_id, input.link_type],
        )?;
        let id = conn.last_insert_rowid();
        Self::get_asset_link_with_conn(&conn, id)?.ok_or_else(|| {
            AppError::Database("资产关系已写入但无法立即读取".to_string())
        })
    }

    pub fn get_asset_link(db_path: &Path, id: i64) -> AppResult<Option<AssetLink>> {
        Self::init_schema(db_path)?;
        let conn = connect(db_path)?;
        Self::get_asset_link_with_conn(&conn, id)
    }

    fn get_task_with_conn(conn: &Connection, id: i64) -> AppResult<Option<CreativeTask>> {
        conn.query_row(
            "SELECT id, project_id, task_type, status, priority, payload_json,
                result_json, error_message, retry_count, max_retries, parent_task_id,
                asset_id, created_at, updated_at, started_at, finished_at
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
}

fn connect(db_path: &Path) -> AppResult<Connection> {
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

fn map_creative_task(row: &rusqlite::Row<'_>) -> rusqlite::Result<CreativeTask> {
    Ok(CreativeTask {
        id: row.get(0)?,
        project_id: row.get(1)?,
        task_type: row.get(2)?,
        status: row.get(3)?,
        priority: row.get(4)?,
        payload_json: row.get(5)?,
        result_json: row.get(6)?,
        error_message: row.get(7)?,
        retry_count: row.get(8)?,
        max_retries: row.get(9)?,
        parent_task_id: row.get(10)?,
        asset_id: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
        started_at: row.get(14)?,
        finished_at: row.get(15)?,
    })
}

fn map_task_event(row: &rusqlite::Row<'_>) -> rusqlite::Result<TaskEvent> {
    Ok(TaskEvent {
        id: row.get(0)?,
        task_id: row.get(1)?,
        event_type: row.get(2)?,
        message: row.get(3)?,
        payload_json: row.get(4)?,
        created_at: row.get(5)?,
    })
}

fn map_creative_asset(row: &rusqlite::Row<'_>) -> rusqlite::Result<CreativeAsset> {
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

fn map_asset_link(row: &rusqlite::Row<'_>) -> rusqlite::Result<AssetLink> {
    Ok(AssetLink {
        id: row.get(0)?,
        source_asset_id: row.get(1)?,
        target_asset_id: row.get(2)?,
        link_type: row.get(3)?,
        created_at: row.get(4)?,
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
                   AND name IN ('creative_tasks', 'task_events', 'assets', 'asset_links')",
                [],
                |row| row.get(0),
            )
            .expect("table count should be queryable");
        assert_eq!(table_count, 4);

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
                task_type: "generate_image_prompt".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: Some(r#"{"brief":"poster"}"#.to_string()),
                max_retries: Some(2),
                parent_task_id: None,
                asset_id: None,
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
}
