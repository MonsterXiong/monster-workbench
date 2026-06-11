use crate::infra::creative_db::{
    AssetLink, CreateAssetLinkInput, CreateCreativeAssetInput, CreativeAsset,
    ListAssetLinksFilter, ListCreativeAssetsFilter,
};
use crate::infra::creative_db_schema::init_schema;
use crate::infra::creative_db_support::{connect, map_asset_link, map_creative_asset};
use crate::infra::{AppError, AppResult};
use rusqlite::{params, params_from_iter, types::Value, Connection, OptionalExtension};
use std::path::Path;

pub(crate) fn create_asset(
    db_path: &Path,
    input: CreateCreativeAssetInput,
) -> AppResult<CreativeAsset> {
    init_schema(db_path)?;
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
    get_asset_with_conn(&conn, id)?
        .ok_or_else(|| AppError::Database("资产已写入但无法立即读取".to_string()))
}

pub(crate) fn get_asset(db_path: &Path, id: i64) -> AppResult<Option<CreativeAsset>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    get_asset_with_conn(&conn, id)
}

pub(crate) fn list_assets(
    db_path: &Path,
    filter: ListCreativeAssetsFilter,
) -> AppResult<Vec<CreativeAsset>> {
    init_schema(db_path)?;
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

pub(crate) fn create_asset_link(
    db_path: &Path,
    input: CreateAssetLinkInput,
) -> AppResult<AssetLink> {
    init_schema(db_path)?;
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
    get_asset_link_with_conn(&conn, id)?
        .ok_or_else(|| AppError::Database("资产关系已写入但无法立即读取".to_string()))
}

pub(crate) fn get_asset_link(db_path: &Path, id: i64) -> AppResult<Option<AssetLink>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    get_asset_link_with_conn(&conn, id)
}

pub(crate) fn list_asset_links(
    db_path: &Path,
    filter: ListAssetLinksFilter,
) -> AppResult<Vec<AssetLink>> {
    init_schema(db_path)?;
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
